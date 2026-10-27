// =========================================================================
// SHAPE GENERATION SYSTEM (Pre-calculated Shapes & 4 Pools)
// =========================================================================

function coordsToMatrix(coords) {
    let maxR = 0, maxC = 0;
    for (let i = 0; i < coords.length; i++) {
        if (coords[i][0] > maxR) maxR = coords[i][0];
        if (coords[i][1] > maxC) maxC = coords[i][1];
    }
    const matrix = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(0));
    for (let i = 0; i < coords.length; i++) {
        matrix[coords[i][0]][coords[i][1]] = 1;
    }
    return matrix;
}

const RAW_SHAPE_DEFINITIONS = [
    // --- MICRO (1-2 blocks & 2x2) ---
    { id: 'dot_1x1', category: 'micro', coords: [[0, 0]] },
    { id: 'domino_h', category: 'micro', coords: [[0, 0], [0, 1]] },
    { id: 'domino_v', category: 'micro', coords: [[0, 0], [1, 0]] },
    { id: 'box_2x2', category: 'micro', coords: [[0, 0], [0, 1], [1, 0], [1, 1]] },

    // --- LINE (3-5 blocks horizontal/vertical) ---
    { id: 'trio_h', category: 'line', coords: [[0, 0], [0, 1], [0, 2]] },
    { id: 'trio_v', category: 'line', coords: [[0, 0], [1, 0], [2, 0]] },
    { id: 'line_h_4', category: 'line', coords: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'line_v_4', category: 'line', coords: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { id: 'line_h_5', category: 'line', coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: 'line_v_5', category: 'line', coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },

    // --- L / T (3-5 blocks) ---
    { id: 'corner_2x2_1', category: 'lt', coords: [[0, 0], [1, 0], [1, 1]] },
    { id: 'corner_2x2_2', category: 'lt', coords: [[0, 1], [1, 0], [1, 1]] },
    { id: 'corner_2x2_3', category: 'lt', coords: [[0, 0], [0, 1], [1, 0]] },
    { id: 'corner_2x2_4', category: 'lt', coords: [[0, 0], [0, 1], [1, 1]] },
    { id: 'l_3x3_1', category: 'lt', coords: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { id: 'l_3x3_2', category: 'lt', coords: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { id: 'l_3x3_3', category: 'lt', coords: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
    { id: 'l_3x3_4', category: 'lt', coords: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
    { id: 'j_2x3_1', category: 'lt', coords: [[1, 0], [1, 1], [1, 2], [0, 0]] },
    { id: 'j_2x3_2', category: 'lt', coords: [[1, 0], [1, 1], [1, 2], [0, 2]] },
    { id: 'j_2x3_3', category: 'lt', coords: [[0, 0], [0, 1], [0, 2], [1, 0]] },
    { id: 'j_2x3_4', category: 'lt', coords: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { id: 't_3x2_up', category: 'lt', coords: [[0, 1], [1, 0], [1, 1], [1, 2]] },
    { id: 't_3x2_down', category: 'lt', coords: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 't_2x3_left', category: 'lt', coords: [[0, 1], [1, 0], [1, 1], [2, 1]] },
    { id: 't_2x3_right', category: 'lt', coords: [[0, 0], [1, 0], [1, 1], [2, 0]] },
    { id: 's_shape', category: 'lt', coords: [[0, 1], [0, 2], [1, 0], [1, 1]] },
    { id: 'z_shape', category: 'lt', coords: [[0, 0], [0, 1], [1, 1], [1, 2]] },

    // --- RECTANGLE 2x3 & 3x2 (6 blocks) ---
    { id: 'rect_2x3_h', category: 'massive', coords: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
    { id: 'rect_3x2_v', category: 'massive', coords: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },

    // --- MASSIVE (3x3 solid box) ---
    { id: 'box_3x3', category: 'massive', coords: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] }
];

const ALL_PRECALCULATED_SHAPES = RAW_SHAPE_DEFINITIONS.map(def => ({
    ...def,
    matrix: coordsToMatrix(def.coords)
}));

const SHAPE_POOLS = {
    micro: ALL_PRECALCULATED_SHAPES.filter(s => s.category === 'micro'),
    line: ALL_PRECALCULATED_SHAPES.filter(s => s.category === 'line'),
    lt: ALL_PRECALCULATED_SHAPES.filter(s => s.category === 'lt'),
    massive: ALL_PRECALCULATED_SHAPES.filter(s => s.category === 'massive')
};

const BASE_SHAPES = ALL_PRECALCULATED_SHAPES;
const SINGLE_DOT_SHAPE = SHAPE_POOLS.micro.find(s => s.id === 'dot_1x1');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initBoard() {
    userCoins = 10;
    if (typeof shopTurnCount !== 'undefined') shopTurnCount = 0;
    updateCoinsDisplay();
    if (boardElement) {
        boardElement.classList.remove('shaking', 'shaking-light', 'shaking-medium', 'shaking-heavy');
    }
    boardElement.innerHTML = '';
    boardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            const qRow = Math.floor(r / 4);
            const qCol = Math.floor(c / 4);
            const quadIndex = qRow * 2 + qCol;
            const isDark = (qRow + qCol) % 2 === 1;

            cell.classList.add('cell', isDark ? 'quadrant-dark' : 'quadrant-light');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.dataset.quadrant = quadIndex;
            boardElement.appendChild(cell);
        }
    }
    const vfxCanvas = document.createElement('canvas');
    vfxCanvas.id = 'vfx-canvas';
    boardElement.appendChild(vfxCanvas);

    particles = [];
    flashes = [];
    disintegrations = [];
    score = 0;
    window.currentMatchTicketsEarned = 0;
    if (window.resetClassicMatchVictoryTracker) {
        window.resetClassicMatchVictoryTracker();
    }
    linesEliminated = 0;
    comboCount = 1;
    comboTolerance = 0;
    comboLevel = 1;
    consecutiveClears = 0;
    skillDiscardActive = false;
    skillRotateActive = false;
    skillSingleActive = false;
    turnHasDragged = false;
    gameOver = false;
    window.hasSeenReviveScreenThisMatch = false;
    const noSpaceOverlay = document.getElementById('no-space-overlay');
    if (noSpaceOverlay) {
        noSpaceOverlay.classList.remove('visible');
        noSpaceOverlay.innerHTML = '';
    }
    if (window._victoryPointOverlayTimer) {
        clearTimeout(window._victoryPointOverlayTimer);
        window._victoryPointOverlayTimer = null;
    }
    window.isVictoryPointPopupActive = false;
    if (typeof window.clearSkillActivationPopups === 'function') {
        window.clearSkillActivationPopups();
    }
    if (typeof window.setTrayDisabled === 'function') {
        window.setTrayDisabled(false);
    }
    const trayEl = document.getElementById('tray');
    if (trayEl) {
        trayEl.style.pointerEvents = '';
        trayEl.classList.remove('disabled-tray', 'tray-shatter-shake');
    }
    if (typeof window.checkAndUpdateTimeModeVisibility === 'function') {
        window.checkAndUpdateTimeModeVisibility();
    }
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        btnSettings.style.pointerEvents = '';
        btnSettings.style.opacity = '';
    }
    if (typeof resetAllSkillsToDefault === 'function') resetAllSkillsToDefault();
    else if (typeof resetTurnSkills === 'function') resetTurnSkills();
    highScore = parseInt(localStorage.getItem('blockBlast3DHighScore8x8')) || 0;
    if (highScoreElement) highScoreElement.textContent = highScore;
    sessionStartHighScore = highScore;
    achievedNewRecord = false;
    hasTriggeredRecordScreen = false;
    updateScore(0);
    updateSkillUI();
    const goBestScoreText = document.getElementById('go-best-score-text');
    if (goBestScoreText) goBestScoreText.textContent = highScore;
    spawnPieces(true);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function updateScoreScale(element, val) {
    if (!element) return;
    const str = String(val);
    const len = str.length;
    let scale = 1.0;
    if (len >= 7) scale = 0.52;
    else if (len === 6) scale = 0.62;
    else if (len === 5) scale = 0.72;
    else if (len === 4) scale = 0.85;
    element.style.setProperty('--score-scale', scale);
}

function animateNumberValue(element, start, end, duration = 400) {
    if (!element) return;
    if (element._animFrameId) {
        cancelAnimationFrame(element._animFrameId);
    }

    let startVal;
    if (typeof start === 'number') {
        startVal = start;
    } else if (element._currentDisplayedValue !== undefined) {
        startVal = element._currentDisplayedValue;
    } else {
        startVal = parseInt(element.textContent) || 0;
    }

    if (startVal === end) {
        element.textContent = end;
        element._currentDisplayedValue = end;
        updateScoreScale(element, end);
        return;
    }

    const startTime = performance.now();
    let lastTickTime = 0;
    const isScoreNumber = (element.id === 'go-score-text' || element.id === 'high-score');

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentVal = Math.round(startVal + (end - startVal) * easedProgress);

        if (element._currentDisplayedValue !== currentVal) {
            element.textContent = currentVal;
            element._currentDisplayedValue = currentVal;
            updateScoreScale(element, currentVal);

            // Suono per i numeri che salgono in Game Over e You Win
            if (isScoreNumber && window.RetroAudio && typeof window.RetroAudio.playScoreTick === 'function') {
                if (currentTime - lastTickTime >= 35) {
                    lastTickTime = currentTime;
                    window.RetroAudio.playScoreTick(progress);
                }
            }
        }

        if (progress < 1) {
            element._animFrameId = requestAnimationFrame(update);
        } else {
            element.textContent = end;
            element._currentDisplayedValue = end;
            updateScoreScale(element, end);
            element._animFrameId = null;

            if (isScoreNumber && window.RetroAudio && typeof window.RetroAudio.playScoreTickEnd === 'function') {
                window.RetroAudio.playScoreTickEnd();
            }
        }
    }

    element._animFrameId = requestAnimationFrame(update);
}

function updateCellGem(cell, colorObj, opacity = 1) {
    if (!cell) return;
    let gem = cell.querySelector('.block-cell');
    if (!gem) {
        gem = document.createElement('div');
        gem.className = 'block-cell';
        gem.innerHTML = '<div class="facet top"></div><div class="facet left"></div><div class="facet right"></div><div class="facet bottom"></div><div class="center-face"></div>';
        cell.appendChild(gem);
    }
    if (colorObj) {
        const shades = getGemShades(colorObj);
        gem.style.setProperty('--c-center', shades.center);
        gem.style.setProperty('--c-top', shades.top);
        gem.style.setProperty('--c-left', shades.left);
        gem.style.setProperty('--c-right', shades.right);
        gem.style.setProperty('--c-bottom', shades.bottom);
        gem.style.display = 'block';
        gem.style.opacity = opacity;

        if (colorObj.isGolden || (typeof colorObj === 'object' && colorObj.isGolden)) {
            gem.classList.add('golden-gem');
        } else {
            gem.classList.remove('golden-gem');
        }
        if (colorObj.isWild || (typeof colorObj === 'object' && colorObj.isWild)) {
            gem.classList.add('wild-gem');
        } else {
            gem.classList.remove('wild-gem');
        }
        if (colorObj.isReactiveOrange || (typeof colorObj === 'object' && colorObj.isReactiveOrange)) {
            gem.classList.add('reactive-gem');
        } else {
            gem.classList.remove('reactive-gem');
        }
        if (colorObj.isAmplifyingPurple || (typeof colorObj === 'object' && colorObj.isAmplifyingPurple)) {
            gem.classList.add('amplifying-gem');
        } else {
            gem.classList.remove('amplifying-gem');
        }
        if (colorObj.isOvergrowGreen || (typeof colorObj === 'object' && colorObj.isOvergrowGreen)) {
            gem.classList.add('overgrow-gem');
        } else {
            gem.classList.remove('overgrow-gem');
        }
        if (colorObj.isSakuraPink || colorObj.isVoidBlack || (typeof colorObj === 'object' && (colorObj.isSakuraPink || colorObj.isVoidBlack))) {
            gem.classList.add('sakura-pink-gem');
            gem.classList.add('void-black-gem');
        } else {
            gem.classList.remove('sakura-pink-gem');
            gem.classList.remove('void-black-gem');
        }
        if (colorObj.isLavaRed || (typeof colorObj === 'object' && colorObj.isLavaRed)) {
            gem.classList.add('lava-gem');
        } else {
            gem.classList.remove('lava-gem');
        }
    } else {
        gem.style.display = 'none';
        gem.style.opacity = 1;
        gem.classList.remove('golden-gem');
        gem.classList.remove('wild-gem');
        gem.classList.remove('reactive-gem');
        gem.classList.remove('amplifying-gem');
        gem.classList.remove('overgrow-gem');
        gem.classList.remove('void-black-gem');
        gem.classList.remove('lava-gem');
    }
}

function renderBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = boardElement.children[r * BOARD_SIZE + c];
            if (cell) {
                const color = boardState[r][c];
                // Preserva l'animazione dell'onda d'urto/jelly se la cella è in corso di eliminazione
                if (cell.dataset.clearing === 'true' && !color) {
                    continue;
                }
                // Preserva il sobbalzo dei blocchi adiacenti
                if (cell.dataset.nudging === 'true' && color) {
                    updateCellGem(cell, color, 1);
                    continue;
                }
                const isDark = (Math.floor(r / 4) + Math.floor(c / 4)) % 2 === 1;
                cell.className = isDark ? 'cell quadrant-dark' : 'cell quadrant-light';
                updateCellGem(cell, color, 1);
            }
        }
    }
}

