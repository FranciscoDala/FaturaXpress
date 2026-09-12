FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

# CORRIGIDO: Roda de dentro da api e aponta o caminho certo
WORKDIR /app/apps/api
CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "10000"]
