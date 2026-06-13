# --- Stage 1: build the React frontend into frontend/dist ---
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python server that also serves the built frontend ---
FROM python:3.12-slim
WORKDIR /app
COPY . /app
# Bring in the compiled frontend so server.py can serve it at "/".
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# The app binds to 0.0.0.0 and reads the PORT env var (defaults to 8000).
ENV PORT=8000
EXPOSE 8000

CMD ["python", "server.py"]
