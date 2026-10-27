let dragState = null;
let isTrayDisabled = false;

function setTrayDisabled(disabled) {
    isTrayDisabled = !!disabled;
    const trayEl = document.getElementById('tray');
    if (trayEl) {
        if (isTrayDisabled) {
            trayEl.classList.add('disabled-tray');
        } else {
            trayEl.classList.remove('disabled-tray');
        }
    }
}
window.setTrayDisabled = setTrayDisabled;
let lastPreviewRow = -1;
let lastPreviewCol = -1;
let previewActiveCells = [];
let lastHapticKey = '';

function triggerHapticPop(duration = 40) {
    try {
        // 1. Capacitor Native Plugins (Android & iOS native Capacitor App)
        if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
            const Haptics = window.Capacitor.Plugins.Haptics;
            if (typeof Haptics.impact === 'function') {
                Haptics.impact({ style: 'HEAVY' }).catch(() => {
                    if (typeof Haptics.vibrate === 'function') Haptics.vibrate({ duration: duration });
                });
            } else if (typeof Haptics.vibrate === 'function') {
                Haptics.vibrate({ duration: duration });
            }
            if (typeof Haptics.selectionChanged === 'function') {
                try { Haptics.selectionChanged(); } catch (e) { }
            }
            return;
        }

        // 2. Global Haptics object
        if (typeof window !== 'undefined' && window.Haptics) {
            if (typeof window.Haptics.impact === 'function') {
                window.Haptics.impact({ style: 'HEAVY' }).catch(() => { });
            } else if (typeof window.Haptics.vibrate === 'function') {
                window.Haptics.vibrate({ duration: duration });
            }
            return;
        }

        // 3. iOS Taptic Engine plugin fallback
        if (typeof window !== 'undefined' && window.TapticEngine && typeof window.TapticEngine.impact === 'function') {
            window.TapticEngine.impact({ style: 'heavy' });
            return;
        }

        // 4. Standard HTML5 Navigator Vibrate API fallback (Android Mobile Web)
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate([duration, 20, duration]);
        }
    } catch (e) {
        // Ignore fallback exceptions
    }
}
window.triggerHapticPop = triggerHapticPop;

function checkHapticPreviewSync(clientX, clientY) {
    if (!dragState || !dragState.shape || typeof BOARD_SIZE === 'undefined' || typeof boardState === 'undefined') return;

    const { boardRect, cellWidth, cellHeight, shape, scaledOffsetX, scaledOffsetY } = dragState;
    if (!boardRect || !cellWidth || !cellHeight || !shape || !shape.matrix) return;

    const finalX = (clientX - scaledOffsetX) + (dragState.extX || 0);
    const finalY = (clientY - scaledOffsetY) + (dragState.extY || 0);

    const dropX = finalX - boardRect.left;
    const dropY = finalY - boardRect.top;

    const col = Math.floor((dropX + cellWidth * 0.5) / cellWidth);
    const row = Math.floor((dropY + cellHeight * 0.5) / cellHeight);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        lastHapticKey = '';
        return;
    }

    if (typeof canPlace === 'function' && canPlace(shape.matrix, row, col)) {
        let tempBoard = boardState.map(r => [...r]);
        for (let r = 0; r < shape.matrix.length; r++) {
            for (let c = 0; c < shape.matrix[r].length; c++) {
                if (shape.matrix[r][c]) {
                    tempBoard[row + r][col + c] = shape.color;
                }
            }
        }

        let rowsToClear = [];
        let colsToClear = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (tempBoard[r].every(val => val !== null)) rowsToClear.push(r);
        }
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (tempBoard.every(r => r[c] !== null)) colsToClear.push(c);
        }
        let quadsToClear = getFilledQuadrants(tempBoard);

        const hasLineClears = rowsToClear.length > 0 || colsToClear.length > 0 || quadsToClear.length > 0;
        const quadKey = quadsToClear.map(q => q.id).sort().join(',');
        const currentHapticKey = hasLineClears ? `${rowsToClear.sort().join(',')}|${colsToClear.sort().join(',')}|${quadKey}` : '';

        if (hasLineClears && currentHapticKey !== lastHapticKey) {
            triggerHapticPop(40);
            lastHapticKey = currentHapticKey;
        } else if (!hasLineClears) {
            lastHapticKey = '';
        }
    } else {
        lastHapticKey = '';
    }
}

// Configurazione dei 4 quadranti 4x4 sulla griglia 8x8 (stile Sudoku/blocco)
const QUADRANTS_CONFIG = [
    { id: 0, rStart: 0, rEnd: 3, cStart: 0, cEnd: 3, name: 'Top-Left' },
    { id: 1, rStart: 0, rEnd: 3, cStart: 4, cEnd: 7, name: 'Top-Right' },
    { id: 2, rStart: 4, rEnd: 7, cStart: 0, cEnd: 3, name: 'Bottom-Left' },
    { id: 3, rStart: 4, rEnd: 7, cStart: 4, cEnd: 7, name: 'Bottom-Right' },
];
window.QUADRANTS_CONFIG = QUADRANTS_CONFIG;

function getFilledQuadrants(grid) {
    if (!grid) return [];
    const quads = [];
    for (let q = 0; q < QUADRANTS_CONFIG.length; q++) {
        const quad = QUADRANTS_CONFIG[q];
        let full = true;
        for (let r = quad.rStart; r <= quad.rEnd; r++) {
            for (let c = quad.cStart; c <= quad.cEnd; c++) {
                if (!grid[r] || grid[r][c] === null || grid[r][c] === undefined) {
                    full = false;
                    break;
                }
            }
            if (!full) break;
        }
        if (full) quads.push(quad);
    }
    return quads;
}
window.getFilledQuadrants = getFilledQuadrants;

function clearPreview() {
    if (previewActiveCells.length > 0) {
        previewActiveCells.forEach(({ cell, r, c }) => {
            if (cell) {
                cell.classList.remove('preview', 'preview-clear');
                updateCellGem(cell, boardState[r][c], 1);
            }
        });
        previewActiveCells = [];
    }
    lastPreviewRow = -1;
    lastPreviewCol = -1;
    lastLineHighlightKey = '';
}

function showPreview(shape, row, col) {
    clearPreview();

    let tempBoard = boardState.map(r => [...r]);
    for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[r].length; c++) {
            if (shape.matrix[r][c]) {
                tempBoard[row + r][col + c] = shape.color;
            }
        }
    }

    let rowsToClear = [];
    let colsToClear = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        if (tempBoard[r].every(val => val !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
        if (tempBoard.every(r => r[c] !== null)) colsToClear.push(c);
    }
    let quadsToClear = getFilledQuadrants(tempBoard);

    // Haptic Pop Vibrazione se la mossa evidenzia/completa 1 o più righe, colonne o quadranti 4x4
    const hasLineClears = rowsToClear.length > 0 || colsToClear.length > 0 || quadsToClear.length > 0;
    const quadKey = quadsToClear.map(q => q.id).sort().join(',');
    const currentHighlightKey = hasLineClears ? `${rowsToClear.sort().join(',')}|${colsToClear.sort().join(',')}|${quadKey}` : '';

    if (hasLineClears && currentHighlightKey !== lastLineHighlightKey) {
        triggerHapticPop(20);
        lastLineHighlightKey = currentHighlightKey;
    } else if (!hasLineClears) {
        lastLineHighlightKey = '';
    }

    for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[r].length; c++) {
            if (shape.matrix[r][c]) {
                const targetR = row + r;
                const targetC = col + c;
                const cell = boardElement.children[targetR * BOARD_SIZE + targetC];
                if (cell) {
                    cell.classList.add('preview');
                    updateCellGem(cell, shape.color, 0.4);
                    previewActiveCells.push({ cell, r: targetR, c: targetC });
                }
            }
        }
    }

    const clearSet = new Set();
    rowsToClear.forEach(r => {
        for (let c = 0; c < BOARD_SIZE; c++) clearSet.add(`${r},${c}`);
    });
    colsToClear.forEach(c => {
        for (let r = 0; r < BOARD_SIZE; r++) clearSet.add(`${r},${c}`);
    });
    quadsToClear.forEach(quad => {
        for (let r = quad.rStart; r <= quad.rEnd; r++) {
            for (let c = quad.cStart; c <= quad.cEnd; c++) {
                clearSet.add(`${r},${c}`);
            }
        }
    });

    clearSet.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const cell = boardElement.children[r * BOARD_SIZE + c];
        if (cell) {
            cell.classList.add('preview-clear');
            updateCellGem(cell, shape.color, 0.85);
            previewActiveCells.push({ cell, r, c });
        }
    });

    lastPreviewRow = row;
    lastPreviewCol = col;
}

function resetPieceElementStyle(el) {
    if (!el) return;
    el.classList.remove('dragging');
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.width = '';
    el.style.height = '';
    el.style.transform = '';
    el.style.transformOrigin = '';
}

let isDragFramePending = false;

function updateTrashZoneVisibility(isDragging, clientY = 0) {
    const trashZone = document.getElementById('swift-pumpkin-trash-zone');
    if (!trashZone) return;

    const canDiscardThisTurn = !hasPlacedPieceInTurn && (typeof discardsUsedThisTurn === 'undefined' || discardsUsedThisTurn < 1);
    const skillObj = typeof SKILLS_CONFIG !== 'undefined' && (SKILLS_CONFIG.swift_pizza || SKILLS_CONFIG.swift_pumpkin);
    const isSwiftPizzaActive = skillObj && skillObj.unlocked && skillObj.active && canDiscardThisTurn;

    if (!isDragging || !isSwiftPizzaActive || !boardElement) {
        trashZone.classList.remove('visible', 'active-hover');
        trashZone.style.height = '0px';
        return;
    }

    const boardRect = boardElement.getBoundingClientRect();

    // Trash Zone is visible ONLY when dragging above the board (clientY < boardRect.top)
    if (clientY < boardRect.top) {
        const trashHeight = Math.max(80, boardRect.top);
        trashZone.style.height = `${trashHeight}px`;
        trashZone.classList.add('visible', 'active-hover');
    } else {
        trashZone.classList.remove('visible', 'active-hover');
        trashZone.style.height = '0px';
    }
}

function createPieceElement(shape, slotIndex, rotated = false) {
    const slot = document.getElementById(`slot-${slotIndex}`);
    if (!slot) return;
    slot.innerHTML = '';

    const pieceEl = document.createElement('div');
    pieceEl.classList.add('piece', 'tray-pop-in');
    pieceEl.addEventListener('animationend', () => {
        pieceEl.classList.remove('tray-pop-in');
    }, { once: true });
    if (shape.isGolden || (shape.color && shape.color.isGolden)) {
        pieceEl.classList.add('golden-piece');
    } else if (shape.isWild || (shape.color && shape.color.isWild)) {
        pieceEl.classList.add('wild-piece');
    } else if (shape.isReactiveOrange || (shape.color && shape.color.isReactiveOrange)) {
        pieceEl.classList.add('reactive-piece');
    } else if (shape.isAmplifyingPurple || (shape.color && shape.color.isAmplifyingPurple)) {
        pieceEl.classList.add('amplifying-piece');
    } else if (shape.isOvergrowGreen || (shape.color && shape.color.isOvergrowGreen)) {
        pieceEl.classList.add('overgrow-piece');
    } else if (shape.isSakuraPink || shape.isVoidBlack || (shape.color && (shape.color.isSakuraPink || shape.color.isVoidBlack))) {
        pieceEl.classList.add('sakura-pink-piece');
        pieceEl.classList.add('void-black-piece');
    } else if (shape.isLavaRed || (shape.color && shape.color.isLavaRed)) {
        pieceEl.classList.add('lava-piece');
    }
    pieceEl.dataset.slot = slotIndex;

    shape.matrix.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.classList.add('piece-row');
        row.forEach(val => {
            const block = document.createElement('div');
            block.classList.add('piece-block');
            if (val) {
                block.innerHTML = createGemBlockHTML(shape.color);
            } else {
                block.style.backgroundColor = 'transparent';
            }
            rowEl.appendChild(block);
        });
        pieceEl.appendChild(rowEl);
    });

    slot.appendChild(pieceEl);

    let startX = 0, startY = 0;
    let lastTap = 0;

    function handlePointerDown(e) {
        if (gameOver || isTrayDisabled) return;
        if (window.TutorialManager && window.TutorialManager.isActive) {
            if (typeof window.TutorialManager.isSlotAllowed === 'function') {
                if (!window.TutorialManager.isSlotAllowed(slotIndex)) return;
            }
        }
        const targetPiece = slot.querySelector('.piece');
        if (!targetPiece) return;
        targetPiece.classList.remove('tray-pop-in');
        targetPiece.style.animationDelay = '';
        if (e.cancelable) e.preventDefault();

        if (dragState && dragState.element) {
            resetPieceElementStyle(dragState.element);
        }
        dragState = null;
        clearPreview();

        try {
            slot.setPointerCapture(e.pointerId);
        } catch (err) { }

        if (window.RetroAudio) window.RetroAudio.playPiecePickup();

        startX = e.clientX;
        startY = e.clientY;

        const boardRect = boardElement.getBoundingClientRect();
        const cellWidth = boardRect.width / BOARD_SIZE;
        const cellHeight = boardRect.height / BOARD_SIZE;

        const rect = targetPiece.getBoundingClientRect();
        const unscaledWidth = targetPiece.offsetWidth || rect.width;
        const unscaledHeight = targetPiece.offsetHeight || rect.height;

        const pieceFirstBlock = targetPiece.querySelector('.piece-block');
        const pieceBlockWidth = pieceFirstBlock ? pieceFirstBlock.offsetWidth : cellWidth;
        const scaleFactor = pieceBlockWidth > 0 ? (cellWidth / pieceBlockWidth) : 1;

        const scaledWidth = unscaledWidth * scaleFactor;
        const scaledHeight = unscaledHeight * scaleFactor;

        const FIXED_LIFT_Y = 136; // Riduzione del 15% (da 160 a 136)
        const scaledOffsetX = scaledWidth / 2;
        const scaledOffsetY = scaledHeight + FIXED_LIFT_Y;

        dragState = {
            element: targetPiece,
            slotIndex,
            shape,
            scaledWidth,
            scaledHeight,
            scaledOffsetX,
            scaledOffsetY,
            hasMoved: false,
            startX,
            startY,
            pointerId: e.pointerId,
            boardRect,
            cellWidth,
            cellHeight,
            scaleFactor,
            latestX: e.clientX,
            latestY: e.clientY,
            prevX: e.clientX,
            prevY: e.clientY,
            extX: 0,
            extY: 0,
            targetExtX: 0,
            targetExtY: 0
        };

        window.addEventListener('pointermove', onDrag, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { passive: false });
        window.addEventListener('pointercancel', onPointerUp, { passive: false });
    }

    slot.onpointerdown = handlePointerDown;

    function onPointerUp(e) {
        window.removeEventListener('pointermove', onDrag);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        updateTrashZoneVisibility(false);

        if (e && e.pointerId !== undefined && slot.hasPointerCapture && slot.hasPointerCapture(e.pointerId)) {
            try {
                slot.releasePointerCapture(e.pointerId);
            } catch (err) { }
        }

        if (!dragState || dragState.element !== pieceEl) return;

        const { element, hasMoved, slotIndex: currentSlot } = dragState;

        if (!hasMoved) {
            dragState = null;
            notifyPieceReleasedForRevive();
            const now = Date.now();
            const isDoubleTap = (now - lastTap) < 300;
            lastTap = now;

            const pieceData = activePieces.find(p => p.slot === currentSlot);

            if (isDoubleTap && pieceData) {
                let maxRotations = 0;
                if (typeof SKILLS_CONFIG !== 'undefined') {
                    if (SKILLS_CONFIG.curved_banana && SKILLS_CONFIG.curved_banana.unlocked && SKILLS_CONFIG.curved_banana.active) maxRotations += 1;
                    if (SKILLS_CONFIG.clockwise_rotation && SKILLS_CONFIG.clockwise_rotation.unlocked && SKILLS_CONFIG.clockwise_rotation.active) maxRotations += 1;
                }

                if (maxRotations > 0 && rotationsUsedThisTurn < maxRotations) {
                    pieceData.shape.matrix = rotateMatrix(pieceData.shape.matrix);
                    pieceData.rotated = true;
                    createPieceElement(pieceData.shape, currentSlot, true);
                    rotationsUsedThisTurn++;
                    if (typeof window.updateTraySkillHint === 'function') window.updateTraySkillHint();

                    if (window.RetroAudio) window.RetroAudio.playPieceRotate();

                    const skillStatusEl = document.getElementById('skill-status');
                    const activeName = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.clockwise_rotation && SKILLS_CONFIG.clockwise_rotation.active) ? 'Clockwise Rotation 🔄' : 'Curved Banana 🍌';
                    triggerSkillActivationPopup(activeName, ['<span>Rotated Piece 🔄</span>']);
                    if (skillStatusEl) {
                        skillStatusEl.textContent = `${activeName}: Rotated Piece! (${rotationsUsedThisTurn}/${maxRotations})`;
                        setTimeout(() => {
                            if (skillStatusEl.textContent.includes('Rotated Piece!')) {
                                skillStatusEl.textContent = '';
                            }
                        }, 2000);
                    }
                    checkGameOver();
                    return;
                } else if (maxRotations > 0 && rotationsUsedThisTurn >= maxRotations) {
                    const skillStatusEl = document.getElementById('skill-status');
                    if (skillStatusEl) {
                        skillStatusEl.textContent = `Rotation limit reached for this turn! (${maxRotations}/${maxRotations}) 🔄`;
                        setTimeout(() => {
                            if (skillStatusEl.textContent.includes('Rotation limit reached')) {
                                skillStatusEl.textContent = '';
                            }
                        }, 2000);
                    }
                }
            }
            return;
        }

        turnHasDragged = true;
        updateSkillUI();

        // Swift Pizza 🍕 Skill: Discard 1 piece at start of turn & replace with a random piece (costs 0.5 coins)
        const canDiscardThisTurn = !hasPlacedPieceInTurn && (typeof discardsUsedThisTurn === 'undefined' || discardsUsedThisTurn < 1);
        const skillObj = typeof SKILLS_CONFIG !== 'undefined' && (SKILLS_CONFIG.swift_pizza || SKILLS_CONFIG.swift_pumpkin);
        const isSwiftPizzaActive = skillObj && skillObj.unlocked && skillObj.active && canDiscardThisTurn;
        const { boardRect, latestY } = dragState;

        if (isSwiftPizzaActive && latestY < boardRect.top) {
            clearPreview();
            element.remove();

            if (window.RetroAudio) window.RetroAudio.playPieceDiscard();

            discardsUsedThisTurn = (discardsUsedThisTurn || 0) + 1;
            if (typeof window.updateTraySkillHint === 'function') window.updateTraySkillHint();

            // Generate a brand new random piece for the discarded slot
            const newPieces = generateThreePieces(boardState);
            const replacementShape = newPieces[0];

            activePieces = activePieces.filter(p => p.slot !== currentSlot);
            activePieces.push({ shape: replacementShape, slot: currentSlot, rotated: false });

            createPieceElement(replacementShape, currentSlot);

            triggerSkillActivationPopup('Swift Pizza 🍕', ['<span>Piece Replaced</span>']);

            const skillStatusEl = document.getElementById('skill-status');
            if (skillStatusEl) {
                skillStatusEl.textContent = 'Swift Pizza 🍕: Piece Replaced!';
                setTimeout(() => {
                    if (skillStatusEl && skillStatusEl.textContent.includes('Swift Pizza 🍕')) {
                        skillStatusEl.textContent = '';
                    }
                }, 2000);
            }

            checkGameOver();
            dragState = null;
            notifyPieceReleasedForRevive();
            return;
        }

        let targetRow = -1;
        let targetCol = -1;
        if (lastPreviewRow !== -1 && lastPreviewCol !== -1 && canPlace(dragState.shape.matrix, lastPreviewRow, lastPreviewCol)) {
            targetRow = lastPreviewRow;
            targetCol = lastPreviewCol;
        } else {
            const { boardRect, cellWidth, cellHeight, scaledOffsetX, scaledOffsetY, latestX, latestY, extX = 0, extY = 0 } = dragState;

            const finalX = (latestX - scaledOffsetX) + extX;
            const finalY = (latestY - scaledOffsetY) + extY;

            const dropX = finalX - boardRect.left;
            const dropY = finalY - boardRect.top;

            const col = Math.floor((dropX + cellWidth * 0.5) / cellWidth);
            const row = Math.floor((dropY + cellHeight * 0.5) / cellHeight);

            if (canPlace(dragState.shape.matrix, row, col)) {
                targetRow = row;
                targetCol = col;
            }
        }

        clearPreview();
        resetPieceElementStyle(element);

        if (targetRow !== -1 && targetCol !== -1) {
            let sumR = 0, sumC = 0, count = 0;
            const matrix = dragState.shape.matrix;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c]) {
                        sumR += (targetRow + r + 0.5);
                        sumC += (targetCol + c + 0.5);
                        count++;
                    }
                }
            }
            const placedPos = {
                percentX: count > 0 ? (sumC / count / BOARD_SIZE) * 100 : 50,
                percentY: count > 0 ? (sumR / count / BOARD_SIZE) * 100 : 50
            };

            const isWildPiece = dragState.shape && (dragState.shape.isWild || (dragState.shape.color && dragState.shape.color.isWild));
            const currentPlacedShape = dragState.shape;
            const borderBlocksPlaced = placePiece(currentPlacedShape, targetRow, targetCol);
            element.remove();
            activePieces = activePieces.filter(p => p.slot !== currentSlot);
            hasPlacedPieceInTurn = true;
            if (typeof window.updateTraySkillHint === 'function') window.updateTraySkillHint();

            let lineWillClear = false;
            for (let r = 0; r < BOARD_SIZE; r++) {
                let full = true;
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (!boardState[r][c]) { full = false; break; }
                }
                if (full) { lineWillClear = true; break; }
            }
            if (!lineWillClear) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    let full = true;
                    for (let r = 0; r < BOARD_SIZE; r++) {
                        if (!boardState[r][c]) { full = false; break; }
                    }
                    if (full) { lineWillClear = true; break; }
                }
            }

            if (!lineWillClear && window.RetroAudio) {
                window.RetroAudio.playPiecePlace();
            }

            if (isWildPiece && lineWillClear) {
                setTimeout(() => {
                    checkLines(placedPos, currentPlacedShape, borderBlocksPlaced, targetRow, targetCol);
                    spawnPieces();
                }, 380);
            } else {
                checkLines(placedPos, currentPlacedShape, borderBlocksPlaced, targetRow, targetCol);
                spawnPieces();
            }
        } else {
            if (window.RetroAudio) window.RetroAudio.playPieceCancel();
        }

        dragState = null;
        notifyPieceReleasedForRevive();
    }
}

function onDrag(e) {
    if (!dragState) return;

    if (e.cancelable) e.preventDefault();
    dragState.latestX = e.clientX;
    dragState.latestY = e.clientY;

    const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
    if (!dragState.hasMoved && dist > 3) {
        dragState.hasMoved = true;
        const el = dragState.element;
        el.style.width = `${el.offsetWidth}px`;
        el.style.height = `${el.offsetHeight}px`;
        el.classList.add('dragging');
        el.style.position = 'fixed';
        el.style.transformOrigin = '0 0';
        el.style.willChange = 'transform';
        dragState.prevX = e.clientX;
        dragState.prevY = e.clientY;
    }

    if (dragState.hasMoved) {
        // Esecuzione Sincrona dentro l'evento pointermove per superare i blocchi di sicurezza dei browser mobili!
        checkHapticPreviewSync(e.clientX, e.clientY);

        if (!isDragFramePending) {
            isDragFramePending = true;
            requestAnimationFrame(processDragFrame);
        }
    }
}

function processDragFrame() {
    if (!dragState || !dragState.hasMoved) {
        isDragFramePending = false;
        return;
    }

    const { element, scaledOffsetX, scaledOffsetY, scaleFactor, boardRect, cellWidth, cellHeight, shape } = dragState;
    const clientX = dragState.latestX;
    const clientY = dragState.latestY;

    updateTrashZoneVisibility(true, clientY);

    // 1. Calcolo Vettore di Movimento (Delta tra i frame)
    const deltaX = clientX - dragState.prevX;
    const deltaY = clientY - dragState.prevY;
    dragState.prevX = clientX;
    dragState.prevY = clientY;

    // 2. Calcolo Spinta Direzionale Potenziata verso i Bordi della Griglia
    const boardCenterX = boardRect.left + boardRect.width / 2;
    const boardCenterY = boardRect.top + boardRect.height / 2;
    const relX = (clientX - boardCenterX) / (boardRect.width / 2);
    const relY = (clientY - boardCenterY) / (boardRect.height / 2);

    // 3. Offset Dinamico Aggiuntivo (Ridotto del 15% per posizionamento ancora più preciso)
    const VELOCITY_SENSITIVITY = 1.82; // Ridotto del 15% (da 2.14 a 1.82)
    const EDGE_PUSH_WEIGHT = 30.6; // Ridotto del 15% (da 36 a 30.6)
    const rawTargetExtX = (deltaX * VELOCITY_SENSITIVITY) + (Math.max(-1.2, Math.min(1.2, relX)) * EDGE_PUSH_WEIGHT);
    const rawTargetExtY = (deltaY * VELOCITY_SENSITIVITY) + (Math.max(-1.2, Math.min(1.2, relY)) * EDGE_PUSH_WEIGHT);

    // 4. Clamping Potenziato (Ridotto del 15%)
    const MAX_EXT_X = 46.75; // Ridotto del 15% (da 55 a 46.75)
    const MAX_EXT_Y = 46.75; // Ridotto del 15% (da 55 a 46.75)
    dragState.targetExtX = Math.max(-MAX_EXT_X, Math.min(MAX_EXT_X, rawTargetExtX));
    dragState.targetExtY = Math.max(-MAX_EXT_Y, Math.min(MAX_EXT_Y, rawTargetExtY));

    // 5. Interpolazione Lineare (LERP) per Movimento Fluido a 60 FPS (-10% lissaggio)
    const LERP_ALPHA = 0.166;
    dragState.extX += (dragState.targetExtX - dragState.extX) * LERP_ALPHA;
    dragState.extY += (dragState.targetExtY - dragState.extY) * LERP_ALPHA;

    // Decadimento naturale della velocità target
    dragState.targetExtX *= 0.80;
    dragState.targetExtY *= 0.80;

    // 6. Posizione Finale: X centrato perfettamente su dito, Y con offset fisso sopra dito + Extension Dinamica
    const finalX = (clientX - scaledOffsetX) + dragState.extX;
    const finalY = (clientY - scaledOffsetY) + dragState.extY;

    // 7. Rendering con GPU Accelerata translate3d (Origin 0 0)
    element.style.left = '0px';
    element.style.top = '0px';
    element.style.transformOrigin = '0 0';
    element.style.transform = `translate3d(${finalX}px, ${finalY}px, 0px) scale(${scaleFactor})`;

    // 8. Calcolo Cella Griglia matching esatto con tolleranza bilanciata (0.5 cellWidth)
    const dropX = finalX - boardRect.left;
    const dropY = finalY - boardRect.top;

    const col = Math.floor((dropX + cellWidth * 0.5) / cellWidth);
    const row = Math.floor((dropY + cellHeight * 0.5) / cellHeight);

    if (row !== lastPreviewRow || col !== lastPreviewCol) {
        lastPreviewRow = row;
        lastPreviewCol = col;
        if (canPlace(shape.matrix, row, col)) {
            showPreview(shape, row, col);
        } else {
            clearPreview();
        }
    }

    if (dragState && dragState.hasMoved) {
        requestAnimationFrame(processDragFrame);
    } else {
        isDragFramePending = false;
    }
}

function canPlace(matrix, row, col) {
    if (window.TutorialManager && window.TutorialManager.isActive) {
        if (typeof window.TutorialManager.isPlacementAllowed === 'function') {
            if (!window.TutorialManager.isPlacementAllowed(matrix, row, col)) {
                return false;
            }
        }
    }
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                const targetRow = row + r;
                const targetCol = col + c;
                if (targetRow < 0 || targetRow >= BOARD_SIZE || targetCol < 0 || targetCol >= BOARD_SIZE) {
                    return false;
                }
                if (boardState[targetRow][targetCol] !== null) {
                    return false;
                }
            }
        }
    }
    return true;
}

function getWildTransformation(targetRow, targetCol) {
    const allShapes = (typeof ALL_PRECALCULATED_SHAPES !== 'undefined' && ALL_PRECALCULATED_SHAPES.length > 0) ? ALL_PRECALCULATED_SHAPES : ((typeof BASE_SHAPES !== 'undefined' && BASE_SHAPES.length > 0) ? BASE_SHAPES : []);
    let candidates = [];

    for (let s = 0; s < allShapes.length; s++) {
        const shapeObj = allShapes[s];
        const matrix = shapeObj.matrix;
        for (let mr = 0; mr < matrix.length; mr++) {
            for (let mc = 0; mc < matrix[mr].length; mc++) {
                if (matrix[mr][mc]) {
                    const startRow = targetRow - mr;
                    const startCol = targetCol - mc;
                    if (canPlace(matrix, startRow, startCol)) {
                        candidates.push({
                            shape: shapeObj,
                            startRow: startRow,
                            startCol: startCol,
                            blockCount: shapeObj.coords ? shapeObj.coords.length : 1
                        });
                    }
                }
            }
        }
    }

    if (candidates.length === 0) return null;

    const multiBlockCandidates = candidates.filter(c => c.blockCount >= 2);
    const pool = multiBlockCandidates.length > 0 ? multiBlockCandidates : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
}

function placePiece(shape, row, col) {
    let transformedWildCells = [];
    if (shape && shape.isWild) {
        const transform = getWildTransformation(row, col);
        if (transform) {
            shape.matrix = transform.shape.matrix;
            shape.coords = transform.shape.coords;
            shape.id = transform.shape.id;
            shape.category = transform.shape.category;
            row = transform.startRow;
            col = transform.startCol;

            for (let r = 0; r < shape.matrix.length; r++) {
                for (let c = 0; c < shape.matrix[r].length; c++) {
                    if (shape.matrix[r][c]) {
                        transformedWildCells.push({ tr: row + r, tc: col + c });
                    }
                }
            }
            triggerSkillActivationPopup('Wild Blue 🫐', ['<span class="reward-yellow">WILDPIECE! 🔮</span>']);
        }
    }

    lastPlacedColor = shape.color;
    let blocksPlaced = 0;
    let borderBlocksPlaced = 0;

    for (let r = 0; r < shape.matrix.length; r++) {
        for (let c = 0; c < shape.matrix[r].length; c++) {
            if (shape.matrix[r][c]) {
                const targetR = row + r;
                const targetC = col + c;
                boardState[targetR][targetC] = shape.color;
                blocksPlaced++;

                if (targetR === 0 || targetR === BOARD_SIZE - 1 || targetC === 0 || targetC === BOARD_SIZE - 1) {
                    borderBlocksPlaced++;
                }
            }
        }
    }

    updateScore(blocksPlaced);
    if (window.QuestTracker) {
        window.QuestTracker.track('pieces', 1);
        if (shape && (shape.skill || (typeof shape.color === 'string' && shape.color.includes('gem')) || (typeof shape.color === 'object'))) {
            window.QuestTracker.track('special_pieces', 1);
        }
    }
    renderBoard();

    if (transformedWildCells.length > 0) {
        transformedWildCells.forEach(({ tr, tc }) => {
            const cellIndex = tr * BOARD_SIZE + tc;
            const cellEl = boardElement.children[cellIndex];
            if (cellEl) {
                cellEl.classList.remove('wild-transform-flash');
                void cellEl.offsetWidth;
                cellEl.classList.add('wild-transform-flash');
                setTimeout(() => {
                    if (cellEl) cellEl.classList.remove('wild-transform-flash');
                }, 450);
            }
        });
    }

    return borderBlocksPlaced;
}

