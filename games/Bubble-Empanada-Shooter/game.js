(function () {
    const GAME_WIDTH = 1080;
    const GAME_HEIGHT = 1920;
    const MAX_SHOTS = 30;

    const ui = {
        hud: document.getElementById('hud'),
        score: document.getElementById('score-value'),
        shots: document.getElementById('shots-value'),
        startOverlay: document.getElementById('start-overlay'),
        endOverlay: document.getElementById('end-overlay'),
        endTitle: document.getElementById('end-title'),
        endMessage: document.getElementById('end-message'),
        startButton: document.getElementById('start-button'),
        restartButton: document.getElementById('restart-button'),
        fireButton: document.getElementById('power-fire')
    };

    const state = {
        score: 0,
        shots: MAX_SHOTS,
        fireReady: true
    };

    function updateHud() {
        ui.score.textContent = state.score;
        ui.shots.textContent = state.shots;
        ui.fireButton.disabled = !state.fireReady;
    }

    function showStart() {
        ui.startOverlay.classList.remove('hidden');
        ui.endOverlay.classList.add('hidden');
        ui.hud.classList.add('hidden');
    }

    function startRound() {
        state.score = 0;
        state.shots = MAX_SHOTS;
        state.fireReady = true;
        updateHud();
        ui.startOverlay.classList.add('hidden');
        ui.endOverlay.classList.add('hidden');
        ui.hud.classList.remove('hidden');
        game.scene.start('BubbleShooterScene');
    }

    function finishRound(win) {
        ui.hud.classList.add('hidden');
        ui.endTitle.textContent = win ? 'Ganaste' : 'Fin del juego';
        ui.endMessage.textContent = win
            ? `Limpiaste todas las empanadas. Puntaje final: ${state.score}.`
            : `Te quedaste sin tiros. Puntaje final: ${state.score}.`;
        ui.endOverlay.classList.remove('hidden');
    }

    class BubbleShooterScene extends Phaser.Scene {
        constructor() {
            super('BubbleShooterScene');
            this.rows = 20;
            this.cols = 10;
            this.bubbleRadius = 50;
            this.bubbleDiameter = 100;
            this.grid = [];
            this.isShooting = false;
            this.remainingShots = MAX_SHOTS;
            this.score = 0;
            this.isFireActive = false;
            this.mouthOffset = 220;
            this.fallingBubbles = [];
            this.flavors = [
                { key: 'empanada_crunchy', asset: '../Empanada-Crush/assets/empanadas/CRUNCHY.png', color: 0xFF5722 },
                { key: 'empanada_burger', asset: '../Empanada-Crush/assets/empanadas/empanada-big-burger.png', color: 0x00E5FF },
                { key: 'empanada_matambre', asset: '../Empanada-Crush/assets/empanadas/empanada-matambre -alapizza.png', color: 0xE040FB },
                { key: 'empanada_pork', asset: '../Empanada-Crush/assets/empanadas/empanada-mexican-pibil-pork.png', color: 0xFFD600 },
                { key: 'empanada_fire', asset: '../Empanada-Crush/assets/empanadas/empanada-mexican-pibil-pork.png', color: 0xFF1744 }
            ];
        }

        preload() {
            this.load.image('background', 'assets/fondo/fondo-pantalla.png');
            this.load.image('logo', '../Empanada-Crush/assets/logo/Logo Mi Gusto 2025.png');
            this.load.image('cannon', 'assets/canon/canon.png');
            this.flavors.forEach((flavor) => {
                this.load.image(flavor.key, flavor.asset);
            });
        }

        create() {
            this.score = 0;
            this.remainingShots = MAX_SHOTS;
            this.isFireActive = false;
            this.isShooting = false;
            this.grid = [];
            this.fallingBubbles = [];

            this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'background').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

            this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
            this.physics.world.setBoundsCollision(true, true, true, false);

            this.roofGroup = this.physics.add.staticGroup();
            const roofRect = this.add.rectangle(GAME_WIDTH / 2, 140, GAME_WIDTH, 40, 0x000000, 0);
            this.roofGroup.add(roofRect);

            this.bubbles = this.physics.add.group();
            this.graphics = this.add.graphics();
            this.graphics.setDepth(1);

            this.shooter = this.add.container(GAME_WIDTH / 2, 1790);
            this.shooter.setDepth(3);
            this.createCannon();

            this.nextEmpanada = this.add.image(0, -180, this.randomFlavorKey()).setDisplaySize(58, 58);
            this.shooter.add(this.nextEmpanada);

            this.createInitialGrid();

            this.input.on('pointermove', this.updateTrajectory, this);
            this.input.on('pointerup', this.shoot, this);

            updateHud();
        }

        createCannon() {
            const cannon = this.add.image(0, 0, 'cannon');
            cannon.displayWidth = 300;
            cannon.scaleY = cannon.scaleX;
            cannon.setOrigin(0.5, 0.75);

            const logo = this.add.image(0, 88, 'logo').setDisplaySize(170, 72);
            const text = this.add.text(0, 172, 'Arrastrá y soltá', {
                fontFamily: 'Fredoka',
                fontSize: '34px',
                color: '#fff8e1'
            }).setOrigin(0.5);

            this.shooter.add([cannon, logo, text]);
        }

        createInitialGrid() {
            for (let row = 0; row < 6; row++) {
                this.grid[row] = [];
                const offset = row % 2 !== 0 ? this.bubbleRadius : 0;

                for (let col = 0; col < this.cols; col++) {
                    const x = col * this.bubbleDiameter + this.bubbleRadius + offset + 15;
                    const y = row * (this.bubbleDiameter * 0.85) + this.bubbleRadius + 180;
                    const bubble = this.createBubbleAt(x, y, this.randomFlavorKey(), true);
                    bubble.setData('row', row);
                    bubble.setData('col', col);
                    this.grid[row][col] = bubble;
                }
            }
        }

        randomFlavorKey() {
            const baseFlavors = this.flavors.filter((flavor) => flavor.key !== 'empanada_fire');
            return Phaser.Utils.Array.GetRandom(baseFlavors).key;
        }

        getFlavorColor(flavorKey) {
            const flavor = this.flavors.find((item) => item.key === flavorKey);
            return flavor ? flavor.color : 0xffffff;
        }

        createBubbleAt(x, y, flavorKey, addToGroup) {
            const bg = this.add.circle(x, y, 45, this.getFlavorColor(flavorKey), 0.82).setStrokeStyle(4, 0xffffff, 0.45);
            this.physics.add.existing(bg);
            bg.body.setCircle(28, 17, 17);

            if (addToGroup) {
                bg.body.setImmovable(true);
                this.bubbles.add(bg);
            }

            const sprite = this.add.image(x, y, flavorKey).setDisplaySize(82, 82);
            sprite.setDepth(10);
            bg.setDepth(9);

            bg.setData('flavor', flavorKey);
            bg.setData('sprite', sprite);
            bg.updateSprite = function () {
                sprite.setPosition(bg.x, bg.y);
                sprite.setAlpha(bg.alpha);
                sprite.setRotation(bg.rotation);
            };

            return bg;
        }

        updateTrajectory(pointer) {
            if (!pointer.isDown && pointer.y > this.shooter.y) {
                this.graphics.clear();
                return;
            }

            this.graphics.clear();
            const angle = Phaser.Math.Angle.Between(this.shooter.x, this.shooter.y - 50, pointer.x, pointer.y);
            this.shooter.rotation = angle + Math.PI / 2;

            let currentX = this.shooter.x + Math.cos(angle) * this.mouthOffset;
            let currentY = this.shooter.y + Math.sin(angle) * this.mouthOffset;
            let currentAngle = angle;
            let remainingLength = 3000;
            let bounces = 5;
            const bubbleRadiusSq = (this.bubbleRadius * 0.8) ** 2;

            this.graphics.lineStyle(8, 0x44ff44, 1);
            this.graphics.beginPath();
            this.graphics.moveTo(currentX, currentY);

            while (remainingLength > 10 && bounces >= 0) {
                const dx = Math.cos(currentAngle);
                const dy = Math.sin(currentAngle);
                const targetX = currentX + dx * remainingLength;
                let hitWall = false;
                let t = 1;

                if (dx < 0 && targetX < 0) {
                    t = (0 - currentX) / (dx * remainingLength);
                    hitWall = true;
                } else if (dx > 0 && targetX > GAME_WIDTH) {
                    t = (GAME_WIDTH - currentX) / (dx * remainingLength);
                    hitWall = true;
                }

                if (dy < 0 && currentY + dy * remainingLength * t < 140) {
                    t = (140 - currentY) / (dy * remainingLength);
                    hitWall = false;
                }

                this.bubbles.children.iterate((bubble) => {
                    if (!bubble || !bubble.active) {
                        return;
                    }

                    const bx = bubble.x;
                    const by = bubble.y;
                    const v1x = bx - currentX;
                    const v1y = by - currentY;
                    const projection = v1x * dx + v1y * dy;

                    if (projection <= 0 || projection >= remainingLength * t) {
                        return;
                    }

                    const px = currentX + dx * projection;
                    const py = currentY + dy * projection;
                    const distSq = (bx - px) ** 2 + (by - py) ** 2;

                    if (distSq < bubbleRadiusSq) {
                        t = projection / remainingLength;
                        hitWall = false;
                    }
                });

                const segmentX = currentX + dx * remainingLength * t;
                const segmentY = currentY + dy * remainingLength * t;
                this.graphics.lineTo(segmentX, segmentY);

                if (hitWall) {
                    currentAngle = Math.PI - currentAngle;
                    currentX = segmentX;
                    currentY = segmentY;
                    remainingLength *= (1 - t);
                    remainingLength -= 2;
                    bounces -= 1;
                } else {
                    break;
                }
            }

            this.graphics.strokePath();
        }

        shoot(pointer) {
            if (this.isShooting || pointer.y > this.shooter.y) {
                return;
            }

            this.isShooting = true;
            const angle = Phaser.Math.Angle.Between(this.shooter.x, this.shooter.y, pointer.x, pointer.y);
            const spawnX = this.shooter.x + Math.cos(angle) * this.mouthOffset;
            const spawnY = this.shooter.y + Math.sin(angle) * this.mouthOffset;
            const flavor = this.nextEmpanada.texture.key;

            const projectile = this.createBubbleAt(spawnX, spawnY, flavor, false);
            this.shooterBubble = projectile;
            projectile.body.setCollideWorldBounds(true);
            projectile.body.onWorldBounds = true;
            projectile.body.setBounce(1, 1);
            projectile.body.setVelocity(Math.cos(angle) * 1800, Math.sin(angle) * 1800);

            this.remainingShots -= 1;
            state.shots = this.remainingShots;
            updateHud();

            this.physics.add.overlap(projectile, this.bubbles, (p, bubble) => {
                if (!p.active || !bubble.active) {
                    return;
                }

                if (this.isFireActive) {
                    this.handleFireBurst(p, bubble);
                } else {
                    this.snapToGrid(p);
                }
            });

            this.physics.add.collider(projectile, this.roofGroup, (p) => {
                if (p.active) {
                    this.snapToGrid(p);
                }
            });

            if (this.isFireActive) {
                this.isFireActive = false;
                state.fireReady = false;
            }

            this.nextEmpanada.setTexture(this.randomFlavorKey());
            this.nextEmpanada.setDisplaySize(58, 58);
            updateHud();

            if (this.remainingShots <= 0) {
                this.time.delayedCall(1800, () => {
                    if (this.scene.isActive()) {
                        this.gameOver(false);
                    }
                });
            }

            this.time.delayedCall(3000, () => {
                if (projectile.active) {
                    if (projectile.getData('sprite')) {
                        projectile.getData('sprite').destroy();
                    }
                    projectile.destroy();
                    this.shooterBubble = null;
                    this.isShooting = false;
                }
            });
        }

        snapToGrid(projectile) {
            const flavor = projectile.getData('flavor');
            const x = projectile.x;
            const y = projectile.y;

            if (projectile.getData('sprite')) {
                projectile.getData('sprite').destroy();
            }
            projectile.destroy();

            this.shooterBubble = null;
            this.isShooting = false;

            let row = Math.round((y - 180 - this.bubbleRadius) / (this.bubbleDiameter * 0.85));
            row = Math.max(row, 0);

            let offset = row % 2 !== 0 ? this.bubbleRadius : 0;
            let col = Math.round((x - 15 - this.bubbleRadius - offset) / this.bubbleDiameter);
            col = Phaser.Math.Clamp(col, 0, this.cols - 1);

            if (this.getBubbleAt(row, col)) {
                const neighbors = [
                    { r: row, c: col - 1 }, { r: row, c: col + 1 },
                    { r: row - 1, c: col }, { r: row - 1, c: col - 1 }, { r: row - 1, c: col + 1 },
                    { r: row + 1, c: col }, { r: row + 1, c: col - 1 }, { r: row + 1, c: col + 1 }
                ];

                let bestSlot = { r: row + 1, c: col };
                let bestDist = Infinity;

                neighbors.forEach((neighbor) => {
                    if (neighbor.r < 0 || neighbor.c < 0 || neighbor.c >= this.cols || this.getBubbleAt(neighbor.r, neighbor.c)) {
                        return;
                    }

                    const neighborOffset = neighbor.r % 2 !== 0 ? this.bubbleRadius : 0;
                    const nx = neighbor.c * this.bubbleDiameter + this.bubbleRadius + neighborOffset + 15;
                    const ny = neighbor.r * (this.bubbleDiameter * 0.85) + this.bubbleRadius + 180;
                    const dist = Phaser.Math.Distance.Between(x, y, nx, ny);

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestSlot = neighbor;
                    }
                });

                row = bestSlot.r;
                col = bestSlot.c;
            }

            if (!this.grid[row]) {
                this.grid[row] = [];
            }

            const finalOffset = row % 2 !== 0 ? this.bubbleRadius : 0;
            const posX = col * this.bubbleDiameter + this.bubbleRadius + finalOffset + 15;
            const posY = row * (this.bubbleDiameter * 0.85) + this.bubbleRadius + 180;
            const newBubble = this.createBubbleAt(posX, posY, flavor, true);
            newBubble.setData('row', row);
            newBubble.setData('col', col);
            this.grid[row][col] = newBubble;

            this.checkMatches(row, col, flavor);
        }

        checkMatches(row, col, flavor) {
            const matches = this.findCluster(row, col, flavor, []);
            if (matches.length >= 3) {
                this.destroyCluster(matches);
                this.dropDisconnected();
            }
        }

        findCluster(row, col, flavor, cluster) {
            const key = `${row},${col}`;
            if (cluster.includes(key)) {
                return cluster;
            }

            const bubble = this.getBubbleAt(row, col);
            if (!bubble || bubble.getData('flavor') !== flavor) {
                return cluster;
            }

            cluster.push(key);
            this.getNeighbors(row, col).forEach((neighbor) => {
                this.findCluster(neighbor.row, neighbor.col, flavor, cluster);
            });

            return cluster;
        }

        getNeighbors(row, col) {
            const neighbors = [];
            const isOffset = row % 2 !== 0;
            const dirs = isOffset
                ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
                : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];

            dirs.forEach(([dr, dc]) => {
                const nr = row + dr;
                const nc = col + dc;
                if (this.getBubbleAt(nr, nc)) {
                    neighbors.push({ row: nr, col: nc });
                }
            });

            return neighbors;
        }

        getBubbleAt(row, col) {
            return this.grid[row] && this.grid[row][col];
        }

        destroyCluster(cluster) {
            cluster.forEach((key) => {
                const [row, col] = key.split(',').map(Number);
                const bubble = this.grid[row][col];

                if (!bubble) {
                    return;
                }

                this.score += 100;
                state.score = this.score;
                updateHud();

                this.explodeEmpanada(bubble.x, bubble.y);

                if (bubble.getData('sprite')) {
                    bubble.getData('sprite').destroy();
                }
                bubble.destroy();
                this.grid[row][col] = null;
            });
        }

        explodeEmpanada(x, y) {
            for (let i = 0; i < 10; i++) {
                const particle = this.add.circle(x, y, 4, 0xd4af37);
                this.physics.add.existing(particle);
                particle.body.setVelocity(Phaser.Math.Between(-220, 220), Phaser.Math.Between(-220, 220));
                this.time.delayedCall(450, () => particle.destroy());
            }
        }

        dropDisconnected() {
            const connected = new Set();

            for (let col = 0; col < this.cols; col++) {
                if (this.grid[0] && this.grid[0][col]) {
                    this.traverseConnected(0, col, connected);
                }
            }

            for (let row = 0; row < this.grid.length; row++) {
                if (!this.grid[row]) {
                    continue;
                }

                for (let col = 0; col < this.cols; col++) {
                    const bubble = this.grid[row][col];
                    if (bubble && !connected.has(`${row},${col}`)) {
                        this.dropBubble(bubble, row, col);
                    }
                }
            }

            this.time.delayedCall(700, () => {
                const hasBubbles = this.grid.some((row) => row && row.some((bubble) => bubble !== null));
                if (!hasBubbles) {
                    this.gameOver(true);
                }
            });
        }

        traverseConnected(row, col, connected) {
            const key = `${row},${col}`;
            if (connected.has(key)) {
                return;
            }

            connected.add(key);
            this.getNeighbors(row, col).forEach((neighbor) => {
                this.traverseConnected(neighbor.row, neighbor.col, connected);
            });
        }

        dropBubble(bubble, row, col) {
            this.grid[row][col] = null;
            this.bubbles.remove(bubble);
            this.fallingBubbles.push(bubble);
            bubble.body.setImmovable(false);
            bubble.body.setAllowGravity(false);
            bubble.body.setVelocityY(1000);

            this.time.delayedCall(2200, () => {
                if (bubble.getData('sprite')) {
                    bubble.getData('sprite').destroy();
                }
                if (bubble.active) {
                    bubble.destroy();
                }
            });
        }

        handleFireBurst(projectile, hitBubble) {
            const row = hitBubble.getData('row');
            const col = hitBubble.getData('col');
            const neighbors = this.getNeighbors(row, col);

            if (projectile.getData('sprite')) {
                projectile.getData('sprite').destroy();
            }
            projectile.destroy();

            this.shooterBubble = null;
            this.isShooting = false;

            this.destroyCluster([`${row},${col}`, ...neighbors.map((neighbor) => `${neighbor.row},${neighbor.col}`)]);
            this.dropDisconnected();
        }

        gameOver(win) {
            if (!this.scene.isActive()) {
                return;
            }

            this.scene.pause();
            finishRound(win);
        }

        update() {
            this.bubbles.children.iterate((bubble) => {
                if (bubble && bubble.active && bubble.updateSprite) {
                    bubble.updateSprite();
                }
            });

            this.fallingBubbles = this.fallingBubbles.filter((bubble) => bubble && bubble.active);
            this.fallingBubbles.forEach((bubble) => {
                if (bubble.updateSprite) {
                    bubble.updateSprite();
                }
            });

            if (this.shooterBubble && this.shooterBubble.active) {
                this.shooterBubble.updateSprite();
            }
        }
    }

    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#120804',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: [BubbleShooterScene]
    });

    ui.startButton.addEventListener('click', startRound);
    ui.restartButton.addEventListener('click', startRound);
    ui.fireButton.addEventListener('click', () => {
        if (state.fireReady) {
            const scene = game.scene.getScene('BubbleShooterScene');
            if (scene && scene.scene.isActive()) {
                scene.isFireActive = true;
                scene.nextEmpanada.setTexture('empanada_fire');
                scene.nextEmpanada.setDisplaySize(58, 58);
                state.fireReady = false;
                updateHud();
            }
        }
    });

    updateHud();
    showStart();
})();
