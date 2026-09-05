/* ==========================================================================
   Good-Habits — 永続化まわり（localStorage）
   ========================================================================== */

window.GH_STORAGE = (function () {
  var KEY = "goodHabbits.state.v1";

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function dateKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // 設定画面の「リスト更新時刻（0〜4時）」を境目とした“アプリ上の今日”の日付キーを返す。
  // 例: resetHour=2 のとき、AM1:30 は「前日」扱いになる。
  function appDayKey(resetHour, now) {
    now = now || new Date();
    var d = new Date(now.getTime());
    if (d.getHours() < resetHour) {
      d.setDate(d.getDate() - 1);
    }
    return dateKey(d);
  }

  // 'YYYY-MM-DD' 文字列に days 日を加算した 'YYYY-MM-DD' を返す。
  function addDays(key, days) {
    var parts = key.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return dateKey(d);
  }

  function defaultState() {
    return {
      version: 1,
      settings: {
        theme: "classic",
        resetHour: 2,
        notifySkipped: true,
        notifySound: false
      },
      habits: [],
      history: {}, // { 'YYYY-MM-DD': { done: number, total: number } }
      badges: {},  // { badgeId: { earned: true, earnedDay: 'YYYY-MM-DD' } }
      progressFacts: {
        hadFirstCompletion: false,
        bestStreakEver: 0,
        achievedTiers: { easy: false, medium: false, hard: false },
        maxSimultaneousActive: 0
      },
      meta: {
        lastRolloverDay: null,
        skippedBannerPending: false,
        nextHabitId: 1
      }
    };
  }

  function migrate(state) {
    // 将来のバージョン差分を吸収する場所。今は v1 のみ。
    if (!state.progressFacts) state.progressFacts = defaultState().progressFacts;
    if (!state.meta) state.meta = defaultState().meta;
    if (!state.badges) state.badges = {};
    if (!state.history) state.history = {};
    return state;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch (e) {
      console.warn("Good-Habits: 保存データの読み込みに失敗したため初期化します。", e);
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Good-Habits: 保存に失敗しました（ストレージ容量の上限などが考えられます）。", e);
    }
  }

  // ---- バックアップ（エクスポート／インポート） -------------------------------

  // 現在の状態を、復元用のJSON文字列にまとめる。
  function serialize(state) {
    return JSON.stringify({
      app: "good-habits",
      schema: 1,
      exportedAt: new Date().toISOString(),
      state: state
    }, null, 2);
  }

  // バックアップのテキストを検証して state オブジェクトを返す。壊れていれば例外を投げる。
  // serialize() が作ったラッパー形式と、素の state オブジェクトの両方を受け付ける。
  function parseBackup(text) {
    var obj = JSON.parse(text); // 不正なJSONならここで例外
    var incoming = (obj && obj.app === "good-habits" && obj.state) ? obj.state : obj;
    if (!incoming || typeof incoming !== "object" ||
        !Array.isArray(incoming.habits) || typeof incoming.settings !== "object") {
      throw new Error("Good-Habits のバックアップファイルではないようです");
    }
    return migrate(incoming);
  }

  return {
    dateKey: dateKey,
    appDayKey: appDayKey,
    addDays: addDays,
    defaultState: defaultState,
    load: load,
    save: save,
    serialize: serialize,
    parseBackup: parseBackup
  };
})();
