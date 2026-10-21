/* storage.js — слой работы с localStorage */

const KEYS = {
  rooms: "sc_rooms",
  devices: "sc_devices",
  incidents: "sc_incidents",
  trend: "sc_trend",
  settings: "sc_settings",
  user: "sc_user",
  theme: "sc_theme"
};

const DEFAULT_SETTINGS = {
  campusName: "Smart Campus AI",
  zThreshold: 2.5,
  autoSimulate: false
};

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage недоступен:", e);
  }
}

function loadData(key, fallback = []) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    return fallback;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function initData() {
  let missing = false;
  ["rooms", "devices", "incidents", "trend"].forEach(function (k) {
    if (!loadData(KEYS[k], null)) missing = true;
  });
  if (missing) {
    const d = buildDefaultData();
    recalcStatuses(d.rooms);
    saveData(KEYS.rooms, d.rooms);
    saveData(KEYS.devices, d.devices);
    saveData(KEYS.incidents, d.incidents);
    saveData(KEYS.trend, d.trend);
  }
}

function resetData() {
  ["rooms", "devices", "incidents", "trend"].forEach(function (k) {
    try { localStorage.removeItem(KEYS[k]); } catch (e) {}
  });
  initData();
}

function getRooms() { return loadData(KEYS.rooms, []); }
function getDevices() { return loadData(KEYS.devices, []); }
function getIncidents() { return loadData(KEYS.incidents, []); }
function getTrend() { return loadData(KEYS.trend, []); }
function getUser() { return loadData(KEYS.user, null); }
function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, loadData(KEYS.settings, {}));
}
function saveSettings(s) { saveData(KEYS.settings, s); }
