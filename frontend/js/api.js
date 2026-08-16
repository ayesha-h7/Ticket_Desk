// ── API base URL ──────────────────────────────────────────────────────────────
const BASE_URL = "http://tkt-ahs-alb-438256635.us-east-1.elb.amazonaws.com";

// Generic fetch wrapper with error handling
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "API error");
    }
    return res.status === 204 ? null : res.json();
  } catch (e) {
    showToast(e.message, "error");
    throw e;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = () => apiFetch("/api/dashboard");

// ── Tickets ───────────────────────────────────────────────────────────────────
export const getTickets = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return apiFetch(`/api/tickets${qs ? "?" + qs : ""}`);
};

export const getTicket = (id) => apiFetch(`/api/tickets/${id}`);

export const createTicket = (body) =>
  apiFetch("/api/tickets", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateStatus = (id, status) =>
  apiFetch(`/api/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ── Comments ──────────────────────────────────────────────────────────────────
export const addComment = (ticketId, author, body) =>
  apiFetch(`/api/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify({ author, body }),
  });

// ── Attachments ───────────────────────────────────────────────────────────────
export const uploadAttachment = (ticketId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`${BASE_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: fd,
  }).then((r) => {
    if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.detail)));
    return r.json();
  });
};

export const getFileUrl = (storedName) => `${BASE_URL}/uploads/${storedName}`;

// ── Toast notification ────────────────────────────────────────────────────────
export function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${type === "error" ? "✕" : "✓"}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
