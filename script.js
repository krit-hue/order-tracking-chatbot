/* Order Tracking Assistant - GitHub Pages friendly */
(() => {
  const $ = (sel) => document.querySelector(sel);

  const messagesEl = $("#messages");
  const inputEl = $("#userInput");
  const sendBtn = $("#sendBtn");
  const clearBtn = $("#clearChat");
  const themeBtn = $("#themeToggle");
  const statusText = $("#statusText");

  const cfg = window.ORDER_BOT_CONFIG || {};
  const WEBHOOK_URL = (cfg.WEBHOOK_URL || "").trim();
  const RESULT_URL = (cfg.RESULT_URL || "").trim(); // optional polling endpoint
  const ALLOW_LOCAL_FALLBACK = cfg.ALLOW_LOCAL_FALLBACK !== false;

  const POLL_INTERVAL_MS = Number(cfg.POLL_INTERVAL_MS || 1500);
  const POLL_TIMEOUT_MS = Number(cfg.POLL_TIMEOUT_MS || 25000);

  let localOrders = null;

  function setStatus(text) {
    if (statusText) statusText.textContent = text;
  }

  function timeStamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ✅ FIX: proper escaping
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function appendMessage({ role, text }) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerHTML = role === "user" ? "👤" : "🤖";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = escapeHtml(text || "").replace(/\n/g, "<br/>");

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = timeStamp();
    bubble.appendChild(meta);

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg assistant";
    wrap.id = "typingRow";
    wrap.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="bubble"><span class="typing">…</span></div>
    `;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById("typingRow");
    if (el) el.remove();
  }

  function getSessionId() {
    let id = localStorage.getItem("orderbot_session");
    if (!id) {
      const arr = new Uint8Array(12);
      crypto.getRandomValues(arr);
      id = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("orderbot_session", id);
    }
    return id;
  }

  async function fetchJsonOrText(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) return await res.json();
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { replyText: txt }; }
  }

  async function callWebhook(message) {
    const sessionId = getSessionId();
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId })
    });
    if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
    return await fetchJsonOrText(res);
  }

  // ✅ Poll RESULT_URL?jobId=<sessionId> until processing:false
  async function pollFinal(sessionId) {
    if (!RESULT_URL) return null;

    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      const url = new URL(RESULT_URL);
      url.searchParams.set("jobId", sessionId);

      const res = await fetch(url.toString(), { method: "GET" });
      if (res.ok) {
        const data = await fetchJsonOrText(res);
        if (data && data.processing === false) return data;
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
    return null;
  }

  async function handleUserMessage(text) {
    appendMessage({ role: "user", text });

    setStatus("Thinking…");
    renderTyping();

    try {
      if (WEBHOOK_URL && WEBHOOK_URL !== "PASTE_YOUR_WEBHOOK_URL_HERE") {
        const sessionId = getSessionId();
        const data = await callWebhook(text);

        // Special case: Make.com default plain-text "Accepted" ack
        const isAcceptedAck =
          data &&
          typeof data.replyText === "string" &&
          data.replyText.trim().toLowerCase() === "accepted";

        if (isAcceptedAck && RESULT_URL) {
          removeTyping();
          setStatus("Fetching final update…");
          const finalData = await pollFinal(sessionId);
          setStatus("Ready");

          if (finalData?.replyText) {
            appendMessage({ role: "assistant", text: finalData.replyText });
          } else {
            appendMessage({ role: "assistant", text: "Still working on it — try again in a moment." });
          }
          return;
        }

        removeTyping();
        setStatus("Ready");

        // Always show replyText if present
        if (data?.replyText) appendMessage({ role: "assistant", text: data.replyText });
        else appendMessage({ role: "assistant", text: "Received response, but no replyText." });

        // If async processing, poll for final result
        if (data?.processing === true) {
          if (!RESULT_URL) {
            appendMessage({
              role: "assistant",
              text: "RESULT_URL is not set in config.js, so I can’t fetch the final status yet."
            });
            return;
          }

          setStatus("Fetching final update…");
          const finalData = await pollFinal(sessionId);
          setStatus("Ready");

          if (finalData?.replyText) {
            appendMessage({ role: "assistant", text: finalData.replyText });
          } else {
            appendMessage({ role: "assistant", text: "Still working on it — try again in a moment." });
          }
        }

        return;
      }

      removeTyping();
      setStatus("Ready");
      appendMessage({ role: "assistant", text: "Webhook isn’t configured yet. Add your Make.com webhook URL in config.js." });
    } catch (err) {
      removeTyping();
      setStatus("Error");
      appendMessage({
        role: "assistant",
        text:
`Something went wrong while checking that order.
• Confirm webhook URL in config.js
• Verify Make returns JSON
• Check CORS`
      });
      console.error(err);
      setTimeout(() => setStatus("Ready"), 1200);
    }
  }

  function wireUI() {
    if (!sendBtn || !inputEl) {
      console.error("Missing #sendBtn or #userInput in HTML.");
      return;
    }

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

    clearBtn?.addEventListener("click", () => {
      messagesEl.innerHTML = "";
      appendMessage({ role: "assistant", text: "Chat cleared. Ask about an order number (e.g., 1001)." });
    });

    themeBtn?.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || "dark";
      document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
    });

    // Quick-action chips: put suggestion in input and send
    document.querySelectorAll(".chip[data-suggest]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = (chip.getAttribute("data-suggest") || "").trim();
        if (text) {
          inputEl.value = text;
          sendBtn.click();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireUI();
    setStatus("Ready");
    inputEl?.focus();
  });
})();
