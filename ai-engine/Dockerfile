# Use Python slim as the base image
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required by OpenCV and ONNX
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose API port
EXPOSE 5000

# Start the AI Engine
CMD ["python", "app.py"]