// ==========================================
// VFX ELEMINATION SYSTEM (Particelle, Bagliori e Disintegrazione)
// ==========================================
let particles = [];
let flashes = [];
let disintegrations = [];
let vfxAnimId = null;

const GEM_COLORS_MAP = {
    red: [240, 55, 55],
    crimson: [220, 20, 60],
    lava_red: [239, 68, 68],
    orange: [247, 128, 39],
    reactive_orange: [255, 115, 0],
    yellow: [247, 185, 44],
    lime: [88, 213, 67],
    green: [34, 197, 94],
    overgrow_green: [34, 197, 94],
    cyan: [62, 201, 247],
    turquoise: [74, 217, 248],
    teal: [15, 229, 183],
    blue: [54, 96, 245],
    wild_blue: [59, 130, 246],
    indigo: [104, 85, 236],
    purple: [159, 84, 219],
    amplifying_purple: [168, 85, 247],
    magenta: [240, 65, 149],
    pink: [244, 114, 182],
    sakura_pink: [244, 114, 182],
    gold: [255, 215, 0],
    golden: [255, 215, 0]
};

function parseToRgb(colorInput) {
    if (!colorInput) return null;

    if (typeof colorInput === 'object') {
        if (colorInput.center) return parseToRgb(colorInput.center);
        if (colorInput.color) return parseToRgb(colorInput.color);
    }

    let str = String(colorInput).trim().toLowerCase();

    if (GEM_COLORS_MAP[str]) {
        const [r, g, b] = GEM_COLORS_MAP[str];
        return { r, g, b };
    }

    if (str.startsWith('rgb')) {
        const parts = str.match(/\d+/g);
        if (parts && parts.length >= 3) {
            return { r: parseInt(parts[0], 10), g: parseInt(parts[1], 10), b: parseInt(parts[2], 10) };
        }
    }

    if (str.startsWith('hsl')) {
        const parts = str.match(/\d+(\.\d+)?/g);
        if (parts && parts.length >= 3) {
            let h = parseFloat(parts[0]) / 360;
            let s = parseFloat(parts[1]) / 100;
            let l = parseFloat(parts[2]) / 100;
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
        }
    }

    let cleanHex = str.replace('#', '');
    if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(c => c + c).join('');
    if (cleanHex.length >= 6) {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return { r, g, b };
        }
    }

    return null;
}

function extractCellColor(val) {
    if (!val) return null;
    const rgbObj = parseToRgb(val);
    if (rgbObj) return `rgb(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b})`;
    return null;
}

function enhanceVfxColor(colorInput, brightnessFactor = 1.01, saturationFactor = 1.05) {
    const rgbObj = parseToRgb(colorInput);
    if (!rgbObj) return 'rgb(240, 55, 55)';

    const rf = rgbObj.r / 255, gf = rgbObj.g / 255, bf = rgbObj.b / 255;
    const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
            case gf: h = (bf - rf) / d + 2; break;
            case bf: h = (rf - gf) / d + 4; break;
        }
        h /= 6;
    }

    s = Math.min(1.0, s * saturationFactor);
    l = Math.min(1.0, l * brightnessFactor);

    let rFinal, gFinal, bFinal;
    if (s === 0) {
        rFinal = gFinal = bFinal = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        rFinal = hue2rgb(p, q, h + 1 / 3);
        gFinal = hue2rgb(p, q, h);
        bFinal = hue2rgb(p, q, h - 1 / 3);
    }

    const finalR = Math.min(255, Math.max(0, Math.round(rFinal * 255)));
    const finalG = Math.min(255, Math.max(0, Math.round(gFinal * 255)));
    const finalB = Math.min(255, Math.max(0, Math.round(bFinal * 255)));

    return `rgb(${finalR}, ${finalG}, ${finalB})`;
}

function hexToRgba(hex, a) {
    if (!hex) return `rgba(255, 214, 10, ${a})`;
    let enhanced = enhanceVfxColor(hex, 1.10, 1.44);
    if (enhanced.startsWith('rgb')) {
        return enhanced.replace('rgb', 'rgba').replace(')', `, ${a})`);
    }
    return `rgba(255, 214, 10, ${a})`;
}

function colorToRgba(colorObj, a) {
    if (!colorObj) return `rgba(255, 214, 10, ${a})`;
    let colorStr = extractCellColor(colorObj) || colorObj;
    return hexToRgba(colorStr, a);
}

function drawRoundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

let edgePopParticles = [];
const MAX_EDGE_POP_PARTICLES = 160;

class EdgePopParticle {
    constructor(x, y, color, isLeftEdge) {
        const marginOffset = (Math.random() - 0.5) * 8;
        this.x = x + marginOffset;
        this.y = y;

        const colorStr = (typeof color === 'string') ? color.toLowerCase() : '';
        this.isSakuraPink = colorStr.includes('pink') || colorStr.includes('sakura') || colorStr.includes('voragine') || colorStr.includes('244, 114') || colorStr.includes('255, 132') || colorStr.includes('236, 72');

        if (this.isSakuraPink) {
            // Petali piccoli e delicati per Sakura Pink 🌸
            const SAKURA_COLORS = ['rgb(244, 114, 182)', 'rgb(244, 63, 94)', 'rgb(251, 113, 133)', 'rgb(251, 207, 232)', 'rgb(236, 72, 153)', 'rgb(255, 182, 193)'];
            this.color = SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)];

            const rand = Math.random();
            if (rand < 0.60) {
                this.size = 9 + Math.random() * 6.0; // 9 - 15px (petali Sakura più grandi e ben visibili)
                this.baseSpeed = 1.2 + Math.random() * 1.2;
            } else {
                this.size = 16 + Math.random() * 8.0; // 16 - 24px
                this.baseSpeed = 0.7 + Math.random() * 0.9;
            }

            this.shapeType = Math.floor(Math.random() * 3); // 0: Petalo Ovale, 1: Petalo Diamante Curvo, 2: Punto Pixel Morbido
            const dirX = isLeftEdge ? -1 : 1;
            this.vx = dirX * (0.3 + Math.random() * 0.7);
            this.vy = 0.8 + Math.random() * 0.9; // Caduta fluttuante verso il basso

            this.friction = 0.95;
            this.life = 1.0;
            this.decay = 0.0045 + Math.random() * 0.0015; // ~3s fluttuanti
            this.scale = 1.0;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.18;
            this.swayFreq = 6 + Math.random() * 5;
        } else {
            // Altre abilità epiche: Elementi definiti nel colore dell'abilità
            this.color = enhanceVfxColor(color, 1.25, 1.45);

            const rand = Math.random();
            if (rand < 0.45) {
                this.sizeCategory = 'small';
                this.size = 10 + Math.random() * 5.0; // 10 - 15px
                this.baseSpeed = 3.5 + Math.random() * 2.5;
            } else if (rand < 0.80) {
                this.sizeCategory = 'medium';
                this.size = 16 + Math.random() * 6.0; // 16 - 22px
                this.baseSpeed = 2.2 + Math.random() * 1.8;
            } else {
                this.sizeCategory = 'large';
                this.size = 24 + Math.random() * 8.0; // 24 - 32px
                this.baseSpeed = 1.2 + Math.random() * 1.2;
            }

            this.shapeType = Math.floor(Math.random() * 3);

            const dirX = isLeftEdge ? -1 : 1;
            const angleSpread = (Math.random() - 0.5) * 0.5;
            const speed = this.baseSpeed;

            this.vx = dirX * speed * Math.cos(angleSpread);
            this.vy = speed * Math.sin(angleSpread) + (Math.random() - 0.5) * 1.0;

            this.friction = 0.94;
            this.life = 1.0;
            this.decay = 0.0050 + Math.random() * 0.0015;
            this.scale = 1.0;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.2;
        }
    }

    update() {
        if (this.isSakuraPink) {
            this.x += this.vx + Math.sin(this.life * this.swayFreq) * 0.40;
            this.y += this.vy;
        } else {
            this.x += this.vx;
            this.y += this.vy;
        }
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.rotation += this.rotSpeed;
        this.life -= this.decay;
        this.scale = Math.max(0.1, this.life);
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1.0, this.life * 1.15));
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const s = Math.max(0.8, this.size * this.scale);

        if (this.isSakuraPink) {
            // Petali piccoli e delicati stile Sakura
            if (this.shapeType === 0) {
                ctx.beginPath();
                ctx.ellipse(0, 0, s / 2, s / 3.2, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.shapeType === 1) {
                ctx.beginPath();
                ctx.moveTo(0, -s / 2);
                ctx.quadraticCurveTo(s / 2, -s / 4, s / 2.5, 0);
                ctx.lineTo(0, s / 2);
                ctx.quadraticCurveTo(-s / 2, s / 4, -s / 2.5, 0);
                ctx.closePath();
                ctx.fill();
            } else {
                drawRoundRect(ctx, -s / 2, -s / 2, s, s, s * 0.3);
                ctx.fill();
            }
        } else {
            // Forme definite per le altre abilità epiche (senza shadowBlur per mantenere costanti 60 FPS)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.5;

            if (this.shapeType === 0) {
                ctx.fillRect(-s / 2, -s / 2, s, s);
                ctx.strokeRect(-s / 2, -s / 2, s, s);
            } else if (this.shapeType === 1) {
                ctx.beginPath();
                ctx.moveTo(0, -s / 2);
                ctx.lineTo(s / 2, 0);
                ctx.lineTo(0, s / 2);
                ctx.lineTo(-s / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                drawRoundRect(ctx, -s / 2, -s / 2, s, s, s * 0.2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

function getSkillColorFromName(skillName) {
    if (!skillName) return 'rgb(249, 115, 22)';
    const name = skillName.toLowerCase();
    if (name.includes('orange')) return 'rgb(249, 115, 22)';
    if (name.includes('green')) return 'rgb(34, 197, 94)';
    if (name.includes('pink') || name.includes('sakura')) return 'rgb(244, 114, 182)';
    if (name.includes('purple')) return 'rgb(168, 85, 247)';
    if (name.includes('red') || name.includes('lava') || name.includes('tomato')) return 'rgb(239, 68, 68)';
    if (name.includes('blue')) return 'rgb(59, 130, 246)';
    if (name.includes('yellow') || name.includes('lemon') || name.includes('corn') || name.includes('fried egg') || name.includes('egg') || name.includes('pineapple') || name.includes('taco')) return 'rgb(234, 179, 8)';
    if (name.includes('watermelon')) return 'rgb(34, 197, 94)';
    if (name.includes('grapes')) return 'rgb(147, 51, 234)';
    if (name.includes('strawberry')) return 'rgb(244, 63, 94)';
    return 'rgb(249, 115, 22)';
}

function triggerEdgePopVFX(leftX, rightX, topY, bottomY, color) {
    const height = bottomY - topY;
    if (height <= 0) return;

    const colorStr = (typeof color === 'string') ? color.toLowerCase() : '';
    const isSakura = colorStr.includes('pink') || colorStr.includes('sakura') || colorStr.includes('voragine') || colorStr.includes('244, 114') || colorStr.includes('255, 132') || colorStr.includes('236, 72');

    const hexColor = (typeof color === 'string' && color.startsWith('rgb')) ? color : enhanceVfxColor(color, 1.30, 1.50);

    // 1. Raggio Energetico CSS accelerato via GPU ai bordi verticali (0 impatto CPU, 60 FPS)
    if (boardElement) {
        let leftBeam = document.getElementById('edge-energy-left');
        let rightBeam = document.getElementById('edge-energy-right');

        if (!leftBeam) {
            leftBeam = document.createElement('div');
            leftBeam.id = 'edge-energy-left';
            leftBeam.className = 'edge-energy-beam left';
            boardElement.appendChild(leftBeam);
        }

        if (!rightBeam) {
            rightBeam = document.createElement('div');
            rightBeam.id = 'edge-energy-right';
            rightBeam.className = 'edge-energy-beam right';
            boardElement.appendChild(rightBeam);
        }

        leftBeam.style.setProperty('--beam-color', hexColor);
        rightBeam.style.setProperty('--beam-color', hexColor);

        leftBeam.classList.remove('pulse-active');
        rightBeam.classList.remove('pulse-active');
        void leftBeam.offsetWidth;
        void rightBeam.offsetWidth;
        leftBeam.classList.add('pulse-active');
        rightBeam.classList.add('pulse-active');
    }

    // 2. Petali fluttuanti leggeri (Sakura 8 petali, altre abilità 3 particelle per lato)
    const steps = isSakura ? 8 : 3;
    const stepSize = height / steps;

    for (let i = 0; i <= steps; i++) {
        const py = topY + i * stepSize + (Math.random() - 0.5) * 10;
        if (edgePopParticles.length >= (isSakura ? 36 : 10)) edgePopParticles.shift();
        edgePopParticles.push(new EdgePopParticle(leftX, py, isSakura ? 'pink' : color, true));
        edgePopParticles.push(new EdgePopParticle(rightX, py, isSakura ? 'pink' : color, false));
    }

    startVFXLoop();
}

function triggerEdgePopVFXForCols(colIndices, color) {
    const { canvas: vfxCanvas } = getVfxContext();
    if (!vfxCanvas) return;
    const cellSize = vfxCanvas.width / BOARD_SIZE;

    colIndices.forEach(c => {
        const leftX = c * cellSize;
        const rightX = (c + 1) * cellSize;
        triggerEdgePopVFX(leftX, rightX, 0, BOARD_SIZE * cellSize, color);
    });
}

function triggerEdgePopVFXForArea(minCol, maxCol, minRow, maxRow, color) {
    const { canvas: vfxCanvas } = getVfxContext();
    if (!vfxCanvas) return;
    const cellSize = vfxCanvas.width / BOARD_SIZE;

    const leftX = minCol * cellSize;
    const rightX = (maxCol + 1) * cellSize;
    const topY = minRow * cellSize;
    const bottomY = (maxRow + 1) * cellSize;

    triggerEdgePopVFX(leftX, rightX, topY, bottomY, color);
}

function triggerEdgePopVFXForCells(cellsList, color) {
    if (!cellsList || cellsList.length === 0) return;
    const { canvas: vfxCanvas } = getVfxContext();
    if (!vfxCanvas) return;
    const cellSize = vfxCanvas.width / BOARD_SIZE;

    let minRow = BOARD_SIZE, maxRow = -1, minCol = BOARD_SIZE, maxCol = -1;
    cellsList.forEach(cell => {
        const r = cell.r !== undefined ? cell.r : cell[0];
        const c = cell.c !== undefined ? cell.c : cell[1];
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
    });

    triggerEdgePopVFXForArea(minCol, maxCol, minRow, maxRow, color);
}

window.triggerEdgePopVFX = triggerEdgePopVFX;
window.triggerEdgePopVFXForCols = triggerEdgePopVFXForCols;
window.triggerEdgePopVFXForArea = triggerEdgePopVFXForArea;
window.triggerEdgePopVFXForCells = triggerEdgePopVFXForCells;

const MAX_ACTIVE_PARTICLES = 70;
const MAX_ACTIVE_DISINTEGRATIONS = 28;
const MAX_ACTIVE_FLASHES = 10;
const MAX_ACTIVE_HIGHLIGHTS = 10;

let outlineHighlights = [];
let sliceLines = [];

class SliceLine {
    constructor(x, y, length, isVertical, color) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.isVertical = isVertical;
        this.color = color || '#00ffff';
        this.life = 1.0;
        this.progress = 0;
    }

    update() {
        this.progress += 0.073; // Slower laser slash sweep (+10% duration)
        this.life -= 0.038;     // +10% longer duration
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life);
        const currLen = Math.min(this.length, this.length * (this.progress * 1.5));

        ctx.save();
        ctx.globalAlpha = alpha * 0.95;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;

        ctx.beginPath();
        if (this.isVertical) {
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, Math.min(this.y + this.length, this.y + currLen));
        } else {
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(Math.min(this.x + this.length, this.x + currLen), this.y);
        }
        ctx.stroke();

        // Laser core accent
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this.color;
        ctx.stroke();

        ctx.restore();
    }
}

class OutlineHighlight {
    constructor(x, y, w, h, color) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color || '#ffffff';
        this.life = 1.0;
    }

    update() {
        this.life -= 0.038; // +10% longer duration (~26 frames)
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - this.life; // 0 to 1

        // Mini ingrandimento del bordo (pop enlargement effect)
        const pop = Math.sin(progress * Math.PI * 0.75) * 0.16; // Peak expansion at progress ~0.35
        const alpha = Math.pow(this.life, 1.2); // Smooth opacity decay to 0

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.95));
        ctx.strokeStyle = this.color || '#ffffff'; // Border color matches eliminated row!
        ctx.lineWidth = 3.5 * (1 + pop * 0.4);

        // Padding per espandere il bordo verso l'esterno attorno alla riga
        const padX = Math.max(2, (this.w * pop * 0.04) + (3.0 * pop));
        const padY = Math.max(2, (this.h * pop * 0.04) + (3.0 * pop));

        // ONLY OUTLINE BORDER STROKE (NO INNER FILL INSIDE)
        ctx.strokeRect(this.x - padX, this.y - padY, this.w + padX * 2, this.h + padY * 2);

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, vx, vy, options = {}) {
        this.x = x;
        this.y = y;
        this.color = enhanceVfxColor(color, 1.10, 1.44);
        const speedMult = options.speedMult || 1.0;
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 5.0) * speedMult;
        this.vx = vx !== undefined ? vx * speedMult : Math.cos(angle) * speed;
        this.vy = vy !== undefined ? vy * speedMult : (Math.sin(angle) * speed - (1.5 + Math.random() * 2.5) * speedMult);
        this.gravity = 0.25 + Math.random() * 0.12;
        const baseSize = 3.6 + Math.random() * 6.0;
        // Particle size increased by +15%: 1.38 * 1.15 = 1.59
        this.size = baseSize * (options.scaleMult || 1.0) * 1.59;
        this.life = 1;
        // Animation duration increased by +10%: decay 0.0104 + random * 0.0081
        this.decay = 0.0104 + Math.random() * 0.0081;
        this.friction = 0.94;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life);
        const s = Math.max(0.5, this.size * alpha);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    }
}

class Flash {
    constructor(x, y, w, h, color, isVertical) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.life = 1;
        this.isVertical = isVertical;
    }

    update() {
        // +10% increase in animation duration (decay reduced to 0.026)
        this.life -= 0.026;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const progress = 1 - this.life;
        const pop = Math.sin(progress * Math.PI * 0.75) * 0.12;
        const alpha = Math.max(0, this.life * 0.85);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color || '#ffffff';
        ctx.lineWidth = 2.5 * (1 + pop);
        const padX = 2 * pop;
        const padY = 2 * pop;
        // OUTLINE BORDER ONLY (NO INNER BACKGROUND FILL)
        ctx.strokeRect(this.x - padX, this.y - padY, this.w + padX * 2, this.h + padY * 2);
        ctx.restore();
    }
}

class Disintegration {
    constructor(x, y, size, color, isVertical, options = {}) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = enhanceVfxColor(color, 1.10, 1.44);
        this.life = 1;
        this.pixels = [];

        const linesCount = options.linesCount || 1;
        const pSize = (size / 2) * 1.32; // +15% size

        let scaleMult = 1.2;
        let speedMult = 1.0;
        if (linesCount === 2 || linesCount === 3) {
            scaleMult = 1.44;
            speedMult = 1.15;
        } else if (linesCount >= 4) {
            scaleMult = 1.8;
            speedMult = 1.35;
        }

        // Ridotta la quantità di frammenti disintegration del 60% (2 frammenti per blocco)
        for (let i = 0; i < 2; i++) {
            this.pixels.push({
                ox: (Math.random() - 0.5) * size * 0.5,
                oy: (Math.random() - 0.5) * size * 0.5,
                vx: (isVertical ? (Math.random() - 0.5) * 1.5 : (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3)) * speedMult,
                vy: (isVertical ? (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3) : (Math.random() - 0.5) * 1.5) * speedMult,
                size: pSize * (0.5 + Math.random() * 0.6) * scaleMult
            });
        }
    }

    update() {
        // +10% increase in animation duration (decay reduced to 0.017)
        this.life -= 0.017;
        for (let i = 0; i < this.pixels.length; i++) {
            const p = this.pixels[i];
            p.ox += p.vx;
            p.oy += p.vy;
            p.vx *= 0.93;
            p.vy *= 0.93;
        }
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        for (let i = 0; i < this.pixels.length; i++) {
            const p = this.pixels[i];
            const s = Math.max(0.5, p.size * alpha);
            ctx.fillRect(this.x + p.ox - s / 2, this.y + p.oy - s / 2, s, s);
        }
    }
}

function getVfxContext() {
    let vfxCanvas = document.getElementById('vfx-canvas');
    if (!vfxCanvas && boardElement) {
        vfxCanvas = document.createElement('canvas');
        vfxCanvas.id = 'vfx-canvas';
        boardElement.appendChild(vfxCanvas);
    }
    if (!vfxCanvas || !boardElement) return { canvas: null, ctx: null };
    const rect = boardElement.getBoundingClientRect();
    if (vfxCanvas.width !== Math.round(rect.width) || vfxCanvas.height !== Math.round(rect.height)) {
        vfxCanvas.width = Math.round(rect.width);
        vfxCanvas.height = Math.round(rect.height);
    }
    return { canvas: vfxCanvas, ctx: vfxCanvas.getContext('2d') };
}

function animateVFX() {
    const { canvas: vfxCanvas, ctx: vfxCtx } = getVfxContext();
    if (!vfxCtx || !vfxCanvas) return;

    vfxCtx.clearRect(0, 0, vfxCanvas.width, vfxCanvas.height);

    for (let i = outlineHighlights.length - 1; i >= 0; i--) {
        const oh = outlineHighlights[i];
        oh.update();
        oh.draw(vfxCtx);
        if (oh.life <= 0) outlineHighlights.splice(i, 1);
    }

    for (let i = sliceLines.length - 1; i >= 0; i--) {
        const sl = sliceLines[i];
        sl.update();
        sl.draw(vfxCtx);
        if (sl.life <= 0) sliceLines.splice(i, 1);
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.update();
        f.draw(vfxCtx);
        if (f.life <= 0) flashes.splice(i, 1);
    }

    for (let i = disintegrations.length - 1; i >= 0; i--) {
        const d = disintegrations[i];
        d.update();
        d.draw(vfxCtx);
        if (d.life <= 0) disintegrations.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(vfxCtx);
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = edgePopParticles.length - 1; i >= 0; i--) {
        const ep = edgePopParticles[i];
        ep.update();
        ep.draw(vfxCtx);
        if (ep.life <= 0) edgePopParticles.splice(i, 1);
    }

    if (outlineHighlights.length > 0 || sliceLines.length > 0 || flashes.length > 0 || disintegrations.length > 0 || particles.length > 0 || edgePopParticles.length > 0) {
        vfxAnimId = requestAnimationFrame(animateVFX);
    } else {
        vfxAnimId = null;
    }
}

function startVFXLoop() {
    if (!vfxAnimId) {
        vfxAnimId = requestAnimationFrame(animateVFX);
    }
}

function spawnParticles(x, y, color, isVertical, options = {}) {
    const linesCount = options.linesCount || 1;
    const isRainbow = (linesCount >= 2);
    let countFactor = 1.0;
    let scaleMult = 1.25;
    let speedMult = 1.0;

    if (linesCount === 2 || linesCount === 3) {
        countFactor = 1.2;
        scaleMult = 1.45;
        speedMult = 1.15;
    } else if (linesCount >= 4) {
        countFactor = 1.5;
        scaleMult = 1.8;
        speedMult = 1.35;
    }

    // Quantità particelle ridotta del 60% (~1 particella per blocco / 4-5 per riga)
    let count = (Math.random() < 0.65) ? 1 : 0;
    if (linesCount >= 2) {
        count = Math.round(1 * countFactor);
    }

    for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_ACTIVE_PARTICLES) {
            particles.shift();
        }
        const pColor = isRainbow ? RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)] : color;
        let vx, vy;
        if (isVertical) {
            vx = (Math.random() - 0.5) * 4.5;
            vy = (Math.random() - 0.5) * 1.5;
        } else {
            vx = (Math.random() - 0.5) * 1.5;
            vy = (Math.random() - 0.5) * 4.5;
        }
        particles.push(new Particle(x, y, pColor, vx, vy, {
            scaleMult,
            speedMult
        }));
    }
}

