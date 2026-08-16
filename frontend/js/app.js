import { renderDashboard } from "./dashboard.js";
import { renderTickets } from "./tickets.js";
import { renderTicketDetail } from "./ticket-detail.js";

const VIEWS = ["dashboard", "tickets", "ticket-detail"];

// ── Router ─────────────────────────────────────────────────────────────────────

async function navigate(view, params = {}) {
  // Hide all views
  VIEWS.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.remove("view--active");
  });

  // Update nav highlights
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("nav-link--active", link.dataset.view === view);
  });

  // Show target view
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.add("view--active");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Render content
  switch (view) {
    case "dashboard":
      await renderDashboard();
      break;
    case "tickets":
      await renderTickets();
      break;
    case "ticket-detail":
      if (params.id) await renderTicketDetail(params.id);
      break;
  }
}

// Expose navigate globally (used by sub-modules)
window.navigate = navigate;

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Nav click handlers
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(link.dataset.view);
    });
  });

  // Mobile menu toggle
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar--open");
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (
      sidebar &&
      sidebar.classList.contains("sidebar--open") &&
      !sidebar.contains(e.target) &&
      e.target !== menuToggle
    ) {
      sidebar.classList.remove("sidebar--open");
    }
  });

  // Start on dashboard
  navigate("dashboard");
});
