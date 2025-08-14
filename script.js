
// ====================================
// 💥 BOOM BLOCKS! - ULTIMATE EDITION
// Advanced Block Puzzle with AI Movement
// ====================================

class BoomBlocksGame {
    constructor() {
        this.initializeGameState();
        this.initializeSettings();
        this.initializeAudio();
        this.initializeMobileProperties();
        this.bindEvents();
        this.createParticleSystem();
    }

    initializeMobileProperties() {
        this.isDraggingShape = false;
        this.draggedShapeIndex = -1;
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
    }

    initializeGameState() {
        this.gameState = {
            board: Array(8).fill().map(() => Array(8).fill(null)),
            score: 0,
            level: 1,
            xp: 0,
            xpToNext: 1000,
            highScore: parseInt(localStorage.getItem('boomBlocksHighScore')) || 0,
            currentShapes: [],
            selectedShapeIndex: -1,
            turnsPlayed: 0,
            maxCombo: 0,
            currentCombo: 0,
            comboMultiplier: 1,
            isPlaying: false,
            isPaused: false,
            gameTime: 0,
            
            // Advanced mechanics
            blockMoveQueue: [],
            specialAbilities: {
                bomb: { cooldown: 0, maxCooldown: 5 },
                lightning: { cooldown: 0, maxCooldown: 7 },
                magnet: { cooldown: 0, maxCooldown: 6 },
                freeze: { cooldown: 0, maxCooldown: 8 }
            },
            achievements: [],
            powerUps: {
                fire: 3,
                ice: 2
            }
        };
    }

    initializeSettings() {
        this.settings = {
            soundEnabled: true,
            effectsEnabled: true,
            vibrationEnabled: true,
            theme: 'neon'
        };
        this.loadSettings();
    }

