/**
 * RETRO COZY AUDIO ENGINE
 * Suoni stile retro carini, caldi e giocosi (cozy retro arcade, music box, marimba, bubble pop, FM chime).
 * Sintesi procedurale in tempo reale tramite Web Audio API (FM synthesis, sine wave pops, resonant filters).
 * Latenza zero, nessun file audio esterno richiesto.
 */

class RetroAudioEngine {
    constructor() {
        this.ctx = null;
        try {
            this.muted = localStorage.getItem('sfxMuted') === 'true';
        } catch (e) {
            this.muted = false;
        }
        this.initAutoUnlock();
    }

    init() {
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    window._sfxAudioCtx = this.ctx;
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => { });
            }
        } catch (e) { }
        return this.ctx;
    }

    initAutoUnlock() {
        const unlock = () => {
            this.init();
            if (this.ctx) {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => this._playSilentWarmup()).catch(() => { });
                } else {
                    this._playSilentWarmup();
                }
            }
            const events = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
            events.forEach(evt => window.removeEventListener(evt, unlock, true));
        };
        const events = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
        events.forEach(evt => window.addEventListener(evt, unlock, { once: true, passive: true, capture: true }));
    }

    _playSilentWarmup() {
        if (!this.ctx) return;
        try {
            const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate || 22050);
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);
        } catch (e) { }
    }

    _withContext(fn) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                if (this.ctx && !this.isMuted()) {
                    try { fn(this.ctx.currentTime); } catch (e) { }
                }
            }).catch(() => {
                if (this.ctx && !this.isMuted()) {
                    try { fn(this.ctx.currentTime); } catch (e) { }
                }
            });
        } else {
            try { fn(this.ctx.currentTime); } catch (e) { }
        }
    }

    isMuted() {
        try {
            if (localStorage.getItem('sfxMuted') === 'true') return true;
        } catch (e) { }
        return !!this.muted;
    }

    setMuted(muted) {
        this.muted = !!muted;
        try {
            localStorage.setItem('sfxMuted', this.muted ? 'true' : 'false');
        } catch (e) { }
    }

    _getDest() {
        return this.ctx ? this.ctx.destination : null;
    }

    // =========================================================================
    // SINTETIZZATORI BASE (FM Bell, Bubble Pop, Woodblock)
    // =========================================================================

    // Genera una campanella / carillon stile Music Box con sintesi FM dolce
    _playFMBell(freq, startTime, duration = 0.35, maxGain = 0.18, modRatio = 2.0) {
        if (this.isMuted() || !this.ctx) return;
        try {
            const carrier = this.ctx.createOscillator();
            const carrierGain = this.ctx.createGain();

            const modulator = this.ctx.createOscillator();
            const modGain = this.ctx.createGain();

            carrier.type = 'sine';
            carrier.frequency.setValueAtTime(freq, startTime);

            modulator.type = 'sine';
            modulator.frequency.setValueAtTime(freq * modRatio, startTime);

            // Indice di modulazione che decade rapidamente (effetto tocco metallico dolce)
            modGain.gain.setValueAtTime(freq * 0.8, startTime);
            modGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

            carrierGain.gain.setValueAtTime(maxGain, startTime);
            carrierGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            modulator.connect(carrier.frequency);
            carrier.connect(carrierGain);
            carrierGain.connect(this._getDest());

            modulator.start(startTime);
            carrier.start(startTime);
            modulator.stop(startTime + duration);
            carrier.stop(startTime + duration);
        } catch (e) { }
    }

    // Genera un simpatico Bubble Pop / Goccia d'acqua (pitch glide su onda sinusoidale)
    _playBubblePop(startFreq, endFreq, startTime, duration = 0.05, maxGain = 0.15) {
        if (this.isMuted() || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, startTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

            gain.gain.setValueAtTime(maxGain, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(this._getDest());

            osc.start(startTime);
            osc.stop(startTime + duration);
        } catch (e) { }
    }

    // Genera un colpo tattile stile blocco di legno / marimba calda
    _playWoodTap(freq, startTime, duration = 0.08, maxGain = 0.22) {
        if (this.isMuted() || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.6, startTime + duration);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq * 1.2, startTime);
            filter.Q.setValueAtTime(2.5, startTime);

            gain.gain.setValueAtTime(maxGain, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this._getDest());

            osc.start(startTime);
            osc.stop(startTime + duration);
        } catch (e) { }
    }

    // =========================================================================
    // 1. GAMEPLAY PIECE SFX (Juicy & Tactile)
    // =========================================================================

    // Toccare e sollevare un pezzo dal tray: Bolla pop dolce ("bloop!")
    playPiecePickup() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            this._playBubblePop(480, 840, now, 0.045, 0.14);
        } catch (e) { }
    }

    // Posizionare un blocco sulla griglia: Blocco di legno tattile caldo ("thock!")
    playPiecePlace() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Doppio tono marimba caldo + tap acustico
            this._playWoodTap(260, now, 0.07, 0.24);
            this._playBubblePop(700, 320, now, 0.03, 0.08);
        } catch (e) { }
    }

    // Rilascio pezzo non valido / ritorno al tray: Molla giocosa ("boing-pop")
    playPieceCancel() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.linearRampToValueAtTime(240, now + 0.04);
            osc.frequency.linearRampToValueAtTime(320, now + 0.07);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(this._getDest());

            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) { }
    }

    // Rotazione pezzo Banana con doppio tap: Mulinello magico giocoso (twirl chime)
    playPieceRotate() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            this._playFMBell(659.25, now, 0.12, 0.15, 1.5);         // E5
            this._playFMBell(987.77, now + 0.04, 0.14, 0.16, 1.5);  // B5
        } catch (e) { }
    }

    // Scarto pezzo Swift Pizza o cestino: Soffio fatato caldo
    playPieceDiscard() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this._getDest());

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) { }
    }

    // =========================================================================
    // 2. LINE CLEAR & COMBOS (Groovy Bass Instrument Notes)
    // =========================================================================

    // Genera una nota viva, calda e definita di strumento basso (Electric / Acoustic Bass Pluck)
    _playBassNote(freq, startTime, duration = 0.28, gainLevel = 0.52) {
        if (this.isMuted() || !this.ctx) return;
        try {
            const now = startTime;

            // 1. Tono principale della corda (Triangle con micro-pitch bend naturale della corda pizzicata)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * 1.025, now);
            osc.frequency.exponentialRampToValueAtTime(freq, now + 0.025);

            // Filtro dinamico passa-basso: attacco brillante della corda che decade verso il calore del legno/corpo
            filter.type = 'lowpass';
            const filterStart = Math.min(2200, Math.max(700, freq * 6.5));
            const filterEnd = Math.max(220, freq * 1.6);
            filter.frequency.setValueAtTime(filterStart, now);
            filter.frequency.exponentialRampToValueAtTime(filterEnd, now + 0.09);
            filter.Q.setValueAtTime(2.2, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(gainLevel * 0.85, now + 0.003);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this._getDest());

            osc.start(now);
            osc.stop(now + duration);

            // 2. Armonica superiore d'ottava (dona definizione, brillantezza e presenza su altoparlanti telefono)
            const harmOsc = this.ctx.createOscillator();
            const harmGain = this.ctx.createGain();
            const harmFilter = this.ctx.createBiquadFilter();

            harmOsc.type = 'sine';
            harmOsc.frequency.setValueAtTime(freq * 2.0, now);

            harmFilter.type = 'lowpass';
            harmFilter.frequency.setValueAtTime(Math.min(2400, freq * 5.0), now);

            harmGain.gain.setValueAtTime(0.001, now);
            harmGain.gain.linearRampToValueAtTime(gainLevel * 0.40, now + 0.003);
            harmGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.75);

            harmOsc.connect(harmFilter);
            harmFilter.connect(harmGain);
            harmGain.connect(this._getDest());

            harmOsc.start(now);
            harmOsc.stop(now + duration * 0.75);

            // 3. Sub-bass rotondo e profondo per pienezza
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();

            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(freq, now);

            subGain.gain.setValueAtTime(0.001, now);
            subGain.gain.linearRampToValueAtTime(gainLevel * 0.50, now + 0.004);
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            subOsc.connect(subGain);
            subGain.connect(this._getDest());

            subOsc.start(now);
            subOsc.stop(now + duration);

            // 4. Schiocco d'attacco del pizzicato (finger pluck transient)
            const pluckOsc = this.ctx.createOscillator();
            const pluckGain = this.ctx.createGain();
            const pluckFilter = this.ctx.createBiquadFilter();

            pluckOsc.type = 'sawtooth';
            pluckOsc.frequency.setValueAtTime(Math.min(2600, freq * 8), now);
            pluckOsc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

            pluckFilter.type = 'bandpass';
            pluckFilter.frequency.setValueAtTime(1200, now);
            pluckFilter.Q.setValueAtTime(2.0, now);

            pluckGain.gain.setValueAtTime(0.001, now);
            pluckGain.gain.linearRampToValueAtTime(gainLevel * 0.45, now + 0.001);
            pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.020);

            pluckOsc.connect(pluckFilter);
            pluckFilter.connect(pluckGain);
            pluckGain.connect(this._getDest());

            pluckOsc.start(now);
            pluckOsc.stop(now + 0.020);
        } catch (e) { }
    }

    // Eliminazione colonne / righe: Note vive di strumento basso a tono crescente ("dum-DOOM! 🎸")
    playLineClear(linesCount = 1) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const isMulti = linesCount >= 2;

            if (!isMulti) {
                // =============================================================
                // SINGOLA RIGA: Due note di basso pizzicate a tono crescente (La2 -> Mi3)
                // Caldo, profondo, musicale e con un attacco definito e vivace
                // =============================================================
                // 1. Prima nota di basso: La2 (110.00 Hz)
                this._playBassNote(110.00, now, 0.26, 0.52);

                // 2. Seconda nota di basso più alta: Mi3 (164.81 Hz a +65ms)
                this._playBassNote(164.81, now + 0.065, 0.30, 0.56);

            } else {
                // =============================================================
                // PIÙ RIGHE INSIEME: Riff di basso ascendente (La2 -> Re3 -> Mi3 -> Sol3 -> La3)
                // =============================================================
                const bassNotes = [110.00, 146.83, 164.81, 196.00, 220.00];
                const count = Math.min(linesCount + 1, bassNotes.length);
                const stepDelay = 0.055; // 55ms tra una nota di basso e l'altra

                for (let i = 0; i < count; i++) {
                    const noteTime = now + i * stepDelay;
                    const freq = bassNotes[i];
                    const gain = Math.min(0.60, 0.48 + i * 0.03);
                    const dur = Math.max(0.22, 0.30 - i * 0.012);

                    this._playBassNote(freq, noteTime, dur, gain);
                }
            }
        } catch (e) { }
    }

    // Lava Red 🌋: Molten Sizzle, Deep Volcanic Sub-Rumble & Viscous Fluid Bubbling
    playLavaMelt(meltedCount = 0) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const duration = 0.85;

            // 1. SIZZLE NOISE (Steam & Molten Sizzle)
            try {
                const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const decay = Math.exp(-i / (this.ctx.sampleRate * 0.18));
                    data[i] = (Math.random() * 2 - 1) * decay;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.setValueAtTime(1400, now);
                noiseFilter.frequency.exponentialRampToValueAtTime(450, now + 0.45);
                noiseFilter.Q.setValueAtTime(3.5, now);

                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(0.001, now);
                noiseGain.gain.linearRampToValueAtTime(0.38, now + 0.012);
                noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this._getDest());

                noise.start(now);
                noise.stop(now + 0.45);
            } catch (e) { }

            // 2. VOLCANIC DEEP SUB-RUMBLE (Magma shifting & settling)
            const rumbleOsc = this.ctx.createOscillator();
            const rumbleGain = this.ctx.createGain();
            const rumbleFilter = this.ctx.createBiquadFilter();

            rumbleOsc.type = 'triangle';
            rumbleOsc.frequency.setValueAtTime(95, now);
            rumbleOsc.frequency.exponentialRampToValueAtTime(38, now + duration);

            rumbleFilter.type = 'lowpass';
            rumbleFilter.frequency.setValueAtTime(320, now);
            rumbleFilter.frequency.exponentialRampToValueAtTime(65, now + duration);
            rumbleFilter.Q.setValueAtTime(1.8, now);

            rumbleGain.gain.setValueAtTime(0.001, now);
            rumbleGain.gain.linearRampToValueAtTime(0.55, now + 0.03);
            rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            rumbleOsc.connect(rumbleFilter);
            rumbleFilter.connect(rumbleGain);
            rumbleGain.connect(this._getDest());

            rumbleOsc.start(now);
            rumbleOsc.stop(now + duration);

            // 3. MAGMA BUBBLE PLOP (Liquido denso che ribolle)
            const bubbleOsc = this.ctx.createOscillator();
            const bubbleGain = this.ctx.createGain();

            bubbleOsc.type = 'sine';
            bubbleOsc.frequency.setValueAtTime(160, now + 0.06);
            bubbleOsc.frequency.exponentialRampToValueAtTime(260, now + 0.14);
            bubbleOsc.frequency.exponentialRampToValueAtTime(110, now + 0.28);

            bubbleGain.gain.setValueAtTime(0.001, now + 0.06);
            bubbleGain.gain.linearRampToValueAtTime(0.25, now + 0.12);
            bubbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

            bubbleOsc.connect(bubbleGain);
            bubbleGain.connect(this._getDest());

            bubbleOsc.start(now + 0.06);
            bubbleOsc.stop(now + 0.28);
        } catch (e) { }
    }

    // Sakura Pink 🌸: Sequential Bass Pluck per ogni colonna distrutta in sequenza
    playSakuraColumn(step = 0) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Scala di note di basso crescenti (La2, Do3, Re3, Mi3, Sol3, La3...)
            const bassSteps = [110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66];
            const freq = bassSteps[Math.min(step, bassSteps.length - 1)];
            this._playBassNote(freq, now, 0.28, 0.55);
        } catch (e) { }
    }

    // Combo consecutiva: Suono caldo che si eleva indefinitamente con ogni combo (Warm Vibraphone / Resonant Marimba Rise)
    // Con l'avanzare delle combo il tono sale sempre di grado senza mai bloccarsi al livello della combo perfect!
    playCombo(comboLevel = 2) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // Scala pentatonica continua (Sol - La - Si - Re - Mi) che sale indefinitamente
            // Base G3 (196.00 Hz) a salire di ottava in ottava per qualsiasi livello di combo (anche 10, 15, 20+)
            const pentatonicSteps = [0, 2, 4, 7, 9];
            const step = Math.max(0, comboLevel - 2);
            const octave = Math.floor(step / 5);
            const noteIndex = step % 5;
            const semitones = (octave * 12) + pentatonicSteps[noteIndex];

            // Frequenza calcolata continuamente: ogni combo ha un'altezza diversa e crescente
            const freq = 196.00 * Math.pow(2, semitones / 12);
            const duration = Math.max(0.18, 0.26 - Math.min(step * 0.004, 0.08));
            const gainLevel = Math.min(0.55, 0.38 + Math.min(step * 0.015, 0.17));

            // 1. Tono principale caldo e rotondo (Vibrafono / Marimba calda)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.97, now + duration);

            // Filtro passa-basso morbido calibrato proporzionalmente alla frequenza
            filter.type = 'lowpass';
            const filterCutoff = Math.min(4200, Math.max(450, freq * 2.2));
            filter.frequency.setValueAtTime(filterCutoff, now);
            filter.frequency.exponentialRampToValueAtTime(Math.min(2400, Math.max(250, freq * 1.1)), now + duration);
            filter.Q.setValueAtTime(1.4, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(gainLevel, now + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this._getDest());

            osc.start(now);
            osc.stop(now + duration);

            // 2. Armonica di supporto all'ottava inferiore (mantiene calore e corpo grave ad ogni altezza)
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            const subFilter = this.ctx.createBiquadFilter();

            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(freq * 0.5, now);
            subOsc.frequency.exponentialRampToValueAtTime(freq * 0.5 * 0.97, now + duration * 0.85);

            subFilter.type = 'lowpass';
            subFilter.frequency.setValueAtTime(Math.min(1800, freq * 1.2), now);

            subGain.gain.setValueAtTime(0.001, now);
            subGain.gain.linearRampToValueAtTime(gainLevel * 0.50, now + 0.008);
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);

            subOsc.connect(subFilter);
            subFilter.connect(subGain);
            subGain.connect(this._getDest());

            subOsc.start(now);
            subOsc.stop(now + duration * 0.85);

            // 3. Tocco d'attacco legnoso morbido
            const tapOsc = this.ctx.createOscillator();
            const tapGain = this.ctx.createGain();

            tapOsc.type = 'triangle';
            tapOsc.frequency.setValueAtTime(Math.min(3200, freq * 1.6), now);
            tapOsc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.7), now + 0.025);

            tapGain.gain.setValueAtTime(0.001, now);
            tapGain.gain.linearRampToValueAtTime(gainLevel * 0.30, now + 0.002);
            tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

            tapOsc.connect(tapGain);
            tapGain.connect(this._getDest());

            tapOsc.start(now);
            tapOsc.stop(now + 0.035);
        } catch (e) { }
    }

    // Svuotamento totale del tabellone: Fanfara dolce carillon celestiale
    playBoardClear() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Melodia trionfale gioiosa tipo Animal Crossing / carillon delle fiabe
            const melody = [
                { f: 523.25, t: 0.00 }, // C5
                { f: 659.25, t: 0.07 }, // E5
                { f: 783.99, t: 0.14 }, // G5
                { f: 1046.50, t: 0.21 }, // C6
                { f: 1318.51, t: 0.28 }, // E6
                { f: 1567.98, t: 0.36 }, // G6
                { f: 2093.00, t: 0.45 }  // C7 (lungo con riverbero dolce)
            ];

            melody.forEach(item => {
                const dur = (item.f >= 2000) ? 0.7 : 0.28;
                this._playFMBell(item.f, now + item.t, dur, 0.20, 2.0);
            });
        } catch (e) { }
    }

    // =========================================================================
    // 3. ECONOMIA, SKILL & SPECIALI
    // =========================================================================

    // Guadagno moneta: Tocco cristallino dolce al termine della raccolta (Sweet Coin Collect Ding)
    playCoin() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Tocco acustico metallico dolce (Ching cristallino)
            const chime1 = this.ctx.createOscillator();
            const chimeGain1 = this.ctx.createGain();
            chime1.type = 'sine';
            chime1.frequency.setValueAtTime(1567.98, now); // Sol6
            chimeGain1.gain.setValueAtTime(0.20, now);
            chimeGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            chime1.connect(chimeGain1);
            chimeGain1.connect(this._getDest());
            chime1.start(now);
            chime1.stop(now + 0.22);

            const chime2 = this.ctx.createOscillator();
            const chimeGain2 = this.ctx.createGain();
            chime2.type = 'sine';
            chime2.frequency.setValueAtTime(2093.00, now + 0.025); // Do7
            chimeGain2.gain.setValueAtTime(0.24, now + 0.025);
            chimeGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            chime2.connect(chimeGain2);
            chimeGain2.connect(this._getDest());
            chime2.start(now + 0.025);
            chime2.stop(now + 0.32);

            // 2. Micro-tap morbido di appoggio della moneta nel conteggio
            const tap = this.ctx.createOscillator();
            const tapGain = this.ctx.createGain();
            tap.type = 'sine';
            tap.frequency.setValueAtTime(450, now);
            tap.frequency.exponentialRampToValueAtTime(220, now + 0.04);
            tapGain.gain.setValueAtTime(0.10, now);
            tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            tap.connect(tapGain);
            tapGain.connect(this._getDest());
            tap.start(now);
            tap.stop(now + 0.04);
        } catch (e) { }
    }

    // Popup attivazione abilità speciale: Notifica calda, bassa e discreta (Cozy Low Marimba Ping)
    playSkillPopup() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Note calde di registro basso-medio (C4 -> E4 -> G4, morbide, non squillanti)
            const notes = [
                { f: 261.63, delay: 0.000, dur: 0.20, gain: 0.08 },
                { f: 329.63, delay: 0.045, dur: 0.22, gain: 0.09 },
                { f: 392.00, delay: 0.090, dur: 0.26, gain: 0.08 }
            ];

            notes.forEach(n => {
                const startTime = now + n.delay;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                // Onda triangolare calda per timbro stile marimba / kalimba
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, startTime);
                osc.frequency.exponentialRampToValueAtTime(n.f * 0.98, startTime + n.dur);

                // Filtro passa-basso morbido per togliere qualsiasi asprezza o frequenza acuta
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(520, startTime);
                filter.frequency.exponentialRampToValueAtTime(260, startTime + n.dur);
                filter.Q.setValueAtTime(1.0, startTime);

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.linearRampToValueAtTime(n.gain, startTime + 0.008);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this._getDest());

                osc.start(startTime);
                osc.stop(startTime + n.dur);
            });
        } catch (e) { }
    }

    // Esplosione 4x4 Kaboom Strawberry: Booom morbido stile cartoon con scintille
    playExplosion() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // Basso avvolgente e caldo (senza rumore stridente)
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(120, now);
            sub.frequency.exponentialRampToValueAtTime(35, now + 0.35);
            subGain.gain.setValueAtTime(0.32, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            sub.connect(subGain);
            subGain.connect(this._getDest());
            sub.start(now);
            sub.stop(now + 0.35);

            // Soffio dolce filtrato (soft poof)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.25, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this._getDest());
            noise.start(now);

            // Campanella scintillante post-esplosione
            this._playFMBell(1046.50, now + 0.08, 0.3, 0.14, 2.5);
        } catch (e) { }
    }

    // Apertura Negozio / Shop: Tenda scorrevole accogliente + Accordo caldo da boutique e tintinnio di monete
    playShopOpen() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Soffio morbido di apertura tenda / porta scorrevole (Soft velvet curtain swoosh)
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.035));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(380, now);
            noiseFilter.frequency.exponentialRampToValueAtTime(650, now + 0.12);
            noiseFilter.Q.setValueAtTime(1.5, now);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.001, now);
            noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.015);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this._getDest());
            noise.start(now);

            // 2. Accordo caldo e accogliente (Arpeggio morbido da boutique: Re4 -> Sol4 -> Si4)
            const notes = [
                { f: 293.66, t: 0.020, dur: 0.28, gain: 0.16 }, // D4
                { f: 392.00, t: 0.055, dur: 0.32, gain: 0.18 }, // G4
                { f: 493.88, t: 0.095, dur: 0.40, gain: 0.20 }  // B4
            ];
            notes.forEach(n => {
                const startTime = now + n.t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, startTime);
                osc.frequency.exponentialRampToValueAtTime(n.f * 0.98, startTime + n.dur);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(650, startTime);
                filter.frequency.exponentialRampToValueAtTime(320, startTime + n.dur);
                filter.Q.setValueAtTime(1.2, startTime);

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.linearRampToValueAtTime(n.gain, startTime + 0.006);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this._getDest());

                osc.start(startTime);
                osc.stop(startTime + n.dur);
            });

            // 3. Delicato tintinnio metallico di sacchetto monete (Coin pouch shimmer)
            const coinChime1 = this.ctx.createOscillator();
            const coinGain1 = this.ctx.createGain();
            coinChime1.type = 'sine';
            coinChime1.frequency.setValueAtTime(1250, now + 0.08);
            coinGain1.gain.setValueAtTime(0.001, now + 0.08);
            coinGain1.gain.linearRampToValueAtTime(0.08, now + 0.084);
            coinGain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
            coinChime1.connect(coinGain1);
            coinGain1.connect(this._getDest());
            coinChime1.start(now + 0.08);
            coinChime1.stop(now + 0.22);

            const coinChime2 = this.ctx.createOscillator();
            const coinGain2 = this.ctx.createGain();
            coinChime2.type = 'sine';
            coinChime2.frequency.setValueAtTime(1680, now + 0.11);
            coinGain2.gain.setValueAtTime(0.001, now + 0.11);
            coinGain2.gain.linearRampToValueAtTime(0.09, now + 0.114);
            coinGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
            coinChime2.connect(coinGain2);
            coinGain2.connect(this._getDest());
            coinChime2.start(now + 0.11);
            coinChime2.stop(now + 0.28);

        } catch (e) { }
    }

    // =========================================================================
    // 4. GAME OVER, VITTORIA & CONTEGGIO PUNTEGGIO
    // =========================================================================

    // Game Over: Dolce ninnananna carillon malinconica (mai fastidiosa)
    playGameOver() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // 4 note dolci e rilassanti tipo ninnananna: A4 -> F4 -> D4 -> C4
            const notes = [
                { f: 440.00, t: 0.00, d: 0.25 },
                { f: 349.23, t: 0.16, d: 0.25 },
                { f: 293.66, t: 0.32, d: 0.30 },
                { f: 261.63, t: 0.50, d: 0.60 }
            ];
            notes.forEach(n => {
                this._playFMBell(n.f, now + n.t, n.d, 0.22, 1.5);
            });
        } catch (e) { }
    }

    // Schermata di Vittoria (You Win / Nuovo Record): Fanfara trionfale gioiosa e festosa
    playVictory() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Fanfara trionfale: C5 -> E5 -> G5 -> C6 -> E6 -> G6
            const fanfare = [
                { f: 523.25, t: 0.00, dur: 0.30, gain: 0.24 }, // C5
                { f: 659.25, t: 0.08, dur: 0.32, gain: 0.26 }, // E5
                { f: 783.99, t: 0.16, dur: 0.35, gain: 0.28 }, // G5
                { f: 1046.50, t: 0.26, dur: 0.50, gain: 0.30 }, // C6
                { f: 1318.51, t: 0.36, dur: 0.55, gain: 0.25 }, // E6
                { f: 1567.98, t: 0.44, dur: 0.70, gain: 0.28 }  // G6
            ];
            fanfare.forEach(c => {
                this._playFMBell(c.f, now + c.t, c.dur, c.gain, 2.0);
            });

            // Accordo di basso caldo di sostegno alla fanfara
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(130.81, now); // C3
            subOsc.frequency.exponentialRampToValueAtTime(130.81, now + 0.60);
            subGain.gain.setValueAtTime(0.001, now);
            subGain.gain.linearRampToValueAtTime(0.35, now + 0.02);
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.80);
            subOsc.connect(subGain);
            subGain.connect(this._getDest());
            subOsc.start(now);
            subOsc.stop(now + 0.80);
        } catch (e) { }
    }

    // Showcase Sblocco Skill Shop: Jingle celebrativo ascendente arpeggiato a campane FM
    playShowcaseUnlock() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const arpeggio = [
                { f: 523.25, t: 0.00, dur: 0.28, gain: 0.24 }, // C5
                { f: 659.25, t: 0.07, dur: 0.30, gain: 0.26 }, // E5
                { f: 783.99, t: 0.14, dur: 0.32, gain: 0.28 }, // G5
                { f: 1046.50, t: 0.22, dur: 0.45, gain: 0.32 }, // C6
                { f: 1318.51, t: 0.30, dur: 0.60, gain: 0.30 }  // E6
            ];
            arpeggio.forEach(c => {
                this._playFMBell(c.f, now + c.t, c.dur, c.gain, 2.0);
            });
        } catch (e) { }
    }

    // -------------------------------------------------------------------------
    // SFX OBIETTIVI / TICKET: Swoosh ultra-morbido, caldo e vellutato
    // -------------------------------------------------------------------------

    // Genera uno swoosh vellutato e soffice a frequenze medio-basse (Zero acuti, zero asprezza)
    _playCleanSwoosh(startTime, startFreq = 220, peakFreq = 440, endFreq = 330, duration = 0.17, gain = 0.13) {
        if (this.isMuted() || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            // Onda sinusoidale pura per la massima morbidezza acustica
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, startTime);
            osc.frequency.exponentialRampToValueAtTime(peakFreq, startTime + duration * 0.45);
            osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

            // Filtro passa-basso caldo a pendenza morbida per eliminare ogni spigolosità
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(520, startTime);
            filter.frequency.exponentialRampToValueAtTime(320, startTime + duration);
            filter.Q.setValueAtTime(0.7, startTime);

            // Inviluppo graduale e morbidissimo
            gainNode.gain.setValueAtTime(0.0001, startTime);
            gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.035);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this._getDest());

            osc.start(startTime);
            osc.stop(startTime + duration);
        } catch (e) { }
    }

    // Riscatto Obiettivo: Swoosh soffice, vellutato e giocoso ("fwoop-bloop")
    playQuestReward() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Swoosh morbido ad arco medio-basso (220Hz -> 460Hz -> 340Hz)
            this._playCleanSwoosh(now, 220, 460, 340, 0.17, 0.13);

            // 2. Micro-bloop caldo e ovattato a metà corsa (molto delicato)
            this._playBubblePop(280, 440, now + 0.05, 0.045, 0.07);
        } catch (e) { }
    }

    // Arrivo ticket nel conteggio HUD: Impatto duro, solido e grave ("THOCK / THUD")
    playTicketCollect() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const duration = 0.11;

            // 1. ATTACCO DURO E SECCO: Colpo transiente incisivo (Punch rapido 190Hz -> 70Hz)
            const knockOsc = this.ctx.createOscillator();
            const knockGain = this.ctx.createGain();
            const knockFilter = this.ctx.createBiquadFilter();

            knockOsc.type = 'triangle';
            knockOsc.frequency.setValueAtTime(190, now);
            knockOsc.frequency.exponentialRampToValueAtTime(70, now + 0.035);

            knockFilter.type = 'lowpass';
            knockFilter.frequency.setValueAtTime(480, now);
            knockFilter.frequency.exponentialRampToValueAtTime(150, now + 0.035);
            knockFilter.Q.setValueAtTime(1.8, now);

            knockGain.gain.setValueAtTime(0.001, now);
            knockGain.gain.linearRampToValueAtTime(0.38, now + 0.002); // Attacco istantaneo e duro
            knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

            knockOsc.connect(knockFilter);
            knockFilter.connect(knockGain);
            knockGain.connect(this._getDest());

            knockOsc.start(now);
            knockOsc.stop(now + 0.045);

            // 2. CORPO GRAVE E PROFONDO: Sub-thud solido e pesante (125Hz -> 45Hz)
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            const subFilter = this.ctx.createBiquadFilter();

            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(125, now);
            subOsc.frequency.exponentialRampToValueAtTime(45, now + duration);

            subFilter.type = 'lowpass';
            subFilter.frequency.setValueAtTime(260, now);
            subFilter.frequency.exponentialRampToValueAtTime(90, now + duration);

            subGain.gain.setValueAtTime(0.001, now);
            subGain.gain.linearRampToValueAtTime(0.42, now + 0.004); // Molto pieno e grave
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            subOsc.connect(subFilter);
            subFilter.connect(subGain);
            subGain.connect(this._getDest());

            subOsc.start(now);
            subOsc.stop(now + duration);
        } catch (e) { }
    }

    // Revive / Ritorno in partita (Back in action!): Rinascita trionfale con risalita di energia e accordo solare
    playRevive() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Sweep ascendente di risalita energia (second wind / resurrection)
            const sweepOsc = this.ctx.createOscillator();
            const sweepGain = this.ctx.createGain();
            sweepOsc.type = 'sine';
            sweepOsc.frequency.setValueAtTime(130, now);
            sweepOsc.frequency.exponentialRampToValueAtTime(520, now + 0.32);

            sweepGain.gain.setValueAtTime(0.01, now);
            sweepGain.gain.linearRampToValueAtTime(0.22, now + 0.10);
            sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

            sweepOsc.connect(sweepGain);
            sweepGain.connect(this._getDest());
            sweepOsc.start(now);
            sweepOsc.stop(now + 0.42);

            // 2. Colpo di cassa/percussione calda di ripartenza
            this._playWoodTap(180, now, 0.08, 0.25);

            // 3. Arpeggio trionfale ed energizzante che sale verso l'alto (C4 -> G4 -> C5 -> E5 -> G5)
            const reviveNotes = [
                { f: 261.63, t: 0.05, d: 0.28, g: 0.20 }, // C4
                { f: 392.00, t: 0.12, d: 0.30, g: 0.22 }, // G4
                { f: 523.25, t: 0.19, d: 0.34, g: 0.25 }, // C5
                { f: 659.25, t: 0.26, d: 0.38, g: 0.25 }, // E5
                { f: 783.99, t: 0.33, d: 0.50, g: 0.26 }  // G5
            ];

            reviveNotes.forEach(n => {
                this._playFMBell(n.f, now + n.t, n.d, n.g, 1.5);
            });
        } catch (e) { }
    }

    // Suono per i numeri che salgono (Score roll / Tally tick in Game Over e You Win)
    playScoreTick(progress = 0) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Tonalità che sale piacevolmente con l'avanzamento dei numeri (650Hz -> 1050Hz)
            const clampedP = Math.min(Math.max(progress, 0), 1);
            const freq = 650 + clampedP * 400;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + 0.016);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.020);

            osc.connect(gain);
            gain.connect(this._getDest());

            osc.start(now);
            osc.stop(now + 0.020);
        } catch (e) { }
    }

    // Termine conteggio punteggio: Ding finale soddisfacente al punteggio finale
    playScoreTickEnd() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            this._playFMBell(1046.50, now, 0.40, 0.22, 2.0); // Do6
            this._playBubblePop(400, 240, now, 0.04, 0.12);
        } catch (e) { }
    }

    // =========================================================================
    // 5. INTERFACCIA UI, CASSETTE & HOME (Tattile & Cozy)
    // =========================================================================

    // Click pulsante: Suono più grave, caldo e tattile (deep mellow wood/bubble thock)
    playClick() {
        this._withContext((now) => {
            // Tocco morbido, profondo e grave nel registro basso (150Hz -> 80Hz)
            this._playWoodTap(150, now, 0.055, 0.24);
            this._playBubblePop(180, 95, now, 0.045, 0.20);
        });
    }

    // Selezione scheda / modalità / opzioni menu: Nota calda e rilassante nel registro grave (G3/A3)
    playSelect() {
        this._withContext((now) => {
            this._playWoodTap(150, now, 0.06, 0.22);
            this._playFMBell(196.00, now + 0.005, 0.16, 0.18, 1.0); // G3 caldo e grave
        });
    }

    // Cambio cassetta walkman: Scatto meccanico vintage analogico più corposo e grave
    playCassetteSwitch() {
        this._withContext((now) => {
            // Doppio scatto analogico più grave e profondo
            this._playWoodTap(160, now, 0.03, 0.22);
            this._playWoodTap(210, now + 0.025, 0.035, 0.22);
        });
    }

    // Avvio partita da pulsante PLAY: Jingle giocoso, vivace e allegro (bouncy pop & marimba flourish)
    playGameStart() {
        this._withContext((now) => {
            // 1. Tocco elastico e scoppiettante a bolla giocosa (bouncy bubble pop)
            this._playBubblePop(260, 540, now, 0.045, 0.22);
            this._playWoodTap(240, now, 0.04, 0.20);

            // 2. Slancio morbido di basso elastico (playful bounce swell)
            const bounceOsc = this.ctx.createOscillator();
            const bounceGain = this.ctx.createGain();
            bounceOsc.type = 'triangle';
            bounceOsc.frequency.setValueAtTime(130.81, now); // Do3
            bounceOsc.frequency.exponentialRampToValueAtTime(261.63, now + 0.18); // Do4
            bounceGain.gain.setValueAtTime(0.01, now);
            bounceGain.gain.linearRampToValueAtTime(0.24, now + 0.05);
            bounceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            bounceOsc.connect(bounceGain);
            bounceGain.connect(this._getDest());
            bounceOsc.start(now);
            bounceOsc.stop(now + 0.26);

            // 3. Arpeggio giocoso e brillante di marimba / carillon (Sol4 -> Do5 -> Mi5 -> Sol5 -> Do6)
            const playfulNotes = [
                { f: 392.00, t: 0.03, d: 0.18, g: 0.18 }, // Sol4
                { f: 523.25, t: 0.08, d: 0.20, g: 0.20 }, // Do5
                { f: 659.25, t: 0.13, d: 0.22, g: 0.22 }, // Mi5
                { f: 783.99, t: 0.18, d: 0.25, g: 0.24 }, // Sol5
                { f: 1046.50, t: 0.24, d: 0.40, g: 0.25 }  // Do6 (tintinnio finale spensierato)
            ];

            playfulNotes.forEach(n => {
                this._playFMBell(n.f, now + n.t, n.d, n.g, 1.5);
            });
        });
    }

    // Inserimento cassetta / start partita
    playCassetteStart() {
        this.playGameStart();
    }

    // Onda fluida di inizio gioco: Risonanza calda e grave sincronizzata alla risalita del tabellone
    playStartWave() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Swell / onda ascendente calda e profonda (sub-bass & low breeze sweep)
            const waveOsc = this.ctx.createOscillator();
            const waveGain = this.ctx.createGain();
            const waveFilter = this.ctx.createBiquadFilter();

            waveOsc.type = 'sine';
            waveOsc.frequency.setValueAtTime(65.41, now); // Do2 profondo
            waveOsc.frequency.exponentialRampToValueAtTime(196.00, now + 0.46); // Sol3

            waveFilter.type = 'lowpass';
            waveFilter.frequency.setValueAtTime(130, now);
            waveFilter.frequency.exponentialRampToValueAtTime(380, now + 0.44);
            waveFilter.Q.setValueAtTime(1.8, now);

            waveGain.gain.setValueAtTime(0.001, now);
            waveGain.gain.linearRampToValueAtTime(0.22, now + 0.14);
            waveGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

            waveOsc.connect(waveFilter);
            waveFilter.connect(waveGain);
            waveGain.connect(this._getDest());

            waveOsc.start(now);
            waveOsc.stop(now + 0.65);

            // 2. Glissando ascendente morbido e grave sincronizzato con le 8 righe dal basso verso l'alto (step di ~45ms)
            const waveNotes = [
                { f: 130.81, t: 0.00, d: 0.28, g: 0.16 }, // Do3 (riga 7)
                { f: 146.83, t: 0.045, d: 0.28, g: 0.16 }, // Re3 (riga 6)
                { f: 164.81, t: 0.09, d: 0.30, g: 0.17 }, // Mi3 (riga 5)
                { f: 196.00, t: 0.135, d: 0.30, g: 0.18 }, // Sol3 (riga 4)
                { f: 220.00, t: 0.18, d: 0.32, g: 0.19 }, // La3 (riga 3)
                { f: 261.63, t: 0.225, d: 0.34, g: 0.20 }, // Do4 (riga 2)
                { f: 329.63, t: 0.27, d: 0.36, g: 0.21 }, // Mi4 (riga 1)
                { f: 392.00, t: 0.32, d: 0.42, g: 0.22 }  // Sol4 (riga 0 - sommità dell'onda)
            ];

            waveNotes.forEach(n => {
                this._playFMBell(n.f, now + n.t, n.d, n.g, 1.0);
            });

            // 3. Risoluzione armonica morbida e calda sulla cresta dell'onda (Do4 e Sol4 senza note stridule o acuti metallici)
            this._playFMBell(261.63, now + 0.38, 0.50, 0.18, 1.2);
            this._playFMBell(392.00, now + 0.44, 0.55, 0.16, 1.2);
        } catch (e) { }
    }

    playGameStartWave() {
        this.playStartWave();
    }

    playInitialBoardWave() {
        this.playStartWave();
    }

    // Macchina da scrivere / lettere testo: Tocco soffice di tasto vintage
    playTypewriterTick() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(680 + Math.random() * 60, now);

            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            osc.connect(gain);
            gain.connect(this._getDest());

            osc.start(now);
            osc.stop(now + 0.02);
        } catch (e) { }
    }

    // =========================================================================
    // 6. SHOP (Giocoso & Soddisfacente)
    // =========================================================================

    // Roll delle abilità: Tumble giocoso tipo xilofono / dadi di legno
    playRoll() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const freqs = [440, 523, 659, 784, 880];
            freqs.forEach((f, i) => {
                this._playWoodTap(f, now + i * 0.048, 0.06, 0.15);
            });
        } catch (e) { }
    }

    // Blocco / sblocco lucchetto: Scatto meccanico pulito
    playLock(isLocked = true) {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            if (isLocked) {
                this._playBubblePop(380, 720, now, 0.04, 0.16);
            } else {
                this._playBubblePop(720, 380, now, 0.04, 0.16);
            }
        } catch (e) { }
    }

    // Acquisto shop: Suono grave, profondo e soddisfacente (Heavy gold coin thud & low-frequency cashbox snap)
    playPurchase() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;

            // 1. Colpo di basso profondo e corposo (impatto pesante sacchetto monete / cassa)
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.setValueAtTime(130, now);
            bassOsc.frequency.exponentialRampToValueAtTime(50, now + 0.16);

            bassGain.gain.setValueAtTime(0.001, now);
            bassGain.gain.linearRampToValueAtTime(0.36, now + 0.012);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            bassOsc.connect(bassGain);
            bassGain.connect(this._getDest());
            bassOsc.start(now);
            bassOsc.stop(now + 0.23);

            // 2. Scatto meccanico sordo della cassa nel registro grave (zero frequenze acute)
            this._playWoodTap(150, now + 0.015, 0.06, 0.25);
            this._playWoodTap(120, now + 0.055, 0.08, 0.24);

            // 3. Risoluzione calda a 2 note basse (Do3 a 130.8Hz -> Sol3 a 196Hz) con filtro passa-basso a 450Hz
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now); // Rimuove completamente qualsiasi asperità o frequenza acuta

            const note1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            note1.type = 'triangle';
            note1.frequency.setValueAtTime(130.81, now + 0.04); // Do3
            gain1.gain.setValueAtTime(0.22, now + 0.04);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            note1.connect(gain1);
            gain1.connect(filter);
            note1.start(now + 0.04);
            note1.stop(now + 0.19);

            const note2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            note2.type = 'triangle';
            note2.frequency.setValueAtTime(196.00, now + 0.11); // Sol3
            gain2.gain.setValueAtTime(0.25, now + 0.11);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            note2.connect(gain2);
            gain2.connect(filter);
            note2.start(now + 0.11);
            note2.stop(now + 0.33);

            filter.connect(this._getDest());
        } catch (e) { }
    }

    // Errore / Monete insufficienti: Simpatico "bonk" cartoon amichevole
    playError() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            this._playWoodTap(240, now, 0.08, 0.20);
            this._playWoodTap(190, now + 0.09, 0.09, 0.20);
        } catch (e) { }
    }

    // Allarme tempo rimanente basso (ultimi 10s Time Attack): Ticchettio orologio di legno
    playTimerWarning() {
        if (this.isMuted()) return;
        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            this._playWoodTap(620, now, 0.035, 0.18);
        } catch (e) { }
    }
}

// Global Singleton Instance
window.RetroAudio = new RetroAudioEngine();
window.RetroAudioSFX = RetroAudioEngine; // Compatibility alias
