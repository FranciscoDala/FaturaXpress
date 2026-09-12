FROM python:3.11-slim

WORKDIR /app

# 1. Instala deps
RUN apt-get update && apt-get install -y gcc libpq-dev python3-dev && rm -rf /var/lib/apt/lists/*

# 2. Copia só a API primeiro pra cache
COPY apps/api/requirements.txt ./apps/api/
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r apps/api/requirements.txt

# 3. Copia o projeto todo
COPY . .

# 4. Porta do Render
EXPOSE 10000

# 5. Roda de dentro da pasta apps/api
WORKDIR /app/apps/api
CMD ["sh", "-c", "uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
