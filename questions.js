/*
 * Question bank for "Are You Smarter Than an AI?"
 *
 * Each question:
 *   subject : category label (shown on the card)
 *   grade   : 1-5, the grade level the question is "from"
 *   q       : the question text
 *   options : array of 4 answer choices
 *   answer  : index (0-3) of the correct choice
 *   aiTricky: true if this is the kind of thing AIs famously fumble.
 *             When true, the AI opponent has a high chance of getting it WRONG,
 *             giving the human a fighting chance. (This is the joke.)
 */
const QUESTION_BANK = [
  // ---------- GRADE 1 ----------
  {
    subject: "Math", grade: 1,
    q: "What is 7 + 6?",
    options: ["12", "13", "14", "11"], answer: 1
  },
  {
    subject: "Spelling", grade: 1,
    q: "How many letter R's are in the word \"strawberry\"?",
    options: ["1", "2", "3", "4"], answer: 2, aiTricky: true
  },
  {
    subject: "Animals", grade: 1,
    q: "Which of these animals is a mammal?",
    options: ["Shark", "Frog", "Dolphin", "Eagle"], answer: 2
  },
  {
    subject: "Shapes", grade: 1,
    q: "How many sides does a triangle have?",
    options: ["2", "3", "4", "5"], answer: 1
  },
  {
    subject: "Colors", grade: 1,
    q: "Mixing blue and yellow paint makes what color?",
    options: ["Purple", "Green", "Orange", "Brown"], answer: 1
  },

  // ---------- GRADE 2 ----------
  {
    subject: "Math", grade: 2,
    q: "Which number is bigger: 9.9 or 9.11?",
    options: ["9.9", "9.11", "They are equal", "Cannot tell"], answer: 0, aiTricky: true
  },
  {
    subject: "Science", grade: 2,
    q: "What do plants breathe in that people breathe out?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 1
  },
  {
    subject: "Money", grade: 2,
    q: "How many quarters make one dollar?",
    options: ["2", "3", "4", "5"], answer: 2
  },
  {
    subject: "Geography", grade: 2,
    q: "Which of these is an ocean?",
    options: ["Sahara", "Pacific", "Everest", "Amazon"], answer: 1
  },
  {
    subject: "Time", grade: 2,
    q: "How many minutes are in one hour?",
    options: ["30", "45", "60", "100"], answer: 2
  },

  // ---------- GRADE 3 ----------
  {
    subject: "Math", grade: 3,
    q: "What is 8 × 7?",
    options: ["54", "56", "63", "48"], answer: 1
  },
  {
    subject: "Grammar", grade: 3,
    q: "Which word is a verb?",
    options: ["Quickly", "Happy", "Jump", "Blue"], answer: 2
  },
  {
    subject: "Science", grade: 3,
    q: "What is the closest planet to the Sun?",
    options: ["Venus", "Earth", "Mercury", "Mars"], answer: 2
  },
  {
    subject: "Logic", grade: 3,
    q: "A farmer has 17 sheep. All but 9 run away. How many are left?",
    options: ["8", "9", "17", "26"], answer: 1, aiTricky: true
  },
  {
    subject: "Geography", grade: 3,
    q: "How many continents are there on Earth?",
    options: ["5", "6", "7", "8"], answer: 2
  },

  // ---------- GRADE 4 ----------
  {
    subject: "Math", grade: 4,
    q: "What is 1/2 + 1/4?",
    options: ["2/6", "3/4", "1/6", "2/4"], answer: 1
  },
  {
    subject: "History", grade: 4,
    q: "Who was the first President of the United States?",
    options: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"], answer: 2
  },
  {
    subject: "Science", grade: 4,
    q: "What gas do humans need to breathe to live?",
    options: ["Carbon dioxide", "Oxygen", "Hydrogen", "Methane"], answer: 1
  },
  {
    subject: "Wordplay", grade: 4,
    q: "What is the word \"racecar\" an example of?",
    options: ["A synonym", "A palindrome", "An acronym", "A homophone"], answer: 1
  },
  {
    subject: "Geography", grade: 4,
    q: "What is the largest country in the world by land area?",
    options: ["China", "USA", "Canada", "Russia"], answer: 3
  },

  // ---------- GRADE 5 ----------
  {
    subject: "Math", grade: 5,
    q: "What is the value of π (pi) rounded to two decimal places?",
    options: ["3.14", "3.16", "3.41", "2.14"], answer: 0
  },
  {
    subject: "Science", grade: 5,
    q: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Membrane"], answer: 2
  },
  {
    subject: "Logic", grade: 5,
    q: "If a bat and a ball cost $1.10 total, and the bat costs $1.00 more than the ball, how much is the ball?",
    options: ["$0.10", "$0.05", "$1.00", "$0.15"], answer: 1, aiTricky: true
  },
  {
    subject: "History", grade: 5,
    q: "In which year did World War II end?",
    options: ["1918", "1939", "1945", "1950"], answer: 2
  },
  {
    subject: "English", grade: 5,
    q: "How many words are in the sentence you are reading right now?",
    options: ["11", "12", "13", "14"], answer: 1, aiTricky: true
  }
];
