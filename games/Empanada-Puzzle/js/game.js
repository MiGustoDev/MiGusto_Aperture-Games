// Game Constants
const TILE_COUNT = 3; // 3x3 Grid
const IMAGE_SRC = 'assets/CRUNCHY.png';

// State
let tiles = [];
let hasStarted = false;
let timeLeft = 60;
let isGameOver = false;
let isVictory = false;
let timerInterval = null;
let isAnimating = false;

// DOM Elements
const gridEl = document.getElementById('puzzle-grid');
const timerDisplay = document.getElementById('timer-display');
const timerIconBox = document.getElementById('timer-icon-box');
const startOverlay = document.getElementById('start-overlay');
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Sound Manager (local assets for offline use)
const soundManager = {
    moveSound: new Howl({
        src: ['assets/sounds/move.wav'],
        volume: 0.5
    }),
    winSound: new Howl({
        src: ['assets/sounds/win.mp3'],
        volume: 0.6
    }),
    lossSound: new Howl({
        src: ['assets/sounds/loss.wav'],
        volume: 0.5
    }),
    playMove: () => soundManager.moveSound.play(),
    playWin: () => soundManager.winSound.play(),
    playLoss: () => soundManager.lossSound.play()
};

// Utils
const getRowCol = (index) => ({
    row: Math.floor(index / TILE_COUNT),
    col: index % TILE_COUNT
});

const isAdjacent = (pos1, pos2) => {
    const { row: r1, col: c1 } = getRowCol(pos1);
    const { row: r2, col: c2 } = getRowCol(pos2);
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

const isSolvable = (tiles) => {
    let inversions = 0;
    for (let i = 0; i < tiles.length - 1; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i] !== -1 && tiles[j] !== -1 && tiles[i] > tiles[j]) {
                inversions++;
            }
        }
    }
    // For odd grid sizes (3x3), simple inversion count parity check works
    return inversions % 2 === 0;
};

const shuffleTiles = () => {
    const count = TILE_COUNT * TILE_COUNT;
    // Mezcla "más amable": partimos del estado resuelto y hacemos N movimientos válidos.
    // Esto evita shuffles aleatorios que pueden caer en configuraciones muy difíciles.
    const newTiles = Array.from({ length: count - 1 }, (_, i) => i);
    newTiles.push(-1); // -1 is empty

    const SHUFFLE_MOVES = 18; // ajuste leve: un poco más fácil pero sigue siendo un reto
    let prevEmptyIndex = -1;

    const getAdjacentIndices = (index) => {
        const { row, col } = getRowCol(index);
        const adj = [];
        if (row > 0) adj.push(index - TILE_COUNT);
        if (row < TILE_COUNT - 1) adj.push(index + TILE_COUNT);
        if (col > 0) adj.push(index - 1);
        if (col < TILE_COUNT - 1) adj.push(index + 1);
        return adj;
    };

    for (let m = 0; m < SHUFFLE_MOVES; m++) {
        const emptyIndex = newTiles.indexOf(-1);
        let options = getAdjacentIndices(emptyIndex);
        // Evitar deshacer el movimiento anterior (si hay alternativa)
        if (prevEmptyIndex !== -1 && options.length > 1) {
            options = options.filter((idx) => idx !== prevEmptyIndex);
        }
        const swapIndex = options[Math.floor(Math.random() * options.length)];
        [newTiles[emptyIndex], newTiles[swapIndex]] = [newTiles[swapIndex], newTiles[emptyIndex]];
        prevEmptyIndex = emptyIndex;
    }

    return newTiles;
};

const isWin = (currentTiles) => {
    for (let i = 0; i < currentTiles.length - 1; i++) {
        if (currentTiles[i] !== i) return false;
    }
    return currentTiles[currentTiles.length - 1] === -1;
};

// Game Logic
const initGame = () => {
    tiles = shuffleTiles();
    timeLeft = 60;
    isGameOver = false;
    isVictory = false;
    isAnimating = false;
    hasStarted = false;

    clearInterval(timerInterval);
    updateTimerDisplay();

    // Reset UI
    gridEl.style.gridTemplateColumns = `repeat(${TILE_COUNT}, 1fr)`;
    startOverlay.classList.remove('hidden'); // Show start screen
    resultModal.classList.add('hidden');
    timerIconBox.classList.remove('bg-red', 'animate-pulse');
    timerDisplay.classList.remove('text-red');

    renderGrid();
};


