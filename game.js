/* ============================================================
   Are You Smarter Than an AI?  —  game logic
   ============================================================ */

// ----- Money ladder (Classic mode) -----
const LADDER = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const MILESTONES = [4, 9];                     // safe havens: $10,000 and $500,000
const GRADE_PLAN = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5]; // base difficulty ramp per rung

// ----- Timers (seconds) -----
const TIME_CLASSIC = 20;
const TIME_SUDDEN = 15;

const fmt = (n) => "$" + n.toLocaleString("en-US");
const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ============================================================
   Categories
   ============================================================ */
const CATEGORIES = ["Mixed", "Pop Culture", "US Capitals", "Math", "Science & Nature", "History & Geography", "Words & Language", "Brain Teasers"];
const SUBJECT_CATEGORY = {
  Math: "Math", Counting: "Math", Shapes: "Math", Money: "Math", Time: "Math",
  Science: "Science & Nature", Space: "Science & Nature", Body: "Science & Nature",
  Nature: "Science & Nature", Animals: "Science & Nature", Weather: "Science & Nature",
  Colors: "Science & Nature", Food: "Science & Nature",
  History: "History & Geography", Geography: "History & Geography",
  Grammar: "Words & Language", Spelling: "Words & Language", English: "Words & Language",
  Wordplay: "Words & Language", Opposites: "Words & Language",
  Logic: "Brain Teasers", "Pop Culture": "Pop Culture", "US Capitals": "US Capitals",
};
// The "tricky" questions ARE brain teasers, wherever they live.
const catOf = (q) => (q.aiTricky ? "Brain Teasers" : SUBJECT_CATEGORY[q.subject] || "Mixed");
const inCategory = (q, cat) => cat === "Mixed" || catOf(q) === cat;

/* ============================================================
   Question bank prep + "recently seen" memory
   ============================================================ */
QUESTION_BANK.forEach((q, i) => (q.id = i));

const SEEN_KEY = "aysta_seen_v1";
function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; }
  catch (e) { return []; }
}
function saveSeen(list) {
  const cap = Math.floor(QUESTION_BANK.length * 0.66);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-cap))); }
  catch (e) {}
}

// Draw one fresh question: preferred grade + category, least-recently-seen,
// not used yet this game. Falls back to the nearest grade, then anywhere.
function drawQuestion(targetGrade, category) {
  const seen = loadSeen();
  const rank = (q) => { const i = seen.lastIndexOf(q.id); return i === -1 ? -1 : i; };
  const pool = QUESTION_BANK.filter((q) => inCategory(q, category));
  const gradesByCloseness = [1, 2, 3, 4, 5].sort(
    (a, b) => Math.abs(a - targetGrade) - Math.abs(b - targetGrade) || a - b
  );

  for (const g of gradesByCloseness) {
    const cand = pool.filter((q) => q.grade === g && !state.usedIds.has(q.id));
    if (cand.length) {
      cand.sort((a, b) => rank(a) - rank(b) || Math.random() - 0.5);
      return commitDraw(cand[0], seen);
    }
  }
  // Every question in this category has been used this game — allow reuse.
  const leftover = pool.filter((q) => !state.usedIds.has(q.id));
  const chosen = leftover.length ? pick(leftover) : pick(pool.length ? pool : QUESTION_BANK);
  return commitDraw(chosen, seen);
}

function commitDraw(q, seen) {
  state.usedIds.add(q.id);
  seen.push(q.id);
  saveSeen(seen);
  return withShuffledOptions(q);
}