function animateTextScore(container, targetScore, duration = 400) {
    if (!container) return;
    let startScore = parseInt(container.textContent.replace(/,/g, '').replace(/\./g, '')) || 0;
    const scoreDiff = targetScore - startScore;
    if (scoreDiff === 0) {
        container.textContent = targetScore.toLocaleString();
        updateDigitScaling(container, targetScore, 4.8);
        return;
    }
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startScore + (eased * scoreDiff));

        container.textContent = currentValue.toLocaleString();
        updateDigitScaling(container, currentValue, 4.8);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            container.textContent = targetScore.toLocaleString();
            updateDigitScaling(container, targetScore, 4.8);
        }
    }
    requestAnimationFrame(update);
}

function updateScore(points) {
    score += points;
    if (window.QuestTracker) window.QuestTracker.track('single_match_score', score);

    // Wealthy Chocolate 🍫 Skill: +3 line counter per 900 points earned
    if (points > 0 && typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.wealthy_chocolate && SKILLS_CONFIG.wealthy_chocolate.unlocked && SKILLS_CONFIG.wealthy_chocolate.active) {
        if (typeof chocolateScoreProgress === 'undefined') chocolateScoreProgress = 0;
        chocolateScoreProgress += points;
        while (chocolateScoreProgress >= 900) {
            chocolateScoreProgress -= 900;
            for (let i = 0; i < 3; i++) {
                linesEliminated++;
                if (linesEliminated % 6 === 0) {
                    grantSkill();
                }
            }
            updateSkillUI();

            const isScoreMilestoneActive = window.isVictoryPointPopupActive || window.isVictoryRewardToastActive;
            if (!isScoreMilestoneActive && window.triggerSkillActivationPopup) {
                window.triggerSkillActivationPopup('Wealthy Chocolate 🍫', ['<span class="reward-green">+3 counter</span>']);
            }
        }
    }

    const currentScoreDisplay = document.getElementById('currentScoreDisplay') || scoreElement;
    if (currentScoreDisplay) {
        animateTextScore(currentScoreDisplay, score, 400);
    }

    if (window.checkClassicModeVictory) {
        window.checkClassicModeVictory(score);
    }

    // Ticket Milestones: Tempo Tape (1 ticket / 1,000 pts up to 9k; 10k triggers 15 ticket victory), Vintage Tape (1 ticket / 500 pts)
    const activeCurrentMode = window.currentSelectedGameMode || 'classic';
    if (activeCurrentMode === 'time' && points > 0) {
        const prevMilestone = Math.floor((score - points) / 1000);
        const currMilestone = Math.floor(score / 1000);
        const cappedMilestone = Math.min(currMilestone, 9);
        const ticketsEarned = Math.max(0, cappedMilestone - prevMilestone);
        if (ticketsEarned > 0) {
            if (typeof window.clearSkillActivationPopups === 'function') {
                window.clearSkillActivationPopups();
            }
            window.currentMatchTicketsEarned = (window.currentMatchTicketsEarned || 0) + ticketsEarned;
            if (typeof window.savePendingMatchTickets === 'function') {
                window.savePendingMatchTickets();
            }
            const ptsLabel = `${cappedMilestone}K PTS REACHED!`;
            if (typeof window.showVictoryRewardToast === 'function') {
                window.showVictoryRewardToast(ptsLabel, ticketsEarned, 1600);
            }
        }
    } else if (activeCurrentMode === 'vintage' && points > 0) {
        const prevMilestone = Math.floor((score - points) / 500);
        const currMilestone = Math.floor(score / 500);
        const ticketsEarned = currMilestone - prevMilestone;
        if (ticketsEarned > 0) {
            if (typeof window.clearSkillActivationPopups === 'function') {
                window.clearSkillActivationPopups();
            }
            window.currentMatchTicketsEarned = (window.currentMatchTicketsEarned || 0) + ticketsEarned;
            if (typeof window.savePendingMatchTickets === 'function') {
                window.savePendingMatchTickets();
            }
            const ptsReached = currMilestone * 500;
            const ptsLabel = `${ptsReached.toLocaleString()} PTS REACHED!`;
            if (typeof window.showVictoryRewardToast === 'function') {
                window.showVictoryRewardToast(ptsLabel, ticketsEarned, 1600);
            }
        }
    }

    if (score > sessionStartHighScore) {
        achievedNewRecord = true;
        highScore = score;
        localStorage.setItem('blockBlast3DHighScore8x8', highScore);

        const activeMode = window.currentSelectedGameMode || 'classic';
        const modeKey = `blockBlastHighScore_${activeMode}`;
        const prevModeHigh = parseInt(localStorage.getItem(modeKey) || '0', 10);
        if (score > prevModeHigh) {
            localStorage.setItem(modeKey, score.toString());
        }

        const maxScoreDisplay = document.getElementById('maxScoreDisplay') || highScoreElement;
        if (maxScoreDisplay) {
            maxScoreDisplay.textContent = highScore.toLocaleString();
        }
    }
}

