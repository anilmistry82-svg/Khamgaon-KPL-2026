/* =========================================================
   KPL 2026 — Admin dashboard logic
   Auth is verified server-side in Code.gs. This file never
   contains the real password — it only forwards what the
   admin types to the server and stores the session token
   the server returns.
   ========================================================= */

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxQF8B25Jidwf0vLDTBg1HRPSMVMa6R9nSPhHDc5tiGX5w74dhHRJd7458Qqd7RPGOF/exec";

let sessionToken = sessionStorage.getItem("kplAdminToken") || null;
let allPlayers = [];

// ---------------------------------------------------------
// API helper (text/plain avoids a CORS preflight to Apps Script)
// ---------------------------------------------------------
async function callApi(action, extra) {
  const res = await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ action, token: sessionToken }, extra || {})),
  });
  return res.json();
}

// ---------------------------------------------------------
// Login
// ---------------------------------------------------------
document.getElementById("loginBtn").addEventListener("click", doLogin);
document.getElementById("passwordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});

async function doLogin() {
  const password = document.getElementById("passwordInput").value;
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Checking...";
  try {
    const result = await callApi("adminLogin", { password });
    if (result.success) {
      sessionToken = result.token;
      sessionStorage.setItem("kplAdminToken", sessionToken);
      showDashboard();
    } else {
      document.getElementById("loginError").style.display = "flex";
    }
  } catch (e) {
    document.getElementById("loginError").style.display = "flex";
    document.getElementById("loginError").textContent = "Connection error. Try again.";
  }
  btn.disabled = false;
  btn.textContent = "Login";
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("kplAdminToken");
  sessionToken = null;
  document.getElementById("dashboardView").style.display = "none";
  document.getElementById("loginView").style.display = "block";
});

async function showDashboard() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("dashboardView").style.display = "block";
  await loadPlayers();
}

// ---------------------------------------------------------
// Load + render players
// ---------------------------------------------------------
async function loadPlayers() {
  const result = await callApi("listPlayers");
  if (!result.success) {
    if (result.code === "UNAUTHORIZED") {
      sessionStorage.removeItem("kplAdminToken");
      sessionToken = null;
      document.getElementById("dashboardView").style.display = "none";
      document.getElementById("loginView").style.display = "block";
      document.getElementById("loginError").style.display = "flex";
      document.getElementById("loginError").textContent = "Session expired. Please log in again.";
    }
    return;
  }
  allPlayers = result.players || [];
  populateVillageFilter();
  updateStats(result);
  renderTable();
}

function updateStats(result) {
  document.getElementById("statTotal").textContent = allPlayers.length;
  const todayStr = new Date().toDateString();
  const todayCount = allPlayers.filter((p) => new Date(p.timestamp).toDateString() === todayStr).length;
  document.getElementById("statToday").textContent = todayCount;
  const villages = new Set(allPlayers.map((p) => p.village.trim().toLowerCase()));
  document.getElementById("statVillages").textContent = villages.size;
  document.getElementById("statStatus").textContent = result.registrationOpen ? "Open" : "Closed";
}

function populateVillageFilter() {
  const select = document.getElementById("villageFilter");
  const current = select.value;
  const villages = [...new Set(allPlayers.map((p) => p.village))].sort();
  select.innerHTML = '<option value="">All Villages</option>' + villages.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  select.value = current;
}

function renderTable() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const role = document.getElementById("roleFilter").value;
  const village = document.getElementById("villageFilter").value;

  const filtered = allPlayers.filter((p) => {
    const matchesSearch = !search || p.playerName.toLowerCase().includes(search) || p.mobile.includes(search);
    const matchesRole = !role || p.role === role;
    const matchesVillage = !village || p.village === village;
    return matchesSearch && matchesRole && matchesVillage;
  });

  const tbody = document.getElementById("playersBody");
  tbody.innerHTML = filtered.map((p) => `
    <tr>
      <td>${escapeHtml(p.registrationId)}</td>
      <td>${p.photoUrl ? `<img class="thumb" src="${p.photoUrl}" onclick="openImg('${p.photoUrl}')">` : "—"}</td>
      <td>${escapeHtml(p.playerName)}</td>
      <td>${escapeHtml(p.mobile)}</td>
      <td>${escapeHtml(String(p.age))}</td>
      <td>${escapeHtml(p.role)}</td>
      <td>${escapeHtml(p.village)}</td>
      <td>${escapeHtml(p.tshirt)}</td>
      <td>${p.paymentUrl ? `<button class="icon-btn" onclick="openImg('${p.paymentUrl}')">View</button>` : "—"}</td>
      <td>${new Date(p.timestamp).toLocaleString("en-IN")}</td>
      <td class="no-print">
        <div class="row-actions">
          <button class="icon-btn danger" onclick="deletePlayer('${p.registrationId}')">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  document.getElementById("emptyState").style.display = filtered.length ? "none" : "block";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

// ---------------------------------------------------------
// Filters
// ---------------------------------------------------------
document.getElementById("searchInput").addEventListener("input", renderTable);
document.getElementById("roleFilter").addEventListener("change", renderTable);
document.getElementById("villageFilter").addEventListener("change", renderTable);
document.getElementById("refreshBtn").addEventListener("click", loadPlayers);

// ---------------------------------------------------------
// Delete
// ---------------------------------------------------------
async function deletePlayer(registrationId) {
  if (!confirm(`Delete registration ${registrationId}? This cannot be undone.`)) return;
  const result = await callApi("deletePlayer", { registrationId });
  if (result.success) {
    allPlayers = allPlayers.filter((p) => p.registrationId !== registrationId);
    populateVillageFilter();
    renderTable();
    document.getElementById("statTotal").textContent = allPlayers.length;
  } else {
    alert("Delete failed: " + (result.message || "unknown error"));
  }
}
window.deletePlayer = deletePlayer;

// ---------------------------------------------------------
// Image modal
// ---------------------------------------------------------
function openImg(url) {
  document.getElementById("modalImg").src = url;
  document.getElementById("imgModal").classList.add("open");
}
window.openImg = openImg;
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("imgModal").classList.remove("open");
});
document.getElementById("imgModal").addEventListener("click", (e) => {
  if (e.target.id === "imgModal") document.getElementById("imgModal").classList.remove("open");
});

// ---------------------------------------------------------
// Export CSV
// ---------------------------------------------------------
document.getElementById("exportBtn").addEventListener("click", () => {
  const headers = ["Registration ID", "Player Name", "Mobile", "Age", "Role", "Village", "T-Shirt Size", "Photo URL", "Payment Screenshot URL", "Timestamp"];
  const rows = allPlayers.map((p) => [
    p.registrationId, p.playerName, p.mobile, p.age, p.role, p.village, p.tshirt, p.photoUrl, p.paymentUrl, p.timestamp,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `KPL2026-players-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
});

// ---------------------------------------------------------
// Print
// ---------------------------------------------------------
document.getElementById("printBtn").addEventListener("click", () => window.print());

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
if (sessionToken) {
  showDashboard();
}