// Copy the question with its answer choices shuffled.
function withShuffledOptions(q) {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The AI is brilliant... except on the silly stuff (that's the joke).
function decideAiPick(q) {
  const wrongChance = q.aiTricky ? 0.85 : 0.08;
  if (Math.random() < wrongChance) {
    const wrongs = q.options.map((_, i) => i).filter((i) => i !== q.answer);
    return pick(wrongs);
  }
  return q.answer;
}

/* ============================================================
   Daily Challenge — same 11 questions for everyone, per (UTC) day.
   Built from a date-seeded RNG so it's fully deterministic.
   ============================================================ */
function dailySeedId() {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); // e.g. 20260719
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function buildDailyQuestions(seedId) {
  const rng = mulberry32(seedId);
  const rShuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const byGrade = {};
  QUESTION_BANK.forEach((q) => { (byGrade[q.grade] = byGrade[q.grade] || []).push(q); });
  // Sort by id first for a stable base order, then seed-shuffle — identical everywhere.
  Object.keys(byGrade).forEach((g) => { byGrade[g].sort((a, b) => a.id - b.id); rShuffle(byGrade[g]); });

  const used = new Set();
  return GRADE_PLAN.map((g) => {
    const poolForGrade = byGrade[g];
    let q = poolForGrade.find((x) => !used.has(x.id)) || poolForGrade[0];
    used.add(q.id);
    const order = rShuffle(q.options.map((_, i) => i));
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  });
}

/* ----- Sound on/off (persisted) ----- */
let muted = false;
try { muted = localStorage.getItem("aysta_muted") === "1"; } catch (e) {}
function toggleSound() {
  muted = !muted;
  try { localStorage.setItem("aysta_muted", muted ? "1" : "0"); } catch (e) {}
  paintSoundButton();
}
function paintSoundButton() {
  const b = $("btn-sound");
  if (b) { b.textContent = muted ? "🔇" : "🔊"; b.title = muted ? "Sound off (click for sound)" : "Sound on (click to mute)"; }
}

/* ============================================================
   State
   ============================================================ */
let state;

function newState(mode, category) {
  return {
    mode, category,
    idx: 0,
    youCorrect: 0,
    aiCorrect: 0,
    streak: 0,          // sudden-death survival counter
    banked: 0,
    adapt: 0,           // adaptive-difficulty offset, grows with performance
    usedIds: new Set(),
    q: null,
    aiPick: null,
    answered: false,
    lifelines: { peek: true, copy: true, save: true },
    saveArmed: false,
    timerId: null,
    timeLeft: 0,
  };
}

/* ============================================================
   Screen flow + setup
   ============================================================ */
function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(screenId).classList.add("active");
}

let chosenMode = "classic";
function startGame() {
  if (state && state.timerId) clearInterval(state.timerId); // don't leak a prior timer
  const category = $("sel-category").value;
  state = newState(chosenMode, category);
  document.body.classList.toggle("sudden", chosenMode === "sudden");
  if (chosenMode !== "sudden") buildLadder();
  show("screen-game");
  loadQuestion();
}

function startDaily() {
  if (state && state.timerId) clearInterval(state.timerId);
  state = newState("daily", "Mixed");
  state.dailyQuestions = buildDailyQuestions(dailySeedId());
  document.body.classList.remove("sudden");
  buildLadder();
  show("screen-game");
  loadQuestion();
}

// Show whether today's Daily has already been completed.
function updateDailyStatus() {
  const el = $("daily-status");
  if (!el) return;
  let rec = null;
  try { rec = JSON.parse(localStorage.getItem("aysta_daily_" + dailySeedId())); } catch (e) {}
  el.innerHTML = rec
    ? `✅ Today's done — you banked <b>${fmt(rec.winnings)}</b> (You ${rec.you} vs AI ${rec.ai}). Play again or share!`
    : "One shared challenge a day — same questions for everyone.";
}

function buildLadder() {
  const el = $("ladder");
  el.innerHTML = "";
  LADDER.forEach((amt, i) => {
    const div = document.createElement("div");
    div.className = "rung" + (MILESTONES.includes(i) ? " milestone" : "");
    div.id = "rung-" + i;
    div.innerHTML = `<span class="lvl">Q${i + 1}</span><span class="amt">${fmt(amt)}</span>`;
    el.appendChild(div);
  });
}

function paintLadder() {
  if (state.mode === "sudden") return;
  LADDER.forEach((_, i) => {
    const r = $("rung-" + i);
    r.classList.toggle("current", i === state.idx);
    r.classList.toggle("done", i < state.idx);
  });
}

// Difficulty for the upcoming question.
function targetGrade() {
  if (state.mode === "classic") {
    return clamp(Math.round(GRADE_PLAN[state.idx] + state.adapt), 1, 5);
  }
  // Sudden death: ramp with survival streak.
  return clamp(1 + Math.floor(state.streak / 2) + Math.round(state.adapt), 1, 5);
}

/* ============================================================
   Question rendering
   ============================================================ */
function loadQuestion() {
  const q = state.mode === "daily"
    ? state.dailyQuestions[state.idx]
    : drawQuestion(targetGrade(), state.category);
  state.q = q;
  state.answered = false;
  state.aiPick = decideAiPick(q);

  $("qnum").textContent =
    state.mode === "sudden" ? `Round ${state.idx + 1} — survive!` :
    state.mode === "daily"  ? `🗓️ Daily Challenge · Question ${state.idx + 1} of ${LADDER.length}` :
                              `Question ${state.idx + 1} of ${LADDER.length}`;
  $("badge-subject").textContent = q.subject;
  $("badge-grade").textContent = "Grade " + q.grade;
  $("question").textContent = q.q;
  updateScoreline();
  paintLadder();

  const wrap = $("options");
  wrap.innerHTML = "";
  q.options.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = `<span class="key">${"ABCD"[i]}</span><span>${text}</span>`;
    b.addEventListener("click", () => resolveAnswer(i));
    wrap.appendChild(b);
  });

  setAi("🤖", nextIntro());
  $("btn-next").classList.add("hidden");
  refreshLifelines();
  startTimer();

  const rung = $("rung-" + state.idx);
  if (rung && innerWidth <= 760) rung.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function updateScoreline() {
  if (state.mode === "sudden") {
    $("scoreline").innerHTML = `🔥 Streak <b>${state.streak}</b> &middot; You <b>${state.youCorrect}</b> / AI <b>${state.aiCorrect}</b>`;
  } else {
    $("scoreline").innerHTML = `You <b>${state.youCorrect}</b> &middot; <b>${state.aiCorrect}</b> AI`;
  }
}

