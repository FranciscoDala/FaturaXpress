import uuid
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.modules.fatura.models import Fatura, FaturaItem
from app.modules.products.models import Produto

def gerar_numero(db: Session, company_id, tipo: str):
    ano = datetime.now().year
    if tipo == 'proforma':
        count = db.query(Fatura).filter(
            Fatura.company_id == company_id,
            Fatura.tipo_documento == 'proforma'
        ).count() + 1
        return f"PROFORMA {ano}/{count:05d}"
    else:
        count = db.query(Fatura).filter(
            Fatura.company_id == company_id,
            Fatura.tipo_documento == 'fatura'
        ).count() + 1
        return f"FT {ano}/{count:05d}"

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
    subtotal, total_iva, itens_objs = calcular_itens(db, company_id, dados.itens)
    desconto = float(dados.desconto_percent or 0)
    total_geral = (subtotal + total_iva) * (1 - desconto/100)

    if dados.tipo_documento == 'proforma':
        fatura = Fatura(
            id=uuid.uuid4(),
            company_id=company_id,
            cliente_id=dados.cliente_id,
            tipo_documento='proforma',
            status='em_curso',
            numero_proforma=gerar_numero(db, company_id, 'proforma'),
            validade_proforma=datetime.utcnow() + timedelta(days=getattr(dados, 'validade_dias', 15) or 15),
            data_vencimento=datetime.utcnow() + timedelta(days=getattr(dados, 'validade_dias', 15) or 15),
            subtotal=subtotal, total_iva=total_iva, total_geral=total_geral,
            desconto_percent=desconto,
            forma_pagamento=dados.forma_pagamento,
            observacoes=dados.observacoes,
            comunicado_agt=False
        )
    else:
        fatura = Fatura(
            id=uuid.uuid4(),
            company_id=company_id,
            cliente_id=dados.cliente_id,
            tipo_documento='fatura',
            status='emitida',
            numero_fatura=gerar_numero(db, company_id, 'fatura'),
            subtotal=subtotal, total_iva=total_iva, total_geral=total_geral,
            desconto_percent=desconto,
            forma_pagamento=dados.forma_pagamento,
            observacoes=dados.observacoes,
            comunicado_agt=True,
            data_emissao=datetime.utcnow()
        )
        for item in itens_objs:
            prod = db.query(Produto).filter(Produto.id == item.produto_id).first()
            if prod and getattr(prod, "controlar_stock", True):
                prod.stock_atual = float(prod.stock_atual or 0) - float(item.quantidade)

    fatura.itens = itens_objs
    db.add(fatura)
    db.commit()
    db.refresh(fatura)
    return fatura

def atualizar_fatura(db: Session, fatura: Fatura, company_id, dados):
    if dados.itens:
        db.query(FaturaItem).filter(FaturaItem.fatura_id == fatura.id).delete()
        subtotal, total_iva, itens_objs = calcular_itens(db, company_id, dados.itens)
        fatura.subtotal = subtotal
        fatura.total_iva = total_iva
        desconto = float(dados.desconto_percent) if dados.desconto_percent is not None else float(fatura.desconto_percent or 0)
        fatura.total_geral = (subtotal + total_iva) * (1 - desconto/100)
        fatura.itens = itens_objs
    if dados.cliente_id: fatura.cliente_id = dados.cliente_id
    if dados.forma_pagamento: fatura.forma_pagamento = dados.forma_pagamento
    if dados.desconto_percent is not None: fatura.desconto_percent = dados.desconto_percent
    if dados.observacoes is not None: fatura.observacoes = dados.observacoes
    db.commit()
    db.refresh(fatura)
    return fatura

def converter_proforma_para_fatura(db: Session, proforma_id, company_id):
    proforma = db.query(Fatura).filter(Fatura.id == proforma_id, Fatura.company_id == company_id, Fatura.tipo_documento=='proforma').first()
    if not proforma: raise HTTPException(404, "Proforma não encontrada")
    if proforma.status == 'concluida': raise HTTPException(400, "Proforma já convertida")

    nova = Fatura(
        id=uuid.uuid4(),
        company_id=company_id, cliente_id=proforma.cliente_id,
        tipo_documento='fatura', status='emitida',
        numero_fatura=gerar_numero(db, company_id, 'fatura'),
        proforma_origem_id=proforma.id,
        subtotal=proforma.subtotal, total_iva=proforma.total_iva, total_geral=proforma.total_geral,
        forma_pagamento=proforma.forma_pagamento, comunicado_agt=True,
        data_emissao=datetime.utcnow()
    )
    for item in proforma.itens:
        nova.itens.append(FaturaItem(
            id=uuid.uuid4(),
            produto_id=item.produto_id, nome_snapshot=item.nome_snapshot,
            quantidade=item.quantidade, preco_unit_snapshot=item.preco_unit_snapshot,
            iva_percent=item.iva_percent, iva_valor=item.iva_valor, subtotal_linha=item.subtotal_linha
        ))
        prod = db.query(Produto).filter(Produto.id == item.produto_id).first()
        if prod and getattr(prod, "controlar_stock", True):
            prod.stock_atual = float(prod.stock_atual or 0) - float(item.quantidade)

    proforma.status = 'concluida'
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova

def duplicar_fatura(db: Session, fatura_id, company_id):
    orig = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not orig: raise HTTPException(404, "Fatura não encontrada")
    nova = Fatura(
        id=uuid.uuid4(),
        company_id=company_id, cliente_id=orig.cliente_id,
        tipo_documento='proforma', status='em_curso',
        numero_proforma=gerar_numero(db, company_id, 'proforma'),
        validade_proforma=datetime.utcnow() + timedelta(days=15),
        data_vencimento=datetime.utcnow() + timedelta(days=15),
        subtotal=orig.subtotal, total_iva=orig.total_iva, total_geral=orig.total_geral,
        forma_pagamento=orig.forma_pagamento, comunicado_agt=False
    )
    for item in orig.itens:
        nova.itens.append(FaturaItem(
            id=uuid.uuid4(),
            produto_id=item.produto_id, nome_snapshot=item.nome_snapshot,
            quantidade=item.quantidade, preco_unit_snapshot=item.preco_unit_snapshot,
            iva_percent=item.iva_percent, iva_valor=item.iva_valor, subtotal_linha=item.subtotal_linha
        ))
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova
