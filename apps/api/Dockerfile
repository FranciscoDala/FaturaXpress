FROM python:3.11-slim

WORKDIR /app

# Só instala o essencial
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

COPY . .

WORKDIR /app/apps/api
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

WORKDIR /app
EXPOSE 10000

CMD ["sh", "-c", "cd apps/api && uvicorn src.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
