import { getDashboard, showToast } from "./api.js";

const STATUS_ORDER = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const STATUS_COLORS = {
  OPEN: "#3B82F6",
  IN_PROGRESS: "#F59E0B",
  RESOLVED: "#10B981",
  CLOSED: "#6B7280",
};

const PRIORITY_COLORS = {
  LOW: "#10B981",
  MEDIUM: "#3B82F6",
  HIGH: "#F59E0B",
  CRITICAL: "#EF4444",
};

export async function renderDashboard() {
  const view = document.getElementById("view-dashboard");
  view.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Real-time overview of all support tickets</p>
    </div>
    <div class="stat-grid" id="stat-cards"></div>
    <div class="charts-row">
      <div class="chart-card glass">
        <h3 class="chart-title">Tickets by Status</h3>
        <div class="bar-chart" id="chart-status"></div>
      </div>
      <div class="chart-card glass">
        <h3 class="chart-title">Tickets by Priority</h3>
        <div class="bar-chart" id="chart-priority"></div>
      </div>
    </div>
    <div class="glass recent-section">
      <h3 class="chart-title">Recent Tickets</h3>
      <table class="data-table" id="recent-table">
        <thead>
          <tr>
            <th>#</th><th>Title</th><th>Status</th><th>Priority</th><th>Created</th>
          </tr>
        </thead>
        <tbody id="recent-tbody"></tbody>
      </table>
    </div>
  `;

  try {
    const data = await getDashboard();
    renderStatCards(data);
    renderBarChart("chart-status", data.by_status, STATUS_ORDER, STATUS_COLORS);
    renderBarChart("chart-priority", data.by_priority, PRIORITY_ORDER, PRIORITY_COLORS);
    renderRecentTable(data.recent_tickets);
  } catch (_) {
    /* errors handled by api.js */
  }
}

function renderStatCards(data) {
  const cards = [
    {
      label: "Total Tickets",
      value: data.total,
      icon: "🎫",
      accent: "#7C3AED",
      sub: "All time",
    },
    {
      label: "Open",
      value: data.by_status["OPEN"] || 0,
      icon: "📬",
      accent: "#3B82F6",
      sub: "Awaiting action",
    },
    {
      label: "In Progress",
      value: data.by_status["IN_PROGRESS"] || 0,
      icon: "⚙️",
      accent: "#F59E0B",
      sub: "Being worked on",
    },
    {
      label: "Resolved",
      value: data.by_status["RESOLVED"] || 0,
      icon: "✅",
      accent: "#10B981",
      sub: "Completed",
    },
    {
      label: "Critical",
      value: data.by_priority["CRITICAL"] || 0,
      icon: "🔥",
      accent: "#EF4444",
      sub: "Urgent attention needed",
    },
    {
      label: "Closed",
      value: data.by_status["CLOSED"] || 0,
      icon: "🔒",
      accent: "#6B7280",
      sub: "Archived",
    },
  ];

  const container = document.getElementById("stat-cards");
  container.innerHTML = cards
    .map(
      (c) => `
    <div class="stat-card glass" style="--accent: ${c.accent}">
      <div class="stat-card__icon">${c.icon}</div>
      <div class="stat-card__body">
        <div class="stat-card__value counter" data-target="${c.value}">0</div>
        <div class="stat-card__label">${c.label}</div>
        <div class="stat-card__sub">${c.sub}</div>
      </div>
      <div class="stat-card__bar" style="background: ${c.accent}20">
        <div class="stat-card__bar-fill" style="background: ${c.accent}; width: 0%" data-width="${
        data.total > 0 ? Math.round((c.value / data.total) * 100) : 0
      }%"></div>
      </div>
    </div>
  `
    )
    .join("");

  // Animate counters
  document.querySelectorAll(".counter").forEach((el) => {
    const target = parseInt(el.dataset.target, 10);
    animateCounter(el, target);
  });

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll(".stat-card__bar-fill").forEach((el) => {
      el.style.width = el.dataset.width;
    });
  }, 100);
}

function animateCounter(el, target) {
  const duration = 800;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderBarChart(containerId, dataObj, order, colors) {
  const container = document.getElementById(containerId);
  const max = Math.max(...Object.values(dataObj), 1);

  container.innerHTML = order
    .map((key) => {
      const val = dataObj[key] || 0;
      const pct = Math.round((val / max) * 100);
      const label = key.replace("_", " ");
      return `
      <div class="bar-row">
        <span class="bar-label">${label}</span>
        <div class="bar-track">
          <div class="bar-fill" style="background: ${colors[key]}; width: 0%" data-width="${pct}%"></div>
        </div>
        <span class="bar-value">${val}</span>
      </div>
    `;
    })
    .join("");

  setTimeout(() => {
    container.querySelectorAll(".bar-fill").forEach((el) => {
      el.style.width = el.dataset.width;
    });
  }, 150);
}

function renderRecentTable(tickets) {
  const tbody = document.getElementById("recent-tbody");
  if (!tickets.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No tickets yet</td></tr>`;
    return;
  }
  tbody.innerHTML = tickets
    .map(
      (t) => `
    <tr class="table-row clickable" data-id="${t.id}">
      <td><span class="ticket-id">#${t.id}</span></td>
      <td>${escapeHtml(t.title)}</td>
      <td><span class="badge badge--status badge--${t.status.toLowerCase()}">${t.status.replace("_", " ")}</span></td>
      <td><span class="badge badge--priority badge--${t.priority.toLowerCase()}">${t.priority}</span></td>
      <td>${formatDate(t.created_at)}</td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll(".clickable").forEach((row) => {
    row.addEventListener("click", () => {
      window.navigate("ticket-detail", { id: row.dataset.id });
    });
  });
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
