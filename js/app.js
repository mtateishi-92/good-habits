/* ==========================================================================
   Good-Habits — アプリの起動・画面遷移・イベント配線
   ========================================================================== */

(function () {
  var STORAGE = window.GH_STORAGE;
  var CONTENT = window.GH_CONTENT;
  var LOGIC = window.GH_LOGIC;
  var UI = window.GH_UI;
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

  // ---- データのバックアップ --------------------------------------------------

  function backupFilename() {
    var d = new Date();
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return "good-habits-backup-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + ".json";
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function restoreFromText(text) {
    var next;
    try {
      next = STORAGE.parseBackup(text);
    } catch (e) {
      UI.showToast("復元できませんでした：" + e.message);
      return;
    }
    if (!window.confirm(
      "現在のデータを、バックアップの内容で置き換えます。\n（習慣 " + next.habits.length + " 件）\nこの操作は取り消せません。よろしいですか？"
    )) return;
    STORAGE.save(next);
    location.reload();
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
      return;
    }

    if (e.target.closest('[data-action="export-data"]')) {
      downloadText(backupFilename(), STORAGE.serialize(state));
      UI.showToast("バックアップを書き出しました。");
      return;
    }

    if (e.target.closest('[data-action="copy-data"]')) {
      var json = STORAGE.serialize(state);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(
          function () { UI.showToast("バックアップをコピーしました。メモやメールに貼り付けて保管してください。"); },
          function () { window.prompt("下のテキストをすべてコピーして保管してください。", json); }
        );
      } else {
        window.prompt("下のテキストをすべてコピーして保管してください。", json);
      }
      return;
    }

    if (e.target.closest('[data-action="paste-restore"]')) {
      var pasted = window.prompt("バックアップのテキストを貼り付けてください。");
      if (pasted) restoreFromText(pasted);
      return;
    }
  });

  // ---- 変更イベント（ファイル選択）の委譲 -----------------------------------

  document.addEventListener("change", function (e) {
    var fileInput = e.target.closest('[data-action="import-file"]');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      var reader = new FileReader();
      reader.onload = function () { restoreFromText(String(reader.result)); };
      reader.onerror = function () { UI.showToast("ファイルを読み込めませんでした。"); };
      reader.readAsText(fileInput.files[0]);
      fileInput.value = "";
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
          console.warn("Good-Habits: Service Workerの登録に失敗しました。", err);
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
    registerServiceWorker();
  }

  boot();
})();
