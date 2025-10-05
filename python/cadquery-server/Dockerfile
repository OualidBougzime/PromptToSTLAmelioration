FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for CadQuery
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglu1-mesa \
    libxi6 \
    libxmu6 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8788

CMD ["python", "server.py"]