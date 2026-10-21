/* common.js — общий каркас: sidebar, topbar, тема, уведомления, симуляция, графики */

const PAGE = document.body.dataset.page || "";
const NAV = [
  { id: "dashboard", href: "dashboard.html", icon: "📊", label: "Dashboard" },
  { id: "rooms", href: "rooms.html", icon: "🏫", label: "Аудитории" },
  { id: "devices", href: "devices.html", icon: "📡", label: "Устройства" },
  { id: "incidents", href: "incidents.html", icon: "🛠", label: "Заявки" },
  { id: "analytics", href: "analytics.html", icon: "🧠", label: "AI Analytics" },
  { id: "settings", href: "settings.html", icon: "⚙️", label: "Настройки" }
];

const STATUS_LABELS = {
  normal: "Норма", warning: "Внимание", critical: "Критично",
  online: "Online", offline: "Offline",
  open: "Открыта", in_progress: "В работе", resolved: "Закрыта"
};
const PRIORITY_LABELS = { low: "Низкий", medium: "Средний", high: "Высокий" };
const COLORS = { normal: "#72e0c4", warning: "#ffc857", critical: "#ff7070", accent: "#36a3ff", violet: "#b38cff" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function badge(kind, text) {
  return '<span class="badge b-' + kind + '">' + esc(text) + "</span>";
}

function statusBadge(status) {
  const kind = { online: "normal", offline: "critical", open: "warning", in_progress: "info", resolved: "normal" }[status] || status;
  return badge(kind, STATUS_LABELS[status] || status);
}

function priorityBadge(p) {
  const kind = { low: "muted", medium: "warning", high: "critical" }[p] || "muted";
  return badge(kind, PRIORITY_LABELS[p] || p);
}

function emitUpdate() {
  document.dispatchEvent(new CustomEvent("campus:update"));
}

function toast(message, type) {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.className = "toasts";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast " + (type || "info");
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ---------- тема ---------- */
function isLight() { return document.documentElement.classList.contains("light"); }

function setTheme(light) {
  document.documentElement.classList.toggle("light", light);
  try { localStorage.setItem(KEYS.theme, light ? "light" : "dark"); } catch (e) {}
  destroyCharts();
  emitUpdate();
  const sw = document.getElementById("themeSwitch");
  if (sw) sw.checked = light;
}

/* ---------- графики ---------- */
const _charts = {};

function chartTheme() {
  const cs = getComputedStyle(document.documentElement);
  return { text: cs.getPropertyValue("--muted").trim(), grid: cs.getPropertyValue("--line").trim() };
}

function makeChart(id, cfg) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  if (typeof Chart === "undefined") {
    if (!canvas.parentNode.querySelector(".chart-fail")) {
      const m = document.createElement("div");
      m.className = "chart-fail";
      m.textContent = "Chart.js не загрузился (проверьте интернет).";
      canvas.parentNode.appendChild(m);
    }
    return null;
  }
  if (_charts[id]) {
    _charts[id].data.labels = cfg.data.labels;
    _charts[id].data.datasets = cfg.data.datasets;
    _charts[id].update("none");
    return _charts[id];
  }
  const t = chartTheme();
  Chart.defaults.color = t.text;
  Chart.defaults.borderColor = t.grid;
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {});
  _charts[id] = new Chart(canvas, cfg);
  return _charts[id];
}

function destroyCharts() {
  Object.keys(_charts).forEach(k => { _charts[k].destroy(); delete _charts[k]; });
}

function levelColor(level) { return COLORS[level] || COLORS.accent; }

/* ---------- симуляция датчиков ---------- */
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

function simulateRoom(r) {
  const noise = k => (Math.random() * 2 - 1) * k;
  const spike = () => Math.random() < 0.04;
  r.temperature = +clamp(r.temperature + (r.base.temperature - r.temperature) * 0.35 + noise(0.5) + (spike() ? rnd(3, 6) : 0), 16, 38).toFixed(1);
  r.co2 = Math.round(clamp(r.co2 + (r.base.co2 - r.co2) * 0.35 + noise(45) + (spike() ? rnd(400, 800, 0) : 0), 400, 2200));
  r.energy = +clamp(r.energy + (r.base.energy - r.energy) * 0.35 + noise(0.3) + (spike() ? rnd(2, 3) : 0), 0.5, 12).toFixed(1);
  if (r.baseOcc === 0) r.occupancy = 0;
  else r.occupancy = clamp(r.occupancy + Math.round(noise(3)), 0, r.capacity);
  ["temperature", "co2", "energy"].forEach(p => {
    r.history[p].push(r[p]);
    if (r.history[p].length > 12) r.history[p].shift();
  });
  return r;
}

function runSimulation() {
  const rooms = getRooms();
  const devices = getDevices();
  rooms.forEach(simulateRoom);
  recalcStatuses(rooms);
  const now = nowStr();
  devices.forEach(d => {
    if (d.status === "online") {
      d.updatedAt = now;
      if (Math.random() < 0.02) d.status = "offline";
    } else if (Math.random() < 0.12) {
      d.status = "online";
      d.updatedAt = now;
    }
  });
  const trend = getTrend();
  const d = new Date();
  trend.push({
    label: pad2(d.getHours()) + ":" + pad2(d.getMinutes()),
    temp: +(mean(rooms.map(r => r.temperature))).toFixed(1),
    co2: Math.round(mean(rooms.map(r => r.co2))),
    energy: +rooms.reduce((s, r) => s + r.energy, 0).toFixed(1)
  });
  while (trend.length > 12) trend.shift();
  saveData(KEYS.rooms, rooms);
  saveData(KEYS.devices, devices);
  saveData(KEYS.trend, trend);
  emitUpdate();
}

