import os
import sqlite3
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


DB_PATH = Path(__file__).parent / "ticketdesk.db"
UPLOADS_DIR = Path(__file__).parent / "uploads"


def use_postgres() -> bool:
    return bool(os.getenv("DB_HOST"))


def get_connection():
    if use_postgres():
        return psycopg.connect(
            host=os.environ["DB_HOST"],
            port=os.getenv("DB_PORT", "5432"),
            dbname=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            row_factory=dict_row,
        )

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    UPLOADS_DIR.mkdir(exist_ok=True)

    conn = get_connection()

    with conn:
        if use_postgres():
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tickets (
                    id          BIGSERIAL PRIMARY KEY,
                    title       TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category    TEXT NOT NULL DEFAULT 'Other',
                    priority    TEXT NOT NULL DEFAULT 'MEDIUM',
                    status      TEXT NOT NULL DEFAULT 'OPEN',
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS comments (
                    id         BIGSERIAL PRIMARY KEY,
                    ticket_id  BIGINT NOT NULL
                               REFERENCES tickets(id)
                               ON DELETE CASCADE,
                    author     TEXT NOT NULL DEFAULT 'Support Agent',
                    body       TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS attachments (
                    id          BIGSERIAL PRIMARY KEY,
                    ticket_id   BIGINT NOT NULL
                               REFERENCES tickets(id)
                               ON DELETE CASCADE,
                    filename    TEXT NOT NULL,
                    stored_name TEXT NOT NULL,
                    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        else:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS tickets (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    title       TEXT NOT NULL,
                    description TEXT NOT NULL,
                    category    TEXT NOT NULL DEFAULT 'Other',
                    priority    TEXT NOT NULL DEFAULT 'MEDIUM',
                    status      TEXT NOT NULL DEFAULT 'OPEN',
                    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS comments (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                    author     TEXT NOT NULL DEFAULT 'Support Agent',
                    body       TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS attachments (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                    filename    TEXT NOT NULL,
                    stored_name TEXT NOT NULL,
                    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                """
            )

    conn.close()


# ── Ticket helpers ──────────────────────────────────────────────────────────────

def db_list_tickets(status=None, priority=None, category=None, search=None):
    conn = get_connection()

    query = "SELECT * FROM tickets WHERE 1=1"
    params = []

    placeholder = "?" if not use_postgres() else "%s"

    if status:
        query += f" AND status = {placeholder}"
        params.append(status)

    if priority:
        query += f" AND priority = {placeholder}"
        params.append(priority)

    if category:
        query += f" AND category = {placeholder}"
        params.append(category)

    if search:
        query += (
            f" AND (title "
            f"{'LIKE' if not use_postgres() else 'ILIKE'} {placeholder} "
            f"OR description "
            f"{'LIKE' if not use_postgres() else 'ILIKE'} {placeholder})"
        )
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY created_at DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [dict(r) for r in rows]


def db_get_ticket(ticket_id: int):
    conn = get_connection()

    placeholder = "?" if not use_postgres() else "%s"

    ticket = conn.execute(
        f"SELECT * FROM tickets WHERE id = {placeholder}",
        (ticket_id,),
    ).fetchone()

    if not ticket:
        conn.close()
        return None

    ticket = dict(ticket)

    comments = conn.execute(
        f"""
        SELECT *
        FROM comments
        WHERE ticket_id = {placeholder}
        ORDER BY created_at ASC
        """,
        (ticket_id,),
    ).fetchall()

    attachments = conn.execute(
        f"""
        SELECT *
        FROM attachments
        WHERE ticket_id = {placeholder}
        ORDER BY uploaded_at ASC
        """,
        (ticket_id,),
    ).fetchall()

    ticket["comments"] = [dict(r) for r in comments]
    ticket["attachments"] = [dict(r) for r in attachments]

    conn.close()

    return ticket


def db_create_ticket(title, description, category, priority) -> dict:
    conn = get_connection()

    if use_postgres():
        with conn:
            cur = conn.execute(
                """
                INSERT INTO tickets
                    (title, description, category, priority)
                VALUES
                    (%s, %s, %s, %s)
                RETURNING id
                """,
                (title, description, category, priority),
            )
            ticket_id = cur.fetchone()["id"]
    else:
        with conn:
            cur = conn.execute(
                """
                INSERT INTO tickets
                    (title, description, category, priority)
                VALUES
                    (?, ?, ?, ?)
                """,
                (title, description, category, priority),
            )
            ticket_id = cur.lastrowid

    conn.close()

    return db_get_ticket(ticket_id)


def db_update_status(ticket_id: int, new_status: str):
    conn = get_connection()

    placeholder = "?" if not use_postgres() else "%s"

    with conn:
        conn.execute(
            f"""
            UPDATE tickets
            SET status = {placeholder},
                updated_at = {"datetime('now')" if not use_postgres() else "CURRENT_TIMESTAMP"}
            WHERE id = {placeholder}
            """,
            (new_status, ticket_id),
        )

    conn.close()

    return db_get_ticket(ticket_id)


# ── Comment helpers ──────────────────────────────────────────────────────────────

def db_add_comment(ticket_id: int, author: str, body: str) -> dict:
    conn = get_connection()

    if use_postgres():
        with conn:
            cur = conn.execute(
                """
                INSERT INTO comments (ticket_id, author, body)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (ticket_id, author, body),
            )
            comment_id = cur.fetchone()["id"]

            comment = conn.execute(
                "SELECT * FROM comments WHERE id = %s",
                (comment_id,),
            ).fetchone()
    else:
        with conn:
            cur = conn.execute(
                """
                INSERT INTO comments (ticket_id, author, body)
                VALUES (?, ?, ?)
                """,
                (ticket_id, author, body),
            )
            comment_id = cur.lastrowid

            comment = conn.execute(
                "SELECT * FROM comments WHERE id = ?",
                (comment_id,),
            ).fetchone()

    conn.close()

    return dict(comment)


# ── Attachment helpers ──────────────────────────────────────────────────────────

def db_add_attachment(ticket_id: int, filename: str, stored_name: str) -> dict:
    conn = get_connection()

    if use_postgres():
        with conn:
            cur = conn.execute(
                """
                INSERT INTO attachments
                    (ticket_id, filename, stored_name)
                VALUES
                    (%s, %s, %s)
                RETURNING id
                """,
                (ticket_id, filename, stored_name),
            )
            att_id = cur.fetchone()["id"]

            att = conn.execute(
                "SELECT * FROM attachments WHERE id = %s",
                (att_id,),
            ).fetchone()
    else:
        with conn:
            cur = conn.execute(
                """
                INSERT INTO attachments
                    (ticket_id, filename, stored_name)
                VALUES
                    (?, ?, ?)
                """,
                (ticket_id, filename, stored_name),
            )
            att_id = cur.lastrowid

            att = conn.execute(
                "SELECT * FROM attachments WHERE id = ?",
                (att_id,),
            ).fetchone()

    conn.close()

    return dict(att)


# ── Dashboard helpers ──────────────────────────────────────────────────────────

def db_dashboard_stats() -> dict:
    conn = get_connection()

    status_rows = conn.execute(
        "SELECT status, COUNT(*) AS count FROM tickets GROUP BY status"
    ).fetchall()

    priority_rows = conn.execute(
        "SELECT priority, COUNT(*) AS count FROM tickets GROUP BY priority"
    ).fetchall()

    total = conn.execute(
        "SELECT COUNT(*) AS c FROM tickets"
    ).fetchone()["c"]

    recent = [
        dict(r)
        for r in conn.execute(
            """
            SELECT id, title, status, priority, created_at
            FROM tickets
            ORDER BY created_at DESC
            LIMIT 5
            """
        ).fetchall()
    ]

    conn.close()

    return {
        "total": total,
        "by_status": {
            r["status"]: r["count"]
            for r in status_rows
        },
        "by_priority": {
            r["priority"]: r["count"]
            for r in priority_rows
        },
        "recent_tickets": recent,
    }