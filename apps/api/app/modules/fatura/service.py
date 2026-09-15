import uuid
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
import hashlib
from app.modules.fatura.models import Fatura, FaturaItem
from app.modules.products.models import Produto

def get_ultimo_hash(db: Session, company_id):
    ultima = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.tipo_documento == 'fatura',
        Fatura.hash_agt.is_not(None)
    ).order_by(Fatura.created_at.desc()).first()
    return ultima.hash_agt if ultima else None

def gerar_hash_agt(fatura: Fatura, hash_anterior: str | None):
    data_str = fatura.data_emissao.strftime("%Y-%m-%dT%H:%M:%S") if fatura.data_emissao else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    total_str = f"{float(fatura.total_geral):.2f}"
    numero = fatura.numero_fatura or fatura.numero_proforma or ""
    base = f"{data_str};{numero};{total_str};{hash_anterior or ''}"
    return hashlib.sha256(base.encode('utf-8')).hexdigest().upper()

def gerar_numero(db: Session, company_id, tipo: str):
    ano = datetime.now().year
    tipo_db = 'fatura' if tipo == 'fatura' else 'proforma'

    ultimo = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.tipo_documento == tipo_db,
        extract('year', Fatura.created_at) == ano
    ).with_for_update().order_by(Fatura.created_at.desc()).first()

    seq = 0
    if ultimo:
        num_str = ultimo.numero_fatura if tipo == 'fatura' else ultimo.numero_proforma
        if num_str and '/' in num_str:
            try:
                seq = int(num_str.split('/')[-1])
            except (ValueError, AttributeError):
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
    if tipo == 'proforma':
        return f"PP {ano}/{novo_seq:05d}"
    else:
        return f"FT {ano}/{novo_seq:05d}"

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

        objs.append(FaturaItem(
            id=uuid.uuid4(),
            produto_id=prod.id,
            nome_snapshot=prod.nome,
            quantidade=qtd,
            preco_unit_snapshot=preco,
            iva_percent=iva_percent,
            iva_valor=iva_valor,
            subtotal_linha=sub_linha
        ))
    return subtotal, total_iva, objs

def criar_fatura(db: Session, company_id, dados):
    if dados.tipo_documento not in ['proforma', 'fatura']:
        raise HTTPException(400, "tipo_documento deve ser 'proforma' ou 'fatura'")

    subtotal, total_iva, itens_objs = calcular_itens(db, company_id, dados.itens)
    desconto = float(dados.desconto_percent or 0)
    total_geral = (subtotal + total_iva) * (1 - desconto / 100)

    try:
        if dados.tipo_documento == 'proforma':
            numero = gerar_numero(db, company_id, 'proforma')
            fatura = Fatura(
                id=uuid.uuid4(),
                company_id=company_id,
                cliente_id=dados.cliente_id,
                tipo_documento='proforma',
                status='em_curso',
                numero_proforma=numero,
                validade_proforma=datetime.now(timezone.utc) + timedelta(days=dados.validade_dias),
                data_vencimento=datetime.now(timezone.utc) + timedelta(days=dados.validade_dias),
                subtotal=subtotal, total_iva=total_iva, total_geral=total_geral,
                desconto_percent=desconto,
                forma_pagamento=dados.forma_pagamento,
                observacoes=dados.observacoes,
                comunicado_agt=False,
                itens=itens_objs
            )
        else:
            numero = gerar_numero(db, company_id, 'fatura')
            hash_anterior = get_ultimo_hash(db, company_id)
            fatura = Fatura(
                id=uuid.uuid4(),
                company_id=company_id,
                cliente_id=dados.cliente_id,
                tipo_documento='fatura',
                status='emitida',
                numero_fatura=numero,
                subtotal=subtotal, total_iva=total_iva, total_geral=total_geral,
                desconto_percent=desconto,
                forma_pagamento=dados.forma_pagamento,
                observacoes=dados.observacoes,
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
    if fatura.tipo_documento == 'fatura' and fatura.status in ['emitida', 'concluida']:
        raise HTTPException(400, "Fatura oficial não pode ser editada - faça Nota de Crédito")

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
    proforma = db.query(Fatura).filter(
        Fatura.id == proforma_id,
        Fatura.company_id == company_id,
        Fatura.tipo_documento == 'proforma'
    ).with_for_update().first()

    if not proforma:
        raise HTTPException(404, "Proforma não encontrada")
    if proforma.status in ['concluida', 'cancelada']:
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
                subtotal_linha=item.subtotal_linha
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
            subtotal_linha=item.subtotal_linha
        ))

    nova = Fatura(
        id=uuid.uuid4(),
        company_id=company_id,
        cliente_id=orig.cliente_id,
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
        comunicado_agt=False,
        itens=itens_novos
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova
