/* ===========================================================
   MoodTracker & Journal — lógica en JavaScript puro
   Persistencia: localStorage (por navegador/dispositivo)
   =========================================================== */

const STORAGE_KEY = "moodtracker-entries";

const MOODS = [
  { id: "radiante", label: "Alegre", color: "#FFC145", dark: "#8a5a00", mouth: "M -9 3 Q 0 13 9 3" },
  { id: "tranquilo", label: "Chill", color: "#3EC9B0", dark: "#0d4a40", mouth: "M -9 5 Q 0 9 9 5" },
  { id: "energico", label: "Con energía", color: "#FF6F59", dark: "#7a2a1c", mouth: "M -9 2 Q 0 15 9 2" },
  { id: "melancolico", label: "Depre", color: "#6C63AC", dark: "#2b2660", mouth: "M -9 8 Q 0 0 9 8" },
  { id: "enojado", label: "Awitado", color: "#FF4D6D", dark: "#7a0f28", mouth: "M -9 7 Q 0 1 9 7" },
];

function moodById(id) {
  return MOODS.find((m) => m.id === id) || null;
}

const state = {
  entries: {},
  tab: "hoy",
  selectedDate: new Date(),
  calCursor: new Date(),
};

/* ---------- Utilidades de fecha ---------- */
function pad(n) {
  return String(n).padStart(2, "0");
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function sameDay(a, b) {
  return dateKey(a) === dateKey(b);
}
function humanDate(d) {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ---------- Persistencia ---------- */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.entries = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("No se pudieron leer las entradas guardadas:", err);
    state.entries = {};
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    return true;
  } catch (err) {
    console.error("No se pudo guardar la entrada:", err);
    return false;
  }
}

/* ---------- Blob (elemento firma) ---------- */
function blobHTML(mood, size, { breathing = true, selected = false } = {}) {
  const wrapClasses = ["blob-wrap"];
  if (breathing) wrapClasses.push("breathe");
  if (selected) wrapClasses.push("selected");

  if (!mood) {
    return `
      <div class="${wrapClasses.join(" ")}" style="width:${size}px;height:${size}px;">
        <div class="blob-shape empty"></div>
      </div>`;
  }

  return `
    <div class="${wrapClasses.join(" ")}" style="width:${size}px;height:${size}px;">
      <div class="blob-shape" style="background:${mood.color};"></div>
      <svg class="blob-face" width="${size}" height="${size}" viewBox="-20 -20 40 40">
        <circle cx="-6" cy="-3" r="2.1" fill="#2B2438" />
        <circle cx="6" cy="-3" r="2.1" fill="#2B2438" />
        <path d="${mood.mouth}" stroke="#2B2438" stroke-width="2" fill="none" stroke-linecap="round" />
      </svg>
    </div>`;
}

/* ---------- Header ---------- */
function updateHeader() {
  const count = Object.keys(state.entries).length;
  const label = document.getElementById("entry-count");
  label.textContent = `${count} ${count === 1 ? "día registrado" : "días registrados"}`;

  document.getElementById("brand-blob").outerHTML = blobHTML(MOODS[0], 40, {
    breathing: true,
  }).replace('class="blob-wrap', 'id="brand-blob" class="blob-wrap');

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === state.tab);
  });
}

