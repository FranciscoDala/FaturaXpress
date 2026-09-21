import uuid
import io
import cloudinary
import cloudinary.uploader
from cloudinary import CloudinaryImage
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings
import imghdr

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

ALLOWED_IMAGE = {"jpg", "jpeg", "png", "webp"}
ALLOWED_FILE = {"jpg", "jpeg", "png", "webp", "pdf"}
MAX_IMAGE = 2 * 1024 * 1024
MAX_FILE = 5 * 1024 * 1024

async def upload_image(file: UploadFile, folder: str = "produtos") -> str:
    if not file.filename:
        raise HTTPException(400, "Arquivo sem nome")
    contents = await file.read()
    if not contents or len(contents) > MAX_IMAGE:
        raise HTTPException(400, "Imagem inválida ou >2MB")
    kind = imghdr.what(None, h=contents)
    if kind not in ALLOWED_IMAGE and kind!= "jpeg":
        raise HTTPException(400, "Não é imagem válida")

    public_id = f"{uuid.uuid4().hex[:8]}_{file.filename.rsplit('.',1)[0][:30]}"
    try:
        res = cloudinary.uploader.upload(
            contents,
            folder=f"faturaxpress/{folder}",
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            access_mode="public"
        )
    except Exception as e:
        raise HTTPException(500, f"Falha upload imagem: {e}")
    return CloudinaryImage(res["public_id"]).build_url(fetch_format="auto", quality="auto")

# NOVA FUNÇÃO PARA FALTAS - PDF E IMAGEM
async def upload_comprovante(file: UploadFile, company_id: str) -> str:
    contents = await file.read()
    if not contents or len(contents) < 10:
        raise HTTPException(400, "Arquivo vazio")
    if len(contents) > MAX_FILE:
        raise HTTPException(400, "Máx 5MB")

    is_pdf = contents[:5] == b'%PDF-' or (file.filename or "").lower().endswith(".pdf")
    ext = "pdf" if is_pdf else "jpg"

    try:
        if is_pdf:
            res = cloudinary.uploader.upload(
                io.BytesIO(contents),
                folder=f"faltas/{company_id}",
                resource_type="auto", # auto funciona no free
                type="upload",
                access_mode="public",
                use_filename=True,
                unique_filename=True,
            )
        else:
            res = cloudinary.uploader.upload(
                io.BytesIO(contents),
                folder=f"faltas/{company_id}",
                resource_type="image",
                type="upload",
                access_mode="public",
                use_filename=True,
                unique_filename=True,
            )
        url = res.get("secure_url")
        if not url:
            raise Exception("Sem secure_url")
        return url
    except Exception as e:
        raise HTTPException(500, f"Falha upload comprovante: {e}")
