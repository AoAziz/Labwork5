/* analytics.js — AI Analytics: аномалии, графики, рекомендации */
(function () {
  const RISK_LEVEL = { critical: "critical", warning: "warning", info: "normal" };
  const RISK_BADGE = { critical: "critical", warning: "warning", info: "info" };
  const PRIORITY_BY_RISK = { critical: "high", warning: "medium", info: "low" };
  let current = [];

  function kpi(cls, title, value, sub) {
    return '<div class="card kpi ' + cls + '"><small>' + title + "</small><b>" + value + "</b><span>" + sub + "</span></div>";
  }

  function render() {
    const rooms = getRooms();
    const settings = getSettings();
    current = detectAnomalies(rooms, settings.zThreshold);

    const crit = current.filter(a => a.risk === "critical").length;
    const warn = current.filter(a => a.risk === "warning").length;
    const zCount = current.filter(a => a.method.indexOf("z-score") >= 0).length;

    document.getElementById("kpis").innerHTML =
      kpi(current.length ? "warn" : "ok", "Всего аномалий", current.length, "по " + new Set(current.map(a => a.roomId)).size + " помещениям") +
      kpi(crit ? "crit" : "ok", "Критических", crit, "требуют действий сразу") +
      kpi(warn ? "warn" : "ok", "Предупреждений", warn, "нужно проверить") +
      kpi("", "Найдено z-score", zCount, "порог z = " + settings.zThreshold);

    // графики
    const labels = rooms.map(r => r.id);
    makeChart("co2Chart", {
      type: "bar",
      data: { labels: labels, datasets: [{ label: "CO₂, ppm", data: rooms.map(r => r.co2), backgroundColor: rooms.map(r => levelColor(paramLevel(r, "co2"))), borderRadius: 5 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    makeChart("tempRoomChart", {
      type: "bar",
      data: { labels: labels, datasets: [{ label: "t, °C", data: rooms.map(r => r.temperature), backgroundColor: rooms.map(r => levelColor(paramLevel(r, "temperature"))), borderRadius: 5 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }
    });
    makeChart("energyRatioChart", {
      type: "bar",
      data: { labels: labels, datasets: [{ label: "% от базовой линии", data: rooms.map(r => Math.round(r.energy / r.baseline * 100)), backgroundColor: rooms.map(r => levelColor(paramLevel(r, "energy"))), borderRadius: 5 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // таблица аномалий
    document.getElementById("anomBody").innerHTML = current.length
      ? current.map((a, i) =>
        "<tr><td><b>" + esc(a.roomId) + "</b><div class=\"small-text\">" + esc(a.building) + "</div></td><td>" + esc(a.label) +
        "</td><td>" + a.value + " " + esc(a.unit) + "</td><td>" + esc(a.method) + "</td><td>" + a.z + "</td><td>" +
        badge(RISK_BADGE[a.risk], RISK_LABELS[a.risk]) + '</td><td class="small-text">' + esc(a.reason) +
        '</td><td class="small-text">' + esc(a.recommendation) + '</td><td><button class="btn small ghost" data-i="' + i + '">Создать заявку</button></td></tr>').join("")
      : '<tr><td colspan="9" class="empty">Аномалий не обнаружено 🎉</td></tr>';

    // рекомендации по помещениям
    const recs = rooms
      .map(r => ({ r: r, text: getRecommendation(r) }))
      .filter(x => x.text !== "Параметры в норме.");
    document.getElementById("recGrid").innerHTML = recs.length
      ? recs.map(x =>
        '<div class="card rec ' + x.r.status + '"><b>' + esc(x.r.id) + " · " + esc(x.r.type) + "</b><p>" +
        esc(x.text) + "</p></div>").join("")
      : '<div class="card empty">Все помещения в норме.</div>';
  }

  document.getElementById("anomBody").addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-i]");
    if (!btn) return;
    const a = current[Number(btn.dataset.i)];
    if (!a) return;
    const title = a.label + ": аномалия в " + a.roomId;
    const incidents = getIncidents();
    if (incidents.some(i => i.room === a.roomId && i.title === title && i.status !== "resolved")) {
      toast("Такая заявка уже открыта", "warning");
      return;
    }
    const id = incidents.reduce((m, i) => Math.max(m, i.id), 0) + 1;
    incidents.unshift({
      id: id, title: title, room: a.roomId, priority: PRIORITY_BY_RISK[a.risk],
      status: "open", assignee: "Инженер", comment: a.recommendation, createdAt: nowStr()
    });
    saveData(KEYS.incidents, incidents);
    toast("Заявка №" + id + " создана", "success");
  });

  document.getElementById("simBtn").addEventListener("click", function () {
    runSimulation();
    toast("Показания обновлены, аномалии пересчитаны", "success");
  });
  document.addEventListener("campus:update", render);
  render();
})();
