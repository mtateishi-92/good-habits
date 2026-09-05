/* ==========================================================================
   Good-Habits — 通知まわり
   ・30分間無操作リマインダー（plan.md「通知」節）
   ・OS通知が使えない/許可されない環境では、アプリ内トースト表示にフォールバックする
   ========================================================================== */

window.GH_NOTIFY = (function () {
  var IDLE_MS = 30 * 60 * 1000; // 30分
  var CHECK_INTERVAL_MS = 30 * 1000; // 30秒ごとにチェック

  var lastInteraction = Date.now();
  var timerId = null;
  var getStateFn = null;
  var onIdleFn = null;

  function isSupported() {
    return typeof Notification !== "undefined";
  }

  function permission() {
    return isSupported() ? Notification.permission : "unsupported";
  }

  function requestPermission() {
    if (!isSupported()) return Promise.resolve("unsupported");
    return Notification.requestPermission();
  }

  function markInteraction() {
    lastInteraction = Date.now();
  }

  function fireSystemNotification(title, body) {
    if (isSupported() && Notification.permission === "granted") {
      try {
        new Notification(title, { body: body, icon: "icons/icon-192.png" });
      } catch (e) {
        // 一部モバイルブラウザは new Notification() 非対応（Service Worker経由が必要）。
        // その場合はアプリ内トーストのみで代替する。
      }
    }
  }

  function tick() {
    var state = getStateFn ? getStateFn() : null;
    if (!state || !state.settings.notifyInactivity) return;
    var elapsed = Date.now() - lastInteraction;
    if (elapsed >= IDLE_MS) {
      var message = "そろそろ習慣化に取り組みませんか？";
      fireSystemNotification("Good-Habits", message);
      if (onIdleFn) onIdleFn(message);
      // 連続で毎回鳴らさないよう、ここでタイマーを仕切り直す
      lastInteraction = Date.now();
    }
  }

  function init(options) {
    getStateFn = options.getState;
    onIdleFn = options.onIdle;
    markInteraction();
    ["pointerdown", "keydown", "touchstart"].forEach(function (evt) {
      document.addEventListener(evt, markInteraction, { passive: true });
    });
    if (timerId) clearInterval(timerId);
    timerId = setInterval(tick, CHECK_INTERVAL_MS);
  }

  return {
    init: init,
    isSupported: isSupported,
    permission: permission,
    requestPermission: requestPermission,
    markInteraction: markInteraction
  };
})();
