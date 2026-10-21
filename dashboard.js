/* dashboard.js — KPI, графики и уведомления */
(function () {
  function kpi(cls, title, value, sub) {
    return '<div class="card kpi ' + cls + '"><small>' + title + "</small><b>" + value + "</b><span>" + sub + "</span></div>";
  }

  function render() {
    const rooms = getRooms();
    const devices = getDevices();
    const incidents = getIncidents();
    const settings = getSettings();

    const online = devices.filter(d => d.status === "online").length;
    const openInc = incidents.filter(i => i.status !== "resolved").length;
    const energy = rooms.reduce((s, r) => s + r.energy, 0);
    const crit = rooms.filter(r => r.status === "critical").length;
    const warn = rooms.filter(r => r.status === "warning").length;
    const alerts = getAlerts(rooms, devices);
    const anomalies = detectAnomalies(rooms, settings.zThreshold);

    document.getElementById("kpis").innerHTML =
      kpi("", "Помещений", rooms.length, rooms.length - crit - warn + " в норме · " + warn + " внимание · " + crit + " крит.") +
      kpi(online === devices.length ? "ok" : "warn", "Устройств online", online + "/" + devices.length, devices.length - online + " offline") +
      kpi(openInc ? "warn" : "ok", "Открытых заявок", openInc, "всего " + incidents.length) +
      kpi("", "Энергия, кВт·ч", energy.toFixed(1), "текущий час, весь кампус") +
      kpi(alerts.length ? "crit" : "ok", "Уведомлений", alerts.length, "CO₂, перегрев, offline, энергия") +
      kpi(anomalies.length ? "warn" : "ok", "Аномалий AI", anomalies.length, "порог z = " + settings.zThreshold);

    // энергия по корпусам
    const buildings = Array.from(new Set(rooms.map(r => r.building))).sort();
    const byB = buildings.map(b => +rooms.filter(r => r.building === b).reduce((s, r) => s + r.energy, 0).toFixed(1));
    makeChart("energyChart", {
      type: "bar",
      data: { labels: buildings, datasets: [{ label: "кВт·ч", data: byB, backgroundColor: COLORS.accent, borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // тренд температуры
    const trend = getTrend();
    makeChart("tempChart", {
      type: "line",
      data: {
        labels: trend.map(t => t.label),
        datasets: [{ label: "Средняя t, °C", data: trend.map(t => t.temp), borderColor: COLORS.warning, backgroundColor: "rgba(255,200,87,.15)", fill: true, tension: 0.35, pointRadius: 3 }]
      },
      options: { plugins: { legend: { display: false } } }
    });

    // статус устройств
    makeChart("deviceChart", {
      type: "doughnut",
      data: {
        labels: ["Online", "Offline"],
        datasets: [{ data: [online, devices.length - online], backgroundColor: [COLORS.normal, COLORS.critical], borderWidth: 0 }]
      },
      options: { cutout: "62%", plugins: { legend: { position: "bottom" } } }
    });

    // уведомления
    const list = document.getElementById("alertList");
    list.innerHTML = alerts.length
      ? alerts.slice(0, 6).map(a =>
        '<div class="alert-item"><span class="lvl-dot ' + a.level + '"></span><div><b>' + esc(a.title) +
        "</b><small>" + esc(a.text) + "</small></div></div>").join("")
      : '<div class="empty">Нет активных уведомлений 🎉</div>';

    // сводка AI
    const top = anomalies.slice(0, 3);
    document.getElementById("aiSummary").innerHTML =
      '<p class="small-text">Найдено аномалий: <b>' + anomalies.length + "</b>. Самые важные:</p>" +
      (top.length
        ? '<div class="alert-list">' + top.map(a =>
          '<div class="alert-item"><span class="lvl-dot ' + (a.risk === "info" ? "normal" : a.risk) + '"></span><div><b>' +
          esc(a.roomId) + " · " + esc(a.label) + " " + a.value + " " + esc(a.unit) + "</b><small>" +
          esc(a.recommendation) + "</small></div></div>").join("") + "</div>"
        : '<div class="empty">Аномалий нет.</div>') +
      '<p style="margin-top:12px"><a href="analytics.html">Открыть полную аналитику →</a></p>';
  }

  document.getElementById("simBtn").addEventListener("click", function () {
    runSimulation();
    toast("Показания датчиков обновлены", "success");
  });

  const auto = document.getElementById("autoToggle");
  auto.checked = getSettings().autoSimulate;
  auto.addEventListener("change", function () {
    const s = getSettings();
    s.autoSimulate = auto.checked;
    saveSettings(s);
    applyAutoSimulation();
    toast(auto.checked ? "Автообновление включено" : "Автообновление выключено");
  });

  document.addEventListener("campus:update", render);
  render();
})();
