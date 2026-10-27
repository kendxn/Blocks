
function refreshDOMElements() {
    boardElement = document.getElementById('board');
    scoreElement = document.getElementById('currentScoreDisplay') || document.getElementById('score');
    highScoreElement = document.getElementById('maxScoreDisplay') || document.getElementById('high-score');
    linesText = document.getElementById('linesClearedText') || document.getElementById('lines-text');
    gameOverScreen = document.getElementById('game-over');
    playBtn = document.getElementById('play-btn');
    canvas = document.getElementById('confetti-canvas');
    if (canvas) ctx = canvas.getContext('2d');
}


var BOARD_SIZE = 8;
var boardElement = document.getElementById('board');
var scoreElement = document.getElementById('currentScoreDisplay') || document.getElementById('score');
var highScoreElement = document.getElementById('maxScoreDisplay') || document.getElementById('high-score');
var linesText = document.getElementById('linesClearedText') || document.getElementById('lines-text');
var gameOverScreen = document.getElementById('game-over');
var playBtn = document.getElementById('play-btn');
var canvas = document.getElementById('confetti-canvas');
var ctx = canvas.getContext('2d');

var boardState = [];
var lastPlacedColor = null;
var score = 0;
var highScore = parseInt(localStorage.getItem('blockBlast3DHighScore8x8')) || 0;
var userCoins = 10;
var shopTurnCount = 0;

function updateDigitScaling(element, val, baseSizeCqh, shiftPerDigitVw = 0) {
    if (!element) return;
    const strVal = String(val).replace(/,/g, '').replace(/\./g, '');
    const numDigits = Math.max(1, strVal.length);
    let scaleFactor = 1.0;
    if (numDigits >= 6) {
        scaleFactor = 0.82;
    } else if (numDigits === 5) {
        scaleFactor = 0.88;
    } else if (numDigits === 4) {
        scaleFactor = 0.94;
    } else {
        scaleFactor = 1.0;
    }
    const finalSize = (baseSizeCqh * scaleFactor).toFixed(2);
    element.style.fontSize = `${finalSize}cqh`;

    const isCentered = element.id === 'currentScoreDisplay' || element.classList.contains('current-score-digits');
    let transforms = [];
    if (isCentered) {
        transforms.push('translate(-50%, -50%)');
    }
    if (shiftPerDigitVw > 0 && numDigits > 1) {
        const shiftVw = (numDigits - 1) * shiftPerDigitVw;
        if (shiftVw > 0) {
            transforms.push(`translateX(${shiftVw.toFixed(2)}vw)`);
        }
    }
    element.style.transform = transforms.join(' ');
}

function updateCoinsDisplay() {
    const els = document.querySelectorAll('#linesCoinDisplay, #topBarCoinsDisplay, .coin-count-number, .coins-count');
    const displayVal = Number.isInteger(userCoins) ? userCoins : Number(userCoins.toFixed(1));
    els.forEach(el => {
        el.textContent = displayVal;
        updateDigitScaling(el, displayVal, 2.07, 1.0);
    });
}

function addCoins(amount) {
    let mult = 1.0;
    if (typeof SKILLS_CONFIG !== 'undefined' && SKILLS_CONFIG.golden_apple && SKILLS_CONFIG.golden_apple.unlocked && SKILLS_CONFIG.golden_apple.active) {
        mult = 1.2;
    }
    const earnedAmount = amount * mult;
    userCoins += earnedAmount;
    userCoins = Math.round(userCoins * 100) / 100;
    updateCoinsDisplay();

    if (typeof spawnFlyingCoinEffect === 'function' && earnedAmount > 0) {
        spawnFlyingCoinEffect(window.lastPlacedPos || { percentX: 50, percentY: 50 }, earnedAmount);
    } else if (earnedAmount > 0 && window.RetroAudio) {
        window.RetroAudio.playCoin();
    }
    if (typeof window.saveGameSnapshot === 'function') window.saveGameSnapshot();
}
var sessionStartHighScore = highScore;
var achievedNewRecord = false;
var hasTriggeredRecordScreen = false;
var activePieces = [];

var linesEliminated = 0;
var comboCount = 0;
var comboTolerance = 0;
var comboLevel = 1;
var consecutiveClears = 0;
var skillDiscardActive = false;
var skillRotateActive = false;
var skillSingleActive = false;
var turnHasDragged = false;
var hasPlacedPieceInTurn = false;
var gameOver = false;
var rotationsUsedThisTurn = 0;
var discardsUsedThisTurn = 0;
var noClearTurnCount = 0;
var sourLemonColumnTurns = 0;
var chocolateScoreProgress = 0;
var fluffyBreadTurnCount = 0;