function triggerJellyWaveLineClear(clearedRows = [], clearedCols = [], gridState = null, linePieceColor = null, clearedQuads = []) {
    if (!boardElement) return;
    const currentGrid = gridState || (typeof boardState !== 'undefined' ? boardState : null);
    if (!currentGrid) return;

    const rows = [...new Set(clearedRows)].filter(r => r >= 0 && r < BOARD_SIZE);
    const cols = [...new Set(clearedCols)].filter(c => c >= 0 && c < BOARD_SIZE);
    const quads = Array.isArray(clearedQuads) ? clearedQuads : [];
    if (rows.length === 0 && cols.length === 0 && quads.length === 0) return;

    // Set di coordinate delle celle che appartengono alle righe/colonne/quadranti eliminate
    const clearedCellsSet = new Set();
    rows.forEach(r => {
        for (let c = 0; c < BOARD_SIZE; c++) clearedCellsSet.add(`${r},${c}`);
    });
    cols.forEach(c => {
        for (let r = 0; r < BOARD_SIZE; r++) clearedCellsSet.add(`${r},${c}`);
    });
    quads.forEach(quad => {
        for (let r = quad.rStart; r <= quad.rEnd; r++) {
            for (let c = quad.cStart; c <= quad.cEnd; c++) clearedCellsSet.add(`${r},${c}`);
        }
    });

    // Mappa dei blocchi adiacenti (pezzi vicino all'eliminazione) per applicare l'onda d'urto gommosa
    const adjacentImpacts = new Map(); // key `${r},${c}` -> { r, c, dir, delay }

    // Impatto per quadranti 4x4 eliminati (spinta verso l'esterno sui bordi adiacenti)
    quads.forEach(quad => {
        if (quad.rStart - 1 >= 0) {
            for (let c = quad.cStart; c <= quad.cEnd; c++) {
                const adjKey = `${quad.rStart - 1},${c}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[quad.rStart - 1] && currentGrid[quad.rStart - 1][c]) {
                    const delay = (c - quad.cStart) * 20;
                    adjacentImpacts.set(adjKey, { r: quad.rStart - 1, c, dir: 'up', delay });
                }
            }
        }
        if (quad.rEnd + 1 < BOARD_SIZE) {
            for (let c = quad.cStart; c <= quad.cEnd; c++) {
                const adjKey = `${quad.rEnd + 1},${c}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[quad.rEnd + 1] && currentGrid[quad.rEnd + 1][c]) {
                    const delay = (c - quad.cStart) * 20;
                    adjacentImpacts.set(adjKey, { r: quad.rEnd + 1, c, dir: 'down', delay });
                }
            }
        }
        if (quad.cStart - 1 >= 0) {
            for (let r = quad.rStart; r <= quad.rEnd; r++) {
                const adjKey = `${r},${quad.cStart - 1}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[r] && currentGrid[r][quad.cStart - 1]) {
                    const delay = (r - quad.rStart) * 20;
                    adjacentImpacts.set(adjKey, { r, c: quad.cStart - 1, dir: 'left', delay });
                }
            }
        }
        if (quad.cEnd + 1 < BOARD_SIZE) {
            for (let r = quad.rStart; r <= quad.rEnd; r++) {
                const adjKey = `${r},${quad.cEnd + 1}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[r] && currentGrid[r][quad.cEnd + 1]) {
                    const delay = (r - quad.rStart) * 20;
                    adjacentImpacts.set(adjKey, { r, c: quad.cEnd + 1, dir: 'right', delay });
                }
            }
        }
    });

    // Impatto per righe eliminate (sopra e sotto)
    rows.forEach(r => {
        // Sopra: r - 1
        if (r - 1 >= 0 && !rows.includes(r - 1)) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const adjKey = `${r - 1},${c}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[r - 1] && currentGrid[r - 1][c]) {
                    const waveRank = Math.floor(Math.abs(c - 3.5));
                    const delay = waveRank * 30;
                    const existing = adjacentImpacts.get(adjKey);
                    const dir = existing ? 'radial' : 'up';
                    adjacentImpacts.set(adjKey, { r: r - 1, c, dir, delay });
                }
            }
        }
        // Sotto: r + 1
        if (r + 1 < BOARD_SIZE && !rows.includes(r + 1)) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const adjKey = `${r + 1},${c}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[r + 1] && currentGrid[r + 1][c]) {
                    const waveRank = Math.floor(Math.abs(c - 3.5));
                    const delay = waveRank * 30;
                    const existing = adjacentImpacts.get(adjKey);
                    const dir = existing ? 'radial' : 'down';
                    adjacentImpacts.set(adjKey, { r: r + 1, c, dir, delay });
                }
            }
        }
    });

    // Impatto per colonne eliminate (sinistra e destra)
    cols.forEach(c => {
        // Sinistra: c - 1
        if (c - 1 >= 0 && !cols.includes(c - 1)) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                const adjKey = `${r},${c - 1}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[r] && currentGrid[r][c - 1]) {
                    const waveRank = Math.floor(Math.abs(r - 3.5));
                    const delay = waveRank * 30;
                    const existing = adjacentImpacts.get(adjKey);
                    const dir = existing ? 'radial' : 'left';
                    adjacentImpacts.set(adjKey, { r, c: c - 1, dir, delay });
                }
            }
        }
        // Destra: c + 1
        if (c + 1 < BOARD_SIZE && !cols.includes(c + 1)) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                const adjKey = `${r},${c + 1}`;
                if (!clearedCellsSet.has(adjKey) && currentGrid[r] && currentGrid[r][c + 1]) {
                    const waveRank = Math.floor(Math.abs(r - 3.5));
                    const delay = waveRank * 30;
                    const existing = adjacentImpacts.get(adjKey);
                    const dir = existing ? 'radial' : 'right';
                    adjacentImpacts.set(adjKey, { r, c: c + 1, dir, delay });
                }
            }
        }
    });

    // Applica l'animazione dell'onda d'urto gommosa ai soli pezzi vicino alla riga/colonna eliminata
    adjacentImpacts.forEach(({ r, c, dir, delay }) => {
        const adjCellEl = boardElement.children[r * BOARD_SIZE + c];
        if (!adjCellEl) return;

        adjCellEl.dataset.nudging = 'true';
        adjCellEl.style.setProperty('--stagger-delay', `${delay}ms`);
        adjCellEl.classList.remove('cell-adjacent-nudge-up', 'cell-adjacent-nudge-down', 'cell-adjacent-nudge-left', 'cell-adjacent-nudge-right', 'cell-adjacent-nudge-radial');
        void adjCellEl.offsetWidth;
        adjCellEl.classList.add(`cell-adjacent-nudge-${dir}`);

        setTimeout(() => {
            if (adjCellEl && adjCellEl.dataset.nudging === 'true') {
                adjCellEl.dataset.nudging = 'false';
                adjCellEl.classList.remove(`cell-adjacent-nudge-${dir}`);
                adjCellEl.style.removeProperty('--stagger-delay');
            }
        }, delay + 418);
    });
}
window.triggerJellyWaveLineClear = triggerJellyWaveLineClear;

function triggerClearVFX(index, isVertical, grid, cellSize, cols, rows, totalLinesCount = 1, explicitColor = null) {
    if (window.QuestTracker) {
        window.QuestTracker.track('lines', 1);
        if (totalLinesCount >= 3) {
            window.QuestTracker.track('multi_lines', 1);
        }
    }

    // Safeguard / Fallback: attiva l'onda d'urto gommosa per i pezzi adiacenti se non ancora attiva
    if (typeof triggerJellyWaveLineClear === 'function') {
        triggerJellyWaveLineClear(isVertical ? [] : [index], isVertical ? [index] : [], grid);
    }

    // 1. Determina il colore UNIFORME per la riga eliminata (priorità al colore del pezzo appena posizionato)
    let lineColor = explicitColor ? extractCellColor(explicitColor) : null;

    if (!lineColor && typeof lastPlacedColor !== 'undefined' && lastPlacedColor) {
        lineColor = extractCellColor(lastPlacedColor);
    }

    if (!lineColor) {
        // Ispeziona i blocchi se lastPlacedColor non è disponibile
        if (isVertical) {
            for (let r = 0; r < rows; r++) {
                if (grid && grid[r] && grid[r][index]) {
                    lineColor = extractCellColor(grid[r][index]);
                    if (lineColor) break;
                }
            }
        } else {
            for (let c = 0; c < cols; c++) {
                if (grid && grid[index] && grid[index][c]) {
                    lineColor = extractCellColor(grid[index][c]);
                    if (lineColor) break;
                }
            }
        }
    }

    if (!lineColor && typeof grid !== 'undefined' && grid) {
        for (let r = 0; r < rows && !lineColor; r++) {
            for (let c = 0; c < cols && !lineColor; c++) {
                if (grid[r] && grid[r][c]) {
                    lineColor = extractCellColor(grid[r][c]);
                }
            }
        }
    }

    if (!lineColor) lineColor = 'rgb(240, 55, 55)'; // Fallback rosso sicuro

    if (typeof enhanceVfxColor === 'function') {
        lineColor = enhanceVfxColor(lineColor, 1.0, 1.0);
    }

    // 2. Prepara le celle per le particelle: TUTTE le celle usano il COLORE UNIFORME del pezzo posizionato!
    const targetCells = [];
    if (isVertical) {
        for (let r = 0; r < rows; r++) {
            targetCells.push({
                x: (index + 0.5) * cellSize,
                y: (r + 0.5) * cellSize,
                color: lineColor
            });
        }
    } else {
        for (let c = 0; c < cols; c++) {
            targetCells.push({
                x: (c + 0.5) * cellSize,
                y: (index + 0.5) * cellSize,
                color: lineColor
            });
        }
    }

    const options = { linesCount: totalLinesCount };

    // Phase 1: Bordo della riga (Colore uniforme del pezzo posizionato) + Slice Line
    if (isVertical) {
        const cx = (index + 0.5) * cellSize;
        if (outlineHighlights.length >= MAX_ACTIVE_HIGHLIGHTS) outlineHighlights.shift();
        outlineHighlights.push(new OutlineHighlight(index * cellSize, 0, cellSize, rows * cellSize, lineColor));

        if (sliceLines.length >= 10) sliceLines.shift();
        sliceLines.push(new SliceLine(cx, 0, rows * cellSize, true, lineColor));
    } else {
        const cy = (index + 0.5) * cellSize;
        if (outlineHighlights.length >= MAX_ACTIVE_HIGHLIGHTS) outlineHighlights.shift();
        outlineHighlights.push(new OutlineHighlight(0, index * cellSize, cols * cellSize, cellSize, lineColor));

        if (sliceLines.length >= 10) sliceLines.shift();
        sliceLines.push(new SliceLine(0, cy, cols * cellSize, false, lineColor));
    }

    startVFXLoop();

    // Phase 2: Esplosione particelle per la riga eliminata
    setTimeout(() => {
        targetCells.forEach((cell, cellIdx) => {
            // Se 2+ righe -> Arcobaleno; se 1 riga -> colore UNIFORME del pezzo posizionato (lineColor)
            const blockColor = (totalLinesCount >= 2)
                ? RAINBOW_COLORS[cellIdx % RAINBOW_COLORS.length]
                : lineColor;

            if (disintegrations.length >= MAX_ACTIVE_DISINTEGRATIONS) disintegrations.shift();
            disintegrations.push(new Disintegration(cell.x, cell.y, cellSize * 0.8, blockColor, isVertical, options));
            spawnParticles(cell.x, cell.y, blockColor, isVertical, options);
        });

        if (flashes.length >= MAX_ACTIVE_FLASHES) flashes.shift();
        if (isVertical) {
            flashes.push(new Flash(index * cellSize, 0, cellSize, rows * cellSize, lineColor, true));
        } else {
            flashes.push(new Flash(0, index * cellSize, cols * cellSize, cellSize, lineColor, false));
        }
        startVFXLoop();
    }, 133);
}

const RAINBOW_COLORS = [
    '#cc1236',
    '#cc552a',
    '#ccab08',
    '#2dcc10',
    '#00c0cc',
    '#2945bc',
    '#6e22b4',
    '#8337cc'
];

function triggerRainbowSweep(clearedRows = [], clearedCols = [], gridState = null, clearedQuads = []) {
    const { canvas: vfxCanvas } = getVfxContext();
    const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

    const quads = Array.isArray(clearedQuads) ? clearedQuads : [];
    const totalLinesCount = clearedRows.length + clearedCols.length + (quads.length * 2);
    const options = { linesCount: totalLinesCount };

    // 1. Evidenziazione immediata dei bordi delle righe/colonne/quadranti eliminati
    clearedRows.forEach(r => {
        if (outlineHighlights.length >= MAX_ACTIVE_HIGHLIGHTS) outlineHighlights.shift();
        outlineHighlights.push(new OutlineHighlight(0, r * cellSize, BOARD_SIZE * cellSize, cellSize, RAINBOW_COLORS[0]));
        if (sliceLines.length >= 10) sliceLines.shift();
        sliceLines.push(new SliceLine(0, (r + 0.5) * cellSize, BOARD_SIZE * cellSize, false, RAINBOW_COLORS[1]));
    });

    clearedCols.forEach(c => {
        if (outlineHighlights.length >= MAX_ACTIVE_HIGHLIGHTS) outlineHighlights.shift();
        outlineHighlights.push(new OutlineHighlight(c * cellSize, 0, cellSize, BOARD_SIZE * cellSize, RAINBOW_COLORS[4]));
        if (sliceLines.length >= 10) sliceLines.shift();
        sliceLines.push(new SliceLine((c + 0.5) * cellSize, 0, BOARD_SIZE * cellSize, true, RAINBOW_COLORS[5]));
    });

    quads.forEach(quad => {
        if (outlineHighlights.length >= MAX_ACTIVE_HIGHLIGHTS) outlineHighlights.shift();
        outlineHighlights.push(new OutlineHighlight(quad.cStart * cellSize, quad.rStart * cellSize, 4 * cellSize, 4 * cellSize, RAINBOW_COLORS[2]));
        if (sliceLines.length >= 10) sliceLines.shift();
        sliceLines.push(new SliceLine(quad.cStart * cellSize, (quad.rStart + 2) * cellSize, 4 * cellSize, false, RAINBOW_COLORS[3]));
    });

    startVFXLoop();

    // 2. Cascata sequenziale ultra-veloce cella per cella: colorazione arcobaleno rapida (18ms a step) seguita da esplosione particelle
    for (let step = 0; step < BOARD_SIZE; step++) {
        setTimeout(() => {
            const rainbowColor = RAINBOW_COLORS[step % RAINBOW_COLORS.length];

            // Processa le celle delle righe colpite a questo step
            clearedRows.forEach(r => {
                const c = step;
                const px = (c + 0.5) * cellSize;
                const py = (r + 0.5) * cellSize;

                if (flashes.length >= MAX_ACTIVE_FLASHES) flashes.shift();
                flashes.push(new Flash(c * cellSize, r * cellSize, cellSize, cellSize, rainbowColor, false));

                if (disintegrations.length >= MAX_ACTIVE_DISINTEGRATIONS) disintegrations.shift();
                disintegrations.push(new Disintegration(px, py, cellSize * 0.8, rainbowColor, false, options));
                spawnParticles(px, py, rainbowColor, false, options);
            });

            // Processa le celle delle colonne colpite a questo step
            clearedCols.forEach(c => {
                const r = step;
                const px = (c + 0.5) * cellSize;
                const py = (r + 0.5) * cellSize;

                if (flashes.length >= MAX_ACTIVE_FLASHES) flashes.shift();
                flashes.push(new Flash(c * cellSize, r * cellSize, cellSize, cellSize, rainbowColor, true));

                if (disintegrations.length >= MAX_ACTIVE_DISINTEGRATIONS) disintegrations.shift();
                disintegrations.push(new Disintegration(px, py, cellSize * 0.8, rainbowColor, true, options));
                spawnParticles(px, py, rainbowColor, true, options);
            });

            // Processa le celle dei quadranti 4x4 colpite a questo step
            quads.forEach(quad => {
                if (step < 4) {
                    const r = quad.rStart + step;
                    for (let c = quad.cStart; c <= quad.cEnd; c++) {
                        const px = (c + 0.5) * cellSize;
                        const py = (r + 0.5) * cellSize;

                        if (flashes.length >= MAX_ACTIVE_FLASHES) flashes.shift();
                        flashes.push(new Flash(c * cellSize, r * cellSize, cellSize, cellSize, rainbowColor, false));

                        if (disintegrations.length >= MAX_ACTIVE_DISINTEGRATIONS) disintegrations.shift();
                        disintegrations.push(new Disintegration(px, py, cellSize * 0.8, rainbowColor, false, options));
                        spawnParticles(px, py, rainbowColor, false, options);
                    }
                }
            });

            startVFXLoop();
        }, step * 20);
    }

    // Garantisce il render finale pulito della griglia
    setTimeout(() => {
        if (typeof renderBoard === 'function') {
            renderBoard();
        }
    }, BOARD_SIZE * 20 + 220);
}

function triggerScreenShake(linesCleared, combo) {
    if (!boardElement) return;
    boardElement.classList.remove('shaking', 'shaking-light', 'shaking-medium', 'shaking-heavy');

    const lines = typeof linesCleared === 'number' ? linesCleared : 0;
    const cmb = typeof combo === 'number' ? combo : 0;
    if (lines <= 0 && cmb < 2) return;

    void boardElement.offsetWidth;

    let animClass = 'shaking-light';
    let durationMs = 150;
    if (lines >= 3 || cmb >= 5) {
        animClass = 'shaking-heavy';
        durationMs = 380;
    } else if (lines === 2 || cmb >= 2) {
        animClass = 'shaking-medium';
        durationMs = 250;
    } else if (lines === 1) {
        animClass = 'shaking-light';
        durationMs = 150;
    }

    boardElement.classList.add(animClass);

    const cleanupShake = () => {
        if (boardElement) {
            boardElement.classList.remove('shaking', 'shaking-light', 'shaking-medium', 'shaking-heavy');
        }
    };
    boardElement.addEventListener('animationend', cleanupShake, { once: true });
    setTimeout(cleanupShake, durationMs + 50);
}


function calculateCentroid(rowsToClear = [], colsToClear = [], quadsToClear = []) {
    let sumX = 0;
    let sumY = 0;
    let totalCells = 0;
    const cellPositions = new Set();

    rowsToClear.forEach(r => {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const key = `${r},${c}`;
            if (!cellPositions.has(key)) {
                cellPositions.add(key);
                sumY += (r + 0.5) / BOARD_SIZE;
                sumX += (c + 0.5) / BOARD_SIZE;
                totalCells++;
            }
        }
    });

    colsToClear.forEach(c => {
        for (let r = 0; r < BOARD_SIZE; r++) {
            const key = `${r},${c}`;
            if (!cellPositions.has(key)) {
                cellPositions.add(key);
                sumY += (r + 0.5) / BOARD_SIZE;
                sumX += (c + 0.5) / BOARD_SIZE;
                totalCells++;
            }
        }
    });

    quadsToClear.forEach(quad => {
        for (let r = quad.rStart; r <= quad.rEnd; r++) {
            for (let c = quad.cStart; c <= quad.cEnd; c++) {
                const key = `${r},${c}`;
                if (!cellPositions.has(key)) {
                    cellPositions.add(key);
                    sumY += (r + 0.5) / BOARD_SIZE;
                    sumX += (c + 0.5) / BOARD_SIZE;
                    totalCells++;
                }
            }
        }
    });

    if (totalCells === 0) {
        return { percentX: 50, percentY: 50 };
    }

    return {
        percentX: (sumX / totalCells) * 100,
        percentY: (sumY / totalCells) * 100
    };
}

function triggerPointsPopupVFX(points, posX, posY) {
    if (!boardElement || points <= 0) return;

    const ptsPopup = document.createElement('div');
    ptsPopup.className = 'popup-points-vfx';
    ptsPopup.style.left = `${posX}%`;
    ptsPopup.style.top = `${posY}%`;
    ptsPopup.textContent = `+${points}`;

    boardElement.appendChild(ptsPopup);

    const removePts = () => {
        if (ptsPopup && ptsPopup.parentElement) {
            ptsPopup.remove();
        }
    };

    ptsPopup.addEventListener('animationend', removePts, { once: true });
}

let skillPopupQueue = [];
let isProcessingSkillPopupQueue = false;
let skillSuccessionTimeout = null;

function clearSkillActivationPopups() {
    skillPopupQueue = [];
    isProcessingSkillPopupQueue = false;
    if (skillSuccessionTimeout) {
        clearTimeout(skillSuccessionTimeout);
        skillSuccessionTimeout = null;
    }
    const container = document.getElementById('skill-activation-container');
    if (container) {
        if (container._cleanupTimeout) {
            clearTimeout(container._cleanupTimeout);
            container._cleanupTimeout = null;
        }
        container.remove();
    }
    const lingering = document.querySelectorAll('.skill-activation-popup');
    lingering.forEach(el => el.remove());
}
window.clearSkillActivationPopups = clearSkillActivationPopups;

const SKILL_RARITY_LOOKUP = {
    // COMMON (Verde)
    'banana': 'COMMON', 'curved': 'COMMON', 'rotation': 'COMMON',
    'apple': 'COMMON', 'golden apple': 'COMMON',
    'tomato': 'COMMON', 'shining tomato': 'COMMON',
    'corn': 'COMMON', 'shielded corn': 'COMMON',
    'grapes': 'COMMON', 'juicy grapes': 'COMMON',
    'light strawberry': 'COMMON', 'light_strawberry': 'COMMON',
    'kaboom strawberry': 'COMMON', 'kaboom_strawberry': 'COMMON',
    'cherry': 'COMMON', 'tiny cherry': 'COMMON',
    'watermelon': 'COMMON', 'supreme watermelon': 'COMMON',
    'pumpkin': 'COMMON', 'rich pumpkin': 'COMMON',
    'pear': 'COMMON', 'double pear': 'COMMON',
    'linear orange': 'COMMON',
    'sour lemon': 'COMMON', 'lemon': 'COMMON',

    // RARE (Azzurro)
    'bagel': 'RARE', 'donut': 'RARE', 'single donut': 'RARE',
    'bread': 'RARE', 'fluffy bread': 'RARE',
    'sandwich': 'RARE', 'layered sandwich': 'RARE',
    'taco': 'RARE', 'desperate taco': 'RARE',
    'chocolate': 'RARE', 'wealthy chocolate': 'RARE',
    'fried egg': 'RARE', 'friedegg': 'RARE', 'ramen': 'RARE', 'resonant': 'RARE',
    'sweet strawberry': 'RARE',
    'pizza': 'RARE', 'swift pizza': 'RARE',

    // EPIC (Viola)
    'wild blue': 'EPIC', 'wild': 'EPIC',
    'reactive orange': 'EPIC', 'reactive': 'EPIC',
    'overgrow green': 'EPIC', 'overgrow': 'EPIC',
    'sakura pink': 'EPIC', 'sakura': 'EPIC',
    'persistent green': 'EPIC', 'persistent': 'EPIC',
    'amplifying purple': 'EPIC', 'amplifying': 'EPIC',
    'magic blue': 'EPIC',
    'lava red': 'EPIC', 'lava': 'EPIC'
};

function getSkillRarity(skillName, customRarity) {
    if (customRarity) return customRarity.toUpperCase();
    if (!skillName) return 'COMMON';
    const lower = skillName.toLowerCase();
    const keys = Object.keys(SKILL_RARITY_LOOKUP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (lower.includes(key)) {
            return SKILL_RARITY_LOOKUP[key];
        }
    }
    return 'COMMON';
}

function processNextSkillPopup() {
    if (skillPopupQueue.length === 0) {
        isProcessingSkillPopupQueue = false;
        return;
    }

    isProcessingSkillPopupQueue = true;
    const item = skillPopupQueue.shift();

    if (!boardElement) {
        if (skillPopupQueue.length > 0) {
            processNextSkillPopup();
        } else {
            isProcessingSkillPopupQueue = false;
        }
        return;
    }

    let container = document.getElementById('skill-activation-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'skill-activation-container';
        boardElement.appendChild(container);
    }

    // Reset cleanup timer when a new popup is processed
    if (container._cleanupTimeout) {
        clearTimeout(container._cleanupTimeout);
        container._cleanupTimeout = null;
    }

    // 1. Shift current popups in 2-slot system:
    // If there is an old 'previous' (top slot) popup, it SCOMPARE (removed immediately)
    const oldPrevious = container.querySelector('.pop-previous');
    if (oldPrevious) {
        oldPrevious.classList.remove('pop-previous', 'pop-current');
        oldPrevious.classList.add('pop-exit');
        setTimeout(() => { if (oldPrevious && oldPrevious.parentElement) oldPrevious.remove(); }, 350);
    }

    // If there is an old 'current' (bottom slot) popup, it becomes 'previous' (pushed UP & becomes OPAQUE)
    const oldCurrent = container.querySelector('.pop-current');
    if (oldCurrent) {
        oldCurrent.classList.remove('pop-current', 'pop-enter');
        oldCurrent.classList.add('pop-previous');
    }

    // 2. Create the NEW popup (becomes 'current' in bottom slot, bright / 100% opacity)
    const popup = document.createElement('div');
    const rarity = getSkillRarity(item.skillName, item.rarity).toLowerCase();
    const popClasses = `skill-activation-popup pop-enter pop-current rarity-${rarity}`;
    popup.className = popClasses;

    const skillColor = getSkillColorFromName(item.skillName);
    popup.style.setProperty('--badge-accent', skillColor);

    const dotEl = document.createElement('span');
    dotEl.className = 'skill-popup-dot';
    popup.appendChild(dotEl);

    const nameEl = document.createElement('span');
    nameEl.className = 'skill-popup-name';
    nameEl.textContent = item.skillName;
    popup.appendChild(nameEl);

    container.appendChild(popup);

    if (window.RetroAudio) window.RetroAudio.playSkillPopup();

    const { canvas: vfxCanvas } = getVfxContext();
    if (vfxCanvas) {
        triggerEdgePopVFX(0, vfxCanvas.width, 0, vfxCanvas.height, skillColor);
    }

    // 3. Cleanup logic at end of sequence (1500ms after the last popup has arrived)
    container._cleanupTimeout = setTimeout(() => {
        if (container && container.parentElement && skillPopupQueue.length === 0) {
            const allPopups = Array.from(container.querySelectorAll('.skill-activation-popup'));
            allPopups.forEach(p => {
                p.classList.remove('pop-enter');
                p.classList.add('pop-exit');
                setTimeout(() => { if (p && p.parentElement) p.remove(); }, 350);
            });
            setTimeout(() => {
                if (container && container.children.length === 0 && container.parentElement) {
                    container.remove();
                }
            }, 400);
        }
    }, 1500);

    // 4. Rapid succession: if multiple skills activate at the same time,
    // trigger them in brisk 240ms succession instead of waiting for the previous one to finish!
    const RAPID_SUCCESSION_DELAY = 240;
    if (skillSuccessionTimeout) {
        clearTimeout(skillSuccessionTimeout);
        skillSuccessionTimeout = null;
    }
    skillSuccessionTimeout = setTimeout(() => {
        if (skillPopupQueue.length > 0) {
            processNextSkillPopup();
        } else {
            isProcessingSkillPopupQueue = false;
        }
    }, RAPID_SUCCESSION_DELAY);
}

function triggerSkillActivationPopup(skillName, rewards, rarity) {
    if (window.isVictoryPointPopupActive || window.isVictoryRewardToastActive) {
        return;
    }
    const victoryToast = document.getElementById('victory-reward-toast');
    if (victoryToast && !victoryToast.classList.contains('hidden')) {
        return;
    }
    const noSpaceOverlay = document.getElementById('no-space-overlay');
    if (noSpaceOverlay && noSpaceOverlay.classList.contains('visible') && noSpaceOverlay.querySelector('.no-space-victory-text')) {
        return;
    }
    if (typeof gameOverScreen !== 'undefined' && gameOverScreen && gameOverScreen.classList.contains('visible')) {
        return;
    }

    // Blocca pop up attivazione skill se è stato raggiunto il punteggio traguardo
    if (typeof window.getClassicTargetScore === 'function') {
        const target = window.getClassicTargetScore();
        if (typeof score === 'number' && score >= target && !window.hasPressedKeepPlayingInMatch) {
            return;
        }
    }
    const activeMode = window.currentSelectedGameMode || 'classic';
    if ((activeMode === 'time' || activeMode === 'wild') && typeof score === 'number' && score >= 10000 && !window.hasPressedKeepPlayingInMatch) {
        return;
    }

    if (window.QuestTracker) window.QuestTracker.track('skills', 1);
    skillPopupQueue.push({ skillName, rewards, rarity });
    if (!isProcessingSkillPopupQueue) {
        processNextSkillPopup();
    }
}
window.triggerSkillActivationPopup = triggerSkillActivationPopup;

function triggerWarningPopupVFX(message = 'NOT ENOUGH COIN!', isDoubleSize = false, onComplete = null) {
    if (!boardElement) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }
    const old = document.querySelector('.warning-grid-popup');
    if (old) old.remove();

    let backdrop = null;
    if (isDoubleSize) {
        const oldBackdrop = document.querySelector('.free-roll-backdrop');
        if (oldBackdrop) oldBackdrop.remove();
        backdrop = document.createElement('div');
        backdrop.className = 'free-roll-backdrop';
        document.body.appendChild(backdrop);
    }

    if (isDoubleSize && typeof setTrayDisabled === 'function') {
        setTrayDisabled(true);
    }

    const popup = document.createElement('div');
    popup.className = isDoubleSize ? 'warning-grid-popup warning-double-size' : 'warning-grid-popup';
    popup.innerHTML = message;
    document.body.appendChild(popup);

    let finished = false;
    let callbackTriggered = false;

    const executeCallback = () => {
        if (callbackTriggered) return;
        callbackTriggered = true;
        if (typeof onComplete === 'function') {
            onComplete();
        }
    };

    const cleanup = () => {
        if (finished) return;
        finished = true;
        executeCallback();
        if (popup.parentElement) popup.remove();
        if (backdrop && backdrop.parentElement) backdrop.remove();
        if (isDoubleSize && typeof setTrayDisabled === 'function') {
            const shopOverlay = document.getElementById('shop-render-overlay');
            if (!shopOverlay || shopOverlay.classList.contains('hidden')) {
                setTrayDisabled(false);
            }
        }
    };

    if (isDoubleSize) {
        // Avvia la schermata dello shop/free roll 0.2s (200ms) prima che l'animazione del pop-up finisca completamente
        setTimeout(executeCallback, 1330);
    }

    popup.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 1530);
}
window.triggerWarningPopupVFX = triggerWarningPopupVFX;

function waitForAllPopupsToFinish(callback) {
    const check = () => {
        const hasTextVfx = !!document.querySelector('.popup-text-vfx');
        const hasPointsVfx = !!document.querySelector('.popup-points-vfx');
        const hasSkillPopups = !!document.querySelector('.skill-activation-popup');
        const hasWarningPopup = !!document.querySelector('.warning-grid-popup');
        const isQueueBusy = (typeof skillPopupQueue !== 'undefined' && skillPopupQueue.length > 0) ||
            (typeof isProcessingSkillPopupQueue !== 'undefined' && isProcessingSkillPopupQueue);

        if (!hasTextVfx && !hasPointsVfx && !hasSkillPopups && !hasWarningPopup && !isQueueBusy) {
            callback();
        } else {
            setTimeout(check, 60);
        }
    };
    check();
}
window.waitForAllPopupsToFinish = waitForAllPopupsToFinish;

function scheduleGameStartFreeRoll() {
    const mode = window.currentSelectedGameMode || 'classic';
    if (mode === 'vintage') return;
    if (window.TutorialManager && window.TutorialManager.isActive) return;

    if (window._gameStartFreeRollTimer) {
        clearTimeout(window._gameStartFreeRollTimer);
        window._gameStartFreeRollTimer = null;
    }

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen && !homeScreen.classList.contains('hidden')) return;

    window._gameStartFreeRollTimer = setTimeout(() => {
        window._gameStartFreeRollTimer = null;
        const currentHomeScreen = document.getElementById('home-screen');
        if (currentHomeScreen && !currentHomeScreen.classList.contains('hidden')) return;
        if (typeof gameOver !== 'undefined' && gameOver) return;

        if (typeof window.setTrayDisabled === 'function') {
            window.setTrayDisabled(true);
        }

        const startFreeRollPopupSequence = () => {
            if (typeof window.triggerWarningPopupVFX === 'function') {
                window.triggerWarningPopupVFX('<span class="rolling-dice">🎲</span><br>GAME START<br>FREE ROLL', true, () => {
                    // Once free roll popup finishes, immediately open shop
                    if (typeof window.triggerAutoFreeShopRoll === 'function') {
                        window.triggerAutoFreeShopRoll(true);
                    }
                });
            } else if (typeof window.triggerAutoFreeShopRoll === 'function') {
                window.triggerAutoFreeShopRoll(true);
            }
        };

        if (typeof window.waitForAllPopupsToFinish === 'function') {
            window.waitForAllPopupsToFinish(startFreeRollPopupSequence);
        } else {
            startFreeRollPopupSequence();
        }
    }, 150);
}
window.scheduleGameStartFreeRoll = scheduleGameStartFreeRoll;

function triggerPopupTextVFX(linesCleared, combo, centroid, points = 0, customMainTitle = '', customSubTitle = '') {
    if (!boardElement) return;

    let mainTitle = customMainTitle || '';
    let subTitle = customSubTitle || '';

    // Se si eliminano più righe in un solo posizionamento, mostra AMAZING! (2 righe) o WONDERFUL! (3+ righe)
    if (!mainTitle) {
        if (linesCleared >= 2) {
            mainTitle = linesCleared === 2 ? 'AMAZING!' : 'WONDERFUL!';
        } else {
            const effectiveTier = Math.max(combo || 0, linesCleared || 0);
            if (effectiveTier >= 2) {
                if (effectiveTier === 2) mainTitle = 'COOL!';
                else if (effectiveTier === 3) mainTitle = 'GREAT!';
                else if (effectiveTier === 4) mainTitle = 'GENIUS!';
                else if (effectiveTier === 5) mainTitle = 'SHARP!';
                else if (effectiveTier === 6) mainTitle = 'CLEAN!';
                else if (effectiveTier === 7) mainTitle = 'SMOOTH!';
                else if (effectiveTier === 8) mainTitle = 'GOAT!';
                else if (effectiveTier === 9) mainTitle = 'SUPER!';
                else if (effectiveTier === 10) mainTitle = 'FLAWLESS!';
                else if (effectiveTier >= 11) mainTitle = 'PERFECT!';
            }
        }
    }

    if (!subTitle && combo >= 2) {
        subTitle = `COMBO x${combo}`;
    }

    // Central Spawning System:
    // High-tier & long titles (SMOOTH, GOAT, AURA, FLAWLESS, PERFECT, AMAZING, WONDERFUL) are constrained to the safe center zone
    const isHighTier = ['SMOOTH!', 'GENIUS!', 'FLAWLESS!', 'PERFECT!', 'AMAZING!', 'WONDERFUL!'].includes(mainTitle);

    const rawX = centroid ? centroid.percentX : 50;
    const rawY = centroid ? centroid.percentY : 50;

    // Gravitate coordinates towards board center (50%, 50%)
    const attractionFactor = isHighTier ? 0.25 : 0.45;
    let posX = 50 + (rawX - 50) * attractionFactor;
    let posY = 50 + (rawY - 50) * attractionFactor;

    // Strict central bounds clamping
    if (isHighTier) {
        posX = Math.max(42, Math.min(58, posX));
        posY = Math.max(40, Math.min(56, posY));
    } else {
        posX = Math.max(36, Math.min(64, posX));
        posY = Math.max(34, Math.min(64, posY));
    }

    if (!mainTitle && !subTitle) {
        if (points > 0) {
            triggerPointsPopupVFX(points, posX, posY);
        }
        return;
    }

    const popup = document.createElement('div');
    popup.className = 'popup-text-vfx';
    popup.style.left = `${posX}%`;
    popup.style.top = `${posY}%`;

    const isRainbow = (linesCleared >= 2 || mainTitle === 'AMAZING!' || mainTitle === 'WONDERFUL!' || mainTitle === 'PERFECT!' || (mainTitle && mainTitle.includes('PERFECT'))) && (!customMainTitle || customMainTitle === 'AMAZING!' || customMainTitle === 'WONDERFUL!' || customMainTitle === 'PERFECT!' || customMainTitle.includes('PERFECT'));
    const isSlowerAnim = isRainbow; // Animazione più lenta di 50ms per i popup speciali arcobaleno (1.55s invece di 1.50s)

    if (isSlowerAnim) {
        popup.style.animationDuration = '1.55s';
    }

    let innerHTML = '';
    if (mainTitle) {
        let colorClass = '';
        let formattedTitle = mainTitle;

        // Rainbow letter effect per eliminazioni multiple e per PERFECT! (AMAZING!, WONDERFUL!, PERFECT!)
        if (isRainbow) {
            colorClass = ' rainbow-multi-clear';
            const rainbowColors = [
                '#FF3366', // Vibrant Red-Pink
                '#FF8800', // Orange
                '#FFDD00', // Bright Yellow
                '#00E676', // Bright Green
                '#00E5FF', // Cyan / Neon Blue
                '#8C52FF', // Purple / Violet
                '#FF4081'  // Hot Pink
            ];
            let colorIdx = 0;
            formattedTitle = Array.from(mainTitle).map(char => {
                if (char === ' ') return ' ';
                const color = rainbowColors[colorIdx % rainbowColors.length];
                colorIdx++;
                return `<span class="rainbow-char" style="color: ${color};">${char}</span>`;
            }).join('');
        } else if (mainTitle === 'FLAWLESS!') {
            colorClass = ' yellow-lg-title';
        } else if (mainTitle && (mainTitle === 'BACK IN ACTION!' || mainTitle.includes('REVIVE'))) {
            colorClass = ' revive-title';
        }
        innerHTML += `<div class="popup-title${colorClass}">${formattedTitle}</div>`;
    }
    if (subTitle) {
        innerHTML += `<div class="popup-sub">${subTitle}</div>`;
    }
    popup.innerHTML = innerHTML;

    boardElement.appendChild(popup);

    // Dynamic Auto-fit & Edge Bounding: Prevent large popup text from ever spilling outside frame
    requestAnimationFrame(() => {
        if (!popup || !popup.parentElement) return;
        const rect = popup.getBoundingClientRect();
        const containerRect = boardElement.getBoundingClientRect();

        // Max allowed width is 85% of screen width or 90% of board width
        const maxAllowedW = Math.min(window.innerWidth * 0.85, containerRect.width * 0.90);
        const peakWidth = rect.width * 1.13; // Peak overshoot factor in CSS animation

        if (peakWidth > maxAllowedW && rect.width > 0) {
            const scaleFactor = Math.max(0.35, maxAllowedW / peakWidth);
            popup.style.setProperty('--vfx-scale', scaleFactor.toFixed(3));
        }

        // Correct horizontal position if popup edges are too close to screen edges
        const computedScale = parseFloat(popup.style.getPropertyValue('--vfx-scale')) || 1.2;
        const halfW = (rect.width * computedScale) / 2;
        const minCenterX = 15 + halfW;
        const maxCenterX = window.innerWidth - 15 - halfW;

        const currentPixelX = containerRect.left + (containerRect.width * (posX / 100));
        if (currentPixelX < minCenterX) {
            const correctedX = ((minCenterX - containerRect.left) / containerRect.width) * 100;
            popup.style.left = `${Math.max(10, correctedX)}%`;
        } else if (currentPixelX > maxCenterX) {
            const correctedX = ((maxCenterX - containerRect.left) / containerRect.width) * 100;
            popup.style.left = `${Math.min(90, correctedX)}%`;
        }
    });

    let hasChained = false;
    const chainNextVFX = () => {
        if (hasChained) return;
        hasChained = true;
        if (popup && popup.parentElement) {
            popup.remove();
        }
        if (points > 0) {
            triggerPointsPopupVFX(points, posX, posY);
        }
    };

    const animDurationMs = isSlowerAnim ? 1550 : 1500;
    popup.addEventListener('animationend', chainNextVFX, { once: true });
    setTimeout(chainNextVFX, animDurationMs);
}

function spawnFlyingCoinEffect(startPos, coinsCount = 1) {
    const coinTarget = document.querySelector('.coins-icon') || document.querySelector('.coin-container') || document.getElementById('linesCoinDisplay');
    if (!coinTarget) return;

    const targetRect = coinTarget.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    const refPos = startPos || window.lastPlacedPos;

    if (refPos) {
        if (typeof refPos.left === 'number' && typeof refPos.top === 'number') {
            startX = refPos.left + (refPos.width || 0) / 2;
            startY = refPos.top + (refPos.height || 0) / 2;
        } else if (typeof refPos.x === 'number' && typeof refPos.y === 'number') {
            startX = refPos.x;
            startY = refPos.y;
        } else if (typeof refPos.percentX === 'number' && typeof refPos.percentY === 'number' && boardElement) {
            const boardRect = boardElement.getBoundingClientRect();
            startX = boardRect.left + (refPos.percentX / 100) * boardRect.width;
            startY = boardRect.top + (refPos.percentY / 100) * boardRect.height;
        }
    }

    const rawCoins = Math.round(coinsCount) || Math.ceil(coinsCount) || 1;
    const numCoins = Math.max(1, Math.min(10, rawCoins));

    for (let i = 0; i < numCoins; i++) {
        setTimeout(() => {
            const particle = document.createElement('img');
            particle.src = 'assets/coin_icon.png';
            particle.className = 'flying-coin-particle';
            document.body.appendChild(particle);

            const offsetX = (Math.random() - 0.5) * 24;
            const offsetY = (Math.random() - 0.5) * 24;
            const pStartX = startX + offsetX;
            const pStartY = startY + offsetY;

            particle.style.left = `${pStartX}px`;
            particle.style.top = `${pStartY}px`;
            particle.style.transform = 'scale(0) rotate(0deg)';
            particle.style.opacity = '0';

            const duration = 480 + Math.random() * 80;
            particle.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.14s ease';
            particle.style.transform = 'scale(1.25) rotate(-10deg)';
            particle.style.opacity = '1';

            setTimeout(() => {
                const startTime = performance.now();
                const spreadX = (Math.random() - 0.5) * 60;
                const controlX = (pStartX + targetX) / 2 + spreadX;
                const controlY = Math.min(pStartY, targetY) - (50 + Math.random() * 40);

                function animateFlight(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    const t = progress;
                    const invT = 1 - t;
                    const currX = invT * invT * pStartX + 2 * invT * t * controlX + t * t * targetX;
                    const currY = invT * invT * pStartY + 2 * invT * t * controlY + t * t * targetY;

                    const scale = 1.25 - progress * 0.45;
                    const rotation = (progress * 540) % 360;

                    particle.style.left = `${currX}px`;
                    particle.style.top = `${currY}px`;
                    particle.style.transform = `scale(${scale}) rotate(${rotation}deg)`;

                    if (progress < 1) {
                        requestAnimationFrame(animateFlight);
                    } else {
                        particle.remove();

                        const container = document.querySelector('.coin-container') || coinTarget;
                        if (container) {
                            container.classList.remove('hud-punch');
                            void container.offsetWidth;
                            container.classList.add('hud-punch');
                        }
                        if (window.RetroAudio) {
                            window.RetroAudio.playCoin();
                        }
                    }
                }

                requestAnimationFrame(animateFlight);
            }, 140 + i * 40);
        }, i * 50);
    }
}
window.spawnFlyingCoinEffect = spawnFlyingCoinEffect;

function triggerReactiveOrangeExplosion(placedShape, originRow, originCol, skillMessages = null) {
    const isReactiveOrangePiece = placedShape && (placedShape.isReactiveOrange || (placedShape.color && placedShape.color.isReactiveOrange));
    if (!isReactiveOrangePiece || originRow === -1 || originCol === -1 || !placedShape.matrix) return;

    const shapeCellsSet = new Set();
    const shapeCellsList = [];
    for (let r = 0; r < placedShape.matrix.length; r++) {
        for (let c = 0; c < placedShape.matrix[r].length; c++) {
            if (placedShape.matrix[r][c]) {
                const tr = originRow + r;
                const tc = originCol + c;
                shapeCellsSet.add(`${tr},${tc}`);
                shapeCellsList.push({ r: tr, c: tc });
            }
        }
    }

    const adjacentCellsSet = new Set();
    shapeCellsList.forEach(sc => {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const ar = sc.r + dr;
                const ac = sc.c + dc;
                if (ar >= 0 && ar < BOARD_SIZE && ac >= 0 && ac < BOARD_SIZE) {
                    const key = `${ar},${ac}`;
                    if (!shapeCellsSet.has(key)) {
                        adjacentCellsSet.add(key);
                    }
                }
            }
        }
    });

    let explodedCount = 0;
    const { canvas: vfxCanvas } = getVfxContext();
    const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

    adjacentCellsSet.forEach(key => {
        const [ar, ac] = key.split(',').map(Number);
        if (boardState[ar][ac] !== null && boardState[ar][ac] !== 0) {
            const val = boardState[ar][ac];
            const blockColor = (typeof val === 'object' && val.center) ? val.center : (val.color || val || 'rgb(249, 115, 22)');
            const px = (ac + 0.5) * cellSize;
            const py = (ar + 0.5) * cellSize;

            // Block Disintegration effect (fragments)
            disintegrations.push(new Disintegration(px, py, cellSize * 0.9, blockColor, true));

            // Radial burst particles for local block explosion
            for (let pCount = 0; pCount < 6; pCount++) {
                const angle = (Math.PI * 2 * pCount) / 6 + Math.random() * 0.5;
                const speed = 2 + Math.random() * 3;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                particles.push(new Particle(px, py, blockColor, vx, vy));
            }

            boardState[ar][ac] = null;
            explodedCount++;
        }
    });

    if (explodedCount > 0) {
        const explodedCells = Array.from(adjacentCellsSet).map(k => {
            const [r, c] = k.split(',').map(Number);
            return { r, c };
        });
        triggerEdgePopVFXForCells(explodedCells, 'rgb(249, 115, 22)');
        startVFXLoop();
        updateScore(explodedCount * 10);
        renderBoard();
        if (skillMessages) skillMessages.push(`Reactive Orange 🍊: ESPLOSIONE! (${explodedCount} blocchi)`);
        triggerSkillActivationPopup('Reactive Orange 🍊', ['<span class="reward-yellow">BOOM! 💥</span>']);
    }
}

function triggerOvergrowGreenGrowth(placedShape, originRow, originCol, skillMessages = null) {
    if (!placedShape || originRow < 0 || originCol < 0) return 0;
    const isOvergrow = placedShape.isOvergrowGreen || (placedShape.color && placedShape.color.isOvergrowGreen);
    if (!isOvergrow) return 0;

    const shapeCellsList = [];
    const shapeCellsSet = new Set();
    for (let r = 0; r < placedShape.matrix.length; r++) {
        for (let c = 0; c < placedShape.matrix[r].length; c++) {
            if (placedShape.matrix[r][c]) {
                const tr = originRow + r;
                const tc = originCol + c;
                shapeCellsSet.add(`${tr},${tc}`);
                shapeCellsList.push({ r: tr, c: tc });
            }
        }
    }

    const adjacentEmptyList = [];
    const visitedSet = new Set(shapeCellsSet);
    const queue = [...shapeCellsList];
    const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
    ];

    while (queue.length > 0 && adjacentEmptyList.length < 3) {
        const current = queue.shift();
        for (const dir of directions) {
            const ar = current.r + dir.dr;
            const ac = current.c + dir.dc;
            if (ar >= 0 && ar < BOARD_SIZE && ac >= 0 && ac < BOARD_SIZE) {
                const key = `${ar},${ac}`;
                if (!visitedSet.has(key)) {
                    visitedSet.add(key);
                    if (boardState[ar][ac] === null || boardState[ar][ac] === 0) {
                        adjacentEmptyList.push({ r: ar, c: ac });
                        queue.push({ r: ar, c: ac });
                        if (adjacentEmptyList.length >= 3) break;
                    }
                }
            }
        }
    }

    if (adjacentEmptyList.length === 0) return 0;

    const { canvas: vfxCanvas } = getVfxContext();
    const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;
    const colorObj = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.overgrow_green) ? GEM_COLORS.overgrow_green : { isOvergrowGreen: true, center: 'rgb(34, 197, 94)' };

    // Staggered sequential sprout animation piece by piece!
    adjacentEmptyList.forEach((cell, idx) => {
        const delayMs = idx * 110;
        setTimeout(() => {
            const { r: ar, c: ac } = cell;
            boardState[ar][ac] = colorObj;
            renderBoard();

            const cellIdx = ar * BOARD_SIZE + ac;
            const cellEl = boardElement.children[cellIdx];
            if (cellEl) {
                cellEl.classList.remove('overgrow-sprout-pop');
                void cellEl.offsetWidth;
                cellEl.classList.add('overgrow-sprout-pop');
            }

            const px = (ac + 0.5) * cellSize;
            const py = (ar + 0.5) * cellSize;
            for (let pCount = 0; pCount < 7; pCount++) {
                const angle = (Math.PI * 2 * pCount) / 7 + Math.random() * 0.4;
                const speed = 1.5 + Math.random() * 2.5;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                particles.push(new Particle(px, py, colorObj.center || 'rgb(34, 197, 94)', vx, vy));
            }
            startVFXLoop();
        }, delayMs);
    });

    const grownCount = adjacentEmptyList.length;
    if (skillMessages) skillMessages.push(`Overgrow Green 🌿: CRESCITA! (+${grownCount} blocchi)`);
    triggerSkillActivationPopup('Overgrow Green 🌿', [`<span class="reward-green">CRESCITA! +${grownCount} 🌿</span>`]);

    return grownCount;
}

function processLavaRedMovement() {
    if (typeof boardState === 'undefined' || !boardState || boardState.length === 0) return 0;
    let movedCount = 0;
    let meltedCount = 0;
    const newBoard = boardState.map(row => [...row]);
    const movedCells = [];
    const sourceCells = [];

    for (let r = BOARD_SIZE - 2; r >= 0; r--) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cellColor = boardState[r][c];
            if (cellColor && (cellColor.isLavaRed || (typeof cellColor === 'object' && cellColor.isLavaRed))) {
                const targetRow = r + 1;
                const targetCell = boardState[targetRow][c];
                let isMelted = false;

                if (targetCell && !targetCell.isLavaRed && !(typeof targetCell === 'object' && targetCell.isLavaRed)) {
                    meltedCount++;
                    isMelted = true;
                }

                newBoard[targetRow][c] = cellColor;

                if (newBoard[r][c] === cellColor) {
                    newBoard[r][c] = null;
                }

                movedCount++;
                sourceCells.push({ r, c });
                movedCells.push({
                    r: targetRow,
                    c: c,
                    sourceRow: r,
                    meltedColor: isMelted ? targetCell : null
                });

                const { canvas: vfxCanvas } = getVfxContext();
                const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;
                const px = (c + 0.5) * cellSize;
                const py = (targetRow + 0.5) * cellSize;

                const LAVA_COLORS = ['rgb(255, 69, 0)', 'rgb(255, 140, 0)', 'rgb(254, 240, 138)', 'rgb(239, 68, 68)', 'rgb(255, 87, 34)'];

                // Particelle di schizzo e fusione lavica
                for (let pCount = 0; pCount < 14; pCount++) {
                    const col = LAVA_COLORS[Math.floor(Math.random() * LAVA_COLORS.length)];
                    const vx = (Math.random() - 0.5) * 4.2;
                    const vy = (Math.random() - 0.5) * 3.6 - 0.6;
                    particles.push(new Particle(px, py, col, vx, vy, { scaleMult: 1.15 }));
                }

                // Faville e fumo caldo che salgono verso l'alto
                for (let pCount = 0; pCount < 8; pCount++) {
                    const col = (Math.random() < 0.65) ? 'rgb(254, 240, 138)' : 'rgb(255, 140, 0)';
                    const vx = (Math.random() - 0.5) * 1.8;
                    const vy = -(1.6 + Math.random() * 2.8);
                    const ember = new Particle(px, py, col, vx, vy, { scaleMult: 0.85 });
                    ember.gravity = -0.05; // Fluttuazione verso l'alto
                    ember.decay = 0.007;   // Permane più a lungo
                    particles.push(ember);
                }
            }
        }
    }

    if (movedCount > 0) {
        if (window.RetroAudio && typeof window.RetroAudio.playLavaMelt === 'function') {
            window.RetroAudio.playLavaMelt(meltedCount);
        }

        triggerEdgePopVFXForCells(movedCells, 'rgb(239, 68, 68)');
        boardState = newBoard;
        renderBoard();
        startVFXLoop();

        // Applica l'animazione di discesa fluida al singolo blocco lavico
        movedCells.forEach(({ r, c }) => {
            const cellIdx = r * BOARD_SIZE + c;
            const cellEl = boardElement.children[cellIdx];
            if (cellEl) {
                const blockCell = cellEl.querySelector('.block-cell');
                if (blockCell) {
                    blockCell.classList.remove('lava-slide-down');
                    void blockCell.offsetWidth;
                    blockCell.classList.add('lava-slide-down');
                }

                setTimeout(() => {
                    if (blockCell) blockCell.classList.remove('lava-slide-down');
                }, 1350);
            }
        });

        if (meltedCount > 0) {
            triggerSkillActivationPopup('Lava Red 🌋', [`<span class="reward-yellow">FUSIONE LAVA! 🔥 (${meltedCount} sciolti)</span>`]);
        }
    }
    return movedCount;
}

function checkLavaLineClears() {
    if (typeof boardState === 'undefined' || !boardState || boardState.length === 0) return 0;
    let rowsToClear = [];
    let colsToClear = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        let full = true;
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (!boardState[r][c]) { full = false; break; }
        }
        if (full) rowsToClear.push(r);
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
        let full = true;
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (!boardState[r][c]) { full = false; break; }
        }
        if (full) colsToClear.push(c);
    }

    let quadsToClear = getFilledQuadrants(boardState);
    const totalClearsCount = rowsToClear.length + colsToClear.length + quadsToClear.length;
    const linesCleared = rowsToClear.length + colsToClear.length + (quadsToClear.length * 2);

    if (linesCleared > 0) {
        if (typeof triggerJellyWaveLineClear === 'function') {
            triggerJellyWaveLineClear(rowsToClear, colsToClear, boardState, null, quadsToClear);
        }
        if (totalClearsCount > 1 || quadsToClear.length > 0) {
            triggerRainbowSweep(rowsToClear, colsToClear, boardState, quadsToClear);
        } else {
            const { canvas: vfxCanvas } = getVfxContext();
            const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;
            rowsToClear.forEach(r => triggerClearVFX(r, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, linesCleared));
            colsToClear.forEach(c => triggerClearVFX(c, true, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, linesCleared));
        }

        const clearedCellsSet = new Set();
        rowsToClear.forEach(r => {
            for (let c = 0; c < BOARD_SIZE; c++) clearedCellsSet.add(`${r},${c}`);
        });
        colsToClear.forEach(c => {
            for (let r = 0; r < BOARD_SIZE; r++) clearedCellsSet.add(`${r},${c}`);
        });
        quadsToClear.forEach(quad => {
            for (let r = quad.rStart; r <= quad.rEnd; r++) {
                for (let c = quad.cStart; c <= quad.cEnd; c++) clearedCellsSet.add(`${r},${c}`);
            }
        });

        clearedCellsSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            boardState[r][c] = null;
        });

        updateScore(linesCleared * 10);
        for (let i = 0; i < linesCleared; i++) {
            linesEliminated++;
            if (linesEliminated % 6 === 0) grantSkill();
        }
        updateSkillUI();
        renderBoard();
    }
    return linesCleared;
}

window.processLavaRedMovement = processLavaRedMovement;
window.checkLavaLineClears = checkLavaLineClears;

function checkLines(placedPos, placedShape, borderBlocksPlaced = 0, originRow = -1, originCol = -1) {

    // Overgrow Green 🌿 Skill: Grows into up to 3 adjacent empty spots when placed
    const grownCount = triggerOvergrowGreenGrowth(placedShape, originRow, originCol);
    const growthDelay = grownCount > 0 ? (grownCount * 110 + 260) : 0;
    const totalDelay = growthDelay;

    const executeLineCheckLogic = () => {
        // Fluffy Bread 🍞 Skill: Every 15 turns -> +5% of current coins (limited to a single decimal digit)
        if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.fluffy_bread && SKILLS_CONFIG.fluffy_bread.unlocked && SKILLS_CONFIG.fluffy_bread.active) {
            fluffyBreadTurnCount++;
            if (fluffyBreadTurnCount >= 15) {
                fluffyBreadTurnCount = 0;
                const currentCoins = (typeof userCoins !== 'undefined') ? userCoins : 0;
                let bonusCoins = Number((currentCoins * 0.05).toFixed(1));
                if (bonusCoins > 0) {
                    if (typeof addCoins === 'function') {
                        addCoins(bonusCoins);
                    } else {
                        userCoins += bonusCoins;
                        userCoins = Math.round(userCoins * 100) / 100;
                        updateCoinsDisplay();
                    }

                    const plusOneEl = document.getElementById('coinPlusOne');
                    if (plusOneEl) {
                        const bonusDisplay = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.golden_apple && SKILLS_CONFIG.golden_apple.unlocked && SKILLS_CONFIG.golden_apple.active) ? Number((bonusCoins * 1.2).toFixed(1)) : bonusCoins;
                        plusOneEl.textContent = `+${bonusDisplay}`;
                        plusOneEl.classList.remove('show');
                        void plusOneEl.offsetWidth;
                        plusOneEl.classList.add('show');
                    }

                    triggerSkillActivationPopup('Fluffy Bread 🍞', [`<span class="reward-yellow">+${bonusCoins} coins</span>`]);
                }
            }
        }

        let rowsToClear = [];
        let colsToClear = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            let full = true;
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (!boardState[r][c]) full = false;
            }
            if (full) rowsToClear.push(r);
        }

        for (let c = 0; c < BOARD_SIZE; c++) {
            let full = true;
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (!boardState[r][c]) full = false;
            }
            if (full) colsToClear.push(c);
        }

        // Controllo completamento per i 4 quadranti 4x4
        let quadsToClear = getFilledQuadrants(boardState);

        // Sakura Pink 🌸 Skill: If grid is <50% full -> destroy 3 random columns; if >=50% full -> destroy 2 random columns!
        const sakuraExtraCols = [];
        const isSakuraPinkPiece = placedShape && (placedShape.isSakuraPink || placedShape.isVoidBlack || (placedShape.color && (placedShape.color.isSakuraPink || placedShape.color.isVoidBlack)));
        if (isSakuraPinkPiece && colsToClear.length > 0) {
            const availableCols = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (!colsToClear.includes(c)) {
                    availableCols.push(c);
                }
            }
            for (let i = availableCols.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableCols[i], availableCols[j]] = [availableCols[j], availableCols[i]];
            }

            let filledCount = 0;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (boardState[r][c] !== null && boardState[r][c] !== 0) filledCount++;
                }
            }
            const fillRatio = filledCount / (BOARD_SIZE * BOARD_SIZE);
            const colsToDestroyCount = fillRatio < 0.50 ? 3 : 2;

            sakuraExtraCols.push(...availableCols.slice(0, colsToDestroyCount));
            if (sakuraExtraCols.length > 0) {
                const msg = colsToDestroyCount === 3 ? 'TRIPLA VORAGINE! (3 col) 🌸' : 'DOPPIA VORAGINE! (2 col) 🌸';
                triggerSkillActivationPopup('Sakura Pink 🌸', [`<span class="reward-yellow">${msg}</span>`]);
            }
        }

        const totalClearsCount = rowsToClear.length + colsToClear.length + quadsToClear.length;
        const linesCleared = rowsToClear.length + colsToClear.length + (quadsToClear.length * 2);

        if (linesCleared > 0 && (window.currentSelectedGameMode === 'time' || window.currentSelectedGameMode === 'wild') && typeof addTimerSeconds === 'function') {
            addTimerSeconds(linesCleared * 5);
        }

        if (linesCleared === 0) {
            consecutiveClears = 0;
            if (comboTolerance > 0) {
                comboTolerance--;
                if (comboTolerance === 0) {
                    comboLevel = 1;
                }
            } else {
                comboTolerance = 0;
                comboLevel = 1;
            }
            comboCount = comboLevel;
            if (typeof updateComboToleranceUI === 'function') updateComboToleranceUI();

            // Linear Orange 🍊 Skill: 4 consecutive turns without clearing any lines -> +2 counter & +50 points
            noClearTurnCount++;
            if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.linear_orange && SKILLS_CONFIG.linear_orange.unlocked && SKILLS_CONFIG.linear_orange.active) {
                if (noClearTurnCount >= 4) {
                    noClearTurnCount = 0;
                    updateScore(50);
                    for (let i = 0; i < 2; i++) {
                        linesEliminated++;
                        if (linesEliminated % 6 === 0) {
                            grantSkill();
                        }
                    }
                    updateSkillUI();

                    triggerSkillActivationPopup('Linear Orange 🍊', ['<span class="reward-green">+2 counter</span>', '<span class="reward-yellow">+50 pts</span>']);

                    const skillStatusEl = document.getElementById('skill-status');
                    if (skillStatusEl) {
                        skillStatusEl.textContent = 'Linear Orange 🍊: +2 Counter & +50 Points!';
                        setTimeout(() => {
                            if (skillStatusEl && skillStatusEl.textContent === 'Linear Orange 🍊: +2 Counter & +50 Points!') {
                                skillStatusEl.textContent = '';
                            }
                        }, 2500);
                    }
                }
            }

            // Reactive Orange 🍊 Skill: Explodes adjacent blocks when placed (even if 0 lines cleared)
            triggerReactiveOrangeExplosion(placedShape, originRow, originCol);
            return;
        }

        // Lines cleared in this turn -> reset noClearTurnCount for Linear Orange
        noClearTurnCount = 0;

        consecutiveClears++;
        if (consecutiveClears >= 2 || comboTolerance > 0 || linesCleared >= 2 || totalClearsCount >= 2) {
            comboTolerance = 3;
            comboLevel++;
        } else {
            comboTolerance = 0;
            comboLevel = 1;
        }
        comboCount = comboLevel;

        let skillMessages = [];

        // Shining Tomato 🍅 Skill: 5% chance to grant +2 to line counter when scoring
        let tomatoTriggered = false;
        if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.shining_tomato && SKILLS_CONFIG.shining_tomato.unlocked && SKILLS_CONFIG.shining_tomato.active) {
            if (Math.random() < 0.05) {
                tomatoTriggered = true;
                skillMessages.push('Shining Tomato 🍅: +2 Counter!');
                triggerSkillActivationPopup('Shining Tomato 🍅', ['<span class="reward-green">+2 counter</span>']);
            }
        }

        // Juicy Grapes 🍇 Skill: +0.4 monete per ogni combo > 8 (ogni combo di tipo INCREDIBLE!)
        if (comboCount > 8) {
            if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.juicy_grapes && SKILLS_CONFIG.juicy_grapes.unlocked && SKILLS_CONFIG.juicy_grapes.active) {
                if (typeof addCoins === 'function') {
                    addCoins(0.4);
                } else {
                    userCoins += 0.4;
                    updateCoinsDisplay();
                }

                const plusOneEl = document.getElementById('coinPlusOne');
                if (plusOneEl) {
                    const bonus = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.golden_apple && SKILLS_CONFIG.golden_apple.unlocked && SKILLS_CONFIG.golden_apple.active) ? (0.4 * 1.2) : 0.4;
                    plusOneEl.textContent = `+${bonus}`;
                    plusOneEl.classList.remove('show');
                    void plusOneEl.offsetWidth;
                    plusOneEl.classList.add('show');
                }

                skillMessages.push('Juicy Grapes 🍇: +0.4 Coins!');
                triggerSkillActivationPopup('Juicy Grapes 🍇', ['<span class="reward-yellow">+0.4 coins</span>']);
            }
        }

        if (typeof updateComboToleranceUI === 'function') updateComboToleranceUI();

        triggerScreenShake(linesCleared, comboCount);

        if (linesCleared > 0 && window.RetroAudio) {
            window.RetroAudio.playLineClear(linesCleared);
            if (comboCount >= 2) {
                setTimeout(() => {
                    if (window.RetroAudio) window.RetroAudio.playCombo(comboCount);
                }, 120);
            }
        }

        // Calculate base line points
        let linePoints = 0;
        if (comboCount >= 2) {
            if (window.QuestTracker) window.QuestTracker.track('combos', 1);
            linePoints = (comboCount * 10) + (linesCleared * 10);
        } else {
            linePoints = linesCleared * 10;
        }

        // Count blocks in placed piece for Rich Pumpkin
        let blocksInPiece = 0;
        if (placedShape && placedShape.matrix) {
            for (let r = 0; r < placedShape.matrix.length; r++) {
                for (let c = 0; c < placedShape.matrix[r].length; c++) {
                    if (placedShape.matrix[r][c]) blocksInPiece++;
                }
            }
        }

        let counterIncrements = 0;
        let doublePearTriggered = false;
        let richPumpkinTriggered = false;

        // Double Pear 🍐 Skill: 5% chance per cleared line to grant +2 to line counter instead of +1
        if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.double_pear && SKILLS_CONFIG.double_pear.unlocked && SKILLS_CONFIG.double_pear.active) {
            for (let i = 0; i < linesCleared; i++) {
                if (Math.random() < 0.05) {
                    counterIncrements += 2;
                    doublePearTriggered = true;
                } else {
                    counterIncrements += 1;
                }
            }
        } else {
            counterIncrements = linesCleared;
        }

        // Add +2 to line counter when Shining Tomato triggers
        if (tomatoTriggered) {
            counterIncrements += 2;
        }

        if (doublePearTriggered) {
            skillMessages.push('Double Pear 🍐: Line +2 counter!');
            triggerSkillActivationPopup('Double Pear 🍐', ['<span class="reward-green">+2 counter</span>']);
        }

        // Sour Lemon 🍋 Skill: Clear ONLY columns in 7 turns -> +2 counter
        if (colsToClear.length > 0 && rowsToClear.length === 0 && quadsToClear.length === 0) {
            sourLemonColumnTurns++;
            if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.sour_lemon && SKILLS_CONFIG.sour_lemon.unlocked && SKILLS_CONFIG.sour_lemon.active) {
                if (sourLemonColumnTurns >= 7) {
                    sourLemonColumnTurns = 0;
                    counterIncrements += 2;
                    skillMessages.push('Sour Lemon 🍋: 7 turns columns only! +2 Counter!');
                    triggerSkillActivationPopup('Sour Lemon 🍋', ['<span class="reward-green">+2 counter</span>']);
                }
            }
        } else if (rowsToClear.length > 0 || quadsToClear.length > 0) {
            sourLemonColumnTurns = 0;
        }

        // Rich Pumpkin 🎃 Skill: 5% chance for large piece (>= 5 blocks) scoring to double line counter increment
        if (blocksInPiece >= 5 && linesCleared > 0 &&
            typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.rich_pumpkin && SKILLS_CONFIG.rich_pumpkin.unlocked && SKILLS_CONFIG.rich_pumpkin.active) {
            if (Math.random() < 0.05) {
                counterIncrements *= 2;
                richPumpkinTriggered = true;
                skillMessages.push('Rich Pumpkin 🎃: Counter x2!');
                triggerSkillActivationPopup('Rich Pumpkin 🎃', ['<span class="reward-green">counter x2</span>']);
            }
        }

        // Layered Sandwich 🥪 Skill: +50% bonus points when clearing 2 or more lines
        if ((linesCleared >= 2 || totalClearsCount >= 2) &&
            typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.layered_sandwich && SKILLS_CONFIG.layered_sandwich.unlocked && SKILLS_CONFIG.layered_sandwich.active) {
            linePoints = Math.round(linePoints * 1.50);
            skillMessages.push('Layered Sandwich 🥪: +50% Bonus Points!');
            triggerSkillActivationPopup('Layered Sandwich 🥪', ['<span class="reward-yellow">+50% pts</span>']);
        }

        // Resonant Fried Egg 🍳 Skill: Clear 3 or more lines -> +2 line counter increment
        const isFriedeggActive = typeof SKILLS_CONFIG !== 'undefined' && (
            (SKILLS_CONFIG.resonant_friedegg && SKILLS_CONFIG.resonant_friedegg.unlocked && SKILLS_CONFIG.resonant_friedegg.active) ||
            (SKILLS_CONFIG.resonant_ramen && SKILLS_CONFIG.resonant_ramen.unlocked && SKILLS_CONFIG.resonant_ramen.active)
        );
        if ((linesCleared >= 3 || totalClearsCount >= 2) && isFriedeggActive) {
            counterIncrements += 2;
            skillMessages.push('Resonant Fried Egg 🍳: +2 Counter!');
            triggerSkillActivationPopup('Resonant Fried Egg 🍳', ['<span class="reward-green">+2 counter</span>']);
        }

        // Shielded Corn 🌽 Skill: Triggers ONLY when piece is placed on border AND placement scores line points (linesCleared > 0)
        if (borderBlocksPlaced > 0 &&
            typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.shielded_corn && SKILLS_CONFIG.shielded_corn.unlocked && SKILLS_CONFIG.shielded_corn.active) {
            const bonusPoints = borderBlocksPlaced * 10;
            linePoints += bonusPoints;
            skillMessages.push(`Shielded Corn 🌽: +${bonusPoints} Points!`);
            triggerSkillActivationPopup('Shielded Corn 🌽', [`<span class="reward-yellow">+${bonusPoints} pts</span>`]);
        }

        // Single Bagel 🍩 Skill: when clearing a 4x4 slot, 60% chance to gain +1 coin
        if (quadsToClear.length > 0 &&
            typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.single_donut && SKILLS_CONFIG.single_donut.unlocked && SKILLS_CONFIG.single_donut.active) {
            let bagelCoins = 0;
            for (let q = 0; q < quadsToClear.length; q++) {
                if (Math.random() < 0.60) {
                    bagelCoins += 1;
                }
            }
            if (bagelCoins > 0) {
                if (typeof addCoins === 'function') {
                    addCoins(bagelCoins);
                } else {
                    userCoins += bagelCoins;
                    updateCoinsDisplay();
                }

                const plusOneEl = document.getElementById('coinPlusOne');
                if (plusOneEl) {
                    const bonus = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.golden_apple && SKILLS_CONFIG.golden_apple.unlocked && SKILLS_CONFIG.golden_apple.active) ? (bagelCoins * 1.2) : bagelCoins;
                    plusOneEl.textContent = `+${bonus}`;
                    plusOneEl.classList.remove('show');
                    void plusOneEl.offsetWidth;
                    plusOneEl.classList.add('show');
                }

                skillMessages.push(`Single Bagel 🍩: +${bagelCoins} Coin!`);
                triggerSkillActivationPopup('Single Bagel 🍩', [`<span class="reward-yellow">+${bagelCoins} COIN 🪙</span>`]);
            }
        }

        updateScore(linePoints);

        const popupPos = placedPos || calculateCentroid(rowsToClear, colsToClear, quadsToClear);
        window.lastPlacedPos = popupPos;
        triggerPopupTextVFX(linesCleared, comboCount, popupPos, linePoints);

        for (let i = 0; i < counterIncrements; i++) {
            linesEliminated++;
            if (linesEliminated % 6 === 0) {
                grantSkill();
            }
        }
        updateSkillUI();

        if (skillMessages.length > 0) {
            const skillStatusEl = document.getElementById('skill-status');
            if (skillStatusEl) {
                const statusText = skillMessages.join(' | ');
                skillStatusEl.textContent = statusText;
                setTimeout(() => {
                    if (skillStatusEl && skillStatusEl.textContent === statusText) {
                        skillStatusEl.textContent = '';
                    }
                }, 2500);
            }
        }

        const linePieceColor = (placedShape && placedShape.color) ? placedShape.color : (typeof lastPlacedColor !== 'undefined' ? lastPlacedColor : null);
        if (typeof triggerJellyWaveLineClear === 'function') {
            triggerJellyWaveLineClear(rowsToClear, colsToClear, boardState, linePieceColor, quadsToClear);
        }

        if (totalClearsCount > 1 || quadsToClear.length > 0) {
            triggerRainbowSweep(rowsToClear, colsToClear, boardState, quadsToClear);
        } else {
            const { canvas: vfxCanvas } = getVfxContext();
            const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

            rowsToClear.forEach(r => {
                triggerClearVFX(r, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, linesCleared);
            });

            colsToClear.forEach(c => {
                triggerClearVFX(c, true, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, linesCleared);
            });
        }

        // Sweet Strawberry 🍓 Skill: +0.20 coins per golden block eliminated
        let goldenBlocksEliminated = 0;
        const clearedCellsSet = new Set();
        rowsToClear.forEach(r => {
            for (let c = 0; c < BOARD_SIZE; c++) clearedCellsSet.add(`${r},${c}`);
        });
        colsToClear.forEach(c => {
            for (let r = 0; r < BOARD_SIZE; r++) clearedCellsSet.add(`${r},${c}`);
        });
        quadsToClear.forEach(quad => {
            for (let r = quad.rStart; r <= quad.rEnd; r++) {
                for (let c = quad.cStart; c <= quad.cEnd; c++) clearedCellsSet.add(`${r},${c}`);
            }
        });

        clearedCellsSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const val = boardState[r][c];
            if (val && typeof val === 'object' && val.isGolden) {
                goldenBlocksEliminated++;
            }
        });

        if (goldenBlocksEliminated > 0) {
            const coinsEarned = parseFloat((goldenBlocksEliminated * 0.20).toFixed(2));
            if (typeof addCoins === 'function') {
                addCoins(coinsEarned);
            } else {
                userCoins += coinsEarned;
                updateCoinsDisplay();
            }

            const plusOneEl = document.getElementById('coinPlusOne');
            if (plusOneEl) {
                plusOneEl.textContent = `+${coinsEarned}`;
                plusOneEl.classList.remove('show');
                void plusOneEl.offsetWidth;
                plusOneEl.classList.add('show');
            }

            skillMessages.push(`Sweet Strawberry 🍓: +${coinsEarned} Coins!`);
            triggerSkillActivationPopup('Sweet Strawberry 🍓', [`<span class="reward-yellow">+${coinsEarned} coins</span>`]);
        }

        clearedCellsSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            boardState[r][c] = null;
        });

        renderBoard();

        if (window.TutorialManager && typeof window.TutorialManager.onLinesCleared === 'function') {
            window.TutorialManager.onLinesCleared(rowsToClear, colsToClear, quadsToClear);
        }

        // Sakura Pink 🌸 Sequential 3 Columns Destruction:
        if (sakuraExtraCols.length > 0) {
            sakuraExtraCols.forEach((colIndex, idx) => {
                setTimeout(() => {
                    if (typeof triggerJellyWaveLineClear === 'function') {
                        triggerJellyWaveLineClear([], [colIndex], boardState);
                    }
                    for (let r = 0; r < BOARD_SIZE; r++) {
                        boardState[r][colIndex] = null;
                    }
                    renderBoard();

                    const { canvas: vfxCanvas } = getVfxContext();
                    const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;
                    triggerEdgePopVFXForCols([colIndex], 'rgb(244, 114, 182)');
                    triggerClearVFX(colIndex, true, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 1, 'rgb(244, 114, 182)');

                    // Suono ritmico pesante "dum dum dum" per ogni colonna distrutta da Sakura Pink
                    if (window.RetroAudio && typeof window.RetroAudio.playSakuraColumn === 'function') {
                        window.RetroAudio.playSakuraColumn(idx);
                    }

                    updateScore(10);
                    linesEliminated++;
                    if (linesEliminated % 6 === 0) {
                        grantSkill();
                    }
                    if ((window.currentSelectedGameMode === 'time' || window.currentSelectedGameMode === 'wild') && typeof addTimerSeconds === 'function') {
                        addTimerSeconds(5);
                    }
                    updateSkillUI();
                    triggerScreenShake(1, comboCount);
                }, (idx + 1) * 240);
            });
        }

        // Amplifying Purple 🔮 Skill: If horizontal row(s) cleared, shift intact upper structure downward as a rigid body
        const isAmplifyingPurplePiece = placedShape && (placedShape.isAmplifyingPurple || (placedShape.color && placedShape.color.isAmplifyingPurple));
        if (isAmplifyingPurplePiece && rowsToClear.length > 0) {
            const applyAmplifyingPurpleGravity = (clearedRowsList) => {
                if (!clearedRowsList || clearedRowsList.length === 0) return { blocksShifted: 0, shiftedCellIndices: [] };

                const maxClearedRow = Math.max(...clearedRowsList);
                const upperBlocks = [];
                const upperBlockSet = new Set();

                for (let r = 0; r < maxClearedRow; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        if (boardState[r][c] !== null && boardState[r][c] !== 0) {
                            upperBlocks.push({ r, c, val: boardState[r][c] });
                            upperBlockSet.add(`${r},${c}`);
                        }
                    }
                }

                if (upperBlocks.length === 0) return { blocksShifted: 0, shiftedCellIndices: [] };

                let maxShift = 0;
                for (let d = 1; d < BOARD_SIZE; d++) {
                    let valid = true;
                    for (const block of upperBlocks) {
                        const targetR = block.r + d;
                        // Stopping condition 1: Touch or exceed bottom border of board
                        if (targetR >= BOARD_SIZE) {
                            valid = false;
                            break;
                        }
                        // Stopping condition 2: Contact with non-eliminated block below
                        if (!upperBlockSet.has(`${targetR},${block.c}`)) {
                            if (boardState[targetR][block.c] !== null && boardState[targetR][block.c] !== 0) {
                                valid = false;
                                break;
                            }
                        }
                    }
                    if (valid) {
                        maxShift = d;
                    } else {
                        break;
                    }
                }

                if (maxShift === 0) return { blocksShifted: 0, shiftedCellIndices: [] };

                const nextBoardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
                for (let r = 0; r < BOARD_SIZE; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        if (!upperBlockSet.has(`${r},${c}`)) {
                            nextBoardState[r][c] = boardState[r][c];
                        }
                    }
                }

                const shiftedCellIndices = [];
                let blocksShifted = 0;

                for (const block of upperBlocks) {
                    const targetR = block.r + maxShift;
                    nextBoardState[targetR][block.c] = block.val;
                    blocksShifted++;
                    shiftedCellIndices.push(targetR * BOARD_SIZE + block.c);
                }

                boardState = nextBoardState;
                return { blocksShifted, shiftedCellIndices };
            };

            const { blocksShifted, shiftedCellIndices } = applyAmplifyingPurpleGravity(rowsToClear);

            if (blocksShifted > 0) {
                const maxClearedRow = Math.max(...rowsToClear);
                triggerEdgePopVFXForArea(0, BOARD_SIZE - 1, 0, maxClearedRow, 'rgb(168, 85, 247)');
                renderBoard();

                shiftedCellIndices.forEach(idx => {
                    const cellEl = boardElement.children[idx];
                    if (cellEl) {
                        cellEl.classList.remove('gravity-drop-fast');
                        void cellEl.offsetWidth;
                        cellEl.classList.add('gravity-drop-fast');
                        setTimeout(() => {
                            if (cellEl) cellEl.classList.remove('gravity-drop-fast');
                        }, 260);
                    }
                });

                skillMessages.push('Amplifying Purple 🔮: Gravità applicata!');
                triggerSkillActivationPopup('Amplifying Purple 🔮', ['<span class="reward-yellow">GRAVITÀ! 🌌</span>']);

                // Cascade check: Clear any new lines formed by intact falling shapes!
                while (true) {
                    let cascadeRows = [];
                    let cascadeCols = [];

                    for (let r = 0; r < BOARD_SIZE; r++) {
                        let full = true;
                        for (let c = 0; c < BOARD_SIZE; c++) {
                            if (!boardState[r][c]) full = false;
                        }
                        if (full) cascadeRows.push(r);
                    }

                    for (let c = 0; c < BOARD_SIZE; c++) {
                        let full = true;
                        for (let r = 0; r < BOARD_SIZE; r++) {
                            if (!boardState[r][c]) full = false;
                        }
                        if (full) cascadeCols.push(c);
                    }

                    const cascadeLines = cascadeRows.length + cascadeCols.length;
                    if (cascadeLines === 0) break;

                    comboLevel++;
                    comboCount = comboLevel;
                    comboTolerance = 3;
                    let cascadePoints = (comboCount * 10) + (cascadeLines * 10);
                    updateScore(cascadePoints);
                    triggerScreenShake(cascadeLines, comboCount);
                    if (window.RetroAudio) {
                        window.RetroAudio.playLineClear(cascadeLines);
                    }

                    if (typeof triggerJellyWaveLineClear === 'function') {
                        triggerJellyWaveLineClear(cascadeRows, cascadeCols, boardState);
                    }

                    if (cascadeLines > 1) {
                        triggerRainbowSweep(cascadeRows, cascadeCols, boardState);
                    } else {
                        const { canvas: vfxCanvas } = getVfxContext();
                        const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;
                        cascadeRows.forEach(r => triggerClearVFX(r, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, cascadeLines));
                        cascadeCols.forEach(c => triggerClearVFX(c, true, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, cascadeLines));
                    }

                    cascadeRows.forEach(r => {
                        for (let c = 0; c < BOARD_SIZE; c++) boardState[r][c] = null;
                    });
                    cascadeCols.forEach(c => {
                        for (let r = 0; r < BOARD_SIZE; r++) boardState[r][c] = null;
                    });

                    for (let i = 0; i < cascadeLines; i++) {
                        linesEliminated++;
                        if (linesEliminated % 6 === 0) {
                            grantSkill();
                        }
                    }
                    updateSkillUI();
                    renderBoard();

                    if (cascadeRows.length > 0) {
                        const { blocksShifted: cascadeShifted } = applyAmplifyingPurpleGravity(cascadeRows);
                        if (cascadeShifted === 0) break;
                        renderBoard();
                    } else {
                        break;
                    }
                }
            }
        }

        // Reactive Orange 🍊 Skill: Explodes adjacent blocks touching the placed piece (AFTER line clearing)
        triggerReactiveOrangeExplosion(placedShape, originRow, originCol, skillMessages);

        // Supreme Watermelon 🍉 Skill: Clear Board bonus (+200 pts, +2 coins)
        let isBoardEmpty = true;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (boardState[r][c] !== null && boardState[r][c] !== 0) {
                    isBoardEmpty = false;
                    break;
                }
            }
            if (!isBoardEmpty) break;
        }

        if (isBoardEmpty) {
            if (window.RetroAudio) window.RetroAudio.playBoardClear();
        }

        if (isBoardEmpty && typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.supreme_watermelon && SKILLS_CONFIG.supreme_watermelon.unlocked && SKILLS_CONFIG.supreme_watermelon.active) {
            updateScore(200);
            if (typeof addCoins === 'function') {
                addCoins(2);
            } else {
                userCoins += 2;
                updateCoinsDisplay();
            }

            triggerSkillActivationPopup('Supreme Watermelon 🍉', ['<span class="reward-yellow">+200 pts</span>', '<span class="reward-yellow">+2 coins</span>']);

            const skillStatusEl = document.getElementById('skill-status');
            if (skillStatusEl) {
                skillStatusEl.textContent = 'Supreme Watermelon 🍉: Clear Board! +200 Pts & +2 Coins!';
                setTimeout(() => {
                    if (skillStatusEl && skillStatusEl.textContent === 'Supreme Watermelon 🍉: Clear Board! +200 Pts & +2 Coins!') {
                        skillStatusEl.textContent = '';
                    }
                }, 2500);
            }
        }
    };

    if (totalDelay > 0) {
        setTimeout(executeLineCheckLogic, totalDelay);
    } else {
        executeLineCheckLogic();
    }
}

let gameOverCheckTimeout = null;

function getOrCreateNoSpaceOverlay() {
    const trayElement = document.getElementById('tray');
    let overlay = document.getElementById('no-space-overlay');
    if (!overlay && trayElement) {
        overlay = document.createElement('div');
        overlay.id = 'no-space-overlay';
        overlay.innerHTML = '';
        trayElement.appendChild(overlay);
    } else if (overlay && overlay.parentElement !== trayElement && trayElement) {
        trayElement.appendChild(overlay);
    }
    return overlay;
}

function triggerPersistentGreenSaver() {
    const pg = typeof SKILLS_CONFIG !== 'undefined' ? SKILLS_CONFIG.persistent_green : null;
    if (pg) {
        pg.consumed = true;
        pg.unlocked = false;
        pg.active = false;
    }

    if (typeof addCoins === 'function') {
        addCoins(2);
    } else if (typeof userCoins !== 'undefined') {
        userCoins += 2;
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    }
    const plusOneEl = document.getElementById('coinPlusOne');
    if (plusOneEl) {
        plusOneEl.textContent = '+2';
        plusOneEl.classList.remove('show');
        void plusOneEl.offsetWidth;
        plusOneEl.classList.add('show');
    }

    if (typeof triggerSkillActivationPopup === 'function') {
        triggerSkillActivationPopup('PERSISTENT GREEN 🍏', ['<span class="reward-yellow">+2 coins & 3 NEW PIECES!</span>']);
    }

    const pieceElems = document.querySelectorAll('.tray-slot .piece');
    pieceElems.forEach(el => {
        el.classList.add('rainbow-destroy-anim');
    });

    // Parabolic falling quadratini in their ORIGINAL piece colors (più grandi, mantenendo i colori dei pezzi)
    const blockElems = document.querySelectorAll('.tray-slot .piece-block');

    blockElems.forEach(bEl => {
        const bRect = bEl.getBoundingClientRect();
        if (bRect.width === 0 || bRect.height === 0) return;

        // Extract exact block gem color
        const blockCell = bEl.querySelector('.block-cell') || bEl;
        let blockColor = blockCell.style.getPropertyValue('--c-center') || blockCell.style.getPropertyValue('--c-top');
        if (!blockColor || blockColor.trim() === '') {
            const comp = window.getComputedStyle(blockCell);
            blockColor = comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)' ? comp.backgroundColor : '#3b82f6';
        }
        blockColor = blockColor.trim();

        // Spawn 2 larger quadratini (16px - 24px) per block (ridotto della metà)
        const baseChunkSize = Math.max(14, Math.floor(bRect.width * 0.42));
        for (let i = 0; i < 2; i++) {
            const p = document.createElement('div');
            const size = baseChunkSize + Math.floor(Math.random() * 6);
            p.style.position = 'fixed';
            p.style.left = (bRect.left + Math.random() * Math.max(0, bRect.width - size)) + 'px';
            p.style.top = (bRect.top + Math.random() * Math.max(0, bRect.height - size)) + 'px';
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.borderRadius = '4px';
            p.style.backgroundColor = blockColor;
            p.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.35), 0 2px 5px rgba(0,0,0,0.3)';
            p.style.pointerEvents = 'none';
            p.style.zIndex = '999999';
            document.body.appendChild(p);

            const apexX = (Math.random() - 0.5) * 170;
            const apexY = -45 - Math.random() * 55;
            const fallX = apexX * 1.6;
            const fallY = 400 + Math.random() * 160;
            const rot = (Math.random() - 0.5) * 600;

            if (typeof p.animate === 'function') {
                const anim = p.animate([
                    { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1, offset: 0 },
                    { transform: `translate(${apexX}px, ${apexY}px) rotate(${rot * 0.3}deg) scale(1.08)`, opacity: 1, offset: 0.22 },
                    { transform: `translate(${fallX}px, ${fallY}px) rotate(${rot}deg) scale(0.3)`, opacity: 0, offset: 1.0 }
                ], {
                    duration: 950,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    fill: 'forwards'
                });
                anim.onfinish = () => p.remove();
            } else {
                p.style.transition = 'transform 0.95s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.95s ease-in';
                requestAnimationFrame(() => {
                    p.style.transform = `translate(${fallX}px, ${fallY}px) rotate(${rot}deg) scale(0.3)`;
                    p.style.opacity = '0';
                });
                setTimeout(() => p.remove(), 970);
            }
        }
    });

    // Solo dopo che l'animazione parabolica è completata compaiono i nuovi pezzi!
    setTimeout(() => {
        if (typeof spawnPieces === 'function') {
            spawnPieces(true);
        }
    }, 1020);
}

function checkGameOver() {
    if (gameOverCheckTimeout) clearTimeout(gameOverCheckTimeout);

    gameOverCheckTimeout = setTimeout(() => {
        gameOverCheckTimeout = null;

        // Non mostrare o attivare Game Over mentre il giocatore sta posizionando/trascinando un pezzo
        if (typeof dragState !== 'undefined' && dragState !== null) {
            checkGameOver();
            return;
        }

        if (window.isRevivingGameplay || activePieces.length === 0 || gameOver) return;

        let canPlay = false;
        for (const piece of activePieces) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (canPlace(piece.shape.matrix, r, c)) {
                        canPlay = true;
                        break;
                    }
                }
                if (canPlay) break;
            }
            if (canPlay) break;
        }

        if (!canPlay && !gameOver) {
            const pg = typeof SKILLS_CONFIG !== 'undefined' ? SKILLS_CONFIG.persistent_green : null;
            if (pg && pg.unlocked && pg.active && !pg.consumed) {
                triggerPersistentGreenSaver();
                return;
            }
            gameOver = true;
            triggerGameOver();
        } else if (canPlay && !gameOver && !window.isRevivingGameplay) {
            if (typeof window.saveGameSnapshot === 'function') {
                window.saveGameSnapshot();
            }
        }
    }, 700); // 0.7 secondi di attesa
}

let continueTimerInterval = null;
let isContinueReviving = false;
let continueDescTypewriterTimeout = null;
let continueDescTypewriterToken = 0;

function animateContinueDescTypewriter() {
    const descEl = document.querySelector('.continue-desc');
    if (!descEl) return;

    if (continueDescTypewriterTimeout) {
        clearTimeout(continueDescTypewriterTimeout);
        continueDescTypewriterTimeout = null;
    }

    const thisToken = ++continueDescTypewriterToken;
    const fullText = (descEl.dataset.originalText || descEl.textContent || 'Use 20 tickets or watch an ad to continue?').trim();
    descEl.dataset.originalText = fullText;

    const words = fullText.split(' ');
    descEl.innerHTML = '';
    const allCharSpans = [];

    words.forEach((word, wIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'typewriter-word';

        for (const char of word) {
            const charSpan = document.createElement('span');
            charSpan.className = 'typewriter-char';
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
            allCharSpans.push(charSpan);
        }

        descEl.appendChild(wordSpan);

        if (wIdx < words.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.className = 'typewriter-space';
            spaceSpan.innerHTML = '&nbsp;';
            descEl.appendChild(spaceSpan);
        }
    });

    let index = 0;
    function typeNext() {
        if (thisToken !== continueDescTypewriterToken) return;

        if (index < allCharSpans.length) {
            const span = allCharSpans[index];
            span.classList.add('typed-in');

            if (typeof window.playTypewriterTick === 'function') {
                window.playTypewriterTick();
            } else if (typeof audio !== 'undefined' && audio.playTypewriterTick) {
                audio.playTypewriterTick();
            }

            index++;
            continueDescTypewriterTimeout = setTimeout(typeNext, 22);
        }
    }

    typeNext();
}

let pendingReviveTimeout = null;
let pendingReviveCallback = null;

function notifyPieceReleasedForRevive() {
    if (typeof pendingReviveCallback === 'function') {
        const cb = pendingReviveCallback;
        pendingReviveCallback = null;
        if (pendingReviveTimeout) {
            clearTimeout(pendingReviveTimeout);
            pendingReviveTimeout = null;
        }
        pendingReviveTimeout = setTimeout(() => {
            pendingReviveTimeout = null;
            cb();
        }, 400);
    }
}

window.addEventListener('pointerup', () => {
    setTimeout(() => {
        if (!dragState && pendingReviveCallback) {
            notifyPieceReleasedForRevive();
        }
    }, 10);
});
window.addEventListener('pointercancel', () => {
    setTimeout(() => {
        if (!dragState && pendingReviveCallback) {
            notifyPieceReleasedForRevive();
        }
    }, 10);
});

function showContinueReviveScreen(onGameOver, disableCountdown = false) {
    if (pendingReviveTimeout) {
        clearTimeout(pendingReviveTimeout);
        pendingReviveTimeout = null;
    }

    const doLaunchRevive = () => {
        // Se durante l'attesa il player ha selezionato un pezzo dal tray, aspetta il rilascio
        if (typeof dragState !== 'undefined' && dragState !== null) {
            pendingReviveCallback = () => {
                _showContinueReviveScreenInternal(onGameOver, disableCountdown);
            };
            return;
        }
        _showContinueReviveScreenInternal(onGameOver, disableCountdown);
    };

    // Se il player ha selezionato un pezzo dal tray, revive parte una volta rilasciato (+400ms)
    if (typeof dragState !== 'undefined' && dragState !== null) {
        pendingReviveCallback = () => {
            _showContinueReviveScreenInternal(onGameOver, disableCountdown);
        };
    } else {
        // Aspettare 400ms prima di avviare schermata di revive
        pendingReviveTimeout = setTimeout(doLaunchRevive, 400);
    }
}

function _showContinueReviveScreenInternal(onGameOver, disableCountdown = false) {
    if (pendingReviveTimeout) {
        clearTimeout(pendingReviveTimeout);
        pendingReviveTimeout = null;
    }
    pendingReviveCallback = null;

    const modal = document.getElementById('continue-revive-modal');
    if (!modal) {
        if (typeof onGameOver === 'function') onGameOver();
        return;
    }

    if (continueTimerInterval) {
        clearInterval(continueTimerInterval);
        continueTimerInterval = null;
    }

    isContinueReviving = false;

    const timerCountEl = document.getElementById('continue-timer-count');
    const timerCircleEl = document.getElementById('continue-timer-circle');
    const timerContainerEl = modal.querySelector('.continue-timer-container');
    const ticketBalanceEl = document.getElementById('continue-ticket-balance');
    const alertMsgEl = document.getElementById('continue-msg-alert');
    const btnTicket = document.getElementById('btn-continue-ticket');
    const btnAd = document.getElementById('btn-continue-ad');
    const btnGameOver = document.getElementById('btn-continue-gameover');

    if (btnTicket) btnTicket.style.pointerEvents = 'auto';
    if (btnAd) btnAd.style.pointerEvents = 'auto';
    if (btnGameOver) btnGameOver.style.pointerEvents = 'auto';

    if (alertMsgEl) {
        alertMsgEl.classList.add('hidden');
        alertMsgEl.className = 'continue-msg-alert hidden';
        alertMsgEl.textContent = '';
    }

    // Aggiorna saldo ticket visualizzato
    const currentTickets = (typeof window.getTicketCount === 'function') ? window.getTicketCount() : 0;
    if (ticketBalanceEl) {
        ticketBalanceEl.textContent = currentTickets;
    }

    // Nascondi il countdown se disableCountdown è true
    if (timerContainerEl) {
        timerContainerEl.style.display = disableCountdown ? 'none' : 'flex';
    }

    modal.style.display = '';
    modal.classList.remove('hidden');
    animateContinueDescTypewriter();

    let timeLeft = 5;
    const totalDuration = 5;
    const circumference = 263.89; // 2 * PI * 42

    const updateTimerUI = () => {
        if (timerCountEl) {
            timerCountEl.textContent = Math.max(0, timeLeft);
            timerCountEl.classList.remove('tick-pop');
            void timerCountEl.offsetWidth;
            timerCountEl.classList.add('tick-pop');
        }
        if (timerCircleEl) {
            const fraction = Math.max(0, timeLeft) / totalDuration;
            const offset = circumference * (1 - fraction);
            timerCircleEl.style.strokeDashoffset = offset;
            if (timeLeft <= 2) {
                timerCircleEl.style.stroke = '#ef4444';
            } else {
                timerCircleEl.style.stroke = '#ff5252';
            }
        }
    };

    const closeModal = () => {
        if (pendingReviveTimeout) {
            clearTimeout(pendingReviveTimeout);
            pendingReviveTimeout = null;
        }
        pendingReviveCallback = null;
        if (continueTimerInterval) {
            clearInterval(continueTimerInterval);
            continueTimerInterval = null;
        }
        if (continueDescTypewriterTimeout) {
            clearTimeout(continueDescTypewriterTimeout);
            continueDescTypewriterTimeout = null;
        }
        continueDescTypewriterToken++;
        modal.classList.add('hidden');
        if (timerContainerEl) timerContainerEl.style.display = 'flex';
    };

    const proceedToGameOver = () => {
        closeModal();
        if (typeof onGameOver === 'function') {
            onGameOver();
        } else if (typeof playNoSpaceLeftAnimation === 'function') {
            playNoSpaceLeftAnimation(() => {
                if (typeof triggerGameOver === 'function') {
                    triggerGameOver(true);
                }
            });
        }
    };

    const triggerRevive = (type) => {
        closeModal();
        executeGameRevive(type);
    };

    // Countdown di 5 secondi (attivo solo se non disabilitato)
    if (!disableCountdown) {
        updateTimerUI();
        continueTimerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                updateTimerUI();
            } else {
                updateTimerUI();
                clearInterval(continueTimerInterval);
                continueTimerInterval = null;
                proceedToGameOver();
            }
        }, 1000);
    }

    // Event listeners bottoni
    if (btnGameOver) {
        btnGameOver.onclick = (e) => {
            e.preventDefault();
            if (isContinueReviving) return;
            isContinueReviving = true;
            btnGameOver.style.pointerEvents = 'none';
            if (btnTicket) btnTicket.style.pointerEvents = 'none';
            if (btnAd) btnAd.style.pointerEvents = 'none';

            if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
            proceedToGameOver();
        };
    }

    if (btnTicket) {
        btnTicket.onclick = (e) => {
            e.preventDefault();
            if (isContinueReviving) return;

            const tickets = (typeof window.getTicketCount === 'function') ? window.getTicketCount() : 0;
            if (tickets < 4) {
                if (typeof audio !== 'undefined' && audio.playError) {
                    audio.playError();
                } else if (typeof audio !== 'undefined' && audio.playClick) {
                    audio.playClick();
                }
                btnTicket.classList.remove('btn-shake');
                void btnTicket.offsetWidth;
                btnTicket.classList.add('btn-shake');
                if (alertMsgEl) {
                    alertMsgEl.textContent = `TICKET INSUFFICIENTI! Servono 20 ticket (ne hai ${tickets}).`;
                    alertMsgEl.className = 'continue-msg-alert error';
                    alertMsgEl.classList.remove('hidden');
                }
                return;
            }

            isContinueReviving = true;
            btnTicket.style.pointerEvents = 'none';
            if (btnAd) btnAd.style.pointerEvents = 'none';
            if (btnGameOver) btnGameOver.style.pointerEvents = 'none';

            // Scala 20 ticket
            if (typeof window.updateTicketDisplay === 'function') {
                window.updateTicketDisplay(tickets - 4);
            }
            if (typeof audio !== 'undefined' && audio.playSelect) audio.playSelect();
            triggerRevive('ticket');
        };
    }

    if (btnAd) {
        btnAd.onclick = async (e) => {
            e.preventDefault();
            if (isContinueReviving) return;
            isContinueReviving = true;

            // a. Disabilita il pulsante
            btnAd.style.pointerEvents = 'none';
            btnAd.disabled = true;
            if (btnTicket) btnTicket.style.pointerEvents = 'none';
            if (btnGameOver) btnGameOver.style.pointerEvents = 'none';

            // Metti in pausa il countdown durante la visualizzazione dell'annuncio
            if (continueTimerInterval) {
                clearInterval(continueTimerInterval);
                continueTimerInterval = null;
            }

            if (typeof audio !== 'undefined' && audio.playSelect) audio.playSelect();

            try {
                // b. Attende il completamento del Rewarded Video AdMob
                if (typeof window.showRewardedForContinue === 'function') {
                    await window.showRewardedForContinue();
                }

                // c. Se risolta -> esegui la ripresa del gioco
                triggerRevive('ad');
            } catch (adErr) {
                // d. Se rifiutata -> mostra messaggio e torna allo stato precedente
                console.warn('[Rewarded] Video non completato o errore:', adErr);
                const errorMsg = 'Video non completato, ricompensa non assegnata';
                if (alertMsgEl) {
                    alertMsgEl.textContent = errorMsg;
                    alertMsgEl.className = 'continue-msg-alert error';
                    alertMsgEl.classList.remove('hidden');
                } else {
                    alert(errorMsg);
                }

                // Ripristina il timer di countdown se il modal è ancora visibile
                if (!disableCountdown && !modal.classList.contains('hidden') && !continueTimerInterval) {
                    updateTimerUI();
                    continueTimerInterval = setInterval(() => {
                        timeLeft--;
                        if (timeLeft > 0) {
                            updateTimerUI();
                        } else {
                            updateTimerUI();
                            clearInterval(continueTimerInterval);
                            continueTimerInterval = null;
                            proceedToGameOver();
                        }
                    }, 1000);
                }
            } finally {
                // Riabilita il pulsante in ogni caso
                isContinueReviving = false;
                btnAd.disabled = false;
                btnAd.style.pointerEvents = 'auto';
                if (btnTicket) btnTicket.style.pointerEvents = 'auto';
                if (btnGameOver) btnGameOver.style.pointerEvents = 'auto';
            }
        };
    }
}

function executeGameRevive(source = 'ticket') {
    gameOver = false;
    window.isRevivingGameplay = true;

    // Suono di rinascita ed energia di ritorno in partita
    if (window.RetroAudio && typeof window.RetroAudio.playRevive === 'function') {
        window.RetroAudio.playRevive();
    } else if (typeof audio !== 'undefined' && audio.playRevive) {
        audio.playRevive();
    }

    if (gameOverCheckTimeout) {
        clearTimeout(gameOverCheckTimeout);
        gameOverCheckTimeout = null;
    }

    // 1. Ripristina il rendering del board reale (rimuove la cascata arcobaleno dalle celle vuote)
    if (typeof renderBoard === 'function') {
        renderBoard();
    }

    // 2. Trova e rimuovi le 3 righe con più blocchi per fare spazio al giocatore
    const rowCounts = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        let count = 0;
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (boardState[r] && boardState[r][c]) count++;
        }
        rowCounts.push({ row: r, count });
    }
    rowCounts.sort((a, b) => b.count - a.count);
    const rowsToClear = rowCounts.filter(rc => rc.count > 0).slice(0, 3).map(rc => rc.row);
    if (rowsToClear.length === 0) {
        rowsToClear.push(3, 4);
    }

    // Passiamo suppressPopup = true per non mostrare il pop-up duplicato "MASS CLEAR" sopra quello di revive!
    if (typeof clearSelectedLinesSimultaneously === 'function') {
        clearSelectedLinesSimultaneously(rowsToClear, true);
    }

    // 3. Pulisci il tray e spawna 3 nuovi pezzi
    const remainingPieces = document.querySelectorAll('.tray-slot .piece');
    remainingPieces.forEach(p => p.remove());
    activePieces = [];

    setTimeout(() => {
        if (typeof spawnPieces === 'function') {
            spawnPieces(true);
        }
        if (typeof window.setTrayDisabled === 'function') {
            window.setTrayDisabled(false);
        }
        setTimeout(() => {
            window.isRevivingGameplay = false;
            const btnSettings = document.getElementById('btnSettings');
            if (btnSettings) {
                btnSettings.style.pointerEvents = '';
                btnSettings.style.opacity = '';
            }
            if (typeof window.saveGameSnapshot === 'function') {
                window.saveGameSnapshot();
            }
        }, 800);
    }, 280);

    // 4. Feedback visivo singolo e chiaro
    const reviveMsg = 'BACK IN ACTION!';
    if (typeof triggerPopupTextVFX === 'function') {
        triggerPopupTextVFX(0, 0, { percentX: 50, percentY: 42 }, 0, reviveMsg);
    }

    if ((window.currentSelectedGameMode === 'time' || window.currentSelectedGameMode === 'wild') && typeof startTimeModeTimer === 'function') {
        timeModeSeconds = Math.max(timeModeSeconds, 60);
        updateTimerDisplay();
        startTimeModeTimer();
    }
}

window.showContinueReviveScreen = showContinueReviveScreen;
window.executeGameRevive = executeGameRevive;

function hideVictoryRewardToast() {
    window.isVictoryRewardToastActive = false;
    if (window._victoryToastShowTimer) {
        clearTimeout(window._victoryToastShowTimer);
        window._victoryToastShowTimer = null;
    }
    if (window._victoryToastHideTimer) {
        clearTimeout(window._victoryToastHideTimer);
        window._victoryToastHideTimer = null;
    }
    if (window._victoryToastAnimTimer) {
        clearTimeout(window._victoryToastAnimTimer);
        window._victoryToastAnimTimer = null;
    }
    const victoryToast = document.getElementById('victory-reward-toast');
    if (victoryToast) {
        victoryToast.classList.add('hidden');
        victoryToast.classList.remove('toast-enter', 'toast-exit');
    }
}

function showVictoryRewardToast(levelTitle = 'LVL 3K REACHED!', ticketAmount = 5, duration = 1800) {
    if (typeof clearSkillActivationPopups === 'function') {
        clearSkillActivationPopups();
    }
    window.isVictoryRewardToastActive = true;
    hideVictoryRewardToast();
    window.isVictoryRewardToastActive = true;
    const victoryToast = document.getElementById('victory-reward-toast');
    const victoryLevelText = document.getElementById('victory-reward-level-text');
    const victoryTicketsText = document.querySelector('.victory-reward-tickets-text');

    if (victoryLevelText) {
        victoryLevelText.textContent = levelTitle;
    }
    if (victoryTicketsText) {
        victoryTicketsText.textContent = `${ticketAmount}`;
    }

    if (window.RetroAudio && typeof window.RetroAudio.playCoin === 'function') {
        window.RetroAudio.playCoin();
    } else if (typeof audio !== 'undefined' && audio.playCoin) {
        audio.playCoin();
    }

    if (victoryToast) {
        victoryToast.classList.remove('hidden');
        victoryToast.classList.remove('toast-exit');
        void victoryToast.offsetWidth;
        victoryToast.classList.add('toast-enter');

        window._victoryToastHideTimer = setTimeout(() => {
            victoryToast.classList.remove('toast-enter');
            victoryToast.classList.add('toast-exit');
            window._victoryToastAnimTimer = setTimeout(() => {
                victoryToast.classList.add('hidden');
                victoryToast.classList.remove('toast-exit');
                window.isVictoryRewardToastActive = false;
            }, 220);
        }, duration);
    } else {
        window.isVictoryRewardToastActive = false;
    }
}
window.showVictoryRewardToast = showVictoryRewardToast;
window.hideVictoryRewardToast = hideVictoryRewardToast;
// =========================================================================
// TIME MODE / TIME ATTACK SYSTEM
// =========================================================================
let timeModeSeconds = 120;
let timeModeInterval = null;

function formatTimeMMSS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('gameTimerDisplay');
    if (!timerDisplay) return;

    timerDisplay.textContent = formatTimeMMSS(timeModeSeconds);

    timerDisplay.classList.remove('timer-warning', 'timer-danger');
    if (timeModeSeconds <= 10) {
        timerDisplay.classList.add('timer-danger');
    } else if (timeModeSeconds <= 30) {
        timerDisplay.classList.add('timer-warning');
    }
}

function startTimeModeTimer() {
    stopTimeModeTimer();
    updateTimerDisplay();

    timeModeInterval = setInterval(() => {
        if (gameOver) return;
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen && !homeScreen.classList.contains('hidden')) return;
        if (window.isRevivingGameplay) return;
        const contModal = document.getElementById('continue-revive-modal');
        if (contModal && !contModal.classList.contains('hidden')) return;
        const gameModal = document.getElementById('gameModal');
        if (gameModal && !gameModal.classList.contains('hidden')) return;
        const shopOverlay = document.querySelector('.shop-render-overlay');
        if (shopOverlay && !shopOverlay.classList.contains('hidden')) return;

        if (timeModeSeconds > 0) {
            timeModeSeconds--;
            updateTimerDisplay();

            if (timeModeSeconds <= 10 && timeModeSeconds > 0 && window.RetroAudio) {
                window.RetroAudio.playTimerWarning();
            }

            if (timeModeSeconds <= 0) {
                timeModeSeconds = 0;
                updateTimerDisplay();
                stopTimeModeTimer();

                gameOver = true;
                if (typeof triggerPopupTextVFX === 'function') {
                    triggerPopupTextVFX(0, 0, { percentX: 50, percentY: 42 }, 0, "TIME'S UP!");
                }
                setTimeout(() => {
                    triggerGameOver();
                }, 600);
            }
        }
    }, 1000);
}

function stopTimeModeTimer() {
    if (timeModeInterval) {
        clearInterval(timeModeInterval);
        timeModeInterval = null;
    }
}

function resetTimeModeTimer() {
    stopTimeModeTimer();
    timeModeSeconds = 120;
    updateTimerDisplay();
}

function addTimerSeconds(seconds) {
    if (window.currentSelectedGameMode !== 'time' && window.currentSelectedGameMode !== 'wild') return;
    if (gameOver) return;

    timeModeSeconds += seconds;
    updateTimerDisplay();

    // Effetto elastico solo sui secondi rimanenti (e non sulla label "TIMER:")
    const timerDisplayWrapper = document.querySelector('.timer-display-wrapper') || document.getElementById('gameTimerDisplay');
    if (timerDisplayWrapper) {
        timerDisplayWrapper.classList.remove('elastic-pop');
        void timerDisplayWrapper.offsetWidth;
        timerDisplayWrapper.classList.add('elastic-pop');
    }

    // Pop-up float dei secondi aggiunti
    const pop = document.getElementById('timerPlusSeconds');
    if (pop) {
        pop.textContent = `+${seconds}`;
        pop.classList.remove('show');
        void pop.offsetWidth;
        pop.classList.add('show');
    }
}

function checkAndUpdateTimeModeVisibility(preserveTimer = false) {
    const timerBox = document.getElementById('topBarTimerBox');
    if (!timerBox) return;

    const isTimeMode = window.currentSelectedGameMode === 'time' || window.currentSelectedGameMode === 'wild';
    if (isTimeMode) {
        timerBox.classList.remove('hidden');
        if (!preserveTimer) {
            resetTimeModeTimer();
        } else {
            updateTimerDisplay();
        }
        startTimeModeTimer();
    } else {
        timerBox.classList.add('hidden');
        stopTimeModeTimer();
    }
}

window.startTimeModeTimer = startTimeModeTimer;
window.stopTimeModeTimer = stopTimeModeTimer;
window.resetTimeModeTimer = resetTimeModeTimer;
window.addTimerSeconds = addTimerSeconds;
window.checkAndUpdateTimeModeVisibility = checkAndUpdateTimeModeVisibility;
window.getTimeModeSeconds = () => timeModeSeconds;
window.setTimeModeSeconds = (s) => {
    timeModeSeconds = s;
    updateTimerDisplay();
};

function playPieceLiftSFX() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!window._sfxAudioCtx) {
            window._sfxAudioCtx = new AudioCtx();
        }
        const ctx = window._sfxAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 1.15);

        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(65, now);
        subOsc.frequency.linearRampToValueAtTime(95, now + 1.15);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + 1.15);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.3);
        gain.gain.linearRampToValueAtTime(0.2, now + 1.1);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.2);

        subGain.gain.setValueAtTime(0.01, now);
        subGain.gain.linearRampToValueAtTime(0.16, now + 0.4);
        subGain.gain.linearRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        subOsc.connect(subGain);
        subGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
        subOsc.start(now);
        subOsc.stop(now + 1.2);
    } catch (e) { }
}

function playPieceShatterSFX() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!window._sfxAudioCtx) {
            window._sfxAudioCtx = new AudioCtx();
        }
        const ctx = window._sfxAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        const bufferSize = Math.floor(ctx.sampleRate * 0.4);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(650, now);
        noiseFilter.Q.setValueAtTime(1.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(170, now);
        bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        bassGain.gain.setValueAtTime(0.38, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.3);

        [1500, 1950, 2450].forEach((freq, idx) => {
            const chimeOsc = ctx.createOscillator();
            const chimeGain = ctx.createGain();
            chimeOsc.type = 'sine';
            chimeOsc.frequency.setValueAtTime(freq, now + idx * 0.035);
            chimeOsc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + idx * 0.035 + 0.22);
            chimeGain.gain.setValueAtTime(0.1, now + idx * 0.035);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.22);
            chimeOsc.connect(chimeGain);
            chimeGain.connect(ctx.destination);
            chimeOsc.start(now + idx * 0.035);
            chimeOsc.stop(now + idx * 0.035 + 0.22);
        });
    } catch (e) { }
}

function playNoSpaceLeftAnimation(onComplete) {
    const overlay = document.getElementById('no-space-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        overlay.innerHTML = '';
    }

    const tray = document.getElementById('tray');
    if (tray) {
        tray.style.pointerEvents = 'none';
    }
    if (typeof isTrayDisabled !== 'undefined') {
        isTrayDisabled = true;
    }

    const remainingPieces = Array.from(document.querySelectorAll('.tray-slot .piece'));
    const boardEl = document.getElementById('board');

    // Scegli un colore casuale per questa volta per riempire gli spazi vuoti
    const availableColors = (typeof COLORS !== 'undefined' && Array.isArray(COLORS) && COLORS.length > 0)
        ? COLORS
        : Object.values(GEM_COLORS || {});
    const cascadeColor = availableColors[Math.floor(Math.random() * availableColors.length)] || GEM_COLORS.cyan;

    // Riempie gli spazi vuoti della griglia da sopra a sotto (riga per riga)
    if (boardEl && typeof BOARD_SIZE !== 'undefined') {
        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowDelay = r * 85;
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cellIndex = r * BOARD_SIZE + c;
                const isCellEmpty = (typeof boardState !== 'undefined' && Array.isArray(boardState) && boardState[r])
                    ? (!boardState[r][c])
                    : true;

                if (isCellEmpty) {
                    setTimeout(() => {
                        const cell = boardEl.children[cellIndex];
                        if (cell) {
                            if (typeof updateCellGem === 'function') {
                                updateCellGem(cell, cascadeColor, 1);
                            } else if (typeof createGemBlockHTML === 'function') {
                                cell.innerHTML = createGemBlockHTML(cascadeColor);
                            }
                            const gem = cell.querySelector('.block-cell');
                            if (gem) {
                                gem.classList.remove('game-over-cell-fill');
                                void gem.offsetWidth;
                                gem.classList.add('game-over-cell-fill');
                            }
                        }
                    }, rowDelay + c * 8);
                }
            }
        }
    }

    // Se non ci sono pezzi nel tray, aspetta 3 secondi e procedi
    if (remainingPieces.length === 0) {
        setTimeout(() => {
            if (tray) tray.style.pointerEvents = '';
            if (typeof onComplete === 'function') onComplete();
        }, 3000);
        return;
    }

    // Fase 1: Sollevamento senza effetto glow (0ms - 1200ms)
    playPieceLiftSFX();

    remainingPieces.forEach(piece => {
        piece.classList.add('game-over-lift');
    });

    let animFrameId = null;
    let canvasEl = null;

    // Fase 2: Frantumazione senza glow / shockwave (a 1200ms)
    const shatterTimeout = setTimeout(() => {
        playPieceShatterSFX();

        if (tray) {
            tray.classList.add('tray-shatter-shake');
            setTimeout(() => tray.classList.remove('tray-shatter-shake'), 320);
        }
        if (boardEl) {
            boardEl.classList.add('tray-shatter-shake');
            setTimeout(() => boardEl.classList.remove('tray-shatter-shake'), 320);
        }

        canvasEl = document.createElement('canvas');
        canvasEl.id = 'tray-destruct-canvas';
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvasEl.width = Math.floor(w * dpr);
        canvasEl.height = Math.floor(h * dpr);
        canvasEl.style.width = `${w}px`;
        canvasEl.style.height = `${h}px`;
        document.body.appendChild(canvasEl);

        const ctx = canvasEl.getContext('2d');
        ctx.scale(dpr, dpr);

        const shards = [];

        remainingPieces.forEach(piece => {
            const blocks = piece.querySelectorAll('.piece-block');
            blocks.forEach(block => {
                const cell = block.querySelector('.block-cell');
                if (!cell) return;

                const rect = block.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;

                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;

                const cCenter = cell.style.getPropertyValue('--c-center') || 'rgb(239, 68, 68)';
                const cTop = cell.style.getPropertyValue('--c-top') || cCenter;
                const cLeft = cell.style.getPropertyValue('--c-left') || cCenter;
                const cRight = cell.style.getPropertyValue('--c-right') || cCenter;
                const cBottom = cell.style.getPropertyValue('--c-bottom') || cCenter;
                const colorPalette = [cCenter, cTop, cLeft, cRight, cBottom];

                // Frammenti puri di blocco gemma senza glow
                const numShards = 14;
                for (let i = 0; i < numShards; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2.2 + Math.random() * 6.0;
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed - (2.2 + Math.random() * 4.2);
                    const shardColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                    const sSize = 4 + Math.random() * 6.0;

                    shards.push({
                        x: cx + (Math.random() - 0.5) * rect.width * 0.7,
                        y: cy + (Math.random() - 0.5) * rect.height * 0.7,
                        w: sSize,
                        h: sSize * (0.75 + Math.random() * 0.5),
                        color: shardColor,
                        vx: vx,
                        vy: vy,
                        gravity: 0.32 + Math.random() * 0.1,
                        drag: 0.978,
                        rot: Math.random() * Math.PI * 2,
                        vRot: (Math.random() - 0.5) * 0.28,
                        alpha: 1.0,
                        decay: 0.012 + Math.random() * 0.008
                    });
                }
            });

            piece.style.opacity = '0';
            piece.style.visibility = 'hidden';
            piece.style.pointerEvents = 'none';
        });

        let lastTime = performance.now();
        const renderParticles = (currentTime) => {
            const dt = Math.min((currentTime - lastTime) / 16.67, 2.2);
            lastTime = currentTime;

            ctx.clearRect(0, 0, w, h);

            for (let i = shards.length - 1; i >= 0; i--) {
                const s = shards[i];
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vy += s.gravity * dt;
                s.vx *= Math.pow(s.drag, dt);
                s.rot += s.vRot * dt;
                s.alpha -= s.decay * dt;

                if (s.alpha <= 0) {
                    shards.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = Math.max(0, s.alpha);
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rot);
                ctx.fillStyle = s.color;
                ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);

                // Pixel bevel highlight pulito (senza bagliori sfumati)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(-s.w / 2, -s.h / 2, s.w, Math.max(1, s.h * 0.25));
                ctx.restore();
            }

            if (shards.length > 0) {
                animFrameId = requestAnimationFrame(renderParticles);
            }
        };

        animFrameId = requestAnimationFrame(renderParticles);
    }, 1200);

    // Fase 3: Transizione a game over a 3000ms (esattamente 3 secondi)
    setTimeout(() => {
        clearTimeout(shatterTimeout);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (canvasEl && canvasEl.parentNode) canvasEl.remove();

        if (boardEl) {
            boardEl.classList.remove('tray-shatter-shake');
        }
        if (tray) {
            tray.style.pointerEvents = '';
            tray.classList.remove('tray-shatter-shake');
        }

        remainingPieces.forEach(p => p.remove());
        if (typeof activePieces !== 'undefined') {
            activePieces = [];
        }

        if (typeof onComplete === 'function') {
            onComplete();
        }
    }, 3000);
}
window.playNoSpaceLeftAnimation = playNoSpaceLeftAnimation;

function playVictoryPointReachedPopup(levelText, onComplete) {
    clearSkillActivationPopups();
    window.isVictoryPointPopupActive = true;

    const overlay = getOrCreateNoSpaceOverlay();
    if (!overlay) {
        window.isVictoryPointPopupActive = false;
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    let reachedLevel = levelText || window.lastVictoryLevelLabel;
    if (!reachedLevel) {
        const activeMode = window.currentSelectedGameMode || 'classic';
        if (activeMode === 'time' || activeMode === 'wild') {
            reachedLevel = 'LVL 10K';
        } else {
            let target = 3000;
            if (typeof window.getClassicTargetScore === 'function') {
                const currentT = window.getClassicTargetScore();
                target = Math.max(3000, currentT - 1500);
            }
            const targetK = (target % 1000 === 0) ? (target / 1000) : (target / 1000).toFixed(1);
            reachedLevel = `LVL ${targetK}K`;
        }
    }

    overlay.innerHTML = `
        <div class="no-space-text no-space-victory-text">
            <div class="no-space-victory-line1">${reachedLevel} POINT REACHED</div>
            <div class="no-space-victory-line2">NICE WORK!</div>
        </div>
    `;

    overlay.classList.add('visible');

    if (window._victoryPointOverlayTimer) {
        clearTimeout(window._victoryPointOverlayTimer);
        window._victoryPointOverlayTimer = null;
    }

    window._victoryPointOverlayTimer = setTimeout(() => {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.innerHTML = '';
            window.isVictoryPointPopupActive = false;
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }, 350);
    }, 1500);
}
window.playVictoryPointReachedPopup = playVictoryPointReachedPopup;

function triggerGameOver(skipNoSpaceAnimation = false) {
    clearSkillActivationPopups();
    if (typeof closeGameModal === 'function') {
        closeGameModal();
    }
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        btnSettings.style.pointerEvents = 'none';
        btnSettings.style.opacity = '0.35';
    }
    if (window.QuestTracker) window.QuestTracker.track('matches', 1);

    const titleImg = document.querySelector('.go-title-img');
    if (titleImg) {
        titleImg.src = 'assets/game-over-title.png';
        titleImg.alt = 'Game Over';
    }

    const keepPlayingRow = document.getElementById('go-keep-playing-row');
    if (keepPlayingRow) keepPlayingRow.classList.add('hidden');

    const showFinalGameOver = () => {
        hideVictoryRewardToast();
        if (typeof stopTimeModeTimer === 'function') {
            stopTimeModeTimer();
        }
        if (typeof window.clearGameSnapshot === 'function') {
            window.clearGameSnapshot(window.currentSelectedGameMode || 'classic');
        }
        const remainingPieces = document.querySelectorAll('.tray-slot .piece');
        remainingPieces.forEach(piece => piece.remove());
        activePieces = [];

        const goScoreText = document.getElementById('go-score-text');
        if (goScoreText) animateNumberValue(goScoreText, 0, score, 800);

        renderGameOverSkills();

        const activeMode = window.currentSelectedGameMode || 'classic';
        const modeKey = `blockBlastHighScore_${activeMode}`;
        const prevModeHigh = parseInt(localStorage.getItem(modeKey) || '0', 10);
        if (score > prevModeHigh) {
            localStorage.setItem(modeKey, score.toString());
        }

        const isNewRecord = achievedNewRecord || (score > sessionStartHighScore);

        if (isNewRecord) {
            const prevHigh = highScore;
            highScore = Math.max(highScore, score);
            localStorage.setItem('blockBlast3DHighScore8x8', highScore);
            if (highScoreElement) animateNumberValue(highScoreElement, prevHigh, highScore, 400);
            if (gameOverScreen) gameOverScreen.classList.add('new-high-score');
            setTimeout(() => {
                if (typeof shootConfetti === 'function') shootConfetti();
                else if (typeof spawnConfetti === 'function') spawnConfetti();
            }, 100);
        } else {
            if (gameOverScreen) gameOverScreen.classList.remove('new-high-score');
        }

        if (gameOverScreen) {
            requestAnimationFrame(() => {
                gameOverScreen.classList.add('visible');
            });

            if (isNewRecord) {
                if (window.RetroAudio) window.RetroAudio.playVictory();
            } else {
                if (window.RetroAudio) window.RetroAudio.playGameOver();
            }
            if (typeof window.initGameOverBalatroShader === 'function') {
                window.initGameOverBalatroShader();
            }
            if (!isNewRecord && typeof startBouncerAnimation === 'function') {
                startBouncerAnimation();
            }

            if (window.currentMatchTicketsEarned > 0) {
                if (typeof window.savePendingMatchTickets === 'function') {
                    window.savePendingMatchTickets();
                }
                const modeLabel = window.currentSelectedGameMode === 'time'
                    ? 'TEMPO RUN!'
                    : (window.currentSelectedGameMode === 'vintage' ? 'VINTAGE RUN!' : 'CLASSIC RUN!');
                setTimeout(() => {
                    showVictoryRewardToast(modeLabel, window.currentMatchTicketsEarned, 2200);
                }, 600);
            }
        }
    };

    if (skipNoSpaceAnimation) {
        const overlay = document.getElementById('no-space-overlay');
        if (overlay) overlay.classList.remove('visible');
        showFinalGameOver();
        return;
    }

    // Si può vedere solo UNA schermata di revive a partita
    if (!window.hasSeenReviveScreenThisMatch) {
        window.hasSeenReviveScreenThisMatch = true;
        showContinueReviveScreen(() => {
            playNoSpaceLeftAnimation(showFinalGameOver);
        });
    } else {
        // Al prossimo: niente schermata di revive! Parte l'animazione di no space left e si va in game over
        playNoSpaceLeftAnimation(showFinalGameOver);
    }
}

function triggerVictoryScreen(levelText, ticketsOverride) {
    clearSkillActivationPopups();
    window.isVictoryPointPopupActive = true;
    if (typeof window.stopTimeModeTimer === 'function') {
        window.stopTimeModeTimer();
    }
    if (typeof window.clearGameSnapshot === 'function') {
        window.clearGameSnapshot(window.currentSelectedGameMode || 'classic');
    }
    if (window.QuestTracker) window.QuestTracker.track('matches', 1);

    const titleImg = document.querySelector('.go-title-img');
    if (titleImg) {
        titleImg.src = 'assets/you-win-title.png';
        titleImg.alt = 'You Win!';
    }

    if (window.RetroAudio && typeof window.RetroAudio.playVictory === 'function') {
        window.RetroAudio.playVictory();
    }

    const keepPlayingRow = document.getElementById('go-keep-playing-row');
    if (keepPlayingRow) keepPlayingRow.classList.add('hidden');

    const goScoreText = document.getElementById('go-score-text');
    if (goScoreText) animateNumberValue(goScoreText, 0, score, 800);

    renderGameOverSkills();

    // Determine level reached
    let reachedLevel = levelText || window.lastVictoryLevelLabel;
    if (!reachedLevel) {
        const activeMode = window.currentSelectedGameMode || 'classic';
        if (activeMode === 'time' || activeMode === 'wild') {
            reachedLevel = 'LVL 10K';
        } else {
            let target = 3000;
            if (typeof window.getClassicTargetScore === 'function') {
                const currentT = window.getClassicTargetScore();
                target = Math.max(3000, currentT - 1500);
            }
            const targetK = (target % 1000 === 0) ? (target / 1000) : (target / 1000).toFixed(1);
            reachedLevel = `LVL ${targetK}K`;
        }
    }

    const activeMode = window.currentSelectedGameMode || 'classic';
    let defaultClassicReward = 5;
    if (typeof window.getClassicVictoryTickets === 'function') {
        let achievedTarget = 3000;
        if (typeof window.getClassicTargetScore === 'function') {
            const currentT = window.getClassicTargetScore();
            achievedTarget = Math.max(3000, currentT - 1500);
        }
        defaultClassicReward = window.getClassicVictoryTickets(achievedTarget);
    }
    const rewardTickets = typeof ticketsOverride === 'number'
        ? ticketsOverride
        : (activeMode === 'time' || activeMode === 'wild' ? 15 : defaultClassicReward);

    window.currentMatchTicketsEarned = (window.currentMatchTicketsEarned || 0) + rewardTickets;
    if (typeof window.savePendingMatchTickets === 'function') {
        window.savePendingMatchTickets();
    }

    // Show Victory Reward Notification Toast: appears 700ms after entering You Win
    hideVictoryRewardToast();
    window._victoryToastShowTimer = setTimeout(() => {
        showVictoryRewardToast(`${reachedLevel} REACHED!`, rewardTickets, 2000);
    }, 700);

    const modeKey = `blockBlastHighScore_${activeMode}`;
    const prevModeHigh = parseInt(localStorage.getItem(modeKey) || '0', 10);
    if (score > prevModeHigh) {
        localStorage.setItem(modeKey, score.toString());
    }

    const isNewRecord = achievedNewRecord || (score > sessionStartHighScore);

    if (isNewRecord) {
        const prevHigh = highScore;
        highScore = Math.max(highScore, score);
        localStorage.setItem('blockBlast3DHighScore8x8', highScore);
        if (highScoreElement) animateNumberValue(highScoreElement, prevHigh, highScore, 400);
    }
    if (gameOverScreen) gameOverScreen.classList.add('new-high-score');

    if (gameOverScreen) {
        gameOverScreen.classList.remove('visible');
        void gameOverScreen.offsetWidth;
        gameOverScreen.classList.add('visible');
        if (typeof window.initGameOverBalatroShader === 'function') {
            window.initGameOverBalatroShader();
        }
        setTimeout(() => {
            if (typeof shootConfetti === 'function') shootConfetti();
            else if (typeof spawnConfetti === 'function') spawnConfetti();
        }, 100);
    }
}
window.triggerVictoryScreen = triggerVictoryScreen;

const keepPlayingBtn = document.getElementById('go-keep-playing-btn');
if (keepPlayingBtn) {
    keepPlayingBtn.addEventListener('click', () => {
        hideVictoryRewardToast();
        clearSkillActivationPopups();
        window.isVictoryPointPopupActive = false;
        if (typeof window.pauseGameOverBalatroShader === 'function') {
            window.pauseGameOverBalatroShader();
        }
        if (gameOverScreen) {
            gameOverScreen.classList.remove('visible');
            gameOverScreen.classList.remove('new-high-score');
        }
        if (typeof window.setClassicKeepPlayingPressed === 'function') {
            window.setClassicKeepPlayingPressed();
        }
        gameOver = false;
        if ((window.currentSelectedGameMode === 'time' || window.currentSelectedGameMode === 'wild') && typeof startTimeModeTimer === 'function') {
            startTimeModeTimer();
        }
    });
}

const THEME_BALATRO_COLORS = {
    'default': { c1: "#5a8bc6", c2: "#336199", c3: "#1e3e67" },
    'pink-white': { c1: "#ff85a2", c2: "#e02874", c3: "#4a0827" },
    'purple-white': { c1: "#C084FC", c2: "#7E22CE", c3: "#2E0A4E" },
    'green-white': { c1: "#34d399", c2: "#059669", c3: "#022c22" },
    'orange-white': { c1: "#fb923c", c2: "#ea580c", c3: "#431407" },
    'gold-white': { c1: "#fde047", c2: "#eab308", c3: "#713f12" }
};

function getThemeBalatroColors() {
    const theme = (typeof window.getEquippedBgTheme === 'function')
        ? window.getEquippedBgTheme()
        : (localStorage.getItem('equippedBgTheme') || 'default');

    if (THEME_BALATRO_COLORS[theme]) {
        return THEME_BALATRO_COLORS[theme];
    }
    if (document.body.classList.contains('theme-pink-white')) {
        return THEME_BALATRO_COLORS['pink-white'];
    }
    if (document.body.classList.contains('theme-purple-white')) {
        return THEME_BALATRO_COLORS['purple-white'];
    }
    if (document.body.classList.contains('theme-green-white')) {
        return THEME_BALATRO_COLORS['green-white'];
    }
    if (document.body.classList.contains('theme-orange-white')) {
        return THEME_BALATRO_COLORS['orange-white'];
    }
    if (document.body.classList.contains('theme-gold-white')) {
        return THEME_BALATRO_COLORS['gold-white'];
    }
    return THEME_BALATRO_COLORS['default'];
}
window.getThemeBalatroColors = getThemeBalatroColors;

window.initGameOverBalatroShader = function () {
    const container = document.getElementById('go-balatro-bg-container');
    if (!container) return;

    const colors = getThemeBalatroColors();

    if (!window.goBalatroShaderInstance && typeof BalatroShader !== 'undefined') {
        try {
            window.goBalatroShaderInstance = new BalatroShader({
                container: "#go-balatro-bg-container",
                colours: colors,
                speed: 0.36,
                contrast: 1.2,
                spinAmount: 0.4,
                pixelSizeFac: 1000,
                spinEase: 0.5,
                offsetX: 0.0,
                offsetY: -0.12
            });
        } catch (e) {
            console.warn("Game Over BalatroShader initialization error:", e);
        }
    } else if (window.goBalatroShaderInstance) {
        window.goBalatroShaderInstance.opts.colours = colors;
        if (typeof window.goBalatroShaderInstance.resume === 'function') {
            window.goBalatroShaderInstance.resume();
        }
        if (typeof window.goBalatroShaderInstance.resize === 'function') {
            window.goBalatroShaderInstance.resize();
        }
    }
};

window.pauseGameOverBalatroShader = function () {
    if (window.goBalatroShaderInstance && typeof window.goBalatroShaderInstance.pause === 'function') {
        window.goBalatroShaderInstance.pause();
    }
};

// Pre-warm Game Over Balatro Shader in background during idle time
function prewarmGameOverShader() {
    if (typeof BalatroShader === 'undefined') return;
    try {
        if (!window.goBalatroShaderInstance && typeof window.initGameOverBalatroShader === 'function') {
            window.initGameOverBalatroShader();
            if (window.goBalatroShaderInstance && typeof window.goBalatroShaderInstance.pause === 'function') {
                window.goBalatroShaderInstance.pause();
            }
        }
    } catch (e) {
        console.warn("Pre-warm Game Over Shader fallback:", e);
    }
}

if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(prewarmGameOverShader);
} else {
    setTimeout(prewarmGameOverShader, 2000);
}

const SKILL_ICON_MAP = {
    curved_banana: 'assets/shop/Banana.png',
    swift_pizza: 'assets/shop/Pizza.png',
    swift_pumpkin: 'assets/shop/Pumpkin.png',
    golden_apple: 'assets/shop/Apple Red.png',
    shining_tomato: 'assets/shop/Tomato.png',
    shielded_corn: 'assets/shop/Corn.png',
    juicy_grapes: 'assets/shop/Grapes Green.png',
    light_strawberry: 'assets/shop/Strawberries.png',
    kaboom_strawberry: 'assets/shop/Strawberries.png',
    tiny_cherry: 'assets/shop/Cherry.png',
    supreme_watermelon: 'assets/shop/Watermelon.png',
    rich_pumpkin: 'assets/shop/Pumpkin.png',
    double_pear: 'assets/shop/Pear.png',
    linear_orange: 'assets/shop/Orange.png',
    sour_lemon: 'assets/shop/Lemon.png',
    single_donut: 'assets/shop/34_donut.png',
    fluffy_bread: 'assets/shop/07_bread.png',
    layered_sandwich: 'assets/shop/92_sandwich.png',
    half_taco: 'assets/shop/99_taco.png',
    desperate_taco: 'assets/shop/99_taco.png',
    wealthy_chocolate: 'assets/shop/26_chocolate.png',
    resonant_friedegg: 'assets/shop/38_friedegg.png',
    resonant_ramen: 'assets/shop/38_friedegg.png',
    sweet_strawberry: 'assets/shop/90_strawberrycake.png',
    wild_blue: 'assets/shop/blue.png',
    reactive_orange: 'assets/shop/orange.png',
    persistent_green: 'assets/shop/green.png',
    amplifying_purple: 'assets/shop/purple.png',
    overgrow_green: 'assets/shop/green1.png',
    sakura_pink: 'assets/shop/Pink.png',
    magic_blue: 'assets/shop/blueShot.png',
    lava_red: 'assets/shop/red.png'
};

function renderGameOverSkills() {
    const listEl = document.getElementById('go-skills-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const activeSkills = [];
    if (typeof SKILLS_CONFIG !== 'undefined') {
        for (const key in SKILLS_CONFIG) {
            const sk = SKILLS_CONFIG[key];
            if (sk && (sk.unlocked || sk.active)) {
                activeSkills.push(sk);
            }
        }
    }

    if (activeSkills.length === 0) {
        const emptyEl = document.createElement('span');
        emptyEl.className = 'go-skills-empty-text';
        emptyEl.textContent = 'NO SKILLS';
        listEl.appendChild(emptyEl);
        return;
    }

    const MAX_DISPLAY_ICONS = 5;
    const skillsToDisplay = activeSkills.slice(0, MAX_DISPLAY_ICONS);
    const remainingCount = activeSkills.length - MAX_DISPLAY_ICONS;

    skillsToDisplay.forEach((sk, idx) => {
        let iconPath = SKILL_ICON_MAP[sk.id];
        if (!iconPath && sk.icon && (sk.icon.includes('/') || sk.icon.endsWith('.png'))) {
            iconPath = sk.icon;
        }
        if (!iconPath && typeof SHOP_SKILLS_DATA !== 'undefined' && Array.isArray(SHOP_SKILLS_DATA)) {
            const shopItem = SHOP_SKILLS_DATA.find(item => item.id === sk.id);
            if (shopItem && shopItem.icon) {
                iconPath = shopItem.icon;
            }
        }

        if (iconPath) {
            const img = document.createElement('img');
            img.src = iconPath;
            img.alt = sk.name || sk.id;
            img.className = 'go-skill-icon-item';
            img.title = sk.name || sk.id;
            img.style.animationDelay = `${idx * 0.22}s`;
            listEl.appendChild(img);
        }
    });

    if (remainingCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'go-skills-more-badge';
        badge.textContent = `+${remainingCount}`;
        badge.title = `${remainingCount} altre abilità attivate`;
        listEl.appendChild(badge);
    }
}

playBtn.addEventListener('click', () => {
    if (window.RetroAudio) window.RetroAudio.playGameStart();
    const doReplay = () => {
        if (typeof window.pauseGameOverBalatroShader === 'function') {
            window.pauseGameOverBalatroShader();
        }
        hideVictoryRewardToast();
        gameOverScreen.classList.remove('visible');
        gameOverScreen.classList.remove('new-high-score');
        const contModal = document.getElementById('continue-revive-modal');
        if (contModal) contModal.classList.add('hidden');
        if (pendingReviveTimeout) {
            clearTimeout(pendingReviveTimeout);
            pendingReviveTimeout = null;
        }
        pendingReviveCallback = null;
        if (continueTimerInterval) {
            clearInterval(continueTimerInterval);
            continueTimerInterval = null;
        }
        if (typeof bouncerAnimId !== 'undefined' && bouncerAnimId) {
            cancelAnimationFrame(bouncerAnimId);
            bouncerAnimId = null;
        }
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (typeof particles !== 'undefined') particles = [];
        if (typeof confettiParticles !== 'undefined') confettiParticles = [];
        if (typeof window.setTrayDisabled === 'function') {
            window.setTrayDisabled(false);
        }
        if (gameOver) {
            if (typeof window.flushPendingMatchTicketsDirectly === 'function') {
                window.flushPendingMatchTicketsDirectly();
            }
            if (typeof window.clearGameSnapshot === 'function') {
                window.clearGameSnapshot(window.currentSelectedGameMode || 'classic');
            }
            initBoard();
            if (window.currentSelectedGameMode === 'time' || window.currentSelectedGameMode === 'wild') {
                resetTimeModeTimer();
                startTimeModeTimer();
            }
        } else {
            checkGameOver();
        }
    };

    const onReplayComplete = () => {
        const isTutorialActive = window.TutorialManager && window.TutorialManager.isActive;
        if (!isTutorialActive && typeof window.triggerBoardInitialPrefillAnimation === 'function') {
            window.triggerBoardInitialPrefillAnimation(() => {
                if (typeof window.scheduleGameStartFreeRoll === 'function') {
                    window.scheduleGameStartFreeRoll();
                }
            });
        } else {
            if (typeof window.setTrayDisabled === 'function') {
                window.setTrayDisabled(false);
            }
            if (typeof window.scheduleGameStartFreeRoll === 'function') {
                window.scheduleGameStartFreeRoll();
            }
        }
    };

    if (typeof window.triggerPixelIrisOutOnly === 'function') {
        window.triggerPixelIrisOutOnly(doReplay, onReplayComplete);
    } else {
        doReplay();
        onReplayComplete();
    }
});

const goHomeBtn = document.getElementById('go-home-btn');
if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
        if (window.RetroAudio) window.RetroAudio.playClick();
        const doGoHome = () => {
            if (window._gameStartFreeRollTimer) {
                clearTimeout(window._gameStartFreeRollTimer);
                window._gameStartFreeRollTimer = null;
            }
            if (typeof window.pauseGameOverBalatroShader === 'function') {
                window.pauseGameOverBalatroShader();
            }
            hideVictoryRewardToast();
            gameOverScreen.classList.remove('visible');
            gameOverScreen.classList.remove('new-high-score');
            const contModal = document.getElementById('continue-revive-modal');
            if (contModal) contModal.classList.add('hidden');
            if (continueTimerInterval) {
                clearInterval(continueTimerInterval);
                continueTimerInterval = null;
            }
            if (typeof bouncerAnimId !== 'undefined' && bouncerAnimId) {
                cancelAnimationFrame(bouncerAnimId);
                bouncerAnimId = null;
            }
            if (typeof ctx !== 'undefined' && ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (typeof particles !== 'undefined') particles = [];
            if (typeof confettiParticles !== 'undefined') confettiParticles = [];

            if (typeof closeShopRender === 'function') closeShopRender();
            if (typeof closeTestSkillsModal === 'function') closeTestSkillsModal();
            const gameModal = document.getElementById('gameModal');
            if (gameModal) gameModal.classList.add('hidden');

            if (typeof stopTimeModeTimer === 'function') {
                stopTimeModeTimer();
            }
            if (typeof window.clearGameSnapshot === 'function') {
                window.clearGameSnapshot(window.currentSelectedGameMode || 'classic');
            }
            initBoard();
            if (typeof window.showHomeScreen === 'function') {
                window.showHomeScreen();
            }
        };

        if (typeof window.triggerPixelIrisTransition === 'function') {
            window.triggerPixelIrisTransition(doGoHome);
        } else {
            doGoHome();
        }
    });
}

window.triggerGameOver = triggerGameOver;

function clearSelectedLinesSimultaneously(selectedRows = [], suppressPopup = false) {
    if (!boardElement || !boardState) return 0;
    const rowsToClear = [...new Set(selectedRows)].filter(r => r >= 0 && r < BOARD_SIZE);
    if (rowsToClear.length === 0) return 0;

    const linesCleared = rowsToClear.length;
    const { canvas: vfxCanvas } = (typeof getVfxContext === 'function') ? getVfxContext() : {};
    const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

    if (typeof triggerJellyWaveLineClear === 'function') {
        triggerJellyWaveLineClear(rowsToClear, [], boardState);
    }

    if (linesCleared > 1) {
        if (typeof triggerRainbowSweep === 'function') {
            triggerRainbowSweep(rowsToClear, [], boardState);
        }
    } else {
        rowsToClear.forEach(r => {
            if (typeof triggerClearVFX === 'function') {
                triggerClearVFX(r, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE);
            }
        });
    }

    rowsToClear.forEach(r => {
        for (let c = 0; c < BOARD_SIZE; c++) {
            boardState[r][c] = null;
        }
    });

    if (typeof updateScore === 'function') updateScore(linesCleared * 10);
    if (typeof linesEliminated !== 'undefined') {
        for (let i = 0; i < linesCleared; i++) {
            linesEliminated++;
            if (linesEliminated % 6 === 0 && typeof grantSkill === 'function') grantSkill();
        }
    }
    if (typeof updateSkillUI === 'function') updateSkillUI();
    if (typeof renderBoard === 'function') renderBoard();

    if (!suppressPopup) {
        if (linesCleared > 1 && typeof triggerPopupTextVFX === 'function') {
            triggerPopupTextVFX(linesCleared, linesCleared, { percentX: 50, percentY: 50 }, linesCleared * 10, 'MASS CLEAR!');
        } else if (typeof triggerPointsPopupVFX === 'function') {
            triggerPointsPopupVFX(linesCleared * 10, 50, 50);
        }
    }

    return linesCleared;
}
window.clearSelectedLinesSimultaneously = clearSelectedLinesSimultaneously;

// Kaboom Strawberry 🍓: Fa esplodere uno slot 4x4 casuale quando si chiude la shop
function triggerKaboomStrawberryExplosion() {
    const strawberrySkill = (typeof SKILLS_CONFIG !== 'undefined') ? SKILLS_CONFIG.light_strawberry : null;
    if (!strawberrySkill) return;
    const explosionsCount = strawberrySkill.pendingExplosions || 0;
    if (explosionsCount <= 0) return;

    // Reset pendingExplosions immediatamente per evitare doppi trigger
    strawberrySkill.pendingExplosions = 0;

    const quads = (typeof QUADRANTS_CONFIG !== 'undefined' && QUADRANTS_CONFIG.length > 0)
        ? QUADRANTS_CONFIG
        : [
            { id: 0, rStart: 0, rEnd: 3, cStart: 0, cEnd: 3, name: 'Top-Left' },
            { id: 1, rStart: 0, rEnd: 3, cStart: 4, cEnd: 7, name: 'Top-Right' },
            { id: 2, rStart: 4, rEnd: 7, cStart: 0, cEnd: 3, name: 'Bottom-Left' },
            { id: 3, rStart: 4, rEnd: 7, cStart: 4, cEnd: 7, name: 'Bottom-Right' },
        ];

    const runExplosion = (explosionIdx) => {
        if (typeof boardState === 'undefined' || !boardState) return;

        // Cerca i quadranti 4x4 che contengono almeno 1 blocco
        const quadsWithBlocks = quads.filter(q => {
            for (let r = q.rStart; r <= q.rEnd; r++) {
                for (let c = q.cStart; c <= q.cEnd; c++) {
                    if (boardState[r] && boardState[r][c] !== null && boardState[r][c] !== undefined && boardState[r][c] !== 0) {
                        return true;
                    }
                }
            }
            return false;
        });

        // Seleziona un quadrante casuale (preferendo quelli con blocchi)
        const candidates = (quadsWithBlocks.length > 0) ? quadsWithBlocks : quads;
        const targetQuad = candidates[Math.floor(Math.random() * candidates.length)];

        // Conta quanti blocchi erano presenti
        let destroyedCount = 0;
        for (let r = targetQuad.rStart; r <= targetQuad.rEnd; r++) {
            for (let c = targetQuad.cStart; c <= targetQuad.cEnd; c++) {
                if (boardState[r] && boardState[r][c] !== null && boardState[r][c] !== undefined && boardState[r][c] !== 0) {
                    destroyedCount++;
                }
            }
        }

        // Effetti visivi ed audio di esplosione
        if (typeof triggerEdgePopVFXForArea === 'function') {
            triggerEdgePopVFXForArea(targetQuad.cStart, targetQuad.cEnd, targetQuad.rStart, targetQuad.rEnd, 'rgb(244, 63, 94)');
            if (typeof startVFXLoop === 'function') startVFXLoop();
        }
        if (typeof triggerJellyWaveLineClear === 'function') {
            triggerJellyWaveLineClear([], [], boardState, null, [targetQuad]);
        }
        if (typeof triggerRainbowSweep === 'function') {
            triggerRainbowSweep([], [], boardState, [targetQuad]);
        }
        if (window.RetroAudio) {
            window.RetroAudio.playExplosion();
        } else if (typeof playPieceShatterSFX === 'function') {
            playPieceShatterSFX();
        }
        if (typeof triggerScreenShake === 'function') {
            triggerScreenShake(3, 2);
        }

        // Svuota le celle del quadrante 4x4
        for (let r = targetQuad.rStart; r <= targetQuad.rEnd; r++) {
            for (let c = targetQuad.cStart; c <= targetQuad.cEnd; c++) {
                if (boardState[r]) {
                    boardState[r][c] = null;
                }
            }
        }
        if (typeof renderBoard === 'function') {
            renderBoard();
        }

        // Bonus punteggio e progresso linee
        const bonusScore = 150 + (destroyedCount * 15);
        if (typeof updateScore === 'function') {
            updateScore(bonusScore);
        }

        if (typeof linesEliminated !== 'undefined') {
            linesEliminated += 2;
            if (linesEliminated % 6 === 0 && typeof grantSkill === 'function') {
                grantSkill();
            }
        }
        if (typeof updateSkillUI === 'function') {
            updateSkillUI();
        }

        // Notifica pop-up dell'esplosione
        const quadName = targetQuad.name || `Slot #${targetQuad.id + 1}`;
        if (typeof triggerSkillActivationPopup === 'function') {
            triggerSkillActivationPopup(
                'Kaboom Strawberry 🍓',
                [`<span class="reward-yellow">BOOM! SLOT ${quadName.toUpperCase()} ESPLOSO! (${destroyedCount} BLOCCHI) 💥</span>`],
                'COMMON'
            );
        }

        // Sinergia Single Bagel 🍩 (60% di possibilità di fare +1 moneta quando si elimina uno slot 4x4)
        const isBagelActive = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.single_donut && SKILLS_CONFIG.single_donut.unlocked && SKILLS_CONFIG.single_donut.active;
        if (isBagelActive) {
            const bagelRoll = Math.random() < 0.60;
            if (bagelRoll) {
                if (typeof addCoins === 'function') {
                    addCoins(1);
                } else if (typeof userCoins !== 'undefined') {
                    userCoins += 1;
                    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
                }
                const plusOneEl = document.getElementById('coinPlusOne');
                if (plusOneEl) {
                    const appleBonus = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.golden_apple && SKILLS_CONFIG.golden_apple.unlocked && SKILLS_CONFIG.golden_apple.active) ? 1.2 : 1;
                    plusOneEl.textContent = `+${appleBonus}`;
                    plusOneEl.classList.remove('show');
                    void plusOneEl.offsetWidth;
                    plusOneEl.classList.add('show');
                }
                setTimeout(() => {
                    if (typeof triggerSkillActivationPopup === 'function') {
                        triggerSkillActivationPopup('Single Bagel 🍩', ['<span class="reward-yellow">4x4 CLEAR! +1 COIN 🪙 (60%)</span>'], 'RARE');
                    }
                }, 350);
            }
        }

        if (typeof checkGameOver === 'function') {
            checkGameOver();
        }
        if (typeof window.saveGameSnapshot === 'function') {
            window.saveGameSnapshot();
        }
    };

    for (let i = 0; i < explosionsCount; i++) {
        setTimeout(() => {
            runExplosion(i);
        }, i * 380);
    }
}
window.triggerKaboomStrawberryExplosion = triggerKaboomStrawberryExplosion;

