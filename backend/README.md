# TicketDeck Backend API

A robust, lightweight RESTful backend for the **TicketDeck** IT Support Ticket Management System built with **FastAPI**, **SQLite**, and **Uvicorn**.

---

## 🚀 Features

- **Ticket Management**: Create tickets, list with dynamic search/filtering (by status, priority, category), view details, and update status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
- **Comments Thread**: Add agent/user comments to existing tickets.
- **Attachment Uploads**: Upload attachments to tickets with automatic file validation (allowed extensions & size limit checks up to 10 MB).
- **Dashboard Stats**: Real-time summary statistics for total, open, in-progress, and resolved tickets.
- **Auto Database Initialization**: Automatically creates SQLite tables and `uploads/` directory on application startup.
- **CORS Support**: Pre-configured CORS middleware for seamless frontend integration.

---

## 🛠️ Tech Stack & Requirements

- **Python**: 3.9 or higher
- **Framework**: FastAPI (v0.111.0)
- **ASGI Server**: Uvicorn (v0.29.0)
- **Database**: SQLite3 (with WAL mode & foreign keys enabled)
- **File Uploads**: `python-multipart`, `aiofiles`

---

## 📁 Directory Structure

```text
backend/
├── main.py              # FastAPI application entrypoint & routing logic
├── database.py          # SQLite database connection, table schemas, and helper queries
├── models.py            # Pydantic models & data validation schemas
├── requirements.txt     # Python dependencies
├── ticketdesk.db        # SQLite database file (generated automatically)
└── uploads/             # Directory for stored ticket attachment files
```

---

## ⚙️ Installation & Setup

1. **Navigate to the `backend` directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## ▶️ Running the Backend Server

Start the development server with **Uvicorn**:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

The API will be accessible at:
- **Base URL**: `http://localhost:8001`
- **Interactive OpenAPI (Swagger) Docs**: `http://localhost:8001/docs`
- **ReDoc Documentation**: `http://localhost:8001/redoc`

---

## 📡 API Reference

### Health Check
- `GET /api/health` — Check server health status.

### Dashboard
- `GET /api/dashboard` — Fetch dashboard metrics (total tickets, counts by status, priority breakdown).

### Tickets
- `GET /api/tickets` — List tickets with optional query parameters:
  - `status` (string, e.g. `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)
  - `priority` (string, e.g. `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `category` (string, e.g. `Hardware`, `Software`, `Network`, `Account`, `Other`)
  - `search` (string, searches title and description)
- `POST /api/tickets` — Create a new ticket.
- `GET /api/tickets/{ticket_id}` — Get ticket details including comments and attachments.
- `PATCH /api/tickets/{ticket_id}/status` — Update ticket status.

### Comments
- `POST /api/tickets/{ticket_id}/comments` — Add a comment to a ticket.

### Attachments & Static Files
- `POST /api/tickets/{ticket_id}/attachments` — Upload an attachment (Multipart form-data).
- `GET /uploads/{stored_filename}` — Serve uploaded static file attachments.
