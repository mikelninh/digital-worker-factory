FROM python:3.11-slim
WORKDIR /workspace
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd -m appuser
COPY app ./app
COPY static ./static
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 LOOP_DB_PATH=/tmp/return_loop.sqlite3 LOOP_ALLOW_RESET=0
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
