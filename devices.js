/* devices.js — список IoT-устройств: поиск, фильтры, переключение статуса */
(function () {
  const search = document.getElementById("devSearch");
  const statusSel = document.getElementById("devStatus");
  const typeSel = document.getElementById("devType");
  const buildingSel = document.getElementById("devBuilding");

  const devices0 = getDevices();
  const rooms0 = getRooms();
  Array.from(new Set(devices0.map(d => d.type))).sort().forEach(t => {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    typeSel.appendChild(o);
  });
  Array.from(new Set(rooms0.map(r => r.building))).sort().forEach(b => {
    const o = document.createElement("option");
    o.value = b; o.textContent = b;
    buildingSel.appendChild(o);
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) search.value = q;

  function render() {
    const devices = getDevices();
    const rooms = getRooms();
    const term = search.value.trim().toLowerCase();
    const buildingOf = id => (rooms.find(r => r.id === id) || {}).building;

    const rows = devices.filter(d =>
      (!statusSel.value || d.status === statusSel.value) &&
      (!typeSel.value || d.type === typeSel.value) &&
      (!buildingSel.value || buildingOf(d.room) === buildingSel.value) &&
      (!term || (d.id + " " + d.room + " " + d.type).toLowerCase().indexOf(term) >= 0));

    const off = devices.filter(d => d.status === "offline").length;
    document.getElementById("countLine").textContent =
      "Найдено: " + rows.length + " из " + devices.length + " · offline: " + off;

    document.getElementById("devBody").innerHTML = rows.length
      ? rows.map(d =>
        "<tr><td><b>" + esc(d.id) + "</b></td><td>" + esc(d.room) + "</td><td>" + esc(d.type) + "</td><td>" +
        statusBadge(d.status) + "</td><td>" + esc(deviceValue(d, rooms)) + "</td><td>" + esc(d.updatedAt) + "</td>" +
        '<td><button class="btn small ghost" data-id="' + esc(d.id) + '">' +
        (d.status === "online" ? "Отключить" : "Включить") + "</button></td></tr>").join("")
      : '<tr><td colspan="7" class="empty">Ничего не найдено</td></tr>';
  }

  document.getElementById("devBody").addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const devices = getDevices();
    const d = devices.find(x => x.id === btn.dataset.id);
    if (!d) return;
    d.status = d.status === "online" ? "offline" : "online";
    d.updatedAt = nowStr();
    saveData(KEYS.devices, devices);
    toast(d.id + ": " + STATUS_LABELS[d.status], d.status === "online" ? "success" : "warning");
    emitUpdate();
  });

  [search, statusSel, typeSel, buildingSel].forEach(el => el.addEventListener("input", render));
  document.getElementById("simBtn").addEventListener("click", function () {
    runSimulation();
    toast("Показания датчиков обновлены", "success");
  });
  document.addEventListener("campus:update", render);
  render();
})();
