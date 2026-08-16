from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TicketCategory(str, Enum):
    NETWORK = "Network"
    HARDWARE = "Hardware"
    SOFTWARE = "Software"
    ACCESS = "Access"
    OTHER = "Other"


# ── Request bodies ──────────────────────────────────────────────────────────────

class CreateTicketRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category: TicketCategory = TicketCategory.OTHER
    priority: TicketPriority = TicketPriority.MEDIUM


class UpdateStatusRequest(BaseModel):
    status: TicketStatus


class AddCommentRequest(BaseModel):
    author: str = Field(default="Support Agent", max_length=100)
    body: str = Field(..., min_length=1)


# ── Response models ─────────────────────────────────────────────────────────────

class CommentOut(BaseModel):
    id: int
    ticket_id: int
    author: str
    body: str
    created_at: str


class AttachmentOut(BaseModel):
    id: int
    ticket_id: int
    filename: str
    stored_name: str
    uploaded_at: str


class TicketOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    created_at: str
    updated_at: str


class TicketDetailOut(TicketOut):
    comments: List[CommentOut] = []
    attachments: List[AttachmentOut] = []
