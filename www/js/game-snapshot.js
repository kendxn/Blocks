// ==========================================================================
// GAMEPLAY SNAPSHOT & RESUME SYSTEM
// Saves full gameplay state (board occupancy, tray pieces, coins, skills, shop)
// so the user can quit anytime and resume exactly where they left off.
// ==========================================================================

(function () {
    const STORAGE_KEY_PREFIX = 'blockBlastSessionSnapshot_';

    function getStorageKey(mode) {
        const m = mode || (window.currentSelectedGameMode || 'classic');
        return `${STORAGE_KEY_PREFIX}${m}`;
    }

    /**
     * Save snapshot of the active gameplay run.
     */
    function saveGameSnapshot(customMode) {
        try {
            // Do not save if tutorial is active!
            if (window.TutorialManager && window.TutorialManager.isActive) return false;

            // Do not save if game is over, board is uninitialized, or we are on home screen
            if (typeof gameOver !== 'undefined' && gameOver) return false;
            if (typeof window.isRevivingGameplay !== 'undefined' && window.isRevivingGameplay) return false;

            const homeScreen = document.getElementById('home-screen');
            if (homeScreen && !homeScreen.classList.contains('hidden')) return false;

            const appWrapper = document.getElementById('app-wrapper');
            if (appWrapper && appWrapper.style.display === 'none') return false;

            const boardEl = document.getElementById('board');
            if (!boardEl || typeof boardState === 'undefined' || !Array.isArray(boardState) || boardState.length === 0) {
                return false;
            }

            const activeMode = customMode || window.currentSelectedGameMode || 'classic';

            // Clone board state safely
            const boardSize = (typeof BOARD_SIZE !== 'undefined') ? BOARD_SIZE : 8;
            const clonedBoard = [];
            for (let r = 0; r < boardSize; r++) {
                clonedBoard[r] = [];
                for (let c = 0; c < boardSize; c++) {
                    const cell = (boardState[r] && boardState[r][c] !== undefined) ? boardState[r][c] : null;
                    if (cell && typeof cell === 'object') {
                        clonedBoard[r][c] = { ...cell };
                    } else {
                        clonedBoard[r][c] = cell || null;
                    }
                }
            }

            // Clone active tray pieces
            const clonedPieces = [];
            if (typeof activePieces !== 'undefined' && Array.isArray(activePieces)) {
                activePieces.forEach(p => {
                    if (p && p.shape) {
                        try {
                            clonedPieces.push({
                                shape: JSON.parse(JSON.stringify(p.shape)),
                                slot: p.slot,
                                rotated: !!p.rotated
                            });
                        } catch (e) {
                            console.warn("Failed to serialize piece:", e);
                        }
                    }
                });
            }

            // Clone skills configuration
            const skillsConfigSnapshot = {};
            if (typeof SKILLS_CONFIG !== 'undefined') {
                for (const key in SKILLS_CONFIG) {
                    const s = SKILLS_CONFIG[key];
                    if (s) {
                        skillsConfigSnapshot[key] = {
                            unlocked: !!s.unlocked,
                            active: !!s.active,
                            usedThisTurn: !!s.usedThisTurn,
                            consumed: !!s.consumed
                        };
                    }
                }
            }

            // Retrieve shop snapshot
            const shopData = (typeof window.getShopSnapshot === 'function') ? window.getShopSnapshot() : null;

            const snapshot = {
                version: 1,
                timestamp: Date.now(),
                mode: activeMode,
                score: (typeof score !== 'undefined') ? score : 0,
                linesEliminated: (typeof linesEliminated !== 'undefined') ? linesEliminated : 0,
                comboCount: (typeof comboCount !== 'undefined') ? comboCount : 1,
                comboTolerance: (typeof comboTolerance !== 'undefined') ? comboTolerance : 0,
                comboLevel: (typeof comboLevel !== 'undefined') ? comboLevel : 1,
                consecutiveClears: (typeof consecutiveClears !== 'undefined') ? consecutiveClears : 0,
                userCoins: (typeof userCoins !== 'undefined') ? userCoins : 10,
                shopTurnCount: (typeof shopTurnCount !== 'undefined') ? shopTurnCount : 0,
                hasSeenReviveScreenThisMatch: !!window.hasSeenReviveScreenThisMatch,
                timeModeSeconds: (typeof window.getTimeModeSeconds === 'function') ? window.getTimeModeSeconds() : 120,
                boardState: clonedBoard,
                activePieces: clonedPieces,
                skills: {
                    config: skillsConfigSnapshot,
                    rotationsUsedThisTurn: (typeof rotationsUsedThisTurn !== 'undefined') ? rotationsUsedThisTurn : 0,
                    discardsUsedThisTurn: (typeof discardsUsedThisTurn !== 'undefined') ? discardsUsedThisTurn : 0,
                    noClearTurnCount: (typeof noClearTurnCount !== 'undefined') ? noClearTurnCount : 0,
                    sourLemonColumnTurns: (typeof sourLemonColumnTurns !== 'undefined') ? sourLemonColumnTurns : 0,
                    chocolateScoreProgress: (typeof chocolateScoreProgress !== 'undefined') ? chocolateScoreProgress : 0,
                    fluffyBreadTurnCount: (typeof fluffyBreadTurnCount !== 'undefined') ? fluffyBreadTurnCount : 0
                },
                shop: shopData
            };

            const key = getStorageKey(activeMode);

            // Do not save if the game is a fresh start (0 score and no blocks placed on board)
            const hasPlacedBlocks = clonedBoard.some(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== 0));
            const currentScore = (typeof score !== 'undefined') ? score : 0;
            const hasScore = typeof currentScore === 'number' && currentScore > 0;

            if (!hasPlacedBlocks && !hasScore) {
                // Not an active in-progress run to save; remove any empty snapshot
                localStorage.removeItem(key);
                return false;
            }

            localStorage.setItem(key, JSON.stringify(snapshot));
            return true;
        } catch (err) {
            console.error("Error saving game snapshot:", err);
            return false;
        }
    }

    /**
     * Check if a valid snapshot exists for the mode.
     */
    function hasGameSnapshot(mode) {
        try {
            const key = getStorageKey(mode);
            const raw = localStorage.getItem(key);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            const boardSize = (typeof BOARD_SIZE !== 'undefined') ? BOARD_SIZE : 8;
            if (!parsed || !Array.isArray(parsed.boardState) || parsed.boardState.length !== boardSize) {
                return false;
            }
            const hasPlacedBlocks = parsed.boardState.some(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== 0));
            const hasScore = typeof parsed.score === 'number' && parsed.score > 0;
            if (!hasPlacedBlocks && !hasScore) {
                // If it was an empty/stale snapshot, clean it up
                localStorage.removeItem(key);
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Retrieve the raw snapshot object.
     */
    function getGameSnapshot(mode) {
        try {
            const key = getStorageKey(mode);
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    /**
     * Delete the snapshot (on game over, victory, or restart match).
     */
    function clearGameSnapshot(mode) {
        try {
            const key = getStorageKey(mode);
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Restore gameplay state from snapshot.
     */
    function restoreGameSnapshot(mode) {
        try {
            const activeMode = mode || (window.currentSelectedGameMode || 'classic');
            const snapshot = getGameSnapshot(activeMode);
            if (!snapshot || !Array.isArray(snapshot.boardState)) {
                return false;
            }

            const boardEl = document.getElementById('board');
            if (!boardEl) return false;
            boardEl.classList.remove('shaking', 'shaking-light', 'shaking-medium', 'shaking-heavy');

            const boardSize = (typeof BOARD_SIZE !== 'undefined') ? BOARD_SIZE : 8;

            // 1. Rebuild board DOM elements
            boardEl.innerHTML = '';
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    const cell = document.createElement('div');
                    const qRow = Math.floor(r / 4);
                    const qCol = Math.floor(c / 4);
                    const quadIndex = qRow * 2 + qCol;
                    const isDark = (qRow + qCol) % 2 === 1;

                    cell.classList.add('cell', isDark ? 'quadrant-dark' : 'quadrant-light');
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    cell.dataset.quadrant = quadIndex;
                    boardEl.appendChild(cell);
                }
            }
            const vfxCanvas = document.createElement('canvas');
            vfxCanvas.id = 'vfx-canvas';
            boardEl.appendChild(vfxCanvas);

            // 2. Restore boardState array & render gems
            boardState = snapshot.boardState;
            if (typeof renderBoard === 'function') {
                renderBoard();
            }

            // 3. Restore tray pieces
            for (let i = 0; i < 3; i++) {
                const slot = document.getElementById(`slot-${i}`);
                if (slot) slot.innerHTML = '';
            }
            activePieces = [];

            if (Array.isArray(snapshot.activePieces) && snapshot.activePieces.length > 0) {
                snapshot.activePieces.forEach(p => {
                    if (typeof createPieceElement === 'function') {
                        createPieceElement(p.shape, p.slot, p.rotated);
                    }
                    activePieces.push({ shape: p.shape, slot: p.slot, rotated: !!p.rotated });
                });
            } else if (typeof spawnPieces === 'function') {
                spawnPieces(true);
            }

            // 4. Restore gameplay stats & variables
            score = (typeof snapshot.score === 'number') ? snapshot.score : 0;
            linesEliminated = (typeof snapshot.linesEliminated === 'number') ? snapshot.linesEliminated : 0;
            comboCount = (typeof snapshot.comboCount === 'number') ? snapshot.comboCount : 1;
            comboTolerance = (typeof snapshot.comboTolerance === 'number') ? snapshot.comboTolerance : 0;
            comboLevel = (typeof snapshot.comboLevel === 'number') ? snapshot.comboLevel : 1;
            consecutiveClears = (typeof snapshot.consecutiveClears === 'number') ? snapshot.consecutiveClears : 0;
            userCoins = (typeof snapshot.userCoins === 'number') ? snapshot.userCoins : 10;
            shopTurnCount = (typeof snapshot.shopTurnCount === 'number') ? snapshot.shopTurnCount : 0;
            gameOver = false;
            window.isRevivingGameplay = false;
            turnHasDragged = false;
            achievedNewRecord = false;
            hasTriggeredRecordScreen = false;

            // 5. Update UI displays
            const currentScoreDisplay = document.getElementById('currentScoreDisplay') || scoreElement;
            if (currentScoreDisplay) {
                currentScoreDisplay.textContent = score.toLocaleString();
                if (typeof updateDigitScaling === 'function') {
                    updateDigitScaling(currentScoreDisplay, score, 4.8);
                }
            }

            const highScoreEl = document.getElementById('maxScoreDisplay') || highScoreElement;
            if (highScoreEl) {
                highScore = parseInt(localStorage.getItem('blockBlast3DHighScore8x8'), 10) || 0;
                highScoreEl.textContent = highScore.toLocaleString();
            }

            if (typeof updateSkillUI === 'function') updateSkillUI();
            if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
            if (typeof updateComboToleranceUI === 'function') updateComboToleranceUI();

            // 6. Restore skills state
            if (snapshot.skills) {
                if (snapshot.skills.config && typeof SKILLS_CONFIG !== 'undefined') {
                    for (const key in snapshot.skills.config) {
                        if (SKILLS_CONFIG[key]) {
                            SKILLS_CONFIG[key].unlocked = !!snapshot.skills.config[key].unlocked;
                            SKILLS_CONFIG[key].active = !!snapshot.skills.config[key].active;
                            SKILLS_CONFIG[key].usedThisTurn = !!snapshot.skills.config[key].usedThisTurn;
                            SKILLS_CONFIG[key].consumed = !!snapshot.skills.config[key].consumed;
                        }
                    }
                }
                rotationsUsedThisTurn = snapshot.skills.rotationsUsedThisTurn || 0;
                discardsUsedThisTurn = snapshot.skills.discardsUsedThisTurn || 0;
                noClearTurnCount = snapshot.skills.noClearTurnCount || 0;
                sourLemonColumnTurns = snapshot.skills.sourLemonColumnTurns || 0;
                chocolateScoreProgress = snapshot.skills.chocolateScoreProgress || 0;
                fluffyBreadTurnCount = snapshot.skills.fluffyBreadTurnCount || 0;
                skillDiscardActive = false;
                skillRotateActive = false;
                skillSingleActive = false;
            }

            // 7. Restore shop state (coins, purchased items, rolled cards, locks)
            if (snapshot.shop && typeof window.restoreShopSnapshot === 'function') {
                window.restoreShopSnapshot(snapshot.shop);
            }

            // Restore revive state for current match
            window.hasSeenReviveScreenThisMatch = !!snapshot.hasSeenReviveScreenThisMatch;

            if ((activeMode === 'time' || activeMode === 'wild') && typeof snapshot.timeModeSeconds === 'number' && typeof window.setTimeModeSeconds === 'function') {
                window.setTimeModeSeconds(snapshot.timeModeSeconds);
            }

            // 8. Re-evaluate playable moves & piece styling
            if (typeof checkGameOver === 'function') {
                checkGameOver();
            }

            console.log(`[Snapshot] Successfully resumed gameplay session for mode: ${activeMode}`);
            return true;
        } catch (err) {
            console.error("Error restoring game snapshot:", err);
            return false;
        }
    }

    // Expose global API
    window.saveGameSnapshot = saveGameSnapshot;
    window.hasGameSnapshot = hasGameSnapshot;
    window.getGameSnapshot = getGameSnapshot;
    window.clearGameSnapshot = clearGameSnapshot;
    window.restoreGameSnapshot = restoreGameSnapshot;

    // Window & App lifecycle auto-save listeners
    window.addEventListener('beforeunload', () => {
        saveGameSnapshot();
    });

    window.addEventListener('pagehide', () => {
        saveGameSnapshot();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveGameSnapshot();
        }
    });

    // Capacitor Native Lifecycle (if running on mobile Android / iOS)
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        try {
            window.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
                if (!state.isActive) {
                    saveGameSnapshot();
                }
            });
        } catch (e) { }
    }
})();
