# Fix "Variable '5.message' / '5.orderNumber' references not existing module '5'"

Your scenario fails because it references **module 5**, but in the Integration Webhooks blueprint there is **no module 5**. Use these module IDs:

| Module ID | Module name |
|-----------|-------------|
| **1** | Webhooks – Custom webhook (trigger) |
| **2** | OpenAI – Create Completion |
| **3** | JSON – Parse JSON |
| **4** | Google Sheets – Search Rows / filterRows |
| **6** | Webhook response – Found order |
| **7** | Webhook response – Order number missing |
| **8** | Webhook response – Not found |

---

## Fix 1 – OpenAI module

1. Open the **OpenAI** (Create Completion) module.
2. Find the **user** message (second message in the list).
3. In **Content** / **Text content**, set the value to:
   - **`{{1.message}}`**  
   or, to avoid errors when `message` is missing:
   - **`{{ifempty(1.message; '')}}`**
4. It must **not** be `{{5.message}}` (module 5 does not exist).
5. Save the module.

---

## Fix 2 – Google Sheets module

1. Open the **Google Sheets** (Search Rows / filterRows) module.
2. In the **Filter** (e.g. column A equals …), set the value to:
   - **`{{3.orderNumber}}`**
3. It must **not** be `{{5.orderNumber}}` (module 5 does not exist).  
   The order number comes from **module 3** (Parse JSON).
4. Save the module.

---

## After fixing

Save the scenario and run it again. The validation error should be gone.

To avoid wrong references in the future, **re-import** the latest **Integration Webhooks.blueprint.json** from this repo and reconnect your Google/OpenAI accounts.
