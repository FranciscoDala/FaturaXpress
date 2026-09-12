FROM python:3.11-slim

WORKDIR /app

# 1. Entra na pasta da API
WORKDIR /app/apps/api

# 2. Instala dependências do sistema pra compilar bcrypt e psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev python3-dev && rm -rf /var/lib/apt/lists/*

# 3. Copia só o requirements primeiro pra cache
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# 4. Copia todo o projeto
COPY . .

# 5. Porta que o Render usa
EXPOSE 10000

# 6. Caminho certo: src.app.main porque tá dentro de src/app/
CMD ["sh", "-c", "uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
