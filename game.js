/* ============================================================
   Are You Smarter Than an AI?  —  game logic
   ============================================================ */

// ----- Money ladder (11 rungs) -----
const LADDER = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
// Safe havens: reaching these banks the money even if you later miss.
const MILESTONES = [4, 9]; // indices into LADDER  ($10,000 and $500,000)
// Difficulty ramp: which grade each of the 11 questions comes from.
const GRADE_PLAN = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5];

const fmt = (n) => "$" + n.toLocaleString("en-US");
const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ----- Game state -----
let state;

function newState() {
  return {
    questions: buildRound(),
    idx: 0,
    youCorrect: 0,
    aiCorrect: 0,
    banked: 0,
    answered: false,
    aiPick: null,        // AI's chosen option index for current question
    peeked: false,
    lifelines: { peek: true, copy: true, save: true }, // true = available
    saveArmed: false,
  };
}

// Give every bank question a stable id so we can remember which ones
// have been shown across games (localStorage).
QUESTION_BANK.forEach((q, i) => (q.id = i));

const SEEN_KEY = "aysta_seen_v1";
function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; }
  catch (e) { return []; }
}
function saveSeen(list) {
  // Keep the most recent ~2/3 of the bank so questions eventually recycle.
  const cap = Math.floor(QUESTION_BANK.length * 0.66);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-cap))); }
  catch (e) { /* storage unavailable — no problem */ }
}

// Assemble 11 questions along the grade ramp. Prefer questions the player
// hasn't seen recently, so a dozen+ games in a row won't repeat.
function buildRound() {
  const byGrade = {};
  QUESTION_BANK.forEach((q) => {
    (byGrade[q.grade] = byGrade[q.grade] || []).push(q);
  });

  const seen = loadSeen();          // ids, oldest first -> newest last
  const recency = (q) => {
    const i = seen.lastIndexOf(q.id);
    return i === -1 ? -1 : i;        // -1 (never seen) sorts first
  };

  const usedThisRound = new Set();
  const round = [];
  GRADE_PLAN.forEach((g) => {
    const pool = byGrade[g]
      .filter((q) => !usedThisRound.has(q.id))
      .sort((a, b) => recency(a) - recency(b) || Math.random() - 0.5);
    const chosen = pool[0];
    usedThisRound.add(chosen.id);
    seen.push(chosen.id);
    round.push(withShuffledOptions(chosen));
  });

  saveSeen(seen);
  return round;
}

// Return a copy of the question with its answer choices shuffled,
// so "Copy" and answer positions aren't predictable game to game.
function withShuffledOptions(q) {
  const order = shuffle(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
  };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Decide what the AI answers. It's smart... except on the silly stuff.
function decideAiPick(q) {
  const wrongChance = q.aiTricky ? 0.85 : 0.08;
  if (Math.random() < wrongChance) {
    const wrongs = q.options.map((_, i) => i).filter((i) => i !== q.answer);
    return pick(wrongs);
  }
  return q.answer;
}

/* ============================================================
   Screen flow
   ============================================================ */
function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(screenId).classList.add("active");
}

function startGame() {
  state = newState();
  buildLadder();
  show("screen-game");
  loadQuestion();
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
  LADDER.forEach((_, i) => {
    const r = $("rung-" + i);
    r.classList.toggle("current", i === state.idx);
    r.classList.toggle("done", i < state.idx);
  });
}

/* ============================================================
   Question rendering
   ============================================================ */
