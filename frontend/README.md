# TicketDeck Frontend

A modern, responsive, high-performance IT Support Ticket Management web application built with **HTML5**, **Vanilla CSS3**, and **Modern JavaScript (ES Modules)**.

---

## 🚀 Features

- **Dashboard Overview**: Metrics overview showing ticket counts (Total, Open, In Progress, Resolved) and activity breakdowns.
- **Ticket Management**:
  - Filter tickets by status, priority, and category.
  - Real-time search across ticket titles and descriptions.
  - Modal-based ticket creation with form validation.
- **Interactive Ticket Details**:
  - Detailed view for individual tickets.
  - Quick status updates (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
  - Discussion thread with real-time comment additions.
  - File attachment previews and file upload capability.
- **Modern UI & Design System**:
  - Custom dark theme with vibrant accents, subtle glassmorphism, and responsive layout.
  - Animated toast notifications for actions and error messaging.

---

## 📁 Directory Structure

```text
frontend/
├── index.html          # Main HTML structure and single-page container
├── css/
│   └── styles.css      # Comprehensive CSS design system, themes, and component styles
└── js/
    ├── api.js          # Centralized API service layer (Fetch client with error handling)
    ├── app.js          # Application initializer and tab routing manager
    ├── dashboard.js    # Dashboard metrics loader and UI renderer
    ├── tickets.js      # Ticket list, filters, search, and creation modal logic
    └── ticket-detail.js# Detailed ticket view, status switcher, comments & file uploads
```

---

## ⚙️ Setup & Running Instructions

### 1. Requirements
- A modern web browser (Chrome, Firefox, Edge, Safari).
- A running instance of the **TicketDeck Backend API** (by default expected at `http://localhost:8001`).

### 2. Configuration
If your backend API is running on a different port or host, update the `BASE_URL` constant in [js/api.js](file:///c:/Users/hymat/OneDrive/Desktop/TicketDeck/frontend/js/api.js):

```javascript
const BASE_URL = "http://localhost:8001";
```

### 3. Serving the App

Because the application uses native ES Modules (`type="module"`), it must be served over HTTP/HTTPS rather than opened directly as a `file://` URL.

#### Option A: Python HTTP Server (Built-in)
```bash
cd frontend
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

#### Option B: Node.js `serve`
```bash
cd frontend
npx serve . -p 8000
```
Open `http://localhost:8000` in your browser.

#### Option C: VS Code Live Server
Right-click `frontend/index.html` in VS Code and select **"Open with Live Server"**.

---

## 🛠️ Tech Stack

- **HTML5**: Semantic elements, accessible forms, and modular structure.
- **CSS3**: Custom properties (CSS variables), CSS Grid & Flexbox layouts, glassmorphism, and micro-animations.
- **JavaScript**: ES6+ modules (`import`/`export`), async/await, Fetch API.
