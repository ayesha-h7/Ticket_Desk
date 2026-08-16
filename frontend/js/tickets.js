import { getTickets, createTicket, showToast } from "./api.js";

const PRIORITY_META = {
  LOW:      { color: "#10B981", icon: "▼" },
  MEDIUM:   { color: "#3B82F6", icon: "●" },
  HIGH:     { color: "#F59E0B", icon: "▲" },
  CRITICAL: { color: "#EF4444", icon: "⚡" },
};

const STATUS_META = {
  OPEN:        { color: "#3B82F6" },
  IN_PROGRESS: { color: "#F59E0B" },
  RESOLVED:    { color: "#10B981" },
  CLOSED:      { color: "#6B7280" },
};

let currentFilters = { status: "", priority: "", category: "", search: "" };

export async function renderTickets() {
  const view = document.getElementById("view-tickets");
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Support Tickets</h1>
        <p class="page-subtitle">Manage and track all support requests</p>
      </div>
      <button class="btn btn--primary" id="btn-new-ticket">
        <span>＋</span> New Ticket
      </button>
    </div>

    <div class="filters glass">
      <div class="filter-group">
        <input type="text" id="filter-search" placeholder="🔍  Search tickets…" class="filter-input" value="${currentFilters.search}">
      </div>
      <div class="filter-group">
        <select id="filter-status" class="filter-select">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
      <div class="filter-group">
        <select id="filter-priority" class="filter-select">
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
      <div class="filter-group">
        <select id="filter-category" class="filter-select">
          <option value="">All Categories</option>
          <option value="Network">Network</option>
          <option value="Hardware">Hardware</option>
          <option value="Software">Software</option>
          <option value="Access">Access</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <button class="btn btn--ghost" id="btn-clear-filters">Clear</button>
    </div>

    <div id="tickets-container" class="tickets-grid"></div>

    <!-- Create Ticket Modal -->
    <div class="modal-overlay" id="modal-create" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal glass">
        <div class="modal__header">
          <h2 class="modal__title">Create New Ticket</h2>
          <button class="modal__close" id="modal-close" aria-label="Close">✕</button>
        </div>
        <form class="modal__form" id="form-create-ticket" novalidate>
          <div class="form-group">
            <label class="form-label" for="ticket-title">Title <span class="required">*</span></label>
            <input type="text" id="ticket-title" class="form-input" placeholder="Brief summary of the issue" required minlength="3" maxlength="200">
            <span class="form-error" id="err-title"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="ticket-description">Description <span class="required">*</span></label>
            <textarea id="ticket-description" class="form-input form-textarea" placeholder="Detailed description of the issue…" required minlength="5" rows="4"></textarea>
            <span class="form-error" id="err-description"></span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="ticket-category">Category</label>
              <select id="ticket-category" class="form-input form-select">
                <option value="Network">Network</option>
                <option value="Hardware">Hardware</option>
                <option value="Software" selected>Software</option>
                <option value="Access">Access</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="ticket-priority">Priority</label>
              <select id="ticket-priority" class="form-input form-select">
                <option value="LOW">Low</option>
                <option value="MEDIUM" selected>Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" id="btn-cancel">Cancel</button>
            <button type="submit" class="btn btn--primary" id="btn-submit">
              <span id="submit-text">Create Ticket</span>
              <span id="submit-spinner" class="spinner hidden"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Restore filter selections
  document.getElementById("filter-status").value = currentFilters.status;
  document.getElementById("filter-priority").value = currentFilters.priority;
  document.getElementById("filter-category").value = currentFilters.category;
  document.getElementById("filter-search").value = currentFilters.search;

  // Event listeners
  document.getElementById("btn-new-ticket").addEventListener("click", openModal);
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("btn-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-create").addEventListener("click", (e) => {
    if (e.target.id === "modal-create") closeModal();
  });
  document.getElementById("form-create-ticket").addEventListener("submit", handleCreate);

  let searchTimer;
  document.getElementById("filter-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentFilters.search = e.target.value;
      loadTickets();
    }, 400);
  });

  ["filter-status", "filter-priority", "filter-category"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (e) => {
      currentFilters[id.replace("filter-", "")] = e.target.value;
      loadTickets();
    });
  });

  document.getElementById("btn-clear-filters").addEventListener("click", () => {
    currentFilters = { status: "", priority: "", category: "", search: "" };
    document.getElementById("filter-search").value = "";
    document.getElementById("filter-status").value = "";
    document.getElementById("filter-priority").value = "";
    document.getElementById("filter-category").value = "";
    loadTickets();
  });

  await loadTickets();
}

