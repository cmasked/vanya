FROM python:3.12-slim
WORKDIR /app
COPY --chown=10001:10001 yogya-backend /app/yogya-backend
COPY --chown=10001:10001 yogya-data /app/yogya-data
COPY --chown=10001:10001 yogya-ai-engine /app/yogya-ai-engine
RUN pip install --no-cache-dir -r yogya-backend/requirements.txt -r yogya-data/requirements.txt -e /app/yogya-ai-engine
WORKDIR /app/yogya-backend
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000","--no-access-log"]
