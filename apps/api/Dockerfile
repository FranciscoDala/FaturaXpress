FROM python:3.11-slim

WORKDIR /app

# 1. Instala só o necessário
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

# 2. Copia SÓ a pasta da API primeiro
COPY apps/api/ ./apps/api/

# 3. Instala
WORKDIR /app/apps/api
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# 4. Agora copia o resto do projeto
WORKDIR /app
COPY . .

EXPOSE 10000

CMD ["sh", "-c", "cd apps/api && uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
