import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import (
    init_db,
    UPLOADS_DIR,
    db_list_tickets,
    db_get_ticket,
    db_create_ticket,
    db_update_status,
    db_add_comment,
    db_add_attachment,
    db_dashboard_stats,
)
from models import (
    CreateTicketRequest,
    UpdateStatusRequest,
    AddCommentRequest,
    TicketOut,
    TicketDetailOut,
    CommentOut,
    AttachmentOut,
    TicketStatus,
)

# ── App setup ────────────────────────────────────────────────────────────────────

# Ensure DB and uploads dir exist before the static files mount
init_db()

app = FastAPI(title="TicketDesk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ── Dashboard ────────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard():
    return db_dashboard_stats()


# ── Tickets ──────────────────────────────────────────────────────────────────────

@app.get("/api/tickets", response_model=list[TicketOut])
def list_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    return db_list_tickets(status=status, priority=priority, category=category, search=search)


@app.post("/api/tickets", response_model=TicketDetailOut, status_code=201)
def create_ticket(body: CreateTicketRequest):
    return db_create_ticket(
        title=body.title,
        description=body.description,
        category=body.category.value,
        priority=body.priority.value,
    )


@app.get("/api/tickets/{ticket_id}", response_model=TicketDetailOut)
def get_ticket(ticket_id: int):
    ticket = db_get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.patch("/api/tickets/{ticket_id}/status", response_model=TicketDetailOut)
def update_status(ticket_id: int, body: UpdateStatusRequest):
    ticket = db_get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updated = db_update_status(ticket_id, body.status.value)
    return updated


# ── Comments ─────────────────────────────────────────────────────────────────────

@app.post("/api/tickets/{ticket_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(ticket_id: int, body: AddCommentRequest):
    ticket = db_get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_add_comment(ticket_id, body.author, body.body)


# ── Attachments ──────────────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".txt", ".csv", ".log", ".zip",
}
MAX_FILE_SIZE_MB = 10


@app.post("/api/tickets/{ticket_id}/attachments", response_model=AttachmentOut, status_code=201)
async def upload_attachment(ticket_id: int, file: UploadFile = File(...)):
    ticket = db_get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / stored_name

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit")

    with open(dest, "wb") as f:
        f.write(contents)

    return db_add_attachment(ticket_id, file.filename, stored_name)


# ── Health ───────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "TicketDesk API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