let confettiParticles = [];
const confettiColors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#ffffff', '#ff9b3d', '#38d977'];

function shootConfetti() {
    confettiParticles = [];
    if (!canvas) return;
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const numberOfConfetti = 150;
    for (let i = 0; i < numberOfConfetti; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 12 + 8;
        confettiParticles.push({
            x: W / 2,
            y: H / 2 - 50,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity - 5,
            size: Math.random() * 8 + 4,
            color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            rotation: Math.random() * 360,
            vRot: Math.random() * 10 - 5,
            gravity: 0.25,
            friction: 0.99
        });
    }
    requestAnimationFrame(animateConfetti);
}

function animateConfetti() {
    if (confettiParticles.length === 0 || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        let p = confettiParticles[i];

        p.vy += p.gravity;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();

        if (p.y > H + 50) {
            confettiParticles.splice(i, 1);
        }
    }

    if (confettiParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
    }
}

function spawnConfetti() { shootConfetti(); }

// --- ANIMAZIONE SFONDO DINAMICO TETRIS 3D (BOUNCER) FOR GAME OVER ---
const bouncerColorKeys = Object.keys(GEM_COLORS).filter(k => !['gold', 'reactive_orange', 'amplifying_purple', 'overgrow_green', 'sakura_pink', 'void_black', 'lava_red', 'wild_blue'].includes(k));
const tetrominoes = [
    [[1, 1, 1, 1]],             // I
    [[1, 0, 0], [1, 1, 1]],     // L
    [[0, 0, 1], [1, 1, 1]],     // J
    [[1, 1], [1, 1]],           // O
    [[0, 1, 1], [1, 1, 0]],     // S
    [[1, 1, 0], [0, 1, 1]],     // Z
    [[0, 1, 0], [1, 1, 1]]      // T
];

