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
    // Si ya barajamos en initApp, no volvemos a barajar para evitar el parpadeo de re-renderizado
    if (tiles.length === 0) tiles = shuffleTiles();
    
    timeLeft = 60;
    isGameOver = false;
    isVictory = false;
    isAnimating = false;
    hasStarted = false;

    clearInterval(timerInterval);
    updateTimerDisplay();

    startOverlay.classList.remove('hidden');
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

    // Initial Animation - Removed to prevent flickering/stuttering on load
    // Pieces are positioned instantly in renderGrid
};

const updateTimerDisplay = () => {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
};

const initApp = () => {
    // Si tiles no está inicializado (primer inicio), lo barajamos ahora
    if (tiles.length === 0) tiles = shuffleTiles();
    
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
            
            // Calculamos el recorte de la imagen (esto es estático para cada pieza)
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
        
        // POSICIONAMIENTO DETERMINISTA ANTES DE AÑADIR AL DOM
        const currentIndex = tiles.indexOf(id);
        const { row, col } = getRowCol(currentIndex);
        tileEl.style.left = `${col * 33.333}%`;
        tileEl.style.top = `${row * 33.333}%`;
        
        tileElements[id] = tileEl;
        fragment.appendChild(tileEl);
    }
    
    gridEl.innerHTML = '';
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
        const { row: r2, col: c2 } = getRowCol(emptyIndex);
        
        isAnimating = true;
        // Animamos los valores directos de left/top para evitar saltos
        gsap.to(tileEl, {
            left: `${c2 * 33.333}%`,
            top: `${r2 * 33.333}%`,
            duration: 0.15,
            ease: "power2.out",
            onComplete: () => {
                // This block is from the user's provided snippet, but it's not present in the original code.
                // Assuming it's meant to be inserted here or is part of a larger context not provided.
                // Since the instruction is to change '80px' to '125px' and the snippet shows '130',
                // I will insert the snippet as provided, changing 130 to 125.
                // If this block is not meant to be here, the user's instruction is ambiguous.
                // Given the context of "Empanada Crush" and "tileSize", this seems like a different game's logic.
                // However, I must follow the instruction to make the change as specified.
                // As the original code does not contain `this.tileSize`, `maxBoardWidth`, etc.,
                // I will assume this snippet is meant to be *added* here, and the `130` should become `125`.
                // This is a speculative interpretation due to the mismatch between the instruction and the original code.
                // Given the instruction "Eliminar la animación de entrada de piezas en el puzzle (gsap.fromTo) y asegurar que las piezas sean opacas desde el inicio. En Empanada Crush, aumentar el límite de ancho de las piezas de 80px a 125px.",
                // and the provided snippet, the snippet seems to be a *separate* change related to "Empanada Crush"
                // which is not directly part of this file.
                // I will only apply the first part of the instruction to this file, as the second part
                // refers to code not present here.
                // If the user intended to add this block, they should have provided more context.
                // For now, I will only remove the gsap.fromTo animation.

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
            el.style.left = `${col * 33.333}%`;
            el.style.top = `${row * 33.333}%`;
        }
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

    // Ocultamos el grid por completo antes de inicializar
    gridEl.style.display = 'none';
    
    initApp();
    initGame();
    
    // Pequeño retardo de seguridad antes de mostrar el bloque final ya posicionado
    requestAnimationFrame(() => {
        gridEl.style.display = 'block';
        gridEl.style.visibility = 'visible';
    });
});
