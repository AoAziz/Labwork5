/* settings.js — тема, параметры кампуса, сброс данных */
(function () {
  const s = getSettings();
  const user = getUser() || {};

  document.getElementById("themeSwitch").checked = isLight();
  document.getElementById("themeSwitch").addEventListener("change", function (e) {
    setTheme(e.target.checked);
  });

  document.getElementById("campusName").value = s.campusName;
  document.getElementById("zThreshold").value = s.zThreshold;
  document.getElementById("autoSim").checked = s.autoSimulate;
  document.getElementById("profileInfo").innerHTML =
    "<b>" + esc(user.email || "") + "</b><br>Роль: " + esc(user.role || "");

  document.getElementById("settingsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const err = document.getElementById("setError");
    const name = document.getElementById("campusName").value.trim();
    const z = parseFloat(document.getElementById("zThreshold").value);
    if (!name) { err.textContent = "Введите название кампуса."; return; }
    if (isNaN(z) || z < 1 || z > 5) { err.textContent = "Порог z-score должен быть от 1.0 до 5.0."; return; }
    err.textContent = "";
    saveSettings({ campusName: name, zThreshold: +z.toFixed(1), autoSimulate: document.getElementById("autoSim").checked });
    const brand = document.getElementById("brandName");
    if (brand) brand.textContent = name;
    applyAutoSimulation();
    toast("Настройки сохранены", "success");
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    if (confirm("Сбросить помещения, устройства, заявки и графики к исходным значениям?")) {
      resetData();
      emitUpdate();
      toast("Тестовые данные сброшены", "success");
    }
  });
})();