let bouncerCurrentMatrix = tetrominoes[0];
let bouncerCurrentColor = GEM_COLORS.cyan;
let bouncerX = 0, bouncerY = 0;
const bouncerSpeed = 2.5;
let bouncerVx = -bouncerSpeed;
let bouncerVy = bouncerSpeed;
let bouncerW = 0, bouncerH = 0;

function changeBouncerShapeAndColor() {
    const bouncer = document.getElementById('bouncer');
    if (!bouncer) return;
    let newMatrix;
    do {
        newMatrix = tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
    } while (newMatrix === bouncerCurrentMatrix);
    bouncerCurrentMatrix = newMatrix;

    let newColorKey;
    do {
        newColorKey = bouncerColorKeys[Math.floor(Math.random() * bouncerColorKeys.length)];
    } while (GEM_COLORS[newColorKey] === bouncerCurrentColor);
    bouncerCurrentColor = GEM_COLORS[newColorKey];

    renderBouncerShape();
}

function renderBouncerShape() {
    const bouncer = document.getElementById('bouncer');
    if (!bouncer) return;
    bouncer.innerHTML = '';
    const blockSize = 36;
    const gapSize = 2;

    bouncer.style.gridTemplateColumns = `repeat(${bouncerCurrentMatrix[0].length}, ${blockSize}px)`;
    bouncer.style.gridTemplateRows = `repeat(${bouncerCurrentMatrix.length}, ${blockSize}px)`;
    bouncer.style.gap = `${gapSize}px`;

    bouncerCurrentMatrix.forEach(row => {
        row.forEach(val => {
            const wrapper = document.createElement('div');
            if (val === 1) {
                wrapper.appendChild(createGemBlock(bouncerCurrentColor));
            }
            bouncer.appendChild(wrapper);
        });
    });

    bouncer.style.transform = 'none';
    bouncerW = bouncer.offsetWidth;
    bouncerH = bouncer.offsetHeight;
}

