// Retro Audio Synthesizer for UI SFX
class RetroAudioSFX {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }

    playClick() {
        this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playSelect() {
        this.init();
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(640, this.ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playCassetteStart() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const audio = new RetroAudioSFX();

    // Data for cassettes (using cassette-1.png, cassette-2.png, cassette-3.png)
    const cassettes = [
        { 
            title: "Classic Tape", 
            valText: "LVL 1k", 
            icon: "assets/star-icon.png", 
            img: "assets/cassette-1.png" 
        },
        { 
            title: "Wild Tape", 
            valText: "8450", 
            icon: "assets/podium-icon.png", 
            img: "assets/cassette-2.png" 
        },
        { 
            title: "Tempo Tape", 
            valText: "12400", 
            icon: "assets/podium-icon.png", 
            img: "assets/cassette-3.png" 
        }
    ];

    let currentCassetteIndex = 0;
    let isPlaying = false;

    // Elements
    const prevBtn = document.getElementById('prev-cassette');
    const nextBtn = document.getElementById('next-cassette');
    const mainCassetteImg = document.getElementById('current-cassette-img');
    const peekLeftImg = document.getElementById('peek-left-img');
    const peekRightImg = document.getElementById('peek-right-img');
    const tapeTitle = document.getElementById('tape-title');
    const tapeLevel = document.getElementById('tape-level');
    const headerIcon = document.getElementById('header-icon');
    const playBtn = document.getElementById('play-btn');
    const gamemodeBtn = document.getElementById('gamemode-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const settingBtn = document.getElementById('setting-btn');

    let isAnimatingCassette = false;

    // Update Cassette Stack Display with smooth directional sliding
    function updateCassette(direction) {
        if (isAnimatingCassette) return;
        isAnimatingCassette = true;
        audio.playClick();
        
        // direction = 1 (Next): slide out left (-240px), slide in from right (+240px)
        // direction = -1 (Prev): slide out right (+240px), slide in from left (-240px)
        const outClass = direction === 1 ? 'slide-out-left' : 'slide-out-right';
        const inStartClass = direction === 1 ? 'slide-in-from-right' : 'slide-in-from-left';

        // Phase 1: Slide current tape out
        mainCassetteImg.className = `cassette-img ${outClass}`;

        setTimeout(() => {
            currentCassetteIndex = (currentCassetteIndex + direction + cassettes.length) % cassettes.length;
            
            const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
            const nextIndex = (currentCassetteIndex + 1) % cassettes.length;

            // Update main & peek images
            mainCassetteImg.src = cassettes[currentCassetteIndex].img;
            if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
            if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;

            tapeTitle.textContent = cassettes[currentCassetteIndex].title;
            tapeLevel.textContent = cassettes[currentCassetteIndex].valText;
            if (headerIcon) headerIcon.src = cassettes[currentCassetteIndex].icon;
            
            // Phase 2: Position new tape at entry side instantly
            mainCassetteImg.className = `cassette-img ${inStartClass}`;
            
            // Trigger reflow so browser applies initial entering position
            void mainCassetteImg.offsetWidth;
            
            // Phase 3: Slide new tape in to center
            requestAnimationFrame(() => {
                mainCassetteImg.className = 'cassette-img';
                setTimeout(() => {
                    isAnimatingCassette = false;
                }, 280);
            });
        }, 220);
    }

    // Initial setup of peek images
    function initCassetteStack() {
        const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
        const nextIndex = (currentCassetteIndex + 1) % cassettes.length;
        if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
        if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;
    }

    initCassetteStack();

    prevBtn?.addEventListener('click', () => updateCassette(-1));
    nextBtn?.addEventListener('click', () => updateCassette(1));

    // Play Button Logic (Without glow effect or screen animation)
    playBtn?.addEventListener('click', () => {
        isPlaying = !isPlaying;
        audio.playCassetteStart();
    });

    // WIP Modal elements
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

    // Select specific cassette by index
    function selectCassetteIndex(targetIndex) {
        if (targetIndex === currentCassetteIndex || isAnimatingCassette) {
            currentCassetteIndex = targetIndex;
            return;
        }
        isAnimatingCassette = true;
        
        const direction = targetIndex > currentCassetteIndex ? 1 : -1;
        currentCassetteIndex = targetIndex;

        const prevIndex = (currentCassetteIndex - 1 + cassettes.length) % cassettes.length;
        const nextIndex = (currentCassetteIndex + 1) % cassettes.length;

        const outClass = direction === 1 ? 'slide-out-left' : 'slide-out-right';
        const inStartClass = direction === 1 ? 'slide-in-from-right' : 'slide-in-from-left';

        mainCassetteImg.className = `cassette-img ${outClass}`;

        setTimeout(() => {
            mainCassetteImg.src = cassettes[currentCassetteIndex].img;
            if (peekLeftImg) peekLeftImg.src = cassettes[prevIndex].img;
            if (peekRightImg) peekRightImg.src = cassettes[nextIndex].img;

            tapeTitle.textContent = cassettes[currentCassetteIndex].title;
            tapeLevel.textContent = cassettes[currentCassetteIndex].valText;
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

    // Modes Modal elements
    const modesModal = document.getElementById('modes-modal');
    const modeCards = document.querySelectorAll('.mode-card');

    function showModesPopup() {
        audio.playSelect();
        if (modesModal) modesModal.classList.add('show');
    }

    function hideModesPopup() {
        if (modesModal) modesModal.classList.remove('show');
    }

    // Clicking on any mode card selects that cassette and closes popup
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

    // Clicking outside the 3 cards (on background overlay) closes popup
    modesModal?.addEventListener('click', (e) => {
        if (e.target === modesModal) hideModesPopup();
    });

    // Gamemode Button
    gamemodeBtn?.addEventListener('click', () => {
        showModesPopup();
    });

    // Scroll animation & dots indicator handler for Daily Quests
    const questsScrollArea = document.getElementById('quests-scroll-area');
    const scrollDots = document.getElementById('scroll-dots');
    const questCards = document.querySelectorAll('.quest-card-frame');

    function updateQuestAnimations() {
        if (!questsScrollArea) return;

        const containerRect = questsScrollArea.getBoundingClientRect();
        let hasMoreHiddenCards = false;

        questCards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            
            // Calculate visible vertical height of card inside container
            const visibleTop = Math.max(cardRect.top, containerRect.top);
            const visibleBottom = Math.min(cardRect.bottom, containerRect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);

            // Card is visible when at least 90% of its total height fits inside container
            if (cardRect.height > 0 && (visibleHeight / cardRect.height) >= 0.90) {
                card.classList.add('visible');
            } else {
                card.classList.remove('visible');
            }
            
            // If card extends past bottom edge of scroll container (less than 90% visible at bottom), mark that more cards are hidden below
            if (cardRect.bottom > containerRect.bottom - (cardRect.height * 0.90)) {
                hasMoreHiddenCards = true;
            }
        });

        // Check if the last quest of the list is rendered / visible
        const lastCard = questCards.length > 0 ? questCards[questCards.length - 1] : null;
        const isLastCardVisible = lastCard && lastCard.classList.contains('visible');

        // Hide 3 dots indicator if the last quest of the list is represented or if no more hidden cards remain below
        if (scrollDots) {
            if (isLastCardVisible || !hasMoreHiddenCards) {
                scrollDots.classList.add('hidden');
            } else {
                scrollDots.classList.remove('hidden');
            }
        }
    }

    // Sort completed quest cards to the top of the list
    function sortQuestCards() {
        if (!questsScrollArea) return;
        const cards = Array.from(questsScrollArea.querySelectorAll('.quest-card-frame:not(.disappearing)'));
        cards.sort((a, b) => {
            const aComp = a.classList.contains('completed') ? 1 : 0;
            const bComp = b.classList.contains('completed') ? 1 : 0;
            return bComp - aComp; // Completed cards sorted to top
        });
        cards.forEach(card => questsScrollArea.appendChild(card));
    }

    sortQuestCards();

    if (questsScrollArea) {
        questsScrollArea.addEventListener('scroll', updateQuestAnimations);
        updateQuestAnimations();
    }

    // Coin / Ticket Collection Fly-to-Target Animation Handler (Single Ticket Flight)
    function spawnFlyingTicketEffect(startRect, rewardAmount) {
        const ticketItem = document.querySelector('.ticket-item');
        const ticketIcon = document.querySelector('.ticket-icon');
        const ticketCountSpan = document.getElementById('ticket-count');
        if (!ticketIcon || !ticketCountSpan) return;

        const targetRect = ticketIcon.getBoundingClientRect();

        // Origin coords (center of claimed quest reward box)
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;

        // Target coords (center of HUD ticket icon in header)
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;

        // Create single flying ticket particle
        const particle = document.createElement('img');
        particle.src = 'assets/ticket.png';
        particle.className = 'flying-ticket-particle';
        document.body.appendChild(particle);

        particle.style.left = `${startX}px`;
        particle.style.top = `${startY}px`;
        particle.style.transform = 'scale(0) rotate(0deg)';
        particle.style.opacity = '0';

        const duration = 580; // Flight duration in ms

        // Phase 1: Spawner Burst (Pop out)
        particle.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.14s ease';
        particle.style.transform = 'scale(1.25) rotate(-10deg)';
        particle.style.opacity = '1';

        setTimeout(() => {
            // Phase 2: Tweening / Pathing (Quadratic Bezier Curve Flight)
            const startTime = performance.now();
            const controlX = (startX + targetX) / 2 + 50; // Dynamic curve arc
            const controlY = Math.min(startX, targetY) - 75;

            function animateFlight(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Bezier calculation: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                const t = progress;
                const invT = 1 - t;
                const currX = invT * invT * startX + 2 * invT * t * controlX + t * t * targetX;
                const currY = invT * invT * startY + 2 * invT * t * controlY + t * t * targetY;

                const scale = 1.25 - progress * 0.45; // Gradually shrink towards target
                const rotation = (progress * 360) % 360;

                particle.style.left = `${currX}px`;
                particle.style.top = `${currY}px`;
                particle.style.transform = `scale(${scale}) rotate(${rotation}deg)`;

                if (progress < 1) {
                    requestAnimationFrame(animateFlight);
                } else {
                    // Phase 3: Impact Effect / Punch Animation on Target HUD
                    particle.remove();

                    const currentTickets = parseInt(ticketCountSpan.textContent.replace('x', '') || '99', 10);
                    ticketCountSpan.textContent = `x${currentTickets + rewardAmount}`;

                    // Trigger Impact Juice Punch on target HUD item
                    if (ticketItem) {
                        ticketItem.classList.remove('hud-punch');
                        void ticketItem.offsetWidth; // Trigger reflow
                        ticketItem.classList.add('hud-punch');
                    }
                    audio.playClick();
                }
            }

            requestAnimationFrame(animateFlight);
        }, 160);
    }

    // Quest Reward Claim Handler
    questCards.forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('completed') && !card.classList.contains('claimed')) {
                audio.playSelect();
                
                // Read reward amount
                const rewardAmount = parseInt(card.getAttribute('data-reward-amount') || '5', 10);
                
                // Trigger Flying Ticket Collection Effect from card reward element
                const rewardElement = card.querySelector('.quest-reward') || card;
                spawnFlyingTicketEffect(rewardElement.getBoundingClientRect(), rewardAmount);

                // Mark card as claimed and trigger smooth disappearance animation
                card.classList.remove('completed');
                card.classList.add('claimed', 'disappearing');

                // After collapse animation, remove element from DOM and update scroll area
                setTimeout(() => {
                    card.remove();
                    updateQuestAnimations();
                }, 480);
            }
        });
    });

    // Tab Switching (In-page view switching between HOME, DAILY QUESTS, and SHOP views)
    tabBtns.forEach(tab => {
        tab.addEventListener('click', () => {
            const nav = tab.getAttribute('data-nav');
            audio.playSelect();
            
            if (nav === 'home') {
                tabBtns.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('home-view')?.classList.remove('hidden');
                document.getElementById('daily-view')?.classList.add('hidden');
                document.getElementById('shop-view')?.classList.add('hidden');
            } else if (nav === 'daily') {
                tabBtns.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('home-view')?.classList.add('hidden');
                document.getElementById('daily-view')?.classList.remove('hidden');
                document.getElementById('shop-view')?.classList.add('hidden');
                setTimeout(updateQuestAnimations, 50);
            } else if (nav === 'shop') {
                tabBtns.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('home-view')?.classList.add('hidden');
                document.getElementById('daily-view')?.classList.add('hidden');
                document.getElementById('shop-view')?.classList.remove('hidden');
            } else {
                showWipPopup();
            }
        });
    });

    // Buy No Ads Button
    const buyNoAdsBtn = document.getElementById('buy-no-ads-btn');
    buyNoAdsBtn?.addEventListener('click', () => {
        audio.playCassetteStart();
        showWipPopup();
    });

    // Settings Button
    settingBtn?.addEventListener('click', () => {
        showWipPopup();
    });
});
