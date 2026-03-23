// Game Constants
const TILE_COUNT = 3; // 3x3 Grid
const IMAGE_SRC = 'assets/CRUNCHY.png';

// State
let tiles = [];
// Barajamos INMEDIATAMENTE para que initApp use el estado final
const shuffle = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};
const isValid = (arr) => {
    let inv = 0;
    for (let i = 0; i < 8; i++)
        for (let j = i + 1; j < 8; j++)
            if (arr[i] > -1 && arr[j] > -1 && arr[i] > arr[j]) inv++;
    return inv % 2 === 0;
};
const generateTiles = () => {
    let arr;
    do { arr = shuffle([-1, 0, 1, 2, 3, 4, 5, 6, 7]); } while (!isValid(arr));
    return arr;
};

tiles = generateTiles();

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
    timeLeft = 60;
    isGameOver = false;
    isVictory = false;
    isAnimating = false;
    hasStarted = false;

    clearInterval(timerInterval);
    updateTimerDisplay();

    // HACER EL JUEGO INVISIBLE MIENTRAS ESTAMOS EN EL MENÚ
    const gameBoard = document.getElementById('game-container');
    if (gameBoard) gameBoard.style.display = 'none';

    startOverlay.classList.remove('hidden');
    resultModal.classList.add('hidden');
    timerIconBox.classList.remove('bg-red', 'animate-pulse');
    timerDisplay.classList.remove('text-red');
};


const startGame = () => {
    if (hasStarted) return;
    hasStarted = true;
    
    // MOSTRAR EL JUEGO AL EMPEZAR
    const gameBoard = document.getElementById('game-container');
    if (gameBoard) gameBoard.style.display = 'flex';
    
    startOverlay.classList.add('hidden');

    // Start Timer
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 10) {
            timerDisplay.classList.add('text-red');
        }

        if (timeLeft <= 0) {
            handleGameOver();
        }
    }, 1000);

    // Initial Animation - Removed to prevent flickering/stuttering on load
    // Pieces are positioned instantly in renderGrid
};

const updateTimerDisplay = () => {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
};

const initApp = () => {
    const fragment = document.createDocumentFragment();
    tileElements = {};
    
    // Iteramos por los 9 IDs posibles (incluyendo el -1 vacío)
    for (let id = -1; id < TILE_COUNT * TILE_COUNT - 1; id++) {
        const tileEl = document.createElement('div');
        if (id === -1) {
            tileEl.className = 'empty-tile';
        } else {
            tileEl.className = 'puzzle-tile';
            tileEl.style.opacity = '1';
            
            // Calculamos el recorte de la imagen (estático)
            const { row: solvedRow, col: solvedCol } = getRowCol(id);
            const xOffset = solvedCol * 100 / (TILE_COUNT - 1);
            const yOffset = solvedRow * 100 / (TILE_COUNT - 1);
            
            const imgEl = document.createElement('div');
            imgEl.className = 'tile-image';
            imgEl.style.backgroundImage = `url('${IMAGE_SRC}')`;
            imgEl.style.backgroundSize = `${TILE_COUNT * 100}% ${TILE_COUNT * 100}%`;
            imgEl.style.backgroundPosition = `${xOffset}% ${yOffset}%`;
            tileEl.appendChild(imgEl);
            tileEl.appendChild(document.createElement('div')).className = 'tile-overlay';
            
            tileEl.addEventListener('click', () => {
                const currentIndex = tiles.indexOf(id);
                handleTileClick(currentIndex);
            });
            setupTouchEvents(tileEl, id);
        }
        
        // POSICIONAMIENTO EN PÍXELES ENTEROS (Evita parpadeos de subpíxel)
        const currentIndex = tiles.indexOf(id);
        const { row, col } = getRowCol(currentIndex);
        
        gsap.set(tileEl, {
            xPercent: col * 100,
            yPercent: row * 100,
            left: 0,
            top: 0
        });
        
        tileElements[id] = tileEl;
        fragment.appendChild(tileEl);
    }
    
    gridEl.innerHTML = '';
    // Agregamos todo de una sola vez
    gridEl.appendChild(fragment);
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
        const { row: r2, col: c2 } = getRowCol(emptyIndex);        isAnimating = true;
        // Animamos a coordenadas de porcentaje (Responsivo!)
        gsap.to(tileEl, {
            xPercent: c2 * 100,
            yPercent: r2 * 100,
            duration: 0.2,
            ease: "power2.inOut",
            onComplete: () => {
                tiles = newTiles;
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
        if (el) {
            gsap.set(el, {
                xPercent: col * 100,
                yPercent: row * 100
            });
        }
    });
};

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Animations
window.addEventListener('load', () => {
    // Animaciones pesadas eliminadas para estabilidad en el totem

    initApp();
    initGame();

    requestAnimationFrame(() => {
        gridEl.style.visibility = 'visible';
    });
});
