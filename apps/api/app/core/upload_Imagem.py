import uuid
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

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}
MAX_SIZE = 2 * 1024 * 1024 # 2MB

async def upload_image(file: UploadFile, folder: str = "produtos") -> str:
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Configuração do Cloudinary não encontrada")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo sem nome")

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas imagens são permitidas")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Extensão não permitida. Use: {', '.join(ALLOWED_EXT)}")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo vazio")
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Imagem muito grande, máximo 2MB")

    # BLINDAGEM: verifica conteúdo real da imagem
    kind = imghdr.what(None, h=contents)
    if kind not in ALLOWED_EXT and kind!= "jpeg":
        raise HTTPException(status_code=400, detail="Arquivo não é imagem válida")

    name_without_ext = file.filename.rsplit(".", 1)[0][:30]
    public_id = f"{uuid.uuid4().hex[:8]}_{name_without_ext}"

    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            folder=f"faturaxpress/{folder}",
            public_id=public_id,
            resource_type="image",
            overwrite=True
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Falha ao enviar imagem: {str(exc)[:100]}")

    optimized_url = CloudinaryImage(upload_result["public_id"]).build_url(fetch_format="auto", quality="auto")
    return optimized_url