function initBouncer() {
    renderBouncerShape();
    bouncerX = window.innerWidth - bouncerW - 50;
    bouncerY = 50;
}

function updateBouncer() {
    bouncerX += bouncerVx;
    bouncerY += bouncerVy;

    const cx = bouncerX + bouncerW / 2;
    const cy = bouncerY + bouncerH / 2;
    const halfBound = (bouncerW + bouncerH) * Math.SQRT1_2 / 2;

    let bounced = false;

    if (cx - halfBound < 0) {
        bouncerX = halfBound - bouncerW / 2;
        bouncerVx = Math.abs(bouncerVx);
        bounced = true;
    } else if (cx + halfBound > window.innerWidth) {
        bouncerX = window.innerWidth - halfBound - bouncerW / 2;
        bouncerVx = -Math.abs(bouncerVx);
        bounced = true;
    }

    if (cy - halfBound < 0) {
        bouncerY = halfBound - bouncerH / 2;
        bouncerVy = Math.abs(bouncerVy);
        bounced = true;
    } else if (cy + halfBound > window.innerHeight) {
        bouncerY = window.innerHeight - halfBound - bouncerH / 2;
        bouncerVy = -Math.abs(bouncerVy);
        bounced = true;
    }

    if (bounced) {
        changeBouncerShapeAndColor();
    }
}

