/* ai.js — «AI Analytics»: пороги, z-score, аномалии, рекомендации.
   Это статистика и правила, а не генеративная модель. */

const THRESHOLDS = {
  temperature: { warn: 28, crit: 32, low: 18 },
  co2: { warn: 1000, crit: 1500 },
  energy: { warn: 1.3, crit: 1.6 } // отношение к базовой линии (+30% / +60%)
};

const PARAM_LABELS = { temperature: "Температура", co2: "CO₂", energy: "Энергия" };
const PARAM_UNITS = { temperature: "°C", co2: "ppm", energy: "кВт·ч" };
const MIN_SD = { temperature: 0.5, co2: 30, energy: 0.2 }; // нижний предел σ, чтобы не ловить шум

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values) {
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function zScore(values, current, minSd) {
  if (!values || values.length < 4) return 0;
  const sd = Math.max(stdDev(values), minSd || 0);
  if (sd === 0) return 0;
  return Math.abs((current - mean(values)) / sd);
}

function levelOf(value, warn, crit) {
  if (value >= crit) return "critical";
  if (value >= warn) return "warning";
  return "normal";
}

function paramLevel(room, param) {
  if (param === "temperature") {
    const t = room.temperature;
    const l = levelOf(t, THRESHOLDS.temperature.warn, THRESHOLDS.temperature.crit);
    if (l === "normal" && t < THRESHOLDS.temperature.low) return "warning";
    return l;
  }
  if (param === "co2") return levelOf(room.co2, THRESHOLDS.co2.warn, THRESHOLDS.co2.crit);
  if (param === "energy") {
    return levelOf(room.energy / (room.baseline || room.energy || 1), THRESHOLDS.energy.warn, THRESHOLDS.energy.crit);
  }
  return "normal";
}

function worstLevel(levels) {
  if (levels.indexOf("critical") >= 0) return "critical";
  if (levels.indexOf("warning") >= 0) return "warning";
  return "normal";
}

function roomStatus(room) {
  return worstLevel(["temperature", "co2", "energy"].map(p => paramLevel(room, p)));
}

function recalcStatuses(rooms) {
  rooms.forEach(r => { r.status = roomStatus(r); });
  return rooms;
}

function energyOverPercent(room) {
  return Math.round((room.energy / (room.baseline || room.energy || 1) - 1) * 100);
}

function getRecommendation(room) {
  if (room.co2 >= THRESHOLDS.co2.crit) {
    return "Критический CO₂: включить вентиляцию, проветрить и проверить загрузку аудитории.";
  }
  if (room.temperature >= THRESHOLDS.temperature.crit) {
    return "Перегрев: проверить кондиционер или систему вентиляции.";
  }
  if (room.occupancy === 0 && room.energy > 4 && room.type !== "Серверная") {
    return "В помещении нет людей, но энергопотребление высокое: проверить, не забыто ли включённое оборудование.";
  }
  if (room.co2 >= THRESHOLDS.co2.warn) {
    return "Повышенный CO₂: усилить вентиляцию, сократить время без проветривания.";
  }
  if (room.temperature >= THRESHOLDS.temperature.warn) {
    return "Повышенная температура: проверить кондиционирование.";
  }
  if (room.temperature < THRESHOLDS.temperature.low) {
    return "Низкая температура: проверить отопление.";
  }
  if (energyOverPercent(room) >= 30) {
    return "Энергопотребление выше базовой линии на " + energyOverPercent(room) + "%: проверить оборудование и освещение.";
  }
  return "Параметры в норме.";
}

const RISK_ORDER = { critical: 0, warning: 1, info: 2 };
const RISK_LABELS = { critical: "Критический", warning: "Предупреждение", info: "Низкий" };

function detectAnomalies(rooms, zThr) {
  const threshold = zThr || 2.5;
  const result = [];
  rooms.forEach(room => {
    ["temperature", "co2", "energy"].forEach(param => {
      const hist = (room.history && room.history[param] || []).slice(0, -1);
      const cur = room[param];
      const z = zScore(hist, cur, MIN_SD[param]);
      const lvl = paramLevel(room, param);
      const zFlag = z > threshold;
      const ruleFlag = param === "energy" && room.occupancy === 0 && room.energy > 4 && room.type !== "Серверная";
      if (!zFlag && lvl === "normal" && !ruleFlag) return;

      const methods = [];
      const reasons = [];
      if (lvl !== "normal") {
        methods.push("порог");
        if (param === "temperature") {
          reasons.push(cur < THRESHOLDS.temperature.low
            ? "температура ниже допустимой (" + cur + " °C)"
            : "температура " + cur + " °C превышает порог");
        } else if (param === "co2") {
          reasons.push("CO₂ " + cur + " ppm превышает порог");
        } else {
          reasons.push("потребление выше базовой линии на " + energyOverPercent(room) + "%");
        }
      }
      if (zFlag) {
        methods.push("z-score");
        reasons.push("значение резко отличается от среднего по истории (z = " + z.toFixed(1) + ")");
      }
      if (ruleFlag) {
        methods.push("правило");
        reasons.push("людей нет, а энергопотребление высокое");
      }

      let risk;
      if (lvl === "critical") risk = "critical";
      else if (lvl === "warning" || ruleFlag) risk = "warning";
      else risk = z > threshold * 1.5 ? "warning" : "info";

      result.push({
        roomId: room.id,
        building: room.building,
        param: param,
        label: PARAM_LABELS[param],
        value: cur,
        unit: PARAM_UNITS[param],
        z: +z.toFixed(1),
        method: methods.join(" + "),
        risk: risk,
        reason: reasons.join("; "),
        recommendation: getRecommendation(room)
      });
    });
  });
  result.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.z - a.z);
  return result;
}

function getAlerts(rooms, devices) {
  const alerts = [];
  rooms.forEach(r => {
    const lc = paramLevel(r, "co2");
    if (lc !== "normal") {
      alerts.push({ type: "co2", level: lc, room: r.id,
        title: (lc === "critical" ? "Критический" : "Высокий") + " CO₂ в " + r.id,
        text: r.co2 + " ppm" });
    }
    const lt = paramLevel(r, "temperature");
    if (lt !== "normal") {
      alerts.push({ type: "temp", level: lt, room: r.id,
        title: (r.temperature < THRESHOLDS.temperature.low ? "Низкая температура в " : "Перегрев в ") + r.id,
        text: r.temperature + " °C" });
    }
    const le = paramLevel(r, "energy");
    if (le !== "normal") {
      alerts.push({ type: "energy", level: le, room: r.id,
        title: "Перерасход энергии в " + r.id,
        text: "+" + energyOverPercent(r) + "% к базовой линии" });
    }
  });
  devices.forEach(d => {
    if (d.status === "offline") {
      alerts.push({ type: "offline", level: "warning", room: d.room,
        title: "Устройство offline: " + d.id, text: "Помещение " + d.room });
    }
  });
  alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "critical" ? -1 : 1));
  return alerts;
}