function showHighScoreScreen() {
    const goScoreText = document.getElementById('go-score-text');
    if (goScoreText) animateNumberValue(goScoreText, 0, score, 800);

    if (gameOverScreen) {
        gameOverScreen.classList.add('new-high-score');
        gameOverScreen.classList.remove('visible');
        void gameOverScreen.offsetWidth;
        gameOverScreen.classList.add('visible');
        if (typeof window.initGameOverBalatroShader === 'function') {
            window.initGameOverBalatroShader();
        }
    }

    setTimeout(() => {
        if (typeof shootConfetti === 'function') shootConfetti();
        else if (typeof spawnConfetti === 'function') spawnConfetti();
    }, 100);
}

function canPlaceShapeOnBoard(board, shape, startRow, startCol) {
    const coords = shape.coords;
    const len = coords.length;

    if (board instanceof Uint8Array || (Array.isArray(board) && board.length === 64)) {
        for (let i = 0; i < len; i++) {
            const r = startRow + coords[i][0];
            const c = startCol + coords[i][1];
            if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
            if (board[(r << 3) + c] !== 0) return false;
        }
    } else {
        for (let i = 0; i < len; i++) {
            const r = startRow + coords[i][0];
            const c = startCol + coords[i][1];
            if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
            if (board[r][c] !== null && board[r][c] !== 0) return false;
        }
    }
    return true;
}

function isShapePlaceable(board, shape) {
    const coords = shape.coords;
    let maxR = 0, maxC = 0;
    for (let i = 0; i < coords.length; i++) {
        if (coords[i][0] > maxR) maxR = coords[i][0];
        if (coords[i][1] > maxC) maxC = coords[i][1];
    }
    const limitR = 8 - maxR;
    const limitC = 8 - maxC;

    for (let r = 0; r < limitR; r++) {
        for (let c = 0; c < limitC; c++) {
            if (canPlaceShapeOnBoard(board, shape, r, c)) {
                return true;
            }
        }
    }
    return false;
}

function canPieceFit(grid, pieceMatrix) {
    const shape = {
        coords: []
    };
    for (let r = 0; r < pieceMatrix.length; r++) {
        for (let c = 0; c < pieceMatrix[r].length; c++) {
            if (pieceMatrix[r][c]) shape.coords.push([r, c]);
        }
    }
    return isShapePlaceable(grid, shape);
}

function getBoardDensity(board) {
    let occupied = 0;
    if (board instanceof Uint8Array || (Array.isArray(board) && board.length === 64)) {
        for (let i = 0; i < 64; i++) {
            if (board[i] !== 0) occupied++;
        }
    } else {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] !== null && board[r][c] !== 0) occupied++;
            }
        }
    }
    return occupied / 64;
}

function pickWeightedCategory(weights) {
    const totalWeight = weights.micro + weights.line + weights.lt + weights.massive;
    let rand = Math.random() * totalWeight;
    if (rand < weights.micro) return 'micro';
    rand -= weights.micro;
    if (rand < weights.line) return 'line';
    rand -= weights.line;
    if (rand < weights.lt) return 'lt';
    return 'massive';
}

