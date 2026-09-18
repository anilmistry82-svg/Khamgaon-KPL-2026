/**
 * =========================================================
 * KPL 2026 — Khamgaon Premier League
 * Google Apps Script backend
 * =========================================================
 *
 * This script is the ONLY backend for the registration site.
 * It stores registrations in a Google Sheet ("Players" tab)
 * and uploaded files in a Google Drive folder.
 *
 * SETUP — do this once before deploying (full steps in README.md):
 *   1. Create a new Google Sheet. Open it, then
 *      Extensions → Apps Script, and paste this file in as Code.gs.
 *   2. Create a Google Drive folder for uploads and copy its folder ID
 *      (the long string in the folder's URL).
 *   3. In the Apps Script editor: Project Settings → Script Properties
 *      → add these two properties:
 *         ADMIN_PASSWORD   = kpl@2026
 *         DRIVE_FOLDER_ID  = <your folder ID>
 *      (Keeping the password here, not in this file, means it is never
 *      committed to your public GitHub repository.)
 *   4. Deploy → New deployment → type "Web app" →
 *         Execute as: Me
 *         Who has access: Anyone
 *      Copy the Web App URL into script.js and admin.js
 *      (GAS_WEB_APP_URL constant).
 */

const SHEET_NAME = "Players";
const SHEET_HEADERS = [
  "Timestamp", "Registration ID", "Player Name", "Mobile", "Age",
  "Playing Role", "Village", "T-Shirt Size", "Photo URL", "Payment Screenshot URL",
];

// Public registration closes automatically after this moment (IST).
const REGISTRATION_DEADLINE = new Date("2026-10-20T23:59:59+05:30");

const SESSION_DURATION_SECONDS = 6 * 60 * 60; // 6 hours

// ---------------------------------------------------------
// Entry point
// ---------------------------------------------------------
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, message: "Invalid request." });
  }

  const action = body.action;

  try {
    switch (action) {
      case "register":
        return jsonResponse(handleRegister(body));
      case "publicCount":
        return jsonResponse(handlePublicCount());
      case "adminLogin":
        return jsonResponse(handleAdminLogin(body));
      case "listPlayers":
        return jsonResponse(handleListPlayers(body));
      case "deletePlayer":
        return jsonResponse(handleDeletePlayer(body));
      default:
        return jsonResponse({ success: false, message: "Unknown action." });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: "Server error: " + err.message });
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    "KPL 2026 backend is running. This endpoint accepts POST requests only."
  );
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ---------------------------------------------------------
// Sheet / Drive helpers
// ---------------------------------------------------------
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getUploadFolder() {
  const folderId = PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID");
  if (!folderId) throw new Error("DRIVE_FOLDER_ID script property is not set.");
  return DriveApp.getFolderById(folderId);
}

function saveFileToDrive(fileObj, prefix) {
  if (!fileObj || !fileObj.base64) return "";
  const blob = Utilities.newBlob(
    Utilities.base64Decode(fileObj.base64),
    fileObj.mimeType || "image/jpeg",
    `${prefix}-${fileObj.fileName || "file"}`
  );
  const file = getUploadFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
}

// ---------------------------------------------------------
// Registration
// ---------------------------------------------------------
function handleRegister(body) {
  if (new Date() > REGISTRATION_DEADLINE) {
    return { success: false, code: "REGISTRATION_CLOSED", message: "Player Registration is Closed" };
  }

  // --- server-side validation (never trust the browser alone) ---
  const errors = [];
  const playerName = String(body.playerName || "").trim();
  const mobile = String(body.mobile || "").trim();
  const age = Number(body.age);
  const role = String(body.role || "").trim();
  const village = String(body.village || "").trim();
  const tshirt = String(body.tshirt || "").trim();
  const validRoles = ["Batsman", "Bowler", "All Rounder", "Wicket Keeper", "Fielder"];

  if (playerName.length < 3) errors.push("Invalid player name");
  if (!/^[6-9]\d{9}$/.test(mobile)) errors.push("Invalid mobile number");
  if (isNaN(age) || age < 8 || age > 65) errors.push("Invalid age");
  if (validRoles.indexOf(role) === -1) errors.push("Invalid playing role");
  if (!village) errors.push("Village required");
  if (!tshirt) errors.push("T-shirt size required");
  if (!body.photo || !body.photo.base64) errors.push("Player photo required");
  if (!body.payment || !body.payment.base64) errors.push("Payment screenshot required");

  if (errors.length) {
    return { success: false, message: errors.join(", ") };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    // Duplicate mobile check
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][3]) === mobile) {
        return { success: false, code: "DUPLICATE_MOBILE", message: "Mobile number already registered." };
      }
    }

    const registrationId = "KPL2026-" + String(data.length).padStart(4, "0");
    const photoUrl = saveFileToDrive(body.photo, registrationId + "-photo");
    const paymentUrl = saveFileToDrive(body.payment, registrationId + "-payment");
    const timestamp = new Date();

    sheet.appendRow([
      timestamp, registrationId, playerName, mobile, age,
      role, village, tshirt, photoUrl, paymentUrl,
    ]);

    return {
      success: true,
      registrationId: registrationId,
      timestamp: timestamp.toISOString(),
    };
  } finally {
    lock.releaseLock();
  }
}

function handlePublicCount() {
  const sheet = getSheet();
  const count = Math.max(sheet.getLastRow() - 1, 0);
  return { success: true, count: count };
}

// ---------------------------------------------------------
// Admin auth
// ---------------------------------------------------------
function handleAdminLogin(body) {
  const stored = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  if (!stored) {
    return { success: false, message: "Admin password not configured on server." };
  }
  if (String(body.password) !== stored) {
    return { success: false, message: "Incorrect password." };
  }
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("admin_session_" + token, "valid", SESSION_DURATION_SECONDS);
  return { success: true, token: token };
}

function isAuthorized(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get("admin_session_" + token) === "valid";
}

// ---------------------------------------------------------
// Admin actions (all require a valid session token)
// ---------------------------------------------------------
function handleListPlayers(body) {
  if (!isAuthorized(body.token)) {
    return { success: false, code: "UNAUTHORIZED", message: "Please log in again." };
  }
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const players = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    players.push({
      timestamp: row[0] instanceof Date ? row[0].toISOString() : row[0],
      registrationId: row[1],
      playerName: row[2],
      mobile: row[3],
      age: row[4],
      role: row[5],
      village: row[6],
      tshirt: row[7],
      photoUrl: row[8],
      paymentUrl: row[9],
    });
  }
  return {
    success: true,
    players: players,
    registrationOpen: new Date() <= REGISTRATION_DEADLINE,
  };
}

function handleDeletePlayer(body) {
  if (!isAuthorized(body.token)) {
    return { success: false, code: "UNAUTHORIZED", message: "Please log in again." };
  }
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === body.registrationId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Registration ID not found." };
}
