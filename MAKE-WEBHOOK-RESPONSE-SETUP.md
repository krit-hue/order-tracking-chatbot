# How to get JSON instead of "Accepted" from your Make.com webhook

Your scenario has **Webhook response** modules that return JSON, but the webhook still sends the default **"Accepted"** text. You need to tell Make to **respond after the scenario finishes**, not immediately.

---

## Step 1 – Open the scenario

In Make.com go to **Scenarios** and open **Integration Webhooks** (or the scenario that uses your order-tracking webhook).

---

## Step 2 – Open the Custom webhook module

Click the **first module** in the flow (the one that shows the webhook URL).  
Its name is something like **"Webhooks"** or **"Custom webhook"**.

![Where to click](assets/make-com-webhook-response-setting-guide.png)

---

## Step 3 – Find the response setting

In the **right-hand panel** that opens:

1. Scroll down.
2. Look for **"Options"**, **"Advanced settings"**, or **"Show advanced settings"** and expand it if needed.
3. Look for one of these:
   - **"Respond to webhook"** (dropdown)
   - **"Response"** or **"Webhook response"**
   - A checkbox like **"Respond immediately"**

---

## Step 4 – Change it

- If there’s a **dropdown**:
  - Change from **"Immediately"** to **"When the scenario is completed"** (or **"After the scenario is successfully completed"** / **"Respond with data"** — wording can vary).
- If there’s a **checkbox** **"Respond immediately"**:
  - **Uncheck** it so the response comes from your **Webhook response** modules at the end of the scenario.

---

## Step 5 – Save and test

1. Click **OK** or **Save** on the module.
2. Save the scenario.
3. Send a test POST again; the body should be your JSON (with `replyText` and `order`), not `"Accepted"`.

---

*If you don’t see any of these options, they may be under the **scenario** settings (gear icon or scenario name at the top), or depend on your Make.com plan. In that case, ask in the [Make Community](https://community.make.com) or contact Make.com support.*
