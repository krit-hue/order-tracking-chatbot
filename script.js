/* Order Tracking Assistant - GitHub Pages friendly (static frontend)
   - Sends chat messages to Make.com/n8n webhook
   - Renders modern chat UI + order status card
   - Saves chat history to localStorage
*/

(() => {
  const $ = (sel) => document.querySelector(sel);

  const messagesEl = $("#messages");
  const inputEl = $("#userInput");
  const sendBtn = $("#sendBtn");
  const clearBtn = $("#clearChat");
  const themeBtn = $("#themeToggle");
  const statusText = $("#statusText");

  const AVATAR_ASSIST = "assets/assistant-avatar.svg";
  const AVATAR_USER = "assets/user-avatar.svg";

  const LS_THEME = "orderbot_theme";
  const LS_CHAT = "orderbot_chat_v1";

  const cfg = window.ORDER_BOT_CONFIG || {};
  const WEBHOOK_URL = (cfg.WEBHOOK_URL || "").trim();
  const ALLOW_LOCAL_FALLBACK = cfg.ALLOW_LOCAL_FALLBACK !== false;

  let localOrders = null;

  function setStatus(text, ok = true) {
    statusText.textContent = text;
    // dot color via css variable not needed; keep simple
  }

  function timeStamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function appendMessage({ role, text, card }) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const img = document.createElement("img");
    img.src = role === "user" ? AVATAR_USER : AVATAR_ASSIST;
    img.alt = role;
    avatar.appendChild(img);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Text (supports simple line breaks)
    if (text) {
      bubble.innerHTML = escapeHtml(text);
    }

    // Optional card
    if (card) {
      bubble.appendChild(renderOrderCard(card));
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = timeStamp();
    bubble.appendChild(meta);

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    persistChat();
  }

  function renderTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg assistant";
    wrap.id = "typingRow";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const img = document.createElement("img");
    img.src = AVATAR_ASSIST;
    img.alt = "assistant";
    avatar.appendChild(img);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `
      <span class="typing" aria-label="Assistant typing">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </span>
    `;

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById("typingRow");
    if (el) el.remove();
  }

  function renderOrderCard(order) {
    const {
      orderNumber,
      status,
      customerName,
      eta,
      trackingUrl,
      lastUpdated
    } = order;

    const badgeClass =
      /delivered/i.test(status) ? "ok" :
      /cancel|lost|error/i.test(status) ? "warn" :
      "ok";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-title">
        <span>Order #${escapeHtml(String(orderNumber || ""))}</span>
        <span class="badge ${badgeClass}">${escapeHtml(status || "Unknown")}</span>
      </div>

      <div class="card-row"><span>Customer</span><strong>${escapeHtml(customerName || "—")}</strong></div>
      <div class="card-row"><span>ETA</span><strong>${escapeHtml(eta || "—")}</strong></div>
      <div class="card-row"><span>Last updated</span><strong>${escapeHtml(lastUpdated || "—")}</strong></div>

      <div class="card-actions">
        ${trackingUrl ? `<a class="btn" href="${trackingUrl}" target="_blank" rel="noopener">📦 Open tracking</a>` : ""}
        <button class="btn" type="button" data-action="copy" data-copy="${escapeHtml(String(orderNumber || ""))}">📋 Copy order #</button>
      </div>
    `;

    // hook copy
    card.querySelectorAll('[data-action="copy"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const val = btn.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(val);
          btn.textContent = "✅ Copied!";
          setTimeout(() => (btn.textContent = "📋 Copy order #"), 1200);
        } catch {
          // ignore
        }
      });
    });

    return card;
  }

  function extractOrderNumberLoose(text) {
    // Common patterns: #1234, order 1234, ORD-1234, 1234
    const m = text.match(/\b(?:order\s*#?\s*|ord[-\s]*)?([0-9]{3,10})\b/i);
    return m ? m[1] : null;
  }

  async function loadLocalOrders() {
    if (localOrders) return localOrders;
    const res = await fetch("orders.sample.json", { cache: "no-store" });
    localOrders = await res.json();
    return localOrders;
  }

  async function localLookup(orderNumber) {
    const data = await loadLocalOrders();
    const found = data.orders.find(o => String(o.orderNumber) === String(orderNumber));
    return found ? { ok: true, order: found } : { ok: false };
  }

  async function callWebhook(message) {
    // Supports both JSON POST and query param fallback.
    // Recommended: POST JSON { message: "...", sessionId: "..." }
    const sessionId = getSessionId();

    const payload = {
      message,
      sessionId
    };

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Webhook error: ${res.status}`);
    }

    // Expected response format (recommended):
    // { replyText: "...", found: true/false, order: { ... } }
    return await res.json();
  }

  function getSessionId() {
    let id = localStorage.getItem("orderbot_session");
    if (!id) {
      id = cryptoRandomId();
      localStorage.setItem("orderbot_session", id);
    }
    return id;
  }

  function cryptoRandomId() {
    // lightweight random id
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleUserMessage(text) {
    appendMessage({ role: "user", text });

    const lower = text.trim().toLowerCase();

    // Simple local "help"
    if (lower === "help" || lower === "?" || lower.includes("what can you do")) {
      appendMessage({
        role: "assistant",
        text:
`Here’s what I can do:
• Track an order: “Track order #1001”
• Natural language: “Where is my order 1002?”
• If not found, I’ll tell you how to fix it.

Try: “Track order 1001”`
      });
      return;
    }

    setStatus("Thinking…");
    renderTyping();

    try {
      // If webhook configured, use it
      if (WEBHOOK_URL && WEBHOOK_URL !== "PASTE_YOUR_WEBHOOK_URL_HERE") {
        const data = await callWebhook(text);

        removeTyping();
        setStatus("Ready");

        // Flexible handling: if backend returns a card, show it
        if (data && data.found && data.order) {
          appendMessage({
            role: "assistant",
            text: data.replyText || "Found it — here’s your latest order update:",
            card: data.order
          });
        } else {
          appendMessage({
            role: "assistant",
            text: data.replyText || "I couldn’t find that order. Double-check the number and try again."
          });
        }
        return;
      }

      // Otherwise fallback to local demo
      if (ALLOW_LOCAL_FALLBACK) {
        const num = extractOrderNumberLoose(text);
        if (!num) {
          removeTyping();
          setStatus("Ready");
          appendMessage({
            role: "assistant",
            text: "Please include an order number (example: 1001)."
          });
          return;
        }

        const result = await localLookup(num);

        removeTyping();
        setStatus("Ready");

        if (result.ok) {
          appendMessage({
            role: "assistant",
            text: "Found it — here’s your latest order update:",
            card: result.order
          });
        } else {
          appendMessage({
            role: "assistant",
            text:
`I couldn’t find order #${num}.
Try:
• Check digits (example: 1001)
• Remove extra symbols
• If this persists, contact support with your receipt email.`
          });
        }
        return;
      }

      removeTyping();
      setStatus("Ready");
      appendMessage({
        role: "assistant",
        text: "Webhook isn’t configured yet. Add your Make.com/n8n webhook URL in config.js."
      });

    } catch (err) {
      removeTyping();
      setStatus("Error");

      appendMessage({
        role: "assistant",
        text:
`Something went wrong while checking that order.
If you’re testing:
• Confirm webhook URL in config.js
• Verify Make/n8n returns JSON
• Check CORS settings on your webhook endpoint`
      });

      console.error(err);
      setTimeout(() => setStatus("Ready"), 1200);
    }
  }

  function persistChat() {
    const items = [];
    messagesEl.querySelectorAll(".msg").forEach(msg => {
      const role = msg.classList.contains("user") ? "user" : "assistant";
      const bubble = msg.querySelector(".bubble");
      // store plain text only (cards not persisted)
      const textNodes = Array.from(bubble.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent)
        .join("")
        .trim();

      if (textNodes) items.push({ role, text: textNodes });
    });
    localStorage.setItem(LS_CHAT, JSON.stringify(items.slice(-40)));
  }

  function restoreChat() {
    const raw = localStorage.getItem(LS_CHAT);
    if (!raw) return;

    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) return;

      items.forEach(it => appendMessage({ role: it.role, text: it.text }));
    } catch {
      // ignore
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(LS_THEME, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(LS_THEME);
    if (saved) return setTheme(saved);

    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }

  function seedWelcome() {
    appendMessage({
      role: "assistant",
      text:
`Hi! I can help you track an order.
Send an order number like “1001” or ask “Where is my order #1001?”`
    });
  }

  function wireUI() {
    sendBtn.addEventListener("click", () => {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";
      handleUserMessage(text);
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendBtn.click();
      }
    });

    clearBtn.addEventListener("click", () => {
      messagesEl.innerHTML = "";
      localStorage.removeItem(LS_CHAT);
      seedWelcome();
    });

    themeBtn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || "dark";
      setTheme(cur === "dark" ? "light" : "dark");
    });

    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const suggest = chip.getAttribute("data-suggest") || "";
        inputEl.value = suggest;
        inputEl.focus();
      });
    });
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    wireUI();

    // restore previous chat or show welcome
    const hasChat = localStorage.getItem(LS_CHAT);
    if (hasChat) restoreChat();
    else seedWelcome();

    setStatus("Ready");
    inputEl.focus();
  });
})();