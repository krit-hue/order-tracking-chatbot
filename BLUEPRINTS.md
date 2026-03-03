# Make.com Blueprints – Import & Setup

Use these blueprints so the chatbot gets **order status as JSON** (with `replyText` and `order`), not plain "Accepted".

**Important:** Both blueprints are set to **respond after the scenario finishes** (`instant: false`). That way Make uses the **Webhook response** modules to return JSON instead of the default "Accepted" text. After importing, reconnect OpenAI/Google and copy the new webhook URLs into `config.js`.

---

## 1. Order Tracking (SYNC – Returns Final JSON)

**File:** `Order Tracking (SYNC - Returns Final JSON).blueprint.json`  
**Use as:** Main webhook → set its URL in `config.js` as **WEBHOOK_URL**.

**Flow:** Webhook (POST) → OpenAI (extract order number) → Parse JSON → Google Sheets (Orders) → **Webhook response** with JSON.

**Google Sheet (e.g. "Orders"):**

- **Spreadsheet:** any; link it in the scenario.
- **Sheet name:** `Orders` (or update the blueprint’s sheet name).
- **Columns (with headers):** e.g. `orderNumber` (A), `customerName` (B), `status` (C), `eta` (D), `lastUpdated` (E).  
  The blueprint maps: `5.2` = col B, `5.3` = col C, `5.4` = col D, `5.5` = col E. Adjust if your columns differ.

**After import:**

1. Connect **OpenAI** and **Google** in the scenario.
2. Point the **Google Sheets** module to your Orders sheet/spreadsheet.
3. Copy the **Custom webhook** URL into `config.js` → `WEBHOOK_URL`.

---

## 2. OrderTrack_Status (polling / result URL)

**File:** `OrderTrack_Status.blueprint.json`  
**Use as:** Polling webhook → set its URL in `config.js` as **RESULT_URL** (optional; only if you use async flow).

**Flow:** Webhook (GET `?jobId=...`) → Google Sheets (Results, filter by jobId) → **Webhook response** with JSON from sheet or “Still checking…”.

**Google Sheet (e.g. "Results"):**

- **Sheet name:** `Results`.
- **Columns:** A = `jobId`, B = `updatedAt`, C = `responseJson` (full JSON string to return to the chatbot).

**After import:**

1. Connect **Google** and select the spreadsheet that has the **Results** sheet.
2. Copy the **Custom webhook** URL into `config.js` → `RESULT_URL`.

---

## Import in Make.com

1. **Scenarios** → **Create a new scenario** → **⋯** (top right) → **Import blueprint**.
2. Choose the `.blueprint.json` file.
3. Reconnect **OpenAI** / **Google** and set the correct **Spreadsheet** and **Sheet** names.
4. Copy the webhook URL(s) into `config.js`.
5. **Save** and **Run** the scenario (or turn scheduling on if needed).

The chatbot expects the webhook to respond with **HTTP 200** and **Content-Type: application/json** with a body like:

```json
{
  "processing": false,
  "found": true,
  "replyText": "Found it — here's the latest update for order 1001.",
  "order": {
    "orderNumber": "1001",
    "customerName": "John Smith",
    "status": "Shipped",
    "eta": "Mar 7, 2026",
    "lastUpdated": "Mar 3, 2026 10:18 AM"
  }
}
```

Both blueprints are set up to return this format (with the correct headers) so the site shows order status instead of "Accepted".

---

## Troubleshooting

- **500 Internal Server Error**  
  Open the scenario in Make.com → **Execution history** → failed run → find the **red (failed) module**. Fix that (reconnect OpenAI/Google, correct sheet name, or fix the mapping). The chatbot will also try polling RESULT_URL when the main webhook returns 500.

- **Chatbot shows "Accepted" or no order status**  
  In the **Custom webhook** (first module), set **Respond to webhook** to **“After the scenario is completed”** (not “Immediately”) so Make sends your JSON response instead of the default “Accepted”.
