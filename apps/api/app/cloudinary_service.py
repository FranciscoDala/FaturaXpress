import uuid
import cloudinary
import cloudinary.uploader
from cloudinary import CloudinaryImage
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


async def upload_to_cloudinary(file: UploadFile, folder: str = "logos") -> dict:
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuração do Cloudinary não encontrada"
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo sem nome"
        )

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas imagens são permitidas"
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo vazio"
        )

    filename = file.filename
    name_without_ext = filename.rsplit(".", 1)[0]
    public_id = f"{uuid.uuid4().hex[:8]}_{name_without_ext}"

    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            folder=f"sige/{folder}",
            public_id=public_id,
            resource_type="image",
            overwrite=True
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao enviar imagem para Cloudinary: {str(exc)}"
        )

    optimized_url = CloudinaryImage(upload_result["public_id"]).build_url(
        fetch_format="auto",
        quality="auto"
    )

    return {
        "original_url": upload_result["secure_url"],
        "optimized_url": optimized_url,
        "public_id": upload_result["public_id"],
        "width": upload_result["width"],
        "height": upload_result["height"],
        "format": upload_result["format"],
    }
