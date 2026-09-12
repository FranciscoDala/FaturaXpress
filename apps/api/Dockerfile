FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

COPY . .

# INSTALA USANDO CAMINHO ABSOLUTO. Não depende de WORKDIR
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/apps/api/requirements.txt

EXPOSE 10000

# Roda de dentro da pasta api
WORKDIR /app/apps/api
CMD ["sh", "-c", "uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
