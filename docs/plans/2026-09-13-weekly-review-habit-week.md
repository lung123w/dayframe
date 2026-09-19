# Weekly Review — Habit 面板應該顯示「上週」數據（Exploration & Decision Doc）

Task: t_d0ae0f14 · Repo: C:\git\project_mgmt_tool (DayFrame) · Date: 2026-09-13
Status: exploration only — no code written / no openspec proposal (next step after Anderson picks an option).
⚠️ Repo 協調: master 上有未 commit 嘅 WORK-toggle Phase 1 改動（t_0e736d8f blocked, WIP）——本 explore 完全 READ-ONLY，冇改過任何 code / test / git 狀態。呢份 doc 係新增檔案，唔影響 WIP。

## 1. Anderson 嘅投訴（原文意思）

Weekly Review 個 flow 係「計劃下星期 + 同時 review 上星期做成點」，但 Habit Tracking / habit summary 面板仍然 show 現有（current/existing）星期嘅數據，而唔係被 review 嗰個上星期。係 commit 06421e8（t_93d76dc1）之後嘅 follow-up。

## 2. 實際 flow（由 code + DB 驗證，2026-09-13）

WeeklyReview.jsx（working tree，`C:\git\project_mgmt_tool\src\components\WeeklyReview.jsx`）只有**一個 week selector**：

- 預設 `weekStartDate = startOfWeek(subDays(new Date(), 1), { weekStartsOn: 1 })`（line 293–295）→ 即係「噚日所在嘅星期」= 一般人眼中嘅 current week（星期日開 app = 今個星期；星期一凌晨 = 上星期）。
- 揀咗嘅星期 W 同時驅動成個版面：
  - Review doc key：`GET/PUT /api/weekly-reviews?weekStart=W`（doc 內容 = cleanup / gratitude / reflection / goals / syncFlags）
  - Goals section：寫入 doc W；`syncGoals` → `/api/weekly-objectives?weekStart=W`
  - Key events grid：只顯示 W 嘅 Mon–Sun（line 332–348）
  - **Habit entries：`habitEntryService.getAll({ from: W, to: W+6 })`（line 357）→ habit summary chips 跟 selected week**
- Habit chips 標題用 `weekRangeLabel`（line 759）：`Habits (Sep 14 – Sep 20, 2026):`——即 selected week 嘅範圍。

**DB 證據（data/app.db，read-only 查詢）顯示 Anderson 嘅真實用法：**

| review doc weekStart | updatedAt | 內容 |
|---|---|---|
| 2026-09-14 | 2026-09-13 04:16（今朝） | goals = 下星期目標（Guitar B'Z、YouTube 等）；reflection 描述 Sep 7–13（「我成功每天MEDITATE，亦開始建立做GYM嘅習慣」→ gym 係 Sep 9/10、meditation 係 Sep 7–11）|
| 2026-09-07 | 2026-09-06 04:29 | goals = Sep 7–13 目標；reflection 關於 Aug 31–Sep 6 |
| 2026-08-31 | 2026-09-01 13:58 | mid-week 更新 |

即係 Anderson 每逢星期日凌晨（~04:00）做 weekly review：**開 app → 揀/跳去下星期（plan week，個 doc 就係 key 喺呢個星期）→ 喺度寫「上星期做成點」嘅 reflection + 寫下星期目標**。

→ **Doc key = PLAN week；review 內容（reflection + habits）= PLAN week − 1。**
（補充：Sep 14–20 喺 DB 冇任何 habit entries，max date 係 2026-09-11——所以揀咗 plan week 嗰陣，chips 全部顯示 0m / 0 reps。）

## 3. Root cause（確認）

**單一 week selector 將「plan week」同「review week」兩個概念併埋咗一個星期。**

1. 個 selector 喺實際使用上係 *plan week* 嘅 anchor（doc key、goals、sync 都跟佢）。
2. 但 habit entries fetch 都係跟同一個 selector（line 357）——當 Anderson 跳去 plan week（Sep 14–20）寫目標時，面板就顯示 Sep 14–20 嘅 entries = **全部 0，標題仲顯示 "Habits (Sep 14 – Sep 20)"**。
3. Reflection 問題本身寫明「上週嘅習慣…」（REFLECTION_QUESTIONS habits label），但數據綁死咗 selected week → 就係投訴講嘅「show 現有嗰個星期，唔係被 review 嗰個上星期」。
4. 之前嘅 fix（06421e8）只做咗兩件事：default 由 `startOfWeek(now)` 改做「噚日嘅 week」（解決星期一凌晨跨界變 0 嘅 edge case）＋ count → time/reps 計算＋將硬code 嘅 "Last week's habits:" 標題改做實際範圍標題。**佢冇將 habit 數據同 selected week 解耦**，所以一跳去 plan week 個面板就跟錯。星期日凌晨嘅 default（=今個星期）啱好 = review week 只係個巧合。
5. 同一個 conflation 令 key events grid 都有相似問題（plan week 時見未來一個禮拜，全空）——但 Anderson 今次只投訴 habits，key events 屬於同一類但 out of scope。

## 4. Options（每個列 trade-off + 對 WIP 嘅影響）

