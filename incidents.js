/* incidents.js — CRUD заявок */
(function () {
  const search = document.getElementById("incSearch");
  const statusSel = document.getElementById("incStatus");
  const prioSel = document.getElementById("incPriority");
  const modal = document.getElementById("incModal");
  const form = document.getElementById("incForm");
  const fErr = document.getElementById("formError");
  const user = getUser() || { role: "Operator" };
  const canDelete = user.role !== "Operator";
  let editingId = null;

  const q = new URLSearchParams(location.search).get("q");
  if (q) search.value = q;

  // список помещений в форме
  document.getElementById("fRoom").innerHTML =
    getRooms().map(r => '<option value="' + esc(r.id) + '">' + esc(r.id) + " — " + esc(r.type) + "</option>").join("");

  function render() {
    const all = getIncidents();
    const term = search.value.trim().toLowerCase();
    const rows = all.filter(i =>
      (!statusSel.value || i.status === statusSel.value) &&
      (!prioSel.value || i.priority === prioSel.value) &&
      (!term || (i.title + " " + i.room + " " + i.assignee + " " + (i.comment || "")).toLowerCase().indexOf(term) >= 0));

    document.getElementById("countLine").textContent = "Найдено: " + rows.length + " из " + all.length;
    document.getElementById("incBody").innerHTML = rows.length
      ? rows.map(i =>
        "<tr><td>" + i.id + "</td><td><b>" + esc(i.title) + "</b></td><td>" + esc(i.room) + "</td><td>" +
        priorityBadge(i.priority) + "</td><td>" + statusBadge(i.status) + "</td><td>" + esc(i.assignee) +
        '</td><td class="small-text">' + esc(i.comment || "—") + "</td><td>" + esc(i.createdAt) + "</td>" +
        '<td><div class="actions"><button class="btn small ghost" data-act="edit" data-id="' + i.id + '">Изменить</button>' +
        '<button class="btn small danger" data-act="del" data-id="' + i.id + '"' +
        (canDelete ? "" : ' disabled title="Оператор не может удалять заявки"') + ">Удалить</button></div></td></tr>").join("")
      : '<tr><td colspan="9" class="empty">Заявок не найдено</td></tr>';
  }

  function openModal(inc) {
    editingId = inc ? inc.id : null;
    document.getElementById("modalTitle").textContent = inc ? "Заявка №" + inc.id : "Новая заявка";
    document.getElementById("fTitle").value = inc ? inc.title : "";
    document.getElementById("fRoom").value = inc ? inc.room : getRooms()[0].id;
    document.getElementById("fPriority").value = inc ? inc.priority : "medium";
    document.getElementById("fStatus").value = inc ? inc.status : "open";
    document.getElementById("fAssignee").value = inc ? inc.assignee : "Инженер";
    document.getElementById("fComment").value = inc ? (inc.comment || "") : "";
    fErr.textContent = "";
    modal.hidden = false;
    document.getElementById("fTitle").focus();
  }

  function closeModal() { modal.hidden = true; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const title = document.getElementById("fTitle").value.trim();
    if (title.length < 3) {
      fErr.textContent = "Заголовок должен содержать минимум 3 символа.";
      return;
    }
    const incidents = getIncidents();
    const data = {
      title: title,
      room: document.getElementById("fRoom").value,
      priority: document.getElementById("fPriority").value,
      status: document.getElementById("fStatus").value,
      assignee: document.getElementById("fAssignee").value,
      comment: document.getElementById("fComment").value.trim()
    };
    if (editingId == null) {
      const id = incidents.reduce((m, i) => Math.max(m, i.id), 0) + 1;
      incidents.unshift(Object.assign({ id: id, createdAt: nowStr() }, data));
      toast("Заявка создана", "success");
    } else {
      const inc = incidents.find(i => i.id === editingId);
      if (inc) Object.assign(inc, data);
      toast("Заявка обновлена", "success");
    }
    saveData(KEYS.incidents, incidents);
    closeModal();
    render();
  });

  document.getElementById("incBody").addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-act]");
    if (!btn || btn.disabled) return;
    const id = Number(btn.dataset.id);
    const incidents = getIncidents();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return;
    if (btn.dataset.act === "edit") {
      openModal(inc);
    } else if (btn.dataset.act === "del") {
      if (confirm("Удалить заявку №" + id + " «" + inc.title + "»?")) {
        saveData(KEYS.incidents, incidents.filter(i => i.id !== id));
        toast("Заявка удалена", "warning");
        render();
      }
    }
  });

  document.getElementById("addBtn").addEventListener("click", () => openModal(null));
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  [search, statusSel, prioSel].forEach(el => el.addEventListener("input", render));
  render();
})();
