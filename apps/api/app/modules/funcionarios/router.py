from fastapi import APIRouter, Depends, HTTPException, Request, Query, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import uuid
import io
import re
import time
import logging
import requests
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from typing import List, Optional

from jose import jwt

from app.db.session import get_db
from app.core.security import get_current_company_id
from app.core.config import settings
from app.modules.funcionarios.schemas import FuncionarioCreate, FuncionarioResponse, FuncionarioUpdate
from app.modules.funcionarios import service as func_service
from app.modules.funcionarios.models import Funcionario, Notificacao

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

router = APIRouter(prefix="/funcionarios", tags=["Funcionários"])
rh_router = APIRouter(prefix="/rh", tags=["RH - Ponto"])
upload_router = APIRouter(prefix="/upload", tags=["Upload"])

# ---------- UPLOAD CORRIGIDO ----------
@upload_router.post("/falta")
async def upload_falta(file: UploadFile = File(...), company_id: uuid.UUID = Depends(get_current_company_id)):
    contents = await file.read()
    is_pdf = contents[:4] == b'%PDF' or (file.filename or "").lower().endswith(".pdf")

    res = cloudinary.uploader.upload(
        io.BytesIO(contents),
        folder=f"faltas/{company_id}",
        resource_type="raw" if is_pdf else "image",
        access_mode="public",
        use_filename=True,
        unique_filename=True
    )
    return {
        "url": res["secure_url"],
        "public_id": res["public_id"],
        "resource_type": res["resource_type"],
        "format": res.get("format") or ("pdf" if is_pdf else None),
        "tipo": "pdf" if is_pdf else "imagem",
    }

# ---------- DOWNLOAD UNICO - PROXY PRA PDF ----------
@rh_router.get("/falta/{falta_id}/anexo")
@upload_router.get("/falta/{falta_id}/anexo")
def falta_get_anexo(
    falta_id: uuid.UUID,
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    raw_token = None
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        jwt.decode(raw_token, settings.SECRET_KEY, algorithms=["HS256"])
    except Exception as e:
        logger.error(f"[ANEXO] token inválido {e}")
        raise HTTPException(status_code=401, detail="Token inválido")

    falta_any = db.query(func_service.PedidoRH).filter(func_service.PedidoRH.id == falta_id).first()
    if not falta_any or not falta_any.justificativa_anexo_url:
        raise HTTPException(status_code=404, detail="Falta sem anexo")

    stored_url: str = str(falta_any.justificativa_anexo_url).strip()
    if not stored_url:
        raise HTTPException(status_code=404, detail="Falta sem anexo")

    try:
        if "cloudinary.com" not in stored_url or "/upload/" not in stored_url:
            raise ValueError("URL de anexo inválida")

        is_raw = "/raw/upload/" in stored_url
        is_pdf = stored_url.lower().split("?", 1)[0].endswith(".pdf")
        public_id = stored_url.split("/upload/", 1)[1].split("?", 1)[0]
        public_id = re.sub(r"^v\d+/", "", public_id)
        public_id = re.sub(r"^s--[A-Za-z0-9_-]+--/", "", public_id)
        public_id = public_id.rsplit(".", 1)[0]

        if is_raw:
            signed_url = cloudinary.utils.private_download_url(
                public_id,
                "pdf" if is_pdf else "",
                resource_type="raw",
                type="upload",
                expires_at=int(time.time()) + 3600,
            )
        else:
            signed_url = stored_url

        r = requests.get(signed_url, stream=True, timeout=30)
        r.raise_for_status()
        media_type = r.headers.get("Content-Type", "").split(";", 1)[0]
        if not media_type or media_type == "application/octet-stream":
            media_type = "application/pdf" if is_pdf else "image/png"
        extension = "pdf" if is_pdf else (media_type.split("/", 1)[-1] or "bin")

        return StreamingResponse(
            r.iter_content(chunk_size=8192),
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{public_id.split("/")[-1]}.{extension}"',
                "Cache-Control": "no-store",
            },
        )
    except (requests.RequestException, ValueError) as e:
        logger.error(f"[ANEXO] falha proxy pdf {e} url={stored_url}")
        raise HTTPException(status_code=502, detail="Não foi possível obter o anexo")