function getRandomShapeFromCategory(category, currentScore = 0, boardDensity = 0) {
    let pool = SHAPE_POOLS[category] || ALL_PRECALCULATED_SHAPES;

    const isSingleUnlocked = typeof SKILLS_CONFIG !== 'undefined' && (
        (SKILLS_CONFIG.tiny_cherry && SKILLS_CONFIG.tiny_cherry.unlocked && SKILLS_CONFIG.tiny_cherry.active)
    );
    if (!isSingleUnlocked) {
        const filtered = pool.filter(s => s.id !== 'dot_1x1');
        if (filtered.length > 0) pool = filtered;
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

function getNearCompleteLinesInfo(board) {
    const rowCounts = new Array(8).fill(0);
    const colCounts = new Array(8).fill(0);

    if (board instanceof Uint8Array || (Array.isArray(board) && board.length === 64)) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[(r << 3) + c] !== 0) {
                    rowCounts[r]++;
                    colCounts[c]++;
                }
            }
        }
    } else {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] !== null && board[r][c] !== 0) {
                    rowCounts[r]++;
                    colCounts[c]++;
                }
            }
        }
    }

    return { rowCounts, colCounts };
}

function shapeCompletesLineAt(board, shape, startRow, startCol, lineInfo) {
    const coords = shape.coords;
    const len = coords.length;

    const tempRows = lineInfo.rowCounts.slice();
    const tempCols = lineInfo.colCounts.slice();

    for (let i = 0; i < len; i++) {
        const r = startRow + coords[i][0];
        const c = startCol + coords[i][1];
        tempRows[r]++;
        tempCols[c]++;
    }

    for (let r = 0; r < 8; r++) {
        if (lineInfo.rowCounts[r] < 8 && tempRows[r] === 8) return true;
    }
    for (let c = 0; c < 8; c++) {
        if (lineInfo.colCounts[c] < 8 && tempCols[c] === 8) return true;
    }

    return false;
}

function getFavorableLineClearingShapes(board) {
    const lineInfo = getNearCompleteLinesInfo(board);

    let hasNearCompleteLines = false;
    for (let i = 0; i < 8; i++) {
        if (lineInfo.rowCounts[i] >= 5 || lineInfo.colCounts[i] >= 5) {
            hasNearCompleteLines = true;
            break;
        }
    }

    if (!hasNearCompleteLines) return [];

    const isSingleUnlocked = typeof SKILLS_CONFIG !== 'undefined' && (
        (SKILLS_CONFIG.tiny_cherry && SKILLS_CONFIG.tiny_cherry.unlocked && SKILLS_CONFIG.tiny_cherry.active)
    );

    const clearingShapes = [];
    for (let i = 0; i < ALL_PRECALCULATED_SHAPES.length; i++) {
        const shape = ALL_PRECALCULATED_SHAPES[i];
        if (!isSingleUnlocked && shape.id === 'dot_1x1') continue;
        const coords = shape.coords;
        let maxR = 0, maxC = 0;
        for (let j = 0; j < coords.length; j++) {
            if (coords[j][0] > maxR) maxR = coords[j][0];
            if (coords[j][1] > maxC) maxC = coords[j][1];
        }
        const limitR = 8 - maxR;
        const limitC = 8 - maxC;

        let completes = false;
        for (let r = 0; r < limitR; r++) {
            for (let c = 0; c < limitC; c++) {
                if (canPlaceShapeOnBoard(board, shape, r, c)) {
                    if (shapeCompletesLineAt(board, shape, r, c, lineInfo)) {
                        completes = true;
                        break;
                    }
                }
            }
            if (completes) break;
        }

        if (completes) {
            clearingShapes.push(shape);
        }
    }

    return clearingShapes;
}

