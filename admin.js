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
  await loadRegistrationSettings();
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
  const pendingCount = allPlayers.filter((p) => p.paymentStatus !== "Verified").length;
  document.getElementById("statPending").textContent = pendingCount;
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
      <td>
        <span class="status-badge ${p.paymentStatus === "Verified" ? "status-verified" : "status-pending"}">${p.paymentStatus === "Verified" ? "✓ Verified" : "⏳ Pending"}</span><br>
        <button class="verify-btn" onclick="togglePaymentStatus('${p.registrationId}', '${p.paymentStatus === "Verified" ? "Pending" : "Verified"}')">
          ${p.paymentStatus === "Verified" ? "Mark Pending" : "Mark Verified"}
        </button>
      </td>
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
document.getElementById("refreshBtn").addEventListener("click", async () => { await loadPlayers(); await loadRegistrationSettings(); });

document.getElementById("saveRegistrationSettingsBtn").addEventListener("click", saveRegistrationSettings);
document.getElementById("reloadRegistrationSettingsBtn").addEventListener("click", loadRegistrationSettings);

function formatISTInput(isoString) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(isoString));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

async function loadRegistrationSettings() {
  const message = document.getElementById("settingsMessage");
  message.textContent = "Loading settings...";
  try {
    const result = await callApi("adminGetRegistrationSettings");
    if (!result.success) {
      message.textContent = result.message || "Could not load settings.";
      return;
    }
    document.getElementById("registrationDeadline").value = formatISTInput(result.deadline);
    document.getElementById("registrationEnabled").value = String(!!result.registrationEnabled);
    message.textContent = `Current status: ${result.registrationOpen ? "OPEN" : "CLOSED"}. Deadline: ${formatISTInput(result.deadline).replace("T", " ")} IST`;
  } catch (error) {
    message.textContent = "Connection error while loading registration settings.";
  }
}

async function saveRegistrationSettings() {
  const button = document.getElementById("saveRegistrationSettingsBtn");
  const message = document.getElementById("settingsMessage");
  const deadline = document.getElementById("registrationDeadline").value;
  const enabled = document.getElementById("registrationEnabled").value === "true";
  if (!deadline) { message.textContent = "Please choose a deadline date and time."; return; }
  button.disabled = true;
  button.textContent = "Saving...";
  try {
    const result = await callApi("adminUpdateRegistrationSettings", { deadline, enabled });
    if (!result.success) {
      message.textContent = result.message || "Settings were not saved.";
      return;
    }
    message.textContent = `Saved. Registration is ${result.registrationOpen ? "OPEN" : "CLOSED"}; deadline ${formatISTInput(result.deadline).replace("T", " ")} IST.`;
    await loadPlayers();
  } catch (error) {
    message.textContent = "Connection error. Please try saving again.";
  } finally {
    button.disabled = false;
    button.textContent = "Save Registration Settings";
  }
}

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
// Payment verification toggle
// ---------------------------------------------------------
async function togglePaymentStatus(registrationId, newStatus) {
  const result = await callApi("updatePaymentStatus", { registrationId, status: newStatus });
  if (result.success) {
    const player = allPlayers.find((p) => p.registrationId === registrationId);
    if (player) player.paymentStatus = result.status;
    renderTable();
    document.getElementById("statPending").textContent = allPlayers.filter((p) => p.paymentStatus !== "Verified").length;
  } else {
    alert("Update failed: " + (result.message || "unknown error"));
  }
}
window.togglePaymentStatus = togglePaymentStatus;

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
  const headers = ["Registration ID", "Player Name", "Mobile", "Age", "Role", "Village", "T-Shirt Size", "Photo URL", "Payment Screenshot URL", "Payment Status", "Timestamp"];
  const rows = allPlayers.map((p) => [
    p.registrationId, p.playerName, p.mobile, p.age, p.role, p.village, p.tshirt, p.photoUrl, p.paymentUrl, p.paymentStatus, p.timestamp,
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