async function loadTickets() {
  const container = document.getElementById("tickets-container");
  container.innerHTML = `<div class="loading-state"><div class="spinner-lg"></div><p>Loading tickets…</p></div>`;
  try {
    const tickets = await getTickets(currentFilters);
    renderTicketCards(tickets, container);
  } catch (_) {}
}

function renderTicketCards(tickets, container) {
  if (!tickets.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <h3>No tickets found</h3>
        <p>Try adjusting your filters or create a new ticket.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tickets
    .map((t) => {
      const pm = PRIORITY_META[t.priority] || PRIORITY_META.MEDIUM;
      const sm = STATUS_META[t.status] || STATUS_META.OPEN;
      return `
      <article class="ticket-card glass" data-id="${t.id}" tabindex="0" role="button" aria-label="View ticket ${t.id}">
        <div class="ticket-card__top">
          <span class="ticket-id">#${t.id}</span>
          <span class="badge badge--status badge--${t.status.toLowerCase()}">${t.status.replace("_", " ")}</span>
        </div>
        <h3 class="ticket-card__title">${escapeHtml(t.title)}</h3>
        <p class="ticket-card__desc">${escapeHtml(t.description.slice(0, 100))}${t.description.length > 100 ? "…" : ""}</p>
        <div class="ticket-card__footer">
          <span class="category-chip">${t.category}</span>
          <span class="priority-chip" style="color: ${pm.color}; border-color: ${pm.color}20; background: ${pm.color}12">
            ${pm.icon} ${t.priority}
          </span>
          <span class="ticket-date">${formatDate(t.created_at)}</span>
        </div>
      </article>
    `;
    })
    .join("");

  container.querySelectorAll(".ticket-card").forEach((card) => {
    const open = () => window.navigate("ticket-detail", { id: card.dataset.id });
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open();
    });
  });
}

async function handleCreate(e) {
  e.preventDefault();
  const title = document.getElementById("ticket-title").value.trim();
  const description = document.getElementById("ticket-description").value.trim();
  const category = document.getElementById("ticket-category").value;
  const priority = document.getElementById("ticket-priority").value;

  // Validate
  let valid = true;
  if (title.length < 3) {
    document.getElementById("err-title").textContent = "Title must be at least 3 characters.";
    valid = false;
  } else {
    document.getElementById("err-title").textContent = "";
  }
  if (description.length < 5) {
    document.getElementById("err-description").textContent = "Description must be at least 5 characters.";
    valid = false;
  } else {
    document.getElementById("err-description").textContent = "";
  }
  if (!valid) return;

  const submitBtn = document.getElementById("btn-submit");
  const submitText = document.getElementById("submit-text");
  const submitSpinner = document.getElementById("submit-spinner");
  submitBtn.disabled = true;
  submitText.textContent = "Creating…";
  submitSpinner.classList.remove("hidden");

  try {
    await createTicket({ title, description, category, priority });
    showToast("Ticket created successfully!", "success");
    closeModal();
    await loadTickets();
  } catch (_) {
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = "Create Ticket";
    submitSpinner.classList.add("hidden");
  }
}

function openModal() {
  const modal = document.getElementById("modal-create");
  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("modal-overlay--active");
  document.getElementById("ticket-title").focus();
}

function closeModal() {
  const modal = document.getElementById("modal-create");
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("modal-overlay--active");
  document.getElementById("form-create-ticket").reset();
  document.querySelectorAll(".form-error").forEach((el) => (el.textContent = ""));
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso) {
  return new Date(iso + "Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
