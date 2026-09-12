FROM python:3.11-slim

WORKDIR /app

# 1. Instala deps do sistema
RUN apt-get update && apt-get install -y gcc libpq-dev python3-dev && rm -rf /var/lib/apt/lists/*

# 2. Copia TUDO do projeto
COPY . .

# 3. Entra na api e instala
WORKDIR /app/apps/api
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# 4. Volta pra raiz
WORKDIR /app

EXPOSE 10000

CMD ["sh", "-c", "cd apps/api && uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
