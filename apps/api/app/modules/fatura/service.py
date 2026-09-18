import uuid
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
import hashlib
from app.modules.fatura.models import Fatura, FaturaItem
from app.modules.products.models import Produto
from app.modules.clients.models import Cliente
from app.modules.auth.models import Company
from app.core.plans import get_plan_limit, is_ilimitado

def check_limite_faturas(db: Session, company_id: uuid.UUID):
    """Verifica se pode emitir FT neste mês de acordo com o plano"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    plan_id = getattr(company, 'subscription_plan', 'free') or 'free'

    if is_ilimitado(plan_id):
        return True

    limits = get_plan_limit(plan_id)
    max_mes = limits['faturas_mes']

    now = datetime.now(timezone.utc)
    count_mes = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.tipo_documento == 'fatura',
        Fatura.status!= 'apagada',
        extract('year', Fatura.created_at) == now.year,
        extract('month', Fatura.created_at) == now.month
    ).count()

    if count_mes >= max_mes:
        raise HTTPException(
            status_code=403,
            detail=f"Limite do plano {limits['label']} atingido: {count_mes}/{max_mes} faturas este mês. Faça upgrade para continuar."
        )
    return True

def get_ultimo_hash(db: Session, company_id):
    ultima = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.tipo_documento.in_(['fatura','nota_credito']),
        Fatura.hash_agt.is_not(None)
    ).order_by(Fatura.created_at.desc()).first()
    return ultima.hash_agt if ultima else None

def gerar_hash_agt(fatura: Fatura, hash_anterior: str | None):
    data_str = fatura.data_emissao.strftime("%Y-%m-%dT%H:%M:%S") if fatura.data_emissao else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    total_str = f"{float(fatura.total_geral):.2f}"
    numero = fatura.numero_fatura or fatura.numero_nota_credito or fatura.numero_proforma or ""
    base = f"{data_str};{numero};{total_str};{hash_anterior or ''}"
    return hashlib.sha256(base.encode('utf-8')).hexdigest().upper()

def gerar_numero(db: Session, company_id, tipo: str):
    ano = datetime.now().year
    if tipo == 'fatura':
        tipo_db = 'fatura'
        prefix = 'FT'
        campo = 'numero_fatura'
    elif tipo == 'nota_credito':
        tipo_db = 'nota_credito'
        prefix = 'NC'
        campo = 'numero_nota_credito'
    else:
        tipo_db = 'proforma'
        prefix = 'PP'
        campo = 'numero_proforma'

    ultimo = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.tipo_documento == tipo_db,
        extract('year', Fatura.created_at) == ano
    ).with_for_update().order_by(Fatura.created_at.desc()).first()

    seq = 0
    if ultimo:
        num_str = getattr(ultimo, campo)
        if num_str and '/' in num_str:
            try:
                seq = int(num_str.split('/')[-1])
            except:
                seq = db.query(Fatura).filter(
                    Fatura.company_id == company_id,
                    Fatura.tipo_documento == tipo_db,
                    extract('year', Fatura.created_at) == ano
                ).count()
        else:
            seq = db.query(Fatura).filter(
                Fatura.company_id == company_id,
                Fatura.tipo_documento == tipo_db,
                extract('year', Fatura.created_at) == ano
            ).count()

    novo_seq = seq + 1
    return f"{prefix} {ano}/{novo_seq:05d}"

def calcular_itens(db: Session, company_id, itens_in):
    subtotal = 0.0
    total_iva = 0.0
    objs = []
    if not itens_in:
        raise HTTPException(400, "Fatura precisa de pelo menos 1 item")

    for item_in in itens_in:
        prod = db.query(Produto).filter(Produto.id == item_in.produto_id, Produto.company_id == company_id).first()
        if not prod:
            raise HTTPException(404, f"Produto {item_in.produto_id} não encontrado")

        preco = float(item_in.preco_unit) if item_in.preco_unit is not None else float(prod.preco_venda)
        qtd = float(item_in.quantidade)
        if qtd <= 0:
            raise HTTPException(400, f"Quantidade inválida para {prod.nome}")

        sub_linha = preco * qtd
        iva_percent = float(getattr(prod, 'iva', 14) or 14)
        iva_valor = sub_linha * (iva_percent / 100)
        subtotal += sub_linha
        total_iva += iva_valor

        motivo_isencao = None
        if iva_percent == 0:
            motivo_isencao = "M04 - Isento"

        objs.append(FaturaItem(
            id=uuid.uuid4(),
            produto_id=prod.id,
            nome_snapshot=prod.nome,
            quantidade=qtd,
            preco_unit_snapshot=preco,
            iva_percent=iva_percent,
            iva_valor=iva_valor,
            subtotal_linha=sub_linha,
            motivo_isencao=motivo_isencao
        ))
    return subtotal, total_iva, objs

def criar_fatura(db: Session, company_id, dados):
    if dados.tipo_documento not in ['proforma', 'fatura']:
        raise HTTPException(400, "tipo_documento deve ser 'proforma' ou 'fatura'")

    # TRAVA DE PLANO SÓ PARA FATURA, PROFORMA É LIVRE
    if dados.tipo_documento == 'fatura':
        check_limite_faturas(db, company_id)

    subtotal, total_iva, itens_objs = calcular_itens(db, company_id, dados.itens)
    desconto = float(dados.desconto_percent or 0)
    total_geral = (subtotal + total_iva) * (1 - desconto / 100)

    cliente_id_final = dados.cliente_id
    c_nome = dados.cliente_nome
    c_nif = (dados.cliente_nif or "999999999") if hasattr(dados, 'cliente_nif') else "999999999"
    c_email = dados.cliente_email if hasattr(dados, 'cliente_email') else None
    c_tel = dados.cliente_telefone if hasattr(dados, 'cliente_telefone') else None
    c_end = dados.cliente_endereco if hasattr(dados, 'cliente_endereco') else None

    if cliente_id_final:
        cli = db.query(Cliente).filter(Cliente.id == cliente_id_final, Cliente.company_id == company_id).first()
        if cli:
            c_nome = c_nome or cli.nome
            c_nif = getattr(cli, 'nif', None) or c_nif
            c_email = c_email or getattr(cli, 'email', None)
            c_tel = c_tel or getattr(cli, 'telefone', None)
            c_end = c_end or getattr(cli, 'endereco', None) or getattr(cli, 'address', None)
    else:
        if hasattr(dados, 'salvar_como_cliente') and dados.salvar_como_cliente and c_nome:
            novo_cli = Cliente(
                id=uuid.uuid4(),
                company_id=company_id,
                nome=c_nome,
                nif=c_nif,
                email=c_email,
                telefone=c_tel,
                endereco=c_end
            )
            db.add(novo_cli)
            db.flush()
            cliente_id_final = novo_cli.id

    try:
        if dados.tipo_documento == 'proforma':
            numero = gerar_numero(db, company_id, 'proforma')
            fatura = Fatura(
                id=uuid.uuid4(),
                company_id=company_id,
                cliente_id=cliente_id_final,
                cliente_nome=c_nome,
                cliente_nif=c_nif,
                cliente_email=c_email,
                cliente_telefone=c_tel,
                cliente_endereco=c_end,
                tipo_documento='proforma',
                status='em_curso',
                numero_proforma=numero,
                validade_proforma=datetime.now(timezone.utc) + timedelta(days=dados.validade_dias),
                data_vencimento=datetime.now(timezone.utc) + timedelta(days=dados.validade_dias),
                subtotal=subtotal, total_iva=total_iva, total_geral=total_geral,
                desconto_percent=desconto,
                forma_pagamento=dados.forma_pagamento,
                observacoes=dados.observacoes,
                motivo_isencao=dados.motivo_isencao,
                comunicado_agt=False,
                itens=itens_objs
            )
        else:
            numero = gerar_numero(db, company_id, 'fatura')
            hash_anterior = get_ultimo_hash(db, company_id)
            fatura = Fatura(
                id=uuid.uuid4(),
                company_id=company_id,
                cliente_id=cliente_id_final,
                cliente_nome=c_nome,
                cliente_nif=c_nif,
                cliente_email=c_email,
                cliente_telefone=c_tel,
                cliente_endereco=c_end,
                tipo_documento='fatura',
                status='emitida',
                numero_fatura=numero,
                subtotal=subtotal, total_iva=total_iva, total_geral=total_geral,
                desconto_percent=desconto,
                forma_pagamento=dados.forma_pagamento,
                observacoes=dados.observacoes,
                motivo_isencao=dados.motivo_isencao,
                comunicado_agt=True,
                data_emissao=datetime.now(timezone.utc),
                hash_agt_anterior=hash_anterior,
                itens=itens_objs
            )
            hash_gerado = gerar_hash_agt(fatura, hash_anterior)
            fatura.hash_agt = hash_gerado
            fatura.qr_code = f"{numero}|{total_geral:.2f}|{hash_gerado[:20]}"

            for item in itens_objs:
                prod = db.query(Produto).filter(Produto.id == item.produto_id).with_for_update().first()
                if prod is None:
                    continue
                if getattr(prod, "controlar_stock", True):
                    stock_atual = float(prod.stock_atual or 0)
                    qtd = float(item.quantidade or 0)
                    if stock_atual < qtd:
                        raise HTTPException(400, f"Stock insuficiente para {prod.nome}")
                    prod.stock_atual = stock_atual - qtd

        db.add(fatura)
        db.commit()
        db.refresh(fatura)
        return fatura
    except Exception as e:
        db.rollback()
        raise e

def atualizar_fatura(db: Session, fatura: Fatura, company_id, dados):
    if fatura.tipo_documento in ['fatura','nota_credito'] and fatura.hash_agt and fatura.status in ['emitida', 'concluida']:
        raise HTTPException(400, "Documento AGT oficial não pode ser editado - faça Nota de Crédito")

    if dados.itens is not None:
        db.query(FaturaItem).filter(FaturaItem.fatura_id == fatura.id).delete()
        subtotal, total_iva, itens_objs = calcular_itens(db, company_id, dados.itens)
        fatura.subtotal = subtotal
        fatura.total_iva = total_iva
        desconto = float(dados.desconto_percent) if dados.desconto_percent is not None else float(fatura.desconto_percent or 0)
        fatura.total_geral = (subtotal + total_iva) * (1 - desconto / 100)
        fatura.itens = itens_objs

    if dados.cliente_id:
        fatura.cliente_id = dados.cliente_id
    if dados.forma_pagamento:
        fatura.forma_pagamento = dados.forma_pagamento
    if dados.desconto_percent is not None:
        fatura.desconto_percent = dados.desconto_percent
    if dados.observacoes is not None:
        fatura.observacoes = dados.observacoes

    db.commit()
    db.refresh(fatura)
    return fatura

def converter_proforma_para_fatura(db: Session, proforma_id, company_id):
    # TAMBÉM TRAVA NA CONVERSÃO
    check_limite_faturas(db, company_id)

    proforma = db.query(Fatura).filter(
        Fatura.id == proforma_id,
        Fatura.company_id == company_id,
        Fatura.tipo_documento == 'proforma'
    ).with_for_update().first()

    if not proforma:
        raise HTTPException(404, "Proforma não encontrada")
    if proforma.status in ['concluida', 'cancelada', 'apagada']:
        raise HTTPException(400, "Proforma já convertida/cancelada")

    try:
        numero_novo = gerar_numero(db, company_id, 'fatura')
        hash_anterior = get_ultimo_hash(db, company_id)

        itens_novos = []
        for item in proforma.itens:
            itens_novos.append(FaturaItem(
                id=uuid.uuid4(),
                produto_id=item.produto_id,
                nome_snapshot=item.nome_snapshot,
                quantidade=item.quantidade,
                preco_unit_snapshot=item.preco_unit_snapshot,
                iva_percent=item.iva_percent,
                iva_valor=item.iva_valor,
                subtotal_linha=item.subtotal_linha,
                motivo_isencao=item.motivo_isencao
            ))

        for item in itens_novos:
            prod = db.query(Produto).filter(Produto.id == item.produto_id).with_for_update().first()
            if prod is None:
                continue
            if getattr(prod, "controlar_stock", True):
                qtd = float(item.quantidade or 0)
                prod.stock_atual = float(prod.stock_atual or 0) - qtd

        nova = Fatura(
            id=uuid.uuid4(),
            company_id=company_id,
            cliente_id=proforma.cliente_id,
            cliente_nome=proforma.cliente_nome,
            cliente_nif=proforma.cliente_nif,
            cliente_email=proforma.cliente_email,
            cliente_telefone=proforma.cliente_telefone,
            cliente_endereco=proforma.cliente_endereco,
            tipo_documento='fatura',
            status='emitida',
            numero_fatura=numero_novo,
            proforma_origem_id=proforma.id,
            subtotal=proforma.subtotal,
            total_iva=proforma.total_iva,
            total_geral=proforma.total_geral,
            desconto_percent=proforma.desconto_percent,
            forma_pagamento=proforma.forma_pagamento,
            observacoes=proforma.observacoes,
            motivo_isencao=proforma.motivo_isencao,
            comunicado_agt=True,
            data_emissao=datetime.now(timezone.utc),
            hash_agt_anterior=hash_anterior,
            itens=itens_novos
        )
        hash_gerado = gerar_hash_agt(nova, hash_anterior)
        nova.hash_agt = hash_gerado
        nova.qr_code = f"{nova.numero_fatura}|{float(nova.total_geral):.2f}|{hash_gerado[:20]}"

        proforma.status = 'concluida'
        db.add(nova)
        db.commit()
        db.refresh(nova)
        return nova
    except Exception as e:
        db.rollback()
        raise e

def duplicar_fatura(db: Session, fatura_id, company_id):
    orig = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not orig:
        raise HTTPException(404, "Fatura não encontrada")

    itens_novos = []
    for item in orig.itens:
        itens_novos.append(FaturaItem(
            id=uuid.uuid4(),
            produto_id=item.produto_id,
            nome_snapshot=item.nome_snapshot,
            quantidade=item.quantidade,
            preco_unit_snapshot=item.preco_unit_snapshot,
            iva_percent=item.iva_percent,
            iva_valor=item.iva_valor,
            subtotal_linha=item.subtotal_linha,
            motivo_isencao=item.motivo_isencao
        ))

    nova = Fatura(
        id=uuid.uuid4(),
        company_id=company_id,
        cliente_id=orig.cliente_id,
        cliente_nome=orig.cliente_nome,
        cliente_nif=orig.cliente_nif,
        cliente_email=orig.cliente_email,
        cliente_telefone=orig.cliente_telefone,
        cliente_endereco=orig.cliente_endereco,
        tipo_documento='proforma',
        status='em_curso',
        numero_proforma=gerar_numero(db, company_id, 'proforma'),
        validade_proforma=datetime.now(timezone.utc) + timedelta(days=15),
        data_vencimento=datetime.now(timezone.utc) + timedelta(days=15),
        subtotal=orig.subtotal,
        total_iva=orig.total_iva,
        total_geral=orig.total_geral,
        desconto_percent=orig.desconto_percent,
        forma_pagamento=orig.forma_pagamento,
        observacoes=orig.observacoes,
        motivo_isencao=orig.motivo_isencao,
        comunicado_agt=False,
        itens=itens_novos
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova

def criar_nota_credito(db: Session, company_id, fatura_id, motivo: str, observacoes: str | None = None):
    original = db.query(Fatura).filter(
        Fatura.id == fatura_id,
        Fatura.company_id == company_id,
        Fatura.tipo_documento == 'fatura'
    ).with_for_update().first()

    if not original:
        raise HTTPException(404, "Fatura original não encontrada")
    if original.status == 'cancelada':
        raise HTTPException(400, "Fatura já cancelada - não pode gerar NC")

    nc_existente = db.query(Fatura).filter(
        Fatura.fatura_origem_id == fatura_id,
        Fatura.tipo_documento == 'nota_credito',
        Fatura.status!= 'apagada'
    ).first()
    if nc_existente:
        raise HTTPException(400, f"Já existe NC {nc_existente.numero_nota_credito} para esta FT")

    try:
        numero_nc = gerar_numero(db, company_id, 'nota_credito')
        hash_anterior = get_ultimo_hash(db, company_id)

        itens_nc = []
        for item in original.itens:
            qtd = float(item.quantidade or 0)
            preco = float(item.preco_unit_snapshot or 0)
            iva_val = float(item.iva_valor or 0)
            sub_linha = float(item.subtotal_linha or 0)

            itens_nc.append(FaturaItem(
                id=uuid.uuid4(),
                produto_id=item.produto_id,
                nome_snapshot=f"[NC] {item.nome_snapshot}",
                quantidade=qtd,
                preco_unit_snapshot=preco,
                iva_percent=float(item.iva_percent or 0),
                iva_valor=-abs(iva_val),
                subtotal_linha=-abs(sub_linha),
                motivo_isencao=item.motivo_isencao
            ))
            prod = db.query(Produto).filter(Produto.id == item.produto_id).with_for_update().first()
            if prod is None:
                continue
            if getattr(prod, "controlar_stock", True):
                stock_atual = float(prod.stock_atual or 0)
                prod.stock_atual = stock_atual + qtd

        total_geral_original = float(original.total_geral or 0)

        nc = Fatura(
            id=uuid.uuid4(),
            company_id=company_id,
            cliente_id=original.cliente_id,
            cliente_nome=original.cliente_nome,
            cliente_nif=original.cliente_nif,
            cliente_email=original.cliente_email,
            cliente_telefone=original.cliente_telefone,
            cliente_endereco=original.cliente_endereco,
            tipo_documento='nota_credito',
            status='emitida',
            numero_nota_credito=numero_nc,
            numero_fatura=numero_nc,
            fatura_origem_id=original.id,
            subtotal=-abs(float(original.subtotal or 0)),
            total_iva=-abs(float(original.total_iva or 0)),
            total_geral=-abs(total_geral_original),
            desconto_percent=float(original.desconto_percent or 0),
            forma_pagamento=original.forma_pagamento,
            motivo_credito=motivo,
            observacoes=observacoes or f"Nota de Crédito referente a FT {original.numero_fatura} - {motivo}",
            motivo_isencao=original.motivo_isencao,
            comunicado_agt=True,
            data_emissao=datetime.now(timezone.utc),
            hash_agt_anterior=hash_anterior,
            itens=itens_nc
        )
        hash_gerado = gerar_hash_agt(nc, hash_anterior)
        nc.hash_agt = hash_gerado
        nc.qr_code = f"{numero_nc}|{float(nc.total_geral or 0):.2f}|{hash_gerado[:20]}"

        db.add(nc)
        db.commit()
        db.refresh(nc)
        return nc
    except Exception as e:
        db.rollback()
        raise e
