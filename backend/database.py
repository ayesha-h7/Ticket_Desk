import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "ticketdesk.db"
UPLOADS_DIR = Path(__file__).parent / "uploads"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    UPLOADS_DIR.mkdir(exist_ok=True)
    conn = get_connection()
    with conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tickets (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                description TEXT    NOT NULL,
                category    TEXT    NOT NULL DEFAULT 'Other',
                priority    TEXT    NOT NULL DEFAULT 'MEDIUM',
                status      TEXT    NOT NULL DEFAULT 'OPEN',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS comments (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                author     TEXT    NOT NULL DEFAULT 'Support Agent',
                body       TEXT    NOT NULL,
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS attachments (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                filename    TEXT    NOT NULL,
                stored_name TEXT    NOT NULL,
                uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
    conn.close()


# ── Ticket helpers ──────────────────────────────────────────────────────────────

def db_list_tickets(status=None, priority=None, category=None, search=None):
    conn = get_connection()
    query = "SELECT * FROM tickets WHERE 1=1"
    params: list = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if priority:
        query += " AND priority = ?"
        params.append(priority)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def db_get_ticket(ticket_id: int):
    conn = get_connection()
    ticket = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if not ticket:
        conn.close()
        return None
    ticket = dict(ticket)
    ticket["comments"] = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC",
            (ticket_id,),
        ).fetchall()
    ]
    ticket["attachments"] = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM attachments WHERE ticket_id = ? ORDER BY uploaded_at ASC",
            (ticket_id,),
        ).fetchall()
    ]
    conn.close()
    return ticket


def db_create_ticket(title, description, category, priority) -> dict:
    conn = get_connection()
    with conn:
        cur = conn.execute(
            "INSERT INTO tickets (title, description, category, priority) VALUES (?, ?, ?, ?)",
            (title, description, category, priority),
        )
        ticket_id = cur.lastrowid
    ticket = db_get_ticket(ticket_id)
    conn.close()
    return ticket


def db_update_status(ticket_id: int, new_status: str) -> dict | None:
    conn = get_connection()
    with conn:
        conn.execute(
            "UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?",
            (new_status, ticket_id),
        )
    ticket = db_get_ticket(ticket_id)
    conn.close()
    return ticket


# ── Comment helpers ──────────────────────────────────────────────────────────────

def db_add_comment(ticket_id: int, author: str, body: str) -> dict:
    conn = get_connection()
    with conn:
        cur = conn.execute(
            "INSERT INTO comments (ticket_id, author, body) VALUES (?, ?, ?)",
            (ticket_id, author, body),
        )
        comment_id = cur.lastrowid
        comment = dict(
            conn.execute(
                "SELECT * FROM comments WHERE id = ?", (comment_id,)
            ).fetchone()
        )
    conn.close()
    return comment


# ── Attachment helpers ──────────────────────────────────────────────────────────

def db_add_attachment(ticket_id: int, filename: str, stored_name: str) -> dict:
    conn = get_connection()
    with conn:
        cur = conn.execute(
            "INSERT INTO attachments (ticket_id, filename, stored_name) VALUES (?, ?, ?)",
            (ticket_id, filename, stored_name),
        )
        att_id = cur.lastrowid
        att = dict(
            conn.execute(
                "SELECT * FROM attachments WHERE id = ?", (att_id,)
            ).fetchone()
        )
    conn.close()
    return att


# ── Dashboard helpers ──────────────────────────────────────────────────────────

def db_dashboard_stats() -> dict:
    conn = get_connection()
    status_rows = conn.execute(
        "SELECT status, COUNT(*) as count FROM tickets GROUP BY status"
    ).fetchall()
    priority_rows = conn.execute(
        "SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority"
    ).fetchall()
    total = conn.execute("SELECT COUNT(*) as c FROM tickets").fetchone()["c"]
    recent = [
        dict(r)
        for r in conn.execute(
            "SELECT id, title, status, priority, created_at FROM tickets ORDER BY created_at DESC LIMIT 5"
        ).fetchall()
    ]
    conn.close()
    return {
        "total": total,
        "by_status": {r["status"]: r["count"] for r in status_rows},
        "by_priority": {r["priority"]: r["count"] for r in priority_rows},
        "recent_tickets": recent,
    }
