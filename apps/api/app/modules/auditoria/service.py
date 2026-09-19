import uuid
from sqlalchemy.orm import Session
from app.modules.auditoria.models import AtividadeLog

def log_atividade(
    db: Session,
    company_id: uuid.UUID,
    usuario,
    acao: str,
    entidade: str,
    entidade_id: uuid.UUID | None = None,
    detalhe: dict | None = None,
    area_id: uuid.UUID | None = None,
    ip: str | None = None
):
    """Não mexe nas tabelas existentes, só insere aqui"""
    log = AtividadeLog(
        id=uuid.uuid4(),
        company_id=company_id,
        usuario_id=getattr(usuario, 'id', None),
        usuario_nome=getattr(usuario, 'nome', None) or getattr(usuario, 'email', 'sistema'),
        usuario_cargo=getattr(usuario, 'cargo', None),
        area_id=area_id or getattr(usuario, 'area_principal_id', None),
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        detalhe=detalhe,
        ip=ip
    )
    db.add(log)
    db.commit()
    return log
