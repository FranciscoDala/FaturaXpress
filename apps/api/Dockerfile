FROM python:3.11-slim

WORKDIR /app

# 1. Instala dependências do sistema
RUN apt-get update && apt-get install -y gcc libpq-dev python3-dev && rm -rf /var/lib/apt/lists/*

# 2. Entra na pasta da API
WORKDIR /app/apps/api

# 3. Copia requirements - AGORA SEM "apps/api/" na frente
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# 4. Copia o projeto todo
COPY . .

# 5. Porta
EXPOSE 10000

# 6. Roda a API - caminho é src.app.main
CMD ["sh", "-c", "cd /app && uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