function drawBouncer() {
    const bouncer = document.getElementById('bouncer');
    if (bouncer) {
        bouncer.style.transform = `translate3d(${bouncerX}px, ${bouncerY}px, 0) rotate(45deg)`;
    }
}

let bouncerAnimId = null;

function animateBouncer() {
    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen && gameOverScreen.classList.contains('visible') && !gameOverScreen.classList.contains('new-high-score')) {
        updateBouncer();
        drawBouncer();
        bouncerAnimId = requestAnimationFrame(animateBouncer);
    } else {
        bouncerAnimId = null;
    }
}

function startBouncerAnimation() {
    if (!bouncerAnimId) {
        initBouncer();
        bouncerAnimId = requestAnimationFrame(animateBouncer);
    }
}

const btnSettings = document.getElementById('btnSettings');
const btnSkills = document.getElementById('btnSkills');
const btnShop = document.getElementById('btnShop');

const gameModal = document.getElementById('gameModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');

function openGameModal(title, contentHTML) {
    if (!gameModal) return;
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = contentHTML;
    gameModal.classList.remove('hidden');
}

function closeGameModal() {
    if (gameModal) {
        gameModal.classList.add('hidden');
    }
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        if (window.RetroAudio) window.RetroAudio.playClick();
        closeGameModal();
    });
}

if (gameModal) {
    gameModal.addEventListener('click', (e) => {
        if (e.target === gameModal) {
            if (window.RetroAudio) window.RetroAudio.playClick();
            closeGameModal();
        }
    });
}

if (btnSettings) {
    btnSettings.addEventListener('click', () => {
        const isFromGame = !document.getElementById('home-screen') || document.getElementById('home-screen').classList.contains('hidden');
        if (isFromGame) {
            // Impedisci categoricamente di aprire i settings durante il Game Over o durante il Revive
            if (gameOver || window.isRevivingGameplay) return;
            const contModal = document.getElementById('continue-revive-modal');
            if (contModal && !contModal.classList.contains('hidden')) return;
            const gameOverScreen = document.getElementById('game-over-screen');
            if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) return;
        }
        if (window.RetroAudio) window.RetroAudio.playClick();
        const isSfxMuted = (window.RetroAudio && typeof window.RetroAudio.isMuted === 'function')
            ? window.RetroAudio.isMuted()
            : (localStorage.getItem('sfxMuted') === 'true');
        const isCRT = window.isCRTEffectEnabled ? window.isCRTEffectEnabled() : false;

        const sfxText = isSfxMuted ? 'SOUND EFFECT: OFF' : 'SOUND EFFECT: ON';
        const crtText = isCRT ? 'FILTER CRT: ON' : 'FILTER CRT: OFF';

        let buttonsHTML = `
                    <button id="modalToggleSFX" class="settings-pixel-btn">${sfxText}</button>
                    <button id="modalToggleCRT" class="settings-pixel-btn">${crtText}</button>
                `;

        if (isFromGame) {
            buttonsHTML += `
                        <button id="modalRestartGame" class="settings-pixel-btn btn-red">RESTART MATCH</button>
                        <button id="modalEndMatch" class="settings-pixel-btn btn-red">END MATCH</button>
                    `;
        } else {
            buttonsHTML += `
                        <button id="modalExitGame" class="settings-pixel-btn btn-red">EXIT GAME</button>
                    `;
        }

        openGameModal('SETTINGS', buttonsHTML);

        // Sound Effects (SFX) Toggle
        const sfxBtn = document.getElementById('modalToggleSFX');
        if (sfxBtn) {
            sfxBtn.addEventListener('click', () => {
                const wasMuted = (window.RetroAudio && typeof window.RetroAudio.isMuted === 'function')
                    ? window.RetroAudio.isMuted()
                    : (localStorage.getItem('sfxMuted') === 'true');
                const nowMuted = !wasMuted;
                if (window.RetroAudio && typeof window.RetroAudio.setMuted === 'function') {
                    window.RetroAudio.setMuted(nowMuted);
                } else {
                    localStorage.setItem('sfxMuted', nowMuted.toString());
                }
                localStorage.setItem('musicMuted', nowMuted.toString());
                sfxBtn.textContent = nowMuted ? 'SOUND EFFECT: OFF' : 'SOUND EFFECT: ON';
                if (!nowMuted && window.RetroAudio) {
                    window.RetroAudio.playClick();
                }
                // Dispatch global event for audio systems to respond
                window.dispatchEvent(new CustomEvent('sfxMuteChanged', { detail: { muted: nowMuted } }));
                window.dispatchEvent(new CustomEvent('musicMuteChanged', { detail: { muted: nowMuted } }));
            });
        }

        // CRT Toggle
        const toggleBtn = document.getElementById('modalToggleCRT');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (window.RetroAudio) window.RetroAudio.playClick();
                const newState = window.toggleCRTEffect ? window.toggleCRTEffect() : true;
                toggleBtn.textContent = newState ? 'FILTER CRT: ON' : 'FILTER CRT: OFF';
            });
        }

        // Tutorial Button
        const tutBtn = document.getElementById('modalStartTutorial');
        if (tutBtn) {
            tutBtn.addEventListener('click', () => {
                if (typeof closeGameModal === 'function') closeGameModal();
                if (window.TutorialManager && typeof window.TutorialManager.start === 'function') {
                    window.TutorialManager.start();
                }
            });
        }

        // Exit Game (Home Screen)
        const exitBtn = document.getElementById('modalExitGame');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                if (window.RetroAudio) window.RetroAudio.playClick();
                else if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
                closeGameModal();
                try {
                    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && typeof window.Capacitor.Plugins.App.exitApp === 'function') {
                        window.Capacitor.Plugins.App.exitApp();
                    } else if (navigator && navigator.app && typeof navigator.app.exitApp === 'function') {
                        navigator.app.exitApp();
                    } else {
                        window.close();
                    }
                } catch (e) {
                    console.warn('Exit game error:', e);
                    try { window.close(); } catch (err) { }
                }
            });
        }

        // Restart Game
        const restartBtn = document.getElementById('modalRestartGame');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                const doRestart = () => {
                    if (typeof window.flushPendingMatchTicketsDirectly === 'function') {
                        window.flushPendingMatchTicketsDirectly();
                    }
                    if (typeof window.clearGameSnapshot === 'function') {
                        window.clearGameSnapshot(window.currentSelectedGameMode || 'classic');
                    }
                    closeGameModal();
                    initBoard();
                    if (window.currentSelectedGameMode === 'wild' && typeof window.activateEpicSkillsOnly === 'function') {
                        window.activateEpicSkillsOnly();
                    }
                };

                const onRestartComplete = () => {
                    const isTutorialActive = window.TutorialManager && window.TutorialManager.isActive;
                    if (!isTutorialActive && typeof window.triggerBoardInitialPrefillAnimation === 'function') {
                        window.triggerBoardInitialPrefillAnimation(() => {
                            if (typeof window.scheduleGameStartFreeRoll === 'function') {
                                window.scheduleGameStartFreeRoll();
                            }
                        });
                    } else {
                        if (typeof window.setTrayDisabled === 'function') {
                            window.setTrayDisabled(false);
                        }
                        if (typeof window.scheduleGameStartFreeRoll === 'function') {
                            window.scheduleGameStartFreeRoll();
                        }
                    }
                };

                if (typeof window.triggerPixelIrisOutOnly === 'function') {
                    window.triggerPixelIrisOutOnly(doRestart, onRestartComplete);
                } else {
                    doRestart();
                    onRestartComplete();
                }
            });
        }

        // End Match -> Direct Game Over without "no space left"
        const endMatchBtn = document.getElementById('modalEndMatch');
        if (endMatchBtn) {
            endMatchBtn.addEventListener('click', () => {
                closeGameModal();
                if (window._gameStartFreeRollTimer) {
                    clearTimeout(window._gameStartFreeRollTimer);
                    window._gameStartFreeRollTimer = null;
                }
                if (gameOverCheckTimeout) {
                    clearTimeout(gameOverCheckTimeout);
                    gameOverCheckTimeout = null;
                }
                gameOver = true;
                if (typeof window.setTrayDisabled === 'function') {
                    window.setTrayDisabled(true);
                }
                if (typeof window.closeShopRender === 'function') {
                    window.closeShopRender();
                }
                dragState = null;
                isDragFramePending = false;
                triggerGameOver(true);
            });
        }
    });
}

if (btnSkills) {
    btnSkills.addEventListener('click', () => {
        if (window.RetroAudio) window.RetroAudio.playClick();
        if (typeof window.openTestSkillsModal === 'function') {
            window.openTestSkillsModal(true);
        }
    });
}

function getShopPrice(skill) {
    if (!skill) return 0;
    const isMagicBlueActive = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.magic_blue && SKILLS_CONFIG.magic_blue.unlocked && SKILLS_CONFIG.magic_blue.active;
    const basePrice = skill.price || 0;
    return isMagicBlueActive ? Math.max(0, Number((basePrice - 0.5).toFixed(1))) : basePrice;
}

if (btnShop) {
    btnShop.addEventListener('click', () => {
        if (window.currentSelectedGameMode === 'vintage') {
            if (typeof openGameModal === 'function') {
                openGameModal(
                    'SHOP',
                    '<div style="text-align:center; padding: 18px 10px; font-size: 15px; font-weight: bold; color: #ff5555; text-shadow: 1px 1px 0 #000; letter-spacing: 0.5px;">SHOP NOT AVAILABLE IN VINTAGE MODE</div>'
                );
            }
            if (typeof audio !== 'undefined' && audio.playSelect) audio.playSelect();
            return;
        }
        if (typeof window.openShopRender === 'function') {
            window.openShopRender();
        }
    });
}

