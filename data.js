/* data.js — тестовые данные Smart Campus AI (учебные, имитация IoT) */

function pad2(n) { return String(n).padStart(2, "0"); }

function nowStr(date) {
  const d = date || new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
    " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function rnd(min, max, dec) {
  const v = Math.random() * (max - min) + min;
  return +v.toFixed(dec == null ? 1 : dec);
}

function series(center, spread, n, dec) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(+(center + (Math.random() * 2 - 1) * spread).toFixed(dec));
  return arr;
}

function buildDefaultData() {
  // id, корпус, этаж, тип, температура, CO2, энергия, людей, вместимость
  const roomSeed = [
    ["A-101", "Корпус A", 1, "Компьютерный класс", 24.3, 780, 3.6, 18, 24],
    ["A-102", "Корпус A", 1, "Лекционная аудитория", 22.8, 640, 2.4, 40, 60],
    ["A-205", "Корпус A", 2, "Лекционная аудитория", 25.1, 1620, 2.9, 55, 60],   // CO2 критический
    ["A-210", "Корпус A", 2, "Лаборатория физики", 23.5, 820, 3.1, 12, 20],
    ["B-101", "Корпус B", 1, "Компьютерный класс", 26.2, 1040, 4.0, 22, 24],     // CO2 предупреждение
    ["B-102", "Корпус B", 1, "Лаборатория электроники", 32.6, 900, 4.8, 8, 16],  // перегрев
    ["B-204", "Корпус B", 2, "Аудитория", 22.4, 590, 2.0, 25, 40],
    ["B-301", "Корпус B", 3, "Конференц-зал", 23.0, 700, 2.7, 0, 80],
    ["C-101", "Корпус C", 1, "Лаборатория робототехники", 24.8, 860, 3.8, 10, 18],
    ["C-205", "Корпус C", 2, "Аудитория", 21.9, 560, 1.9, 30, 40],
    ["C-301", "Корпус C", 3, "Компьютерный класс", 23.7, 610, 5.4, 0, 24],       // энергия без людей
    ["C-SRV", "Корпус C", 0, "Серверная", 27.6, 450, 6.2, 0, 2],
    ["D-001", "Корпус D", 0, "Спортзал", 21.5, 720, 3.3, 35, 50],
    ["D-110", "Корпус D", 1, "Библиотека", 22.6, 680, 2.5, 28, 60]
  ];

  // «нормальные» значения для проблемных помещений (нужны для истории и baseline)
  const normal = {
    "A-205": { co2: 800 },
    "B-101": { co2: 870 },
    "B-102": { temperature: 24.5, energy: 3.6 },
    "C-301": { energy: 3.2 }
  };

  const rooms = roomSeed.map(function (s) {
    const n = normal[s[0]] || {};
    const room = {
      id: s[0], building: s[1], floor: s[2], type: s[3],
      temperature: s[4], co2: s[5], energy: s[6], occupancy: s[7], capacity: s[8],
      baseOcc: s[7],
      baseline: n.energy || s[6],
      base: { temperature: s[4], co2: s[5], energy: s[6] },
      status: "normal",
      history: {
        temperature: series(n.temperature || s[4], 0.5, 9, 1).concat([s[4]]),
        co2: series(n.co2 || s[5], 35, 9, 0).concat([s[5]]),
        energy: series(n.energy || s[6], 0.25, 9, 1).concat([s[6]])
      }
    };
    return room;
  });

  const ago = function (minutes) { return nowStr(new Date(Date.now() - minutes * 60000)); };

  // id, помещение, тип, статус, единица
  const dSeed = [
    ["TEMP-A101-01", "A-101", "Temperature Sensor", "online", "°C"],
    ["CO2-A101-01", "A-101", "CO2 Sensor", "online", "ppm"],
    ["PWR-A101-01", "A-101", "Power Meter", "online", "kWh"],
    ["ACC-A101-01", "A-101", "Access Controller", "online", ""],
    ["LIGHT-A102-01", "A-102", "Light Controller", "online", "%"],
    ["TEMP-A205-01", "A-205", "Temperature Sensor", "online", "°C"],
    ["CO2-A205-01", "A-205", "CO2 Sensor", "online", "ppm"],
    ["PWR-A205-01", "A-205", "Power Meter", "online", "kWh"],
    ["TEMP-B101-01", "B-101", "Temperature Sensor", "offline", "°C"],
    ["CO2-B101-01", "B-101", "CO2 Sensor", "online", "ppm"],
    ["TEMP-B102-01", "B-102", "Temperature Sensor", "online", "°C"],
    ["CO2-B102-01", "B-102", "CO2 Sensor", "offline", "ppm"],
    ["PWR-B102-01", "B-102", "Power Meter", "online", "kWh"],
    ["LIGHT-B204-01", "B-204", "Light Controller", "online", "%"],
    ["CAM-B301-01", "B-301", "Camera", "online", ""],
    ["TEMP-C301-01", "C-301", "Temperature Sensor", "online", "°C"],
    ["PWR-C301-01", "C-301", "Power Meter", "online", "kWh"],
    ["LIGHT-C205-01", "C-205", "Light Controller", "online", "%"],
    ["TEMP-SRV-01", "C-SRV", "Temperature Sensor", "online", "°C"],
    ["PWR-SRV-01", "C-SRV", "Power Meter", "online", "kWh"],
    ["ACC-SRV-01", "C-SRV", "Access Controller", "online", ""],
    ["CAM-D001-01", "D-001", "Camera", "online", ""],
    ["CAM-D110-01", "D-110", "Camera", "offline", ""],
    ["TEMP-D110-01", "D-110", "Temperature Sensor", "online", "°C"]
  ];
  const devices = dSeed.map(function (s, i) {
    return {
      id: s[0], room: s[1], type: s[2], status: s[3], unit: s[4],
      value: s[2] === "Light Controller" ? 60 + (i % 4) * 10 : null,
      updatedAt: s[3] === "online" ? ago(i % 5) : ago(180 + i * 7)
    };
  });

  const incidents = [
    { id: 1, title: "Высокий уровень CO2", room: "A-205", priority: "high", status: "open",
      assignee: "Инженер", comment: "Переполненная аудитория, вентиляция не справляется.", createdAt: ago(95) },
    { id: 2, title: "Перегрев в лаборатории", room: "B-102", priority: "high", status: "in_progress",
      assignee: "Администратор", comment: "Проверить кондиционер и вытяжку.", createdAt: ago(210) },
    { id: 3, title: "Датчик CO2 не отвечает", room: "B-102", priority: "medium", status: "open",
      assignee: "Инженер", comment: "Offline более 3 часов.", createdAt: ago(190) },
    { id: 4, title: "Камера библиотеки offline", room: "D-110", priority: "low", status: "open",
      assignee: "Оператор", comment: "", createdAt: ago(600) },
    { id: 5, title: "Не закрывается дверь серверной", room: "C-SRV", priority: "medium", status: "resolved",
      assignee: "Инженер", comment: "Заменён доводчик.", createdAt: ago(2400) }
  ];

  // тренд за последние 12 «часов»
  const trend = [];
  const avgT = rooms.reduce(function (s, r) { return s + r.temperature; }, 0) / rooms.length;
  const avgC = rooms.reduce(function (s, r) { return s + r.co2; }, 0) / rooms.length;
  const sumE = rooms.reduce(function (s, r) { return s + r.energy; }, 0);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.now() - i * 3600000);
    trend.push({
      label: pad2(d.getHours()) + ":00",
      temp: +(avgT - 0.8 + Math.random() * 1.2).toFixed(1),
      co2: Math.round(avgC - 80 + Math.random() * 140),
      energy: +(sumE - 6 + Math.random() * 10).toFixed(1)
    });
  }

  return { rooms: rooms, devices: devices, incidents: incidents, trend: trend };
}
