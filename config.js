window.ORDER_BOT_CONFIG = {
  // Order Tracking (SYNC) – main webhook: POST message + sessionId, returns JSON with replyText/order
  WEBHOOK_URL: "https://hook.us2.make.com/4a85s5hud5v76m4u5jm2eswqwiaqiqky",

  // OrderTrack_Status – polling webhook: GET ?jobId=<sessionId>, returns JSON when result is ready
  RESULT_URL: "https://hook.us2.make.com/q7gk47n2dxc6dmzamiiyeocoalermfg2",

  POLL_INTERVAL_MS: 1500,
  POLL_TIMEOUT_MS: 25000,

  ALLOW_LOCAL_FALLBACK: false
};
