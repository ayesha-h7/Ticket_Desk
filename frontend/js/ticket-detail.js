import { getTicket, updateStatus, addComment, uploadAttachment, getFileUrl, showToast } from "./api.js";

const STATUS_FLOW = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_LABELS = {
  OPEN:        "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED:    "Resolved",
  CLOSED:      "Closed",
};

const STATUS_NEXT = {
  OPEN:        "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED:    "CLOSED",
  CLOSED:      null,
};

const STATUS_NEXT_LABEL = {
  OPEN:        "Mark In Progress",
  IN_PROGRESS: "Mark Resolved",
  RESOLVED:    "Close Ticket",
  CLOSED:      null,
};

const PRIORITY_COLOR = {
  LOW: "#10B981", MEDIUM: "#3B82F6", HIGH: "#F59E0B", CRITICAL: "#EF4444",
};

let currentTicketId = null;

export async function renderTicketDetail(ticketId) {
  currentTicketId = ticketId;
  const view = document.getElementById("view-ticket-detail");
  view.innerHTML = `<div class="loading-state"><div class="spinner-lg"></div><p>Loading ticket…</p></div>`;

  try {
    const ticket = await getTicket(ticketId);
    if (!ticket) {
      view.innerHTML = `<div class="empty-state"><p>Ticket not found.</p></div>`;
      return;
    }
    view.innerHTML = buildDetailHTML(ticket);
    attachDetailEvents(ticket);
  } catch (_) {}
}

