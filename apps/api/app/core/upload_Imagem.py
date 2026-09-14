import uuid
import os
from fastapi import UploadFile

async def upload_image(file: UploadFile, folder: str) -> str:
    # Valida se veio filename
    if not file.filename:
        raise ValueError("Arquivo sem nome")

    file_ext = file.filename.split(".")[-1] # <- CORRIGIDO
    file_name = f"{uuid.uuid4()}.{file_ext}"

    # Aqui você faria o upload pro S3/Cloudinary
    # Por enquanto só simula
    path = f"/mnt/data/{folder}/{file_name}"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    return f"https://your-cdn.com/{folder}/{file_name}"
