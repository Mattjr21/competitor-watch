FROM python:3.12-slim

WORKDIR /app
COPY . /app

# The app binds to 0.0.0.0 and reads the PORT env var (defaults to 8000).
ENV PORT=8000
EXPOSE 8000

CMD ["python", "server.py"]
