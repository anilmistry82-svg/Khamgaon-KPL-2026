# खामगांव प्रीमियर लीग 2026 (KPL 2026) — Player Registration System

A free, production-ready player registration system:

- **Frontend:** GitHub Pages (`index.html`, `admin.html`, `style.css`, `script.js`, `admin.js`)
- **Backend:** Google Apps Script Web App (`Code.gs`)
- **Database:** Google Sheets
- **File storage:** Google Drive

No paid hosting, no credit card required.

This README is the exact list of steps needed to make the site live and connected to a real database. I cannot create your Google Sheet, Apps Script project, or push to your GitHub account for you — those require your own Google/GitHub login — but every step below is copy-paste.

---

## Step 1 — Create the Google Sheet (your database)

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. Rename it `KPL 2026 Registrations`.
3. Go to **Extensions → Apps Script**.
4. Delete the placeholder code in `Code.gs`, then paste in the entire contents of the `Code.gs` file from this project.
5. Click **Save** (disk icon). Name the project `KPL 2026 Backend`.

## Step 2 — Create the Google Drive upload folder

1. Go to [drive.google.com](https://drive.google.com) → **New → Folder**.
2. Name it `KPL 2026 Uploads`.
3. Open the folder and copy the ID from the URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART_IS_THE_FOLDER_ID`**

## Step 3 — Set script properties (this is where secrets live, NOT in the public code)

In the Apps Script editor:

1. Click the **⚙ Project Settings** icon (left sidebar).
2. Scroll to **Script Properties → Add script property**, and add both of these:

   | Property        | Value                              |
   |-----------------|-------------------------------------|
   | `ADMIN_PASSWORD`| `kpl@2026`                          |
   | `DRIVE_FOLDER_ID`| *(the folder ID from Step 2)*      |

3. Click **Save script properties**.

> Keeping the admin password here (instead of inside `Code.gs` or the HTML) means it is never uploaded to your public GitHub repository, and it's checked on the server, not in the browser.

## Step 4 — Deploy the Apps Script as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - Description: `KPL 2026 v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. The first time, Google will ask you to authorize the script — click **Authorize access**, choose your Google account, click **Advanced → Go to KPL 2026 Backend (unsafe)** (this warning appears because the script isn't published/verified by Google, which is normal and safe for your own script), then **Allow**.
6. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

Keep this tab open — you'll need to redeploy (Deploy → Manage deployments → ✏️ → New version) any time you edit `Code.gs`.

## Step 5 — Connect the frontend to the backend

In this project folder, open **both** of these files and replace the placeholder:

- `script.js` → line near the top:
  ```js
  const GAS_WEB_APP_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
  ```
- `admin.js` → line near the top:
  ```js
  const GAS_WEB_APP_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
  ```

Paste the exact Web app URL from Step 4 into both (in quotes).

## Step 6 — Push to your GitHub repository and enable Pages

Run these commands from inside this project folder (replace nothing else — this repo URL is already yours):

```bash
git init
git remote add origin https://github.com/anilmistry82-svg/Khamgaon-KPL-2026.git
git add .
git commit -m "KPL 2026 player registration system"
git branch -M main
git push -u origin main
```

Then on GitHub:

1. Open **https://github.com/anilmistry82-svg/Khamgaon-KPL-2026**
2. Go to **Settings → Pages**.
3. Under "Build and deployment" → Source: **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)` → **Save**.
5. Wait 1–2 minutes. Your live site will be at:

   **https://anilmistry82-svg.github.io/Khamgaon-KPL-2026/**

   (If GitHub shows a different Pages URL on the Settings page, use that exact URL — it is authoritative.)

Admin dashboard will be at:
**https://anilmistry82-svg.github.io/Khamgaon-KPL-2026/admin.html**

---

## Testing checklist (please run these yourself after deploying)

I've written and validated all the code, but I don't have access to your Google account or GitHub account, so I can't run these final checks for you. Please go through them in order:

1. Open the live registration page — form should load.
2. Fill in all player fields and go to the payment step — QR code and UPI ID should display.
3. Upload a player photo — preview should appear.
4. Upload a payment screenshot — preview should appear.
5. Submit — you should see "Registration Successful" with a Registration ID like `KPL2026-0001`.
6. Open your Google Sheet — a new row should appear with all fields filled in.
7. Open your Google Drive folder — the photo and payment screenshot should appear as two new files.
8. Try registering again with the **same mobile number** — you should see the duplicate-mobile error.
9. Open the admin page, log in with `kpl@2026` — the player you just added should be visible, searchable, and filterable.
10. Try Delete on a test entry — it should disappear from both the dashboard and the Google Sheet.
11. To test the closing date without waiting until October: temporarily edit the `REGISTRATION_DEADLINE` line in both `Code.gs` (redeploy after editing) and `script.js` to a past date, confirm the "Player Registration is Closed" message appears, then change it back to `2026-10-20T23:59:59+05:30`.
12. Open the site on a phone to confirm the mobile layout.

If any step doesn't behave as described, the most common cause is the Web App URL not being pasted correctly in `script.js`/`admin.js`, or the deployment still using an old version (use **Manage deployments → Edit → New version** after any `Code.gs` change).

---

## Summary

| Item | Value |
|---|---|
| GitHub repository | https://github.com/anilmistry82-svg/Khamgaon-KPL-2026 |
| Live website URL | https://anilmistry82-svg.github.io/Khamgaon-KPL-2026/ (confirm on your Pages settings) |
| Admin URL | https://anilmistry82-svg.github.io/Khamgaon-KPL-2026/admin.html |
| Admin password | `kpl@2026` (stored server-side as a Script Property, not in the code) |
| Google Apps Script URL | *(yours after Step 4 — paste into script.js and admin.js)* |
| Registration fee | ₹250 |
| UPI ID | kunalgoregaonkar2006-1@oksbi |
| Registration closes | 20 October 2026, 23:59 IST (enforced both in the browser and on the server) |

## Files in this project

- `index.html` — public registration page
- `admin.html` — admin dashboard page
- `style.css` — shared styling for both pages
- `script.js` — registration form logic, validation, QR code, submission
- `admin.js` — admin login, player table, search/filter, delete, CSV export
- `Code.gs` — Google Apps Script backend (paste into your Sheet's Apps Script editor)
- `README.md` — this file