# --- SEUS ROUTERS EXISTENTES ---
@router.post("", response_model=FuncionarioResponse, status_code=201)
def criar(dados: FuncionarioCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.criar_funcionario(db, company_id, dados)

@router.get("", response_model=List[FuncionarioResponse])
def listar(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.listar_funcionarios(db, company_id)

@router.get("/{funcionario_id}", response_model=FuncionarioResponse)
def obter(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    func = func_service.obter_funcionario(db, company_id, funcionario_id)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    return func

@router.put("/{funcionario_id}", response_model=FuncionarioResponse)
@router.patch("/{funcionario_id}", response_model=FuncionarioResponse)
def atualizar(funcionario_id: uuid.UUID, dados: FuncionarioUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    func = func_service.obter_funcionario(db, company_id, funcionario_id)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    return func_service.atualizar_funcionario(db, func, dados, company_id)

@router.delete("/{funcionario_id}", status_code=204)
def desativar(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    func = func_service.obter_funcionario(db, company_id, funcionario_id)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    func_service.desativar_funcionario(db, func)
    return None

@router.post("/login-bi")
def login_bi(numero_bi: str, senha: str, db: Session = Depends(get_db)):
    from app.modules.funcionarios.service import pwd_context
    bi = numero_bi.strip().upper()
    func = db.query(Funcionario).filter(Funcionario.numero_bi == bi, Funcionario.tem_acesso == True, Funcionario.ativo == True).first()
    if not func or not func.senha_hash or not pwd_context.verify(senha, func.senha_hash):
        raise HTTPException(401, "BI ou senha inválidos")
    return {"id": str(func.id), "nome": func.nome, "cargo": func.cargo, "company_id": str(func.company_id)}

@rh_router.get("/ponto")
def ponto_por_data(data: Optional[str] = Query(None), db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    data_alvo = func_service.parse_data(data)
    return func_service.listar_ponto_por_data(db, company_id, data_alvo)

@rh_router.get("/faltas")
def faltas_por_data(data: Optional[str] = Query(None), db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    data_alvo = func_service.parse_data(data)
    return func_service.listar_faltas_por_data(db, company_id, data_alvo)

@rh_router.get("/ponto/hoje")
def ponto_hoje(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.listar_ponto_hoje(db, company_id)

@rh_router.get("/ponto/semana")
def ponto_semana(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.listar_ponto_semana(db, company_id)

@rh_router.get("/ponto/config")
def get_config(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.get_config_ponto(db, company_id)

@rh_router.put("/ponto/config")
def update_config(payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    cfg = func_service.get_config_ponto(db, company_id)
    for k, v in payload.items():
        if hasattr(cfg, k):
            setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg

@rh_router.get("/faltas/hoje")
def faltas_hoje(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.listar_faltas_hoje(db, company_id)

@rh_router.get("/ponto/{periodo}")
def ponto_periodo(periodo: str, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    if periodo not in ["semana", "mes"]:
        raise HTTPException(400, "periodo inválido")
    return func_service.listar_ponto_periodo(db, company_id, periodo)

@rh_router.post("/ponto/bater")
def ponto_bater(payload: dict, request: Request, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    funcionario_id = payload.get("funcionario_id")
    tipo = payload.get("tipo")
    data_str = payload.get("data")
    motivo_retroativo = payload.get("motivo_retroativo")
    lancado_por_id = payload.get("lancado_por_id")
    if not funcionario_id or not tipo:
        raise HTTPException(400, "funcionario_id e tipo obrigatórios")
    try:
        fid = uuid.UUID(funcionario_id)
    except:
        raise HTTPException(400, "funcionario_id inválido")
    func = func_service.obter_funcionario(db, company_id, fid)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    ip = request.client.host if request.client else None
    lancado_uuid = None
    is_admin = False
    if lancado_por_id:
        try:
            lancado_uuid = uuid.UUID(lancado_por_id)
            solicitante = db.query(Funcionario).filter(Funcionario.id == lancado_uuid).first()
            if solicitante and solicitante.cargo == 'admin':
                is_admin = True
        except:
            pass
    return func_service.bater_ponto_rh(db, company_id, fid, tipo, ip, data_str, motivo_retroativo, lancado_uuid, is_admin=is_admin)

@rh_router.post("/falta")
def falta_manual(payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    funcionario_id = payload.get("funcionario_id")
    motivo = payload.get("motivo", "Falta - RH")
    categoria = payload.get("categoria", "outros")
    observacao = payload.get("observacao")
    data_str = payload.get("data")
    motivo_retroativo = payload.get("motivo_retroativo")
    lancado_por_id = payload.get("lancado_por_id")
    if not funcionario_id:
        raise HTTPException(400, "funcionario_id obrigatório")
    try:
        fid = uuid.UUID(funcionario_id)
    except:
        raise HTTPException(400, "funcionario_id inválido")
    lancado_uuid = None
    is_admin = False
    if lancado_por_id:
        try:
            lancado_uuid = uuid.UUID(lancado_por_id)
            solicitante = db.query(Funcionario).filter(Funcionario.id == lancado_uuid).first()
            if solicitante and solicitante.cargo == 'admin':
                is_admin = True
        except:
            pass
    return func_service.marcar_falta_manual(db, company_id, fid, motivo, categoria, observacao, data_str, motivo_retroativo, lancado_uuid, is_admin=is_admin)

@rh_router.post("/falta/{falta_id}/justificar")
def falta_justificar(falta_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    tipo = payload.get("tipo", "atestado")
    obs = payload.get("observacao")
    anexo_url = payload.get("anexo_url")
    justificado_por_id = payload.get("justificado_por_id")
    try:
        jid = uuid.UUID(justificado_por_id) if justificado_por_id else None
    except:
        jid = None
    return func_service.justificar_falta(db, company_id, falta_id, tipo, obs, anexo_url, jid)

@rh_router.post("/falta/{falta_id}/aprovar")
def falta_aprovar(falta_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    aprovado_por_id = payload.get("aprovado_por_id")
    obs = payload.get("observacao")
    try:
        aid = uuid.UUID(aprovado_por_id) if aprovado_por_id else None
    except:
        aid = None
    falta = db.query(func_service.PedidoRH).filter(func_service.PedidoRH.id == falta_id, func_service.PedidoRH.company_id == company_id).first()
    if falta and getattr(falta, "dono_atual", "rh") == "admin":
        solicitante = db.query(Funcionario).filter(Funcionario.id == aid).first() if aid else None
        if not solicitante or solicitante.cargo!= "admin":
            raise HTTPException(403, "Falta já encaminhada para admin. Só admin pode aprovar.")
    return func_service.aprovar_falta(db, company_id, falta_id, aid, obs)

@rh_router.post("/falta/{falta_id}/rejeitar")
def falta_rejeitar(falta_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    aprovado_por_id = payload.get("aprovado_por_id")
    obs = payload.get("observacao")
    try:
        aid = uuid.UUID(aprovado_por_id) if aprovado_por_id else None
    except:
        aid = None
    falta = db.query(func_service.PedidoRH).filter(func_service.PedidoRH.id == falta_id, func_service.PedidoRH.company_id == company_id).first()
    if falta and getattr(falta, "dono_atual", "rh") == "admin":
        solicitante = db.query(Funcionario).filter(Funcionario.id == aid).first() if aid else None
        if not solicitante or solicitante.cargo!= "admin":
            raise HTTPException(403, "Falta já encaminhada para admin. Só admin pode rejeitar.")
    return func_service.rejeitar_falta(db, company_id, falta_id, aid, obs)

@rh_router.delete("/falta/{falta_id}")
def falta_remover(falta_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.remover_falta(db, company_id, falta_id)

@rh_router.post("/falta/{falta_id}/encaminhar-admin")
def falta_encaminhar_admin(falta_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    encaminhado_por_id = payload.get("encaminhado_por_id")
    try:
        eid = uuid.UUID(encaminhado_por_id) if encaminhado_por_id else None
    except:
        eid = None
    return func_service.encaminhar_falta_para_admin(db, company_id, falta_id, eid)

@rh_router.get("/notificacoes")
def notificacoes(area: str = Query(..., description="rh, admin, financeira, recepcao"), status: Optional[str] = None, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    if area not in ["rh", "admin", "financeira", "recepcao"]:
        raise HTTPException(400, "Area inválida")
    return func_service.listar_notificacoes(db, company_id, area, status)

@rh_router.post("/notificacoes/{notificacao_id}/lida")
def notificacao_lida(notificacao_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    notif = db.query(Notificacao).filter(Notificacao.id == notificacao_id, Notificacao.company_id == company_id).first()
    if not notif:
        raise HTTPException(404, "Notificação não encontrada")
    notif.lida = True
    notif.status = "lida"
    db.commit()
    return {"ok": True}

@rh_router.post("/atrasos/{funcionario_id}/aplicar")
def atraso_aplicar(funcionario_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    aplicado_por_id = payload.get("aplicado_por_id")
    try:
        aid = uuid.UUID(aplicado_por_id) if aplicado_por_id else None
    except:
        aid = None
    return func_service.aplicar_falta_por_atraso(db, company_id, funcionario_id, aid)

@rh_router.post("/atrasos/{funcionario_id}/ignorar")
def atraso_ignorar(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.ignorar_atrasos(db, company_id, funcionario_id)

@rh_router.post("/atrasos/{funcionario_id}/encaminhar-admin")
def atraso_encaminhar(funcionario_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    encaminhado_por_id = payload.get("encaminhado_por_id")
    try:
        eid = uuid.UUID(encaminhado_por_id) if encaminhado_por_id else None
    except:
        eid = None
    return func_service.encaminhar_atraso_para_admin(db, company_id, funcionario_id, eid)

@rh_router.post("/atrasos/{funcionario_id}/aplicar-falta")
def atraso_aplicar_falta_alias(funcionario_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    aplicado_por_id = payload.get("aplicado_por_id")
    try:
        aid = uuid.UUID(aplicado_por_id) if aplicado_por_id else None
    except:
        aid = None
    return func_service.aplicar_falta_por_atraso(db, company_id, funcionario_id, aid)

@rh_router.post("/atrasos/{funcionario_id}/ignorar-atraso")
def atraso_ignorar_alias(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.ignorar_atrasos(db, company_id, funcionario_id)
