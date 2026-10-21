/* rooms.js — таблица помещений: поиск и фильтры */
(function () {
  const search = document.getElementById("roomSearch");
  const statusSel = document.getElementById("statusFilter");
  const buildingSel = document.getElementById("buildingFilter");

  const rooms0 = getRooms();
  Array.from(new Set(rooms0.map(r => r.building))).sort().forEach(b => {
    const o = document.createElement("option");
    o.value = b; o.textContent = b;
    buildingSel.appendChild(o);
  });

  const q = new URLSearchParams(location.search).get("q");
  if (q) search.value = q;

  function cell(room, param, text) {
    const lvl = paramLevel(room, param);
    return '<td class="' + (lvl === "normal" ? "" : "lvl-" + lvl) + '">' + text + "</td>";
  }

  function render() {
    const rooms = getRooms();
    const term = search.value.trim().toLowerCase();
    const st = statusSel.value;
    const bd = buildingSel.value;

    const rows = rooms.filter(r =>
      (!st || r.status === st) &&
      (!bd || r.building === bd) &&
      (!term || (r.id + " " + r.type + " " + r.building).toLowerCase().indexOf(term) >= 0));

    document.getElementById("countLine").textContent = "Найдено: " + rows.length + " из " + rooms.length;
    document.getElementById("roomsBody").innerHTML = rows.length
      ? rows.map(r =>
        "<tr><td><b>" + esc(r.id) + "</b></td><td>" + esc(r.building) + "</td><td>" + r.floor + "</td><td>" + esc(r.type) + "</td>" +
        cell(r, "temperature", r.temperature) + cell(r, "co2", r.co2) + cell(r, "energy", r.energy) +
        "<td>" + r.occupancy + "/" + r.capacity + "</td><td>" + badge(r.status, STATUS_LABELS[r.status]) + "</td>" +
        '<td class="small-text">' + esc(getRecommendation(r)) + "</td></tr>").join("")
      : '<tr><td colspan="10" class="empty">Ничего не найдено</td></tr>';
  }

  [search, statusSel, buildingSel].forEach(el => el.addEventListener("input", render));
  document.getElementById("simBtn").addEventListener("click", function () {
    runSimulation();
    toast("Показания датчиков обновлены", "success");
  });
  document.addEventListener("campus:update", render);
  render();
})();
