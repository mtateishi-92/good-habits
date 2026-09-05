/* ==========================================================================
   Good-Habits — バッジ定義
   plan.md「バッジ／実績システム」の4カテゴリに対応。
   condition(facts) / progress(facts) は state.progressFacts を受け取る純関数。
   ========================================================================== */

window.GH_BADGES = (function () {
  var ICONS = window.GH_ICONS;

  var BADGES = [
    {
      id: "first_step",
      category: "action",
      name: "はじめの一歩",
      desc: "初めてToDoを1件達成すると解放されます。",
      icon: ICONS.flag,
      tier: null,
      condition: function (f) { return f.hadFirstCompletion; },
      progress: function (f) { return { current: f.hadFirstCompletion ? 1 : 0, target: 1 }; }
    },
    {
      id: "streak_3",
      category: "streak",
      name: "三日坊主卒業",
      desc: "習慣を3日間、連続で達成すると解放されます。",
      icon: ICONS.flame,
      tier: null,
      counter: 3,
      condition: function (f) { return f.bestStreakEver >= 3; },
      progress: function (f) { return { current: Math.min(f.bestStreakEver, 3), target: 3 }; }
    },
    {
      id: "streak_7",
      category: "streak",
      name: "一週間の壁",
      desc: "習慣を7日間、連続で達成すると解放されます。",
      icon: ICONS.flame,
      tier: null,
      counter: 7,
      condition: function (f) { return f.bestStreakEver >= 7; },
      progress: function (f) { return { current: Math.min(f.bestStreakEver, 7), target: 7 }; }
    },
    {
      id: "streak_30",
      category: "streak",
      name: "継続の炎",
      desc: "習慣を30日間、一日も欠かさず連続で達成すると解放されます。",
      icon: ICONS.flame,
      tier: null,
      counter: 30,
      condition: function (f) { return f.bestStreakEver >= 30; },
      progress: function (f) { return { current: Math.min(f.bestStreakEver, 30), target: 30 }; }
    },
    {
      id: "course_easy",
      category: "course",
      name: "習慣の芽（21日）",
      desc: "21日コースの習慣を1つ達成すると解放されます。",
      icon: ICONS.sprout,
      tier: "bronze",
      condition: function (f) { return f.achievedTiers.easy; },
      progress: function (f) { return { current: f.achievedTiers.easy ? 1 : 0, target: 1 }; }
    },
    {
      id: "course_medium",
      category: "course",
      name: "継続は力なり（90日）",
      desc: "90日コースの習慣を1つ達成すると解放されます。",
      icon: ICONS.tree,
      tier: "silver",
      condition: function (f) { return f.achievedTiers.medium; },
      progress: function (f) { return { current: f.achievedTiers.medium ? 1 : 0, target: 1 }; }
    },
    {
      id: "course_hard",
      category: "course",
      name: "マスター（180日）",
      desc: "180日コースの習慣を1つ達成すると解放されます。",
      icon: ICONS.crown,
      tier: "gold",
      condition: function (f) { return f.achievedTiers.hard; },
      progress: function (f) { return { current: f.achievedTiers.hard ? 1 : 0, target: 1 }; }
    },
    {
      id: "double_wield",
      category: "action",
      name: "二刀流",
      desc: "同時に3つ以上の習慣を進行中にすると解放されます。",
      icon: ICONS.crossedFlags,
      tier: null,
      condition: function (f) { return f.maxSimultaneousActive >= 3; },
      progress: function (f) { return { current: Math.min(f.maxSimultaneousActive, 3), target: 3 }; }
    },
    {
      id: "perfect",
      category: "capstone",
      name: "パーフェクト",
      desc: "21日・90日・180日、3つの習慣化コースをすべて達成すると解放される特別な実績です。",
      icon: ICONS.wreath,
      tier: null,
      condition: function (f) {
        return f.achievedTiers.easy && f.achievedTiers.medium && f.achievedTiers.hard;
      },
      progress: function (f) {
        var n = (f.achievedTiers.easy ? 1 : 0) + (f.achievedTiers.medium ? 1 : 0) + (f.achievedTiers.hard ? 1 : 0);
        return { current: n, target: 3 };
      }
    }
  ];

  function byId(id) {
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) return BADGES[i];
    return null;
  }

  function byCategory(cat) {
    return BADGES.filter(function (b) { return b.category === cat; });
  }

  // ストリーク系バッジの道のり（バッジ詳細画面のロードマップ表示用）
  var STREAK_LADDER = ["streak_3", "streak_7", "streak_30"];

  return {
    ALL: BADGES,
    byId: byId,
    byCategory: byCategory,
    STREAK_LADDER: STREAK_LADDER
  };
})();