function loadQuestion() {
  const q = state.questions[state.idx];
  state.answered = false;
  state.peeked = false;
  state.aiPick = decideAiPick(q);

  $("qnum").textContent = `Question ${state.idx + 1} of ${LADDER.length}`;
  $("badge-subject").textContent = q.subject;
  $("badge-grade").textContent = "Grade " + q.grade;
  $("question").textContent = q.q;
  $("score-you").textContent = state.youCorrect;
  $("score-ai").textContent = state.aiCorrect;
  paintLadder();

  // Options
  const wrap = $("options");
  wrap.innerHTML = "";
  q.options.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = `<span class="key">${"ABCD"[i]}</span><span>${text}</span>`;
    b.addEventListener("click", () => choose(i));
    wrap.appendChild(b);
  });

  // Reset AI + lifeline UI — fresh banter every question.
  setAi("🤖", nextIntro());
  $("btn-next").classList.add("hidden");
  refreshLifelines();

  // On small screens, slide the current rung into view.
  const rung = $("rung-" + state.idx);
  if (rung && innerWidth <= 760) rung.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

// Rotating opening lines so the AI never says the same thing twice in a row.
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
    const available = state.lifelines[name] && !state.answered;
    btn.disabled = !available;
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
   Answering
   ============================================================ */
function choose(i) {
  if (state.answered) return;
  state.answered = true;
  const q = state.questions[state.idx];
  const opts = document.querySelectorAll(".opt");
  opts.forEach((o) => (o.disabled = true));

  const youRight = i === q.answer;
  const aiRight = state.aiPick === q.answer;
  if (aiRight) state.aiCorrect++;

  // Mark correct answer + your pick
  opts[q.answer].classList.add("correct");
  if (!youRight) opts[i].classList.add("wrong");

  // Show what the AI picked
  tagAiPick();
  $("score-ai").textContent = state.aiCorrect;

  refreshLifelines();

  if (youRight) {
    state.youCorrect++;
    $("score-you").textContent = state.youCorrect;
    updateBanked();
    sfx("correct");
    setAi("😎", aiRewardLine(aiRight));
    proceedAfter(true);
  } else if (state.saveArmed) {
    // Lifeline saves you — game continues.
    state.saveArmed = false;
    sfx("save");
    setAi("😅", "Whoa! Your <b>🛟 Save</b> lifeline caught that one. You live to climb again!");
    proceedAfter(true);
  } else {
    sfx("wrong");
    setAi("🤖", aiTauntLine(aiRight));
    proceedAfter(false);
  }
}

function tagAiPick() {
  const opts = document.querySelectorAll(".opt");
  const el = opts[state.aiPick];
  el.classList.add("ai-pick");
  if (!el.querySelector(".ai-tag")) {
    const tag = document.createElement("span");
    tag.className = "ai-tag";
    tag.textContent = "🤖 AI";
    el.appendChild(tag);
  }
}

function updateBanked() {
  // Bank the highest milestone amount at or below the rung just cleared.
  for (let m = MILESTONES.length - 1; m >= 0; m--) {
    if (state.idx >= MILESTONES[m]) { state.banked = LADDER[MILESTONES[m]]; break; }
  }
  if (state.idx === LADDER.length - 1) state.banked = LADDER[LADDER.length - 1];
}

