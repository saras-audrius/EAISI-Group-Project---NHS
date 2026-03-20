FROM python:3.11-slim

RUN apt-get update && apt-get install -y git git-lfs && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone the full repo including LFS model files (public repo, no credentials needed)
RUN git lfs install && \
    git clone https://github.com/saras-audrius/EAISI-Group-Project---NHS.git .

# Install only backend dependencies
RUN pip install --no-cache-dir -r webapp/backend/requirements.txt

WORKDIR /app/webapp/backend

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