function hideCapacitorStatusBar() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
        try {
            window.Capacitor.Plugins.StatusBar.hide().catch(() => { });
            window.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { });
        } catch (e) { }
    }
}
hideCapacitorStatusBar();
document.addEventListener('DOMContentLoaded', hideCapacitorStatusBar);
window.addEventListener('load', hideCapacitorStatusBar);

// Disable context menus, text selection, and native element dragging globally (except form inputs)
document.addEventListener('contextmenu', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target.isContentEditable) {
        e.preventDefault();
    }
}, false);

document.addEventListener('selectstart', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target.isContentEditable) {
        e.preventDefault();
    }
}, false);

document.addEventListener('dragstart', (e) => {
    e.preventDefault();
}, false);

initBoard();

// Sub-Tray Expandable Quick Tools Menu & Clear Rows Modal Controller
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sub-tray-toggle-btn');
    const menuContainer = document.getElementById('sub-tray-menu-container');
    const menuContent = document.getElementById('sub-tray-content');

    if (toggleBtn && menuContainer && menuContent) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = menuContent.classList.contains('collapsed');
            if (isCollapsed) {
                menuContent.classList.remove('collapsed');
                menuContainer.classList.add('expanded');
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                menuContent.classList.add('collapsed');
                menuContainer.classList.remove('expanded');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    const btnIncreaseCombo = document.getElementById('btn-increase-combo');
    if (btnIncreaseCombo) {
        btnIncreaseCombo.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof comboLevel === 'undefined' || !comboLevel || comboLevel < 1) {
                comboLevel = 1;
            }
            comboLevel++;
            comboCount = comboLevel;
            comboTolerance = 3;
            if (typeof updateComboToleranceUI === 'function') updateComboToleranceUI();

            if (window.RetroAudio && typeof window.RetroAudio.playCombo === 'function') {
                window.RetroAudio.playCombo(comboLevel);
            }

            if (typeof triggerPopupTextVFX === 'function') {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2 - 40;
                triggerPopupTextVFX(1, comboCount, { x: cx, y: cy }, comboCount * 10);
            }
            if (typeof triggerScreenShake === 'function') {
                triggerScreenShake(1, Math.min(comboCount, 6));
            }
        });
    }

    const btnToggleBanana = document.getElementById('btn-toggle-banana');
    if (btnToggleBanana) {
        btnToggleBanana.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.curved_banana) {
                const b = SKILLS_CONFIG.curved_banana;
                b.unlocked = !b.active;
                b.active = !b.active;
                if (typeof updateSkillUI === 'function') updateSkillUI();
                if (typeof window.updateTraySkillHint === 'function') window.updateTraySkillHint();
                if (typeof triggerSkillActivationPopup === 'function') {
                    triggerSkillActivationPopup(b.active ? 'Curved Banana 🍌 ON' : 'Curved Banana 🍌 OFF', []);
                }
            }
        });
    }

    const btnTogglePizza = document.getElementById('btn-toggle-pizza');
    if (btnTogglePizza) {
        btnTogglePizza.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.swift_pizza) {
                const p = SKILLS_CONFIG.swift_pizza;
                p.unlocked = !p.active;
                p.active = !p.active;
                if (typeof updateSkillUI === 'function') updateSkillUI();
                if (typeof window.updateTraySkillHint === 'function') window.updateTraySkillHint();
                if (typeof triggerSkillActivationPopup === 'function') {
                    triggerSkillActivationPopup(p.active ? 'Swift Pizza 🍕 ON' : 'Swift Pizza 🍕 OFF', []);
                }
            }
        });
    }

    const btnTutorial = document.getElementById('btn-trigger-tutorial');
    if (btnTutorial) {
        btnTutorial.addEventListener('click', () => {
            if (menuContent) menuContent.classList.add('collapsed');
            if (menuContainer) menuContainer.classList.remove('expanded');

            if (window.TutorialManager && typeof window.TutorialManager.start === 'function') {
                window.TutorialManager.start();
            }
        });
    }

    const btnGameOver = document.getElementById('btn-trigger-gameover');
    if (btnGameOver) {
        btnGameOver.addEventListener('click', () => {
            if (menuContent) menuContent.classList.add('collapsed');
            if (menuContainer) menuContainer.classList.remove('expanded');

            if (typeof window.triggerGameOver === 'function') {
                gameOver = true;
                window.triggerGameOver();
            }
        });
    }

    const btnWin = document.getElementById('btn-trigger-win');
    if (btnWin) {
        btnWin.addEventListener('click', () => {
            if (menuContent) menuContent.classList.add('collapsed');
            if (menuContainer) menuContainer.classList.remove('expanded');

            if (typeof window.playVictoryPointReachedPopup === 'function') {
                window.playVictoryPointReachedPopup('LVL 5K', () => {
                    if (typeof window.triggerVictoryScreen === 'function') {
                        gameOver = true;
                        window.triggerVictoryScreen('LVL 5K');
                    }
                });
            } else if (typeof window.triggerVictoryScreen === 'function') {
                gameOver = true;
                window.triggerVictoryScreen();
            }
        });
    }

    const btnRevive = document.getElementById('btn-trigger-revive');
    if (btnRevive) {
        btnRevive.addEventListener('click', () => {
            if (menuContent) menuContent.classList.add('collapsed');
            if (menuContainer) menuContainer.classList.remove('expanded');

            if (typeof window.showContinueReviveScreen === 'function') {
                window.showContinueReviveScreen(() => {
                    if (typeof playNoSpaceLeftAnimation === 'function') {
                        playNoSpaceLeftAnimation(() => {
                            if (typeof window.triggerGameOver === 'function') {
                                window.triggerGameOver(true);
                            }
                        });
                    } else if (typeof window.triggerGameOver === 'function') {
                        window.triggerGameOver(true);
                    }
                }, true); // disableCountdown = true (apre senza count down!)
            }
        });
    }

    // 1. ELIMINA 1 RIGA RANDOM (Normale animazione elimina riga)
    const btnClear1Row = document.getElementById('btn-clear-1-random-row');
    if (btnClear1Row) {
        btnClear1Row.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const filledRows = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (boardState[r].some(val => val !== null && val !== 0)) filledRows.push(r);
            }
            const targetRow = filledRows.length > 0
                ? filledRows[Math.floor(Math.random() * filledRows.length)]
                : Math.floor(Math.random() * BOARD_SIZE);

            const { canvas: vfxCanvas } = getVfxContext();
            const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

            // Trigger VFX FIRST while blocks are still in boardState!
            triggerClearVFX(targetRow, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 1);

            for (let c = 0; c < BOARD_SIZE; c++) boardState[targetRow][c] = null;
            renderBoard();

            updateScore(100);
            triggerScreenShake(1, 1);
        });
    }

    // 2. ELIMINA 2 RIGHE RANDOM (Normale animazione elimina righe)
    const btnClear2Rows = document.getElementById('btn-clear-2-random-rows');
    if (btnClear2Rows) {
        btnClear2Rows.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const filledRows = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (boardState[r].some(val => val !== null && val !== 0)) filledRows.push(r);
            }
            let r1, r2;
            if (filledRows.length >= 2) {
                const idx1 = Math.floor(Math.random() * filledRows.length);
                r1 = filledRows[idx1];
                filledRows.splice(idx1, 1);
                r2 = filledRows[Math.floor(Math.random() * filledRows.length)];
            } else {
                const allRows = [0, 1, 2, 3, 4, 5, 6, 7];
                const idx1 = Math.floor(Math.random() * allRows.length);
                r1 = allRows[idx1];
                allRows.splice(idx1, 1);
                r2 = allRows[Math.floor(Math.random() * allRows.length)];
            }

            const { canvas: vfxCanvas } = getVfxContext();
            const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

            // Trigger VFX FIRST while blocks are still in boardState!
            triggerClearVFX(r1, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 2);
            triggerClearVFX(r2, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 2);

            for (let c = 0; c < BOARD_SIZE; c++) {
                boardState[r1][c] = null;
                boardState[r2][c] = null;
            }
            renderBoard();

            updateScore(250);
            triggerScreenShake(2, 2);
        });
    }

    // 2b. ELIMINA UNO SLOT 4X4 (Simula eliminazione quadrante 4x4 e abilità Single Bagel)
    const btnClear4x4Slot = document.getElementById('btn-clear-4x4-slot');
    if (btnClear4x4Slot) {
        btnClear4x4Slot.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const quads = (typeof QUADRANTS_CONFIG !== 'undefined' && QUADRANTS_CONFIG.length > 0)
                ? QUADRANTS_CONFIG
                : [
                    { id: 0, rStart: 0, rEnd: 3, cStart: 0, cEnd: 3, name: 'Top-Left' },
                    { id: 1, rStart: 0, rEnd: 3, cStart: 4, cEnd: 7, name: 'Top-Right' },
                    { id: 2, rStart: 4, rEnd: 7, cStart: 0, cEnd: 3, name: 'Bottom-Left' },
                    { id: 3, rStart: 4, rEnd: 7, cStart: 4, cEnd: 7, name: 'Bottom-Right' },
                ];
            const targetQuad = quads[Math.floor(Math.random() * quads.length)];

            // Riempi le celle del quadrante con blocchi colorati per mostrare il blocco 4x4 pieno prima del clear
            for (let r = targetQuad.rStart; r <= targetQuad.rEnd; r++) {
                for (let c = targetQuad.cStart; c <= targetQuad.cEnd; c++) {
                    const randomColor = (typeof COLORS !== 'undefined' && COLORS.length > 0)
                        ? COLORS[Math.floor(Math.random() * COLORS.length)]
                        : (typeof GEM_COLORS !== 'undefined' ? GEM_COLORS.cyan : null);
                    boardState[r][c] = randomColor;
                }
            }
            renderBoard();

            setTimeout(() => {
                // Trigger effetti visivi di eliminazione quadrante 4x4
                if (typeof triggerJellyWaveLineClear === 'function') {
                    triggerJellyWaveLineClear([], [], boardState, null, [targetQuad]);
                }
                if (typeof triggerRainbowSweep === 'function') {
                    triggerRainbowSweep([], [], boardState, [targetQuad]);
                }

                for (let r = targetQuad.rStart; r <= targetQuad.rEnd; r++) {
                    for (let c = targetQuad.cStart; c <= targetQuad.cEnd; c++) {
                        boardState[r][c] = null;
                    }
                }
                renderBoard();

                updateScore(200);
                triggerScreenShake(2, 1);
                linesEliminated += 2;
                if (linesEliminated % 6 === 0) grantSkill();
                updateSkillUI();

                // Simula abilità Single Bagel 🍩 (60% di possibilità di fare +1 coin)
                const isBagelActive = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.single_donut && SKILLS_CONFIG.single_donut.unlocked && SKILLS_CONFIG.single_donut.active;
                const rollSuccess = Math.random() < 0.60;

                if (rollSuccess) {
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
                    triggerSkillActivationPopup('Single Bagel 🍩', ['<span class="reward-yellow">4x4 CLEAR! +1 COIN 🪙 (60%)</span>']);
                } else {
                    triggerSkillActivationPopup('Single Bagel 🍩', ['<span class="reward-yellow">4x4 CLEAR! (40% NO COIN)</span>']);
                }
            }, 180);
        });
    }

    // 2c. COMPRA TUTTO SHOP (Simula acquisto di tutte le abilità nello shop)
    const btnBuyAllSkills = document.getElementById('btn-buy-all-skills');
    if (btnBuyAllSkills) {
        btnBuyAllSkills.addEventListener('click', () => {
            if (typeof window.testBuyAllSkills === 'function') {
                window.testBuyAllSkills();
                if (typeof triggerSkillActivationPopup === 'function') {
                    triggerSkillActivationPopup('TUTTO ACQUISTATO ⭐', ['<span class="reward-yellow">TUTTI GLI ITEM SHOP COMPRATI! +50 COIN</span>'], 'EPIC');
                }
            }
        });
    }

    // 3a. RIEMPI GRIGLIA AL 40%
    const btnFill40 = document.getElementById('btn-fill-board-40');
    if (btnFill40) {
        btnFill40.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const totalCells = BOARD_SIZE * BOARD_SIZE;
            const targetFilledCount = Math.floor(totalCells * 0.40); // 25 cell

            const coords = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    coords.push({ r, c });
                }
            }
            for (let i = coords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [coords[i], coords[j]] = [coords[j], coords[i]];
            }

            const newBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
            let placed = 0;

            for (const { r, c } of coords) {
                if (placed >= targetFilledCount) break;

                newBoard[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];

                const rowFull = newBoard[r].every(v => v !== null);
                let colFull = true;
                for (let row = 0; row < BOARD_SIZE; row++) {
                    if (newBoard[row][c] === null) { colFull = false; break; }
                }

                if (rowFull || colFull) {
                    newBoard[r][c] = null;
                } else {
                    placed++;
                }
            }

            boardState = newBoard;
            renderBoard();
            triggerScreenShake(1, 1);
        });
    }

    // 3b. RIEMPI GRIGLIA AL 60%
    const btnFill60 = document.getElementById('btn-fill-board-60');
    if (btnFill60) {
        btnFill60.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const totalCells = BOARD_SIZE * BOARD_SIZE;
            const targetFilledCount = Math.floor(totalCells * 0.60);

            const coords = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    coords.push({ r, c });
                }
            }
            for (let i = coords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [coords[i], coords[j]] = [coords[j], coords[i]];
            }

            const newBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
            let placed = 0;

            for (const { r, c } of coords) {
                if (placed >= targetFilledCount) break;

                newBoard[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];

                const rowFull = newBoard[r].every(v => v !== null);
                let colFull = true;
                for (let row = 0; row < BOARD_SIZE; row++) {
                    if (newBoard[row][c] === null) { colFull = false; break; }
                }

                if (rowFull || colFull) {
                    newBoard[r][c] = null;
                } else {
                    placed++;
                }
            }

            boardState = newBoard;
            renderBoard();
            triggerScreenShake(1, 1);
        });
    }

    // 3b. RIEMPI GRIGLIA AL 80%
    const btnFill80 = document.getElementById('btn-fill-board-80');
    if (btnFill80) {
        btnFill80.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const totalCells = BOARD_SIZE * BOARD_SIZE;
            const targetFilledCount = Math.floor(totalCells * 0.80); // 51 cell

            const coords = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    coords.push({ r, c });
                }
            }
            for (let i = coords.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [coords[i], coords[j]] = [coords[j], coords[i]];
            }

            const newBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
            let placed = 0;

            for (const { r, c } of coords) {
                if (placed >= targetFilledCount) break;

                newBoard[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];

                const rowFull = newBoard[r].every(v => v !== null);
                let colFull = true;
                for (let row = 0; row < BOARD_SIZE; row++) {
                    if (newBoard[row][c] === null) { colFull = false; break; }
                }

                if (rowFull || colFull) {
                    newBoard[r][c] = null;
                } else {
                    placed++;
                }
            }

            boardState = newBoard;
            renderBoard();
            triggerScreenShake(1, 1);
        });
    }

    // 4. AVVIA ABILITÀ EFFETTO MAGIC BLUE SU UNA RIGA CASUALE
    const btnMagicBlueRow = document.getElementById('btn-trigger-magic-blue-row');
    if (btnMagicBlueRow) {
        btnMagicBlueRow.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;
            const targetRow = Math.floor(Math.random() * BOARD_SIZE);
            const blueColorObj = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.wild_blue)
                ? GEM_COLORS.wild_blue
                : { isWildBlue: true, center: 'rgb(59, 130, 246)' };

            triggerSkillActivationPopup('Wild Blue 🫐', ['<span class="reward-yellow">MAGIC BLUE RIGA! 🫐</span>']);

            for (let c = 0; c < BOARD_SIZE; c++) {
                boardState[targetRow][c] = blueColorObj;
            }
            renderBoard();

            setTimeout(() => {
                const { canvas: vfxCanvas } = getVfxContext();
                const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

                // Trigger VFX FIRST while blue blocks are still in boardState!
                triggerClearVFX(targetRow, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 1);

                for (let c = 0; c < BOARD_SIZE; c++) boardState[targetRow][c] = null;
                renderBoard();

                updateScore(150);
                triggerScreenShake(1, 1);
            }, 280);
        });
    }

    // 5. ATTIVARE EFFETTO SAKURA PINK (<50% -> 3 col, >=50% -> 2 col)
    const btnSakuraPink = document.getElementById('btn-trigger-sakura-pink');
    if (btnSakuraPink) {
        btnSakuraPink.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            let filledCount = 0;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (boardState[r][c] !== null && boardState[r][c] !== 0) filledCount++;
                }
            }
            const fillRatio = filledCount / (BOARD_SIZE * BOARD_SIZE);
            const colsCount = fillRatio < 0.50 ? 3 : 2;
            const popupMsg = colsCount === 3 ? 'TRIPLA VORAGINE! (3 col) 🌸' : 'DOPPIA VORAGINE! (2 col) 🌸';

            triggerSkillActivationPopup('Sakura Pink 🌸', [`<span class="reward-yellow">${popupMsg}</span>`]);

            const availableCols = [0, 1, 2, 3, 4, 5, 6, 7];
            for (let i = availableCols.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableCols[i], availableCols[j]] = [availableCols[j], availableCols[i]];
            }
            const sakuraCols = availableCols.slice(0, colsCount);

            sakuraCols.forEach((colIndex, idx) => {
                setTimeout(() => {
                    const { canvas: vfxCanvas } = getVfxContext();
                    const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

                    triggerEdgePopVFXForCols([colIndex], 'sakura_pink');
                    // Trigger VFX FIRST while blocks are still in boardState!
                    triggerClearVFX(colIndex, true, boardState, cellSize, BOARD_SIZE, BOARD_SIZE);

                    if (window.RetroAudio && typeof window.RetroAudio.playSakuraColumn === 'function') {
                        window.RetroAudio.playSakuraColumn(idx);
                    }

                    for (let r = 0; r < BOARD_SIZE; r++) {
                        boardState[r][colIndex] = null;
                    }
                    renderBoard();

                    updateScore(100);
                    triggerScreenShake(1, 1);
                }, (idx + 1) * 240);
            });
        });
    }

    // 6. REACTIVE ORANGE PEZZO RANDOM
    const btnReactiveOrange = document.getElementById('btn-trigger-reactive-orange');
    if (btnReactiveOrange) {
        btnReactiveOrange.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            const occupiedCells = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (boardState[r][c] !== null && boardState[r][c] !== 0) occupiedCells.push({ r, c });
                }
            }
            const originCell = occupiedCells.length > 0
                ? occupiedCells[Math.floor(Math.random() * occupiedCells.length)]
                : { r: Math.floor(Math.random() * 6), c: Math.floor(Math.random() * 6) };

            const orangeColorObj = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.reactive_orange)
                ? GEM_COLORS.reactive_orange
                : { isReactiveOrange: true, center: 'rgb(249, 115, 22)' };

            boardState[originCell.r][originCell.c] = orangeColorObj;
            renderBoard();

            const fakePlacedShape = {
                isReactiveOrange: true,
                matrix: [[1]],
                color: orangeColorObj
            };

            triggerReactiveOrangeExplosion(fakePlacedShape, originCell.r, originCell.c);
        });
    }

    // 7. OVERGROW GREEN PEZZO RANDOM
    const btnOvergrowGreen = document.getElementById('btn-trigger-overgrow-green');
    if (btnOvergrowGreen) {
        btnOvergrowGreen.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            const originR = Math.floor(Math.random() * (BOARD_SIZE - 2));
            const originC = Math.floor(Math.random() * (BOARD_SIZE - 2));

            const greenColorObj = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.overgrow_green)
                ? GEM_COLORS.overgrow_green
                : { isOvergrowGreen: true, center: 'rgb(34, 197, 94)' };

            boardState[originR][originC] = greenColorObj;
            renderBoard();

            const fakePlacedShape = {
                isOvergrowGreen: true,
                matrix: [[1]],
                color: greenColorObj
            };

            triggerOvergrowGreenGrowth(fakePlacedShape, originR, originC);
        });
    }

    // 8. AMPLIFYING PURPLE PEZZO RANDOM / GRAVITÀ
    const btnAmplifyingPurple = document.getElementById('btn-trigger-amplifying-purple');
    if (btnAmplifyingPurple) {
        btnAmplifyingPurple.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            let hasBlocks = false;
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (boardState[r].some(val => val !== null && val !== 0)) { hasBlocks = true; break; }
            }
            if (!hasBlocks) {
                for (let r = 0; r < 2; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        if (Math.random() < 0.7) boardState[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
                    }
                }
                renderBoard();
            }

            const targetClearedRow = 5;
            for (let c = 0; c < BOARD_SIZE; c++) boardState[targetClearedRow][c] = null;
            renderBoard();

            triggerSkillActivationPopup('Amplifying Purple 🔮', ['<span class="reward-yellow">GRAVITÀ! 🌌</span>']);
            const { canvas: vfxCanvas } = getVfxContext();

            const upperBlocks = [];
            const upperBlockSet = new Set();
            for (let r = 0; r < targetClearedRow; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (boardState[r][c] !== null && boardState[r][c] !== 0) {
                        upperBlocks.push({ r, c, val: boardState[r][c] });
                        upperBlockSet.add(`${r},${c}`);
                    }
                }
            }

            if (upperBlocks.length > 0) {
                const newBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
                for (let r = 0; r < BOARD_SIZE; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        if (!upperBlockSet.has(`${r},${c}`)) newBoard[r][c] = boardState[r][c];
                    }
                }
                upperBlocks.forEach(b => {
                    newBoard[b.r + 1][b.c] = b.val;
                });
                boardState = newBoard;
                renderBoard();
            }
        });
    }

    // 8b. LAVA RED DEV TRIGGER
    const btnLavaRed = document.getElementById('btn-trigger-lava-red');
    if (btnLavaRed) {
        btnLavaRed.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            let hasLava = false;
            for (let r = 0; r < BOARD_SIZE - 1; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const cell = boardState[r][c];
                    if (cell && (cell.isLavaRed || (typeof cell === 'object' && cell.isLavaRed))) {
                        hasLava = true;
                        break;
                    }
                }
                if (hasLava) break;
            }

            if (!hasLava) {
                const targetC = Math.floor(Math.random() * (BOARD_SIZE - 2)) + 1;
                boardState[2][targetC] = GEM_COLORS.lava_red;
                boardState[3][targetC] = COLORS[Math.floor(Math.random() * COLORS.length)];
                renderBoard();
            }

            processLavaRedMovement();
            setTimeout(() => {
                if (typeof window.checkLavaLineClears === 'function') {
                    window.checkLavaLineClears();
                }
            }, 1450);
        });
    }

    // 9. SHINING TOMATO (Elimina 1 riga con animazione e popup)
    const btnShiningTomato = document.getElementById('btn-trigger-shining-tomato');
    if (btnShiningTomato) {
        btnShiningTomato.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            const filledRows = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (boardState[r].some(val => val !== null && val !== 0)) filledRows.push(r);
            }
            const targetRow = filledRows.length > 0
                ? filledRows[Math.floor(Math.random() * filledRows.length)]
                : Math.floor(Math.random() * BOARD_SIZE);

            triggerSkillActivationPopup('Shining Tomato 🍅', ['<span class="reward-yellow">1 RIGA ELIMINATA! 🍅</span>']);

            const { canvas: vfxCanvas } = getVfxContext();
            const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

            // Trigger VFX FIRST while blocks are still in boardState!
            triggerClearVFX(targetRow, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 1);

            for (let c = 0; c < BOARD_SIZE; c++) boardState[targetRow][c] = null;
            renderBoard();

            updateScore(150);
            triggerScreenShake(1, 1);
        });
    }

    // 9b. POSIZIONA PEZZO + GUADAGNA MONETE (Test Animazione Monete Volanti)
    const btnPlacePieceEarnCoins = document.getElementById('btn-place-piece-earn-coins');
    if (btnPlacePieceEarnCoins) {
        btnPlacePieceEarnCoins.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            const targetRow = Math.floor(Math.random() * BOARD_SIZE);
            const targetCol = Math.floor(Math.random() * BOARD_SIZE);

            // Posiziona temporaneamente un blocco dorato
            boardState[targetRow][targetCol] = { isGolden: true, center: 'rgb(255, 215, 0)' };
            renderBoard();

            // Imposta la posizione esatta del pezzo posizionato
            window.lastPlacedPos = { percentX: (targetCol + 0.5) / BOARD_SIZE * 100, percentY: (targetRow + 0.5) / BOARD_SIZE * 100 };

            const { canvas: vfxCanvas } = getVfxContext();
            const cellSize = (vfxCanvas ? vfxCanvas.width : boardElement.clientWidth) / BOARD_SIZE;

            // Attiva VFX di eliminazione riga
            triggerClearVFX(targetRow, false, boardState, cellSize, BOARD_SIZE, BOARD_SIZE, 1, 'rgb(255, 215, 0)');

            for (let c = 0; c < BOARD_SIZE; c++) boardState[targetRow][c] = null;
            renderBoard();

            // Aggiunge 3 monete e scatena l'animazione di 3 monete volanti che partono dalla posizione del pezzo!
            if (typeof addCoins === 'function') {
                addCoins(3);
            } else if (typeof spawnFlyingCoinEffect === 'function') {
                spawnFlyingCoinEffect(window.lastPlacedPos, 3);
            }

            triggerSkillActivationPopup('Golden Coin Piece 🪙', ['<span class="reward-yellow">+3 COINS! 🪙</span>']);
            triggerScreenShake(1, 1);
        });
    }

    // 10. ELIMINA 3 RIGHE ARCOBALENO (Cascata sequenziale arcobaleno velocissima)
    const btnClear3RainbowRows = document.getElementById('btn-trigger-clear-3-rainbow-rows');
    if (btnClear3RainbowRows) {
        btnClear3RainbowRows.addEventListener('click', () => {
            if (typeof boardState === 'undefined' || !boardState) return;

            const filledRows = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (boardState[r].some(val => val !== null && val !== 0)) filledRows.push(r);
            }

            let r1, r2, r3;
            if (filledRows.length >= 3) {
                const i1 = Math.floor(Math.random() * filledRows.length);
                r1 = filledRows[i1];
                filledRows.splice(i1, 1);

                const i2 = Math.floor(Math.random() * filledRows.length);
                r2 = filledRows[i2];
                filledRows.splice(i2, 1);

                r3 = filledRows[Math.floor(Math.random() * filledRows.length)];
            } else {
                const available = [0, 1, 2, 3, 4, 5, 6, 7];
                for (let i = available.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [available[i], available[j]] = [available[j], available[i]];
                }
                r1 = available[0];
                r2 = available[1];
                r3 = available[2];
            }

            const targetRows = [r1, r2, r3];

            // Popola la griglia per mostrare l'onda arcobaleno
            targetRows.forEach(r => {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    boardState[r][c] = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.blue) ? GEM_COLORS.blue : 'blue';
                }
            });
            renderBoard();

            triggerSkillActivationPopup('SUPER RAINBOW 🌈', ['<span class="reward-yellow">3 RIGHE ARCOBALENO! 🌈✨</span>']);

            // Scatena l'animazione dell'ONDA SEQUENZIALE ARCOBALENO!
            triggerRainbowSweep(targetRows, [], boardState);

            setTimeout(() => {
                targetRows.forEach(r => {
                    for (let c = 0; c < BOARD_SIZE; c++) boardState[r][c] = null;
                });
                renderBoard();
            }, 220);

            updateScore(300);
            triggerScreenShake(3, 3);
        });
    }

    // 11. TEST VIBRAZIONE HAPTIC
    const btnTestHaptic = document.getElementById('btn-test-haptic-vibration');
    if (btnTestHaptic) {
        btnTestHaptic.addEventListener('click', () => {
            triggerHapticPop(60);
            if (typeof triggerSkillActivationPopup === 'function') {
                triggerSkillActivationPopup('Haptic Feedback 📳', ['<span class="reward-yellow">Vibration Triggered!</span>']);
            }
        });
    }

    const btnOpenClearRows = document.getElementById('btn-open-clear-rows-modal');
    const clearRowsModal = document.getElementById('clearRowsModal');
    const btnCloseClearRowsModal = document.getElementById('btnCloseClearRowsModal');
    const gridSelector = document.getElementById('clear-rows-grid-selector');
    const btnSelectAll = document.getElementById('btn-select-all-rows');
    const btnDeselectAll = document.getElementById('btn-deselect-all-rows');
    const btnExecuteClear = document.getElementById('btn-execute-clear-rows');

    let selectedRowIndices = new Set();

    function renderRowSelectorItems() {
        if (!gridSelector) return;
        gridSelector.innerHTML = '';
        const boardSize = (typeof BOARD_SIZE !== 'undefined') ? BOARD_SIZE : 8;

        for (let r = 0; r < boardSize; r++) {
            const item = document.createElement('div');
            item.className = 'row-selector-item' + (selectedRowIndices.has(r) ? ' selected' : '');
            item.dataset.row = r;

            const label = document.createElement('span');
            label.className = 'row-selector-label';
            label.textContent = `RIGA ${r + 1}`;

            const preview = document.createElement('div');
            preview.className = 'row-selector-preview';

            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                const isFilled = boardState && boardState[r] && boardState[r][c] !== null && boardState[r][c] !== 0;
                cell.className = 'row-preview-cell' + (isFilled ? ' filled' : '');
                preview.appendChild(cell);
            }

            item.appendChild(label);
            item.appendChild(preview);

            item.addEventListener('click', () => {
                if (selectedRowIndices.has(r)) {
                    selectedRowIndices.delete(r);
                    item.classList.remove('selected');
                } else {
                    selectedRowIndices.add(r);
                    item.classList.add('selected');
                }
                updateExecuteButtonState();
            });

            gridSelector.appendChild(item);
        }
        updateExecuteButtonState();
    }

    function updateExecuteButtonState() {
        if (!btnExecuteClear) return;
        const count = selectedRowIndices.size;
        if (count > 0) {
            btnExecuteClear.disabled = false;
            btnExecuteClear.textContent = `⚡ ELIMINA ${count} RIGH${count === 1 ? 'A' : 'E'}`;
        } else {
            btnExecuteClear.disabled = true;
            btnExecuteClear.textContent = '⚡ ELIMINA 0 RIGHE';
        }
    }

    if (btnOpenClearRows && clearRowsModal) {
        btnOpenClearRows.addEventListener('click', () => {
            if (menuContent) menuContent.classList.add('collapsed');
            if (menuContainer) menuContainer.classList.remove('expanded');

            selectedRowIndices.clear();
            renderRowSelectorItems();
            clearRowsModal.classList.remove('hidden');
        });
    }

    if (btnCloseClearRowsModal && clearRowsModal) {
        btnCloseClearRowsModal.addEventListener('click', () => {
            clearRowsModal.classList.add('hidden');
        });
    }

    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            const boardSize = (typeof BOARD_SIZE !== 'undefined') ? BOARD_SIZE : 8;
            for (let r = 0; r < boardSize; r++) {
                selectedRowIndices.add(r);
            }
            renderRowSelectorItems();
        });
    }

    if (btnDeselectAll) {
        btnDeselectAll.addEventListener('click', () => {
            selectedRowIndices.clear();
            renderRowSelectorItems();
        });
    }

    if (btnExecuteClear) {
        btnExecuteClear.addEventListener('click', () => {
            if (selectedRowIndices.size === 0) return;
            const rowsToClear = Array.from(selectedRowIndices);
            clearRowsModal.classList.add('hidden');

            if (typeof window.clearSelectedLinesSimultaneously === 'function') {
                window.clearSelectedLinesSimultaneously(rowsToClear);
            }
        });
    }
});

