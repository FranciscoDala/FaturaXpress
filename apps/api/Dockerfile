FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev python3-dev libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev libcairo2 libpangoft2-1.0-0 shared-mime-info && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

CMD ["sh", "-c", "cd /app && alembic -c /app/alembic.ini upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