function generateNextThreeShapes(board, currentScore = 0) {
    const result = [];
    const density = getBoardDensity(board);
    const isSingleUnlocked = typeof SKILLS_CONFIG !== 'undefined' && (
        (SKILLS_CONFIG.tiny_cherry && SKILLS_CONFIG.tiny_cherry.unlocked && SKILLS_CONFIG.tiny_cherry.active)
    );
    const isInitialGameTurn = (currentScore === 0 && (typeof linesEliminated === 'undefined' || linesEliminated === 0));

    // 1. Filter ALL available shapes to ONLY those that are placeable on the current board
    let allPlaceable = ALL_PRECALCULATED_SHAPES.filter(s => {
        if (!isSingleUnlocked && s.id === 'dot_1x1') return false;
        // Never allow 3x3 box if board density >= 0.35 OR on the initial turn of a new match
        if (s.id === 'box_3x3' && (density >= 0.35 || isInitialGameTurn)) return false;
        // On initial turn, avoid oversized rectangles (2x3, 3x2) to guarantee comfortable space
        if (isInitialGameTurn && (s.id === 'rect_2x3_h' || s.id === 'rect_3x2_v')) return false;
        return isShapePlaceable(board, s);
    });

    // Fallback if no shapes are placeable (board is completely blocked)
    if (allPlaceable.length === 0) {
        allPlaceable = ALL_PRECALCULATED_SHAPES.filter(s => isSingleUnlocked || s.id !== 'dot_1x1');
    }

    // When board density is low (< 0.25) and not initial game turn, filter out tiny micro pieces (< 3 blocks)
    let lowDensityPool = allPlaceable;
    if (density < 0.25 && !isInitialGameTurn) {
        const largeShapes = allPlaceable.filter(s => s.coords.length >= 3);
        if (largeShapes.length > 0) lowDensityPool = largeShapes;
    }

    // 2. Find shapes that complete lines/columns and fit on board
    const favorableClearingShapes = getFavorableLineClearingShapes(board);

    // --- SLOT 1: Favorable Line Clearer or Main Shape ---
    let slot1Shape = null;
    if (favorableClearingShapes.length > 0) {
        slot1Shape = favorableClearingShapes[Math.floor(Math.random() * favorableClearingShapes.length)];
    } else {
        if (density < 0.25 && !isInitialGameTurn) {
            // Empty board in later turns: favor larger pieces (4+ blocks like line_4, line_5, L_3x3, box_3x3)
            const bigShapes = lowDensityPool.filter(s => s.coords.length >= 4);
            const pool = bigShapes.length > 0 ? bigShapes : lowDensityPool;
            slot1Shape = pool[Math.floor(Math.random() * pool.length)];
        } else if (density > 0.45 || isInitialGameTurn) {
            // Crowded board or initial turn: favor accessible shapes (<= 4 blocks)
            const smallPlaceable = allPlaceable.filter(s => s.coords.length <= 4);
            const pool = smallPlaceable.length > 0 ? smallPlaceable : allPlaceable;
            slot1Shape = pool[Math.floor(Math.random() * pool.length)];
        } else {
            slot1Shape = allPlaceable[Math.floor(Math.random() * allPlaceable.length)];
        }
    }
    result.push(slot1Shape);

    // --- SLOT 2: Second Favorable or Density-based Filler ---
    let slot2Shape = null;
    const remainingFavorable = favorableClearingShapes.filter(s => s.id !== slot1Shape.id);

    if (remainingFavorable.length > 0 && Math.random() < 0.70) {
        slot2Shape = remainingFavorable[Math.floor(Math.random() * remainingFavorable.length)];
    } else {
        let candidatePool = (density < 0.25 && !isInitialGameTurn) ? lowDensityPool : allPlaceable;
        if (density < 0.25 && !isInitialGameTurn) {
            const bigShapes = lowDensityPool.filter(s => s.coords.length >= 3);
            if (bigShapes.length > 0) candidatePool = bigShapes;
        } else if (density > 0.45 || isInitialGameTurn) {
            const easyShapes = allPlaceable.filter(s => s.coords.length <= 4 && s.id !== 'box_3x3');
            if (easyShapes.length > 0) candidatePool = easyShapes;
        }
        slot2Shape = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    }
    result.push(slot2Shape);

    // --- SLOT 3: Flexible Balancing Piece ---
    let slot3Shape = null;
    let candidatePoolSlot3 = (density < 0.25 && !isInitialGameTurn) ? lowDensityPool : allPlaceable;

    // Exclude box_3x3 if another box_3x3 was already selected or if density >= 0.35 or initial turn
    const currentMassiveCount = result.filter(s => s.id === 'box_3x3').length;
    if (currentMassiveCount >= 1 || density >= 0.35 || isInitialGameTurn) {
        const noMassive = candidatePoolSlot3.filter(s => s.id !== 'box_3x3');
        if (noMassive.length > 0) candidatePoolSlot3 = noMassive;
    }

    if (density < 0.25 && !isInitialGameTurn) {
        const largeShapes = candidatePoolSlot3.filter(s => s.coords.length >= 3);
        if (largeShapes.length > 0) candidatePoolSlot3 = largeShapes;
    } else if (density > 0.50 || isInitialGameTurn) {
        const smallOnly = candidatePoolSlot3.filter(s => s.coords.length <= 4);
        if (smallOnly.length > 0) candidatePoolSlot3 = smallOnly;
    }

    slot3Shape = candidatePoolSlot3[Math.floor(Math.random() * candidatePoolSlot3.length)];
    result.push(slot3Shape);

    // --- SKILL MODIFIERS: Tiny Cherry 🍒 (+5% 1x1 dot) ---
    const isTinyCherryActive = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.tiny_cherry && SKILLS_CONFIG.tiny_cherry.unlocked && SKILLS_CONFIG.tiny_cherry.active;

    for (let i = 0; i < result.length; i++) {
        let dotChance = 0;
        if (isTinyCherryActive) dotChance += 0.05;

        if (dotChance > 0 && Math.random() < dotChance && typeof SINGLE_DOT_SHAPE !== 'undefined' && SINGLE_DOT_SHAPE) {
            result[i] = SINGLE_DOT_SHAPE;
        }
    }

    // GARANZIA SPAZIO SINGOLO: verifica che ciascuno dei 3 pezzi sia posizionabile
    for (let i = 0; i < result.length; i++) {
        if (!isShapePlaceable(board, result[i])) {
            const placeable = allPlaceable.filter(s => isShapePlaceable(board, s));
            if (placeable.length > 0) {
                result[i] = placeable[Math.floor(Math.random() * placeable.length)];
            }
        }
    }

    // GARANZIA SEQUENZIALE SPAZIO AL 100%:
    // Verifica che tutti e 3 i pezzi generati possano essere posizionati in sequenza sul tabellone.
    // Se non esiste un ordine valido per collocarli tutti e 3, sostituisce il pezzo più ingombrante
    // con un pezzo compatto (<= 3 blocchi) finché l'intero set è giocabile al 100%.
    function canSimulateSequentialPlacement(grid, pieceList) {
        if (!pieceList || pieceList.length === 0) return true;
        const perms = pieceList.length === 3 ? [
            [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
        ] : (pieceList.length === 2 ? [[0, 1], [1, 0]] : [[0]]);

        for (let p = 0; p < perms.length; p++) {
            if (canSimulateOrder(grid, perms[p].map(idx => pieceList[idx]))) {
                return true;
            }
        }
        return false;
    }

    function canSimulateOrder(grid, order) {
        if (order.length === 0) return true;
        const piece = order[0];
        const coords = piece.coords;
        let maxR = 0, maxC = 0;
        for (let i = 0; i < coords.length; i++) {
            if (coords[i][0] > maxR) maxR = coords[i][0];
            if (coords[i][1] > maxC) maxC = coords[i][1];
        }
        const limR = 8 - maxR;
        const limC = 8 - maxC;
        for (let r = 0; r < limR; r++) {
            for (let c = 0; c < limC; c++) {
                if (canPlaceShapeOnBoard(grid, piece, r, c)) {
                    const nextGrid = grid.map(row => [...row]);
                    for (let i = 0; i < coords.length; i++) {
                        nextGrid[r + coords[i][0]][c + coords[i][1]] = 1;
                    }
                    for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
                        if (nextGrid[rowIdx].every(v => v !== null && v !== 0)) {
                            for (let colIdx = 0; colIdx < 8; colIdx++) nextGrid[rowIdx][colIdx] = null;
                        }
                    }
                    for (let colIdx = 0; colIdx < 8; colIdx++) {
                        let full = true;
                        for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
                            if (nextGrid[rowIdx][colIdx] === null || nextGrid[rowIdx][colIdx] === 0) {
                                full = false; break;
                            }
                        }
                        if (full) {
                            for (let rowIdx = 0; rowIdx < 8; rowIdx++) nextGrid[rowIdx][colIdx] = null;
                        }
                    }
                    if (canSimulateOrder(nextGrid, order.slice(1))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    let seqAttempts = 0;
    while (!canSimulateSequentialPlacement(board, result) && seqAttempts < 15) {
        seqAttempts++;
        let largestIdx = 0;
        let maxBlocks = 0;
        for (let i = 0; i < result.length; i++) {
            if (result[i].coords.length > maxBlocks) {
                maxBlocks = result[i].coords.length;
                largestIdx = i;
            }
        }
        const smallerPlaceable = allPlaceable.filter(s => s.coords.length <= 3 && isShapePlaceable(board, s));
        const pool = smallerPlaceable.length > 0 ? smallerPlaceable : allPlaceable.filter(s => isShapePlaceable(board, s));
        if (pool.length > 0) {
            result[largestIdx] = pool[Math.floor(Math.random() * pool.length)];
        } else {
            break;
        }
    }

    return result;
}

function generateThreePieces(currentGrid) {
    const currentScore = typeof score !== 'undefined' ? score : 0;
    const rawShapes = generateNextThreeShapes(currentGrid, currentScore);
    const colorList = Object.values(GEM_COLORS).filter(c => !c.isGolden && !c.isWild && !c.isReactiveOrange && !c.isAmplifyingPurple && !c.isOvergrowGreen && !c.isSakuraPink && !c.isVoidBlack && !c.isLavaRed);

    const isSweetStrawberryActive = typeof SKILLS_CONFIG !== 'undefined' &&
        SKILLS_CONFIG.sweet_strawberry &&
        SKILLS_CONFIG.sweet_strawberry.unlocked &&
        SKILLS_CONFIG.sweet_strawberry.active;

    const isWildBlueActive = typeof SKILLS_CONFIG !== 'undefined' &&
        SKILLS_CONFIG.wild_blue &&
        SKILLS_CONFIG.wild_blue.unlocked &&
        SKILLS_CONFIG.wild_blue.active;

    const isReactiveOrangeActive = typeof SKILLS_CONFIG !== 'undefined' &&
        SKILLS_CONFIG.reactive_orange &&
        SKILLS_CONFIG.reactive_orange.unlocked &&
        SKILLS_CONFIG.reactive_orange.active;

    const isAmplifyingPurpleActive = typeof SKILLS_CONFIG !== 'undefined' &&
        SKILLS_CONFIG.amplifying_purple &&
        SKILLS_CONFIG.amplifying_purple.unlocked &&
        SKILLS_CONFIG.amplifying_purple.active;

    const isOvergrowGreenActive = typeof SKILLS_CONFIG !== 'undefined' &&
        SKILLS_CONFIG.overgrow_green &&
        SKILLS_CONFIG.overgrow_green.unlocked &&
        SKILLS_CONFIG.overgrow_green.active;

    const isSakuraPinkActive = typeof SKILLS_CONFIG !== 'undefined' &&
        ((SKILLS_CONFIG.sakura_pink && SKILLS_CONFIG.sakura_pink.unlocked && SKILLS_CONFIG.sakura_pink.active) ||
            (SKILLS_CONFIG.void_black && SKILLS_CONFIG.void_black.unlocked && SKILLS_CONFIG.void_black.active));

    const isLavaRedActive = typeof SKILLS_CONFIG !== 'undefined' &&
        SKILLS_CONFIG.lava_red &&
        SKILLS_CONFIG.lava_red.unlocked &&
        SKILLS_CONFIG.lava_red.active;

    return rawShapes.map(shape => {
        let isGolden = false;
        let isWild = false;
        let isReactiveOrange = false;
        let isAmplifyingPurple = false;
        let isOvergrowGreen = false;
        let isSakuraPink = false;
        let isVoidBlack = false;
        let isLavaRed = false;

        const rand = Math.random();
        if (isWildBlueActive && rand < 0.10) {
            isWild = true;
        } else if (isAmplifyingPurpleActive && Math.random() < 0.15) {
            isAmplifyingPurple = true;
        } else if (isReactiveOrangeActive && Math.random() < 0.07) {
            isReactiveOrange = true;
        } else if (isOvergrowGreenActive && Math.random() < 0.07) {
            isOvergrowGreen = true;
        } else if (isSakuraPinkActive && Math.random() < 0.07) {
            isSakuraPink = true;
            isVoidBlack = true;
        } else if (isLavaRedActive && Math.random() < 0.07) {
            isLavaRed = true;
        } else if (isSweetStrawberryActive && Math.random() < 0.05) {
            isGolden = true;
        }

        if (isWild) {
            return {
                id: 'wild_1x1',
                category: 'micro',
                coords: [[0, 0]],
                matrix: [[1]],
                color: GEM_COLORS.indigo,
                isGolden: false,
                isWild: true,
                isReactiveOrange: false,
                isAmplifyingPurple: false,
                isOvergrowGreen: false,
                isSakuraPink: false,
                isVoidBlack: false,
                isLavaRed: false
            };
        }

        let selectedColor = colorList[Math.floor(Math.random() * colorList.length)];
        if (isAmplifyingPurple) {
            selectedColor = GEM_COLORS.amplifying_purple;
        } else if (isReactiveOrange) {
            selectedColor = GEM_COLORS.reactive_orange;
        } else if (isOvergrowGreen) {
            selectedColor = GEM_COLORS.overgrow_green;
        } else if (isSakuraPink || isVoidBlack) {
            selectedColor = GEM_COLORS.sakura_pink || GEM_COLORS.void_black;
        } else if (isLavaRed) {
            selectedColor = GEM_COLORS.lava_red;
        } else if (isGolden) {
            selectedColor = GEM_COLORS.gold;
        }

        return {
            id: shape.id,
            category: shape.category,
            coords: shape.coords,
            matrix: shape.matrix.map(row => [...row]),
            color: selectedColor,
            isGolden: isGolden,
            isWild: false,
            isReactiveOrange: isReactiveOrange,
            isAmplifyingPurple: isAmplifyingPurple,
            isOvergrowGreen: isOvergrowGreen,
            isSakuraPink: isSakuraPink || isVoidBlack,
            isVoidBlack: isSakuraPink || isVoidBlack,
            isLavaRed: isLavaRed
        };
    });
}

function getAvailableShapes() {
    let shapes = [...BASE_SHAPES];
    if (typeof skillSingleActive !== 'undefined' && skillSingleActive) shapes.push(SINGLE_DOT_SHAPE);
    return shapes;
}

function spawnPieces(all = false) {
    turnHasDragged = false;

    if (all || activePieces.length === 0) {
        if (!all && activePieces.length === 0) {
            if ((window.currentSelectedGameMode || 'classic') !== 'vintage' && typeof shopTurnCount !== 'undefined') {
                shopTurnCount++;
                if (typeof updateComboToleranceUI === 'function') {
                    updateComboToleranceUI();
                }
                if (shopTurnCount >= 10) {
                    shopTurnCount = 0;
                    if (typeof updateComboToleranceUI === 'function') {
                        updateComboToleranceUI();
                    }
                    if (typeof window.setTrayDisabled === 'function') {
                        window.setTrayDisabled(true);
                    }

                    const startFreeRollPopupSequence = () => {
                        if (typeof window.triggerWarningPopupVFX === 'function') {
                            window.triggerWarningPopupVFX('<span class="rolling-dice">🎲</span><br>10 TURNS REACHED!<br>FREE ROLL', true, () => {
                                // Once free roll popup finishes, immediately open shop
                                if (typeof window.triggerAutoFreeShopRoll === 'function') {
                                    window.triggerAutoFreeShopRoll();
                                }
                            });
                        } else if (typeof window.triggerAutoFreeShopRoll === 'function') {
                            window.triggerAutoFreeShopRoll();
                        }
                    };

                    if (typeof window.waitForAllPopupsToFinish === 'function') {
                        window.waitForAllPopupsToFinish(startFreeRollPopupSequence);
                    } else {
                        startFreeRollPopupSequence();
                    }
                }
            }

            // Trigger Lava Red movement at start of turn (when tray pieces are refilled)
            if (typeof window.processLavaRedMovement === 'function') {
                const lavaMoved = window.processLavaRedMovement();
                if (lavaMoved > 0) {
                    setTimeout(() => {
                        if (typeof window.checkLavaLineClears === 'function') {
                            window.checkLavaLineClears();
                        }
                    }, 1350);
                }
            }
        }

        hasPlacedPieceInTurn = false;
        if (typeof resetTurnSkills === 'function') resetTurnSkills();
        activePieces = [];
        const newPieces = generateThreePieces(boardState);
        for (let i = 0; i < 3; i++) {
            const shape = newPieces[i];
            createPieceElement(shape, i);
            activePieces.push({ shape, slot: i, rotated: false });
        }
    }
    updateSkillUI();
    checkGameOver();
    if (typeof window.saveGameSnapshot === 'function') {
        window.saveGameSnapshot();
    }
}

let lastFilledCount = -1;

function updateSkillUI() {
    let dots = linesEliminated % 6;
    const filledCount = dots;

    const stepDuration = 0.90;
    const totalDuration = filledCount > 0 ? (filledCount * stepDuration) + 's' : '1.5s';
    const hasIncreased = filledCount !== lastFilledCount;
    lastFilledCount = filledCount;

    for (let i = 1; i <= 6; i++) {
        const blockImg = document.getElementById(`block-${i}`);
        if (blockImg) {
            if (i <= filledCount) {
                blockImg.src = 'assets/line_block_filled.png';
                blockImg.style.setProperty('--wave-duration', totalDuration);
                blockImg.style.setProperty('--wave-delay', ((i - 1) * stepDuration) + 's');
                if (hasIncreased) {
                    blockImg.style.animation = 'none';
                    void blockImg.offsetWidth;
                    blockImg.style.animation = '';
                }
                blockImg.className = 'block green';
            } else {
                blockImg.src = 'assets/line_block_empty.png';
                blockImg.style.removeProperty('--wave-duration');
                blockImg.style.removeProperty('--wave-delay');
                blockImg.style.animation = '';
                blockImg.className = 'block blue';
            }
        }
    }

    if (typeof updateComboToleranceUI === 'function') {
        updateComboToleranceUI();
    } else {
        const linesClearedText = document.getElementById('linesClearedText') || document.querySelector('#linesClearedText');
        if (linesClearedText) {
            const currentTurns = (typeof shopTurnCount !== 'undefined') ? shopTurnCount : 0;
            linesClearedText.textContent = `${currentTurns}/10`;
        }
        const toleranceBg = document.getElementById('comboToleranceBg');
        if (toleranceBg) {
            toleranceBg.classList.remove('level-0', 'level-1', 'level-2', 'level-3');
            const level = Math.max(0, Math.min(3, comboTolerance || 0));
            toleranceBg.classList.add(`level-${level}`);
        }
    }

    if (typeof updateTraySkillHint === 'function') {
        updateTraySkillHint();
    }
}

function updateTraySkillHint() {
    const hintEl = document.getElementById('tray-skill-hint');
    if (!hintEl) return;

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen && !homeScreen.classList.contains('hidden')) {
        hintEl.textContent = '';
        hintEl.classList.remove('visible');
        return;
    }

    const goScreen = document.getElementById('game-over-screen');
    if (goScreen && (goScreen.classList.contains('visible') || goScreen.style.display === 'flex')) {
        hintEl.textContent = '';
        hintEl.classList.remove('visible');
        return;
    }

    if (typeof activePieces !== 'undefined' && activePieces.length === 0) {
        hintEl.textContent = '';
        hintEl.classList.remove('visible');
        return;
    }

    if (typeof SKILLS_CONFIG === 'undefined' || !SKILLS_CONFIG) {
        hintEl.textContent = '';
        hintEl.classList.remove('visible');
        return;
    }

    // Curved Banana / Clockwise Rotation skill check
    let maxRotations = 0;
    if (SKILLS_CONFIG.curved_banana && SKILLS_CONFIG.curved_banana.unlocked && SKILLS_CONFIG.curved_banana.active) maxRotations += 1;
    if (SKILLS_CONFIG.clockwise_rotation && SKILLS_CONFIG.clockwise_rotation.unlocked && SKILLS_CONFIG.clockwise_rotation.active) maxRotations += 1;
    const currentRotations = (typeof rotationsUsedThisTurn !== 'undefined') ? rotationsUsedThisTurn : 0;
    const isBananaActive = maxRotations > 0;
    const isBananaUsableThisTurn = isBananaActive && (currentRotations < maxRotations);

    // Swift Pizza / Shifting Pizza skill check
    const pizzaSkill = SKILLS_CONFIG.swift_pizza || SKILLS_CONFIG.swift_pumpkin;
    const isPizzaActive = !!(pizzaSkill && pizzaSkill.unlocked && pizzaSkill.active);
    const discardsUsed = (typeof discardsUsedThisTurn !== 'undefined') ? discardsUsedThisTurn : 0;
    const placedPiece = (typeof hasPlacedPieceInTurn !== 'undefined') ? hasPlacedPieceInTurn : false;
    const canDiscardThisTurn = !placedPiece && (discardsUsed < 1);
    const isPizzaUsableThisTurn = isPizzaActive && canDiscardThisTurn;

    // Se attive entrambe: mostra Pizza a inizio turno, e poi Banana se ancora attivo nel turno
    if (isPizzaUsableThisTurn) {
        hintEl.textContent = 'Drag up to discard.';
        hintEl.classList.add('visible');
    } else if (isBananaUsableThisTurn) {
        hintEl.textContent = 'double tap to rotate.';
        hintEl.classList.add('visible');
    } else {
        hintEl.textContent = '';
        hintEl.classList.remove('visible');
    }
}
window.updateTraySkillHint = updateTraySkillHint;

function grantSkill() {
    if (typeof addCoins === 'function') {
        addCoins(1);
    } else {
        userCoins += 1;
        updateCoinsDisplay();
    }

    const plusOneEl = document.getElementById('coinPlusOne');
    if (plusOneEl) {
        const bonus = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.golden_apple && SKILLS_CONFIG.golden_apple.unlocked && SKILLS_CONFIG.golden_apple.active) ? 1.2 : 1;
        plusOneEl.textContent = `+${bonus}`;
        plusOneEl.classList.remove('show');
        void plusOneEl.offsetWidth;
        plusOneEl.classList.add('show');
    }

    const rand = Math.random();
    if (rand < 0.33 && !skillSingleActive) {
        skillSingleActive = true;
    } else if (rand < 0.66) {
        skillRotateActive = true;
    } else {
        skillDiscardActive = true;
    }
    updateSkillUI();
}

function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    let result = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            result[c][rows - 1 - r] = matrix[r][c];
        }
    }
    return result;
}

