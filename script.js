/* =========================================================
   KPL 2026 — Registration form logic
   ========================================================= */

// ⚠️ REQUIRED: paste your deployed Google Apps Script Web App URL here.
// See README.md → "Google Apps Script setup" for exact steps.
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxQF8B25Jidwf0vLDTBg1HRPSMVMa6R9nSPhHDc5tiGX5w74dhHRJd7458Qqd7RPGOF/exec";

// Registration window (IST). Public registration closes automatically after this.
const REGISTRATION_DEADLINE = new Date("2026-10-20T23:59:59+05:30");

const UPI_ID = "kunalgoregaonkar2006-1@oksbi";
const UPI_AMOUNT = "250";
const UPI_PAYEE = "KPL 2026";

// ---------------------------------------------------------
// Deadline check (client-side UX only — server enforces the real rule)
// ---------------------------------------------------------
function isRegistrationOpen() {
  return new Date() <= REGISTRATION_DEADLINE;
}

function applyDeadlineState() {
  const formCard = document.getElementById("formCard");
  const closedBanner = document.getElementById("closedBanner");
  if (!isRegistrationOpen()) {
    formCard.style.display = "none";
    closedBanner.style.display = "flex";
  }
}

// ---------------------------------------------------------
// Payment QR code (UPI deep link rendered as a QR image)
// ---------------------------------------------------------
function renderQr() {
  const upiUri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE)}&am=${UPI_AMOUNT}&cu=INR&tn=${encodeURIComponent("KPL 2026 Registration")}`;
  const qrImg = document.getElementById("qrImg");
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=${encodeURIComponent(upiUri)}`;
  document.getElementById("upiIdText").textContent = UPI_ID;
}

document.getElementById("copyUpiBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(UPI_ID).then(() => {
    const btn = document.getElementById("copyUpiBtn");
    const original = btn.textContent;
    btn.textContent = "कॉपी झाले ✓";
    setTimeout(() => (btn.textContent = original), 1500);
  });
});

// ---------------------------------------------------------
// Stepper navigation
// ---------------------------------------------------------
let currentStep = 1;

function showStep(step) {
  document.querySelectorAll(".form-step").forEach((el) => {
    el.style.display = Number(el.dataset.step) === step ? "block" : "none";
  });
  document.querySelectorAll(".step").forEach((el) => {
    const s = Number(el.dataset.step);
    el.classList.toggle("active", s === step);
    el.classList.toggle("done", s < step);
  });
  currentStep = step;
  document.getElementById("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("toStep2").addEventListener("click", () => {
  if (validateStep1()) showStep(2);
});
document.getElementById("backTo1").addEventListener("click", () => showStep(1));
document.getElementById("toStep3").addEventListener("click", () => showStep(3));
document.getElementById("backTo2").addEventListener("click", () => showStep(2));

// ---------------------------------------------------------
// Role selector styling
// ---------------------------------------------------------
document.querySelectorAll(".role-option").forEach((label) => {
  label.addEventListener("click", () => {
    document.querySelectorAll(".role-option").forEach((l) => l.classList.remove("selected"));
    label.classList.add("selected");
  });
});

// ---------------------------------------------------------
// File upload previews (also converts to base64 for submission)
// ---------------------------------------------------------
const fileData = { photo: null, payment: null };

function wireUpload(inputId, boxId, previewId, key) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  const preview = document.getElementById(previewId);

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFieldError(key === "photo" ? "photo" : "payment", "फाईलचा आकार 5MB पेक्षा कमी असावा.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      fileData[key] = {
        base64: e.target.result.split(",")[1],
        mimeType: file.type,
        fileName: file.name,
      };
      preview.querySelector("img").src = e.target.result;
      preview.style.display = "block";
      box.classList.add("has-file");
      clearFieldError(key === "photo" ? "photo" : "payment");
    };
    reader.readAsDataURL(file);
  });
}

wireUpload("photoInput", "photoBox", "photoPreview", "photo");
wireUpload("paymentInput", "paymentBox", "paymentPreview", "payment");

// ---------------------------------------------------------
// Validation
// ---------------------------------------------------------
function showFieldError(fieldName, message) {
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (!field) return;
  field.classList.add("invalid");
  if (message) field.querySelector(".field-error").textContent = message;
}

