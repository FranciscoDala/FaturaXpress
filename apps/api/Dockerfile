FROM python:3.11-slim

WORKDIR /app

# 1. Instala dependências do sistema pra compilar bcrypt e asyncpg
RUN apt-get update && apt-get install -y gcc libpq-dev python3-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

# RODA A MIGRATION COM CAMINHO CERTO E DEPOIS SOBE A API
CMD ["sh", "-c", "cd /app && alembic -c /app/alembic.ini upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
