# =========================
# Stage 1: Builder
# =========================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install Python dependencies into a separate directory.
COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# =========================
# Stage 2: Runtime
# =========================
FROM python:3.11-slim AS runtime

WORKDIR /app

# Create a non-root user and group.
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup appuser

# Copy only the installed Python dependencies
# from the builder stage.
COPY --from=builder /install /usr/local

# Copy application source code.
COPY main.py database.py models.py ./

# Create the uploads directory and give the application user ownership.
RUN mkdir -p /app/uploads \
    && chown -R appuser:appgroup /app

# Run the application as a non-root user.
USER appuser

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]