let _autoTimer = null;
function applyAutoSimulation() {
  if (_autoTimer) { clearInterval(_autoTimer); _autoTimer = null; }
  if (getSettings().autoSimulate && PAGE !== "login") {
    _autoTimer = setInterval(runSimulation, 6000);
  }
}

function deviceValue(d, rooms) {
  if (d.status !== "online") return "—";
  const room = rooms.find(r => r.id === d.room);
  if (d.type === "Temperature Sensor" && room) return room.temperature + " °C";
  if (d.type === "CO2 Sensor" && room) return room.co2 + " ppm";
  if (d.type === "Power Meter" && room) return room.energy + " кВт·ч";
  if (d.type === "Light Controller") return (d.value == null ? 70 : d.value) + " %";
  if (d.type === "Access Controller") return "Закрыто";
  if (d.type === "Camera") return "REC";
  return "—";
}

/* ---------- каркас страницы ---------- */
function renderShell() {
  const user = getUser();
  const settings = getSettings();
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar");
  if (!sidebar || !topbar) return;

  sidebar.innerHTML =
    '<div class="brand"><div class="logo">🎓</div><div><b id="brandName">' + esc(settings.campusName) +
    '</b><small>Панель управления кампусом</small></div></div>' +
    '<nav class="side-nav">' +
    NAV.map(n => '<a href="' + n.href + '" class="' + (n.id === PAGE ? "active" : "") + '"><span>' + n.icon + "</span>" + n.label + "</a>").join("") +
    "</nav>" +
    '<div class="side-foot"><span class="dot"></span> AI Analytics: online</div>';

  const initial = user ? user.email.charAt(0).toUpperCase() : "?";
  topbar.innerHTML =
    '<button class="icon-btn burger" id="burger" aria-label="Меню">☰</button>' +
    '<form class="search" id="globalSearch"><input type="search" id="gsearch" placeholder="Поиск аудиторий, устройств, заявок…" aria-label="Поиск"></form>' +
    '<div class="top-actions">' +
    '<button class="icon-btn" id="themeBtn" title="Сменить тему" aria-label="Сменить тему">🌓</button>' +
    '<div class="notif"><button class="icon-btn" id="notifBtn" aria-label="Уведомления">🔔<span class="count" id="notifCount">0</span></button>' +
    '<div class="dropdown" id="notifPanel" hidden></div></div>' +
    '<div class="profile"><div class="avatar">' + esc(initial) + '</div><div class="pinfo"><b>' +
    esc(user ? user.email : "") + "</b><small>" + esc(user ? user.role : "") + "</small></div>" +
    '<button class="btn small ghost" id="logoutBtn">Выйти</button></div></div>';

  document.getElementById("burger").addEventListener("click", () => sidebar.classList.toggle("open"));
  document.getElementById("themeBtn").addEventListener("click", () => setTheme(!isLight()));
  document.getElementById("logoutBtn").addEventListener("click", () => {
    try { localStorage.removeItem(KEYS.user); } catch (e) {}
    location.href = "index.html";
  });
  document.getElementById("notifBtn").addEventListener("click", e => {
    e.stopPropagation();
    const p = document.getElementById("notifPanel");
    p.hidden = !p.hidden;
  });
  document.addEventListener("click", e => {
    const p = document.getElementById("notifPanel");
    if (p && !p.hidden && !p.contains(e.target)) p.hidden = true;
  });
  document.getElementById("globalSearch").addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("gsearch").value.trim();
    const target = ["rooms", "devices", "incidents"].indexOf(PAGE) >= 0 ? PAGE : "rooms";
    location.href = target + ".html?q=" + encodeURIComponent(q);
  });
  const q = new URLSearchParams(location.search).get("q");
  if (q) document.getElementById("gsearch").value = q;
}

function refreshNotifications() {
  const cnt = document.getElementById("notifCount");
  const panel = document.getElementById("notifPanel");
  if (!cnt || !panel) return;
  const alerts = getAlerts(getRooms(), getDevices());
  cnt.textContent = alerts.length;
  cnt.style.display = alerts.length ? "" : "none";
  panel.innerHTML =
    '<div class="dd-head">Уведомления (' + alerts.length + ")</div>" +
    (alerts.length
      ? alerts.slice(0, 8).map(a => '<div class="dd-item"><span class="lvl-dot ' + a.level + '"></span><div><b>' +
        esc(a.title) + "</b><small>" + esc(a.text) + "</small></div></div>").join("")
      : '<div class="dd-item muted">Всё спокойно 🎉</div>') +
    '<a class="dd-foot" href="analytics.html">Открыть аналитику →</a>';
}

/* ---------- старт ---------- */
(function boot() {
  initData();
  if (PAGE !== "login") {
    if (!getUser()) { location.replace("index.html"); return; }
    renderShell();
    refreshNotifications();
    document.addEventListener("campus:update", refreshNotifications);
    applyAutoSimulation();
  }
})();