// Rotating opening lines so the AI never repeats back-to-back.
const INTROS = [
  "Question {n}. Let's see what you've got, human.",
  "Question {n}. I've already solved this. Have you?",
  "Round {n}. Try not to embarrass yourself.",
  "Question {n}. My circuits are ready. Are you?",
  "Here's #{n}. I'm feeling confident. Should you be?",
  "Question {n}. Fun fact: I read this in 0.0003 seconds.",
  "Number {n}. Take your time. I already know the answer.",
  "Question {n}. Let's find out who's really smarter.",
  "Question {n}. No pressure… but there's a little pressure.",
  "#{n}. I promise not to gloat. Much.",
  "Question {n}. Beep boop — good luck, carbon-based friend.",
  "Question {n}. This one looks easy. For me, anyway.",
  "Round {n}. Show me what human intuition can do.",
  "Question {n}. I've seen a million of these. Literally.",
  "Number {n}. Deep breath. You've got this. Maybe.",
];
let lastIntro = -1;
function nextIntro() {
  let i;
  do { i = Math.floor(Math.random() * INTROS.length); } while (i === lastIntro && INTROS.length > 1);
  lastIntro = i;
  return INTROS[i].replace("{n}", state.idx + 1);
}

function refreshLifelines() {
  ["peek", "copy", "save"].forEach((name) => {
    const btn = $("life-" + name);
    btn.disabled = !(state.lifelines[name] && !state.answered);
    btn.classList.toggle("used", !state.lifelines[name]);
  });
  $("life-save").classList.toggle("armed", state.saveArmed);
}

function setAi(face, text, thinking = false) {
  $("ai-face").textContent = face;
  $("ai-face").classList.toggle("thinking", thinking);
  $("ai-speech").innerHTML = text;
}

/* ============================================================
   Timer
   ============================================================ */
function startTimer() {
  stopTimer();
  const total = state.mode === "sudden" ? TIME_SUDDEN : TIME_CLASSIC;
  state.timeLeft = total;
  const fill = $("timer-fill");
  const num = $("timer-num");
  const paint = () => {
    const frac = Math.max(0, state.timeLeft / total);
    fill.style.width = (frac * 100) + "%";
    num.textContent = Math.ceil(state.timeLeft);
    const urgent = state.timeLeft <= 5;
    $("timer").classList.toggle("urgent", urgent);
  };
  paint();
  let lastWhole = Math.ceil(state.timeLeft);
  state.timerId = setInterval(() => {
    state.timeLeft -= 0.1;
    const whole = Math.ceil(state.timeLeft);
    if (whole !== lastWhole && whole <= 5 && whole >= 1) sfx("tick");
    lastWhole = whole;
    if (state.timeLeft <= 0) { stopTimer(); resolveAnswer(-1); return; } // ran out
    paint();
  }, 100);
}
function stopTimer() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  $("timer").classList.remove("urgent");
}