function updateComboToleranceUI() {
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
window.updateComboToleranceUI = updateComboToleranceUI;

var SKILLS_CONFIG = {
    wealthy_chocolate: {
        id: 'wealthy_chocolate',
        name: 'WEALTHY CHOCOLATE (RARE) 🍫',
        icon: '🍫',
        description: 'Every 900 points earned: +3 to counter',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    resonant_friedegg: {
        id: 'resonant_friedegg',
        name: 'RESONANT FRIED EGG (RARE) 🍳',
        icon: '🍳',
        description: 'Whenever you clear 3 or more lines in a single move: +2 to counter',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    swift_pizza: {
        id: 'swift_pizza',
        name: 'SWIFT PIZZA (RARE) 🍕',
        icon: '🍕',
        description: 'Drag a piece off the top edge at the start of your turn to replace it with a random one.',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    layered_sandwich: {
        id: 'layered_sandwich',
        name: 'LAYERED SANDWICH (RARE) 🥪',
        icon: '🥪',
        description: 'Clear 2 or more lines simultaneously in one move: +50% bonus points',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    half_taco: {
        id: 'half_taco',
        name: 'HALF TACO (RARE) 🌮',
        icon: '🌮',
        description: 'Roll in shop costs 0.5 coins',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    single_donut: {
        id: 'single_donut',
        name: 'Single BAGEL (RARE) 🍩',
        icon: '🍩',
        description: 'When clearing a 4x4 slot, 60% chance to gain +1 coin',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    rich_pumpkin: {
        id: 'rich_pumpkin',
        name: 'Rich Pumpkin (COMMON) 🎃',
        icon: '🎃',
        description: 'Chance that a piece with 5+ blocks doubles the counter increase when scoring',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    double_pear: {
        id: 'double_pear',
        name: 'Double Pear (COMMON) 🍐',
        icon: '🍐',
        description: 'Chance that clearing a line grants +2 to counter',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    linear_orange: {
        id: 'linear_orange',
        name: 'Linear Orange (COMMON) 🍊',
        icon: '🍊',
        description: 'If no lines or columns cleared in 4 turns: +2 to counter and +50 points',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    sour_lemon: {
        id: 'sour_lemon',
        name: 'Sour Lemon (COMMON) 🍋',
        icon: '🍋',
        description: 'If only columns cleared in 7 turns: +2 to counter',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    light_strawberry: {
        id: 'light_strawberry',
        name: 'Kaboom Strawberry (COMMON) 🍓',
        icon: '🍓',
        description: 'Explodes a random 4x4 slot when closing the shop (can be bought up to 3 times)',
        price: 60,
        unlocked: false,
        active: false,
        purchasesCount: 0,
        maxPurchases: 3,
        pendingExplosions: 0,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    tiny_cherry: {
        id: 'tiny_cherry',
        name: 'TINY CHERRY (COMMON) 🍒',
        icon: '🍒',
        description: 'Unlocks and provides +5% chance to spawn a single block piece (1x1)',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    supreme_watermelon: {
        id: 'supreme_watermelon',
        name: 'SUPREME WATERMELON (COMMON) 🍉',
        icon: '🍉',
        description: 'Completely clearing the board: +200 points and +2 coins',
        price: 70,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    shielded_corn: {
        id: 'shielded_corn',
        name: 'SHIELDED CORN (COMMON) 🌽',
        icon: '🌽',
        description: 'Every block placed on edge grants +10 points if placement completes lines/columns',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    juicy_grapes: {
        id: 'juicy_grapes',
        name: 'JUICY GRAPES (COMMON) 🍇',
        icon: '🍇',
        description: 'Every combo > 8: +0.4 coins',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    shining_tomato: {
        id: 'shining_tomato',
        name: 'SHINING TOMATO (COMMON) 🍅',
        icon: '🍅',
        description: 'Chance to add +2 to line counter when scoring points',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    golden_apple: {
        id: 'golden_apple',
        name: 'GOLDEN APPLE (COMMON) 🍎',
        icon: '🍎',
        description: 'Increases coin earnings by 20%',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    curved_banana: {
        id: 'curved_banana',
        name: 'CURVED BANANA (COMMON) 🍌',
        icon: '🍌',
        description: 'Double tap a piece in the tray to rotate it',
        price: 50,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: 1
    },
    sweet_strawberry: {
        id: 'sweet_strawberry',
        name: 'SWEET STRAWBERRY (COMMON) 🍓',
        icon: '🍓',
        description: '5% chance to spawn a Golden Piece. Clear its blocks for +0.40 coins each',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    fluffy_bread: {
        id: 'fluffy_bread',
        name: 'FLUFFY BREAD (RARE) 🍞',
        icon: '🍞',
        description: 'EVERY 15 TURNS: Earn +5% of total coins owned',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    wild_blue: {
        id: 'wild_blue',
        name: 'WILD BLUE (EPIC) 🫐',
        icon: '🫐',
        description: '10% chance to spawn a WILDPIECE (1x1). When placed, transforms into a random shape fitting the spot',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    reactive_orange: {
        id: 'reactive_orange',
        name: 'REACTIVE ORANGE (EPIC) 🍊',
        icon: '🍊',
        description: '7% chance to spawn a Reactive Orange Piece. Explodes on placement clearing adjacent blocks on 4 sides and corners',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    amplifying_purple: {
        id: 'amplifying_purple',
        name: 'AMPLIFYING PURPLE (EPIC) 🔮',
        icon: '🔮',
        description: '15% chance to spawn an Amplifying Purple Piece. Clearing horizontal rows causes upper blocks to fall down and fill empty spots',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    overgrow_green: {
        id: 'overgrow_green',
        name: 'OVERGROW GREEN (EPIC) 🌿',
        icon: '🌿',
        description: '7% chance to spawn an Overgrow Green Piece. When placed, it grows and covers up to 3 adjacent empty spots',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    sakura_pink: {
        id: 'sakura_pink',
        name: 'SAKURA PINK (EPIC) 🌸',
        icon: '🌸',
        description: '7% chance to spawn a Sakura Pink Piece. When placed and clearing a column, 3 random columns are destroyed sequentially',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    persistent_green: {
        id: 'persistent_green',
        name: 'PERSISTENT GREEN (EPIC) 🍏',
        icon: '🍏',
        description: 'When about to lose (no playable moves), destroys tray pieces, grants 3 new pieces and +2 coins (single-use, non-repurchasable)',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        consumed: false,
        maxUsesPerTurn: 1
    },
    magic_blue: {
        id: 'magic_blue',
        name: 'MAGIC BLUE (EPIC)  🟦',
        icon: '🟦',
        description: 'All shop items cost 0.5 coins less (0.5 coin discount on all items)',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    },
    lava_red: {
        id: 'lava_red',
        name: 'LAVA RED (EPIC) 🌋',
        icon: 'assets/shop/red.png',
        description: '7% chance to spawn a Lava Red Piece. Moves down 1 row per turn, melting blocks underneath until reaching the bottom',
        price: 60,
        unlocked: false,
        active: false,
        usedThisTurn: false,
        maxUsesPerTurn: Infinity
    }
};
function isSkillAvailable(skillId) {
    const skill = SKILLS_CONFIG[skillId];
    return skill && skill.unlocked && skill.active && !skill.usedThisTurn;
}

function useSkill(skillId) {
    const skill = SKILLS_CONFIG[skillId];
    if (skill) {
        skill.usedThisTurn = true;
    }
}

function resetTurnSkills() {
    rotationsUsedThisTurn = 0;
    discardsUsedThisTurn = 0;
    for (const key in SKILLS_CONFIG) {
        if (SKILLS_CONFIG[key]) {
            SKILLS_CONFIG[key].usedThisTurn = false;
        }
    }
}

function resetAllSkillsToDefault() {
    rotationsUsedThisTurn = 0;
    discardsUsedThisTurn = 0;
    noClearTurnCount = 0;
    sourLemonColumnTurns = 0;
    chocolateScoreProgress = 0;
    fluffyBreadTurnCount = 0;
    skillDiscardActive = false;
    skillRotateActive = false;
    skillSingleActive = false;
    if (typeof SKILLS_CONFIG !== 'undefined') {
        for (const key in SKILLS_CONFIG) {
            if (SKILLS_CONFIG[key]) {
                SKILLS_CONFIG[key].unlocked = false;
                SKILLS_CONFIG[key].active = false;
                SKILLS_CONFIG[key].usedThisTurn = false;
                SKILLS_CONFIG[key].consumed = false;
                if (typeof SKILLS_CONFIG[key].purchasesCount !== 'undefined') {
                    SKILLS_CONFIG[key].purchasesCount = 0;
                }
                if (typeof SKILLS_CONFIG[key].pendingExplosions !== 'undefined') {
                    SKILLS_CONFIG[key].pendingExplosions = 0;
                }
            }
        }
    }
    if (typeof window.resetShopState === 'function') {
        window.resetShopState();
    }
}

window.activateEpicSkillsOnly = function () {
    const EPIC_SKILL_IDS = new Set([
        'wild_blue',
        'reactive_orange',
        'overgrow_green',
        'sakura_pink',
        'persistent_green',
        'amplifying_purple',
        'magic_blue',
        'lava_red'
    ]);
    if (typeof SKILLS_CONFIG !== 'undefined') {
        for (const key in SKILLS_CONFIG) {
            if (SKILLS_CONFIG[key]) {
                const isEpic = EPIC_SKILL_IDS.has(key);
                SKILLS_CONFIG[key].unlocked = isEpic;
                SKILLS_CONFIG[key].active = isEpic;
                SKILLS_CONFIG[key].usedThisTurn = false;
                SKILLS_CONFIG[key].consumed = false;
            }
        }
    }
};

if (highScoreElement) highScoreElement.textContent = highScore.toLocaleString();
if (scoreElement) scoreElement.textContent = '0';

function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

var GEM_COLORS = {
    cyan: { center: 'rgb(62, 201, 247)', top: 'rgb(122, 217, 247)', left: 'rgb(89, 209, 247)', right: 'rgb(28, 177, 228)', bottom: 'rgb(16, 147, 195)' },
    blue: { center: 'rgb(54, 96, 245)', top: 'rgb(111, 144, 243)', left: 'rgb(83, 120, 243)', right: 'rgb(19, 63, 224)', bottom: 'rgb(10, 45, 192)' },
    purple: { center: 'rgb(159, 84, 219)', top: 'rgb(187, 136, 228)', left: 'rgb(170, 109, 223)', right: 'rgb(128, 50, 198)', bottom: 'rgb(105, 34, 168)' },
    lime: { center: 'rgb(88, 213, 67)', top: 'rgb(137, 223, 122)', left: 'rgb(111, 218, 95)', right: 'rgb(58, 192, 38)', bottom: 'rgb(46, 161, 27)' },
    yellow: { center: 'rgb(247, 185, 44)', top: 'rgb(249, 206, 96)', left: 'rgb(248, 195, 70)', right: 'rgb(231, 161, 8)', bottom: 'rgb(192, 133, 7)' },
    red: { center: 'rgb(240, 55, 55)', top: 'rgb(239, 115, 115)', left: 'rgb(240, 82, 82)', right: 'rgb(223, 17, 17)', bottom: 'rgb(186, 7, 7)' },
    orange: { center: 'rgb(247, 128, 39)', top: 'rgb(249, 160, 91)', left: 'rgb(248, 144, 65)', right: 'rgb(227, 99, 8)', bottom: 'rgb(187, 82, 7)' },
    magenta: { center: 'rgb(240, 65, 149)', top: 'rgb(241, 118, 180)', left: 'rgb(240, 90, 164)', right: 'rgb(223, 23, 119)', bottom: 'rgb(189, 10, 96)' },
    teal: { center: 'rgb(15, 229, 183)', top: 'rgb(101, 221, 194)', left: 'rgb(69, 216, 186)', right: 'rgb(7, 194, 155)', bottom: 'rgb(6, 156, 124)' },
    turquoise: { center: 'rgb(74, 217, 248)', top: 'rgb(132, 229, 251)', left: 'rgb(102, 221, 249)', right: 'rgb(28, 199, 234)', bottom: 'rgb(8, 171, 209)' },
    indigo: { center: 'rgb(104, 85, 236)', top: 'rgb(153, 140, 237)', left: 'rgb(124, 107, 237)', right: 'rgb(69, 51, 211)', bottom: 'rgb(48, 30, 187)' },
    gold: { isGolden: true, center: 'rgb(255, 215, 0)', top: 'rgb(255, 240, 130)', left: 'rgb(255, 227, 70)', right: 'rgb(218, 165, 32)', bottom: 'rgb(184, 134, 11)' },
    reactive_orange: { isReactiveOrange: true, center: 'rgb(255, 115, 0)', top: 'rgb(255, 185, 60)', left: 'rgb(255, 145, 20)', right: 'rgb(220, 85, 0)', bottom: 'rgb(180, 55, 0)' },
    amplifying_purple: { isAmplifyingPurple: true, center: 'rgb(168, 85, 247)', top: 'rgb(216, 180, 254)', left: 'rgb(192, 132, 252)', right: 'rgb(147, 51, 234)', bottom: 'rgb(126, 34, 206)' },
    overgrow_green: { isOvergrowGreen: true, center: 'rgb(34, 197, 94)', top: 'rgb(134, 239, 172)', left: 'rgb(74, 222, 128)', right: 'rgb(22, 163, 74)', bottom: 'rgb(21, 128, 61)' },
    sakura_pink: { isSakuraPink: true, isVoidBlack: true, center: 'rgb(244, 114, 182)', top: 'rgb(251, 207, 232)', left: 'rgb(249, 168, 212)', right: 'rgb(219, 39, 119)', bottom: 'rgb(190, 24, 93)' },
    void_black: { isSakuraPink: true, isVoidBlack: true, center: 'rgb(244, 114, 182)', top: 'rgb(251, 207, 232)', left: 'rgb(249, 168, 212)', right: 'rgb(219, 39, 119)', bottom: 'rgb(190, 24, 93)' },
    lava_red: { isLavaRed: true, center: 'rgb(239, 68, 68)', top: 'rgb(252, 165, 165)', left: 'rgb(248, 113, 113)', right: 'rgb(220, 38, 38)', bottom: 'rgb(185, 28, 28)' },
    wild_blue: { isWild: true, center: 'rgb(59, 130, 246)', top: 'rgb(147, 197, 253)', left: 'rgb(96, 165, 250)', right: 'rgb(37, 99, 235)', bottom: 'rgb(29, 78, 216)' }
};
var COLORS = Object.values(GEM_COLORS).filter(c => !c.isGolden && !c.isWild && !c.isReactiveOrange && !c.isAmplifyingPurple && !c.isOvergrowGreen && !c.isSakuraPink && !c.isVoidBlack && !c.isLavaRed);

function getGemShades(colorObj) {
    if (!colorObj) return GEM_COLORS.cyan;
    if (typeof colorObj === 'object' && colorObj.center) return colorObj;
    if (typeof colorObj === 'string' && GEM_COLORS[colorObj]) return GEM_COLORS[colorObj];
    if (typeof colorObj === 'string' && (colorObj.startsWith('#') || colorObj.startsWith('rgb'))) {
        let [h, s, l] = hexToHsl(colorObj);
        s = Math.min(100, Math.round(s * 1.25));
        return {
            center: `hsl(${h}, ${s}%, ${l}%)`,
            top: `hsl(${h}, ${Math.min(100, s + 10)}%, ${Math.min(90, l + 18)}%)`,
            left: `hsl(${h}, ${Math.min(100, s + 5)}%, ${Math.min(82, l + 9)}%)`,
            right: `hsl(${h}, ${s}%, ${Math.max(10, l - 12)}%)`,
            bottom: `hsl(${h}, ${s}%, ${Math.max(5, l - 22)}%)`
        };
    }
    return GEM_COLORS.cyan;
}

function createGemBlockHTML(colorObj) {
    const shades = getGemShades(colorObj);
    const isGold = (colorObj && colorObj.isGolden) ? ' golden-gem' : '';
    const style = `--c-center: ${shades.center}; --c-top: ${shades.top}; --c-left: ${shades.left}; --c-right: ${shades.right}; --c-bottom: ${shades.bottom};`;
    return `<div class="block-cell${isGold}" style="${style}"><div class="facet top"></div><div class="facet left"></div><div class="facet right"></div><div class="facet bottom"></div><div class="center-face"></div></div>`;
}

function createGemBlock(colorObj) {
    const cell = document.createElement('div');
    cell.className = 'block-cell';
    const shades = getGemShades(colorObj);
    cell.style.setProperty('--c-top', shades.top);
    cell.style.setProperty('--c-left', shades.left);
    cell.style.setProperty('--c-right', shades.right);
    cell.style.setProperty('--c-bottom', shades.bottom);
    cell.style.setProperty('--c-center', shades.center);
    cell.innerHTML = `<div class="facet top"></div><div class="facet left"></div><div class="facet right"></div><div class="facet bottom"></div><div class="center-face"></div>`;
    return cell;
}

