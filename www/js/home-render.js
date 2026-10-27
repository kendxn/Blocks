// Retro Audio Synthesizer for UI SFX
class RetroAudioSFX {
    constructor() {
        this.ctx = null;
    }

    isMuted() {
        if (typeof window.RetroAudio !== 'undefined' && typeof window.RetroAudio.isMuted === 'function') {
            return window.RetroAudio.isMuted();
        }
        try {
            return localStorage.getItem('sfxMuted') === 'true';
        } catch (e) {
            return false;
        }
    }

    init() {
        if (this.isMuted()) return;
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Tocco morbido e grave (150Hz -> 80Hz)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.20, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) { }
    }

    playTypewriterTick() {
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(650 + Math.random() * 80, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.025);

            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.025);
        } catch (e) { }
    }

    playSelect() {
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Tocco morbido, rotondo e grave per selezione menu (180Hz -> 130Hz)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(130, this.ctx.currentTime + 0.06);

            gain.gain.setValueAtTime(0.20, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.06);
        } catch (e) { }
    }

    playRevive() {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.32);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.22, now + 0.10);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.42);
        } catch (e) { }
    }

    playCassetteStart() {
        if (window.RetroAudio && typeof window.RetroAudio.playCassetteStart === "function") {
            window.RetroAudio.playCassetteStart();
        }
    }

    playGameStart() {
        if (window.RetroAudio && typeof window.RetroAudio.playGameStart === "function") {
            window.RetroAudio.playGameStart();
        }
    }

    playPurchase() {
        if (window.RetroAudio && typeof window.RetroAudio.playPurchase === "function") {
            window.RetroAudio.playPurchase();
        }
    }

    playCoin() {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) { }
    }

    playError() {
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) { }
    }

    playTicketCollect() {
        if (window.RetroAudio && typeof window.RetroAudio.playTicketCollect === 'function') {
            window.RetroAudio.playTicketCollect();
        } else {
            this.playCoin();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const audio = window.RetroAudio || new RetroAudioSFX();
    window.homeAudio = audio;
    window.playTypewriterTick = () => audio.playTypewriterTick();

    function isSameDay(ts1, ts2) {
        const d1 = new Date(ts1);
        const d2 = new Date(ts2);
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    function getClassicTargetScore() {
        const now = Date.now();
        const lastResetStr = localStorage.getItem('classicTargetLastResetTime');

        if (!lastResetStr) {
            localStorage.setItem('classicTargetLastResetTime', now.toString());
            localStorage.setItem('classicTargetScore', '3000');
            return 3000;
        }

        const lastReset = parseInt(lastResetStr, 10);
        if (isNaN(lastReset) || !isSameDay(lastReset, now)) {
            localStorage.setItem('classicTargetLastResetTime', now.toString());
            localStorage.setItem('classicTargetScore', '3000');
            return 3000;
        }

        const targetStr = localStorage.getItem('classicTargetScore');
        const target = parseInt(targetStr || '3000', 10);
        return isNaN(target) || target < 3000 ? 3000 : target;
    }
    window.getClassicTargetScore = getClassicTargetScore;

    function getClassicVictoryTickets(targetScore) {
        const scoreVal = typeof targetScore === 'number' && targetScore > 0 ? targetScore : 3000;
        const nk = scoreVal / 1000;
        // Il numero di ticket è sempre multiplo di 5 ed è superiore ai nk del punteggio
        // (es: 3k -> 5, 4.5k -> 5, 6k/7k/7.5k -> 10, 10.5k -> 15, etc.)
        const tickets = Math.floor(nk / 5) * 5 + 5;
        return Math.max(5, tickets);
    }
    window.getClassicVictoryTickets = getClassicVictoryTickets;

    function getClassicTapeTitle() {
        return "Classic Tape";
    }
    window.getClassicTapeTitle = getClassicTapeTitle;

    function getTapeTitleText(cassette) {
        if (!cassette) return "Classic Tape";
        if (cassette.mode === 'classic') {
            return "Classic Tape";
        }
        return cassette.title;
    }
    window.getTapeTitleText = getTapeTitleText;

    let lastAchievedClassicTarget = 0;
    let lastAchievedTimeTarget = 0;
    let hasPressedKeepPlayingInMatch = false;

    window.resetClassicMatchVictoryTracker = function () {
        lastAchievedClassicTarget = 0;
        lastAchievedTimeTarget = 0;
        hasPressedKeepPlayingInMatch = false;
    };

    window.setClassicKeepPlayingPressed = function () {
        hasPressedKeepPlayingInMatch = true;
    };

    window.checkClassicModeVictory = function (currentScore) {
        const activeMode = window.currentSelectedGameMode || 'classic';
        if (hasPressedKeepPlayingInMatch) return;

        if (activeMode === 'classic') {
            const target = getClassicTargetScore();
            if (currentScore >= target && lastAchievedClassicTarget < target) {
                window.isVictoryPointPopupActive = true;
                if (typeof window.clearSkillActivationPopups === 'function') {
                    window.clearSkillActivationPopups();
                }
                lastAchievedClassicTarget = target;
                const targetK = (target % 1000 === 0) ? (target / 1000) : (target / 1000).toFixed(1);
                const levelLabel = `LVL ${targetK}K`;
                window.lastVictoryLevelLabel = levelLabel;

                const rewardTickets = getClassicVictoryTickets(target);

                const newTarget = target + 1500;
                localStorage.setItem('classicTargetScore', newTarget.toString());

                if (typeof window.updateRecordScoreDisplay === 'function') {
                    window.updateRecordScoreDisplay();
                }

                if (typeof window.playVictoryPointReachedPopup === 'function') {
                    window.playVictoryPointReachedPopup(levelLabel, () => {
                        if (typeof window.triggerVictoryScreen === 'function') {
                            window.triggerVictoryScreen(levelLabel, rewardTickets);
                        }
                    });
                } else if (typeof window.triggerVictoryScreen === 'function') {
                    window.triggerVictoryScreen(levelLabel, rewardTickets);
                }
            }
        } else if (activeMode === 'time' || activeMode === 'wild') {
            const TIME_TARGET = 10000;
            if (currentScore >= TIME_TARGET && lastAchievedTimeTarget < TIME_TARGET) {
                window.isVictoryPointPopupActive = true;
                if (typeof window.clearSkillActivationPopups === 'function') {
                    window.clearSkillActivationPopups();
                }
                lastAchievedTimeTarget = TIME_TARGET;
                const levelLabel = `LVL 10K`;
                window.lastVictoryLevelLabel = levelLabel;

                if (typeof window.stopTimeModeTimer === 'function') {
                    window.stopTimeModeTimer();
                }

                if (typeof window.playVictoryPointReachedPopup === 'function') {
                    window.playVictoryPointReachedPopup(levelLabel, () => {
                        if (typeof window.triggerVictoryScreen === 'function') {
                            window.triggerVictoryScreen(levelLabel, 15);
                        }
                    });
                } else if (typeof window.triggerVictoryScreen === 'function') {
                    window.triggerVictoryScreen(levelLabel, 15);
                }
            }
        }
    };
    window.checkModeVictory = window.checkClassicModeVictory;

    function getTapeScoreText(mode) {
        if (mode === 'classic') {
            const target = getClassicTargetScore();
            const targetK = (target % 1000 === 0) ? (target / 1000) : (target / 1000).toFixed(1);
            return `LVL ${targetK}K`;
        }
        const raw = localStorage.getItem(`blockBlastHighScore_${mode}`);
        if (raw !== null && raw !== undefined && raw !== '') {
            const val = parseInt(raw, 10);
            if (!isNaN(val) && val > 0) {
                return val.toLocaleString();
            }
        }
        return 'no-score';
    }

    const cassettes = [
        {
            title: "Classic Tape",
            valText: "LVL 3K",
            icon: "assets/star-icon.png",
            img: "assets/cassette-1.png",
            mode: "classic"
        },
        {
            title: "Tempo Tape",
            valText: "no-score",
            icon: "assets/podium-icon.png",
            img: "assets/cassette-2.png",
            mode: "time"
        },
        {
            title: "Vintage Tape",
            valText: "no-score",
            icon: "assets/podium-icon.png",
            img: "assets/cassette-3.png",
            mode: "vintage"
        }
    ];

    const SAVED_GAME_MODE_KEY = 'blockBlastSelectedGameMode';
    const savedMode = localStorage.getItem(SAVED_GAME_MODE_KEY);
    let currentCassetteIndex = 0;
    if (savedMode) {
        const foundIdx = cassettes.findIndex(c => c.mode === savedMode);
        if (foundIdx !== -1) {
            currentCassetteIndex = foundIdx;
        }
    }
    window.currentSelectedGameMode = cassettes[currentCassetteIndex].mode;

    // UI Elements
    const homeScreen = document.getElementById('home-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const recordCountEl = document.getElementById('record-count');
    const prevBtn = document.getElementById('prev-cassette');
    const nextBtn = document.getElementById('next-cassette');
    const cassetteDisplay = document.getElementById('cassette-display');
    const mainCassetteImg = document.getElementById('current-cassette-img');
    const peekLeftImg = document.getElementById('peek-left-img');
    const peekRightImg = document.getElementById('peek-right-img');
    const tapeTitle = document.getElementById('tape-title');
    const tapeLevel = document.getElementById('tape-level');
    const headerIcon = document.getElementById('header-icon');
    const playBtn = document.getElementById('home-play-btn');
    const gamemodeBtn = document.getElementById('gamemode-btn');
    const tabBtns = document.querySelectorAll('#home-screen .tab-btn');
    const settingBtn = document.getElementById('home-setting-btn');

    let isAnimatingCassette = false;

    // Typewriter effect for cassette title label
    let typewriterTimeout = null;
    let typewriterToken = 0;

    function renderTapeTitleTypewriter(titleText, animate = true) {
        if (!tapeTitle) return;

        // Se lo splash/title screen del gioco è ancora attivo e visibile, disabilita animazione e sfx
        const splashEl = document.getElementById('game-splash-screen');
        if (splashEl && !splashEl.classList.contains('fade-out')) {
            animate = false;
        }

        if (typewriterTimeout) {
            clearTimeout(typewriterTimeout);
            typewriterTimeout = null;
        }

        const thisToken = ++typewriterToken;
        tapeTitle.dataset.currentTitle = titleText;

        if (!animate || !titleText) {
            tapeTitle.textContent = titleText || '';
            return;
        }

        tapeTitle.innerHTML = '';
        const chars = Array.from(titleText);
        let index = 0;

        function typeNext() {
            if (thisToken !== typewriterToken) return;

            if (index < chars.length) {
                const char = chars[index];
                const span = document.createElement('span');
                span.className = 'typewriter-char';
                if (char === ' ') {
                    span.innerHTML = '&nbsp;';
                    span.classList.add('typewriter-space');
                } else {
                    span.textContent = char;
                    if (typeof audio !== 'undefined' && audio.playTypewriterTick) {
                        audio.playTypewriterTick();
                    }
                }

                tapeTitle.appendChild(span);
                index++;

                const delay = (char === ' ') ? 30 : (34 + Math.floor(Math.random() * 12));
                typewriterTimeout = setTimeout(typeNext, delay);
            }
        }

        typeNext();
    }
    window.renderTapeTitleTypewriter = renderTapeTitleTypewriter;

    // Refresh Best Score Record from Storage/App
    window.updateRecordScoreDisplay = function () {
        const savedMax = localStorage.getItem('blockBlast3DHighScore8x8') || localStorage.getItem('maxScore') || (window.highestScore ? window.highestScore.toString() : '0');
        const numVal = parseInt(savedMax, 10) || 0;
        if (recordCountEl) {
            recordCountEl.textContent = numVal.toLocaleString();
        }
        const maxScoreDisplay = document.getElementById('maxScoreDisplay');
        if (maxScoreDisplay) {
            maxScoreDisplay.textContent = numVal.toLocaleString();
        }
        if (tapeLevel && cassettes[currentCassetteIndex]) {
            tapeLevel.textContent = getTapeScoreText(cassettes[currentCassetteIndex].mode);
        }
        if (tapeTitle && cassettes[currentCassetteIndex]) {
            const targetTitle = getTapeTitleText(cassettes[currentCassetteIndex]);
            if (tapeTitle.dataset.currentTitle !== targetTitle) {
                renderTapeTitleTypewriter(targetTitle, false);
            }
        }
    };
    const updateRecordScoreDisplay = window.updateRecordScoreDisplay;

    // Ticket Persistence
    function getTicketCount() {
        const saved = localStorage.getItem('userTickets');
        return saved !== null ? parseInt(saved, 10) : 50;
    }

    function updateTicketDisplay(amount) {
        localStorage.setItem('userTickets', amount.toString());
        const ticketCountSpan = document.getElementById('ticket-count');
        if (ticketCountSpan) {
            ticketCountSpan.textContent = `x${amount}`;
        }
    }

    window.getTicketCount = getTicketCount;
    window.updateTicketDisplay = updateTicketDisplay;
    window.addTickets = function (amount) {
        const current = getTicketCount();
        const newTotal = current + amount;
        updateTicketDisplay(newTotal);
        return newTotal;
    };

    // Dynamic Quest Persistence & Real-time Progress Tracking System
    const QUEST_DEFINITIONS = [
        { id: 'quest-1', title: 'Play 3 Matches', target: 3, reward: 1, difficulty: 'easy', type: 'matches' },
        { id: 'quest-2', title: 'Clear 60 Rows or Columns', target: 60, reward: 1, difficulty: 'easy', type: 'lines' },
        { id: 'quest-3', title: 'Perform 30 Combos (x2+)', target: 30, reward: 2, difficulty: 'medium', type: 'combos' },
        { id: 'quest-4', title: 'Place 100 Pieces', target: 100, reward: 1, difficulty: 'easy', type: 'pieces' },
        { id: 'quest-5', title: 'Reach 3,00 Points in a Match', target: 3000, reward: 2, difficulty: 'medium', type: 'single_match_score' },
        { id: 'quest-6', title: 'Activate 4 Special Skills', target: 4, reward: 2, difficulty: 'medium', type: 'skills' },
        { id: 'quest-7', title: 'Clear 3 Rows Simultaneously', target: 3, reward: 4, difficulty: 'hard', type: 'multi_lines' },
        { id: 'quest-8', title: 'Place 30 Special Pieces', target: 30, reward: 4, difficulty: 'hard', type: 'special_pieces' },
        { id: 'quest-9', title: 'Reach 5,000 Points in a Match', target: 5000, reward: 4, difficulty: 'hard', type: 'single_match_score' },
        { id: 'quest-10', title: 'Clear 100 Rows or Columns', target: 100, reward: 4, difficulty: 'hard', type: 'lines' },
        { id: 'quest-11', title: 'Place 300 Pieces', target: 300, reward: 4, difficulty: 'hard', type: 'pieces' },
        { id: 'quest-12', title: 'Perform 60 Combos (x2+)', target: 60, reward: 4, difficulty: 'hard', type: 'combos' },
        { id: 'quest-13', title: 'Reach 8.000 Points in a Match', target: 8000, reward: 8, difficulty: 'very_hard', type: 'single_match_score' },
        { id: 'quest-14', title: 'Clear 200 Rows or Columns', target: 200, reward: 8, difficulty: 'very_hard', type: 'lines' },
        { id: 'quest-15', title: 'Perform 120 Combos (x2+)', target: 120, reward: 8, difficulty: 'very_hard', type: 'combos' }
    ];

    function checkAndApplyMidnightReset() {
        const lastResetStr = localStorage.getItem('dailyQuestsLastReset');
        const now = Date.now();

        if (!lastResetStr) {
            localStorage.setItem('dailyQuestsLastReset', now.toString());
            return false;
        }

        const lastReset = parseInt(lastResetStr, 10);
        if (isNaN(lastReset) || !isSameDay(lastReset, now)) {
            localStorage.setItem('dailyQuestsData_v3', JSON.stringify({}));
            localStorage.setItem('dailyQuestsLastReset', now.toString());
            return true;
        }
        return false;
    }
    const checkAndApply24hReset = checkAndApplyMidnightReset;
    window.checkAndApplyMidnightReset = checkAndApplyMidnightReset;
    window.checkAndApply24hReset = checkAndApply24hReset;

    function getTimeUntilNextReset() {
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        const diff = Math.max(0, nextMidnight.getTime() - now.getTime());

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    // --- DAILY SHOP REWARDS (Free 3 Tickets + 5 Rewarded Ads for 10 Tickets) ---
    const DAILY_SHOP_KEY = 'dailyShopRewards_v2';

    function getDailyShopState() {
        checkAndApplyMidnightReset();
        const lastReset = localStorage.getItem('dailyQuestsLastReset') || '';
        const raw = localStorage.getItem(DAILY_SHOP_KEY);
        let state = null;
        if (raw) {
            try { state = JSON.parse(raw); } catch (e) { }
        }
        const stateResetNum = state && state.resetId ? parseInt(state.resetId, 10) : NaN;
        const lastResetNum = parseInt(lastReset, 10);
        const isSameResetCycle = !isNaN(stateResetNum) && !isNaN(lastResetNum) && isSameDay(stateResetNum, lastResetNum);

        if (!state || (!isSameResetCycle && state.resetId !== lastReset)) {
            state = {
                resetId: lastReset,
                freeGiftClaimed: false,
                adsWatchedCount: 0
            };
            localStorage.setItem(DAILY_SHOP_KEY, JSON.stringify(state));
        }
        return state;
    }

    function saveDailyShopState(state) {
        localStorage.setItem(DAILY_SHOP_KEY, JSON.stringify(state));
    }

    function updateDailyShopUI() {
        const state = getDailyShopState();
        const badgeEl = document.getElementById('daily-reward-badge');
        const amountEl = document.getElementById('daily-reward-amount-text');
        const claimBtn = document.getElementById('daily-reward-claim-btn');

        if (!claimBtn) return;

        if (!state.freeGiftClaimed) {
            if (badgeEl) {
                badgeEl.className = 'pack-badge daily-badge';
                badgeEl.textContent = 'FREE';
            }
            if (amountEl) amountEl.innerHTML = '3<br>TICKETS';
            claimBtn.className = 'pack-buy-btn daily-pack-btn';
            claimBtn.disabled = false;
            claimBtn.textContent = 'CLAIM';
        } else if (state.adsWatchedCount < 5) {
            const remaining = 5 - state.adsWatchedCount;
            if (badgeEl) {
                badgeEl.className = 'pack-badge daily-badge ad-mode';
                badgeEl.textContent = `${remaining}/5 ADS`;
            }
            if (amountEl) amountEl.innerHTML = '+3<br>TICKETS';
            claimBtn.className = 'pack-buy-btn daily-pack-btn ad-mode';
            claimBtn.disabled = false;
            claimBtn.textContent = 'WATCH AD';
        } else {
            if (badgeEl) {
                badgeEl.className = 'pack-badge daily-badge claimed-mode';
                badgeEl.textContent = 'CLAIMED';
            }
            if (amountEl) amountEl.innerHTML = 'DONE<br>(5/5)';
            claimBtn.className = 'pack-buy-btn daily-pack-btn claimed-mode';
            claimBtn.disabled = true;
            claimBtn.textContent = 'CLAIMED';
        }
    }
    window.updateDailyShopUI = updateDailyShopUI;

    function resetFreeTickets() {
        const state = {
            resetId: localStorage.getItem('dailyQuestsLastReset') || '',
            freeGiftClaimed: false,
            adsWatchedCount: 0
        };
        saveDailyShopState(state);
        updateDailyShopUI();
        updateTabBadges();
        if (typeof audio !== 'undefined' && audio.playSelect) audio.playSelect();
    }
    window.resetFreeTickets = resetFreeTickets;

    // --- NAVIGATION TAB BADGES ("NEW" Label with RGB Animation) ---
    function updateTabBadges() {
        const badgeShop = document.getElementById('badge-shop');
        const badgeInventory = document.getElementById('badge-inventory');
        const badgeHome = document.getElementById('badge-home');
        const badgeDaily = document.getElementById('badge-daily');

        // 1. Shop Badge (Active if free 3 tickets available; disappears when claimed)
        if (badgeShop) {
            const shopState = getDailyShopState();
            const hasShopRewards = !shopState.freeGiftClaimed;
            if (hasShopRewards) {
                badgeShop.classList.remove('hidden');
            } else {
                badgeShop.classList.add('hidden');
            }
        }

        // 2. Daily Quests Badge (Active if claimable completed quests exist or new 24h reset occurred)
        if (badgeDaily) {
            const states = getQuestStates();
            const hasUnclaimed = QUEST_DEFINITIONS.some(def => {
                const s = states[def.id] || { progress: 0, claimed: false };
                return s.progress >= def.target && !s.claimed;
            });

            const lastReset = localStorage.getItem('dailyQuestsLastReset') || '';
            const viewedReset = localStorage.getItem('dailyQuestsViewedReset') || '';
            const hasNewReset = lastReset && lastReset !== viewedReset;

            if (hasUnclaimed || hasNewReset) {
                badgeDaily.classList.remove('hidden');
            } else {
                badgeDaily.classList.add('hidden');
            }
        }

        // 3. Inventory / Vault Badge (Active if new unlocked background/skin hasn't been viewed)
        if (badgeInventory) {
            if (localStorage.getItem('hasNewInventoryItem') === 'true') {
                badgeInventory.classList.remove('hidden');
            } else {
                badgeInventory.classList.add('hidden');
            }
        }

        // 4. Home Badge
        if (badgeHome) {
            badgeHome.classList.add('hidden');
        }
    }
    window.updateTabBadges = updateTabBadges;

    function getQuestStates() {
        checkAndApplyMidnightReset();
        const raw = localStorage.getItem('dailyQuestsData_v3');
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (e) { return {}; }
    }

    function saveQuestStatesData(states) {
        localStorage.setItem('dailyQuestsData_v3', JSON.stringify(states));
    }

    function applyTextWaveToElement(el, text) {
        if (!el) return;
        const str = text || el.getAttribute('data-text') || el.textContent.trim() || '';
        el.innerHTML = '';
        el.classList.add('text-wave');
        el.setAttribute('data-text', str);

        if (!el.style.getPropertyValue('--wave-duration')) {
            const charCount = str.length;
            const duration = charCount <= 5 ? 1.8 : 2.6;
            el.style.setProperty('--wave-duration', `${duration}s`);
        }

        [...str].forEach((ch, idx) => {
            const span = document.createElement('span');
            span.className = 'wave-char';
            span.style.setProperty('--char-idx', idx);
            if (ch === ' ') {
                span.classList.add('wave-space');
                span.innerHTML = '&nbsp;';
            } else {
                span.textContent = ch;
            }
            el.appendChild(span);
        });
    }

    function initTextWaves() {
        document.querySelectorAll('.text-wave').forEach(el => {
            if (!el.querySelector('.wave-char')) {
                applyTextWaveToElement(el);
            }
        });
    }

    function renderQuestListUI() {
        const container = document.getElementById('quests-scroll-area');
        if (!container) return;

        let titleEl = container.querySelector('.daily-quests-title, .pixel-title');
        container.innerHTML = '';
        if (!titleEl) {
            titleEl = document.createElement('div');
            titleEl.className = 'pixel-title daily-quests-title text-wave';
            titleEl.setAttribute('data-text', 'DAILY QUESTS');
            applyTextWaveToElement(titleEl, 'DAILY QUESTS');
        } else {
            titleEl.classList.add('pixel-title', 'daily-quests-title', 'text-wave');
            if (!titleEl.querySelector('.wave-char')) {
                applyTextWaveToElement(titleEl, 'DAILY QUESTS');
            }
        }
        container.appendChild(titleEl);

        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'daily-quests-subtitle';
        subtitleEl.textContent = `RESET IN: ${getTimeUntilNextReset()}`;
        container.appendChild(subtitleEl);

        const states = getQuestStates();

        const activeQuests = QUEST_DEFINITIONS.map(def => {
            const state = states[def.id] || { progress: 0, claimed: false };
            const isCompleted = state.progress >= def.target;
            return { def, state, isCompleted };
        }).filter(item => !item.state.claimed);

        // Sort completed quests to the top of the list
        activeQuests.sort((a, b) => {
            const aComp = a.isCompleted ? 1 : 0;
            const bComp = b.isCompleted ? 1 : 0;
            return bComp - aComp;
        });

        activeQuests.forEach(({ def, state, isCompleted }) => {
            const card = document.createElement('div');
            let cardClass = isCompleted ? 'quest-card-frame completed' : 'quest-card-frame';
            if (def.difficulty === 'very_hard') {
                cardClass += ' difficulty-very-hard';
            }
            card.className = cardClass;
            card.setAttribute('data-quest-id', def.id);
            card.setAttribute('data-reward-amount', def.reward);
            card.setAttribute('data-difficulty', def.difficulty);

            const displayProgress = Math.min(state.progress, def.target);
            const pct = Math.min(100, Math.round((displayProgress / def.target) * 100));

            card.innerHTML = `
                <div class="quest-card-info">
                    <div class="quest-card-title">${def.title}</div>
                    <div class="quest-progress-row">
                        <div class="quest-progress-bar">
                            <div class="quest-progress-fill" style="width: ${pct}%;"></div>
                        </div>
                        <span class="quest-progress-text">${displayProgress}/${def.target}</span>
                    </div>
                </div>
                <div class="quest-reward">
                    <img src="assets/ticket.png" alt="Reward" class="quest-reward-icon">
                    <span class="reward-text">+${def.reward}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                if (card.classList.contains('completed') && !card.classList.contains('claimed')) {
                    if (typeof audio !== 'undefined' && audio.playQuestReward) {
                        audio.playQuestReward();
                    } else if (typeof audio !== 'undefined' && audio.playCoin) {
                        audio.playCoin();
                    } else {
                        audio.playSelect();
                    }
                    const rewardElement = card.querySelector('.quest-reward') || card;
                    spawnFlyingTicketEffect(rewardElement.getBoundingClientRect(), def.reward);

                    card.classList.remove('completed');
                    card.classList.add('claimed', 'disappearing');

                    const curStates = getQuestStates();
                    curStates[def.id] = curStates[def.id] || { progress: def.target };
                    curStates[def.id].claimed = true;
                    saveQuestStatesData(curStates);

                    setTimeout(() => {
                        card.remove();
                        if (typeof updateQuestAnimations === 'function') updateQuestAnimations();
                        if (typeof updateTabBadges === 'function') updateTabBadges();
                    }, 480);
                }
            });

            container.appendChild(card);
        });

        if (typeof updateQuestAnimations === 'function') {
            updateQuestAnimations();
        }
        if (typeof updateTabBadges === 'function') {
            updateTabBadges();
        }
    }

    const QuestTracker = {
        track: function (type, amount = 1) {
            const states = getQuestStates();
            let changed = false;

            QUEST_DEFINITIONS.forEach(def => {
                if (def.type !== type) return;
                const state = states[def.id] || { progress: 0, claimed: false };
                if (state.claimed) return;

                let newProgress = state.progress;
                if (type === 'single_match_score') {
                    if (amount > newProgress) {
                        newProgress = amount;
                    }
                } else {
                    newProgress += amount;
                }

                if (newProgress !== state.progress) {
                    state.progress = newProgress;
                    states[def.id] = state;
                    changed = true;
                }
            });

            if (changed) {
                saveQuestStatesData(states);
                renderQuestListUI();
                if (typeof updateTabBadges === 'function') updateTabBadges();
            }
        }
    };
    window.QuestTracker = QuestTracker;

    // Dynamic Balatro WebGL Shader Background for Home Screen
    function initHomeBalatroShader() {
        const container = document.getElementById('home-balatro-bg-container');
        if (!container) return;
        if (!window.homeBalatroShaderInstance && typeof BalatroShader !== 'undefined') {
            try {
                window.homeBalatroShaderInstance = new BalatroShader({
                    container: "#home-balatro-bg-container",
                    colours: { c1: "#4D84D1", c2: "#1F54C8", c3: "#0C1B38" },
                    speed: 0.22,
                    contrast: 1.2,
                    spinAmount: 0.4,
                    pixelSizeFac: 1000,
                    spinEase: 0.5,
                    offsetX: 0.0,
                    offsetY: -0.12
                });
            } catch (e) {
                console.warn("Home BalatroShader error:", e);
            }
        } else if (window.homeBalatroShaderInstance) {
            if (typeof window.homeBalatroShaderInstance.resume === 'function') {
                window.homeBalatroShaderInstance.resume();
            }
            if (typeof window.homeBalatroShaderInstance.resize === 'function') {
                window.homeBalatroShaderInstance.resize();
            }
        }
    }

    function pauseHomeBalatroShader() {
        if (window.homeBalatroShaderInstance && typeof window.homeBalatroShaderInstance.pause === 'function') {
            window.homeBalatroShaderInstance.pause();
        }
    }

    // Show Home Screen
    window.showHomeScreen = function (animateTape = true) {
        if (!window.isPixelIrisTransitioning) {
            window.isGameTransitioning = false;
            isLaunchingGame = false;
        }
        if (typeof closeVaultBgDrawer === 'function') closeVaultBgDrawer();
        document.body.classList.add('in-home');
        document.body.classList.remove('in-game');
        const gameBg = document.getElementById('game-dynamic-bg');
        if (gameBg) gameBg.style.display = 'none';
        const homeBg = document.querySelector('#home-screen .sfondo-dinamico');
        if (homeBg) homeBg.style.display = 'block';

        const pb = document.getElementById("home-play-btn");
        if (pb) pb.style.pointerEvents = "auto";
        if (window._gameStartFreeRollTimer) {
            clearTimeout(window._gameStartFreeRollTimer);
            window._gameStartFreeRollTimer = null;
        }
        updateRecordScoreDisplay();
        if (cassettes[currentCassetteIndex]) {
            const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
            const nextIndex = (currentCassetteIndex + 1) % cassettes.length;
            if (mainCassetteImg) mainCassetteImg.src = cassettes[currentCassetteIndex].img;
            if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
            if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;
            if (headerIcon) headerIcon.src = cassettes[currentCassetteIndex].icon;
            if (tapeTitle) {
                const splashEl = document.getElementById('game-splash-screen');
                const shouldAnimate = animateTape && (!splashEl || splashEl.classList.contains('fade-out'));
                renderTapeTitleTypewriter(getTapeTitleText(cassettes[currentCassetteIndex]), shouldAnimate);
            }
            if (tapeLevel) tapeLevel.textContent = getTapeScoreText(cassettes[currentCassetteIndex].mode);
        }
        if (homeScreen) homeScreen.classList.remove('hidden');
        if (appWrapper) appWrapper.style.display = 'none';
        initHomeBalatroShader();
        if (typeof window.updateBannerVisibility === 'function') {
            window.updateBannerVisibility();
        }
        if (typeof updateTabBadges === 'function') {
            updateTabBadges();
        }
        if (typeof updateDailyShopUI === 'function') {
            updateDailyShopUI();
        }
        if (typeof renderQuestListUI === 'function') {
            renderQuestListUI();
        }
        if (typeof window.updateTraySkillHint === 'function') {
            window.updateTraySkillHint();
        }
        if (typeof window.checkAndPlayMatchTicketCollectAnimation === 'function') {
            window.checkAndPlayMatchTicketCollectAnimation();
        }
    };

    // Hide Home Screen & Launch Game
    window.hideHomeScreen = function () {
        document.body.classList.add('in-game');
        document.body.classList.remove('in-home');
        const gameBg = document.getElementById('game-dynamic-bg');
        if (gameBg) gameBg.style.display = 'block';
        const homeBg = document.querySelector('#home-screen .sfondo-dinamico');
        if (homeBg) homeBg.style.display = 'none';

        if (homeScreen) homeScreen.classList.add('hidden');
        if (appWrapper) appWrapper.style.display = 'flex';
        const bEl = document.getElementById('board');
        if (bEl) {
            bEl.classList.remove('shaking', 'shaking-light', 'shaking-medium', 'shaking-heavy');
        }
        pauseHomeBalatroShader();
        if (typeof window.updateBannerVisibility === 'function') {
            window.updateBannerVisibility();
        }
        if (typeof window.updateTraySkillHint === 'function') {
            window.updateTraySkillHint();
        }
    };

    // Retro Pixel Art Iris Wipe Transition (Iris In -> Switch View -> Iris Out)
    window.triggerPixelIrisTransition = function (onMidpoint, onComplete) {
        if (window.isPixelIrisTransitioning) return;
        window.isPixelIrisTransitioning = true;
        let canvas = document.getElementById('pixel-iris-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'pixel-iris-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.zIndex = '99999';
            canvas.style.pointerEvents = 'none';
            canvas.style.imageRendering = 'pixelated';
            document.body.appendChild(canvas);
        }

        const ctx = canvas.getContext('2d');
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        canvas.width = vw;
        canvas.height = vh;
        canvas.style.display = 'block';

        // Size of pixel squares (quadratini)
        const blockSize = Math.max(16, Math.floor(Math.min(vw, vh) / 22));
        const cols = Math.ceil(vw / blockSize);
        const rows = Math.ceil(vh / blockSize);
        const centerX = cols / 2;
        const centerY = rows / 2;
        const maxDist = Math.hypot(centerX, centerY) + 2;

        const durationIn = 320;   // Iris In duration in ms
        const durationHold = 80;  // Solid black hold duration at midpoint in ms
        const durationOut = 320;  // Iris Out duration in ms
        let startTime = null;
        let phase = 'in';
        let midpointDone = false;

        function renderFrame(now) {
            if (!startTime) startTime = now;
            const elapsed = now - startTime;

            ctx.clearRect(0, 0, vw, vh);

            if (phase === 'in') {
                const progress = Math.min(elapsed / durationIn, 1.0);
                // Reach full closure (radius = 0) at 85% of durationIn so the center closes completely
                const closeT = Math.min(1.0, progress / 0.85);
                const currentRadius = maxDist * (1 - closeT);

                ctx.fillStyle = '#000000'; // Solid black pixel blocks

                if (currentRadius <= 0.8) {
                    // Fully closed: fill the whole screen solid black
                    ctx.fillRect(0, 0, vw, vh);
                } else {
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const dist = Math.hypot(c - centerX + 0.5, r - centerY + 0.5);
                            if (dist >= currentRadius) {
                                ctx.fillRect(c * blockSize, r * blockSize, blockSize + 0.5, blockSize + 0.5);
                            }
                        }
                    }
                }

                if (progress < 1.0) {
                    requestAnimationFrame(renderFrame);
                } else {
                    // Switch to hold phase with 100% solid black screen
                    phase = 'hold';
                    startTime = performance.now();
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, vw, vh);

                    if (!midpointDone) {
                        midpointDone = true;
                        const runMidpoint = async () => {
                            if (typeof onMidpoint === 'function') {
                                try {
                                    await Promise.race([
                                        Promise.resolve(onMidpoint()),
                                        new Promise(res => setTimeout(res, 600))
                                    ]);
                                } catch (e) {
                                    console.warn('[Iris Transition] Midpoint error:', e);
                                }
                            }
                            // Attendiamo 2 cicli rAF dietro al telo nero per far completare al browser Layout, Recalc Style e Paint
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    phase = 'out';
                                    startTime = performance.now();
                                    requestAnimationFrame(renderFrame);
                                });
                            });
                        };
                        runMidpoint();
                    }
                    requestAnimationFrame(renderFrame);
                }
            } else if (phase === 'hold') {
                // Keep screen 100% solid black while view switch finishes and assets load
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, vw, vh);
                // Rimane a schermo nero finché runMidpoint non imposta phase = 'out'
                requestAnimationFrame(renderFrame);
            } else if (phase === 'out') {
                const progress = Math.min(elapsed / durationOut, 1.0);
                const currentRadius = maxDist * progress;

                ctx.fillStyle = '#000000'; // Solid black pixel blocks
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const dist = Math.hypot(c - centerX + 0.5, r - centerY + 0.5);
                        if (dist >= currentRadius) {
                            ctx.fillRect(c * blockSize, r * blockSize, blockSize + 0.5, blockSize + 0.5);
                        }
                    }
                }

                if (progress < 1.0) {
                    requestAnimationFrame(renderFrame);
                } else {
                    ctx.clearRect(0, 0, vw, vh);
                    canvas.style.display = 'none';
                    window.isPixelIrisTransitioning = false;
                    window.isGameTransitioning = false;
                    isLaunchingGame = false;
                    const pb = document.getElementById("home-play-btn");
                    if (pb) pb.style.pointerEvents = "auto";
                    if (typeof onComplete === 'function') onComplete();
                }
            }
        }

        requestAnimationFrame(renderFrame);
    };

    // Retro Pixel Art Iris Out Only Transition (Immediately switch view -> Iris Out opening animation)
    window.triggerPixelIrisOutOnly = function (onStart, onComplete) {
        let canvas = document.getElementById('pixel-iris-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'pixel-iris-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.zIndex = '99999';
            canvas.style.pointerEvents = 'none';
            canvas.style.imageRendering = 'pixelated';
            document.body.appendChild(canvas);
        }

        const ctx = canvas.getContext('2d');
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        canvas.width = vw;
        canvas.height = vh;

        // Perform the screen reset/switch immediately before Iris Out opens up
        if (typeof onStart === 'function') onStart();

        canvas.style.display = 'block';

        const blockSize = Math.max(16, Math.floor(Math.min(vw, vh) / 22));
        const cols = Math.ceil(vw / blockSize);
        const rows = Math.ceil(vh / blockSize);
        const centerX = cols / 2;
        const centerY = rows / 2;
        const maxDist = Math.hypot(centerX, centerY) + 2;

        const durationOut = 380;
        let startTime = null;

        function renderFrame(now) {
            if (!startTime) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationOut, 1.0);
            const currentRadius = maxDist * progress;

            ctx.clearRect(0, 0, vw, vh);

            ctx.fillStyle = '#000000'; // Solid black pixel blocks
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const dist = Math.hypot(c - centerX + 0.5, r - centerY + 0.5);
                    if (dist >= currentRadius) {
                        ctx.fillRect(c * blockSize, r * blockSize, blockSize + 0.5, blockSize + 0.5);
                    }
                }
            }

            if (progress < 1.0) {
                requestAnimationFrame(renderFrame);
            } else {
                ctx.clearRect(0, 0, vw, vh);
                canvas.style.display = 'none';
                if (typeof onComplete === 'function') onComplete();
            }
        }

        requestAnimationFrame(renderFrame);
    };

    // Start Selected Game Mode
    function launchGameMode(modeIndex) {
        window.currentSelectedGameMode = (cassettes[modeIndex] && cassettes[modeIndex].mode) ? cassettes[modeIndex].mode : 'classic';
        try {
            localStorage.setItem(SAVED_GAME_MODE_KEY, window.currentSelectedGameMode);
        } catch (e) { }

        const activeMode = window.currentSelectedGameMode;
        const hasSnapshot = typeof window.hasGameSnapshot === 'function' && window.hasGameSnapshot(activeMode);

        const applyModeEffects = () => {
            window.hideHomeScreen();
            if (hasSnapshot) {
                window.restoreGameSnapshot(activeMode);
                if (typeof window.checkAndUpdateTimeModeVisibility === 'function') {
                    window.checkAndUpdateTimeModeVisibility(true);
                }
            } else {
                if (typeof initBoard === 'function') {
                    initBoard();
                }

                if (typeof window.checkAndUpdateTimeModeVisibility === 'function') {
                    window.checkAndUpdateTimeModeVisibility(false);
                }
            }

            const btnShop = document.getElementById('btnShop');
            if (btnShop) {
                btnShop.style.opacity = '1';
                btnShop.style.filter = 'none';
                btnShop.style.pointerEvents = 'auto';
            }
        };

        const onTransitionComplete = () => {
            window.isGameTransitioning = false;
            isLaunchingGame = false;
            const pb = document.getElementById("home-play-btn");
            if (pb) pb.style.pointerEvents = "auto";

            const isTutorialActive = window.TutorialManager && window.TutorialManager.isActive;
            if (!hasSnapshot && !isTutorialActive && typeof window.triggerBoardInitialPrefillAnimation === 'function') {
                window.triggerBoardInitialPrefillAnimation(() => {
                    if (typeof window.scheduleGameStartFreeRoll === 'function') {
                        window.scheduleGameStartFreeRoll();
                    }
                });
            } else if (!hasSnapshot && typeof window.scheduleGameStartFreeRoll === 'function') {
                if (!isTutorialActive) {
                    window.scheduleGameStartFreeRoll();
                }
            }
        };

        if (typeof window.triggerPixelIrisOutOnly === 'function') {
            window.triggerPixelIrisOutOnly(applyModeEffects, onTransitionComplete);
        } else if (typeof window.triggerPixelIrisTransition === 'function') {
            window.triggerPixelIrisTransition(applyModeEffects, onTransitionComplete);
        } else {
            applyModeEffects();
            onTransitionComplete();
        }
    }

    // Carousel Update Logic
    function updateCassette(direction) {
        if (isAnimatingCassette || !mainCassetteImg || isLaunchingGame || window.isGameTransitioning || window.isPixelIrisTransitioning) return;
        isAnimatingCassette = true;
        if (audio.playCassetteSwitch) audio.playCassetteSwitch();
        else audio.playClick();

        const outClass = direction === 1 ? 'slide-out-left' : 'slide-out-right';
        const inStartClass = direction === 1 ? 'slide-in-from-right' : 'slide-in-from-left';

        mainCassetteImg.className = `cassette-img ${outClass}`;

        setTimeout(() => {
            currentCassetteIndex = (currentCassetteIndex + direction + cassettes.length) % cassettes.length;
            window.currentSelectedGameMode = cassettes[currentCassetteIndex].mode;
            try {
                localStorage.setItem(SAVED_GAME_MODE_KEY, window.currentSelectedGameMode);
            } catch (e) { }

            const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
            const nextIndex = (currentCassetteIndex + 1) % cassettes.length;

            mainCassetteImg.src = cassettes[currentCassetteIndex].img;
            if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
            if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;

            if (tapeTitle) renderTapeTitleTypewriter(getTapeTitleText(cassettes[currentCassetteIndex]), true);
            if (tapeLevel) tapeLevel.textContent = getTapeScoreText(cassettes[currentCassetteIndex].mode);
            if (headerIcon) headerIcon.src = cassettes[currentCassetteIndex].icon;

            mainCassetteImg.className = `cassette-img ${inStartClass}`;
            void mainCassetteImg.offsetWidth;

            requestAnimationFrame(() => {
                mainCassetteImg.className = 'cassette-img';
                setTimeout(() => {
                    isAnimatingCassette = false;
                }, 280);
            });
        }, 220);
    }

    function initCassetteStack() {
        const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
        const nextIndex = (currentCassetteIndex + 1) % cassettes.length;
        if (mainCassetteImg) mainCassetteImg.src = cassettes[currentCassetteIndex].img;
        if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
        if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;
        if (headerIcon) headerIcon.src = cassettes[currentCassetteIndex].icon;
        if (tapeTitle) renderTapeTitleTypewriter(getTapeTitleText(cassettes[currentCassetteIndex]), false);
        if (tapeLevel) tapeLevel.textContent = getTapeScoreText(cassettes[currentCassetteIndex].mode);
        updateRecordScoreDisplay();
    }

    initCassetteStack();

    prevBtn?.addEventListener('click', () => {
        updateCassette(-1);
    });
    nextBtn?.addEventListener('click', () => {
        updateCassette(1);
    });
    peekLeftImg?.addEventListener('click', () => {
        updateCassette(-1);
    });
    peekRightImg?.addEventListener('click', () => {
        updateCassette(1);
    });

    // Touch & Pointer Swipe Gestures on Cassettes
    if (cassetteDisplay) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSwiping = false;
        let lastSwipeTime = 0;

        function startSwipe(x, y) {
            if (isAnimatingCassette || isLaunchingGame || window.isGameTransitioning || window.isPixelIrisTransitioning) return;
            touchStartX = x;
            touchStartY = y;
            touchStartTime = Date.now();
            isSwiping = true;
        }

        function moveSwipe(x, y, evt) {
            if (!isSwiping) return;
            const diffX = x - touchStartX;
            const diffY = y - touchStartY;
            // Intercept dominant horizontal movement to prevent any scroll jitter
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                if (evt && evt.cancelable) evt.preventDefault();
            }
        }

        function endSwipe(x, y) {
            if (!isSwiping) return;
            isSwiping = false;
            if (isAnimatingCassette || isLaunchingGame || window.isGameTransitioning || window.isPixelIrisTransitioning) return;

            const now = Date.now();
            if (now - lastSwipeTime < 300) return;

            const diffX = x - touchStartX;
            const diffY = y - touchStartY;
            const elapsed = now - touchStartTime;
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);

            // Minimum 35px drag distance and dominantly horizontal angle
            if (elapsed <= 800 && absX >= 35 && absX > absY * 1.1) {
                lastSwipeTime = now;
                if (diffX < 0) {
                    updateCassette(1); // Swipe left -> Next cassette
                } else {
                    updateCassette(-1); // Swipe right -> Previous cassette
                }
            }
        }

        // Mobile Touch Events
        cassetteDisplay.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                startSwipe(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        cassetteDisplay.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                moveSwipe(e.touches[0].clientX, e.touches[0].clientY, e);
            }
        }, { passive: false });

        cassetteDisplay.addEventListener('touchend', (e) => {
            if (e.changedTouches && e.changedTouches.length > 0) {
                endSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        }, { passive: true });

        cassetteDisplay.addEventListener('touchcancel', () => {
            isSwiping = false;
        }, { passive: true });

        // Desktop / Pointer Device Events
        let isPointerDown = false;
        cassetteDisplay.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return; // Handled by touch listeners
            if (e.button !== 0) return;
            isPointerDown = true;
            startSwipe(e.clientX, e.clientY);
            try { cassetteDisplay.setPointerCapture(e.pointerId); } catch (_) { }
        });

        cassetteDisplay.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch' || !isPointerDown) return;
            moveSwipe(e.clientX, e.clientY, e);
        });

        cassetteDisplay.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'touch' || !isPointerDown) return;
            isPointerDown = false;
            endSwipe(e.clientX, e.clientY);
            try { cassetteDisplay.releasePointerCapture(e.pointerId); } catch (_) { }
        });

        cassetteDisplay.addEventListener('pointercancel', (e) => {
            if (e.pointerType === 'touch') return;
            isPointerDown = false;
            isSwiping = false;
            try { cassetteDisplay.releasePointerCapture(e.pointerId); } catch (_) { }
        });
    }

    // Play Button -> Launch Game
    playBtn?.addEventListener('click', () => {
        if (isLaunchingGame || window.isGameTransitioning || window.isPixelIrisTransitioning) return;
        isLaunchingGame = true;
        window.isGameTransitioning = true;
        if (playBtn) playBtn.style.pointerEvents = 'none';

        if (audio.playGameStart) audio.playGameStart();
        else audio.playCassetteStart();
        launchGameMode(currentCassetteIndex);
    });

    // WIP Modal
    const wipModal = document.getElementById('wip-modal');
    const wipModalClose = document.getElementById('wip-modal-close');

    function showWipPopup() {
        audio.playSelect();
        if (wipModal) wipModal.classList.add('show');
    }

    function hideWipPopup() {
        if (wipModal) wipModal.classList.remove('show');
    }

    wipModalClose?.addEventListener('click', hideWipPopup);
    wipModal?.addEventListener('click', (e) => {
        if (e.target === wipModal) hideWipPopup();
    });

    // Select Cassette by Index
    function selectCassetteIndex(targetIndex) {
        if (targetIndex === currentCassetteIndex || isAnimatingCassette || !mainCassetteImg) {
            currentCassetteIndex = targetIndex;
            window.currentSelectedGameMode = cassettes[currentCassetteIndex].mode;
            try {
                localStorage.setItem(SAVED_GAME_MODE_KEY, window.currentSelectedGameMode);
            } catch (e) { }
            return;
        }
        isAnimatingCassette = true;

        const direction = targetIndex > currentCassetteIndex ? 1 : -1;
        currentCassetteIndex = targetIndex;
        window.currentSelectedGameMode = cassettes[currentCassetteIndex].mode;
        try {
            localStorage.setItem(SAVED_GAME_MODE_KEY, window.currentSelectedGameMode);
        } catch (e) { }

        const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
        const nextIndex = (currentCassetteIndex + 1) % cassettes.length;

        const outClass = direction === 1 ? 'slide-out-left' : 'slide-out-right';
        const inStartClass = direction === 1 ? 'slide-in-from-right' : 'slide-in-from-left';

        mainCassetteImg.className = `cassette-img ${outClass}`;

        setTimeout(() => {
            mainCassetteImg.src = cassettes[currentCassetteIndex].img;
            if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
            if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;

            if (tapeTitle) renderTapeTitleTypewriter(getTapeTitleText(cassettes[currentCassetteIndex]), true);
            if (tapeLevel) tapeLevel.textContent = getTapeScoreText(cassettes[currentCassetteIndex].mode);
            if (headerIcon) headerIcon.src = cassettes[currentCassetteIndex].icon;

            mainCassetteImg.className = `cassette-img ${inStartClass}`;
            void mainCassetteImg.offsetWidth;

            requestAnimationFrame(() => {
                mainCassetteImg.className = 'cassette-img';
                setTimeout(() => {
                    isAnimatingCassette = false;
                }, 280);
            });
        }, 220);
    }

    // Modes Modal
    const modesModal = document.getElementById('modes-modal');
    const modeCards = document.querySelectorAll('.mode-card');
    let classicResetInterval = null;

    function updateClassicResetCountdown() {
        const countdownEl = document.getElementById('classic-reset-countdown');
        if (!countdownEl) return;
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        const diff = Math.max(0, nextMidnight.getTime() - now.getTime());

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownEl.textContent = `(Resets in: ${hours}h ${minutes}m ${seconds}s)`;
    }

    function showModesPopup() {
        audio.playSelect();
        updateClassicResetCountdown();
        if (classicResetInterval) clearInterval(classicResetInterval);
        classicResetInterval = setInterval(updateClassicResetCountdown, 1000);
        if (modesModal) modesModal.classList.add('show');
    }

    function hideModesPopup() {
        if (classicResetInterval) {
            clearInterval(classicResetInterval);
            classicResetInterval = null;
        }
        if (modesModal) modesModal.classList.remove('show');
    }

    modeCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.playSelect();
            const index = parseInt(card.getAttribute('data-mode-index'), 10);
            if (!isNaN(index)) {
                selectCassetteIndex(index);
            }
            hideModesPopup();
        });
    });

    modesModal?.addEventListener('click', (e) => {
        if (e.target === modesModal) hideModesPopup();
    });

    gamemodeBtn?.addEventListener('click', () => {
        showModesPopup();
    });

    // Daily Quests Scroll Animations
    const questsScrollArea = document.getElementById('quests-scroll-area');
    const scrollDots = document.getElementById('scroll-dots');

    function updateQuestAnimations() {
        if (!questsScrollArea) return;
        const dailyView = document.getElementById('daily-view');
        if (dailyView && dailyView.classList.contains('hidden')) return;

        const questCards = questsScrollArea.querySelectorAll('.quest-card-frame');
        const containerRect = questsScrollArea.getBoundingClientRect();
        let hasMoreHiddenCards = false;

        questCards.forEach((card, idx) => {
            if (card.classList.contains('disappearing')) return;

            const cardRect = card.getBoundingClientRect();
            if (cardRect.height === 0) return;

            const visibleTop = Math.max(cardRect.top, containerRect.top);
            const visibleBottom = Math.min(cardRect.bottom, containerRect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibilityRatio = visibleHeight / cardRect.height;

            // Guarantee that at least the first 3 cards are always visible when viewing the top of the quest list
            const isInitialTopThree = (questsScrollArea.scrollTop < 40 && idx < 3);

            if (visibilityRatio >= 0.35 || isInitialTopThree) {
                card.classList.add('visible');
                card.classList.remove('exit-top', 'exit-bottom');
            } else {
                card.classList.remove('visible');
                const cardCenterY = cardRect.top + cardRect.height / 2;
                const containerCenterY = containerRect.top + containerRect.height / 2;
                if (cardCenterY < containerCenterY) {
                    card.classList.add('exit-top');
                    card.classList.remove('exit-bottom');
                } else {
                    card.classList.add('exit-bottom');
                    card.classList.remove('exit-top');
                }
            }

            if (cardRect.bottom > containerRect.bottom - (cardRect.height * 0.50)) {
                hasMoreHiddenCards = true;
            }
        });

        const lastCard = questCards.length > 0 ? questCards[questCards.length - 1] : null;
        const isLastCardVisible = lastCard && lastCard.classList.contains('visible');

        if (scrollDots) {
            if (isLastCardVisible || !hasMoreHiddenCards) {
                scrollDots.classList.add('hidden');
            } else {
                scrollDots.classList.remove('hidden');
            }
        }
    }

    function sortQuestCards() {
        if (!questsScrollArea) return;
        const cards = Array.from(questsScrollArea.querySelectorAll('.quest-card-frame:not(.disappearing)'));
        cards.sort((a, b) => {
            const aComp = a.classList.contains('completed') ? 1 : 0;
            const bComp = b.classList.contains('completed') ? 1 : 0;
            return bComp - aComp;
        });
        cards.forEach(card => questsScrollArea.appendChild(card));
    }

    sortQuestCards();

    if (questsScrollArea) {
        questsScrollArea.addEventListener('scroll', updateQuestAnimations);
        updateQuestAnimations();
    }

    // Ticket Fly Effect
    function spawnFlyingTicketEffect(startRect, rewardAmount) {
        const ticketItem = document.querySelector('.ticket-item');
        const ticketIcon = document.querySelector('.ticket-icon');
        const ticketCountSpan = document.getElementById('ticket-count');
        if (!ticketIcon || !ticketCountSpan) return;

        const targetRect = ticketIcon.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;

        const particle = document.createElement('img');
        particle.src = 'assets/ticket.png';
        particle.className = 'flying-ticket-particle';
        document.body.appendChild(particle);

        particle.style.left = `${startX}px`;
        particle.style.top = `${startY}px`;
        particle.style.transform = 'scale(0) rotate(0deg)';
        particle.style.opacity = '0';

        const duration = 580;
        particle.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.14s ease';
        particle.style.transform = 'scale(1.25) rotate(-10deg)';
        particle.style.opacity = '1';

        setTimeout(() => {
            const startTime = performance.now();
            const controlX = (startX + targetX) / 2 + 50;
            const controlY = Math.min(startX, targetY) - 75;

            function animateFlight(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const t = progress;
                const invT = 1 - t;
                const currX = invT * invT * startX + 2 * invT * t * controlX + t * t * targetX;
                const currY = invT * invT * startY + 2 * invT * t * controlY + t * t * targetY;

                const scale = 1.25 - progress * 0.45;
                const rotation = (progress * 360) % 360;

                particle.style.left = `${currX}px`;
                particle.style.top = `${currY}px`;
                particle.style.transform = `scale(${scale}) rotate(${rotation}deg)`;

                if (progress < 1) {
                    requestAnimationFrame(animateFlight);
                } else {
                    particle.remove();
                    const currentTickets = getTicketCount();
                    const newTickets = currentTickets + rewardAmount;
                    updateTicketDisplay(newTickets);

                    if (ticketItem) {
                        ticketItem.classList.remove('hud-punch');
                        void ticketItem.offsetWidth;
                        ticketItem.classList.add('hud-punch');
                    }
                    if (typeof audio !== 'undefined' && audio.playTicketCollect) {
                        audio.playTicketCollect();
                    } else if (typeof audio !== 'undefined' && audio.playCoin) {
                        audio.playCoin();
                    } else {
                        audio.playClick();
                    }
                }
            }

            requestAnimationFrame(animateFlight);
        }, 160);
    }

    // =========================================================================
    // MATCH FINISH CASSETTE TICKET COLLECT SYSTEM
    // =========================================================================
    window.savePendingMatchTickets = function () {
        const amount = window.currentMatchTicketsEarned || 0;
        const mode = window.currentSelectedGameMode || 'classic';
        if (amount > 0) {
            try {
                localStorage.setItem('pendingMatchTickets', JSON.stringify({ amount, mode }));
            } catch (e) { }
        } else {
            try {
                localStorage.removeItem('pendingMatchTickets');
            } catch (e) { }
        }
    };

    window.flushPendingMatchTicketsDirectly = function () {
        let amount = 0;
        try {
            const raw = localStorage.getItem('pendingMatchTickets');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.amount) amount = parsed.amount;
            }
        } catch (e) { }
        if (!amount && window.currentMatchTicketsEarned > 0) {
            amount = window.currentMatchTicketsEarned;
        }
        if (amount > 0) {
            const current = getTicketCount();
            updateTicketDisplay(current + amount);
        }
        window.currentMatchTicketsEarned = 0;
        try {
            localStorage.removeItem('pendingMatchTickets');
        } catch (e) { }
    };

    let isCassetteTicketCollectActive = false;

    function checkAndPlayMatchTicketCollectAnimation() {
        if (isCassetteTicketCollectActive) return;

        let pending = null;
        try {
            const raw = localStorage.getItem('pendingMatchTickets');
            if (raw) pending = JSON.parse(raw);
        } catch (e) { }

        const amount = pending && pending.amount ? pending.amount : (window.currentMatchTicketsEarned || 0);
        const mode = pending && pending.mode ? pending.mode : (window.currentSelectedGameMode || 'classic');

        if (!amount || amount <= 0) {
            try { localStorage.removeItem('pendingMatchTickets'); } catch (e) { }
            window.currentMatchTicketsEarned = 0;
            return;
        }

        const delay = window.isPixelIrisTransitioning ? 450 : 200;
        setTimeout(() => {
            playCassetteTicketCollectAnimation(amount, mode);
        }, delay);
    }
    window.checkAndPlayMatchTicketCollectAnimation = checkAndPlayMatchTicketCollectAnimation;

    function playCassetteTicketCollectAnimation(amount, mode) {
        if (isCassetteTicketCollectActive || !amount || amount <= 0) return;
        isCassetteTicketCollectActive = true;

        // 1. Ensure the cassette of the mode is active in the carousel
        if (mode) {
            const targetIdx = cassettes.findIndex(c => c.mode === mode);
            if (targetIdx !== -1 && targetIdx !== currentCassetteIndex) {
                currentCassetteIndex = targetIdx;
                window.currentSelectedGameMode = mode;
                if (mainCassetteImg) mainCassetteImg.src = cassettes[currentCassetteIndex].img;
                const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
                const nextIndex = (currentCassetteIndex + 1) % cassettes.length;
                if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
                if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;
                if (headerIcon) headerIcon.src = cassettes[currentCassetteIndex].icon;
                if (tapeTitle) renderTapeTitleTypewriter(getTapeTitleText(cassettes[currentCassetteIndex]), false);
                if (tapeLevel) tapeLevel.textContent = getTapeScoreText(cassettes[currentCassetteIndex].mode);
            }
        }

        const cassetteDisplay = document.getElementById('cassette-display');
        const cassetteImg = document.getElementById('current-cassette-img');
        const ticketItem = document.querySelector('.ticket-item');
        const ticketIcon = document.querySelector('.ticket-icon');
        const ticketCountSpan = document.getElementById('ticket-count');

        if (!cassetteDisplay || !ticketIcon || !ticketCountSpan) {
            window.flushPendingMatchTicketsDirectly();
            isCassetteTicketCollectActive = false;
            return;
        }

        // Clean up old badge if any
        const oldBadge = document.getElementById('cassette-ticket-reward-badge');
        if (oldBadge) oldBadge.remove();

        // 2. Create the ticket badge directly above the mode cassette
        const badge = document.createElement('div');
        badge.id = 'cassette-ticket-reward-badge';
        badge.className = 'cassette-ticket-reward-badge';
        badge.innerHTML = `
            <span class="cassette-ticket-badge-label">MATCH REWARD:</span>
            <img src="assets/ticket.png" class="cassette-ticket-badge-icon" alt="Ticket" draggable="false">
            <span class="cassette-ticket-badge-count">${amount}</span>
        `;
        cassetteDisplay.appendChild(badge);

        // 3. Pop-in animation with cassette bounce and SFX
        requestAnimationFrame(() => {
            badge.classList.add('badge-pop-in');

            if (cassetteImg) {
                cassetteImg.classList.remove('ticket-punch');
                void cassetteImg.offsetWidth;
                cassetteImg.classList.add('ticket-punch');
            }

            if (window.RetroAudio && typeof window.RetroAudio.playCoin === 'function') {
                window.RetroAudio.playCoin();
            } else if (audio && typeof audio.playCoin === 'function') {
                audio.playCoin();
            }
        });

        // 4. Anticipation hold: let user see the acquired ticket count (520ms)
        setTimeout(() => {
            const badgeRect = badge.getBoundingClientRect();
            const targetRect = ticketIcon.getBoundingClientRect();

            const startX = badgeRect.left + badgeRect.width / 2;
            const startY = badgeRect.top + badgeRect.height / 2;
            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + targetRect.height / 2;

            let numParticles = 1;
            if (amount <= 3) numParticles = amount;
            else if (amount <= 7) numParticles = 4;
            else if (amount <= 12) numParticles = 6;
            else numParticles = 8;

            const startTickets = getTicketCount();
            const flightDuration = 520;
            const staggerDelay = 80;

            for (let i = 0; i < numParticles; i++) {
                setTimeout(() => {
                    const particle = document.createElement('img');
                    particle.src = 'assets/ticket.png';
                    particle.className = 'flying-ticket-particle';
                    document.body.appendChild(particle);

                    const pStartX = startX + (Math.random() * 20 - 10);
                    const pStartY = startY + (Math.random() * 12 - 6);
                    particle.style.left = `${pStartX}px`;
                    particle.style.top = `${pStartY}px`;
                    particle.style.transform = 'scale(0) rotate(0deg)';
                    particle.style.opacity = '0';

                    particle.style.transition = 'transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.1s ease';
                    particle.style.transform = 'scale(1.3) rotate(-12deg)';
                    particle.style.opacity = '1';

                    setTimeout(() => {
                        const animStartTime = performance.now();
                        const controlX = (pStartX + targetX) / 2 + ((i % 2 === 0 ? 1 : -1) * (30 + Math.random() * 20));
                        const controlY = Math.min(pStartY, targetY) - (70 + Math.random() * 25);

                        function animateTicketFlight(currentTime) {
                            const elapsed = currentTime - animStartTime;
                            const progress = Math.min(elapsed / flightDuration, 1);

                            const t = progress;
                            const invT = 1 - t;
                            const currX = invT * invT * pStartX + 2 * invT * t * controlX + t * t * targetX;
                            const currY = invT * invT * pStartY + 2 * invT * t * controlY + t * t * targetY;

                            const scale = 1.3 - progress * 0.45;
                            const rotation = (progress * 360 * 1.5) % 360;

                            particle.style.left = `${currX}px`;
                            particle.style.top = `${currY}px`;
                            particle.style.transform = `scale(${scale}) rotate(${rotation}deg)`;

                            if (progress < 1) {
                                requestAnimationFrame(animateTicketFlight);
                            } else {
                                particle.remove();

                                // Punch impact
                                if (ticketItem) {
                                    ticketItem.classList.remove('hud-punch');
                                    void ticketItem.offsetWidth;
                                    ticketItem.classList.add('hud-punch');
                                }

                                if (window.RetroAudio && typeof window.RetroAudio.playTicketCollect === 'function') {
                                    window.RetroAudio.playTicketCollect();
                                } else if (audio && typeof audio.playTicketCollect === 'function') {
                                    audio.playTicketCollect();
                                } else if (audio && typeof audio.playCoin === 'function') {
                                    audio.playCoin();
                                }

                                const isLast = (i === numParticles - 1);
                                const progressAmount = Math.round((amount * (i + 1)) / numParticles);
                                const currentDisplayed = isLast ? (startTickets + amount) : (startTickets + progressAmount);
                                ticketCountSpan.textContent = `x${currentDisplayed}`;

                                if (isLast) {
                                    updateTicketDisplay(startTickets + amount);
                                    try { localStorage.removeItem('pendingMatchTickets'); } catch (e) { }
                                    window.currentMatchTicketsEarned = 0;

                                    setTimeout(() => {
                                        badge.classList.remove('badge-pop-in');
                                        badge.classList.add('badge-pop-out');
                                        setTimeout(() => {
                                            badge.remove();
                                            if (cassetteImg) cassetteImg.classList.remove('ticket-punch');
                                            isCassetteTicketCollectActive = false;
                                        }, 300);
                                    }, 200);
                                }
                            }
                        }

                        requestAnimationFrame(animateTicketFlight);
                    }, 100);
                }, i * staggerDelay);
            }
        }, 520);
    }
    window.playCassetteTicketCollectAnimation = playCassetteTicketCollectAnimation;

    // Load initial persisted data
    updateRecordScoreDisplay();
    updateTicketDisplay(getTicketCount());
    renderQuestListUI();
    initTextWaves();
    if (typeof window.checkAndPlayMatchTicketCollectAnimation === 'function') {
        window.checkAndPlayMatchTicketCollectAnimation();
    }

    // Vault Tape Selection
    const tapeCards3d = document.querySelectorAll('.tape-card-3d');
    function updateVaultTapeBadges(activeIndex) {
        tapeCards3d.forEach(card => {
            const index = parseInt(card.getAttribute('data-tape-index') || '0', 10);
            const badge = card.querySelector('.vault-tape-badge');
            if (index === activeIndex) {
                card.classList.add('active');
                if (badge) {
                    badge.textContent = 'EQUIPPED';
                    badge.classList.add('equipped');
                }
            } else {
                card.classList.remove('active');
                if (badge) {
                    badge.textContent = 'OWNED';
                    badge.classList.remove('equipped');
                }
            }
        });
    }

    tapeCards3d.forEach(card => {
        card.addEventListener('click', () => {
            audio.playSelect();
            const index = parseInt(card.getAttribute('data-tape-index') || '0', 10);
            selectCassetteIndex(index);
            updateVaultTapeBadges(index);
        });
    });

    // Tab Switching con Transizione Fluida a 60 FPS (Anti Frame-Drop)
    let isTabTransitioning = false;
    let isLaunchingGame = false;
    let currentActiveNav = 'home';

    function switchHomeTab(nav) {
        if (!nav || isTabTransitioning || currentActiveNav === nav) return;

        const targetTab = document.querySelector(`#home-screen .tab-btn[data-nav="${nav}"]`);
        if (!targetTab) {
            showWipPopup();
            return;
        }

        const views = {
            'home': document.getElementById('home-view'),
            'daily': document.getElementById('daily-view'),
            'shop': document.getElementById('shop-view'),
            'inventory': document.getElementById('vault-view')
        };

        const currentView = views[currentActiveNav];
        const nextView = views[nav];

        if (!nextView) {
            showWipPopup();
            return;
        }

        isTabTransitioning = true;
        if (typeof closeVaultBgDrawer === 'function') closeVaultBgDrawer();
        audio.playSelect();

        // 1. Aggiorna lo stato attivo del bottone nella barra inferiore
        tabBtns.forEach(t => t.classList.remove('active'));
        targetTab.classList.add('active');

        // 2. Attiva la riga di energia / scanline shimmer di transizione
        const beam = document.getElementById('home-view-transition-bar');
        if (beam) {
            beam.classList.remove('animating');
            void beam.offsetWidth;
            beam.classList.add('animating');
        }

        // 3. Avvia la dissolvenza in uscita della vista corrente
        if (currentView) {
            currentView.classList.remove('view-active', 'view-entering');
            currentView.classList.add('view-exiting');
        }

        // 4. Pre-carica la nuova vista con opacità 0 così il browser calcola il layout in GPU
        nextView.classList.remove('hidden');
        nextView.classList.remove('view-active', 'view-exiting');
        nextView.classList.add('view-entering');

        if (nav === 'daily') {
            const qContainer = document.getElementById('quests-scroll-area');
            if (qContainer) {
                qContainer.scrollTop = 0;
            }
        } else if (nav === 'inventory') {
            updateVaultTapeBadges(currentCassetteIndex);
            updateBgThemeUI();
        }

        // 5. Completamento transizione con doppio rAF per garantire frame rate costante (60 FPS)
        setTimeout(() => {
            if (currentView && currentView !== nextView) {
                currentView.classList.add('hidden');
                currentView.classList.remove('view-exiting');
            }

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    nextView.classList.remove('view-entering');
                    nextView.classList.add('view-active');

                    if (nav === 'daily') {
                        const qContainer = document.getElementById('quests-scroll-area');
                        if (qContainer) {
                            qContainer.scrollTop = 0;
                        }
                        localStorage.setItem('dailyQuestsViewedReset', localStorage.getItem('dailyQuestsLastReset') || '');
                        if (typeof updateDailyResetCountdown === 'function') {
                            updateDailyResetCountdown();
                        } else {
                            renderQuestListUI();
                        }
                        requestAnimationFrame(updateQuestAnimations);
                    } else if (nav === 'inventory') {
                        localStorage.removeItem('hasNewInventoryItem');
                    } else if (nav === 'shop') {
                        if (typeof updateDailyShopUI === 'function') updateDailyShopUI();
                    }
                    if (typeof updateTabBadges === 'function') updateTabBadges();

                    setTimeout(() => {
                        isTabTransitioning = false;
                        currentActiveNav = nav;
                    }, 220);
                });
            });
        }, 130);
    }

    window.switchHomeTab = switchHomeTab;

    tabBtns.forEach(tab => {
        tab.addEventListener('click', () => {
            const nav = tab.getAttribute('data-nav');
            switchHomeTab(nav);
        });
    });

    // --- DAILY SHOP REWARDS INITIALIZATION ---
    function initDailyShopRewards() {
        updateDailyShopUI();

        const claimBtn = document.getElementById('daily-reward-claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const state = getDailyShopState();

                if (!state.freeGiftClaimed) {
                    audio.playCoin();
                    spawnFlyingTicketEffect(claimBtn.getBoundingClientRect(), 3);
                    state.freeGiftClaimed = true;
                    saveDailyShopState(state);
                    updateDailyShopUI();
                    updateTabBadges();
                } else if (state.adsWatchedCount < 5) {
                    audio.playSelect();
                    try {
                        claimBtn.style.pointerEvents = 'none';
                        if (typeof window.showRewardedForContinue === 'function') {
                            await window.showRewardedForContinue();
                        }
                        audio.playCoin();
                        spawnFlyingTicketEffect(claimBtn.getBoundingClientRect(), 10);
                        state.adsWatchedCount++;
                        saveDailyShopState(state);
                        updateDailyShopUI();
                        updateTabBadges();
                    } catch (err) {
                        console.warn('[Shop Rewarded Ad] Ad dismiss or error:', err);
                    } finally {
                        claimBtn.style.pointerEvents = 'auto';
                    }
                }
            });
        }

        const resetBtn = document.getElementById('btn-reset-daily-reward');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                resetFreeTickets();
            });
        }

        const testResetBtn = document.getElementById('btn-test-reset-free-tickets');
        if (testResetBtn) {
            testResetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                resetFreeTickets();
            });
        }

        const btnCompleteRandomQuest = document.getElementById('btn-complete-random-quest');
        if (btnCompleteRandomQuest) {
            btnCompleteRandomQuest.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                completeRandomQuest();
            });
        }
    }

    function completeRandomQuest() {
        const states = getQuestStates();

        // 1. Cerca quest ancora da completare
        let candidates = QUEST_DEFINITIONS.filter(def => {
            const s = states[def.id];
            return !s || (!s.claimed && (s.progress || 0) < def.target);
        });

        // 2. Se tutte sono già pronte/in progresso, cerca tra quelle non ancora riscattate
        if (candidates.length === 0) {
            candidates = QUEST_DEFINITIONS.filter(def => {
                const s = states[def.id];
                return !s || !s.claimed;
            });
        }

        // 3. Se tutte sono state già riscattate, prendi qualsiasi quest e resettala
        if (candidates.length === 0) {
            candidates = QUEST_DEFINITIONS;
        }

        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        states[chosen.id] = { progress: chosen.target, claimed: false };
        saveQuestStatesData(states);

        if (typeof renderQuestListUI === 'function') {
            renderQuestListUI();
        }
        if (typeof updateTabBadges === 'function') {
            updateTabBadges();
        }

        // Passa direttamente alla tab 'daily' (Daily Quests) per mostrare l'obiettivo completato
        if (typeof switchHomeTab === 'function') {
            switchHomeTab('daily');
        }

        // Chiudi menu strumenti rapidi se aperto
        const menuContent = document.getElementById('sub-tray-content');
        const menuContainer = document.getElementById('sub-tray-menu-container');
        if (menuContent) menuContent.classList.add('collapsed');
        if (menuContainer) menuContainer.classList.remove('expanded');

        return chosen;
    }
    window.completeRandomQuest = completeRandomQuest;

    initDailyShopRewards();
    updateTabBadges();

    // Periodic Countdown & Midnight Reset Checker
    function updateDailyResetCountdown() {
        const subtitleEl = document.querySelector('.daily-quests-subtitle');
        if (subtitleEl) {
            subtitleEl.textContent = `RESET IN: ${getTimeUntilNextReset()}`;
        }

        const didReset = checkAndApplyMidnightReset();
        if (didReset) {
            renderQuestListUI();
            updateDailyShopUI();
            updateTabBadges();
        }
    }
    window.updateDailyResetCountdown = updateDailyResetCountdown;
    setInterval(updateDailyResetCountdown, 1000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateDailyResetCountdown();
        }
    });

    // Buy No Ads
    document.getElementById('buy-no-ads-btn')?.addEventListener('click', () => {
        audio.playCassetteStart();
        showWipPopup();
    });

    // Home Screen Ticket Packs Purchase (Exclude Daily Reward Pack)
    const homeTicketCards = document.querySelectorAll('#shop-view .ticket-pack-card:not(.daily-reward-pack-card)');
    homeTicketCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const amount = parseInt(card.getAttribute('data-tickets') || '200', 10);
            const price = card.getAttribute('data-price') || '1.99';

            audio.playCoin();
            spawnFlyingTicketEffect(card.getBoundingClientRect(), amount);

            setTimeout(() => {
                if (typeof openGameModal === 'function') {
                    openGameModal(
                        'PURCHASE SUCCESSFUL',
                        `<div style="text-align:center; padding:15px; font-size:14px; color:#22c55e; font-weight:bold; text-shadow:1px 1px 0 #000;">
                            YOU PURCHASED ${amount} TICKETS FOR €${price}!
                        </div>`
                    );
                }
            }, 620);
        });
    });

    // --- BACKGROUND THEME SYSTEM (Blue, Pink, Purple, Green, Orange, Gold Checkerboard) ---
    const BG_THEMES = [
        { id: 'default', title: 'BLUE CHECKERED', previewClass: 'default-blue', price: 0, shopBtnId: null },
        { id: 'pink-white', title: 'PINK CHECKERED', previewClass: 'pink-white', price: 250, shopBtnId: 'buy-pink-white-bg-btn' },
        { id: 'purple-white', title: 'PURPLE CHECKERED', previewClass: 'purple-white', price: 350, shopBtnId: 'buy-purple-white-bg-btn' },
        { id: 'green-white', title: 'GREEN CHECKERED', previewClass: 'green-white', price: 450, shopBtnId: 'buy-green-white-bg-btn' },
        { id: 'orange-white', title: 'ORANGE CHECKERED', previewClass: 'orange-white', price: 550, shopBtnId: 'buy-orange-white-bg-btn' },
        { id: 'gold-white', title: 'GOLD CHECKERED', previewClass: 'gold-white', price: 650, shopBtnId: 'buy-gold-white-bg-btn' }
    ];
    let selectedBgThemeId = null;
    let bgGridPageIndex = 0;

    function getUnlockedBgThemes() {
        try {
            const saved = localStorage.getItem('unlockedBgThemes');
            if (!saved) return ['default'];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : ['default'];
        } catch (e) {
            return ['default'];
        }
    }

    function getEquippedBgTheme() {
        return localStorage.getItem('equippedBgTheme') || 'default';
    }
    window.getEquippedBgTheme = getEquippedBgTheme;

    const THEME_BOTTOM_CASSETTES = {
        'default': 'assets/home/blue-cassette.png',
        'pink-white': 'assets/home/pink-cassette.png',
        'purple-white': 'assets/home/purple-cassette.png',
        'green-white': 'assets/home/green-cassette.png',
        'orange-white': 'assets/home/orange-cassette.png',
        'gold-white': 'assets/home/yellow-cassette.png'
    };

    // Pre-carica e decodifica le immagini per il cambio tema per eliminare qualsiasi calo di frame
    try {
        Object.values(THEME_BOTTOM_CASSETTES).forEach(src => {
            const img = new Image();
            img.src = src;
            if (typeof img.decode === 'function') {
                img.decode().catch(() => {});
            }
        });
    } catch (e) {}

    let isThemeSystemInitialized = false;

    function applyBgTheme(theme, withTransition = null, onComplete = null) {
        const currentEquipped = getEquippedBgTheme();
        const shouldAnimate = withTransition !== null
            ? withTransition
            : (isThemeSystemInitialized && currentEquipped !== theme);

        const executeThemeChange = async () => {
            localStorage.setItem('equippedBgTheme', theme);
            selectedBgThemeId = theme;
            const unlockedThemes = getUnlockedBgThemes();
            const owned = BG_THEMES.filter(t => unlockedThemes.includes(t.id));
            const idx = owned.findIndex(t => t.id === theme);
            if (idx !== -1) {
                bgGridPageIndex = Math.floor(idx / 3);
            }
            document.body.classList.remove('theme-default', 'theme-pink-white', 'theme-purple-white', 'theme-green-white', 'theme-orange-white', 'theme-gold-white');
            if (theme === 'pink-white') {
                document.body.classList.add('theme-pink-white');
            } else if (theme === 'purple-white') {
                document.body.classList.add('theme-purple-white');
            } else if (theme === 'green-white') {
                document.body.classList.add('theme-green-white');
            } else if (theme === 'orange-white') {
                document.body.classList.add('theme-orange-white');
            } else if (theme === 'gold-white') {
                document.body.classList.add('theme-gold-white');
            } else {
                document.body.classList.add('theme-default');
            }

            const displayScreen = document.getElementById('display-screen');
            if (displayScreen) {
                const targetSrc = THEME_BOTTOM_CASSETTES[theme] || THEME_BOTTOM_CASSETTES['default'];
                if (displayScreen.getAttribute('src') !== targetSrc) {
                    displayScreen.src = targetSrc;
                    if (typeof displayScreen.decode === 'function') {
                        try {
                            await displayScreen.decode();
                        } catch (e) {}
                    }
                }
            }

            updateBgThemeUI();
            if (window.goBalatroShaderInstance && typeof window.getThemeBalatroColors === 'function') {
                window.goBalatroShaderInstance.opts.colours = window.getThemeBalatroColors();
            }
        };

        if (shouldAnimate && typeof window.triggerPixelIrisTransition === 'function') {
            window.triggerPixelIrisTransition(executeThemeChange, onComplete);
        } else {
            Promise.resolve(executeThemeChange()).then(() => {
                if (typeof onComplete === 'function') onComplete();
            });
        }
    }
    window.applyBgTheme = applyBgTheme;

    const BG_THEME_DETAILS = {
        'default': {
            slot: '00',
            title: 'BLUE BACKGROUND',
            desc: 'CLASSIC RETRO BLUE CHECKERED DYNAMIC BACKGROUND (HOME & GAME)',
            previewClass: 'default-blue-preview-icon',
            tileClass: 'default-blue',
            shortTitle: 'BLUE'
        },
        'pink-white': {
            slot: '01',
            title: 'PINK BACKGROUND',
            desc: 'UNLOCK PINK CHECKERED DYNAMIC BACKGROUND (HOME & GAME)!',
            previewClass: 'pink-white-preview-icon',
            tileClass: 'pink-white',
            shortTitle: 'PINK'
        },
        'purple-white': {
            slot: '02',
            title: 'PURPLE BACKGROUND',
            desc: 'UNLOCK PURPLE CHECKERED DYNAMIC BACKGROUND (HOME & GAME)!',
            previewClass: 'purple-white-preview-icon',
            tileClass: 'purple-white',
            shortTitle: 'PURPLE'
        },
        'green-white': {
            slot: '03',
            title: 'GREEN BACKGROUND',
            desc: 'UNLOCK GREEN CHECKERED DYNAMIC BACKGROUND (HOME & GAME)!',
            previewClass: 'green-white-preview-icon',
            tileClass: 'green-white',
            shortTitle: 'GREEN'
        },
        'orange-white': {
            slot: '04',
            title: 'ORANGE BACKGROUND',
            desc: 'UNLOCK ORANGE CHECKERED DYNAMIC BACKGROUND (HOME & GAME)!',
            previewClass: 'orange-white-preview-icon',
            tileClass: 'orange-white',
            shortTitle: 'ORANGE'
        },
        'gold-white': {
            slot: '05',
            title: 'GOLD BACKGROUND',
            desc: 'UNLOCK LUXURY GOLD CHECKERED DYNAMIC BACKGROUND (HOME & GAME)!',
            previewClass: 'gold-white-preview-icon',
            tileClass: 'gold-white',
            shortTitle: 'GOLD'
        }
    };

    function updateVaultActiveBgCard() {
        const equipped = getEquippedBgTheme();
        const details = BG_THEME_DETAILS[equipped] || BG_THEME_DETAILS['default'];

        const slotEl = document.getElementById('vault-active-bg-slot');
        const iconContainer = document.getElementById('vault-active-bg-icon-container');
        const titleEl = document.getElementById('vault-active-bg-title');
        const descEl = document.getElementById('vault-active-bg-desc');

        if (slotEl) slotEl.textContent = details.slot;
        if (titleEl) titleEl.textContent = details.title;
        if (descEl) descEl.textContent = details.desc;
        if (iconContainer) {
            iconContainer.innerHTML = `<div class="${details.previewClass}" id="vault-active-bg-preview"></div>`;
        }
    }

    function updateVaultBgSelectGrid() {
        const unlocked = getUnlockedBgThemes();
        const equipped = getEquippedBgTheme();
        const gridEl = document.getElementById('vault-bg-select-grid');
        if (!gridEl) return;

        gridEl.innerHTML = BG_THEMES.map(t => {
            const details = BG_THEME_DETAILS[t.id] || BG_THEME_DETAILS['default'];
            const isEquipped = t.id === equipped;
            const isUnlocked = unlocked.includes(t.id);
            return `
                <button class="vault-bg-select-item ${isEquipped ? 'equipped' : ''} ${isUnlocked ? 'unlocked' : 'locked'}" 
                        data-bg-id="${t.id}" 
                        type="button"
                        aria-label="${details.title}">
                    <div class="vault-bg-select-thumb">
                        <div class="vault-bg-tile-preview ${details.tileClass}"></div>
                        ${!isUnlocked ? '<div class="vault-bg-lock-overlay"><span class="vault-bg-lock-icon">🔒</span></div>' : ''}
                    </div>
                </button>
            `;
        }).join('');

        // Click listener for each preview tile
        gridEl.querySelectorAll('.vault-bg-select-item').forEach(tile => {
            tile.addEventListener('click', () => {
                const bgId = tile.getAttribute('data-bg-id');
                if (!bgId) return;

                const currentUnlocked = getUnlockedBgThemes();
                const currentEquipped = getEquippedBgTheme();

                if (!currentUnlocked.includes(bgId)) {
                    if (typeof audio !== 'undefined' && audio.playError) audio.playError();
                    const themeObj = BG_THEMES.find(t => t.id === bgId);
                    if (typeof openGameModal === 'function' && themeObj) {
                        openGameModal(
                            'LOCKED BACKGROUND',
                            `<div style="text-align:center; padding: 15px; color:#ffcc00; font-weight:bold; font-size:13px; text-shadow:1px 1px 0 #000;">
                                ${themeObj.title} is locked!<br><br>Purchase it in the Shop for ${themeObj.price} Tickets.
                            </div>`
                        );
                    }
                    return;
                }

                if (currentEquipped === bgId) {
                    if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
                    return;
                }

                if (typeof audio !== 'undefined' && audio.playSelect) audio.playSelect();
                else if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();

                applyBgTheme(bgId, true);
            });
        });
    }

    function updateBgThemeUI() {
        const unlocked = getUnlockedBgThemes();
        const equipped = getEquippedBgTheme();

        // 1. Update Shop Card Buttons dynamically for all themes
        BG_THEMES.forEach(t => {
            if (!t.shopBtnId) return;
            const btn = document.getElementById(t.shopBtnId);
            if (btn) {
                if (equipped === t.id) {
                    btn.className = 'shop-buy-btn ticket-buy-btn equipped';
                    btn.innerHTML = '<span class="shop-price-text">EQUIPPED</span>';
                } else if (unlocked.includes(t.id)) {
                    btn.className = 'shop-buy-btn ticket-buy-btn owned';
                    btn.innerHTML = '<span class="shop-price-text">EQUIP</span>';
                } else {
                    btn.className = 'shop-buy-btn ticket-buy-btn buy-price-btn';
                    btn.innerHTML = `<img src="assets/ticket.png" alt="Ticket" class="btn-ticket-icon"><span class="shop-price-text">${t.price}</span>`;
                }
            }
        });

        // 2. Update Vault Active BG Card & Select Drawer
        updateVaultActiveBgCard();
        updateVaultBgSelectGrid();
    }

    function buyOrEquipTheme(themeId) {
        if (window.isPixelIrisTransitioning) return;

        const themeObj = BG_THEMES.find(t => t.id === themeId);
        if (!themeObj) return;

        let unlocked = getUnlockedBgThemes();
        let equipped = getEquippedBgTheme();

        if (equipped === themeId) {
            return;
        }

        if (unlocked.includes(themeId)) {
            if (typeof audio !== 'undefined' && audio.playSelect) audio.playSelect();
            else if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
            applyBgTheme(themeId, true);
            return;
        }

        // Must buy for themeObj.price tickets
        const currentTickets = getTicketCount();
        if (currentTickets < themeObj.price) {
            if (typeof audio !== 'undefined' && audio.playError) audio.playError();
            if (typeof openGameModal === 'function') {
                openGameModal(
                    'INSUFFICIENT TICKETS',
                    `<div style="text-align:center; padding: 15px; color:#ff5555; font-weight:bold; font-size:14px; text-shadow:1px 1px 0 #000;">INSUFFICIENT TICKETS!<br><br>You need ${themeObj.price} Tickets to purchase ${themeObj.title}.</div>`
                );
            }
            return;
        }

        // Deduct tickets
        updateTicketDisplay(currentTickets - themeObj.price);
        if (typeof audio !== 'undefined' && audio.playPurchase) audio.playPurchase();
        else if (typeof audio !== 'undefined' && audio.playCoin) audio.playCoin();

        if (!unlocked.includes(themeId)) {
            unlocked.push(themeId);
            localStorage.setItem('hasNewInventoryItem', 'true');
        }
        localStorage.setItem('unlockedBgThemes', JSON.stringify(unlocked));
        applyBgTheme(themeId, true, () => {
            if (typeof updateTabBadges === 'function') updateTabBadges();
            if (typeof openGameModal === 'function') {
                openGameModal(
                    'BACKGROUND UNLOCKED!',
                    `<div style="text-align:center; padding: 15px; color:#ffcc00; font-weight:bold; font-size:14px; text-shadow:1px 1px 0 #000;">YOU UNLOCKED AND EQUIPPED ${themeObj.title.toUpperCase()}!</div>`
                );
            }
        });
    }

    // Initialize Theme on Load from saved state without animation
    applyBgTheme(getEquippedBgTheme(), false);
    isThemeSystemInitialized = true;

    // Event Listeners for Theme Purchase & Equip in Shop & Vault
    document.getElementById('buy-pink-white-bg-btn')?.addEventListener('click', () => {
        buyOrEquipTheme('pink-white');
    });

    document.getElementById('buy-purple-white-bg-btn')?.addEventListener('click', () => {
        buyOrEquipTheme('purple-white');
    });

    document.getElementById('buy-green-white-bg-btn')?.addEventListener('click', () => {
        buyOrEquipTheme('green-white');
    });

    document.getElementById('buy-orange-white-bg-btn')?.addEventListener('click', () => {
        buyOrEquipTheme('orange-white');
    });

    document.getElementById('buy-gold-white-bg-btn')?.addEventListener('click', () => {
        buyOrEquipTheme('gold-white');
    });

    const changeBgBtn = document.getElementById('vault-change-bg-btn');
    const bgSelectDrawer = document.getElementById('vault-bg-select-drawer');
    const changeBgBtnText = document.getElementById('vault-change-bg-btn-text');

    function closeVaultBgDrawer() {
        if (bgSelectDrawer && !bgSelectDrawer.classList.contains('hidden')) {
            bgSelectDrawer.classList.add('hidden');
            if (changeBgBtnText) changeBgBtnText.textContent = 'CHANGE';
            if (changeBgBtn) changeBgBtn.classList.remove('active');
        }
    }
    window.closeVaultBgDrawer = closeVaultBgDrawer;

    changeBgBtn?.addEventListener('click', () => {
        if (typeof audio !== 'undefined' && audio.playClick) audio.playClick();
        if (!bgSelectDrawer) return;
        const isHidden = bgSelectDrawer.classList.contains('hidden');
        if (isHidden) {
            bgSelectDrawer.classList.remove('hidden');
            if (changeBgBtnText) changeBgBtnText.textContent = 'CLOSE';
            changeBgBtn.classList.add('active');
        } else {
            closeVaultBgDrawer();
        }
    });

    // Home Settings Button -> Open In-Game Settings Modal
    settingBtn?.addEventListener('click', () => {
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) {
            btnSettings.click();
        } else {
            audio.playClick();
            showWipPopup();
        }
    });

    // Initial state setup: Ensure Home Screen is shown at launch without triggering audio
    window.showHomeScreen(false);

    // Studio Loading Splash Screen Dismissal (Metalcore Digital)
    const splashEl = document.getElementById('game-splash-screen');
    if (splashEl) {
        let dismissed = false;
        const dismissSplash = () => {
            if (dismissed) return;
            dismissed = true;
            splashEl.classList.add('fade-out');
            setTimeout(() => {
                if (splashEl.parentElement) splashEl.remove();
            }, 550);
            // Avvia l'effetto macchina da scrivere con sfx solo quando si entra effettivamente nella schermata di Home
            if (tapeTitle && cassettes[currentCassetteIndex]) {
                setTimeout(() => {
                    renderTapeTitleTypewriter(getTapeTitleText(cassettes[currentCassetteIndex]), true);
                }, 180);
            }
        };
        splashEl.addEventListener('click', dismissSplash, { once: true });
        setTimeout(dismissSplash, 1200);
    }
});