/* ============================================================
   Answering  (pickedIndex === -1 means the clock ran out)
   ============================================================ */
function resolveAnswer(pickedIndex) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.q;
  const opts = document.querySelectorAll(".opt");
  opts.forEach((o) => (o.disabled = true));

  const timedOut = pickedIndex === -1;
  const youRight = !timedOut && pickedIndex === q.answer;
  const aiRight = state.aiPick === q.answer;
  if (aiRight) state.aiCorrect++;

  opts[q.answer].classList.add("correct");
  if (!timedOut && !youRight) opts[pickedIndex].classList.add("wrong");
  tagAiPick();
  updateScoreline();
  refreshLifelines();

  // Adaptive difficulty: reward correct answers, ease off after a miss.
  state.adapt = youRight ? Math.min(state.adapt + 0.5, 1.6) : Math.max(state.adapt - 1, -1);

  if (youRight) {
    state.youCorrect++;
    if (state.mode === "sudden") state.streak++;
    updateScoreline();
    updateBanked();
    sfx("correct");
    setAi("😎", timedOutNote(false) + aiRewardLine(aiRight));
    proceed(true, youRight, aiRight);
  } else if (state.saveArmed) {
    state.saveArmed = false;
    sfx("save");
    setAi("😅", `${timedOut ? "Out of time — but your " : "Whoa! Your "}<b>🛟 Save</b> lifeline caught that one. Keep going!`);
    proceed(true, youRight, aiRight);
  } else {
    sfx("wrong");
    setAi("🤖", timedOutNote(timedOut) + aiTauntLine(aiRight));
    proceed(false, youRight, aiRight);
  }
}

const timedOutNote = (t) => (t ? "Too slow! " : "");

function tagAiPick() {
  const el = document.querySelectorAll(".opt")[state.aiPick];
  el.classList.add("ai-pick");
  if (!el.querySelector(".ai-tag")) {
    const tag = document.createElement("span");
    tag.className = "ai-tag";
    tag.textContent = "🤖 AI";
    el.appendChild(tag);
  }
}

function updateBanked() {
  if (state.mode === "sudden") return;
  for (let m = MILESTONES.length - 1; m >= 0; m--) {
    if (state.idx >= MILESTONES[m]) { state.banked = LADDER[MILESTONES[m]]; break; }
  }
  if (state.idx === LADDER.length - 1) state.banked = LADDER[LADDER.length - 1];
}

function proceed(survived, youRight, aiRight) {
  if (state.mode === "sudden") return proceedSudden(survived, youRight, aiRight);

  // ---- Classic ----
  const last = state.idx === LADDER.length - 1;
  if (!survived) { setTimeout(() => endGame(false), 1500); return; }
  if (last) { setTimeout(() => endGame(true), 1300); return; }
  const btn = $("btn-next");
  btn.classList.remove("hidden");
  btn.textContent = state.idx === LADDER.length - 2 ? "Final Question →" : "Next Question →";
}

function proceedSudden(survived, youRight, aiRight) {
  // You got it and the AI blew it — instant victory.
  if (youRight && !aiRight) { setTimeout(() => endGame(true, "ai-cracked"), 1400); return; }
  // You missed (and weren't saved) — eliminated.
  if (!survived) { setTimeout(() => endGame(false), 1500); return; }
  // Both correct (or you were saved) — keep going.
  const btn = $("btn-next");
  btn.classList.remove("hidden");
  btn.textContent = "Next Round →";
}

function nextQuestion() {
  state.idx++;
  loadQuestion();
}

/* ============================================================
   Lifelines
   ============================================================ */
function useLifeline(name) {
  if (!state.lifelines[name] || state.answered) return;

  if (name === "peek") {
    state.lifelines.peek = false;
    tagAiPick();
    const conf = state.q.aiTricky ? "pretty confident, but…" : "quite confident.";
    setAi("🤔", `I'm going with <b>${"ABCD"[state.aiPick]}</b>. I'm ${conf}`);
    sfx("blip");
    refreshLifelines();

  } else if (name === "copy") {
    state.lifelines.copy = false;
    sfx("blip");
    setAi("🤖", "Copying my answer… good luck with that.", true);
    refreshLifelines();
    setTimeout(() => resolveAnswer(state.aiPick), 650);

  } else if (name === "save") {
    state.lifelines.save = false;
    state.saveArmed = true;
    sfx("blip");
    setAi("🛟", "<b>Save armed.</b> One wrong answer won't sink you now.");
    refreshLifelines();
  }
}

