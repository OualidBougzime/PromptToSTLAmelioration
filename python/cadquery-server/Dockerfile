FROM python:3.11-slim

WORKDIR /app

# Install ALL system dependencies for CadQuery (including X11)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglu1-mesa \
    libxi6 \
    libxmu6 \
    libglib2.0-0 \
    libxrender1 \
    libxext6 \
    libsm6 \
    libice6 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8788

CMD ["python", "server.py"]