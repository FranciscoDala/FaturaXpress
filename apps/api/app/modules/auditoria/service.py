import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.modules.auditoria.models import AtividadeLog

def log_atividade(
    db: Session,
    company_id: uuid.UUID,
    usuario,
    acao: str,
    entidade: str,
    entidade_id: Optional[uuid.UUID] = None,
    detalhe: Optional[dict] = None,
    area_id: Optional[uuid.UUID] = None,
    ip: Optional[str] = None
):
    """Só insere log, não altera nada. Safe pra usar em qualquer lugar"""
    try:
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
        db.refresh(log)
        return log
    except Exception:
        # auditoria nunca pode quebrar a operação principal
        db.rollback()
        return None

def listar_logs(db: Session, company_id: uuid.UUID, limit: int = 100):
    return db.query(AtividadeLog).filter(
        AtividadeLog.company_id == company_id
    ).order_by(AtividadeLog.created_at.desc()).limit(limit).all()