    initializeAudio() {
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    // =====================================
    // CORE GAME MECHANICS
    // =====================================

    startGame() {
        this.resetGameState();
        this.showScreen('gameScreen');
        this.generateShapes();
        this.updateAllDisplays();
        this.createBoard();
        this.startGameTimer();
        this.gameState.isPlaying = true;
        this.createAmbientParticles();
    }

    resetGameState() {
        this.gameState.board = Array(8).fill().map(() => Array(8).fill(null));
        this.gameState.score = 0;
        this.gameState.level = 1;
        this.gameState.xp = 0;
        this.gameState.currentCombo = 0;
        this.gameState.maxCombo = 0;
        this.gameState.turnsPlayed = 0;
        this.gameState.gameTime = 0;
        this.gameState.blockMoveQueue = [];
        
        // Reset ability cooldowns
        Object.keys(this.gameState.specialAbilities).forEach(ability => {
            this.gameState.specialAbilities[ability].cooldown = 0;
        });
    }

    createBoard() {
        const boardElement = document.getElementById('gameBoard');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Enhanced cell interactions
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                cell.addEventListener('dragover', this.handleDragOver.bind(this));
                cell.addEventListener('drop', (e) => this.handleDrop(e, row, col));
                cell.addEventListener('mouseenter', () => this.handleCellHover(row, col));
                
                boardElement.appendChild(cell);
            }
        }
    }

    // =====================================
    // ADVANCED SHAPE SYSTEM
    // =====================================

    generateShapes() {
        const SHAPE_DEFINITIONS = [
            // Basic shapes
            { pattern: [[1,1,1,1]], weight: 10 },
            { pattern: [[1],[1],[1],[1]], weight: 10 },
            { pattern: [[1,1],[1,1]], weight: 15 },
            { pattern: [[1]], weight: 20 },
            
            // T-shapes
            { pattern: [[0,1,0],[1,1,1]], weight: 8 },
            { pattern: [[1,0],[1,1],[1,0]], weight: 8 },
            { pattern: [[1,1,1],[0,1,0]], weight: 8 },
            { pattern: [[0,1],[1,1],[0,1]], weight: 8 },
            
            // L-shapes
            { pattern: [[1,0,0],[1,1,1]], weight: 7 },
            { pattern: [[1,1],[1,0],[1,0]], weight: 7 },
            { pattern: [[1,1,1],[0,0,1]], weight: 7 },
            { pattern: [[0,1],[0,1],[1,1]], weight: 7 },
            
            // S-shapes
            { pattern: [[0,1,1],[1,1,0]], weight: 6 },
            { pattern: [[1,0],[1,1],[0,1]], weight: 6 },
            
            // Complex shapes (higher level)
            { pattern: [[1,1,0],[0,1,1],[0,0,1]], weight: 3 },
            { pattern: [[1,0,1],[1,1,1]], weight: 4 },
            { pattern: [[1,1,1,1,1]], weight: 2 }
        ];

        this.gameState.currentShapes = [];
        
        for (let i = 0; i < 3; i++) {
            // Weight-based selection for balanced difficulty
            const totalWeight = SHAPE_DEFINITIONS.reduce((sum, shape) => sum + shape.weight, 0);
            let random = Math.random() * totalWeight;
            
            let selectedShape;
            for (let shape of SHAPE_DEFINITIONS) {
                random -= shape.weight;
                if (random <= 0) {
                    selectedShape = shape;
                    break;
                }
            }
            
            // Determine block type with level-based special block chances
            let blockType = BLOCK_TYPES.NORMAL;
            const specialChance = Math.min(0.05 + (this.gameState.level * 0.02), 0.25);
            
            if (Math.random() < specialChance) {
                blockType = this.getRandomSpecialBlock();
            }
            
            this.gameState.currentShapes.push({
                pattern: selectedShape.pattern,
                blockType: blockType,
                used: false,
                id: Date.now() + i,
                canRotate: selectedShape.pattern.length === selectedShape.pattern[0].length || Math.random() < 0.3
            });
        }
        
        this.renderShapes();
    }

    getRandomSpecialBlock() {
        const specialBlocks = [
            { type: BLOCK_TYPES.BOMB, weight: 25 },
            { type: BLOCK_TYPES.SLIME, weight: 20 },
            { type: BLOCK_TYPES.GHOST, weight: 15 },
            { type: BLOCK_TYPES.RAINBOW, weight: 15 },
            { type: BLOCK_TYPES.MAGNET, weight: 15 },
            { type: BLOCK_TYPES.LIGHTNING, weight: 10 }
        ];
        
        const totalWeight = specialBlocks.reduce((sum, block) => sum + block.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let block of specialBlocks) {
            random -= block.weight;
            if (random <= 0) return block.type;
        }
        
        return BLOCK_TYPES.BOMB;
    }

    // =====================================
    // ENHANCED BLOCK PLACEMENT & MOVEMENT
    // =====================================

    handleCellClick(row, col) {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;
        
        const selectedShape = this.getSelectedShape();
        if (!selectedShape || selectedShape.used) {
            // On mobile, if no shape is selected, auto-select first available shape
            if (this.isMobile()) {
                const availableShape = this.gameState.currentShapes.find(s => !s.used);
                if (availableShape) {
                    const index = this.gameState.currentShapes.indexOf(availableShape);
                    this.selectShape(index);
                    
                    // Try to place it
                    const bestPosition = this.findBestPlacement(availableShape, row, col);
                    if (bestPosition) {
                        this.placeShapeWithAnimation(availableShape, bestPosition.row, bestPosition.col);
                        this.vibrate(100);
                        return;
                    }
                }
            }
            return;
        }
        
        // Smart placement - find best position near clicked cell
        const bestPosition = this.findBestPlacement(selectedShape, row, col);
        
        if (bestPosition) {
            this.placeShapeWithAnimation(selectedShape, bestPosition.row, bestPosition.col);
            this.vibrate(100);
        } else {
            this.showPlacementError(row, col);
            this.vibrate([100, 50, 100]);
        }
    }

    findBestPlacement(shape, targetRow, targetCol) {
        // Try exact position first
        if (this.canPlaceShape(shape, targetRow, targetCol)) {
            return { row: targetRow, col: targetCol };
        }
        
        // Search in expanding radius
        for (let radius = 1; radius <= 3; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    if (Math.abs(dr) === radius || Math.abs(dc) === radius) {
                        const r = targetRow + dr;
                        const c = targetCol + dc;
                        if (this.canPlaceShape(shape, r, c)) {
                            return { row: r, col: c };
                        }
                    }
                }
            }
        }
        
        return null;
    }

    placeShapeWithAnimation(shape, startRow, startCol) {
        if (this.gameState.isPlacing) return;
        
        this.gameState.isPlacing = true;
        const positions = [];
        
        // Calculate all positions that will be filled
        for (let row = 0; row < shape.pattern.length; row++) {
            for (let col = 0; col < shape.pattern[row].length; col++) {
                if (shape.pattern[row][col]) {
                    positions.push({
                        row: startRow + row,
                        col: startCol + col,
                        delay: (row + col) * 50
                    });
                }
            }
        }
        
        // Animate placement
        positions.forEach(pos => {
            setTimeout(() => {
                this.gameState.board[pos.row][pos.col] = {
                    type: shape.blockType,
                    age: 0,
                    id: shape.id + '_' + pos.row + '_' + pos.col,
                    movable: shape.blockType === BLOCK_TYPES.SLIME || Math.random() < 0.1,
                    energy: 100
                };
                
                this.animateCellPlacement(pos.row, pos.col);
            }, pos.delay);
        });
        
        // Complete placement
        setTimeout(() => {
            shape.used = true;
            this.gameState.selectedShapeIndex = -1;
            this.gameState.isPlacing = false;
            
            this.processPlacement();
            this.checkForNewShapes();
        }, positions.length * 50 + 100);
        
        this.playSound('place');
        this.addScore(10);
    }

    animateCellPlacement(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('placing');
            setTimeout(() => cell.classList.remove('placing'), 300);
        }
        this.renderBoard();
    }

    // =====================================
    // MOVABLE BLOCKS SYSTEM
    // =====================================

    updateMovableBlocks() {
        const movements = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const block = this.gameState.board[row][col];
                if (block && block.movable && block.energy > 0) {
                    const movement = this.calculateBlockMovement(row, col, block);
                    if (movement) {
                        movements.push(movement);
                    }
                }
            }
        }
        
        // Execute movements
        movements.forEach(movement => {
            this.executeBlockMovement(movement);
        });
        
        if (movements.length > 0) {
            this.renderBoard();
        }
    }

    calculateBlockMovement(row, col, block) {
        const directions = [
            { dr: -1, dc: 0 }, // up
            { dr: 1, dc: 0 },  // down
            { dr: 0, dc: -1 }, // left
            { dr: 0, dc: 1 }   // right
        ];
        
        // Different movement behaviors based on block type
        switch (block.type) {
            case BLOCK_TYPES.SLIME:
                return this.calculateSlimeMovement(row, col, directions);
            case BLOCK_TYPES.MAGNET:
                return this.calculateMagnetMovement(row, col, directions);
            default:
                return this.calculateRandomMovement(row, col, directions);
        }
    }

    calculateSlimeMovement(row, col, directions) {
        // Slime seeks empty spaces and spreads
        const emptyDirections = directions.filter(dir => {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            return this.isValidPosition(newRow, newCol) && 
                   !this.gameState.board[newRow][newCol];
        });
        
        if (emptyDirections.length > 0 && Math.random() < 0.3) {
            const direction = emptyDirections[Math.floor(Math.random() * emptyDirections.length)];
            return {
                fromRow: row,
                fromCol: col,
                toRow: row + direction.dr,
                toCol: col + direction.dc,
                type: 'spread'
            };
        }
        
        return null;
    }

    calculateMagnetMovement(row, col, directions) {
        // Magnet pulls other blocks toward it
        const nearbyBlocks = [];
        
        for (let r = row - 2; r <= row + 2; r++) {
            for (let c = col - 2; c <= col + 2; c++) {
                if (this.isValidPosition(r, c) && 
                    this.gameState.board[r][c] && 
                    (r !== row || c !== col)) {
                    nearbyBlocks.push({ row: r, col: c });
                }
            }
        }
        
        if (nearbyBlocks.length > 0 && Math.random() < 0.2) {
            const targetBlock = nearbyBlocks[Math.floor(Math.random() * nearbyBlocks.length)];
            const pullDirection = this.getDirectionTowards(targetBlock.row, targetBlock.col, row, col);
            
            if (pullDirection) {
                return {
                    fromRow: targetBlock.row,
                    fromCol: targetBlock.col,
                    toRow: targetBlock.row + pullDirection.dr,
                    toCol: targetBlock.col + pullDirection.dc,
                    type: 'pull'
                };
            }
        }
        
        return null;
    }

    calculateRandomMovement(row, col, directions) {
        if (Math.random() < 0.05) { // 5% chance to move
            const availableDirections = directions.filter(dir => {
                const newRow = row + dir.dr;
                const newCol = col + dir.dc;
                return this.isValidPosition(newRow, newCol) && 
                       !this.gameState.board[newRow][newCol];
            });
            
            if (availableDirections.length > 0) {
                const direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
                return {
                    fromRow: row,
                    fromCol: col,
                    toRow: row + direction.dr,
                    toCol: col + direction.dc,
                    type: 'drift'
                };
            }
        }
        
        return null;
    }

    executeBlockMovement(movement) {
        const block = this.gameState.board[movement.fromRow][movement.fromCol];
        
        if (movement.type === 'spread' && block.type === BLOCK_TYPES.SLIME) {
            // Create new slime block
            this.gameState.board[movement.toRow][movement.toCol] = {
                ...block,
                age: 0,
                energy: 80
            };
        } else if (this.isValidPosition(movement.toRow, movement.toCol) && 
                   !this.gameState.board[movement.toRow][movement.toCol]) {
            // Move block
            this.gameState.board[movement.toRow][movement.toCol] = block;
            this.gameState.board[movement.fromRow][movement.fromCol] = null;
            block.energy = Math.max(0, block.energy - 10);
        }
    }

    // =====================================
    // ENHANCED SPECIAL ABILITIES
    // =====================================

    useAbility(abilityType) {
        const ability = this.gameState.specialAbilities[abilityType];
        if (ability.cooldown > 0) return;
        
        switch (abilityType) {
            case 'bomb':
                this.activateMegaBomb();
                break;
            case 'lightning':
                this.activateLightningStrike();
                break;
            case 'magnet':
                this.activateGlobalMagnet();
                break;
            case 'freeze':
                this.activateTimeFreeze();
                break;
        }
        
        ability.cooldown = ability.maxCooldown;
        this.updateAbilitiesDisplay();
        this.playSound('ability');
    }

    activateMegaBomb() {
        // Player selects target location
        this.showTargetSelector((row, col) => {
            this.createExplosion(row, col, 3); // 7x7 explosion
            this.addScore(200);
            this.showAbilityText('💣 MEGA BOMB!');
        });
    }

    activateLightningStrike() {
        // Strike 3 random lines
        const strikes = Math.min(3, Math.floor(Math.random() * 3) + 2);
        
        for (let i = 0; i < strikes; i++) {
            setTimeout(() => {
                if (Math.random() < 0.5) {
                    // Clear random row
                    const row = Math.floor(Math.random() * 8);
                    this.clearLineWithLightning('row', row);
                } else {
                    // Clear random column  
                    const col = Math.floor(Math.random() * 8);
                    this.clearLineWithLightning('col', col);
                }
            }, i * 200);
        }
        
        this.showAbilityText('⚡ LIGHTNING STORM!');
        this.addScore(150);
    }

    activateGlobalMagnet() {
        // Reorganize all blocks toward center
        const centerRow = 3.5;
        const centerCol = 3.5;
        const allBlocks = [];
        
        // Collect all blocks
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.gameState.board[row][col]) {
                    allBlocks.push({
                        block: this.gameState.board[row][col],
                        originalRow: row,
                        originalCol: col,
                        distance: Math.abs(row - centerRow) + Math.abs(col - centerCol)
                    });
                    this.gameState.board[row][col] = null;
                }
            }
        }
        
        // Sort by distance to center and redistribute
        allBlocks.sort((a, b) => a.distance - b.distance);
        
        const spiralPositions = this.generateSpiralFromCenter();
        allBlocks.forEach((blockData, index) => {
            if (index < spiralPositions.length) {
                const pos = spiralPositions[index];
                this.gameState.board[pos.row][pos.col] = blockData.block;
            }
        });
        
        this.renderBoard();
        this.showAbilityText('🧲 MAGNETIC PULL!');
        this.addScore(100);
    }

    activateTimeFreeze() {
        // Stop all automatic processes for 10 seconds
        this.gameState.frozenTime = Date.now() + 10000;
        document.body.classList.add('frozen');
        
        setTimeout(() => {
            this.gameState.frozenTime = 0;
            document.body.classList.remove('frozen');
        }, 10000);
        
        this.showAbilityText('❄️ TIME FREEZE!');
    }

    // =====================================
    // ENHANCED SPECIAL BLOCKS
    // =====================================

    processSpecialBlocks() {
        if (this.gameState.frozenTime && Date.now() < this.gameState.frozenTime) {
            return; // Skip if time is frozen
        }

        const board = this.gameState.board;
        const explosions = [];
        
        // Process bombs with enhanced explosion
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] && board[row][col].type === BLOCK_TYPES.BOMB) {
                    explosions.push({ row, col, radius: 2 });
                    board[row][col] = null;
                }
            }
        }
        
        // Execute explosions
        explosions.forEach(explosion => {
            this.createExplosion(explosion.row, explosion.col, explosion.radius);
        });
        
        // Process other special blocks
        this.processSlimeBlocks();
        this.processGhostBlocks();
        this.processRainbowBlocks();
        this.processMagnetBlocks();
        this.processLightningBlocks();
        
        // Age all blocks
        this.ageBlocks();
    }

    createExplosion(centerRow, centerCol, radius) {
        const explosionEffect = document.createElement('div');
        explosionEffect.className = 'explosion-effect';
        explosionEffect.style.left = (centerCol * 63 + 31) + 'px';
        explosionEffect.style.top = (centerRow * 63 + 31) + 'px';
        
        // Create explosion particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            
            const angle = (i / 20) * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
            particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
            
            explosionEffect.appendChild(particle);
        }
        
        document.getElementById('boardEffects').appendChild(explosionEffect);
        
        setTimeout(() => {
            explosionEffect.remove();
        }, 1000);
        
        // Clear blocks in explosion radius
        let blocksDestroyed = 0;
        for (let row = centerRow - radius; row <= centerRow + radius; row++) {
            for (let col = centerCol - radius; col <= centerCol + radius; col++) {
                if (this.isValidPosition(row, col) && this.gameState.board[row][col]) {
                    this.gameState.board[row][col] = null;
                    blocksDestroyed++;
                }
            }
        }
        
        this.addScore(blocksDestroyed * 25);
        this.playSound('explosion');
        this.triggerScreenShake();
    }

    processLightningBlocks() {
        const board = this.gameState.board;
        const lightningStrikes = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] && board[row][col].type === BLOCK_TYPES.LIGHTNING) {
                    // Lightning has a chance to strike
                    if (Math.random() < 0.3) {
                        lightningStrikes.push({ row, col });
                    }
                }
            }
        }
        
        lightningStrikes.forEach(strike => {
            // Random direction strike
            if (Math.random() < 0.5) {
                this.clearLineWithLightning('row', strike.row);
            } else {
                this.clearLineWithLightning('col', strike.col);
            }
        });
    }

    clearLineWithLightning(type, index) {
        const effect = document.createElement('div');
        effect.className = 'lightning-effect';
        
        if (type === 'row') {
            for (let col = 0; col < 8; col++) {
                if (this.gameState.board[index][col]) {
                    this.gameState.board[index][col] = null;
                    this.addScore(15);
                }
            }
        } else {
            for (let row = 0; row < 8; row++) {
                if (this.gameState.board[row][index]) {
                    this.gameState.board[row][index] = null;
                    this.addScore(15);
                }
            }
        }
        
        this.renderBoard();
        this.playSound('lightning');
    }

    // =====================================
    // GAME PROGRESSION & SCORING
    // =====================================

    addScore(points) {
        const multiplier = 1 + (this.gameState.currentCombo * 0.1);
        const finalPoints = Math.floor(points * multiplier);
        
        this.gameState.score += finalPoints;
        this.gameState.xp += Math.floor(finalPoints / 10);
        
        this.checkLevelUp();
        this.updateScoreDisplay();
        
        // Show floating score
        this.showFloatingScore(finalPoints);
    }

    checkLevelUp() {
        while (this.gameState.xp >= this.gameState.xpToNext) {
            this.gameState.xp -= this.gameState.xpToNext;
            this.gameState.level++;
            this.gameState.xpToNext = Math.floor(this.gameState.xpToNext * 1.2);
            
            this.showLevelUpEffect();
            this.unlockNewFeatures();
        }
    }

    showLevelUpEffect() {
        this.showAbilityText(`🆙 LEVEL ${this.gameState.level}!`);
        this.playSound('levelup');
        this.createCelebrationParticles();
        
        // Reduce ability cooldowns
        Object.keys(this.gameState.specialAbilities).forEach(ability => {
            this.gameState.specialAbilities[ability].cooldown = Math.max(0, 
                this.gameState.specialAbilities[ability].cooldown - 1);
        });
    }

    unlockNewFeatures() {
        const level = this.gameState.level;
        
        if (level === 5) {
            this.showAchievement('🔓 Lightning Blocks Unlocked!');
        } else if (level === 10) {
            this.showAchievement('🔓 Chaos Mode Available!');
        } else if (level === 15) {
            this.showAchievement('🔓 Master Abilities Unlocked!');
        }
    }

    // =====================================
    // ENHANCED UI & EFFECTS
    // =====================================

    showTargetSelector(callback) {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.add('targetable');
            const handler = () => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                callback(row, col);
                
                // Clean up
                document.querySelectorAll('.cell').forEach(c => {
                    c.classList.remove('targetable');
                    c.removeEventListener('click', handler);
                });
            };
            cell.addEventListener('click', handler);
        });
    }

    showFloatingScore(points) {
        const floatingScore = document.createElement('div');
        floatingScore.className = 'floating-score';
        floatingScore.textContent = `+${points}`;
        floatingScore.style.position = 'fixed';
        floatingScore.style.left = '50%';
        floatingScore.style.top = '30%';
        floatingScore.style.transform = 'translateX(-50%)';
        floatingScore.style.color = 'var(--neon-yellow)';
        floatingScore.style.fontSize = '2rem';
        floatingScore.style.fontWeight = 'bold';
        floatingScore.style.zIndex = '1001';
        floatingScore.style.animation = 'floatingScore 2s ease-out forwards';
        
        document.body.appendChild(floatingScore);
        
        setTimeout(() => {
            floatingScore.remove();
        }, 2000);
    }

    showAbilityText(text) {
        const abilityText = document.createElement('div');
        abilityText.className = 'ability-text';
        abilityText.textContent = text;
        abilityText.style.position = 'fixed';
        abilityText.style.top = '20%';
        abilityText.style.left = '50%';
        abilityText.style.transform = 'translateX(-50%)';
        abilityText.style.fontSize = '3rem';
        abilityText.style.fontWeight = 'bold';
        abilityText.style.color = 'var(--neon-pink)';
        abilityText.style.textShadow = '0 0 20px var(--neon-pink)';
        abilityText.style.zIndex = '1002';
        abilityText.style.animation = 'abilityText 3s ease-out forwards';
        
        document.body.appendChild(abilityText);
        
        setTimeout(() => {
            abilityText.remove();
        }, 3000);
    }

    createCelebrationParticles() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight + 20,
                    color: ['var(--neon-blue)', 'var(--neon-pink)', 'var(--neon-green)', 'var(--neon-yellow)'][Math.floor(Math.random() * 4)],
                    speed: Math.random() * 5 + 3,
                    size: Math.random() * 8 + 4
                });
            }, i * 20);
        }
    }

    createParticle(config) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = config.x + 'px';
        particle.style.top = config.y + 'px';
        particle.style.width = config.size + 'px';
        particle.style.height = config.size + 'px';
        particle.style.background = config.color;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '500';
        particle.style.animation = 'particleFloat 3s linear forwards';
        
        document.getElementById('particleSystem').appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 3000);
    }

    triggerScreenShake() {
        if (!this.settings.effectsEnabled) return;
        
        document.body.style.animation = 'screenShake 0.5s ease-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);
    }

    // =====================================
    // UTILITY FUNCTIONS
    // =====================================

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    canPlaceShape(shape, startRow, startCol) {
        for (let row = 0; row < shape.pattern.length; row++) {
            for (let col = 0; col < shape.pattern[row].length; col++) {
                if (shape.pattern[row][col]) {
                    const boardRow = startRow + row;
                    const boardCol = startCol + col;
                    
                    if (!this.isValidPosition(boardRow, boardCol)) {
                        return false;
                    }
                    
                    // Ghost blocks can overlap
                    if (this.gameState.board[boardRow][boardCol] && 
                        shape.blockType !== BLOCK_TYPES.GHOST) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    getSelectedShape() {
        if (this.gameState.selectedShapeIndex >= 0) {
            return this.gameState.currentShapes[this.gameState.selectedShapeIndex];
        }
        return null;
    }

    generateSpiralFromCenter() {
        const positions = [];
        const visited = Array(8).fill().map(() => Array(8).fill(false));
        
        let row = 3, col = 3;
        let dx = 0, dy = 1;
        
        for (let i = 0; i < 64; i++) {
            if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                positions.push({ row, col });
                visited[row][col] = true;
            }
            
            const nextRow = row + dx;
            const nextCol = col + dy;
            
            if (nextRow < 0 || nextRow >= 8 || nextCol < 0 || nextCol >= 8 || 
                visited[nextRow][nextCol]) {
                const temp = dx;
                dx = -dy;
                dy = temp;
            }
            
            row += dx;
            col += dy;
        }
        
        return positions;
    }

    // =====================================
    // RENDER FUNCTIONS
    // =====================================

    renderBoard() {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const block = this.gameState.board[row][col];
            
            // Reset classes
            cell.className = 'cell';
            cell.textContent = '';
            
            if (block) {
                cell.classList.add('filled', block.type);
                cell.textContent = this.getBlockEmoji(block.type);
                
                if (block.movable) {
                    cell.classList.add('movable');
                }
                
                // Energy-based opacity for aging blocks
                if (block.energy < 100) {
                    cell.style.opacity = Math.max(0.3, block.energy / 100);
                }
            } else {
                cell.style.opacity = 1;
            }
        });
    }

    renderShapes() {
        const container = document.getElementById('shapesContainer');
        container.innerHTML = '';
        
        this.gameState.currentShapes.forEach((shape, index) => {
            if (shape.used) return;
            
            const shapeDiv = document.createElement('div');
            shapeDiv.className = `shape-preview ${this.gameState.selectedShapeIndex === index ? 'selected' : ''}`;
            shapeDiv.draggable = true;
            shapeDiv.dataset.shapeIndex = index;
            
            // Enhanced shape interactions
            shapeDiv.onclick = () => this.selectShape(index);
            shapeDiv.ondblclick = () => this.rotateShape(index);
            shapeDiv.ondragstart = (e) => this.handleDragStart(e, index);
            
            const shapeGrid = document.createElement('div');
            shapeGrid.className = 'shape-grid';
            shapeGrid.style.gridTemplateColumns = `repeat(${shape.pattern[0].length}, 25px)`;
            
            shape.pattern.forEach(row => {
                row.forEach(cell => {
                    const cellDiv = document.createElement('div');
                    cellDiv.className = 'shape-cell';
                    if (cell) {
                        cellDiv.classList.add('filled');
                        cellDiv.textContent = this.getBlockEmoji(shape.blockType);
                    }
                    shapeGrid.appendChild(cellDiv);
                });
            });
            
            shapeDiv.appendChild(shapeGrid);
            
            // Add rotation indicator
            if (shape.canRotate) {
                const rotateIndicator = document.createElement('div');
                rotateIndicator.className = 'rotate-indicator';
                rotateIndicator.textContent = '🔄';
                shapeDiv.appendChild(rotateIndicator);
            }
            
            container.appendChild(shapeDiv);
        });
    }

    updateAllDisplays() {
        this.updateScoreDisplay();
        this.updateLevelDisplay();
        this.updateAbilitiesDisplay();
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.gameState.score.toLocaleString();
        document.getElementById('highScore').textContent = this.gameState.highScore.toLocaleString();
        document.getElementById('comboCount').textContent = this.gameState.currentCombo;
    }

    updateLevelDisplay() {
        document.getElementById('level').textContent = this.gameState.level;
        const xpPercentage = (this.gameState.xp / this.gameState.xpToNext) * 100;
        document.getElementById('xpFill').style.width = xpPercentage + '%';
    }

    updateAbilitiesDisplay() {
        Object.keys(this.gameState.specialAbilities).forEach(ability => {
            const btn = document.getElementById(ability + 'Ability');
            const cooldownEl = document.getElementById(ability + 'Cooldown');
            
            if (btn && cooldownEl) {
                const cooldown = this.gameState.specialAbilities[ability].cooldown;
                const maxCooldown = this.gameState.specialAbilities[ability].maxCooldown;
                
                if (cooldown > 0) {
                    btn.classList.add('cooldown');
                    const percentage = ((maxCooldown - cooldown) / maxCooldown) * 360;
                    cooldownEl.style.background = `conic-gradient(var(--neon-pink) ${percentage}deg, transparent ${percentage}deg)`;
                } else {
                    btn.classList.remove('cooldown');
                    cooldownEl.style.background = '';
                }
            }
        });
    }

    // =====================================
    // BLOCK TYPES AND EMOJIS
    // =====================================

    getBlockEmoji(blockType) {
        switch (blockType) {
            case BLOCK_TYPES.BOMB: return '💣';
            case BLOCK_TYPES.SLIME: return '🟩';
            case BLOCK_TYPES.GHOST: return '👻';
            case BLOCK_TYPES.RAINBOW: return '🌈';
            case BLOCK_TYPES.MAGNET: return '🧲';
            case BLOCK_TYPES.LIGHTNING: return '⚡';
            default: return '';
        }
    }

    // =====================================
    // EVENT HANDLERS
    // =====================================

    bindEvents() {
        // Shape rotation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                if (this.gameState.selectedShapeIndex >= 0) {
                    this.rotateShape(this.gameState.selectedShapeIndex);
                }
            }
        });

        // Mobile-specific touch events
        this.setupMobileControls();
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (this.isMobile()) {
                e.preventDefault();
            }
        });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 500);
        });

        // Prevent pinch zoom
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Auto-update movable blocks
        setInterval(() => {
            if (this.gameState.isPlaying && !this.gameState.isPaused) {
                this.updateMovableBlocks();
                this.updateAbilityCooldowns();
            }
        }, 2000);
    }

    setupMobileControls() {
        // Touch handling for shapes
        document.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });

        // Double tap to rotate on mobile
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                const target = e.target.closest('.shape-preview');
                if (target) {
                    const shapeIndex = parseInt(target.dataset.shapeIndex);
                    if (shapeIndex >= 0) {
                        this.rotateShape(shapeIndex);
                        e.preventDefault();
                    }
                }
            }
            lastTap = currentTime;
        });
    }

    handleTouchStart(e) {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;

        this.touchStartTime = Date.now();
        this.touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };

        // Handle shape selection on touch
        const shapeElement = e.target.closest('.shape-preview');
        if (shapeElement) {
            const shapeIndex = parseInt(shapeElement.dataset.shapeIndex);
            this.selectShape(shapeIndex);
            this.isDraggingShape = true;
            this.draggedShapeIndex = shapeIndex;
            
            // Provide haptic feedback
            this.vibrate(50);
            
            e.preventDefault();
        }
    }

    handleTouchMove(e) {
        if (!this.isDraggingShape) return;

        const touch = e.touches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const cell = elementBelow?.closest('.cell');
        
        if (cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const selectedShape = this.getSelectedShape();
            
            if (selectedShape) {
                this.previewShapePlacement(selectedShape, row, col);
            }
        }

        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (!this.isDraggingShape) return;

        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const cell = elementBelow?.closest('.cell');
        
        if (cell) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const selectedShape = this.getSelectedShape();
            
            if (selectedShape && this.canPlaceShape(selectedShape, row, col)) {
                this.placeShapeWithAnimation(selectedShape, row, col);
                this.vibrate(100);
            } else {
                this.vibrate([100, 50, 100]); // Error pattern
            }
        }

        // Clear preview
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('preview-valid', 'preview-invalid');
        });

        this.isDraggingShape = false;
        this.draggedShapeIndex = -1;
        e.preventDefault();
    }

    isMobile() {
        return window.innerWidth <= 768 || 
               'ontouchstart' in window || 
               navigator.maxTouchPoints > 0;
    }

    vibrate(pattern) {
        if (this.settings.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    handleOrientationChange() {
        // Recalculate layout after orientation change
        if (this.gameState.isPlaying) {
            this.renderBoard();
            this.renderShapes();
            this.updateAllDisplays();
        }
        
        // Hide address bar on mobile browsers
        if (this.isMobile()) {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 100);
        }
    }

    // Additional methods for completeness...
    selectShape(index) {
        if (this.gameState.currentShapes[index].used) return;
        this.gameState.selectedShapeIndex = index;
        this.renderShapes();
    }

    rotateShape(index) {
        const shape = this.gameState.currentShapes[index];
        if (!shape.canRotate || shape.used) return;
        
        const rotated = this.rotateMatrix(shape.pattern);
        shape.pattern = rotated;
        this.renderShapes();
        this.playSound('rotate');
    }

    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = matrix[i][j];
            }
        }
        
        return rotated;
    }

    handleDragStart(e, shapeIndex) {
        this.selectShape(shapeIndex);
        e.dataTransfer.setData('text/plain', shapeIndex);
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e, row, col) {
        e.preventDefault();
        const shapeIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const shape = this.gameState.currentShapes[shapeIndex];
        
        if (this.canPlaceShape(shape, row, col)) {
            this.placeShapeWithAnimation(shape, row, col);
        }
    }

    handleCellHover(row, col) {
        const selectedShape = this.getSelectedShape();
        if (selectedShape && !selectedShape.used) {
            this.previewShapePlacement(selectedShape, row, col);
        }
    }

    previewShapePlacement(shape, startRow, startCol) {
        // Clear previous preview
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('preview-valid', 'preview-invalid');
        });
        
        const canPlace = this.canPlaceShape(shape, startRow, startCol);
        
        for (let row = 0; row < shape.pattern.length; row++) {
            for (let col = 0; col < shape.pattern[row].length; col++) {
                if (shape.pattern[row][col]) {
                    const boardRow = startRow + row;
                    const boardCol = startCol + col;
                    
                    if (this.isValidPosition(boardRow, boardCol)) {
                        const cell = document.querySelector(`[data-row="${boardRow}"][data-col="${boardCol}"]`);
                        if (cell) {
                            cell.classList.add(canPlace ? 'preview-valid' : 'preview-invalid');
                        }
                    }
                }
            }
        }
    }

    // Screen management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // Settings
    showSettings() {
        this.showScreen('settingsScreen');
    }

    showInstructions() {
        this.showScreen('instructionsScreen');
    }

    backToStart() {
        this.showScreen('startScreen');
    }

    // Game state management
    pauseGame() {
        this.gameState.isPaused = true;
        this.showScreen('pauseScreen');
        document.getElementById('pauseScore').textContent = this.gameState.score.toLocaleString();
        document.getElementById('pauseLevel').textContent = this.gameState.level;
        document.getElementById('pauseTime').textContent = this.formatTime(this.gameState.gameTime);
    }

    resumeGame() {
        this.gameState.isPaused = false;
        this.showScreen('gameScreen');
    }

    endGame() {
        this.gameState.isPlaying = false;
        
        // Check for high score
        if (this.gameState.score > this.gameState.highScore) {
            this.gameState.highScore = this.gameState.score;
            localStorage.setItem('boomBlocksHighScore', this.gameState.highScore);
            document.getElementById('newHighScore').style.display = 'block';
        } else {
            document.getElementById('newHighScore').style.display = 'none';
        }
        
        document.getElementById('finalScore').textContent = this.gameState.score.toLocaleString();
        document.getElementById('finalLevel').textContent = this.gameState.level;
        document.getElementById('maxCombo').textContent = this.gameState.maxCombo;
        
        this.showScreen('gameOverScreen');
    }

    // Utility functions
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    startGameTimer() {
        this.gameTimer = setInterval(() => {
            if (this.gameState.isPlaying && !this.gameState.isPaused) {
                this.gameState.gameTime++;
            }
        }, 1000);
    }

    updateAbilityCooldowns() {
        Object.keys(this.gameState.specialAbilities).forEach(ability => {
            if (this.gameState.specialAbilities[ability].cooldown > 0) {
                this.gameState.specialAbilities[ability].cooldown--;
            }
        });
        this.updateAbilitiesDisplay();
    }

    // Audio system
    playSound(type) {
        if (!this.settings.soundEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const soundConfigs = {
                place: { freq: [400, 200], duration: 0.1, type: 'sine' },
                clear: { freq: [800, 400], duration: 0.3, type: 'triangle' },
                explosion: { freq: [100, 50], duration: 0.5, type: 'sawtooth' },
                ability: { freq: [600, 1000], duration: 0.4, type: 'square' },
                levelup: { freq: [440, 660, 880], duration: 0.6, type: 'sine' },
                rotate: { freq: [300, 350], duration: 0.1, type: 'triangle' }
            };
            
            const config = soundConfigs[type] || soundConfigs.place;
            
            oscillator.type = config.type;
            oscillator.frequency.setValueAtTime(config.freq[0], this.audioContext.currentTime);
            
            if (config.freq.length > 1) {
                config.freq.slice(1).forEach((freq, i) => {
                    oscillator.frequency.exponentialRampToValueAtTime(
                        freq, 
                        this.audioContext.currentTime + (i + 1) * (config.duration / config.freq.length)
                    );
                });
            }
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + config.duration);
        } catch (e) {
            console.log('Audio error:', e);
        }
    }

    // Settings management
    loadSettings() {
        const saved = localStorage.getItem('boomBlocksSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('boomBlocksSettings', JSON.stringify(this.settings));
    }

    // Particle system
    createParticleSystem() {
        this.particleSystem = document.getElementById('particleSystem');
    }

    createAmbientParticles() {
        setInterval(() => {
            if (this.gameState.isPlaying && Math.random() < 0.3) {
                this.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight + 20,
                    color: 'rgba(0, 245, 255, 0.6)',
                    speed: Math.random() * 2 + 1,
                    size: Math.random() * 3 + 1
                });
            }
        }, 2000);
    }

    // Stub methods for missing functionality
    processPlacement() {
        setTimeout(() => {
            this.processSpecialBlocks();
            this.checkForClears();
        }, 100);
    }

    checkForNewShapes() {
        if (this.gameState.currentShapes.every(s => s.used)) {
            setTimeout(() => {
                this.generateShapes();
                this.gameState.turnsPlayed++;
                this.checkMischiefEvent();
            }, 500);
        }
    }

    checkForClears() {
        const clearedLines = [];
        
        // Check rows
        for (let row = 0; row < 8; row++) {
            if (this.gameState.board[row].every(cell => cell !== null)) {
                clearedLines.push({ type: 'row', index: row });
            }
        }
        
        // Check columns
        for (let col = 0; col < 8; col++) {
            if (this.gameState.board.every(row => row[col] !== null)) {
                clearedLines.push({ type: 'col', index: col });
            }
        }
        
        if (clearedLines.length > 0) {
            this.processLineClears(clearedLines);
        }
    }

    processLineClears(lines) {
        // Clear the lines
        lines.forEach(line => {
            if (line.type === 'row') {
                for (let col = 0; col < 8; col++) {
                    this.gameState.board[line.index][col] = null;
                }
            } else {
                for (let row = 0; row < 8; row++) {
                    this.gameState.board[row][line.index] = null;
                }
            }
        });

        // Update combo
        this.gameState.currentCombo = lines.length;
        this.gameState.maxCombo = Math.max(this.gameState.maxCombo, this.gameState.currentCombo);

        // Award points
        const baseScore = lines.length * 100;
        const comboBonus = lines.length > 1 ? baseScore * lines.length : 0;
        this.addScore(baseScore + comboBonus);

        if (lines.length > 1) {
            this.showAbilityText(`${lines.length}x COMBO!`);
            this.createCelebrationParticles();
        }

        this.playSound('clear');
        this.renderBoard();
    }

    checkMischiefEvent() {
        if (this.gameState.turnsPlayed % 7 === 0 && Math.random() < 0.4) {
            this.triggerMischiefEvent();
        }
    }

    triggerMischiefEvent() {
        const events = [
            () => this.spawnRandomSpecialBlocks(2),
            () => this.shuffleBoardBlocks(),
            () => this.triggerRandomExplosion()
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        event();
        
        this.showAbilityText('🎲 MISCHIEF EVENT!');
    }

    spawnRandomSpecialBlocks(count) {
        const emptyPositions = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (!this.gameState.board[row][col]) {
                    emptyPositions.push({ row, col });
                }
            }
        }

        for (let i = 0; i < count && emptyPositions.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * emptyPositions.length);
            const pos = emptyPositions.splice(randomIndex, 1)[0];
            
            this.gameState.board[pos.row][pos.col] = {
                type: this.getRandomSpecialBlock(),
                age: 0,
                movable: true,
                energy: 100
            };
        }
        
        this.renderBoard();
    }

    shuffleBoardBlocks() {
        const allBlocks = [];
        
        // Collect all blocks
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.gameState.board[row][col]) {
                    allBlocks.push(this.gameState.board[row][col]);
                    this.gameState.board[row][col] = null;
                }
            }
        }
        
        // Randomly redistribute
        allBlocks.forEach(block => {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * 8);
                const col = Math.floor(Math.random() * 8);
                
                if (!this.gameState.board[row][col]) {
                    this.gameState.board[row][col] = block;
                    placed = true;
                }
                attempts++;
            }
        });
        
        this.renderBoard();
    }

    triggerRandomExplosion() {
        const row = Math.floor(Math.random() * 8);
        const col = Math.floor(Math.random() * 8);
        this.createExplosion(row, col, 1);
    }

    // More stub implementations for missing methods
    processSlimeBlocks() {
        // Implementation for slime spreading
    }

    processGhostBlocks() {
        // Implementation for ghost behavior
    }

    processRainbowBlocks() {
        // Implementation for rainbow effects
    }

    processMagnetBlocks() {
        // Implementation for magnet effects
    }

    ageBlocks() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.gameState.board[row][col]) {
                    this.gameState.board[row][col].age++;
                    if (this.gameState.board[row][col].energy > 0) {
                        this.gameState.board[row][col].energy -= 2;
                    }
                }
            }
        }
    }

    getDirectionTowards(fromRow, fromCol, toRow, toCol) {
        const dr = Math.sign(toRow - fromRow);
        const dc = Math.sign(toCol - fromCol);
        
        if (dr === 0 && dc === 0) return null;
        
        return { dr, dc };
    }

    showPlacementError(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('placement-error');
            setTimeout(() => cell.classList.remove('placement-error'), 500);
        }
    }

    showAchievement(text) {
        this.showAbilityText(text);
        this.gameState.achievements.push(text);
    }
}

