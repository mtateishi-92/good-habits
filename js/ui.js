/* ==========================================================================
   Good-Habbit — 画面描画（View層）。状態を直接書き換えず、描画に専念する。
   ========================================================================== */

window.GH_UI = (function () {
  var ICONS = window.GH_ICONS;
  var CONTENT = window.GH_CONTENT;
  var BADGES = window.GH_BADGES;
  var LOGIC = window.GH_LOGIC;

  var CATEGORY_LABEL = {
    streak: "ストリーク",
    course: "コース達成",
    action: "行動",
    capstone: "コンプリート"
  };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  // ---- ナビゲーションバー -------------------------------------------------

  var NAV_ITEMS = [
    { key: "home", label: "ホーム", icon: ICONS.home },
    { key: "heatmap", label: "カレンダー", icon: ICONS.calendar },
    { key: "badges", label: "バッジ", icon: ICONS.ribbon },
    { key: "settings", label: "設定", icon: ICONS.gear }
  ];

  function navHtml(active) {
    return NAV_ITEMS.map(function (item) {
      var cls = "nav-item" + (item.key === active ? " active" : "");
      return '<button class="' + cls + '" data-nav-target="' + item.key + '">' + item.icon + "<span>" + item.label + "</span></button>";
    }).join("");
  }

  function initNavbars() {
    document.querySelectorAll("[data-navbar-for]").forEach(function (nav) {
      nav.innerHTML = navHtml(nav.getAttribute("data-navbar-for"));
    });
  }

  // ---- ホーム画面 ----------------------------------------------------------

  function formatDateLabel(d) {
    var w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日（" + w + "）";
  }

  function habitCardHtml(habit) {
    var cat = CONTENT.categoryByKey(habit.categoryKey);
    var pct = Math.min(100, Math.round((habit.totalCompletedDays / habit.targetDays) * 100));
    var remaining = Math.max(0, habit.targetDays - habit.totalCompletedDays);
    var doneCls = habit.doneToday ? " done" : "";
    var nearCls = pct >= 80 ? " near-done" : "";
    return (
      '<div class="habit-card' + nearCls + '" data-habit-id="' + habit.id + '">' +
        '<button class="check' + doneCls + '" data-action="toggle-habit" data-habit-id="' + habit.id + '" aria-label="達成する">' +
          (habit.doneToday ? ICONS.check : "") +
        "</button>" +
        '<div class="habit-mid">' +
          '<div class="habit-name' + doneCls + '">' + esc(habit.name) + "</div>" +
          '<div class="habit-tag">' + esc(cat ? cat.label : "") + "・" + habit.targetDays + "日コース</div>" +
          '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        "</div>" +
        '<div class="habit-right">' +
          '<div class="habit-days">残り' + remaining + "日</div>" +
          '<div class="habit-days-label">習慣化まで</div>' +
          '<div class="habit-streak">' + ICONS.flame + habit.currentStreak + "</div>" +
        "</div>" +
        '<button class="habit-remove" data-action="remove-habit" data-habit-id="' + habit.id + '" aria-label="削除">' + ICONS.trash + "</button>" +
      "</div>"
    );
  }

  function renderHome(state, message) {
    el("home-date").textContent = formatDateLabel(new Date());
    el("home-message").textContent = message || CONTENT.randomMessage();

    var list = state.habits;
    el("habit-count-label").textContent = "本日の習慣　" + list.length + "件";
    if (list.length === 0) {
      el("habit-list").innerHTML = '<div class="habit-empty">まだ習慣が登録されていません。<br>右下の＋から、最初の習慣を登録しましょう。</div>';
    } else {
      el("habit-list").innerHTML = list.map(habitCardHtml).join("");
    }

    var banner = el("skipped-banner");
    if (state.meta.skippedBannerPending) {
      el("skipped-banner-icon").innerHTML = ICONS.bell;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }

    el("fab-add").innerHTML = ICONS.plus;
  }

  // ---- 習慣を追加 -----------------------------------------------------------

  var addSelectedCategory = null;

  function resetAddScreen() {
    addSelectedCategory = null;
    el("add-name-input").value = "";
    renderAddOptions();
    el("add-submit").disabled = true;
  }

  function renderAddOptions() {
    el("add-back").innerHTML = ICONS.back;
    el("add-options").innerHTML = CONTENT.CATEGORIES.map(function (cat) {
      var selected = cat.key === addSelectedCategory;
      return (
        '<button class="option' + (selected ? " selected" : "") + '" data-category="' + cat.key + '">' +
          '<span class="radio">' + (selected ? '<span class="dot"></span>' : "") + "</span>" +
          '<span class="option-mid"><span class="option-name">' + esc(cat.label) + '</span><span class="option-ex">' + esc(cat.example) + "</span></span>" +
          '<span class="option-days">' + cat.days + "日</span>" +
        "</button>"
      );
    }).join("");
  }

  function updateAddSubmitState() {
    var name = el("add-name-input").value.trim();
    el("add-submit").disabled = !(name && addSelectedCategory);
  }

  // ---- バッジ一覧 ------------------------------------------------------------

  function badgeTileHtml(badge, state) {
    var rec = state.badges[badge.id];
    var earned = !!(rec && rec.earned);
    var iconCls = "badge-icon" + (earned ? "" : " locked");
    if (earned && badge.tier === "bronze") iconCls += " bronze";
    if (earned && badge.tier === "silver") iconCls += " silver";
    if (!earned && badge.tier === "gold") iconCls += " gold-ring";

    var counterHtml = badge.counter ? '<div class="badge-count">' + badge.counter + "</div>" : "";
    var dateHtml = earned
      ? formatShortDate(rec.earnedDay) + " 獲得"
      : "未獲得";

    return (
      '<button class="badge-tile' + (earned ? "" : " locked") + '" data-badge-id="' + badge.id + '">' +
        '<div class="' + iconCls + '">' + badge.icon + counterHtml + "</div>" +
        '<div class="badge-title">' + esc(badge.name) + "</div>" +
        '<div class="badge-date">' + dateHtml + "</div>" +
      "</button>"
    );
  }

  function formatShortDate(key) {
    if (!key) return "";
    var parts = key.split("-");
    return parts[1] + "月" + parts[2] + "日";
  }

  function renderBadges(state) {
    var total = BADGES.ALL.length;
    var earnedCount = 0;
    BADGES.ALL.forEach(function (b) { if (state.badges[b.id] && state.badges[b.id].earned) earnedCount++; });

    el("badge-summary-count").textContent = earnedCount + " / " + total;
    el("badge-summary-fill").style.width = Math.round((earnedCount / total) * 100) + "%";

    var groups = ["streak", "course", "action"];
    var html = groups.map(function (cat) {
      var badgesInCat = BADGES.byCategory(cat);
      return (
        '<div><div class="badge-cat-label">' + CATEGORY_LABEL[cat] + '</div>' +
        '<div class="badge-grid">' + badgesInCat.map(function (b) { return badgeTileHtml(b, state); }).join("") + "</div></div>"
      );
    }).join("");

    var capstone = BADGES.byCategory("capstone")[0];
    var capEarned = !!(state.badges[capstone.id] && state.badges[capstone.id].earned);
    html += (
      '<div><div class="badge-cat-label">' + CATEGORY_LABEL.capstone + '</div>' +
      '<button class="capstone' + (capEarned ? " earned" : "") + '" data-badge-id="' + capstone.id + '">' +
        '<div class="capstone-icon">' + capstone.icon + "</div>" +
        '<div><div class="capstone-title">' + esc(capstone.name) + '</div><div class="capstone-desc">' + esc(capstone.desc) + "</div></div>" +
      "</button></div>"
    );

    el("badges-scroll").innerHTML = html;
  }

  // ---- バッジ詳細 -------------------------------------------------------------

  var RING_R = 42, RING_C = 2 * Math.PI * 42;

  function renderBadgeDetail(state, badgeId) {
    var badge = BADGES.byId(badgeId);
    if (!badge) return;
    var rec = state.badges[badge.id];
    var earned = !!(rec && rec.earned);
    var prog = badge.progress(state.progressFacts);
    var pct = earned ? 1 : Math.min(1, prog.target ? prog.current / prog.target : 0);
    var offset = RING_C * (1 - pct);

    var coreStyle = earned ? "background:var(--accent); color:var(--accent-ink);" : "background:var(--surface-2); color:var(--text-dim);";

    var html = (
      '<div class="badge-hero">' +
        '<div class="ring-wrap">' +
          '<svg class="ring" viewBox="0 0 100 100">' +
            '<circle class="ring-track" cx="50" cy="50" r="' + RING_R + '" stroke-width="6" fill="none"/>' +
            '<circle class="ring-fill" cx="50" cy="50" r="' + RING_R + '" stroke-width="6" fill="none" stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
          "</svg>" +
          '<div class="badge-core" style="' + coreStyle + '">' + badge.icon + "</div>" +
        "</div>" +
        '<div class="badge-hero-name serif">' + esc(badge.name) + "</div>" +
        '<div class="badge-hero-cat">' + CATEGORY_LABEL[badge.category] + "系</div>" +
        '<div class="badge-hero-desc">' + esc(badge.desc) + "</div>" +
      "</div>"
    );

    if (earned) {
      html += '<div class="card progress-card"><div class="progress-note">' + formatShortDate(rec.earnedDay) + " に獲得しました。</div></div>";
    } else if (prog.target > 1) {
      html += (
        '<div class="card progress-card">' +
          '<div class="progress-head"><span>現在の進捗</span><b>' + prog.current + " / " + prog.target + "</b></div>" +
          '<div class="progress-track-lg"><div class="progress-fill-lg" style="width:' + Math.round(pct * 100) + '%"></div></div>' +
          '<div class="progress-note">あと' + (prog.target - prog.current) + "でこのバッジが解放されます</div>" +
        "</div>"
      );
    } else {
      html += '<div class="card progress-card"><div class="progress-note">条件を達成すると解放されます。</div></div>';
    }

    if (badge.category === "streak") {
      html += '<div class="roadmap"><div class="roadmap-label">ストリークの道のり</div><div class="nodes">' +
        BADGES.STREAK_LADDER.map(function (id) {
          var b = BADGES.byId(id);
          var isEarned = !!(state.badges[id] && state.badges[id].earned);
          var isCurrent = id === badge.id;
          var circleCls = "node-circle" + (isEarned ? "" : (isCurrent ? " current" : " locked"));
          var check = isEarned ? '<div class="node-check">' + ICONS.check + "</div>" : "";
          return (
            '<div class="node">' +
              '<div class="connector' + (isEarned ? "" : " dim") + '"></div>' +
              '<div class="' + circleCls + '">' + ICONS.flame + check + "</div>" +
              '<div class="node-label' + (isCurrent ? " current" : "") + '">' + b.counter + "日</div>" +
            "</div>"
          );
        }).join("") +
      "</div></div>";
    }

    el("badge-detail-content").innerHTML = html;
  }

  // ---- カレンダーヒートマップ ---------------------------------------------------

  function renderHeatmap(state, year, monthIndex) {
    el("month-label").textContent = year + "年" + (monthIndex + 1) + "月";
    el("month-prev").innerHTML = ICONS.chevLeft;
    el("month-next").innerHTML = ICONS.chevRight;

    var cells = LOGIC.buildMonthMatrix(state, year, monthIndex);
    el("day-grid").innerHTML = cells.map(function (c) {
      if (c.blank) return '<div class="day-cell blank"></div>';
      var cls = "day-cell" + (c.level > 0 ? " l" + c.level : "") + (c.isToday ? " today" : "");
      return '<div class="' + cls + '"><span>' + c.day + "</span></div>";
    }).join("");

    var legend = el("heatmap-legend");
    legend.innerHTML = '少ない' +
      '<span class="sw" style="background:var(--surface-2)"></span>' +
      '<span class="sw" style="background:rgba(201,162,75,0.28)"></span>' +
      '<span class="sw" style="background:rgba(201,162,75,0.5)"></span>' +
      '<span class="sw" style="background:rgba(201,162,75,0.74)"></span>' +
      '<span class="sw" style="background:var(--accent)"></span>' +
      '多い';

    el("stat-streak").innerHTML = ICONS.flame + LOGIC.currentLongestStreak(state) + "日";
    el("stat-rate").textContent = LOGIC.monthlyCompletionRate(state, year, monthIndex) + "%";
  }

  // ---- 設定 -------------------------------------------------------------------

  function renderSettings(state) {
    var themes = [
      { key: "classic", name: "クラシック ネイビー×ゴールド", a: "#0d1526", b: "#c9a24b" },
      { key: "modern", name: "モダン グレー×ブルー", a: "#f3f5f9", b: "#3057c9" }
    ];
    el("theme-row").innerHTML = themes.map(function (t) {
      var selected = state.settings.theme === t.key;
      return (
        '<button class="theme-option' + (selected ? " selected" : "") + '" data-theme-choice="' + t.key + '">' +
          '<span class="theme-swatch"><span style="background:' + t.a + '"></span><span style="background:' + t.b + '"></span></span>' +
          '<span class="theme-name">' + t.name + "</span>" +
          '<span class="radio">' + (selected ? '<span class="dot"></span>' : "") + "</span>" +
        "</button>"
      );
    }).join("");

    var hours = [0, 1, 2, 3, 4];
    el("reset-hour-row").innerHTML = hours.map(function (h) {
      var selected = state.settings.resetHour === h;
      return '<button class="chip' + (selected ? " selected" : "") + '" data-reset-hour="' + h + '">' + h + "時</button>";
    }).join("");

    var toggles = [
      { key: "notifyInactivity", name: "非操作リマインダー", desc: "アプリを開いたまま30分操作がない場合に通知" },
      { key: "notifySkipped", name: "未達成日のバナー通知", desc: "前日サボった習慣がある場合にアプリ内で通知" },
      { key: "notifySound", name: "達成演出サウンド", desc: "花火演出・称賛コメント時の効果音（今後実装予定）" }
    ];
    el("toggle-card").innerHTML = toggles.map(function (t) {
      var on = !!state.settings[t.key];
      return (
        '<button class="toggle-row" data-toggle-key="' + t.key + '">' +
          '<span class="toggle-mid"><span class="toggle-name">' + t.name + '</span><span class="toggle-desc">' + t.desc + "</span></span>" +
          '<span class="toggle' + (on ? " on" : "") + '"><span class="toggle-knob"></span></span>' +
        "</button>"
      );
    }).join("");
  }

  // ---- 達成演出（花火オーバーレイ） --------------------------------------------------

  function randomConfetti() {
    var colors = ["var(--accent)", "var(--accent-bright)", "var(--danger)", "#f5f1e6"];
    var spots = [];
    for (var i = 0; i < 10; i++) {
      spots.push({
        left: Math.round(Math.random() * 90) + "%",
        top: Math.round(Math.random() * 80) + "%",
        size: 5 + Math.round(Math.random() * 5),
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.round(Math.random() * 60 - 30)
      });
    }
    return spots.map(function (s) {
      return '<div class="confetti" style="left:' + s.left + ";top:" + s.top + ";width:" + s.size + "px;height:" + s.size + "px;background:" + s.color + ";transform:rotate(" + s.rot + "deg);border-radius:" + (Math.random() > 0.5 ? "2px" : "50%") + ';"></div>';
    }).join("");
  }

  function showCelebration(achieved, newBadges) {
    el("celebration-medal").innerHTML = ICONS.trophy;
    var cat = CONTENT.categoryByKey(achieved.categoryKey);
    el("celebration-sub").textContent = "「" + achieved.name + "」が" + achieved.targetDays + "日間の習慣化に成功しました";
    el("confetti-holder").innerHTML = randomConfetti();

    var row = el("celebration-badge-row");
    if (newBadges && newBadges.length > 0) {
      var b = newBadges[0];
      el("celebration-badge-icon").innerHTML = b.icon;
      el("celebration-badge-title").textContent = "実績に「" + b.name + "」が追加されました";
      row.classList.remove("hidden");
    } else {
      row.classList.add("hidden");
    }
    el("celebration-overlay").classList.add("active");
  }

  function hideCelebration() {
    el("celebration-overlay").classList.remove("active");
  }

  // ---- トースト -----------------------------------------------------------------

  var toastTimer = null;
  function showToast(message) {
    var t = el("toast");
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 4000);
  }

  // ---- テーマ適用 ---------------------------------------------------------------

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  return {
    el: el,
    initNavbars: initNavbars,
    navHtml: navHtml,
    renderHome: renderHome,
    resetAddScreen: resetAddScreen,
    renderAddOptions: renderAddOptions,
    updateAddSubmitState: updateAddSubmitState,
    getAddSelectedCategory: function () { return addSelectedCategory; },
    setAddSelectedCategory: function (key) { addSelectedCategory = key; },
    renderBadges: renderBadges,
    renderBadgeDetail: renderBadgeDetail,
    renderHeatmap: renderHeatmap,
    renderSettings: renderSettings,
    showCelebration: showCelebration,
    hideCelebration: hideCelebration,
    showToast: showToast,
    applyTheme: applyTheme
  };
})();