// =========================================================================
// INITIAL BOARD PRE-FILL ANIMATION (30% Cohesive Organic Fill with Bottom-to-Top Wave)
// =========================================================================

function generateSmartPrefillCells(targetCount = 14) {
    // Generates ~20-23% filled cells (~14 out of 64) in cohesive geometric clusters
    // strictly in rows 2 to 7, leaving rows 0 and 1 completely clear (16 open cells)
    // for guaranteed comfortable piece placement.
    const allowedClusters = [
        // 2x2 blocks
        [[0,0],[0,1],[1,0],[1,1]],
        // 3-blocks L shapes
        [[0,0],[1,0],[1,1]],
        [[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0]],
        // 2-blocks dominos
        [[0,0],[0,1]],
        [[0,0],[1,0]],
        // Single blocks
        [[0,0]]
    ];

    const filledSet = new Set();
    const clusterColors = [
        GEM_COLORS.blue,
        GEM_COLORS.lime,
        GEM_COLORS.yellow,
        GEM_COLORS.cyan,
        GEM_COLORS.orange,
        GEM_COLORS.purple,
        GEM_COLORS.magenta
    ];

    const finalCells = []; // array of { r, c, color }
    let attempts = 0;

    while (finalCells.length < targetCount && attempts < 350) {
        attempts++;

        let cluster;
        const remaining = targetCount - finalCells.length;
        if (remaining <= 2 || attempts > 180) {
            const smallClusters = [[[0,0]], [[0,0],[0,1]], [[0,0],[1,0]]];
            cluster = smallClusters[Math.floor(Math.random() * smallClusters.length)];
        } else {
            cluster = allowedClusters[Math.floor(Math.random() * allowedClusters.length)];
        }
        const clusterColor = clusterColors[Math.floor(Math.random() * clusterColors.length)];

        // Le prime 2 righe (0 e 1) rimangono rigorosamente VUOTE (zona di atterraggio pulita)
        const baseR = 2 + Math.floor(Math.random() * 5); // righe 2..6
        const baseC = Math.floor(Math.random() * BOARD_SIZE);

        let canFit = true;
        const coords = [];
        for (const [dr, dc] of cluster) {
            const r = baseR + dr;
            const c = baseC + dc;
            // Rigorosamente r >= 2 per mantenere intatte le righe 0 e 1
            if (r < 2 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
                canFit = false;
                break;
            }
            if (filledSet.has(`${r},${c}`)) {
                canFit = false;
                break;
            }
            coords.push({ r, c });
        }

        if (canFit && (finalCells.length + coords.length) <= (targetCount + 2)) {
            const simulatedRowCounts = Array(BOARD_SIZE).fill(0);
            const simulatedColCounts = Array(BOARD_SIZE).fill(0);

            finalCells.forEach(item => {
                simulatedRowCounts[item.r]++;
                simulatedColCounts[item.c]++;
            });
            coords.forEach(item => {
                simulatedRowCounts[item.r]++;
                simulatedColCounts[item.c]++;
            });

            // Massimo 5 celle per riga/colonna per evitare blocchi soffocanti
            const maxR = Math.max(...simulatedRowCounts);
            const maxC = Math.max(...simulatedColCounts);

            if (maxR <= 5 && maxC <= 5) {
                coords.forEach(coord => {
                    filledSet.add(`${coord.r},${coord.c}`);
                    finalCells.push({ r: coord.r, c: coord.c, color: clusterColor });
                });
            }
        }
    }

    return finalCells;
}

