# 🤖 Are You Smarter Than an AI?

A quick, fun trivia game show — inspired by *Are You Smarter Than a 5th Grader?* — where you go **head-to-head against an AI** on grade-school questions. Climb the money ladder from $100 to $1,000,000. The catch? The AI is brilliant at hard stuff but famously fumbles the silly, simple things. Can you out-smart the machine?

### ▶️ [Play it live](https://jnpeters314.github.io/are-you-smarter-than-an-ai/)

## How to play
Pick a **category** and a **mode**, then take on the AI:

- **🪜 Classic Ladder** — 11 questions climbing $100 → $1,000,000. Difficulty **adapts** to how well you're doing.
- **⚔️ Sudden Death** — you and the AI face the same questions. One miss and you're out — but if the *AI* cracks first (it fumbles the silly ones!), you win.

Every question is **timed** ⏱️ — beat the bar or it counts against you. The AI answers too; beat its score to prove you're smarter.

**Categories:** 🎲 Mixed · Pop Culture · Math · Science & Nature · History & Geography · Words & Language · Brain Teasers.

**Lifelines** (once each per game):
- **👀 Peek** — reveal the AI's answer, then decide for yourself.
- **📋 Copy** — instantly lock in the AI's pick (risky when it's being silly!).
- **🛟 Save** — survive one wrong answer (or a timeout) and keep going.

Share your result with one tap, and the game tracks your **personal best**. Keyboard shortcuts: `A`/`B`/`C`/`D` (or `1`–`4`) to answer, `N` for next.

**187 questions** across all grades and categories, with a "recently seen" memory so a dozen+ games in a row rarely repeat.

## Run locally
It's plain HTML/CSS/JS — no build step. Just open `index.html`, or:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Add your own questions
Edit [`questions.js`](questions.js). Set `aiTricky: true` on questions the AI should tend to get *wrong* (counting letters, simple logic traps, etc.) — that's the fun.

---
Built with vanilla JS. Sound effects are synthesized in-browser (Web Audio), so there are no asset files to download.
