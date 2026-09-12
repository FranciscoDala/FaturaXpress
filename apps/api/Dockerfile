FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

# Copia só o requirements da raiz primeiro pra cache
COPY requirements.txt .

# Instala
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Agora copia o código todo
COPY . .

EXPOSE 10000

# Roda de dentro da pasta api
WORKDIR /app/apps/api
CMD ["sh", "-c", "uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