/* ============================================================
   AI banter
   ============================================================ */
function aiRewardLine(aiRight) {
  if (aiRight) return pick(["Correct — same as me. Barely.", "We agree. This time.", "Fine, you got that one too."]);
  return pick(["You got it… and I <i>didn't</i>. Don't get used to it.", "Ugh, you beat me on that one!", "Correct! Meanwhile I short-circuited. 🙃"]);
}
function aiTauntLine(aiRight) {
  if (aiRight) return pick(["Wrong! I had that one, obviously.", "Nope. I'll take it from here.", "Incorrect. Beep boop, I win this round."]);
  return pick(["Wrong… though I whiffed it too. Draw?", "We <i>both</i> missed that? Embarrassing.", "Incorrect — but hey, I wasn't sure either."]);
}

/* ============================================================
   End screen + sharing
   ============================================================ */
let lastResult = null; // for the share card

function endGame(won, reason) {
  document.body.classList.remove("sudden");
  const smarter = state.youCorrect > state.aiCorrect;

  if (state.mode !== "sudden") {
    const isDaily = state.mode === "daily";
    const winnings = won ? LADDER[LADDER.length - 1] : state.banked;
    $("end-stat-main").textContent = fmt(winnings);
    $("end-stat-label").textContent = "Banked";
    if (won) {
      $("end-emoji").textContent = "🏆";
      $("end-title").textContent = isDaily ? "Daily Challenge Complete!" : "You Beat the Machine!";
      $("end-msg").innerHTML = `You climbed all the way to <b>${fmt(winnings)}</b>. ` +
        (smarter ? "And you out-answered the AI. You really <i>are</i> smarter than an AI!"
                 : "The AI kept pace — but the top of the ladder is yours.");
      sfx("win"); confettiBurst();
    } else {
      $("end-emoji").textContent = smarter ? "🙂" : "🤖";
      $("end-title").textContent = smarter ? "Not Bad, Human!" : "The AI Wins This Round";
      $("end-msg").innerHTML = `You reached question <b>${state.idx + 1}</b> and banked <b>${fmt(winnings)}</b>. ` +
        (smarter ? "You still out-scored the AI up to that point — respectable!" : "The AI edged you out. Run it back?");
      if (smarter) { sfx("correct"); confettiBurst(0.5); } else sfx("wrong");
    }
    if (isDaily) {
      try {
        localStorage.setItem("aysta_daily_" + dailySeedId(),
          JSON.stringify({ winnings, you: state.youCorrect, ai: state.aiCorrect, won }));
      } catch (e) {}
      updateDailyStatus();
      $("end-best").innerHTML = "🗓️ Same challenge for everyone today — come back tomorrow for a new one!";
    } else {
      updateBest("aysta_best", winnings, fmt);
    }
    lastResult = { mode: isDaily ? "Daily Challenge" : "Classic", won, main: fmt(winnings), you: state.youCorrect, ai: state.aiCorrect };
  } else {
    // ---- Sudden death ----
    $("end-stat-main").textContent = state.streak;
    $("end-stat-label").textContent = "Streak";
    if (won) {
      $("end-emoji").textContent = "⚡";
      $("end-title").textContent = reason === "ai-cracked" ? "You Outlasted the AI!" : "You Survived!";
      $("end-msg").innerHTML = `You answered <b>${state.streak}</b> in a row and the <b>AI cracked first</b>. Human intuition wins!`;
      sfx("win"); confettiBurst();
    } else {
      $("end-emoji").textContent = "🤖";
      $("end-title").textContent = "Eliminated!";
      $("end-msg").innerHTML = `You survived <b>${state.streak}</b> round${state.streak === 1 ? "" : "s"} before slipping up. ` +
        (state.aiCorrect >= state.streak + 1 ? "The AI is still standing." : "But you gave the AI a real scare!");
      sfx("wrong");
    }
    updateBest("aysta_best_streak", state.streak, String);
    lastResult = { mode: "Sudden Death", won, main: state.streak + " streak", you: state.youCorrect, ai: state.aiCorrect };
  }

  $("end-you").textContent = state.youCorrect;
  $("end-ai").textContent = state.aiCorrect;
  $("btn-share").textContent = "📋 Share result";
  show("screen-end");
}

