// Retro 8-Bit Item Shop (shopRender Integration)

(function () {
  // Audio Synthesizer (8-bit Web Audio API)
  class RetroAudio {
    constructor() { this.ctx = null; }

    init() {
      try {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => { });
        }
      } catch (e) { }
    }

    playCoin() {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.35);
      } catch (e) { }
    }

    playRoll() {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 5; i++) {
          const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300 + Math.random() * 400, now + i * 0.06);
          gain.gain.setValueAtTime(0.15, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.05);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.05);
        }
      } catch (e) { }
    }

    playLock() {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(shopState.lockMode ? 440 : 880, now);
        osc.frequency.setValueAtTime(shopState.lockMode ? 880 : 440, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.2);
      } catch (e) { }
    }

    playError() {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.3);
      } catch (e) { }
    }

    playClick() {
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.05);
      } catch (e) { }
    }

    playPurchase() {
      if (window.RetroAudio && typeof window.RetroAudio.playPurchase === "function") {
        window.RetroAudio.playPurchase();
      }
    }

    playShowcaseUnlock() {
      if (window.RetroAudio && typeof window.RetroAudio.playShowcaseUnlock === "function") {
        window.RetroAudio.playShowcaseUnlock();
        return;
      }
      try {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.26, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + (idx === 4 ? 0.6 : 0.28));
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + (idx === 4 ? 0.6 : 0.28));
        });
      } catch (e) { }
    }
  }

  const audio = window.RetroAudio || new RetroAudio();

  // Full Pool of 26 Skills mapped to SKILLS_CONFIG
  const shopItemPool = [
    { id: 'curved_banana', name: 'CURVED BANANA', desc: 'Double tap a piece in the tray to rotate it', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Banana.png' },
    // sa ripensare: { id: 'swift_pizza', name: 'SHIFTING PEACH', desc: 'SWAP THE SELECTED PIECE WITH A RANDOM ONE (FREE).', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Peach.png' },
    { id: 'golden_apple', name: 'GOLDEN APPLE', desc: 'Increases coin earnings by 20%', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Apple Red.png' },
    { id: 'shining_tomato', name: 'SHINING TOMATO', desc: 'Chance to add +2 to line counter when scoring points', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Tomato.png' },
    { id: 'shielded_corn', name: 'SHIELDED CORN', desc: 'Every block placed on edge grants +10 points if placement completes lines/columns', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Corn.png' },
    { id: 'juicy_grapes', name: 'JUICY GRAPES', desc: 'Every combo > 8: +0.4 coins', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Grapes Green.png' },
    { id: 'light_strawberry', name: 'KABOOM STRAWBERRY', desc: 'Explodes a random 4x4 slot when closing the shop (Max 3 purchases)', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Strawberries.png', maxPurchases: 3 },
    { id: 'tiny_cherry', name: 'TINY CHERRY', desc: 'Unlocks and provides +5% chance to spawn a single block piece (1x1)', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Cherry.png' },
    { id: 'supreme_watermelon', name: 'SUPREME WATERMELON', desc: 'Completely clearing the board: +200 points and +2 coins', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Watermelon.png' },
    { id: 'rich_pumpkin', name: 'RICH PUMPKIN', desc: 'Chance that a piece with 5+ blocks doubles the counter increase when scoring', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Pumpkin.png' },
    { id: 'double_pear', name: 'DOUBLE PEAR', desc: 'Chance that clearing a line grants +2 to counter', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Pear.png' },
    { id: 'linear_orange', name: 'LINEAR ORANGE', desc: 'If no lines or columns cleared in 4 turns: +2 to counter and +50 points', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Orange.png' },
    { id: 'sour_lemon', name: 'SOUR LEMON', desc: 'If only columns cleared in 7 turns: +2 to counter', basePrice: 2, rarity: 'COMMON', icon: 'assets/shop/Lemon.png' },

    // RARE
    { id: 'single_donut', name: 'SINGLE BAGEL', desc: 'When clearing a 4x4 slot: 60% chance to gain +1 coin', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/34_donut.png' },
    { id: 'fluffy_bread', name: 'FLUFFY BREAD', desc: 'EVERY 15 TURNS: Earn +5% of total coins owned', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/07_bread.png' },
    { id: 'layered_sandwich', name: 'LAYERED SANDWICH', desc: 'Clear 2 or more lines simultaneously in one move: +50% bonus points', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/92_sandwich.png' },
    { id: 'half_taco', name: 'HALF TACO', desc: 'Roll cost in shop is reduced to 0.5 coins', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/99_taco.png' },
    { id: 'wealthy_chocolate', name: 'WEALTHY CHOCOLATE', desc: 'Every 900 points earned: +3 to counter', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/26_chocolate.png' },
    { id: 'resonant_friedegg', name: 'RESONANT FRIEDEGG', desc: 'Whenever you clear 3 or more lines in a single move: +2 to counter', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/38_friedegg.png' },
    { id: 'sweet_strawberry', name: 'SWEET STRAWBERRY', desc: '5% chance to spawn a Golden Piece. Clear its blocks for +0.40 coins each', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/90_strawberrycake.png' },
    { id: 'swift_pizza', name: 'SWIFT PIZZA', desc: 'Drag a piece off the top edge at the start of your turn to replace it with a random one', basePrice: 3, rarity: 'RARE', icon: 'assets/shop/Pizza.png' },

    // EPIC
    { id: 'wild_blue', name: 'WILD BLUE', desc: '10% chance to spawn a WILDPIECE (1x1). When placed, transforms into a random shape fitting the spot', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/blue.png' },
    { id: 'reactive_orange', name: 'REACTIVE ORANGE', desc: '7% chance to spawn a Reactive Orange Piece. Explodes on placement clearing adjacent blocks on 4 sides and corners', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/orange.png' },
    { id: 'overgrow_green', name: 'OVERGROW GREEN', desc: '7% chance to spawn an Overgrow Green Piece. When placed, it grows and covers up to 3 adjacent empty spots', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/green1.png' },
    { id: 'sakura_pink', name: 'SAKURA PINK', desc: '7% chance to spawn a Sakura Pink Piece. When placed and clearing a column, 3 random columns are destroyed sequentially', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/Pink.png' },
    { id: 'persistent_green', name: 'PERSISTENT GREEN', desc: 'When about to lose, grants 3 new pieces and +2 coins (single-use, non-repurchasable)', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/green.png' },
    { id: 'amplifying_purple', name: 'AMPLIFYING PURPLE', desc: '15% chance to spawn an Amplifying Purple Piece. Clearing horizontal rows causes upper blocks to fall down and fill empty spots', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/purple.png' },
    { id: 'magic_blue', name: 'MAGIC BLUE', desc: 'All shop items cost 0.5 coins less', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/blueShot.png' },
    { id: 'lava_red', name: 'LAVA RED', desc: '7% chance to spawn a Lava Red Piece. Moves down 1 row per turn, melting blocks underneath until reaching the bottom', basePrice: 4, rarity: 'EPIC', icon: 'assets/shop/red.png' }
  ];

  // Preload and decode all shop item icons so roll animations never stutter on image decoding
  let iconsPreloaded = false;
  function preloadShopIcons() {
    if (iconsPreloaded) return;
    iconsPreloaded = true;
    shopItemPool.forEach(item => {
      if (item.icon) {
        const img = new Image();
        img.src = item.icon;
        if (typeof img.decode === 'function') {
          img.decode().catch(() => { });
        }
      }
    });
    const frameImg = new Image();
    frameImg.src = 'assets/shop/card_frame.png';
  }

  const shopState = {
    coins: 0,
    lockMode: false,
    isRolling: false,
    purchasedItems: new Set(),
    items: [],
    scoreBoostPurchases: 0
  };

  // Verifica se tutti gli item e potenziamenti dello shop sono stati acquistati
  function isAllSkillsPurchased() {
    // Se ci sono ancora item regolari non acquistati nello shop corrente, non sono tutti acquistati
    if (shopState.items && shopState.items.length > 0) {
      const hasUnboughtRegular = shopState.items.some(i => !i.isScoreBoost && !i.isSoldOutSpecial && !i.purchased);
      if (hasUnboughtRegular) return false;
    }

    return shopItemPool.every(pItem => {
      const pSkill = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG[pItem.id]) ? SKILLS_CONFIG[pItem.id] : null;
      if (pItem.maxPurchases || (pSkill && pSkill.maxPurchases)) {
        const maxP = pItem.maxPurchases || pSkill.maxPurchases;
        const curP = (pSkill && typeof pSkill.purchasesCount === 'number') ? pSkill.purchasesCount : 0;
        return curP >= maxP || shopState.purchasedItems.has(pItem.id);
      }
      const isUnlocked = pSkill && pSkill.unlocked;
      return shopState.purchasedItems.has(pItem.id) || !!isUnlocked;
    });
  }

  // Genera l'offerta speciale: 1000 punti per 10 monete (max 6 volte)
  function createScoreBoostItem() {
    const curPurchases = shopState.scoreBoostPurchases || 0;
    return {
      id: 'score_boost',
      isScoreBoost: true,
      name: '+1000 SCORE BOOST',
      desc: '+1000 score points for 10 coins',
      basePrice: 10,
      rarity: 'SPECIAL',
      icon: 'assets/score-icon-shop.png',
      maxPurchases: 6,
      purchasesCount: curPurchases,
      purchased: curPurchases >= 6,
      locked: false
    };
  }

  // Calculate price considering MAGIC BLUE discount (non influisce su Score Boost che costa fissi 10 coins)
  function getEffectivePrice(item) {
    if (!item) return 0;
    if (item.isScoreBoost || item.id === 'score_boost') {
      return 10;
    }
    const isMagicBlueActive = typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.magic_blue && SKILLS_CONFIG.magic_blue.unlocked && SKILLS_CONFIG.magic_blue.active;
    const basePrice = item.basePrice || 2;
    return isMagicBlueActive ? Math.max(0.5, Number((basePrice - 0.5).toFixed(1))) : basePrice;
  }

  // Track recently shown items to maximize shop randomness and variety on consecutive rolls
  let recentShownIds = [];

  // Pick item from pool based on weighted rarity (Common 40%, Rare 38%, Epic 22%) with Fisher-Yates shuffling
  function pickWeightedItem(availablePool) {
    if (!availablePool || availablePool.length === 0) return null;

    // Prefer items that weren't shown in the immediate previous roll if we have enough options
    let poolToUse = availablePool;
    if (availablePool.length > 3) {
      const freshCandidates = availablePool.filter(item => !recentShownIds.includes(item.id));
      if (freshCandidates.length >= 1) {
        poolToUse = freshCandidates;
      }
    }

    const rand = Math.random();
    let targetRarity = 'COMMON';
    if (rand < 0.40) {
      targetRarity = 'COMMON';
    } else if (rand < 0.78) {
      targetRarity = 'RARE';
    } else {
      targetRarity = 'EPIC';
    }

    let candidates = poolToUse.filter(item => item.rarity === targetRarity);
    if (candidates.length === 0) {
      candidates = poolToUse;
    }

    // Fisher-Yates shuffle on candidates to guarantee maximum randomness
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled[0];
  }

  function bindInteraction(el, handler) {
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      handler(e);
    });
  }

  function updateShopActionsUI() {
    const normalActions = document.getElementById('shop-normal-actions');
    const exitActionRow = document.getElementById('shop-exit-action-row');
    const doneActionRow = document.getElementById('shop-done-action-row');
    const rollBtn = document.getElementById('shop-btn-roll-items');
    const lockBtn = document.getElementById('shop-btn-lock-roll');

    // Rimuove qualsiasi residuo del vecchio banner per non sporcare la riga dei bottoni
    const oldBanner = document.getElementById('shop-all-skills-banner');
    if (oldBanner) {
      oldBanner.remove();
    }

    const allPurchased = isAllSkillsPurchased();

    if (allPurchased) {
      // Quando tutti gli item sono stati acquistati: rotola e lock sono nascosti, solo il tasto exit è visibile
      if (doneActionRow) doneActionRow.classList.add('hidden');
      if (normalActions) normalActions.classList.add('hidden');
      if (exitActionRow) exitActionRow.classList.remove('hidden');
    } else {
      if (rollBtn) rollBtn.style.display = '';
      if (lockBtn) lockBtn.style.display = '';

      if (window.TutorialManager && window.TutorialManager.isActive) {
        if (lockBtn) lockBtn.style.display = 'none';
        if (rollBtn) rollBtn.style.display = 'none';
        if (doneActionRow) doneActionRow.classList.add('hidden');
        if (normalActions) normalActions.classList.add('hidden');
        if (exitActionRow) exitActionRow.classList.remove('hidden');
      } else if (shopState.lockMode) {
        if (normalActions) normalActions.classList.add('hidden');
        if (exitActionRow) exitActionRow.classList.add('hidden');
        if (doneActionRow) doneActionRow.classList.remove('hidden');
      } else {
        if (doneActionRow) doneActionRow.classList.add('hidden');
        if (normalActions) normalActions.classList.remove('hidden');
        if (exitActionRow) exitActionRow.classList.remove('hidden');
      }
    }
  }

  function updateLockModeUI() {
    updateShopActionsUI();
  }

  function updateShopCoins() {
    const coinsValueEl = document.getElementById('shop-coins-value');
    if (coinsValueEl) {
      const displayVal = (typeof userCoins !== 'undefined') ? (Number.isInteger(userCoins) ? userCoins : Number(userCoins.toFixed(1))) : shopState.coins;
      coinsValueEl.textContent = displayVal;
    }
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
  }

  function renderCards(isPreparingRoll = false) {
    const shopCardsEl = document.getElementById('shop-cards');
    const coinsValueEl = document.getElementById('shop-coins-value');
    if (!shopCardsEl) return;
    shopCardsEl.innerHTML = '';

    shopState.items.forEach((item, index) => {
      const isScoreBoost = item.isScoreBoost || item.id === 'score_boost';
      const isSpecialSoldOut = !isScoreBoost && (item.isSoldOutSpecial || item.name === 'SOLDOUT SPECIAL');

      // Check if skill is already unlocked in SKILLS_CONFIG
      const skillConfig = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG[item.id]) ? SKILLS_CONFIG[item.id] : null;
      const isMultiPurchase = isScoreBoost || !!(item.maxPurchases || (skillConfig && skillConfig.maxPurchases));
      const maxP = isScoreBoost ? 6 : (item.maxPurchases || (skillConfig && skillConfig.maxPurchases) || 1);
      const currentPurchases = isScoreBoost
        ? (shopState.scoreBoostPurchases || 0)
        : ((skillConfig && typeof skillConfig.purchasesCount === 'number') ? skillConfig.purchasesCount : (item.purchasesCount || 0));

      const isMaxedOut = isMultiPurchase ? (currentPurchases >= maxP) : (skillConfig && skillConfig.unlocked);
      const isPurchased = isScoreBoost ? isMaxedOut : (item.purchased || isMaxedOut);

      const prepClass = (isPreparingRoll && !item.locked) ? 'prepare-slide-in' : '';
      const card = document.createElement('div');
      card.className = `item-card ${isScoreBoost ? 'score-boost-card' : ''} ${isPurchased ? 'purchased' : ''} ${(shopState.lockMode && !isSpecialSoldOut) ? 'lock-mode-active' : ''} ${item.locked ? 'locked' : ''} ${isSpecialSoldOut ? 'special-soldout' : ''} ${prepClass}`;
      card.dataset.index = index;
      if (item.id) card.dataset.skillId = item.id;

      const slotNum = String(index + 1).padStart(2, '0');

      const iconHtml = (isSpecialSoldOut || !item.icon)
        ? ''
        : `<img src="${item.icon}" alt="${item.name}" class="item-icon pixel-art" decoding="async">`;

      const rarityHtml = (isSpecialSoldOut || !item.rarity)
        ? ''
        : `<span class="rarity-badge ${item.rarity.toLowerCase()}">${item.rarity}</span>`;

      const effectivePrice = getEffectivePrice(item);
      const buyBtnHtml = (isSpecialSoldOut || isPurchased)
        ? ''
        : `<div class="buy-button-container">
            <div class="buy-btn-pixel">
              <span class="buy-label">BUY</span>
              <span class="buy-price">${effectivePrice}G</span>
            </div>
          </div>`;

      const displayDesc = isMultiPurchase
        ? `${item.desc} (${currentPurchases}/${maxP})`
        : item.desc;

      card.innerHTML = `
        <div class="card-slot-number">${slotNum}</div>
        <div class="card-left-col">
          <div class="card-icon-container">
            ${iconHtml}
          </div>
          ${rarityHtml}
        </div>
        <div class="card-info">
          <div class="item-title">${item.name}</div>
          <div class="item-desc">${displayDesc}</div>
          ${buyBtnHtml}
        </div>
        ${item.locked ? '<div class="locked-badge">🔒 LOCKED</div>' : ''}
        ${isPurchased ? `<div class="sold-out-badge">${isMaxedOut ? 'SOLD OUT' : 'BOUGHT'}</div>` : ''}
      `;

      bindInteraction(card, (e) => onCardClick(index, card, e));
      shopCardsEl.appendChild(card);
    });

    if (coinsValueEl) {
      const displayVal = (typeof userCoins !== 'undefined') ? (Number.isInteger(userCoins) ? userCoins : Number(userCoins.toFixed(1))) : shopState.coins;
      coinsValueEl.textContent = displayVal;
    }

    updateShopActionsUI();
  }

  function onCardClick(index, cardEl, event) {
    if (shopState.isRolling) return;
    const item = shopState.items[index];
    if (!item || item.isSoldOutSpecial || item.name === 'SOLDOUT SPECIAL') return;

    if (item.isScoreBoost || item.id === 'score_boost') {
      buyItem(index, cardEl, event);
      return;
    }

    if (shopState.lockMode) {
      const skillConfig = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG[item.id]) ? SKILLS_CONFIG[item.id] : null;
      const isMultiPurchase = !!(item.maxPurchases || (skillConfig && skillConfig.maxPurchases));
      const maxP = item.maxPurchases || (skillConfig && skillConfig.maxPurchases) || 1;
      const currentPurchases = (skillConfig && typeof skillConfig.purchasesCount === 'number') ? skillConfig.purchasesCount : (item.purchasesCount || 0);
      const isMaxedOut = isMultiPurchase ? (currentPurchases >= maxP) : (skillConfig && skillConfig.unlocked);
      if (item.purchased || isMaxedOut) return;
      item.locked = !item.locked;
      audio.playClick();
      renderCards();
      if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();
      return;
    }

    buyItem(index, cardEl, event);
  }

  function buyItem(index, cardEl, event) {
    const item = shopState.items[index];
    if (!item) return;

    // Se è l'offerta speciale Score Boost (+1000 punti per 10 monete, max 6 volte)
    if (item.isScoreBoost || item.id === 'score_boost') {
      const curBoosts = shopState.scoreBoostPurchases || 0;
      if (curBoosts >= 6) return;

      const boostPrice = 10;
      const currentCoins = (typeof userCoins !== 'undefined') ? userCoins : shopState.coins;

      if (currentCoins >= boostPrice) {
        if (typeof userCoins !== 'undefined') {
          userCoins = Math.max(0, userCoins - boostPrice);
          userCoins = Math.round(userCoins * 100) / 100;
          if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
        }
        shopState.coins = currentCoins - boostPrice;
        shopState.scoreBoostPurchases = curBoosts + 1;
        item.purchasesCount = shopState.scoreBoostPurchases;

        if (shopState.scoreBoostPurchases >= 6) {
          item.purchased = true;
        }

        // Assegna +1000 punti allo score attuale
        if (typeof updateScore === 'function') {
          updateScore(1000);
        }

        if (audio.playPurchase) audio.playPurchase();
        else audio.playCoin();

        // Floating text animation (-10G)
        const floating = document.createElement('div');
        floating.className = 'floating-text';
        floating.textContent = `-10G`;
        const clientX = event ? (event.clientX || window.innerWidth / 2) : window.innerWidth / 2;
        const clientY = event ? (event.clientY || window.innerHeight / 2) : window.innerHeight / 2;
        floating.style.left = `${clientX - 30}px`;
        floating.style.top = `${clientY - 20}px`;
        document.body.appendChild(floating);
        setTimeout(() => floating.remove(), 1200);

        // Notifica e popup
        if (typeof triggerSkillActivationPopup === 'function') {
          triggerSkillActivationPopup('Score Boost 🏆', ['<span class="reward-yellow">+1000 SCORE POINTS!</span>'], 'EPIC');
        }

        renderCards();
        if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();
      } else {
        audio.playError();
        renderCards();

        const coinsDisplay = document.getElementById('shop-coins-display');
        if (coinsDisplay) {
          coinsDisplay.classList.add('insufficient-coins-shake');
          setTimeout(() => {
            coinsDisplay.classList.remove('insufficient-coins-shake');
          }, 450);
        }
      }
      return;
    }

    const skillConfig = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG[item.id]) ? SKILLS_CONFIG[item.id] : null;
    const isMultiPurchase = !!(item.maxPurchases || (skillConfig && skillConfig.maxPurchases));
    const maxP = item.maxPurchases || (skillConfig && skillConfig.maxPurchases) || 1;
    const currentPurchases = (skillConfig && typeof skillConfig.purchasesCount === 'number') ? skillConfig.purchasesCount : (item.purchasesCount || 0);
    const isMaxedOut = isMultiPurchase ? (currentPurchases >= maxP) : (skillConfig && skillConfig.unlocked);
    if (item.purchased || isMaxedOut) return;

    const effectivePrice = getEffectivePrice(item);
    const currentCoins = (typeof userCoins !== 'undefined') ? userCoins : shopState.coins;

    if (currentCoins >= effectivePrice) {
      if (typeof userCoins !== 'undefined') {
        userCoins = Math.max(0, userCoins - effectivePrice);
        userCoins = Math.round(userCoins * 100) / 100;
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }
      shopState.coins = currentCoins - effectivePrice;
      item.purchased = true;
      item.locked = false;

      if (isMultiPurchase) {
        if (skillConfig) {
          skillConfig.unlocked = true;
          skillConfig.active = true;
          skillConfig.purchasesCount = (skillConfig.purchasesCount || 0) + 1;
          skillConfig.pendingExplosions = (skillConfig.pendingExplosions || 0) + 1;
          if (skillConfig.purchasesCount >= maxP) {
            shopState.purchasedItems.add(item.id);
          }
        }
      } else {
        shopState.purchasedItems.add(item.id);
        if (skillConfig) {
          skillConfig.unlocked = true;
          skillConfig.active = true;
        }
      }

      if (typeof updateSkillUI === 'function') updateSkillUI();

      if (audio.playPurchase) audio.playPurchase();
      else audio.playCoin();

      // Floating text animation (-effectivePrice G)
      const floating = document.createElement('div');
      floating.className = 'floating-text';
      floating.textContent = `-${effectivePrice}G`;
      const clientX = event ? (event.clientX || window.innerWidth / 2) : window.innerWidth / 2;
      const clientY = event ? (event.clientY || window.innerHeight / 2) : window.innerHeight / 2;
      floating.style.left = `${clientX - 30}px`;
      floating.style.top = `${clientY - 20}px`;
      document.body.appendChild(floating);
      setTimeout(() => floating.remove(), 1200);

      renderCards();
      if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();

      // Trigger High-Impact Skill Showcase Modal!
      showSkillPurchaseShowcase(item, skillConfig);

      // Se con questo acquisto tutti gli item sono stati acquistati
      if (isAllSkillsPurchased()) {
        updateShopActionsUI();
        setTimeout(() => {
          shopState.items = [createScoreBoostItem()];
          renderCards();
        }, 650);
      }
    } else {
      // Insufficient coins: Error SFX (DO NOT auto-lock item per user request!)
      audio.playError();
      renderCards();

      const coinsDisplay = document.getElementById('shop-coins-display');
      if (coinsDisplay) {
        coinsDisplay.classList.add('insufficient-coins-shake');
        setTimeout(() => {
          coinsDisplay.classList.remove('insufficient-coins-shake');
        }, 450);
      }
    }
  }

  // =========================================================================
  // HIGH-IMPACT 3-SECOND SKILL SHOWCASE MODAL
  // =========================================================================
  let showcaseTimeout = null;
  let showcaseTypewriterInterval = null;

  function showSkillPurchaseShowcase(item, skillConfig) {
    const overlay = document.getElementById('skill-purchase-showcase-overlay');
    if (!overlay) return;

    if (showcaseTimeout) {
      clearTimeout(showcaseTimeout);
      showcaseTimeout = null;
    }
    if (showcaseTypewriterInterval) {
      clearInterval(showcaseTypewriterInterval);
      showcaseTypewriterInterval = null;
    }

    const titleEl = document.getElementById('skill-showcase-title');
    const iconEl = document.getElementById('skill-showcase-icon');
    const descEl = document.getElementById('skill-showcase-desc');
    const raysEl = document.getElementById('skill-showcase-rays');

    if (titleEl) titleEl.textContent = item.name || 'NEW SKILL';
    if (iconEl) {
      iconEl.src = item.icon || '';
      iconEl.alt = item.name || 'Skill';
    }

    // Set matching wavy rays tone based on rarity
    const rarity = (item.rarity || 'RARE').toUpperCase();
    if (raysEl) {
      if (rarity === 'COMMON') {
        raysEl.style.background = 'repeating-conic-gradient(from 0deg, rgba(74, 222, 128, 0.45) 0deg 15deg, transparent 15deg 30deg)';
      } else if (rarity === 'EPIC') {
        raysEl.style.background = 'repeating-conic-gradient(from 0deg, rgba(224, 64, 251, 0.45) 0deg 15deg, transparent 15deg 30deg)';
      } else if (rarity === 'RARE') {
        raysEl.style.background = 'repeating-conic-gradient(from 0deg, rgba(0, 229, 255, 0.45) 0deg 15deg, transparent 15deg 30deg)';
      } else {
        raysEl.style.background = 'repeating-conic-gradient(from 0deg, rgba(255, 235, 59, 0.48) 0deg 15deg, transparent 15deg 30deg)';
      }
    }

    const isMultiPurchase = !!(item.maxPurchases || (skillConfig && skillConfig.maxPurchases));
    const maxP = item.maxPurchases || (skillConfig && skillConfig.maxPurchases) || 1;
    const currentPurchases = (skillConfig && typeof skillConfig.purchasesCount === 'number')
      ? skillConfig.purchasesCount
      : (item.purchasesCount || 1);
    const displayDesc = isMultiPurchase
      ? `${item.desc || ''} (${currentPurchases}/${maxP})`
      : (item.desc || '');

    // Typewriter effect (Macchina da scrivere)
    if (descEl) {
      descEl.textContent = '';
      descEl.classList.remove('typed');
      let charIndex = 0;
      const totalChars = displayDesc.length;
      const typeSpeed = 11; // 10% slower typewriter speed (~11ms per char)

      showcaseTypewriterInterval = setInterval(() => {
        if (charIndex < totalChars) {
          descEl.textContent += displayDesc.charAt(charIndex);
          charIndex++;
        } else {
          clearInterval(showcaseTypewriterInterval);
          showcaseTypewriterInterval = null;
          descEl.classList.add('typed');
        }
      }, typeSpeed);
    }

    // Play celebratory arcade unlock jingle
    if (audio && typeof audio.playShowcaseUnlock === 'function') {
      audio.playShowcaseUnlock();
    } else if (audio && typeof audio.playPurchase === 'function') {
      audio.playPurchase();
    }

    // Open showcase overlay with transition
    overlay.classList.remove('hidden', 'fade-out');
    void overlay.offsetWidth; // Force reflow
    overlay.classList.add('visible');

    const closeShowcase = () => {
      if (showcaseTimeout) {
        clearTimeout(showcaseTimeout);
        showcaseTimeout = null;
      }
      if (showcaseTypewriterInterval) {
        clearInterval(showcaseTypewriterInterval);
        showcaseTypewriterInterval = null;
      }
      overlay.classList.remove('visible');
      overlay.classList.add('fade-out');
      if (audio && typeof audio.playClick === 'function') audio.playClick();
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('fade-out');
        if (descEl) descEl.classList.remove('typed');
      }, 200);
      overlay.onclick = null;
    };

    // Auto-close after 3 seconds (3000ms)
    showcaseTimeout = setTimeout(() => {
      closeShowcase();
    }, 4000);

    // Tap anywhere on the screen to close immediately
    overlay.onclick = (e) => {
      e.stopPropagation();
      closeShowcase();
    };
  }

  function initRandomItems() {
    if (isAllSkillsPurchased()) {
      shopState.items = [createScoreBoostItem()];
      return;
    }
    const currentPool = [...shopItemPool];
    const initialItems = [];

    for (let i = 0; i < 3; i++) {
      const chosen = pickWeightedItem(currentPool);
      if (chosen) {
        initialItems.push({
          ...chosen,
          locked: false,
          purchased: false
        });
        const idx = currentPool.findIndex(p => p.id === chosen.id);
        if (idx >= 0) currentPool.splice(idx, 1);
      }
    }

    shopState.items = initialItems;
    recentShownIds = initialItems.map(i => i.id).filter(Boolean);
  }

  function performRoll(isFree = false) {
    if (isAllSkillsPurchased()) {
      shopState.items = [createScoreBoostItem()];
      renderCards();
      updateShopActionsUI();
      return;
    }
    if (shopState.isRolling) return;
    if (shopState.items.length > 0 && shopState.items.every(i => i.locked)) return;

    const isHalfTacoActive = typeof SKILLS_CONFIG !== 'undefined' && (
      (SKILLS_CONFIG.half_taco && SKILLS_CONFIG.half_taco.unlocked && SKILLS_CONFIG.half_taco.active) ||
      (SKILLS_CONFIG.desperate_taco && SKILLS_CONFIG.desperate_taco.unlocked && SKILLS_CONFIG.desperate_taco.active)
    );
    const rollCost = isHalfTacoActive ? 0.5 : 1.0;

    if (!isFree) {
      const currentCoins = (typeof userCoins !== 'undefined') ? userCoins : shopState.coins;
      if (currentCoins < rollCost) {
        audio.playError();
        const coinsDisplay = document.getElementById('shop-coins-display');
        if (coinsDisplay) {
          coinsDisplay.classList.add('insufficient-coins-shake');
          setTimeout(() => {
            coinsDisplay.classList.remove('insufficient-coins-shake');
          }, 450);
        }
        return;
      }

      // Deduct rollCost (0.5 if Half Taco active, otherwise 1.0)
      if (typeof userCoins !== 'undefined') {
        userCoins = Math.max(0, Number((userCoins - rollCost).toFixed(2)));
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }
      shopState.coins = Math.max(0, Number((currentCoins - rollCost).toFixed(2)));
    }

    shopState.isRolling = true;
    audio.playRoll();

    const shopCardsEl = document.getElementById('shop-cards');

    // Se non ci sono ancora carte nel negozio (primo roll gratuito a inizio gioco),
    // saltiamo la fase di uscita (slide-out) ed eseguiamo direttamente l'animazione d'entrata delle 3 carte!
    if (shopState.items.length === 0) {
      const availablePool = shopItemPool.filter(pItem => {
        const pSkill = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG[pItem.id]) ? SKILLS_CONFIG[pItem.id] : null;
        if (pItem.maxPurchases || (pSkill && pSkill.maxPurchases)) {
          const maxP = pItem.maxPurchases || pSkill.maxPurchases;
          const curP = (pSkill && typeof pSkill.purchasesCount === 'number') ? pSkill.purchasesCount : 0;
          if (curP >= maxP || shopState.purchasedItems.has(pItem.id)) return false;
          return true;
        }
        const isUnlocked = pSkill && pSkill.unlocked;
        if (shopState.purchasedItems.has(pItem.id) || isUnlocked) return false;
        return true;
      });

      const currentPool = [...availablePool];
      const newPicked = [];

      for (let i = 0; i < 3; i++) {
        const chosen = pickWeightedItem(currentPool);
        if (chosen) {
          newPicked.push({
            ...chosen,
            locked: false,
            purchased: false
          });
          const idx = currentPool.findIndex(p => p.id === chosen.id);
          if (idx >= 0) currentPool.splice(idx, 1);
        } else {
          newPicked.push({ name: 'SOLDOUT SPECIAL', desc: 'ALL ITEMS IN SHOP ACQUIRED!', basePrice: 0, rarity: '', icon: '', isSoldOutSpecial: true });
        }
      }

      shopState.items = newPicked;
      recentShownIds = shopState.items.map(i => i.id).filter(Boolean);

      // Render delle carte con classe prepare-slide-in (invisibili fuori dallo schermo a sinistra)
      renderCards(true);

      requestAnimationFrame(() => {
        const newCardEls = shopCardsEl ? shopCardsEl.querySelectorAll('.item-card') : [];
        let enterStagger = 0;
        shopState.items.forEach((item, index) => {
          const targetEl = newCardEls[index];
          if (targetEl) {
            const delay = enterStagger * 90;
            setTimeout(() => {
              if (targetEl) {
                targetEl.classList.remove('prepare-slide-in');
                targetEl.classList.add('slide-in-left');
              }
            }, delay);
            enterStagger++;
          }
        });

        const totalEnterDuration = Math.max(400, enterStagger * 90 + 400);

        setTimeout(() => {
          const finalCardEls = shopCardsEl ? shopCardsEl.querySelectorAll('.item-card') : [];
          finalCardEls.forEach(c => c.classList.remove('slide-in-left', 'prepare-slide-in', 'slide-out-right'));
          shopState.isRolling = false;
          if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();
        }, totalEnterDuration);
      });

      return;
    }

    const cardEls = shopCardsEl ? shopCardsEl.querySelectorAll('.item-card') : [];
    let nonLockedStagger = 0;

    shopState.items.forEach((item, index) => {
      if (!item.locked && cardEls[index]) {
        setTimeout(() => {
          if (cardEls[index]) cardEls[index].classList.add('slide-out-right');
        }, nonLockedStagger * 120);
        nonLockedStagger++;
      }
    });

    const exitDuration = Math.max(350, nonLockedStagger * 120 + 320);

    setTimeout(() => {
      const nonLockedCount = shopState.items.filter(i => !i.locked).length;
      if (nonLockedCount > 0) {
        const availablePool = shopItemPool.filter(pItem => {
          const pSkill = (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG[pItem.id]) ? SKILLS_CONFIG[pItem.id] : null;
          if (pItem.maxPurchases || (pSkill && pSkill.maxPurchases)) {
            const maxP = pItem.maxPurchases || pSkill.maxPurchases;
            const curP = (pSkill && typeof pSkill.purchasesCount === 'number') ? pSkill.purchasesCount : 0;
            if (curP >= maxP || shopState.purchasedItems.has(pItem.id)) return false;
            const isLockedOnBoard = shopState.items.some(i => i.locked && i.id === pItem.id);
            if (isLockedOnBoard) return false;
            return true;
          }
          const isUnlocked = pSkill && pSkill.unlocked;
          if (shopState.purchasedItems.has(pItem.id) || isUnlocked) return false;
          const isLockedOnBoard = shopState.items.some(i => i.locked && i.id === pItem.id);
          if (isLockedOnBoard) return false;
          return true;
        });

        const currentPool = [...availablePool];
        const newPicked = [];

        for (let i = 0; i < nonLockedCount; i++) {
          const chosen = pickWeightedItem(currentPool);
          if (chosen) {
            newPicked.push(chosen);
            const idx = currentPool.findIndex(p => p.id === chosen.id);
            if (idx >= 0) currentPool.splice(idx, 1);
          } else {
            newPicked.push({ name: 'SOLDOUT SPECIAL', desc: 'ALL ITEMS IN SHOP ACQUIRED!', basePrice: 0, rarity: '', icon: '', isSoldOutSpecial: true });
          }
        }

        let pickIdx = 0;
        shopState.items = shopState.items.map((item) => {
          if (item.locked) return item;
          const fresh = newPicked[pickIdx++];
          return {
            ...fresh,
            locked: false,
            purchased: false
          };
        });

        recentShownIds = shopState.items.map(i => i.id).filter(Boolean);
      }

      renderCards(true);

      requestAnimationFrame(() => {
        const newCardEls = shopCardsEl ? shopCardsEl.querySelectorAll('.item-card') : [];
        let enterStagger = 0;
        shopState.items.forEach((item, index) => {
          if (!item.locked && newCardEls[index]) {
            const targetEl = newCardEls[index];
            const delay = enterStagger * 90;
            setTimeout(() => {
              if (targetEl) {
                targetEl.classList.remove('prepare-slide-in');
                targetEl.classList.add('slide-in-left');
              }
            }, delay);
            enterStagger++;
          }
        });

        const totalEnterDuration = Math.max(400, enterStagger * 90 + 400);

        setTimeout(() => {
          const finalCardEls = shopCardsEl ? shopCardsEl.querySelectorAll('.item-card') : [];
          finalCardEls.forEach(c => c.classList.remove('slide-in-left', 'prepare-slide-in', 'slide-out-right'));
          shopState.isRolling = false;
          if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();
        }, totalEnterDuration);
      });

    }, exitDuration);
  }

  function setupEventListeners() {
    const btnLockRoll = document.getElementById('shop-btn-lock-roll');
    const btnRollItems = document.getElementById('shop-btn-roll-items');
    const btnExitShop = document.getElementById('shop-btn-exit-shop');
    const btnDoneLock = document.getElementById('shop-btn-done-lock');
    const btnClearLock = document.getElementById('shop-btn-clear-lock');
    const coinsDisplay = document.getElementById('shop-coins-display');
    const btnTestSkills = document.getElementById('shop-test-skills-btn');
    const closeTestModalBtn = document.getElementById('close-test-modal-btn');

    bindInteraction(btnLockRoll, () => {
      shopState.lockMode = true;
      audio.playLock();
      updateLockModeUI();
      renderCards();
    });

    bindInteraction(btnDoneLock, () => {
      shopState.lockMode = false;
      audio.playClick();
      updateLockModeUI();
      renderCards();
    });

    bindInteraction(btnClearLock, () => {
      const hasLocks = shopState.items.some(i => i.locked);
      if (!hasLocks) return;
      shopState.items.forEach(i => i.locked = false);
      audio.playClick();
      renderCards();
      if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();
    });

    bindInteraction(btnRollItems, () => {
      if (isAllSkillsPurchased()) return;
      performRoll(false);
    });

    bindInteraction(btnExitShop, () => {
      audio.playClick();
      closeShop();
    });

    bindInteraction(coinsDisplay, () => {
      if (typeof addCoins === 'function') {
        addCoins(100);
      } else if (typeof userCoins !== 'undefined') {
        userCoins += 100;
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }
      shopState.coins += 100;
      renderCards();
      audio.playCoin();
    });

    // Test Skills Button Handler (Under Exit Shop)
    bindInteraction(btnTestSkills, () => {
      audio.playClick();
      openTestSkillsModal();
    });

    if (closeTestModalBtn) {
      bindInteraction(closeTestModalBtn, () => {
        audio.playClick();
        closeTestSkillsModal();
      });
    }

    const testModalBackdrop = document.getElementById('shop-test-modal');
    if (testModalBackdrop) {
      testModalBackdrop.addEventListener('click', (e) => {
        const wrapper = testModalBackdrop.querySelector('.skills-modal-wrapper');
        if (!wrapper || !wrapper.contains(e.target)) {
          if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
          closeTestSkillsModal();
        }
      });
    }

  }

  function openTestSkillsModal(readOnly = false) {
    const modal = document.getElementById('shop-test-modal');
    const listEl = document.getElementById('shop-test-skills-list');
    const outsideTitle = document.getElementById('skills-outside-title');
    if (!modal || !listEl) return;

    if (outsideTitle) {
      outsideTitle.textContent = readOnly ? 'SKILL CODEX' : 'TEST ALL SKILLS';
    }

    listEl.innerHTML = '';

    if (typeof SKILLS_CONFIG !== 'undefined') {
      const activeList = [];
      const inactiveList = [];

      for (const key in SKILLS_CONFIG) {
        const s = SKILLS_CONFIG[key];
        if (s.consumed) continue;
        if (s.unlocked && s.active) {
          activeList.push(s);
        } else {
          inactiveList.push(s);
        }
      }

      const renderSkillRow = (s, isActive) => {
        const row = document.createElement('div');
        row.className = 'test-skill-row' + (isActive ? '' : ' inactive-skill-row');

        const poolItem = typeof shopItemPool !== 'undefined' ? shopItemPool.find(item => item.id === s.id) : null;
        const iconSrc = (poolItem && poolItem.icon) ? poolItem.icon : s.icon;
        const isImg = iconSrc && (iconSrc.includes('/') || iconSrc.includes('.png'));
        const iconHTML = isImg
          ? `<img src="${iconSrc}" style="width: 28px; height: 28px; object-fit: contain; flex-shrink: 0;" />`
          : `<span style="font-size: 22px; flex-shrink: 0;">${iconSrc || '✨'}</span>`;

        let actionBtnHTML = '';
        if (!readOnly) {
          actionBtnHTML = `
            <button id="test-toggle-${s.id}" class="pixel-btn-small ${isActive ? 'green' : 'red'}" style="font-size: 9px; padding: 6px 10px; flex-shrink: 0;">
              ${isActive ? 'ACTIVE' : 'OFF'}
            </button>
          `;
        }

        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding-right: 6px;">
            ${iconHTML}
            <div style="min-width: 0;">
              <div style="font-weight: bold; color: #ffffff !important; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 1px 1px 0 #000;">${s.name}</div>
              <div style="color: #ffffff !important; opacity: 0.95; font-size: 10.5px; line-height: 1.35; text-shadow: 1px 1px 0 #000;">${s.description}</div>
            </div>
          </div>
          ${actionBtnHTML}
        `;

        listEl.appendChild(row);

        if (!readOnly) {
          const btn = row.querySelector(`#test-toggle-${s.id}`);
          if (btn) {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (!s.unlocked || !s.active) {
                s.unlocked = true;
                s.active = true;
              } else {
                s.unlocked = false;
                s.active = false;
              }
              audio.playClick();
              if (typeof updateSkillUI === 'function') updateSkillUI();
              renderCards();
              openTestSkillsModal(readOnly);
            });
          }
        }
      };

      // 1. Active skills on top
      if (activeList.length > 0) {
        const header = document.createElement('div');
        header.className = 'skills-group-header';
        header.textContent = '⚡ ACTIVE SKILLS (' + activeList.length + ')';
        listEl.appendChild(header);

        activeList.forEach(s => renderSkillRow(s, true));
      }

      // 2. Inactive skills in grey below
      if (inactiveList.length > 0) {
        const header = document.createElement('div');
        header.className = 'skills-group-header';
        header.style.color = '#64748b';
        header.textContent = '🔒 NOT ACTIVE SKILLS (' + inactiveList.length + ')';
        listEl.appendChild(header);

        inactiveList.forEach(s => renderSkillRow(s, false));
      }
    }

    modal.classList.remove('hidden');
  }

  function closeTestSkillsModal() {
    const modal = document.getElementById('shop-test-modal');
    if (modal) modal.classList.add('hidden');
  }

  function setupTutorialShop() {
    shopState.lockMode = false;

    if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.sakura_pink) {
      SKILLS_CONFIG.sakura_pink.unlocked = false;
      SKILLS_CONFIG.sakura_pink.active = false;
    }

    if (typeof userCoins !== 'undefined') {
      userCoins = Math.max(userCoins, 10);
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    }
    shopState.coins = (typeof userCoins !== 'undefined') ? userCoins : 10;

    const poolItem = shopItemPool.find(i => i.id === 'sakura_pink');
    const sakuraItem = poolItem ? { ...poolItem, locked: false, purchased: false } : {
      id: 'sakura_pink',
      name: 'SAKURA PINK',
      desc: '7% chance to spawn a Sakura Pink Piece. When placed and clearing a column, 3 random columns are destroyed sequentially',
      basePrice: 4,
      rarity: 'EPIC',
      icon: 'assets/shop/Pink.png',
      locked: false,
      purchased: false
    };

    if (shopState.items.length === 0) {
      initRandomItems();
    }
    // Ensure slot 1 (item 0) is a different ability
    if (!shopState.items[0] || shopState.items[0].id === 'sakura_pink') {
      const firstSkill = shopItemPool.find(i => i.id !== 'sakura_pink') || {
        id: 'curved_banana',
        name: 'CURVED BANANA',
        desc: 'Double tap a piece in the tray to rotate it',
        basePrice: 2,
        rarity: 'COMMON',
        icon: 'assets/shop/Banana.png'
      };
      shopState.items[0] = { ...firstSkill, locked: false, purchased: false };
    }
    // Put SAKURA PINK in the second slot (index 1)
    shopState.items[1] = sakuraItem;
  }

  function openShop(isAutoRoll = false) {
    if (window.currentSelectedGameMode === 'vintage') return;
    preloadShopIcons();
    const overlay = document.getElementById('shop-render-overlay');
    if (!overlay) return;

    if (window.TutorialManager && window.TutorialManager.isActive) {
      setupTutorialShop();
    } else {
      if (shopState.items && shopState.items.length === 2 &&
        shopState.items[1] && shopState.items[1].id === 'sakura_pink' &&
        shopState.items[0] && shopState.items[0].id === 'curved_banana' &&
        !shopState.purchasedItems?.has('sakura_pink')) {
        shopState.items = [];
      }
      if (isAllSkillsPurchased()) {
        shopState.items = [createScoreBoostItem()];
      } else if (!isAutoRoll && shopState.items.length === 0) {
        initRandomItems();
      }
    }

    shopState.coins = (typeof userCoins !== 'undefined') ? userCoins : 0;
    renderCards();
    updateShopActionsUI();

    // 1. Unhide overlay first so container has valid non-zero dimensions
    overlay.classList.remove('hidden', 'box-wipe-out');
    requestAnimationFrame(() => {
      overlay.classList.add('box-wipe-in');
    });
    if (typeof window.updateBannerVisibility === 'function') {
      window.updateBannerVisibility();
    }

    if (window.RetroAudio && typeof window.RetroAudio.playShopOpen === 'function') {
      window.RetroAudio.playShopOpen();
    }

    // 2. Instantiate or resize BalatroShader after container is unhidden
    if (!window.shopBalatroShaderInstance && typeof BalatroShader !== 'undefined') {
      try {
        window.shopBalatroShaderInstance = new BalatroShader({
          container: "#shop-balatro-bg-container",
          colours: { c1: "#C084FC", c2: "#7E22CE", c3: "#2E0A4E" },
          speed: 0.36,
          contrast: 1.2,
          spinAmount: 0.4,
          pixelSizeFac: 1000,
          spinEase: 0.5,
          offsetX: 0.0,
          offsetY: -0.12
        });
      } catch (e) {
        console.warn("Shop BalatroShader initialization error:", e);
      }
    } else if (window.shopBalatroShaderInstance) {
      if (typeof window.shopBalatroShaderInstance.resume === 'function') {
        window.shopBalatroShaderInstance.resume();
      }
      if (typeof window.shopBalatroShaderInstance.resize === 'function') {
        window.shopBalatroShaderInstance.resize();
      }
    }
  }

  function closeShop() {
    if (typeof window.setTrayDisabled === 'function') {
      window.setTrayDisabled(false);
    }
    const overlay = document.getElementById('shop-render-overlay');
    if (!overlay) return;

    overlay.classList.remove('box-wipe-in');
    void overlay.offsetWidth;
    overlay.classList.add('box-wipe-out');

    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('box-wipe-out');
      if (window.shopBalatroShaderInstance && typeof window.shopBalatroShaderInstance.pause === 'function') {
        window.shopBalatroShaderInstance.pause();
      }
      if (typeof window.updateBannerVisibility === 'function') {
        window.updateBannerVisibility();
      }

      // Check Kaboom Strawberry pending explosions!
      if (typeof window.triggerKaboomStrawberryExplosion === 'function') {
        window.triggerKaboomStrawberryExplosion();
      }
    }, 120);
  }

  function triggerAutoFreeShopRoll(isGameStartRoll = false) {
    if (isAllSkillsPurchased()) {
      openShop(false);
      return;
    }
    if (isGameStartRoll) {
      shopState.items = [];
    }
    const isFirstRoll = isGameStartRoll || (shopState.items.length === 0);
    openShop(isFirstRoll);
    setTimeout(() => {
      performRoll(true);
    }, 380);
  }

  function resetShopState() {
    if (shopState.purchasedItems) shopState.purchasedItems.clear();
    shopState.items = [];
    shopState.lockMode = false;
    shopState.isRolling = false;
    shopState.scoreBoostPurchases = 0;
    if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.light_strawberry) {
      SKILLS_CONFIG.light_strawberry.purchasesCount = 0;
      SKILLS_CONFIG.light_strawberry.pendingExplosions = 0;
    }
  }

  function getShopSnapshot() {
    return {
      coins: (typeof userCoins !== 'undefined') ? userCoins : shopState.coins,
      lockMode: !!shopState.lockMode,
      purchasedItems: Array.from(shopState.purchasedItems || []),
      scoreBoostPurchases: shopState.scoreBoostPurchases || 0,
      items: (shopState.items || []).map(item => ({
        id: item.id,
        name: item.name,
        desc: item.desc,
        basePrice: item.basePrice,
        rarity: item.rarity,
        icon: item.icon,
        locked: !!item.locked,
        purchased: !!item.purchased,
        isSoldOutSpecial: !!item.isSoldOutSpecial,
        isScoreBoost: !!item.isScoreBoost,
        maxPurchases: item.maxPurchases,
        purchasesCount: item.purchasesCount
      }))
    };
  }

  function restoreShopSnapshot(data) {
    if (!data) return;
    if (typeof data.coins === 'number') {
      shopState.coins = data.coins;
      if (typeof userCoins !== 'undefined') {
        userCoins = data.coins;
      }
    }
    shopState.lockMode = !!data.lockMode;
    shopState.purchasedItems = new Set(Array.isArray(data.purchasedItems) ? data.purchasedItems : []);
    shopState.scoreBoostPurchases = typeof data.scoreBoostPurchases === 'number' ? data.scoreBoostPurchases : 0;
    shopState.items = Array.isArray(data.items) ? data.items.map(i => ({ ...i })) : [];
    shopState.isRolling = false;
    updateShopCoins();
    if (typeof updateLockModeUI === 'function') updateLockModeUI();
    renderCards();
    updateShopActionsUI();
  }

  // Debug function to simulate having bought all skills
  function testBuyAllSkills() {
    if (typeof SKILLS_CONFIG !== 'undefined') {
      for (const key in SKILLS_CONFIG) {
        SKILLS_CONFIG[key].unlocked = true;
        SKILLS_CONFIG[key].active = true;
        if (SKILLS_CONFIG[key].maxPurchases) {
          SKILLS_CONFIG[key].purchasesCount = SKILLS_CONFIG[key].maxPurchases;
        }
      }
    }
    shopItemPool.forEach(item => {
      shopState.purchasedItems.add(item.id);
    });
    if (typeof userCoins !== 'undefined') {
      userCoins = Math.max(userCoins, 50);
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    }
    if (typeof updateSkillUI === 'function') updateSkillUI();
    shopState.items = [createScoreBoostItem()];
    renderCards();
    updateShopActionsUI();
  }

  // Expose global window API for shopRender
  window.openShopRender = openShop;
  window.closeShopRender = closeShop;
  window.triggerAutoFreeShopRoll = triggerAutoFreeShopRoll;
  window.resetShopState = resetShopState;
  window.getShopSnapshot = getShopSnapshot;
  window.restoreShopSnapshot = restoreShopSnapshot;
  window.openTestSkillsModal = openTestSkillsModal;
  window.closeTestSkillsModal = closeTestSkillsModal;
  window.isAllSkillsPurchased = isAllSkillsPurchased;
  window.testBuyAllSkills = testBuyAllSkills;
  window.shopState = shopState;
  window.renderCards = renderCards;

  function prewarmShopShader() {
    if (!window.shopBalatroShaderInstance && typeof BalatroShader !== 'undefined') {
      const container = document.getElementById('shop-balatro-bg-container');
      if (container) {
        try {
          window.shopBalatroShaderInstance = new BalatroShader({
            container: "#shop-balatro-bg-container",
            colours: { c1: "#C084FC", c2: "#7E22CE", c3: "#2E0A4E" },
            speed: 0.36,
            contrast: 1.2,
            spinAmount: 0.4,
            pixelSizeFac: 1000,
            spinEase: 0.5,
            offsetX: 0.0,
            offsetY: -0.12
          });
          if (typeof window.shopBalatroShaderInstance.pause === 'function') {
            window.shopBalatroShaderInstance.pause();
          }
        } catch (e) {
          console.warn("Shop pre-warm shader error:", e);
        }
      }
    }
  }

  function initShop() {
    setupEventListeners();
    preloadShopIcons();
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(prewarmShopShader);
    } else {
      setTimeout(prewarmShopShader, 2500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShop);
  } else {
    initShop();
  }
})();