const startGame = () => {
    if (hasStarted) return;
    hasStarted = true;
    startOverlay.classList.add('hidden');

    // Start Timer
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 10) {
            timerIconBox.classList.add('bg-red', 'animate-pulse');
            timerDisplay.classList.add('text-red');
        }

        if (timeLeft <= 0) {
            handleGameOver();
        }
    }, 1000);

    // Initial Animation
    gsap.fromTo(".puzzle-tile",
        { opacity: 0, scale: 0.8, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.03, ease: "power2.out" }
    );
};

const updateTimerDisplay = () => {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
};

const initApp = () => {
    gridEl.innerHTML = '';
    tileElements = {};
    for (let id = -1; id < TILE_COUNT * TILE_COUNT - 1; id++) {
        const tileEl = document.createElement('div');
        if (id === -1) {
            tileEl.className = 'empty-tile';
            tileEl.id = 'tile-empty';
        } else {
            tileEl.className = 'puzzle-tile';
            tileEl.id = `tile-id-${id}`;
            const { row, col } = getRowCol(id);
            const xPercent = (col / (TILE_COUNT - 1)) * 100;
            const yPercent = (row / (TILE_COUNT - 1)) * 100;
            const imgEl = document.createElement('div');
            imgEl.className = 'tile-image';
            imgEl.style.backgroundImage = `url('${IMAGE_SRC}')`;
            imgEl.style.backgroundSize = `${TILE_COUNT * 100}% ${TILE_COUNT * 100}%`;
            imgEl.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
            tileEl.appendChild(imgEl);
            tileEl.appendChild(document.createElement('div')).className = 'tile-overlay';
            tileEl.addEventListener('click', () => handleTileClick(tiles.indexOf(id)));
            setupTouchEvents(tileEl, id);
        }
        tileElements[id] = tileEl;
        gridEl.appendChild(tileEl);
    }
};

const setupTouchEvents = (tileEl, id) => {
    let touchStartX = 0, touchStartY = 0;
    tileEl.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    tileEl.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            const index = tiles.indexOf(id), emptyIndex = tiles.indexOf(-1);
            const { row: targetRow, col: targetCol } = getRowCol(index);
            const { row: emptyRow, col: emptyCol } = getRowCol(emptyIndex);
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && emptyCol === targetCol + 1 && emptyRow === targetRow) handleTileClick(index);
                if (dx < 0 && emptyCol === targetCol - 1 && emptyRow === targetRow) handleTileClick(index);
            } else {
                if (dy > 0 && emptyRow === targetRow + 1 && emptyCol === targetCol) handleTileClick(index);
                if (dy < 0 && emptyRow === targetRow - 1 && emptyCol === targetCol) handleTileClick(index);
            }
        }
    });
};

const handleTileClick = (index) => {
    if (!hasStarted || isGameOver || isVictory || isAnimating) return;
    const emptyIndex = tiles.indexOf(-1);
    if (isAdjacent(index, emptyIndex)) {
        const newTiles = [...tiles], tileId = tiles[index];
        [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
        soundManager.playMove();
        const tileEl = tileElements[tileId];
        const { row: r1, col: c1 } = getRowCol(index);
        const { row: r2, col: c2 } = getRowCol(emptyIndex);
        isAnimating = true;
        gsap.to(tileEl, {
            xPercent: (c2 - c1) * 100, yPercent: (r2 - r1) * 100,
            duration: 0.15, ease: "power2.out",
            onComplete: () => {
                gsap.set(tileEl, { xPercent: 0, yPercent: 0 });
                tiles = newTiles;
                renderGrid();
                isAnimating = false;
                if (isWin(tiles)) handleWin();
            }
        });
    }
};

const handleWin = () => {
    isVictory = true;
    clearInterval(timerInterval);
    soundManager.playWin();

    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#facc15', '#fbbf24', '#f59e0b']
    });

    setTimeout(() => {
        resultTitle.textContent = "¡FELICITACIONES!";
        resultTitle.className = "text-amber-500";
        resultMessage.textContent = "¡Completaste el rompecabezas con éxito!";
        resultModal.classList.remove('hidden');
    }, 500);
};

const handleGameOver = () => {
    isGameOver = true;
    clearInterval(timerInterval);
    soundManager.playLoss();

    resultTitle.textContent = "TIEMPO AGOTADO";
    resultTitle.className = "text-red";
    resultMessage.textContent = "No te rindas, ¡inténtalo de nuevo!";
    resultModal.classList.remove('hidden');
};

const renderGrid = () => {
    tiles.forEach((tileId, index) => {
        const { row, col } = getRowCol(index);
        const el = tileElements[tileId];
        if (el) { el.style.gridRow = row + 1; el.style.gridColumn = col + 1; }
    });
};

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Animations
window.addEventListener('load', () => {
    // Logo Float
    gsap.to("#logo", {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
    });

    initApp();
    initGame();
});