// =====================================
// CONSTANTS
// =====================================

const BLOCK_TYPES = {
    NORMAL: 'normal',
    BOMB: 'bomb',
    SLIME: 'slime',
    GHOST: 'ghost',
    RAINBOW: 'rainbow',
    MAGNET: 'magnet',
    LIGHTNING: 'lightning'
};

// =====================================
// GLOBAL FUNCTIONS FOR HTML
// =====================================

let game;

// Initialize game when page loads
window.addEventListener('load', () => {
    game = new BoomBlocksGame();
    document.getElementById('highScore').textContent = game.gameState.highScore.toLocaleString();
});

// Global functions called by HTML buttons
function startGame() {
    game.startGame();
}

function showInstructions() {
    game.showInstructions();
}

function showSettings() {
    game.showSettings();
}

function backToStart() {
    game.backToStart();
}

function pauseGame() {
    game.pauseGame();
}

function resumeGame() {
    game.resumeGame();
}

function endGame() {
    game.endGame();
}

function useAbility(type) {
    game.useAbility(type);
}

// Add CSS animations for new effects
const additionalStyles = `
@keyframes floatingScore {
    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-100px) scale(1.5); }
}

@keyframes abilityText {
    0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
    20% { opacity: 1; transform: translateX(-50%) scale(1.2); }
    80% { opacity: 1; transform: translateX(-50%) scale(1); }
    100% { opacity: 0; transform: translateX(-50%) scale(0.8); }
}

@keyframes screenShake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.cell.placing {
    animation: placementPulse 0.3s ease;
}

@keyframes placementPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

.cell.preview-valid {
    background-color: rgba(57, 255, 20, 0.3) !important;
    border-color: var(--neon-green) !important;
}

.cell.preview-invalid {
    background-color: rgba(255, 70, 70, 0.3) !important;
    border-color: #ff4646 !important;
}

.cell.placement-error {
    animation: errorShake 0.5s ease;
}

@keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
}

.cell.targetable {
    cursor: crosshair;
    border-color: var(--neon-yellow) !important;
    animation: targetPulse 1s infinite;
}

@keyframes targetPulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 255, 0, 0.5); }
    50% { box-shadow: 0 0 20px rgba(255, 255, 0, 0.8); }
}

.frozen * {
    animation-play-state: paused !important;
}

.rotate-indicator {
    position: absolute;
    top: -10px;
    right: -10px;
    font-size: 0.8rem;
    opacity: 0.7;
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