function triggerBoardInitialPrefillAnimation(onComplete) {
    if (!boardElement || !boardState) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    // Disable tray during the introductory pre-fill animation
    if (typeof window.setTrayDisabled === 'function') {
        window.setTrayDisabled(true);
    }

    const prefillCells = generateSmartPrefillCells(14); // ~22% of 64 cells, righe 0-1 pulite
    const prefillSet = new Set(prefillCells.map(cell => `${cell.r},${cell.c}`));

    // Immediately synchronize boardState to ONLY the chosen prefill cells
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (prefillSet.has(`${r},${c}`)) {
                const chosen = prefillCells.find(p => p.r === r && p.c === c);
                boardState[r][c] = chosen ? chosen.color : (GEM_COLORS.yellow || GEM_COLORS.lime);
            } else {
                boardState[r][c] = null;
            }
        }
    }

    // Rigenera immediatamente i 3 pezzi nel vassoio calcolandoli sulla griglia precompilata reale
    if (typeof spawnPieces === 'function') {
        spawnPieces(true);
    }

    // Diverse, vibrant colors for the rising filling wave (excluding cyan so it rotates dynamically through distinct warm and cool colors)
    const waveColorOptions = [
        GEM_COLORS.orange,
        GEM_COLORS.purple,
        GEM_COLORS.lime,
        GEM_COLORS.magenta,
        GEM_COLORS.yellow,
        GEM_COLORS.blue,
        GEM_COLORS.red,
        GEM_COLORS.indigo,
        GEM_COLORS.gold || GEM_COLORS.yellow,
        GEM_COLORS.sakura_pink || GEM_COLORS.magenta
    ].filter(Boolean);

    // Filter out previously used color so consecutive games never repeat the same wave color
    let availableWaveColors = waveColorOptions;
    if (typeof window._lastWaveColorIndex === 'number' && availableWaveColors.length > 1) {
        availableWaveColors = availableWaveColors.filter((_, idx) => idx !== window._lastWaveColorIndex);
    }
    const chosenIdx = Math.floor(Math.random() * availableWaveColors.length);
    const waveColor = availableWaveColors[chosenIdx] || waveColorOptions[0];
    window._lastWaveColorIndex = waveColorOptions.indexOf(waveColor);

    // Sound effect: rising start wave sound
    if (window.RetroAudio && typeof window.RetroAudio.playStartWave === 'function') {
        try {
            window.RetroAudio.playStartWave();
        } catch (_) {}
    } else if (window.RetroAudio && typeof window.RetroAudio.playGameStartWave === 'function') {
        try {
            window.RetroAudio.playGameStartWave();
        } catch (_) {}
    }

    // Phase 1: Wave sweeps the whole grid row-by-row from bottom (r=7) to top (r=0)
    // Slower, smoother wave sweep (~350ms to reach the top)
    const rowDelay = 50; // ms per row (+5ms per row = +35ms sweep)
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
        const sweepDelay = (BOARD_SIZE - 1 - r) * rowDelay;
        setTimeout(() => {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = boardElement.children[r * BOARD_SIZE + c];
                if (!cell) continue;

                if (prefillSet.has(`${r},${c}`)) {
                    // Chosen prefill cell: emerges directly with its authentic cluster color in the wave
                    const chosenColor = boardState[r][c];
                    updateCellGem(cell, chosenColor, 1);
                } else {
                    // Non-chosen cell: displays the energetic rising wave color
                    updateCellGem(cell, waveColor, 0.95);
                }

                const blockCell = cell.querySelector('.block-cell');
                if (blockCell) {
                    blockCell.classList.remove('board-prefill-fade-out');
                    blockCell.classList.remove('board-prefill-wave-in');
                    void blockCell.offsetWidth;
                    blockCell.classList.add('board-prefill-wave-in');
                }
            }
        }, sweepDelay);
    }

    // Phase 2: Once the wave reaches the top, hold for 100ms longer (+100ms total wave duration before fade-out)
    const waveFinishDelay = (BOARD_SIZE * rowDelay) + 265; // ~665ms (+105ms rispetto a prima)
    setTimeout(() => {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = boardElement.children[r * BOARD_SIZE + c];
                if (!cell) continue;
                const blockCell = cell.querySelector('.block-cell');

                if (prefillSet.has(`${r},${c}`)) {
                    if (blockCell) {
                        blockCell.classList.remove('board-prefill-wave-in');
                    }
                } else {
                    if (blockCell) {
                        blockCell.classList.remove('board-prefill-wave-in');
                        blockCell.classList.add('board-prefill-fade-out');
                    }
                }
            }
        }

        // Phase 3: Wait for fade-out to finish (~240ms), clear DOM wave elements and finalize
        setTimeout(() => {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const cell = boardElement.children[r * BOARD_SIZE + c];
                    if (!cell) continue;
                    const blockCell = cell.querySelector('.block-cell');

                    if (!prefillSet.has(`${r},${c}`)) {
                        updateCellGem(cell, null, 0);
                        if (blockCell) {
                            blockCell.classList.remove('board-prefill-fade-out');
                        }
                    } else if (blockCell) {
                        blockCell.classList.remove('board-prefill-wave-in');
                    }
                }
            }

            if (typeof renderBoard === 'function') {
                renderBoard();
            }

            if (typeof window.saveGameSnapshot === 'function') {
                window.saveGameSnapshot();
            }
            if (typeof window.setTrayDisabled === 'function') {
                window.setTrayDisabled(false);
            }
            if (typeof checkGameOver === 'function') {
                checkGameOver();
            }
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }, 260);
    }, waveFinishDelay);
}

window.generateSmartPrefillCells = generateSmartPrefillCells;
window.triggerBoardInitialPrefillAnimation = triggerBoardInitialPrefillAnimation;

