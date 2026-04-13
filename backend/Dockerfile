FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install dependencies first (Docker caches this layer separately)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app code
COPY . .

# Expose port 8000
EXPOSE 8000

# Start the server with hot-reload enabled for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]