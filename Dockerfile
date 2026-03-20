FROM python:3.11-slim

WORKDIR /app

# Install only backend dependencies
COPY webapp/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full repo so model paths resolve correctly
COPY . .

WORKDIR /app/webapp/backend

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
