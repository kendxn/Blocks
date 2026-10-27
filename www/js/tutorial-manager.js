/**
 * ============================================================================
 * REVOLVE BLOCKS - TUTORIAL MANAGER
 * ============================================================================
 * Flusso completo e fluido:
 * 1. Home: info 3 modalità e avvio diretto con PLAY
 * 2. Board: eliminazione colonna verticale
 * 3. Board: eliminazione riga orizzontale
 * 4. Board: eliminazione quadrato 4x4 (quadrante)
 * 5. Counters: Line Counter (monete) & 10 turni Free Roll -> tocca SHOP
 * 6. Shop: funzione LOCK sbloccata & acquisto Sakura Pink
 * 7. Test: pezzo Sakura Pink in colonna per attivare la Tripla Voragine
 * 8. Completato: modale finale con opzione Gioca / Home
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'tutorialCompleted';

  const TutorialManager = {
    isActive: false,
    currentStep: 0,
    bannerEl: null,
    modalEl: null,

    allowedSlot: null,
    allowedPlacement: null,
    allowedTargets: [],

    _typewriterTimer: null,
    _waitForGameInterval: null,
    _stepTimer: null,
    _shopLockTimer: null,
    _checkBoughtInterval: null,
    _checkShowcaseInterval: null,
    _checkShopClosedInterval: null,
    _onPlayClick: null,
    _playBtn: null,
    _onShopOpen: null,
    _btnShop: null,
    _onExitBeforeBuy: null,
    _exitBtn: null,

    STEP_MODES: 1,
    STEP_VERTICAL_LINE: 2,
    STEP_HORIZONTAL_LINE: 3,
    STEP_QUADRANT: 4,
    STEP_COUNTERS: 5,
    STEP_SHOP_LOCK: 6,
    STEP_SAKURA_TEST: 7,
    STEP_COMPLETED: 8,

    isCompleted() {
      try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
      } catch (_) {
        return false;
      }
    },

    markCompleted() {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (_) { }
    },

    showWelcomeModal() {
      this.removeModal();
      this.removeBanner();

      const modal = document.createElement('div');
      modal.className = 'tutorial-modal-overlay';
      modal.id = 'tutorial-modal-overlay';

      modal.innerHTML = `
        <div class="tutorial-modal-box">
          <div class="tutorial-modal-icon">🎮</div>
          <div class="tutorial-modal-title">WELCOME!</div>
          <div class="tutorial-modal-desc">
            Learn the basics of Revolve Blocks: lines, squares, shop abilities and more!
          </div>
          <div class="tutorial-modal-buttons two-btns">
            <button class="settings-pixel-btn" id="tutorial-btn-welcome-start">START TUTORIAL</button>
            <button class="settings-pixel-btn settings-pixel-btn-red" id="tutorial-btn-welcome-skip">SKIP</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.modalEl = modal;

      modal.querySelector('#tutorial-btn-welcome-start')?.addEventListener('click', () => {
        if (window.RetroAudio && typeof window.RetroAudio.playClick === 'function') {
          window.RetroAudio.playClick();
        }
        this.removeModal();
        this.start();
      });

      modal.querySelector('#tutorial-btn-welcome-skip')?.addEventListener('click', () => {
        this.skip();
      });

      if (typeof window.updateBannerVisibility === 'function') {
        window.updateBannerVisibility();
      }
    },

    init() {
      // Setup capture guard per impedire azioni fuori dai target indicati in Home
      const handleCapture = (e) => {
        if (!this.isActive) return;
        if (this.isEventAllowed(e)) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      window.addEventListener('pointerdown', handleCapture, true);
      window.addEventListener('click', handleCapture, true);

      // Mostra popup di benvenuto al primissimo accesso se tutorial non completato
      if (!this.isCompleted()) {
        const checkReady = setInterval(() => {
          const splashEl = document.getElementById('game-splash-screen');
          const homeScreen = document.getElementById('home-screen');
          const isSplashDone = !splashEl || splashEl.classList.contains('fade-out');
          const isHomeVisible = homeScreen && !homeScreen.classList.contains('hidden');

          if (isSplashDone && isHomeVisible) {
            clearInterval(checkReady);
            setTimeout(() => {
              if (!this.isCompleted() && !this.isActive) {
                this.showWelcomeModal();
              }
            }, 400);
          }
        }, 200);
      }
    },

    isEventAllowed(e) {
      if (!this.isActive) return true;
      const target = e.target;
      if (!target) return true;

      // Banner tutorial e tasto Salta sempre ammessi
      if (this.bannerEl && (target === this.bannerEl || this.bannerEl.contains(target))) {
        return true;
      }
      // Modale finale sempre ammesso
      if (this.modalEl && (target === this.modalEl || this.modalEl.contains(target))) {
        return true;
      }
      // Showcase abilità Sakura sempre ammesso
      const showcase = document.getElementById('skill-purchase-showcase-overlay');
      if (showcase && !showcase.classList.contains('hidden') && (target === showcase || showcase.contains(target))) {
        return true;
      }

      // Nel negozio: TUTTE le interazioni interne (Lock, carte, Done, Clear, Buy, Exit) sono sempre permesse!
      const shopOverlay = document.getElementById('shop-render-overlay');
      if (shopOverlay && !shopOverlay.classList.contains('hidden')) {
        if (target === shopOverlay || shopOverlay.contains(target)) {
          return true;
        }
      }

      // Se non ci sono target restrittivi impostati, consenti
      if (!this.allowedTargets || this.allowedTargets.length === 0) {
        return true;
      }

      // Controlla se il click è su uno dei target ammessi
      for (let i = 0; i < this.allowedTargets.length; i++) {
        const el = this.allowedTargets[i];
        if (el && (target === el || el.contains(target))) {
          return true;
        }
      }

      return false;
    },

    start() {
      console.log('[TutorialManager] Avvio tutorial interattivo');
      this.cleanup();
      this.isActive = true;
      this.currentStep = this.STEP_MODES;
      this.allowedSlot = null;
      this.allowedPlacement = null;
      this.allowedTargets = [];

      if (window._gameStartFreeRollTimer) {
        clearTimeout(window._gameStartFreeRollTimer);
        window._gameStartFreeRollTimer = null;
      }

      this.cleanHighlights();
      this.removeBanner();
      this.removeModal();

      if (typeof window.showHomeScreen === 'function') {
        const homeScreen = document.getElementById('home-screen');
        if (!homeScreen || homeScreen.classList.contains('hidden')) {
          window.showHomeScreen(false);
        }
      }

      if (typeof window.updateBannerVisibility === 'function') {
        window.updateBannerVisibility();
      }

      this.runStepModes();
    },

    skip() {
      if (window.RetroAudio && typeof window.RetroAudio.playClick === 'function') {
        window.RetroAudio.playClick();
      }
      this.markCompleted();
      this.cleanup();

      if (typeof window.closeShopRender === 'function') {
        window.closeShopRender();
      }

      const homeScreen = document.getElementById('home-screen');
      if (homeScreen && homeScreen.classList.contains('hidden')) {
        if (typeof window.showHomeScreen === 'function') {
          window.showHomeScreen(true);
        }
      }
    },

    cleanup() {
      this.isActive = false;
      this.currentStep = 0;
      this.allowedSlot = null;
      this.allowedPlacement = null;
      this.allowedTargets = [];

      // Clear all intervals
      if (this._waitForGameInterval) {
        clearInterval(this._waitForGameInterval);
        this._waitForGameInterval = null;
      }
      if (this._checkBoughtInterval) {
        clearInterval(this._checkBoughtInterval);
        this._checkBoughtInterval = null;
      }
      if (this._checkShowcaseInterval) {
        clearInterval(this._checkShowcaseInterval);
        this._checkShowcaseInterval = null;
      }
      if (this._checkShopClosedInterval) {
        clearInterval(this._checkShopClosedInterval);
        this._checkShopClosedInterval = null;
      }

      // Clear all timeouts
      if (this._stepTimer) {
        clearTimeout(this._stepTimer);
        this._stepTimer = null;
      }
      if (this._shopLockTimer) {
        clearTimeout(this._shopLockTimer);
        this._shopLockTimer = null;
      }
      if (this._typewriterTimer) {
        clearTimeout(this._typewriterTimer);
        this._typewriterTimer = null;
      }

      // Detach listeners
      if (this._onPlayClick) {
        const playBtn = this._playBtn || document.getElementById('home-play-btn');
        playBtn?.removeEventListener('click', this._onPlayClick);
        this._onPlayClick = null;
        this._playBtn = null;
      }
      if (this._onShopOpen) {
        const btnShop = this._btnShop || document.getElementById('btnShop');
        btnShop?.removeEventListener('click', this._onShopOpen);
        this._onShopOpen = null;
        this._btnShop = null;
      }
      if (this._onExitBeforeBuy) {
        const exitBtns = [
          this._exitBtn,
          document.getElementById('shop-btn-exit-shop'),
          document.getElementById('shop-btn-exit')
        ];
        exitBtns.forEach(btn => {
          btn?.removeEventListener('click', this._onExitBeforeBuy, true);
        });
        this._onExitBeforeBuy = null;
        this._exitBtn = null;
      }

      this.undimSlots();
      this.cleanHighlights();
      this.removeBanner();
      this.removeModal();

      if (typeof window.resetShopState === 'function') {
        window.resetShopState();
      }
      if (typeof resetAllSkillsToDefault === 'function') {
        resetAllSkillsToDefault();
      }
      if (typeof window.clearGameSnapshot === 'function') {
        window.clearGameSnapshot();
      }
      if (typeof initBoard === 'function') {
        initBoard();
      }

      if (typeof window.updateBannerVisibility === 'function') {
        window.updateBannerVisibility();
      }
    },

    // =========================================================================
    // GATING MOSSE (SLOT & PLACEMENT SUL BOARD)
    // =========================================================================
    isSlotAllowed(slotIndex) {
      if (!this.isActive) return true;
      if (this.allowedSlot === null) return true;
      return slotIndex === this.allowedSlot;
    },

    isPlacementAllowed(matrix, row, col) {
      if (!this.isActive) return true;
      if (this.allowedPlacement === null) return true;
      return row === this.allowedPlacement.row && col === this.allowedPlacement.col;
    },

    dimSlots(activeSlotIndex) {
      for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`slot-${i}`);
        if (slotEl) {
          if (i === activeSlotIndex) {
            slotEl.classList.remove('tutorial-dimmed-slot');
          } else {
            slotEl.classList.add('tutorial-dimmed-slot');
          }
        }
      }
    },

    undimSlots() {
      for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`slot-${i}`);
        if (slotEl) {
          slotEl.classList.remove('tutorial-dimmed-slot');
        }
      }
    },

    cleanHighlights() {
      document.querySelectorAll('.tutorial-target-highlight').forEach(el => {
        el.classList.remove('tutorial-target-highlight');
      });
    },

    highlightElement(el) {
      if (!el) return;
      el.classList.add('tutorial-target-highlight');
    },

    showBanner(title, desc, stepNum, totalSteps = 7, isBottom = false) {
      this.removeBanner();

      const banner = document.createElement('div');
      banner.id = 'tutorial-banner';
      if (isBottom) {
        banner.classList.add('bottom-pos');
      }

      banner.innerHTML = `
        <div class="tutorial-mask-content">
          <div class="tutorial-banner-header">
            <span class="tutorial-step-tag">TUTORIAL [${stepNum}/${totalSteps}]</span>
            <button class="tutorial-skip-btn" id="tutorial-skip-btn">SKIP ✕</button>
          </div>
          <div class="tutorial-title" id="tutorial-title"></div>
          <div class="tutorial-desc" id="tutorial-desc"></div>
        </div>
      `;

      document.body.appendChild(banner);
      this.bannerEl = banner;

      banner.querySelector('#tutorial-skip-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skip();
      });

      const titleEl = banner.querySelector('#tutorial-title');
      const descEl = banner.querySelector('#tutorial-desc');

      this.startTypewriter(titleEl, descEl, title, desc, 18);

      banner.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'tutorial-skip-btn') return;
        this.completeTypewriter(titleEl, descEl, title, desc);
      });
    },

    playTypingSound() {
      if (window.RetroAudio && typeof window.RetroAudio.playTypewriterTick === 'function') {
        window.RetroAudio.playTypewriterTick();
      } else if (typeof window.playTypewriterTick === 'function') {
        window.playTypewriterTick();
      }
    },

    startTypewriter(titleEl, descEl, titleText, descText, speed = 18) {
      if (this._typewriterTimer) {
        clearTimeout(this._typewriterTimer);
        this._typewriterTimer = null;
      }

      if (!titleEl || !descEl) return;

      titleEl.innerHTML = '<span class="typewriter-cursor">▌</span>';
      descEl.innerHTML = '';

      let titleIdx = 0;
      let descIdx = 0;
      let titleFinished = false;

      const typeStep = () => {
        if (!titleFinished) {
          if (titleIdx < titleText.length) {
            const char = titleText.charAt(titleIdx);
            titleIdx++;
            titleEl.textContent = titleText.slice(0, titleIdx);
            titleEl.innerHTML += '<span class="typewriter-cursor">▌</span>';
            if (char !== ' ' && char !== '\n') {
              this.playTypingSound();
            }
            this._typewriterTimer = setTimeout(typeStep, speed);
          } else {
            titleFinished = true;
            titleEl.textContent = titleText;
            descEl.innerHTML = '<span class="typewriter-cursor">▌</span>';
            this._typewriterTimer = setTimeout(typeStep, 70);
          }
        } else {
          if (descIdx < descText.length) {
            const char = descText.charAt(descIdx);
            descIdx++;
            const currentDesc = descText.slice(0, descIdx);
            descEl.innerHTML = currentDesc.replace(/\n/g, '<br>') + '<span class="typewriter-cursor">▌</span>';
            if (char !== ' ' && char !== '\n') {
              this.playTypingSound();
            }
            this._typewriterTimer = setTimeout(typeStep, speed);
          } else {
            descEl.innerHTML = descText.replace(/\n/g, '<br>');
            this._typewriterTimer = null;
          }
        }
      };

      this._typewriterTimer = setTimeout(typeStep, 40);
    },

    completeTypewriter(titleEl, descEl, titleText, descText) {
      if (this._typewriterTimer) {
        clearTimeout(this._typewriterTimer);
        this._typewriterTimer = null;
      }
      if (titleEl) titleEl.textContent = titleText;
      if (descEl) descEl.innerHTML = descText.replace(/\n/g, '<br>');
    },

    removeBanner() {
      if (this._typewriterTimer) {
        clearTimeout(this._typewriterTimer);
        this._typewriterTimer = null;
      }
      if (this.bannerEl) {
        this.bannerEl.remove();
        this.bannerEl = null;
      }
      const old = document.getElementById('tutorial-banner');
      if (old) old.remove();
    },

    removeModal() {
      if (this.modalEl) {
        this.modalEl.remove();
        this.modalEl = null;
      }
      const old = document.getElementById('tutorial-modal-overlay');
      if (old) old.remove();
    },

    // =========================================================================
    // STEP 1: HOME SCREEN - 3 MODES & PLAY
    // =========================================================================
    runStepModes() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_MODES;
      this.allowedSlot = null;
      this.allowedPlacement = null;

      const playBtn = document.getElementById('home-play-btn');
      this.allowedTargets = playBtn ? [playBtn] : [];

      if (playBtn) {
        this.highlightElement(playBtn);
      }

      this.showBanner(
        '3 GAME MODES',
        'Classic (Shop), Time (2m), and Vintage (Pure).\nTap PLAY to start!',
        1,
        7
      );

      if (this._onPlayClick && this._playBtn) {
        this._playBtn.removeEventListener('click', this._onPlayClick);
      }

      const onPlayClick = () => {
        playBtn?.removeEventListener('click', onPlayClick);
        this._onPlayClick = null;
        this._playBtn = null;
        if (!this.isActive) return;

        this.allowedTargets = [];
        this.cleanHighlights();
        this.removeBanner();

        if (window._gameStartFreeRollTimer) {
          clearTimeout(window._gameStartFreeRollTimer);
          window._gameStartFreeRollTimer = null;
        }

        this.waitForGameStart(() => {
          if (!this.isActive) return;
          this.runStepVerticalLine();
        });
      };

      this._onPlayClick = onPlayClick;
      this._playBtn = playBtn;

      if (playBtn) {
        playBtn.addEventListener('click', onPlayClick, { once: true });
      }
    },

    waitForGameStart(callback) {
      if (this._waitForGameInterval) {
        clearInterval(this._waitForGameInterval);
        this._waitForGameInterval = null;
      }

      this._waitForGameInterval = setInterval(() => {
        if (!this.isActive) {
          clearInterval(this._waitForGameInterval);
          this._waitForGameInterval = null;
          return;
        }

        const homeScreen = document.getElementById('home-screen');
        const isGameVisible = !homeScreen || homeScreen.classList.contains('hidden');
        const isNotTransitioning = !window.isGameTransitioning && !window.isPixelIrisTransitioning;

        if (isGameVisible && isNotTransitioning && typeof boardState !== 'undefined') {
          clearInterval(this._waitForGameInterval);
          this._waitForGameInterval = null;
          if (window._gameStartFreeRollTimer) {
            clearTimeout(window._gameStartFreeRollTimer);
            window._gameStartFreeRollTimer = null;
          }
          if (this._stepTimer) clearTimeout(this._stepTimer);
          this._stepTimer = setTimeout(() => {
            if (!this.isActive) return;
            callback();
          }, 280);
        }
      }, 120);
    },

    // =========================================================================
    // STEP 2: CLEAR A VERTICAL COLUMN
    // =========================================================================
    runStepVerticalLine() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_VERTICAL_LINE;
      this.allowedSlot = 0;
      this.allowedPlacement = { row: 3, col: 3 };
      this.allowedTargets = [];

      if (window._gameStartFreeRollTimer) {
        clearTimeout(window._gameStartFreeRollTimer);
        window._gameStartFreeRollTimer = null;
      }

      this.setupVerticalBoard();
      this.dimSlots(0);

      const targetCell = boardElement ? boardElement.querySelector(`.cell[data-row="3"][data-col="3"]`) : null;
      if (targetCell) this.highlightElement(targetCell);

      this.showBanner(
        'CLEAR A COLUMN',
        'Drag the piece to complete\nthe vertical column!',
        2,
        7,
        false
      );
    },

    setupVerticalBoard() {
      if (!this.isActive) return;
      if (typeof boardState === 'undefined' || !boardElement) return;

      boardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, null, 0);
          }
        }
      }

      // Riempi solo la Colonna 3, lasciando vuota la cella [3, 3]
      const gemColor = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.blue) ? GEM_COLORS.blue : { center: '#00BFFF' };
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (r !== 3) {
          boardState[r][3] = gemColor;
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="3"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, gemColor, 1);
          }
        }
      }

      if (typeof createPieceElement === 'function') {
        activePieces = [];
        const singleShape = { matrix: [[1]], color: gemColor, id: 'tut_single' };
        const shape2 = { matrix: [[1, 1]], color: (GEM_COLORS.green || gemColor), id: 'tut_other1' };
        const shape3 = { matrix: [[1], [1]], color: gemColor, id: 'tut_other2' };

        createPieceElement(singleShape, 0);
        activePieces.push({ shape: singleShape, slot: 0, rotated: false });

        createPieceElement(shape2, 1);
        activePieces.push({ shape: shape2, slot: 1, rotated: false });

        createPieceElement(shape3, 2);
        activePieces.push({ shape: shape3, slot: 2, rotated: false });
      }
    },

    onLinesCleared(rowsCleared, colsCleared, quadsCleared = []) {
      if (!this.isActive) return;

      if (this.currentStep === this.STEP_VERTICAL_LINE && colsCleared.length > 0) {
        this.cleanHighlights();
        this.allowedPlacement = null;
        if (this._stepTimer) clearTimeout(this._stepTimer);
        this._stepTimer = setTimeout(() => {
          if (!this.isActive) return;
          this.runStepHorizontalLine();
        }, 450);
      } else if (this.currentStep === this.STEP_HORIZONTAL_LINE && rowsCleared.length > 0) {
        this.cleanHighlights();
        this.allowedPlacement = null;
        if (this._stepTimer) clearTimeout(this._stepTimer);
        this._stepTimer = setTimeout(() => {
          if (!this.isActive) return;
          this.runStepQuadrant();
        }, 450);
      } else if (this.currentStep === this.STEP_QUADRANT && quadsCleared.length > 0) {
        this.cleanHighlights();
        this.allowedPlacement = null;
        if (this._stepTimer) clearTimeout(this._stepTimer);
        this._stepTimer = setTimeout(() => {
          if (!this.isActive) return;
          this.runStepCounters();
        }, 450);
      } else if (this.currentStep === this.STEP_SAKURA_TEST && colsCleared.length > 0) {
        this.cleanHighlights();
        this.allowedPlacement = null;
        if (this._stepTimer) clearTimeout(this._stepTimer);
        this._stepTimer = setTimeout(() => {
          if (!this.isActive) return;
          this.runStepCompleted();
        }, 1600);
      }
    },

    // =========================================================================
    // STEP 3: CLEAR A HORIZONTAL ROW
    // =========================================================================
    runStepHorizontalLine() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_HORIZONTAL_LINE;
      this.allowedSlot = 0;
      this.allowedPlacement = { row: 4, col: 4 };
      this.allowedTargets = [];

      this.setupHorizontalBoard();
      this.dimSlots(0);

      const targetCell = boardElement ? boardElement.querySelector(`.cell[data-row="4"][data-col="4"]`) : null;
      if (targetCell) this.highlightElement(targetCell);

      this.showBanner(
        'CLEAR A ROW',
        'Now place the piece to\ncomplete the row!',
        3,
        7,
        false
      );
    },

    setupHorizontalBoard() {
      if (!this.isActive) return;
      if (typeof boardState === 'undefined' || !boardElement) return;

      boardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, null, 0);
          }
        }
      }

      const rowColor = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.green) ? GEM_COLORS.green : { center: '#00E676' };
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (c !== 4) {
          boardState[4][c] = rowColor;
          const cell = boardElement.querySelector(`.cell[data-row="4"][data-col="${c}"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, rowColor, 1);
          }
        }
      }

      if (typeof createPieceElement === 'function') {
        activePieces = [];
        const singleShape = { matrix: [[1]], color: rowColor, id: 'tut_single_h' };
        const shape2 = { matrix: [[1, 1]], color: rowColor, id: 'tut_other_h1' };
        const shape3 = { matrix: [[1], [1]], color: rowColor, id: 'tut_other_h2' };

        createPieceElement(singleShape, 0);
        activePieces.push({ shape: singleShape, slot: 0, rotated: false });

        createPieceElement(shape2, 1);
        activePieces.push({ shape: shape2, slot: 1, rotated: false });

        createPieceElement(shape3, 2);
        activePieces.push({ shape: shape3, slot: 2, rotated: false });
      }
    },

    // =========================================================================
    // STEP 4: CLEAR A 4x4 SQUARE
    // =========================================================================
    runStepQuadrant() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_QUADRANT;
      this.allowedSlot = 0;
      this.allowedPlacement = { row: 3, col: 3 };
      this.allowedTargets = [];

      this.setupQuadrantBoard();
      this.dimSlots(0);

      const targetCell = boardElement ? boardElement.querySelector(`.cell[data-row="3"][data-col="3"]`) : null;
      if (targetCell) this.highlightElement(targetCell);

      this.showBanner(
        'CLEAR 4x4 SQUARE',
        'You can clear 4x4 squares too!\nPlace the piece into the corner.',
        4,
        7,
        false
      );
    },

    setupQuadrantBoard() {
      if (!this.isActive) return;
      if (typeof boardState === 'undefined' || !boardElement) return;

      boardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, null, 0);
          }
        }
      }

      const quadColor = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.orange) ? GEM_COLORS.orange : { center: '#FF9800' };
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (r === 3 && c === 3) continue;
          boardState[r][c] = quadColor;
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, quadColor, 1);
          }
        }
      }

      if (typeof createPieceElement === 'function') {
        activePieces = [];
        const singleShape = { matrix: [[1]], color: quadColor, id: 'tut_single_q' };
        const shape2 = { matrix: [[1, 1]], color: quadColor, id: 'tut_other_q1' };
        const shape3 = { matrix: [[1], [1]], color: quadColor, id: 'tut_other_q2' };

        createPieceElement(singleShape, 0);
        activePieces.push({ shape: singleShape, slot: 0, rotated: false });

        createPieceElement(shape2, 1);
        activePieces.push({ shape: shape2, slot: 1, rotated: false });

        createPieceElement(shape3, 2);
        activePieces.push({ shape: shape3, slot: 2, rotated: false });
      }
    },

    // =========================================================================
    // STEP 5: LINE COUNTER & FREE ROLL (TAP SHOP)
    // =========================================================================
    runStepCounters() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_COUNTERS;
      this.allowedSlot = null;
      this.allowedPlacement = null;
      this.dimSlots(-1);

      if (typeof userCoins !== 'undefined') {
        userCoins = Math.max(userCoins, 10);
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }

      const btnShop = document.getElementById('btnShop');
      this.allowedTargets = btnShop ? [btnShop] : [];

      if (btnShop) {
        this.highlightElement(btnShop);
      }

      this.showBanner(
        'COINS & FREE ROLLS',
        '6 Lines = Coins. 10 Turns = Free Roll.\nTap SHOP to check abilities!',
        5,
        7,
        true
      );

      if (this._onShopOpen && this._btnShop) {
        this._btnShop.removeEventListener('click', this._onShopOpen);
      }

      const onShopOpen = () => {
        btnShop?.removeEventListener('click', onShopOpen);
        this._onShopOpen = null;
        this._btnShop = null;
        if (!this.isActive) return;

        this.cleanHighlights();
        this.allowedTargets = [];
        if (this._shopLockTimer) clearTimeout(this._shopLockTimer);
        this._shopLockTimer = setTimeout(() => {
          if (!this.isActive) return;
          this.runStepShopLock();
        }, 350);
      };

      this._onShopOpen = onShopOpen;
      this._btnShop = btnShop;

      if (btnShop) {
        btnShop.addEventListener('click', onShopOpen, { once: true });
      }
    },

    // =========================================================================
    // STEP 6: SHOP - BUY SAKURA PINK DIRECTLY (NO LOCK EXPLANATION)
    // =========================================================================
    runStepShopLock() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_SHOP_LOCK;
      this.ensureSakuraPinkInShop();

      // Ensure user has coins to buy Sakura Pink (costs 4G)
      if (typeof userCoins !== 'undefined') {
        userCoins = Math.max(userCoins, 10);
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }
      if (typeof window.shopState !== 'undefined') {
        window.shopState.coins = Math.max(window.shopState.coins || 0, 10);
        const coinsValEl = document.getElementById('shop-coins-value');
        if (coinsValEl) coinsValEl.textContent = window.shopState.coins;
      }

      // Inside shop, all clicks are allowed
      this.allowedTargets = [];

      const exitBtn = document.getElementById('shop-btn-exit-shop') || document.getElementById('shop-btn-exit');
      const sakuraCard = document.querySelector('.item-card[data-skill-id="sakura_pink"]') || document.querySelector('.item-card[data-index="1"]') || document.querySelector('.item-card');

      if (sakuraCard) this.highlightElement(sakuraCard);

      this.showBanner(
        'BUY SAKURA PINK',
        'Tap SAKURA PINK in the 2nd slot to buy it!',
        6,
        7,
        true
      );

      // Clean up any previously attached exit listener
      if (this._onExitBeforeBuy) {
        const exitBtns = [
          this._exitBtn,
          document.getElementById('shop-btn-exit-shop'),
          document.getElementById('shop-btn-exit')
        ];
        exitBtns.forEach(btn => btn?.removeEventListener('click', this._onExitBeforeBuy, true));
        this._onExitBeforeBuy = null;
        this._exitBtn = null;
      }

      // Prevent accidental exit before purchase
      const onExitBeforeBuy = (e) => {
        if (!this.isActive) return;
        const isSakuraUnlocked = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.sakura_pink && SKILLS_CONFIG.sakura_pink.unlocked;
        if (!isSakuraUnlocked) {
          e.stopImmediatePropagation();
          e.preventDefault();
          this.showBanner(
            'BUY SAKURA PINK',
            'Purchase Sakura Pink (4G) first to continue!',
            6,
            7,
            true
          );
        }
      };

      this._onExitBeforeBuy = onExitBeforeBuy;
      this._exitBtn = exitBtn;
      exitBtn?.addEventListener('click', onExitBeforeBuy, true);

      // Detect purchase of Sakura Pink
      if (this._checkBoughtInterval) {
        clearInterval(this._checkBoughtInterval);
        this._checkBoughtInterval = null;
      }
      this._checkBoughtInterval = setInterval(() => {
        if (!this.isActive) {
          clearInterval(this._checkBoughtInterval);
          this._checkBoughtInterval = null;
          return;
        }

        const isSakuraUnlocked = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.sakura_pink && SKILLS_CONFIG.sakura_pink.unlocked;
        if (isSakuraUnlocked) {
          clearInterval(this._checkBoughtInterval);
          this._checkBoughtInterval = null;

          if (this._onExitBeforeBuy) {
            const exitBtns = [
              exitBtn,
              this._exitBtn,
              document.getElementById('shop-btn-exit-shop'),
              document.getElementById('shop-btn-exit')
            ];
            exitBtns.forEach(btn => btn?.removeEventListener('click', this._onExitBeforeBuy, true));
            this._onExitBeforeBuy = null;
            this._exitBtn = null;
          }
          this.cleanHighlights();

          // Wait for purchase showcase to close
          if (this._checkShowcaseInterval) {
            clearInterval(this._checkShowcaseInterval);
            this._checkShowcaseInterval = null;
          }
          this._checkShowcaseInterval = setInterval(() => {
            if (!this.isActive) {
              clearInterval(this._checkShowcaseInterval);
              this._checkShowcaseInterval = null;
              return;
            }

            const showcaseOverlay = document.getElementById('skill-purchase-showcase-overlay');
            const isClosed = !showcaseOverlay || showcaseOverlay.classList.contains('hidden');
            if (isClosed) {
              clearInterval(this._checkShowcaseInterval);
              this._checkShowcaseInterval = null;
              this.promptExitShop();
            }
          }, 180);
        }
      }, 200);
    },

    ensureSakuraPinkInShop() {
      if (!this.isActive) return;
      if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.sakura_pink) {
        SKILLS_CONFIG.sakura_pink.unlocked = false;
        SKILLS_CONFIG.sakura_pink.active = false;
      }

      if (typeof window.shopState !== 'undefined') {
        const sakuraItem = {
          id: 'sakura_pink',
          name: 'SAKURA PINK',
          desc: '7% chance to spawn a Sakura Pink Piece. When placed and clearing a column, 3 random columns are destroyed sequentially',
          basePrice: 4,
          rarity: 'EPIC',
          icon: 'assets/shop/Pink.png',
          locked: false,
          purchased: false
        };

        const firstSkill = {
          id: 'curved_banana',
          name: 'CURVED BANANA',
          desc: 'Double tap a piece in the tray to rotate it',
          basePrice: 2,
          rarity: 'COMMON',
          icon: 'assets/shop/Banana.png',
          locked: false,
          purchased: false
        };

        if (!Array.isArray(window.shopState.items) || window.shopState.items.length < 2) {
          window.shopState.items = [firstSkill, sakuraItem];
        } else {
          if (!window.shopState.items[0] || window.shopState.items[0].id === 'sakura_pink') {
            window.shopState.items[0] = firstSkill;
          }
          window.shopState.items[1] = sakuraItem;
        }

        if (typeof window.renderCards === 'function') {
          window.renderCards();
        }
      }
    },

    promptExitShop() {
      if (!this.isActive) return;
      const exitBtn = document.getElementById('shop-btn-exit-shop') || document.getElementById('shop-btn-exit');
      if (exitBtn) {
        this.highlightElement(exitBtn);
      }

      this.showBanner(
        'SAKURA UNLOCKED!',
        'Tap EXIT SHOP to test it on the board.',
        6,
        7,
        false
      );

      // Wait for shop to close
      if (this._checkShopClosedInterval) {
        clearInterval(this._checkShopClosedInterval);
        this._checkShopClosedInterval = null;
      }
      this._checkShopClosedInterval = setInterval(() => {
        if (!this.isActive) {
          clearInterval(this._checkShopClosedInterval);
          this._checkShopClosedInterval = null;
          return;
        }

        const overlay = document.getElementById('shop-render-overlay');
        const isClosed = !overlay || overlay.classList.contains('hidden');
        if (isClosed) {
          clearInterval(this._checkShopClosedInterval);
          this._checkShopClosedInterval = null;
          this.cleanHighlights();
          this.removeBanner();
          this.allowedTargets = [];
          if (this._stepTimer) clearTimeout(this._stepTimer);
          this._stepTimer = setTimeout(() => {
            if (!this.isActive) return;
            this.runStepSakuraTest();
          }, 300);
        }
      }, 150);
    },

    // =========================================================================
    // STEP 7: TEST SAKURA PINK
    // =========================================================================
    runStepSakuraTest() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_SAKURA_TEST;
      this.allowedSlot = 0;
      this.allowedPlacement = { row: 3, col: 3 };
      this.allowedTargets = [];

      this.setupSakuraBoard();
      this.dimSlots(0);

      const targetCell = boardElement ? boardElement.querySelector(`.cell[data-row="3"][data-col="3"]`) : null;
      if (targetCell) this.highlightElement(targetCell);

      this.showBanner(
        'TEST SAKURA PINK',
        'Complete the column with Sakura\nto unleash 3 void columns!',
        7,
        7,
        false
      );
    },

    setupSakuraBoard() {
      if (!this.isActive) return;
      if (typeof boardState === 'undefined' || !boardElement) return;

      boardState = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, null, 0);
          }
        }
      }

      const pinkColor = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.sakura_pink)
        ? GEM_COLORS.sakura_pink
        : { center: 'rgb(244, 114, 182)', top: 'rgb(251, 207, 232)', left: 'rgb(249, 168, 212)', right: 'rgb(219, 39, 119)', bottom: 'rgb(190, 24, 93)' };

      const fillerColor = (typeof GEM_COLORS !== 'undefined' && GEM_COLORS.blue) ? GEM_COLORS.blue : { center: '#00BFFF' };

      // Riempi colonna 3 tranne cella [3, 3]
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (r !== 3) {
          boardState[r][3] = pinkColor;
          const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="3"]`);
          if (cell && typeof updateCellGem === 'function') {
            updateCellGem(cell, pinkColor, 1);
          }
        }
      }

      // Blocchi di riempimento su altre colonne da far esplodere con Sakura
      const extraGems = [
        [1, 0], [2, 0], [3, 0],
        [4, 1], [5, 1], [6, 1],
        [2, 6], [3, 6], [4, 6],
        [1, 7], [5, 7], [6, 7]
      ];
      extraGems.forEach(([r, c]) => {
        boardState[r][c] = fillerColor;
        const cell = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        if (cell && typeof updateCellGem === 'function') {
          updateCellGem(cell, fillerColor, 1);
        }
      });

      if (typeof createPieceElement === 'function') {
        activePieces = [];
        const sakuraPiece = {
          matrix: [[1]],
          color: pinkColor,
          isSakuraPink: true,
          isVoidBlack: true,
          id: 'tut_sakura_piece'
        };

        createPieceElement(sakuraPiece, 0);
        activePieces.push({ shape: sakuraPiece, slot: 0, rotated: false });
      }
    },

    // =========================================================================
    // STEP 8: COMPLETATO
    // =========================================================================
    runStepCompleted() {
      if (!this.isActive) return;
      this.currentStep = this.STEP_COMPLETED;
      this.markCompleted();
      this.undimSlots();
      this.cleanHighlights();
      this.removeBanner();
      this.allowedTargets = [];

      if (window.RetroAudio && typeof window.RetroAudio.playVictoryReward === 'function') {
        window.RetroAudio.playVictoryReward();
      }

      const modal = document.createElement('div');
      modal.className = 'tutorial-modal-overlay';
      modal.id = 'tutorial-modal-overlay';

      modal.innerHTML = `
        <div class="tutorial-modal-box">
          <div class="tutorial-modal-icon">🏆</div>
          <div class="tutorial-modal-title">TUTORIAL COMPLETED!</div>
          <div class="tutorial-modal-desc">
            Great job! You know lines, squares, the shop, and special abilities!
          </div>
          <div class="tutorial-modal-buttons">
            <button class="settings-pixel-btn" id="tutorial-btn-home">HOME</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.modalEl = modal;

      if (typeof window.updateBannerVisibility === 'function') {
        window.updateBannerVisibility();
      }

      modal.querySelector('#tutorial-btn-home')?.addEventListener('click', () => {
        if (window.RetroAudio && typeof window.RetroAudio.playClick === 'function') {
          window.RetroAudio.playClick();
        }
        this.cleanup();
        if (typeof window.clearGameSnapshot === 'function') {
          window.clearGameSnapshot();
        }
        if (typeof initBoard === 'function') {
          initBoard();
        }
        if (typeof window.showHomeScreen === 'function') {
          window.showHomeScreen(true);
        }
      });
    }
  };

  window.TutorialManager = TutorialManager;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TutorialManager.init());
  } else {
    TutorialManager.init();
  }
})();
