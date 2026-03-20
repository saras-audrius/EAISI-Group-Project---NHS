FROM python:3.11-slim

# Install git-lfs to pull actual model files during build
RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install only backend dependencies
COPY webapp/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full repo (includes .git so lfs pull can resolve pointers)
COPY . .

# Replace LFS pointer files with actual model files
RUN git lfs install && git lfs pull

WORKDIR /app/webapp/backend

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
