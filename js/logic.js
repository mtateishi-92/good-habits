/* ==========================================================================
   Good-Habits — コアロジック（状態の変更はすべてここを通す）
   ========================================================================== */

window.GH_LOGIC = (function () {
  var S = window.GH_STORAGE;
  var CONTENT = window.GH_CONTENT;
  var BADGES = window.GH_BADGES;

  function todayKey(state, now) {
    return S.appDayKey(state.settings.resetHour, now);
  }

  function recordHistoryForDay(state, dayKey) {
    var done = 0;
    state.habits.forEach(function (h) { if (h.doneToday) done++; });
    state.history[dayKey] = { done: done, total: state.habits.length };
  }

  // アプリを開くたびに呼び出す。設定した更新時刻をまたいでいたら、
  // 前日分を確定させてストリークを更新し、当日分をリセットする。
  function runRollover(state, now) {
    var today = todayKey(state, now);
    if (!state.meta.lastRolloverDay) {
      state.meta.lastRolloverDay = today;
      return { rolled: false, skippedAny: false };
    }
    if (state.meta.lastRolloverDay === today) {
      return { rolled: false, skippedAny: false };
    }

    var cursor = state.meta.lastRolloverDay;
    var skippedAny = false;
    var guard = 0;
    while (cursor !== today && guard < 3650) {
      recordHistoryForDay(state, cursor);
      state.progressFacts.maxSimultaneousActive = Math.max(
        state.progressFacts.maxSimultaneousActive,
        state.habits.length
      );
      state.habits.forEach(function (h) {
        if (!h.doneToday && h.currentStreak > 0) skippedAny = true;
        if (!h.doneToday) h.currentStreak = 0;
        h.doneToday = false;
      });
      cursor = S.addDays(cursor, 1);
      guard++;
    }
    state.meta.lastRolloverDay = today;
    if (skippedAny && state.settings.notifySkipped) {
      state.meta.skippedBannerPending = true;
    }
    return { rolled: true, skippedAny: skippedAny };
  }

  function addHabit(state, name, categoryKey) {
    var category = CONTENT.categoryByKey(categoryKey);
    if (!category || !name) return null;
    var habit = {
      id: state.meta.nextHabitId++,
      name: name,
      categoryKey: categoryKey,
      targetDays: category.days,
      totalCompletedDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      doneToday: false,
      createdAt: new Date().toISOString()
    };
    state.habits.push(habit);
    state.progressFacts.maxSimultaneousActive = Math.max(
      state.progressFacts.maxSimultaneousActive,
      state.habits.length
    );
    return habit;
  }

  function removeHabit(state, habitId) {
    state.habits = state.habits.filter(function (h) { return h.id !== habitId; });
  }

  function checkBadges(state, dayKey) {
    var newly = [];
    BADGES.ALL.forEach(function (b) {
      var rec = state.badges[b.id];
      if (rec && rec.earned) return;
      if (b.condition(state.progressFacts)) {
        state.badges[b.id] = { earned: true, earnedDay: dayKey };
        newly.push(b);
      }
    });
    return newly;
  }

  // 習慣のチェックON/OFFを切り替える。戻り値で、達成演出やバッジ獲得の通知に必要な情報を返す。
  function toggleHabitDone(state, habitId, now) {
    var habit = null;
    for (var i = 0; i < state.habits.length; i++) {
      if (state.habits[i].id === habitId) { habit = state.habits[i]; break; }
    }
    if (!habit) return { changed: false };

    var willBeDone = !habit.doneToday;
    var today = todayKey(state, now);

    habit.doneToday = willBeDone;
    if (willBeDone) {
      habit.totalCompletedDays += 1;
      habit.currentStreak += 1;
      habit.longestStreak = Math.max(habit.longestStreak, habit.currentStreak);
      state.progressFacts.bestStreakEver = Math.max(state.progressFacts.bestStreakEver, habit.currentStreak);
      state.progressFacts.hadFirstCompletion = true;
    } else {
      habit.totalCompletedDays = Math.max(0, habit.totalCompletedDays - 1);
      habit.currentStreak = Math.max(0, habit.currentStreak - 1);
    }

    // 達成判定は削除の前に、その日の履歴として記録しておく
    recordHistoryForDay(state, today);

    var achieved = null;
    if (willBeDone && habit.totalCompletedDays >= habit.targetDays) {
      var cat = habit.categoryKey;
      if (cat === "easy" || cat === "medium" || cat === "hard") {
        state.progressFacts.achievedTiers[cat] = true;
      }
      achieved = {
        habitId: habit.id,
        name: habit.name,
        categoryKey: cat,
        targetDays: habit.targetDays
      };
      removeHabit(state, habit.id);
    }

    var newlyEarnedBadges = checkBadges(state, today);

    return {
      changed: true,
      habitId: habitId,
      done: willBeDone,
      achieved: achieved,
      newlyEarnedBadges: newlyEarnedBadges
    };
  }

  // ---- カレンダーヒートマップ用の集計 ------------------------------------

  function levelForRatio(ratio) {
    if (ratio <= 0) return 0;
    if (ratio <= 0.34) return 1;
    if (ratio <= 0.67) return 2;
    if (ratio < 1) return 3;
    return 4;
  }

  function buildMonthMatrix(state, year, monthIndex /* 0-11 */) {
    var firstOfMonth = new Date(year, monthIndex, 1);
    var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    // 月曜始まりのオフセット (0=月,...,6=日)
    var jsDay = firstOfMonth.getDay(); // 0=日,1=月,...
    var offset = (jsDay + 6) % 7;
    var today = todayKey(state, new Date());

    var cells = [];
    for (var i = 0; i < offset; i++) cells.push({ blank: true });
    for (var day = 1; day <= daysInMonth; day++) {
      var key = year + "-" + (monthIndex + 1 < 10 ? "0" : "") + (monthIndex + 1) + "-" + (day < 10 ? "0" : "") + day;
      var rec = state.history[key];
      var ratio = rec && rec.total > 0 ? rec.done / rec.total : 0;
      cells.push({
        blank: false,
        day: day,
        key: key,
        level: levelForRatio(ratio),
        isToday: key === today
      });
    }
    return cells;
  }

  function currentLongestStreak(state) {
    var max = 0;
    state.habits.forEach(function (h) { if (h.currentStreak > max) max = h.currentStreak; });
    return max;
  }

  function monthlyCompletionRate(state, year, monthIndex) {
    var prefix = year + "-" + (monthIndex + 1 < 10 ? "0" : "") + (monthIndex + 1);
    var done = 0, total = 0;
    Object.keys(state.history).forEach(function (key) {
      if (key.indexOf(prefix) === 0) {
        done += state.history[key].done;
        total += state.history[key].total;
      }
    });
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }

  return {
    todayKey: todayKey,
    runRollover: runRollover,
    addHabit: addHabit,
    removeHabit: removeHabit,
    toggleHabitDone: toggleHabitDone,
    checkBadges: checkBadges,
    buildMonthMatrix: buildMonthMatrix,
    currentLongestStreak: currentLongestStreak,
    monthlyCompletionRate: monthlyCompletionRate
  };
})();
