(function () {
  'use strict';

  // --- Game State ---
  let state = {
    players: [],
    deck: [],
    currentCard: null,
    chipsOnCard: 0,
    currentPlayerIndex: 0,
    gameOver: false,
  };

  // --- DOM refs ---
  const setupScreen = document.getElementById('setup-screen');
  const gameScreen = document.getElementById('game-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const playerNamesDiv = document.getElementById('player-names');
  const startBtn = document.getElementById('start-btn');
  const takeBtn = document.getElementById('take-btn');
  const passBtn = document.getElementById('pass-btn');
  const playAgainBtn = document.getElementById('play-again-btn');
  const turnIndicator = document.getElementById('turn-indicator');
  const deckCount = document.getElementById('deck-count');
  const cardValue = document.getElementById('card-value');
  const chipCount = document.getElementById('chip-count');
  const chipPlural = document.getElementById('chip-plural');
  const playersArea = document.getElementById('players-area');
  const finalScores = document.getElementById('final-scores');
  const currentCardEl = document.getElementById('current-card');

  // --- Setup ---
  let selectedCount = 4;

  function renderPlayerInputs() {
    playerNamesDiv.innerHTML = '';
    for (let i = 0; i < selectedCount; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Player ${i + 1}`;
      input.maxLength = 20;
      input.dataset.index = i;
      playerNamesDiv.appendChild(input);
    }
  }

  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCount = parseInt(btn.dataset.count);
      renderPlayerInputs();
    });
  });

  renderPlayerInputs();

  startBtn.addEventListener('click', startGame);
  takeBtn.addEventListener('click', takeCard);
  passBtn.addEventListener('click', pass);
  playAgainBtn.addEventListener('click', () => {
    showScreen(setupScreen);
  });

  // --- Core Game Logic ---
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    const cards = [];
    for (let i = 3; i <= 35; i++) cards.push(i);
    shuffle(cards);
    // Remove 9 cards unseen
    cards.splice(0, 9);
    return cards;
  }

  function startGame() {
    const inputs = playerNamesDiv.querySelectorAll('input');
    const names = Array.from(inputs).map((inp, i) => inp.value.trim() || `Player ${i + 1}`);

    state = {
      players: names.map(name => ({
        name,
        chips: 11,
        cards: [],
      })),
      deck: buildDeck(),
      currentCard: null,
      chipsOnCard: 0,
      currentPlayerIndex: 0,
      gameOver: false,
    };

    drawCard();
    showScreen(gameScreen);
    renderGame();
  }

  function drawCard() {
    if (state.deck.length === 0) {
      endGame();
      return;
    }
    state.currentCard = state.deck.pop();
    state.chipsOnCard = 0;
    // Re-trigger card animation
    currentCardEl.style.animation = 'none';
    currentCardEl.offsetHeight; // force reflow
    currentCardEl.style.animation = '';
  }

  function takeCard() {
    const player = state.players[state.currentPlayerIndex];
    player.cards.push(state.currentCard);
    player.cards.sort((a, b) => a - b);
    player.chips += state.chipsOnCard;

    drawCard();
    if (!state.gameOver) {
      renderGame();
    }
  }

  function pass() {
    const player = state.players[state.currentPlayerIndex];
    if (player.chips <= 0) return;

    player.chips--;
    state.chipsOnCard++;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    renderGame();
  }

  function calculateScore(player) {
    let cardScore = 0;
    const cards = player.cards;
    for (let i = 0; i < cards.length; i++) {
      // Only count if it's NOT a continuation of a run
      if (i === 0 || cards[i] !== cards[i - 1] + 1) {
        cardScore += cards[i];
      }
    }
    return cardScore - player.chips;
  }

  function findRuns(cards) {
    const inRun = new Set();
    for (let i = 0; i < cards.length; i++) {
      if (i > 0 && cards[i] === cards[i - 1] + 1) {
        inRun.add(cards[i]);
        inRun.add(cards[i - 1]);
      }
    }
    return inRun;
  }

  function endGame() {
    state.gameOver = true;
    const results = state.players.map(p => ({
      name: p.name,
      score: calculateScore(p),
      cards: [...p.cards],
      chips: p.chips,
    }));
    results.sort((a, b) => a.score - b.score);

    finalScores.innerHTML = '';
    results.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <span class="rank">#${i + 1}</span>
        <span class="name">${escapeHtml(r.name)}${i === 0 ? '<span class="winner-label">Winner!</span>' : ''}</span>
        <span class="score">${r.score}</span>
        <span class="score-detail">(cards: ${r.cards.join(', ')} | chips: ${r.chips})</span>
      `;
      finalScores.appendChild(row);
    });

    showScreen(gameoverScreen);
  }

  // --- Rendering ---
  function renderGame() {
    const player = state.players[state.currentPlayerIndex];
    turnIndicator.textContent = `${player.name}'s Turn`;
    deckCount.textContent = `${state.deck.length} card${state.deck.length !== 1 ? 's' : ''} remaining`;

    cardValue.textContent = state.currentCard;
    chipCount.textContent = state.chipsOnCard;
    chipPlural.textContent = state.chipsOnCard === 1 ? '' : 's';

    // Buttons
    takeBtn.disabled = false;
    passBtn.disabled = player.chips <= 0;

    // Player panels
    playersArea.innerHTML = '';
    state.players.forEach((p, i) => {
      const panel = document.createElement('div');
      panel.className = 'player-panel' + (i === state.currentPlayerIndex ? ' active' : '');

      const runs = findRuns(p.cards);
      const cardsHtml = p.cards.map(c =>
        `<span class="mini-card${runs.has(c) ? ' in-run' : ''}">${c}</span>`
      ).join('');

      const score = calculateScore(p);

      panel.innerHTML = `
        <div class="player-name">${escapeHtml(p.name)}</div>
        <div class="player-chips">${p.chips} chip${p.chips !== 1 ? 's' : ''}</div>
        <div class="player-cards">${cardsHtml || '<span style="color:var(--text-muted);font-size:0.8rem">No cards</span>'}</div>
        <div class="player-score">Score: ${score}</div>
      `;
      playersArea.appendChild(panel);
    });
  }

  function showScreen(screen) {
    [setupScreen, gameScreen, gameoverScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