/* ---------- Vista: Escribir ---------- */
function renderWriteView() {
  const root = document.getElementById("view-root");
  const key = dateKey(state.selectedDate);
  const existing = state.entries[key];
  const isToday = sameDay(state.selectedDate, new Date());
  const currentMood = existing ? existing.mood : null;

  root.innerHTML = `
    ${!isToday ? `<button class="back-today" id="back-today">← Volver a hoy</button>` : ""}
    <p class="date-label">${humanDate(state.selectedDate)}</p>

    <div class="hero">
      ${blobHTML(moodById(currentMood), 110, { breathing: true, selected: true })}
      <p class="hero-label" id="hero-label">${
        currentMood ? moodById(currentMood).label : "¿Cómo te sientes?"
      }</p>
    </div>

    <div class="mood-picker" id="mood-picker">
      ${MOODS.map(
        (m) => `
        <button class="mood-option ${m.id === currentMood ? "selected" : ""}" data-mood="${m.id}">
          ${blobHTML(m, 56, { breathing: false, selected: m.id === currentMood })}
          <span style="${m.id === currentMood ? `color:${m.dark}` : ""}">${m.label}</span>
        </button>`
      ).join("")}
    </div>

    <div class="journal-box">
      <textarea id="journal-text" placeholder="Escribe libremente sobre tu día…">${
        existing ? existing.text : ""
      }</textarea>
    </div>

    <div class="save-row">
      <span class="saved-flash" id="saved-flash">Guardado ✓</span>
      <button class="save-btn" id="save-btn" ${currentMood ? "" : "disabled"}>Guardar entrada</button>
    </div>
  `;

  let selectedMoodId = currentMood;

  if (!isToday) {
    document.getElementById("back-today").addEventListener("click", () => {
      state.selectedDate = new Date();
      renderWriteView();
    });
  }

  root.querySelectorAll(".mood-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedMoodId = btn.dataset.mood;
      const mood = moodById(selectedMoodId);
      document.getElementById("hero-label").textContent = mood.label;
      root.querySelector(".hero").firstElementChild.outerHTML = blobHTML(mood, 110, {
        breathing: true,
        selected: true,
      });
      root.querySelectorAll(".mood-option").forEach((b) => {
        const isSel = b.dataset.mood === selectedMoodId;
        b.classList.toggle("selected", isSel);
        const span = b.querySelector("span");
        span.style.color = isSel ? moodById(b.dataset.mood).dark : "";
      });
      document.getElementById("save-btn").disabled = false;
    });
  });

  document.getElementById("save-btn").addEventListener("click", () => {
    if (!selectedMoodId) return;
    const text = document.getElementById("journal-text").value;
    state.entries[key] = { mood: selectedMoodId, text, updatedAt: Date.now() };
    const ok = saveEntries();
    if (ok) {
      const flash = document.getElementById("saved-flash");
      flash.classList.add("show");
      setTimeout(() => flash.classList.remove("show"), 2000);
      updateHeader();
    }
  });
}

/* ---------- Vista: Calendario ---------- */
function renderCalendarView() {
  const root = document.getElementById("view-root");
  const cursor = state.calCursor;
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  const today = new Date();
  const dow = ["L", "M", "M", "J", "V", "S", "D"];

  root.innerHTML = `
    <div class="cal-nav">
      <button class="cal-arrow" id="cal-prev">‹</button>
      <p class="cal-month">${monthLabel}</p>
      <button class="cal-arrow" id="cal-next">›</button>
    </div>
    <div class="cal-grid">
      ${dow.map((d) => `<span class="cal-dow">${d}</span>`).join("")}
      ${cells
        .map((d, i) => {
          if (!d) return `<div></div>`;
          const e = state.entries[dateKey(d)];
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, state.selectedDate);
          return `
            <button class="cal-day" data-date="${dateKey(d)}">
              <div class="cal-blob-wrap">
                ${blobHTML(e ? moodById(e.mood) : null, 34, { breathing: false })}
                ${isSelected ? `<div class="cal-ring"></div>` : ""}
              </div>
              <span class="cal-day-num ${isToday ? "today" : ""}">${d.getDate()}</span>
            </button>`;
        })
        .join("")}
    </div>
    <p class="cal-hint">Toca cualquier día para leer o editar esa entrada.</p>
  `;

  document.getElementById("cal-prev").addEventListener("click", () => {
    state.calCursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    renderCalendarView();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    state.calCursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    renderCalendarView();
  });

  root.querySelectorAll(".cal-day").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [y, m, d] = btn.dataset.date.split("-").map(Number);
      state.selectedDate = new Date(y, m - 1, d);
      state.tab = "hoy";
      updateHeader();
      renderWriteView();
    });
  });
}

/* ---------- Navegación entre pestañas ---------- */
function renderCurrentView() {
  if (state.tab === "hoy") {
    renderWriteView();
  } else {
    renderCalendarView();
  }
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tab = btn.dataset.tab;
      updateHeader();
      renderCurrentView();
    });
  });
}

/* ---------- Arranque ---------- */
function init() {
  loadEntries();
  initTabs();
  updateHeader();
  renderCurrentView();
}

document.addEventListener("DOMContentLoaded", init);
