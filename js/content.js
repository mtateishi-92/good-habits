/* ==========================================================================
   Good-Habits — 静的コンテンツ定義
   content/messages.md の内容と同期させること。
   ========================================================================== */

window.GH_CONTENT = (function () {

  // 習慣化コースの選択肢（plan.md「習慣化したいことの登録」に対応）
  var CATEGORIES = [
    { key: "easy", label: "簡単な行動", example: "目安：水を飲む、食後に歯を磨く", days: 21 },
    { key: "medium", label: "中程度の行動", example: "目安：読書、朝の散歩", days: 90 },
    { key: "hard", label: "負荷の高い行動", example: "目安：筋トレ、ハードな学習習慣", days: 180 },
    { key: "test", label: "達成動作のテスト用", example: "動作確認用の短期コース", days: 1 }
  ];

  // 時間帯別メッセージ + 全時間帯共通のスローガン
  var MESSAGES = {
    morning: [ // 5:00-10:59
      "おはようございます。今日も一歩、積み重ねましょう。",
      "おはようございます！すがすがしい一日のスタートです。",
      "新しい一日です。昨日より少しだけ前へ。",
      "千里の道も一歩から。",
      "早起きは三文の徳。",
      "雨だれ石を穿つ。"
    ],
    midday: [ // 11:00-15:59
      "こんにちは。今日の調子はいかがですか？",
      "お昼の時間です。少し一息ついたら、また一歩進みましょう。",
      "継続は力なり。",
      "急がば回れ。"
    ],
    evening: [ // 16:00-18:59
      "お疲れさまです。今日も一日よく頑張りました。",
      "夕方です。今日のToDo、忘れていませんか？",
      "石の上にも三年。",
      "ローマは一日にして成らず。"
    ],
    night: [ // 19:00-23:59
      "こんばんは。今日を締めくくる一歩を踏み出しましょう。",
      "一日お疲れさまでした。寝る前にもうひとつ、達成できそうですか？",
      "習うより慣れよ。",
      "塵も積もれば山となる。"
    ],
    lateNight: [ // 0:00-4:59
      "こんな時間まで頑張っていますね。無理せず、できる範囲で。",
      "明日は明日の風が吹く。焦らず、また一歩ずつ。"
    ],
    common: [ // 全時間帯共通
      "1%の変化を起こしていきましょう！"
    ]
  };

  var PRAISE = [
    "よくできました！今日も一つ、達成です。",
    "さすがです。その積み重ねが未来を変えます。",
    "ナイス！小さな一歩が、大きな習慣になります。"
  ];

  function getSlot(hour) {
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 16) return "midday";
    if (hour >= 16 && hour < 19) return "evening";
    if (hour >= 19 && hour < 24) return "night";
    return "lateNight";
  }

  function randomMessage(hour, excludeText) {
    var slot = getSlot(typeof hour === "number" ? hour : new Date().getHours());
    var pool = MESSAGES[slot].concat(MESSAGES.common);
    if (excludeText && pool.length > 1) {
      pool = pool.filter(function (m) { return m !== excludeText; });
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function randomPraise() {
    return PRAISE[Math.floor(Math.random() * PRAISE.length)];
  }

  function categoryByKey(key) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i];
    }
    return null;
  }

  return {
    CATEGORIES: CATEGORIES,
    MESSAGES: MESSAGES,
    PRAISE: PRAISE,
    randomMessage: randomMessage,
    randomPraise: randomPraise,
    categoryByKey: categoryByKey
  };
})();