function buildDetailHTML(ticket) {
  const nextStatus = STATUS_NEXT[ticket.status];
  const nextLabel = STATUS_NEXT_LABEL[ticket.status];
  const pc = PRIORITY_COLOR[ticket.priority] || "#888";

  return `
    <div class="detail-header">
      <button class="btn btn--ghost btn--back" id="btn-back">← Back to Tickets</button>
      <div class="detail-header__actions">
        ${nextStatus ? `<button class="btn btn--primary" id="btn-advance-status" data-next="${nextStatus}">${nextLabel} →</button>` : ""}
        ${ticket.status !== "CLOSED" ? `<button class="btn btn--danger" id="btn-close-ticket">Close Ticket</button>` : ""}
      </div>
    </div>

    <div class="detail-layout">
      <!-- Main panel -->
      <div class="detail-main">
        <div class="glass detail-card">
          <div class="detail-card__top">
            <span class="ticket-id">#${ticket.id}</span>
            <span class="badge badge--status badge--${ticket.status.toLowerCase()}">${STATUS_LABELS[ticket.status]}</span>
          </div>
          <h1 class="detail-title">${escapeHtml(ticket.title)}</h1>
          <p class="detail-description">${escapeHtml(ticket.description)}</p>
        </div>

        <!-- Status timeline -->
        <div class="glass timeline-card">
          <h3 class="section-title">Status Progress</h3>
          <div class="status-timeline">
            ${STATUS_FLOW.map((s, i) => {
              const idx = STATUS_FLOW.indexOf(ticket.status);
              const done = i <= idx;
              const active = s === ticket.status;
              return `
                <div class="timeline-step ${done ? "done" : ""} ${active ? "active" : ""}">
                  <div class="timeline-dot">${done ? "✓" : i + 1}</div>
                  <span class="timeline-label">${STATUS_LABELS[s]}</span>
                  ${i < STATUS_FLOW.length - 1 ? `<div class="timeline-line ${done && i < STATUS_FLOW.indexOf(ticket.status) ? "done" : ""}"></div>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Comments -->
        <div class="glass comments-card">
          <h3 class="section-title">Comments <span class="count-badge">${ticket.comments.length}</span></h3>
          <div class="comments-list" id="comments-list">
            ${ticket.comments.length
              ? ticket.comments.map(renderComment).join("")
              : `<p class="empty-msg">No comments yet. Be the first to add one!</p>`
            }
          </div>
          <form class="comment-form" id="comment-form">
            <div class="comment-form__author">
              <input type="text" id="comment-author" class="form-input" placeholder="Your name" value="Support Agent" maxlength="100">
            </div>
            <div class="comment-form__body">
              <textarea id="comment-body" class="form-input form-textarea" placeholder="Add a comment…" rows="3" required></textarea>
            </div>
            <button type="submit" class="btn btn--primary btn--sm" id="btn-add-comment">Post Comment</button>
          </form>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="detail-sidebar">
        <!-- Meta info -->
        <div class="glass sidebar-card">
          <h3 class="section-title">Details</h3>
          <dl class="meta-list">
            <dt>Category</dt>
            <dd><span class="category-chip">${ticket.category}</span></dd>
            <dt>Priority</dt>
            <dd><span class="priority-chip" style="color:${pc};border-color:${pc}20;background:${pc}12">${ticket.priority}</span></dd>
            <dt>Created</dt>
            <dd>${formatDateTime(ticket.created_at)}</dd>
            <dt>Updated</dt>
            <dd>${formatDateTime(ticket.updated_at)}</dd>
          </dl>
        </div>

        <!-- All status buttons -->
        <div class="glass sidebar-card">
          <h3 class="section-title">Change Status</h3>
          <div class="status-buttons">
            ${STATUS_FLOW.map((s) => `
              <button class="btn btn--status ${ticket.status === s ? "btn--status-active" : ""}"
                data-status="${s}" ${ticket.status === s ? "disabled" : ""}>
                ${STATUS_LABELS[s]}
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Attachments -->
        <div class="glass sidebar-card">
          <h3 class="section-title">Attachments <span class="count-badge">${ticket.attachments.length}</span></h3>
          <div class="attachments-list" id="attachments-list">
            ${ticket.attachments.length
              ? ticket.attachments.map(renderAttachment).join("")
              : `<p class="empty-msg">No files attached.</p>`
            }
          </div>
          <div class="upload-zone" id="upload-zone">
            <input type="file" id="file-input" class="upload-input" accept="*/*">
            <label for="file-input" class="upload-label">
              <span class="upload-icon">📎</span>
              <span>Click to attach a file</span>
              <span class="upload-hint">Max 10 MB · Images, PDF, DOC, ZIP…</span>
            </label>
            <div class="upload-progress hidden" id="upload-progress">
              <div class="spinner"></div> Uploading…
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;
}

function renderComment(c) {
  return `
    <div class="comment">
      <div class="comment__avatar">${c.author.charAt(0).toUpperCase()}</div>
      <div class="comment__body">
        <div class="comment__header">
          <strong class="comment__author">${escapeHtml(c.author)}</strong>
          <span class="comment__time">${formatDateTime(c.created_at)}</span>
        </div>
        <p class="comment__text">${escapeHtml(c.body)}</p>
      </div>
    </div>
  `;
}

function renderAttachment(a) {
  const url = getFileUrl(a.stored_name);
  const ext = a.filename.split(".").pop().toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
  return `
    <div class="attachment-item">
      <span class="attachment-icon">${isImage ? "🖼️" : "📄"}</span>
      <a href="${url}" target="_blank" class="attachment-link" title="${escapeHtml(a.filename)}">
        ${escapeHtml(a.filename.length > 28 ? a.filename.slice(0, 25) + "…" : a.filename)}
      </a>
    </div>
  `;
}

function attachDetailEvents(ticket) {
  // Back button
  document.getElementById("btn-back").addEventListener("click", () => {
    window.navigate("tickets");
  });

  // Advance status button
  const advBtn = document.getElementById("btn-advance-status");
  if (advBtn) {
    advBtn.addEventListener("click", () => changeStatus(advBtn.dataset.next));
  }

  // Close ticket button
  const closeBtn = document.getElementById("btn-close-ticket");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => changeStatus("CLOSED"));
  }

  // Sidebar status buttons
  document.querySelectorAll(".btn--status").forEach((btn) => {
    btn.addEventListener("click", () => changeStatus(btn.dataset.status));
  });

  // Comment form
  document.getElementById("comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const author = document.getElementById("comment-author").value.trim() || "Support Agent";
    const body = document.getElementById("comment-body").value.trim();
    if (!body) return;

    const submitBtn = document.getElementById("btn-add-comment");
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting…";

    try {
      const comment = await addComment(currentTicketId, author, body);
      const list = document.getElementById("comments-list");
      const empty = list.querySelector(".empty-msg");
      if (empty) empty.remove();
      const div = document.createElement("div");
      div.innerHTML = renderComment(comment);
      list.appendChild(div.firstElementChild);
      document.getElementById("comment-body").value = "";
      showToast("Comment added!", "success");
    } catch (_) {
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Comment";
    }
  });

  // File upload
  const fileInput = document.getElementById("file-input");
  const uploadZone = document.getElementById("upload-zone");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    await doUpload(file);
    fileInput.value = "";
  });

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("upload-zone--drag");
  });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("upload-zone--drag"));
  uploadZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    uploadZone.classList.remove("upload-zone--drag");
    const file = e.dataTransfer.files[0];
    if (file) await doUpload(file);
  });
}

async function doUpload(file) {
  const progress = document.getElementById("upload-progress");
  const label = document.querySelector(".upload-label");
  progress.classList.remove("hidden");
  label.style.opacity = "0.4";

  try {
    const att = await uploadAttachment(currentTicketId, file);
    const list = document.getElementById("attachments-list");
    const empty = list.querySelector(".empty-msg");
    if (empty) empty.remove();
    const div = document.createElement("div");
    div.innerHTML = renderAttachment(att);
    list.appendChild(div.firstElementChild);
    showToast(`${file.name} uploaded!`, "success");
  } catch (err) {
    showToast(err.message || "Upload failed", "error");
  } finally {
    progress.classList.add("hidden");
    label.style.opacity = "";
  }
}

async function changeStatus(newStatus) {
  try {
    await updateStatus(currentTicketId, newStatus);
    showToast(`Status updated to ${newStatus.replace("_", " ")}`, "success");
    await renderTicketDetail(currentTicketId);
  } catch (_) {}
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDateTime(iso) {
  return new Date(iso + "Z").toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
