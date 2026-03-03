/**
 * IMPORTANT:
 * - Do NOT put OpenAI keys in GitHub Pages.
 * - Put your Make.com or n8n webhook URL(s) here.
 *
 * This chatbot supports an optional async pattern:
 *   1) WEBHOOK_URL returns quickly with { processing: true, replyText: "..." }
 *   2) RESULT_URL is polled with { sessionId } until it returns the final JSON.
 */
window.ORDER_BOT_CONFIG = {
  // 1) Your "process request" webhook (Make.com / n8n)
  WEBHOOK_URL: "https://hook.us2.make.com/xjehs9oupt992pvcva2v5rq1xhj161xs",

  // 2) Optional: your "get result" webhook that returns the FINAL JSON for this sessionId.
  // If you don't use async, you can leave this empty.
  // RESULT_URL: "https://hook.us2.make.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  RESULT_URL: "",

  // Poll settings (used only when RESULT_URL is set and backend replies with processing=true)
  POLL_INTERVAL_MS: 2000,
  POLL_TIMEOUT_MS: 30000,

  // Set true to allow local demo lookup using orders.sample.json when webhook is empty/unavailable
  ALLOW_LOCAL_FALLBACK: true
};
