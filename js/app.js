/* ==========================================================================
   Good-Habbit — アプリの起動・画面遷移・イベント配線
   ========================================================================== */

(function () {
  var STORAGE = window.GH_STORAGE;
  var CONTENT = window.GH_CONTENT;
  var LOGIC = window.GH_LOGIC;
  var UI = window.GH_UI;
  var NOTIFY = window.GH_NOTIFY;
  var el = UI.el;

  var state = STORAGE.load();
  var currentMessage = null;
  var selectedBadgeId = null;
  var heatmapYear, heatmapMonth;

  function persist() { STORAGE.save(state); }

  function goTo(name) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var target = el("screen-" + name);
    if (!target) return;
    target.classList.add("active");

    if (name === "home") UI.renderHome(state, currentMessage);
    if (name === "add") UI.resetAddScreen();
    if (name === "badges") UI.renderBadges(state);
    if (name === "badge-detail" && selectedBadgeId) UI.renderBadgeDetail(state, selectedBadgeId);
    if (name === "heatmap") UI.renderHeatmap(state, heatmapYear, heatmapMonth);
    if (name === "settings") UI.renderSettings(state);
  }

  function initHeatmapDate() {
    var d = new Date();
    heatmapYear = d.getFullYear();
    heatmapMonth = d.getMonth();
  }

  // ---- クリックイベントの一括委譲 -------------------------------------------

  document.addEventListener("click", function (e) {
    var navBtn = e.target.closest("[data-nav-target]");
    if (navBtn) { goTo(navBtn.getAttribute("data-nav-target")); return; }

    var removeBtn = e.target.closest('[data-action="remove-habit"]');
    if (removeBtn) {
      var rid = Number(removeBtn.getAttribute("data-habit-id"));
      var habit = state.habits.filter(function (h) { return h.id === rid; })[0];
      var ok = window.confirm('「' + (habit ? habit.name : "この習慣") + '」の記録を削除します。よろしいですか？');
      if (ok) {
        LOGIC.removeHabit(state, rid);
        persist();
        UI.renderHome(state, currentMessage);
      }
      return;
    }

    var toggleBtn = e.target.closest('[data-action="toggle-habit"]');
    if (toggleBtn) {
      var hid = Number(toggleBtn.getAttribute("data-habit-id"));
      var result = LOGIC.toggleHabitDone(state, hid, new Date());
      if (result.changed) {
        persist();
        UI.renderHome(state, currentMessage);
        if (result.achieved) {
          UI.showCelebration(result.achieved, result.newlyEarnedBadges);
        } else if (result.done) {
          UI.showToast(CONTENT.randomPraise());
        }
      }
      return;
    }

    var catBtn = e.target.closest("[data-category]");
    if (catBtn) {
      UI.setAddSelectedCategory(catBtn.getAttribute("data-category"));
      UI.renderAddOptions();
      UI.updateAddSubmitState();
      return;
    }

    var badgeTile = e.target.closest("[data-badge-id]");
    if (badgeTile) {
      selectedBadgeId = badgeTile.getAttribute("data-badge-id");
      goTo("badge-detail");
      return;
    }

    var themeChoice = e.target.closest("[data-theme-choice]");
    if (themeChoice) {
      state.settings.theme = themeChoice.getAttribute("data-theme-choice");
      persist();
      UI.applyTheme(state.settings.theme);
      UI.renderSettings(state);
      return;
    }

    var hourChoice = e.target.closest("[data-reset-hour]");
    if (hourChoice) {
      state.settings.resetHour = Number(hourChoice.getAttribute("data-reset-hour"));
      persist();
      UI.renderSettings(state);
      return;
    }

    var toggleKey = e.target.closest("[data-toggle-key]");
    if (toggleKey) {
      var key = toggleKey.getAttribute("data-toggle-key");
      state.settings[key] = !state.settings[key];
      persist();
      UI.renderSettings(state);
      if (key === "notifyInactivity" && state.settings[key] && NOTIFY.isSupported() && NOTIFY.permission() === "default") {
        NOTIFY.requestPermission();
      }
      return;
    }
  });

  // ---- 個別要素のイベント ----------------------------------------------------

  el("fab-add").addEventListener("click", function () { goTo("add"); });
  el("add-back").addEventListener("click", function () { goTo("home"); });
  el("add-name-input").addEventListener("input", UI.updateAddSubmitState);
  el("add-submit").addEventListener("click", function () {
    var name = el("add-name-input").value.trim();
    var cat = UI.getAddSelectedCategory();
    if (!name || !cat) return;
    LOGIC.addHabit(state, name, cat);
    persist();
    goTo("home");
  });

  el("badge-detail-back").addEventListener("click", function () { goTo("badges"); });

  el("month-prev").addEventListener("click", function () {
    heatmapMonth--;
    if (heatmapMonth < 0) { heatmapMonth = 11; heatmapYear--; }
    UI.renderHeatmap(state, heatmapYear, heatmapMonth);
  });
  el("month-next").addEventListener("click", function () {
    heatmapMonth++;
    if (heatmapMonth > 11) { heatmapMonth = 0; heatmapYear++; }
    UI.renderHeatmap(state, heatmapYear, heatmapMonth);
  });

  el("skipped-banner-close").addEventListener("click", function () {
    state.meta.skippedBannerPending = false;
    persist();
    UI.renderHome(state, currentMessage);
  });

  el("celebration-close").addEventListener("click", UI.hideCelebration);
  el("celebration-view-badges").addEventListener("click", function () {
    UI.hideCelebration();
    goTo("badges");
  });

  // ---- Service Worker（オフライン対応・ホーム画面追加） -------------------------

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function (err) {
          console.warn("Good-Habbit: Service Workerの登録に失敗しました。", err);
        });
      });
    }
  }

  // ---- 起動 -------------------------------------------------------------------

  function boot() {
    UI.initNavbars();
    UI.applyTheme(state.settings.theme);
    initHeatmapDate();

    LOGIC.runRollover(state, new Date());
    currentMessage = CONTENT.randomMessage();
    persist();

    goTo("home");
    NOTIFY.init({
      getState: function () { return state; },
      onIdle: function (message) { UI.showToast(message); }
    });
    registerServiceWorker();
  }

  boot();
})();