function clearFieldError(fieldName) {
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (field) field.classList.remove("invalid");
}

function clearAllErrors() {
  document.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
  document.getElementById("formError").style.display = "none";
}

function getFormValues() {
  const form = document.getElementById("regForm");
  const role = form.querySelector('input[name="role"]:checked');
  return {
    playerName: form.playerName.value.trim(),
    mobile: form.mobile.value.trim(),
    age: form.age.value.trim(),
    role: role ? role.value : "",
    village: form.village.value.trim(),
    tshirt: form.tshirt.value,
  };
}

function validateStep1() {
  clearAllErrors();
  const v = getFormValues();
  let valid = true;

  if (!v.playerName || v.playerName.length < 3) {
    showFieldError("playerName");
    valid = false;
  }
  if (!/^[6-9]\d{9}$/.test(v.mobile)) {
    showFieldError("mobile");
    valid = false;
  }
  const ageNum = Number(v.age);
  if (!v.age || isNaN(ageNum) || ageNum < 8 || ageNum > 65) {
    showFieldError("age");
    valid = false;
  }
  if (!v.role) {
    showFieldError("role");
    valid = false;
  }
  if (!v.village) {
    showFieldError("village");
    valid = false;
  }
  if (!v.tshirt) {
    showFieldError("tshirt");
    valid = false;
  }
  return valid;
}

function validateStep3() {
  let valid = true;
  if (!fileData.photo) {
    showFieldError("photo");
    valid = false;
  }
  if (!fileData.payment) {
    showFieldError("payment");
    valid = false;
  }
  return valid;
}

// ---------------------------------------------------------
// Submission
// ---------------------------------------------------------
document.getElementById("regForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!isRegistrationOpen()) {
    applyDeadlineState();
    return;
  }
  if (!validateStep1() || !validateStep3()) {
    if (!validateStep1()) showStep(1);
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  const submitLabel = document.getElementById("submitLabel");
  submitBtn.disabled = true;
  submitLabel.innerHTML = 'पाठवत आहे... <span class="spinner"></span>';

  const values = getFormValues();
  const payload = {
    action: "register",
    playerName: values.playerName,
    mobile: values.mobile,
    age: values.age,
    role: values.role,
    village: values.village,
    tshirt: values.tshirt,
    photo: fileData.photo,
    payment: fileData.payment,
  };

  try {
    // NOTE: Content-Type is text/plain on purpose — this avoids a CORS
    // preflight request, which Google Apps Script Web Apps do not handle.
    // Code.gs parses e.postData.contents as JSON regardless of this header.
    const res = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!result.success) {
      if (result.code === "DUPLICATE_MOBILE") {
        document.getElementById("formError").style.display = "flex";
        document.getElementById("formError").textContent =
          "हा मोबाईल नंबर आधीच नोंदणीकृत आहे. एका नंबरने एकच नोंदणी करता येते.";
        showStep(1);
      } else if (result.code === "REGISTRATION_CLOSED") {
        applyDeadlineState();
      } else {
        document.getElementById("formError").style.display = "flex";
        document.getElementById("formError").textContent =
          result.message || "काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.";
      }
      submitBtn.disabled = false;
      submitLabel.textContent = "नोंदणी सबमिट करा";
      return;
    }

    // Success
    document.getElementById("regForm").closest(".card").style.display = "none";
    document.getElementById("closedBanner").style.display = "none";
    document.getElementById("successRegId").textContent = result.registrationId;
    document.getElementById("successName").textContent = values.playerName;
    document.getElementById("successCard").style.display = "block";
    document.getElementById("successCard").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    document.getElementById("formError").style.display = "flex";
    document.getElementById("formError").textContent =
      "इंटरनेट कनेक्शन तपासा किंवा नंतर पुन्हा प्रयत्न करा.";
    submitBtn.disabled = false;
    submitLabel.textContent = "नोंदणी सबमिट करा";
  }
});

// ---------------------------------------------------------
// Registration counter (optional live count on hero)
// ---------------------------------------------------------
async function loadCount() {
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "publicCount" }),
    });
    const result = await res.json();
    if (result.success) {
      document.getElementById("heroCount").textContent = result.count;
    }
  } catch (err) {
    document.getElementById("heroCount").textContent = "—";
  }
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
applyDeadlineState();
renderQr();
if (isRegistrationOpen()) loadCount();
