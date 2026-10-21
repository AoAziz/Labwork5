/* login.js — учебная форма входа (имитация, без настоящей защиты) */
(function () {
  if (getUser()) {
    // уже вошли — сразу на dashboard
    location.replace("dashboard.html");
    return;
  }
  const form = document.getElementById("loginForm");
  const err = document.getElementById("loginError");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = "Введите корректный email.";
      return;
    }
    if (password.length < 4) {
      err.textContent = "Пароль должен содержать минимум 4 символа.";
      return;
    }
    saveData(KEYS.user, { email: email, role: role });
    location.href = "dashboard.html";
  });
})();