function proceedAfter(survived) {
  const last = state.idx === LADDER.length - 1;
  if (!survived) {
    setTimeout(() => endGame(false), 1400);
    return;
  }
  if (last) {
    setTimeout(() => endGame(true), 1200);
    return;
  }
  const btn = $("btn-next");
  btn.classList.remove("hidden");
  btn.textContent = state.idx === LADDER.length - 2 ? "Final Question →" : "Next Question →";
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
    state.peeked = true;
    tagAiPick();
    const conf = state.questions[state.idx].aiTricky ? "pretty confident, but…" : "quite confident.";
    setAi("🤔", `I'm going with <b>${"ABCD"[state.aiPick]}</b>. I'm ${conf}`);
    sfx("blip");
    refreshLifelines();

  } else if (name === "copy") {
    state.lifelines.copy = false;
    sfx("blip");
    setAi("🤖", "Copying my answer… good luck with that.", true);
    refreshLifelines();
    setTimeout(() => choose(state.aiPick), 650);

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
   End screen
   ============================================================ */
function endGame(won) {
  const smarter = state.youCorrect > state.aiCorrect;
  $("end-winnings").textContent = fmt(won ? LADDER[LADDER.length - 1] : state.banked);
  $("end-you").textContent = state.youCorrect;
  $("end-ai").textContent = state.aiCorrect;

  if (won) {
    $("end-emoji").textContent = "🏆";
    $("end-title").textContent = "You Beat the Machine!";
    $("end-msg").innerHTML = `You climbed all the way to <b>${fmt(LADDER[LADDER.length - 1])}</b>. ` +
      (smarter ? "And you out-answered the AI. You really <i>are</i> smarter than an AI!"
               : "The AI kept pace — but the top of the ladder is yours.");
    sfx("win");
    confettiBurst();
  } else {
    $("end-emoji").textContent = smarter ? "🙂" : "🤖";
    $("end-title").textContent = smarter ? "Not Bad, Human!" : "The AI Wins This Round";
    $("end-msg").innerHTML = `You made it to question <b>${state.idx + 1}</b> and banked <b>${fmt(state.banked)}</b>. ` +
      (smarter ? "You still out-scored the AI up to that point — respectable!"
               : "The AI edged you out. Run it back?");
    if (smarter) { sfx("correct"); confettiBurst(0.5); }
    else sfx("wrong");
  }

  // Track and show the player's personal best.
  const winnings = won ? LADDER[LADDER.length - 1] : state.banked;
  let best = 0;
  try { best = parseInt(localStorage.getItem("aysta_best") || "0", 10) || 0; } catch (e) {}
  const isRecord = winnings > best;
  if (isRecord) { best = winnings; try { localStorage.setItem("aysta_best", String(best)); } catch (e) {} }
  const bestEl = $("end-best");
  if (bestEl) bestEl.innerHTML = isRecord && winnings > 0
    ? `🎉 New personal best: <b>${fmt(best)}</b>`
    : `Personal best: <b>${fmt(best)}</b>`;

  show("screen-end");
}

/* ============================================================
   Sound effects (Web Audio — no files needed)
   ============================================================ */
let actx;
function sfx(type) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    const notes = {
      correct: [[523, 0], [659, 0.09], [784, 0.18]],
      wrong: [[196, 0], [155, 0.12]],
      save: [[440, 0], [660, 0.1], [880, 0.2]],
      blip: [[720, 0]],
      win: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38], [784, 0.5], [1047, 0.6]],
    }[type] || [[440, 0]];
    notes.forEach(([freq, t]) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = type === "wrong" ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
      osc.connect(gain).connect(actx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.24);
    });
  } catch (e) { /* audio not available — no problem */ }
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
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -14 - 4,
    g: 0.3 + Math.random() * 0.2,
    size: 5 + Math.random() * 7,
    color: pick(colors),
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    life: 90 + Math.random() * 40,
  }));
  let frame = 0;
  (function anim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    frame++;
    if (frame < 160) requestAnimationFrame(anim);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

/* ============================================================
   Wiring
   ============================================================ */
function wire() {
  $("btn-start").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);
  $("btn-next").addEventListener("click", nextQuestion);
  $("btn-how").addEventListener("click", () => $("modal").classList.remove("hidden"));
  $("btn-close-modal").addEventListener("click", () => $("modal").classList.add("hidden"));
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });

  document.querySelectorAll(".lifeline").forEach((btn) =>
    btn.addEventListener("click", () => useLifeline(btn.dataset.life))
  );

  // Keyboard: A/B/C/D or 1-4 to answer, N for next.
  document.addEventListener("keydown", (e) => {
    if (!$("screen-game").classList.contains("active")) return;
    const k = e.key.toLowerCase();
    const map = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
    if (k in map && !state.answered) {
      const opts = document.querySelectorAll(".opt");
      if (opts[map[k]]) choose(map[k]);
    } else if (k === "n" && !$("btn-next").classList.contains("hidden")) {
      nextQuestion();
    }
  });
}

wire();