function updateBest(key, value, fmtFn) {
  let best = 0;
  try { best = parseInt(localStorage.getItem(key) || "0", 10) || 0; } catch (e) {}
  const isRecord = value > best;
  if (isRecord) { best = value; try { localStorage.setItem(key, String(best)); } catch (e) {} }
  const el = $("end-best");
  el.innerHTML = isRecord && value > 0
    ? `🎉 New personal best: <b>${fmtFn(best)}</b>`
    : `Personal best: <b>${fmtFn(best)}</b>`;
}

function shareResult() {
  if (!lastResult) return;
  const r = lastResult;
  const url = "https://jnpeters314.github.io/are-you-smarter-than-an-ai/";
  const brag = r.won ? "I beat the AI" : "The AI got me";
  const text = `🤖 Are You Smarter Than an AI? — ${r.mode}\n${brag}! Result: ${r.main} · Me ${r.you} vs AI ${r.ai}.\nThink you can do better? ${url}`;
  const done = () => { $("btn-share").textContent = "✅ Copied!"; setTimeout(() => ($("btn-share").textContent = "📋 Share result"), 2000); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) {}
  document.body.removeChild(ta);
}

/* ============================================================
   Sound effects (Web Audio — no files needed)
   ============================================================ */
let actx;
function sfx(type) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    const notes = {
      correct: [[523, 0], [659, 0.09], [784, 0.18]],
      wrong: [[196, 0], [155, 0.12]],
      save: [[440, 0], [660, 0.1], [880, 0.2]],
      blip: [[720, 0]],
      tick: [[1200, 0]],
      win: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38], [784, 0.5], [1047, 0.6]],
    }[type] || [[440, 0]];
    const dur = type === "tick" ? 0.07 : 0.22;
    notes.forEach(([freq, t]) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = type === "wrong" ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(type === "tick" ? 0.12 : 0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
      osc.connect(gain).connect(actx.destination);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.02);
    });
  } catch (e) {}
}

/* ============================================================
   Confetti
   ============================================================ */
function confettiBurst(scale = 1) {
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ["#ffd23f", "#ff5da2", "#38e8ff", "#35d07f", "#ff5964"];
  const N = Math.floor(160 * scale);
  const parts = Array.from({ length: N }, () => ({
    x: innerWidth / 2, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 4,
    g: 0.3 + Math.random() * 0.2, size: 5 + Math.random() * 7,
    color: pick(colors), rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
  }));
  let frame = 0;
  (function anim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (++frame < 160) requestAnimationFrame(anim);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

/* ============================================================
   Wiring
   ============================================================ */
function wire() {
  // Populate category dropdown.
  const sel = $("sel-category");
  CATEGORIES.forEach((c) => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c === "Mixed" ? "🎲 Mixed (everything)" : c;
    sel.appendChild(o);
  });

  // Mode toggle.
  document.querySelectorAll(".mode-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      chosenMode = btn.dataset.mode;
      document.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
    })
  );

  $("btn-start").addEventListener("click", startGame);
  $("btn-daily").addEventListener("click", startDaily);
  $("btn-again").addEventListener("click", () => { updateDailyStatus(); show("screen-start"); });
  $("btn-share").addEventListener("click", shareResult);
  $("btn-next").addEventListener("click", nextQuestion);
  $("btn-sound").addEventListener("click", toggleSound);
  $("btn-how").addEventListener("click", () => $("modal").classList.remove("hidden"));
  $("btn-close-modal").addEventListener("click", () => $("modal").classList.add("hidden"));
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });

  paintSoundButton();
  updateDailyStatus();

  document.querySelectorAll(".lifeline").forEach((btn) =>
    btn.addEventListener("click", () => useLifeline(btn.dataset.life))
  );

  document.addEventListener("keydown", (e) => {
    if (!$("screen-game").classList.contains("active")) return;
    const k = e.key.toLowerCase();
    const map = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
    if (k in map && !state.answered) {
      const opts = document.querySelectorAll(".opt");
      if (opts[map[k]]) resolveAnswer(map[k]);
    } else if (k === "n" && !$("btn-next").classList.contains("hidden")) {
      nextQuestion();
    }
  });
}

wire();