### Option A — 改 default：`weekStart = startOfWeek(now - 7)`（上週）
- 點睇：星期日 session `now-7` = 上星期日 → `startOfWeek` = **Aug 31** = plan week（Sep 14）之前兩個星期。對 review（應該係 Sep 7–13）同 plan（Sep 14–20）都錯；default 會load 咗 doc id 9（Aug 31）嚟做 editable doc——同 Anderson 嘅實測 doc-key pattern 唔夾。
- A' 變體（default 跳去 plan week = `startOfWeek(now)+7` ／ weekend 先係）：只係慳一次「Next」click，**冇 fix 到面板**；而且 mid-week session 會錯（例：doc 2026-08-31 係 Tue 09-01 更新——嗰陣 plan week = 今個星期，唔係下星期）。
- 對 WIP 影響：touch line 293–295，正正喺 WIP 插入 mode state 嘅位置隔離；風險中等但對 root cause 冇幫助。
- **結論：唔建議**（A 唔啱 mental model；A' 只係 UX 甜頭，唔係 fix）。

### Option B — Habit 面板永遠顯示 weekStart 之前嗰個星期（review week = W − 7）★ 推薦
- 做法（全部喺 WeeklyReview.jsx，純前端）：
  - 加 `const reviewWeekStart = subWeeks(weekStartDate, 1)`；`reviewWeekEnd = endOfWeek(reviewWeekStart)`
  - line 357：`habitEntryService.getAll({ from: format(reviewWeekStart), to: format(reviewWeekEnd) })`
  - line 759/765：chips 標題改做例如 `上週習慣 (Review week: Sep 12 – Sep 18):`（清楚講明係邊個星期，避免再次誤解）
- 效果：doc W 恆常 = 「review W−1 + plan W」，同 DB 入面所有現有 doc 嘅內容完全一致；無論揀咗邊個星期，面板都啱。
- Trade-offs：預設 view 嗰陣（星期日開 app = Sep 7–13），面板會 show Aug 31–Sep 6——呢個係啱嘅（嗰個 doc = 上週嘅 review doc），但一定要靠標題標明「上週」先唔會畀人覺得錯。
- 對 WIP 影響：極細。touch 三個位：line 357（loadWeek 入面，WIP 有改 loadWeek 簽名加 mode + getByWeek 加參數，但係加一行 subWeeks 係 additive）、line 759/765（759 用咗 WIP 改過嘅 `weekRangeLabel`，加一個 `reviewWeekRangeLabel` 就唔撞）。冇 schema / API / state / mode 改動。
- Tests：`src/__tests__/WeeklyReview.test.jsx` 有兩個 assertion 要改——line 205 `expect(mockHabitEntryGetAll).toHaveBeenCalledWith({ from: expectedDefault, to: expectedDefaultEnd })` 要變成 review week offset；line 210–218 嗰個「labels the habit summary with the actual data range」test 嘅含義要倒轉嚟寫（而家係確保冇 "Last week's habits:" 字眼，B 之後要確保有「上週」/review range 字眼）。注意呢個 test file 已經被 WIP 改咗（+114 lines），B 嘅 test 改動要 lay 喺 WIP version 上面。

### Option C — 加「Review week vs Plan week」兩個 anchor／切換
- 最誠實嘅長期方案（完全對應「計劃下星期 + review 上星期」mental model，仲可以睇任意組合）。
- Trade-offs：要加 state（reviewWeekStart + planWeekStart）、loadWeek 要兩次 fetch、`syncGoals` 要明確 target plan week、key events 都要定跟邊個 week、tests 大改；而且**同 uncommitted WORK-toggle WIP 撞得好勁**（WIP 重寫緊 state / loadWeek / save / mode 喺同一個 component）。
- **結論：而家唔做，等 WIP（t_0e736d8f）land 咗先算。** 如果第時想「兩個星期各自獨立」先再開。

## 5. 對未 commit WORK-toggle WIP 嘅協調重點（避免撞 code）

- WIP 改咗：`server/db.js`（mode column + migration）、`weeklyReviews.js` / `weeklyObjectives.js`（mode param）、`src/api.js`（mode）、`WeeklyReview.jsx`（mode state／loadWeek／save／weekRangeLabel＋mode 字眼／segmented control）、`WeeklyObjectives.jsx`、`WeeklyReview.css`、兩個 test files + `wrModeStorage.test.jsx`。
- Option B 嘅 touch points 全部都係 WIP 版入面「淨係加嘢」：唔改 mode state、唔改 DB、唔改 API、唔改 CSS。真係會 overlap 嘅只有：
  1. line 357 附近（loadWeek 個 body——WIP 已經改咗 getByWeek 個 call，B 只係喺同一 function 加 offset 變數 + 改 getAll 參數）；
  2. line 759 (chips 標題，用緊 `weekRangeLabel`——WIP 改咗呢個變數嘅組成（加 modeLabel），B 加一個新變數 `reviewWeekRangeLabel` 就完全唔掂到佢）。
- 建議次序：**等 WIP commit 咗先 implement B（或者開 branch rebase 喺 WIP 上面）**；唔好由 HEAD 起手寫 B，否則 diff 會同 WIP 撞。

## 6. Recommendation（recommend to Anderson）

**Option B**：
1. Habit entries fetch 由「selected week」改為「selected week − 1」（review week），chips 標題明確顯示「上週 (Review week: 範圍)」。
2. Default selection **唔改**（保持噚日 heuristic——星期日開 app 啱好 = review week；而且改 default 會影響 doc 載入，風險唔抵）。可以之後當 UX 甜頭再做 A'（週末 default 跳去 plan week），但唔係呢個 fix 嘅一部分。
3. 唔做 Option A（對 Sunday flow 嚟講錯 week）；Option C 留返 WIP 之後先考慮。
4. （Follow-up 機會，唔喺今次 scope）Key events grid 有同一 conflation，將來可以跟 review week 行。

下一步：等 Anderson 揀 option → dev 開 openspec proposal（`weekly-review-habit-review-week` 之類）→ board → dev-builder 實作（記住 WIP 先 commit）。