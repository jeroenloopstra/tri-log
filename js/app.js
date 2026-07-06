const listView = document.getElementById("listView");
const detailView = document.getElementById("detailView");
const formView = document.getElementById("formView");
const raceList = document.getElementById("raceList");
const emptyState = document.getElementById("emptyState");

let races = [];
let currentId = null;
let photoBlob = null;

function showView(view) {
  for (const v of [listView, detailView, formView]) v.classList.add("hidden");
  view.classList.remove("hidden");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function secondsFromHMS(h, m, s) {
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

function formatSeconds(total) {
  total = Math.max(0, Math.round(total || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function totalSeconds(race) {
  return (race.swimTime || 0) + (race.t1Time || 0) + (race.bikeTime || 0) + (race.t2Time || 0) + (race.runTime || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function refreshList() {
  races = await RaceStore.getAll();
  raceList.innerHTML = "";
  emptyState.classList.toggle("hidden", races.length > 0);

  for (const race of races) {
    const li = document.createElement("li");
    li.className = "race-card";
    li.dataset.id = race.id;

    let mediaHtml;
    if (race.photo) {
      const url = URL.createObjectURL(race.photo);
      mediaHtml = `<img src="${url}" alt="">`;
    } else {
      mediaHtml = `<div class="placeholder">${(race.name || "?").slice(0, 2).toUpperCase()}</div>`;
    }

    li.innerHTML = `
      ${mediaHtml}
      <div class="info">
        <div class="name">${escapeHtml(race.name || "Untitled race")}</div>
        <div class="meta">${formatDate(race.date)}</div>
      </div>
      <div class="total">${formatSeconds(totalSeconds(race))}</div>
    `;
    li.addEventListener("click", () => openDetail(race.id));
    raceList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openDetail(id) {
  const race = races.find((r) => r.id === id);
  if (!race) return;
  currentId = id;

  const content = document.getElementById("detailContent");
  const photoHtml = race.photo
    ? `<img class="detail-photo" src="${URL.createObjectURL(race.photo)}" alt="">`
    : "";

  content.innerHTML = `
    ${photoHtml}
    <h3>${escapeHtml(race.name || "Untitled race")}</h3>
    <div class="date">${formatDate(race.date)}</div>
    <table class="detail-table">
      <tr><td>Swim (${race.swimDist || 0} m)</td><td>${formatSeconds(race.swimTime)}</td></tr>
      <tr><td>T1</td><td>${formatSeconds(race.t1Time)}</td></tr>
      <tr><td>Bike (${race.bikeDist || 0} km)</td><td>${formatSeconds(race.bikeTime)}</td></tr>
      <tr><td>T2</td><td>${formatSeconds(race.t2Time)}</td></tr>
      <tr><td>Run (${race.runDist || 0} km)</td><td>${formatSeconds(race.runTime)}</td></tr>
      <tr class="total"><td>Total</td><td>${formatSeconds(totalSeconds(race))}</td></tr>
    </table>
  `;

  showView(detailView);
}

function hmsInputs(target) {
  const wrap = document.querySelector(`.time-input[data-target="${target}"]`);
  return {
    h: wrap.querySelector(".h"),
    m: wrap.querySelector(".m"),
    s: wrap.querySelector(".s"),
  };
}

function setHMS(target, seconds) {
  const { h, m, s } = hmsInputs(target);
  seconds = Math.max(0, Math.round(seconds || 0));
  h.value = Math.floor(seconds / 3600) || "";
  m.value = Math.floor((seconds % 3600) / 60) || "";
  s.value = seconds % 60 || "";
}

function getHMS(target) {
  const { h, m, s } = hmsInputs(target);
  return secondsFromHMS(h.value, m.value, s.value);
}

function updateTotalDisplay() {
  const total =
    getHMS("swimTime") + getHMS("t1Time") + getHMS("bikeTime") + getHMS("t2Time") + getHMS("runTime");
  document.getElementById("totalTimeDisplay").textContent = formatSeconds(total);
}

function resetForm() {
  document.getElementById("raceForm").reset();
  document.getElementById("photoPreview").classList.add("hidden");
  document.getElementById("photoPreview").src = "";
  photoBlob = null;
  for (const t of ["swimTime", "t1Time", "bikeTime", "t2Time", "runTime"]) setHMS(t, 0);
  updateTotalDisplay();
}

function openForm(race) {
  resetForm();
  document.getElementById("formTitle").textContent = race ? "Edit Race" : "New Race";

  if (race) {
    document.getElementById("nameInput").value = race.name || "";
    document.getElementById("dateInput").value = race.date || "";
    document.getElementById("swimDist").value = race.swimDist || "";
    document.getElementById("bikeDist").value = race.bikeDist || "";
    document.getElementById("runDist").value = race.runDist || "";
    setHMS("swimTime", race.swimTime);
    setHMS("t1Time", race.t1Time);
    setHMS("bikeTime", race.bikeTime);
    setHMS("t2Time", race.t2Time);
    setHMS("runTime", race.runTime);
    if (race.photo) {
      photoBlob = race.photo;
      const preview = document.getElementById("photoPreview");
      preview.src = URL.createObjectURL(race.photo);
      preview.classList.remove("hidden");
    }
    updateTotalDisplay();
  }

  showView(formView);
}

document.getElementById("addBtn").addEventListener("click", () => {
  currentId = null;
  openForm(null);
});

document.getElementById("backBtn").addEventListener("click", () => {
  showView(listView);
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  showView(currentId ? detailView : listView);
});

document.getElementById("editBtn").addEventListener("click", () => {
  const race = races.find((r) => r.id === currentId);
  openForm(race);
});

document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!currentId) return;
  if (!confirm("Delete this race result?")) return;
  await RaceStore.remove(currentId);
  currentId = null;
  await refreshList();
  showView(listView);
});

document.getElementById("photoInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  photoBlob = file;
  const preview = document.getElementById("photoPreview");
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
});

for (const target of ["swimTime", "t1Time", "bikeTime", "t2Time", "runTime"]) {
  const { h, m, s } = hmsInputs(target);
  [h, m, s].forEach((input) => input.addEventListener("input", updateTotalDisplay));
}

document.getElementById("raceForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const race = {
    id: currentId || `${Date.now()}-${Math.floor(performance.now())}`,
    name: document.getElementById("nameInput").value.trim(),
    date: document.getElementById("dateInput").value,
    photo: photoBlob || null,
    swimDist: Number(document.getElementById("swimDist").value) || 0,
    bikeDist: Number(document.getElementById("bikeDist").value) || 0,
    runDist: Number(document.getElementById("runDist").value) || 0,
    swimTime: getHMS("swimTime"),
    t1Time: getHMS("t1Time"),
    bikeTime: getHMS("bikeTime"),
    t2Time: getHMS("t2Time"),
    runTime: getHMS("runTime"),
  };

  await RaceStore.put(race);
  currentId = race.id;
  await refreshList();
  openDetail(race.id);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

refreshList();
