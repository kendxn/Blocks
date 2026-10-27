// =============================================================================
// AdMob Manager Module
// Gestione banner Google AdMob ufficiale (@capacitor-community/admob & Google Test Ad)
// Include: UMP Consent Flow (GDPR), Banner, Interstitial & Rewarded Video
// =============================================================================

const ADMOB_CONFIG = {
    // App ID ufficiale dell'account AdMob dell'utente
    appId: 'ca-app-pub-7566982605361565~9819370952',

    // App ID di test ufficiale Google (per Android)
    testAppIdAndroid: 'ca-app-pub-3940256099942544~3347511713',

    // Ad Unit ID ufficiale fornito dall'utente (Banner Produzione)
    productionBannerAdUnitId: 'ca-app-pub-7566982605361565/5880125945',

    // Ad Unit ID ufficiale fornito dall'utente (Rewarded Produzione)
    // TODO GO-LIVE: sostituire con ca-app-pub-7566982605361565/5016164080 prima della pubblicazione
    productionRewardedAdUnitId: 'ca-app-pub-7566982605361565/5016164080',

    // Google Official Sample Test Banner Unit ID per Android (Garantisce banner "Test Ad")
    testBannerAdUnitIdAndroid: 'ca-app-pub-3940256099942544/6300978111',

    // Google Official Sample Test Banner Unit ID per iOS
    testBannerAdUnitIdIos: 'ca-app-pub-3940256099942544/2934735716',

    // Google Official Sample Test Rewarded Unit ID per Android (TEST ufficiale Google)
    // TODO GO-LIVE: sostituire con ca-app-pub-7566982605361565/5016164080 prima della pubblicazione
    testRewardedAdUnitIdAndroid: 'ca-app-pub-3940256099942544/5224354917',

    // Google Official Sample Test Interstitial Unit ID per Android
    testInterstitialAdUnitIdAndroid: 'ca-app-pub-3940256099942544/1033173712',

    // Google Official Test Banner Unit (Web / Google Publisher Tag)
    webTestAdUnitPath: '/6499/example/banner',

    // Se true, richiede direttamente l'Ad Unit ufficiale di test Google
    isTesting: true
};
window.ADMOB_CONFIG = ADMOB_CONFIG;

const BannerPosition = {
    TOP_CENTER: 'TOP_CENTER',
    CENTER: 'CENTER',
    BOTTOM_CENTER: 'BOTTOM_CENTER'
};
window.BannerPosition = BannerPosition;
window.BannerAdPosition = BannerPosition;

const BannerAdSize = {
    BANNER: 'BANNER',
    ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
    SMART_BANNER: 'SMART_BANNER',
    FULL_BANNER: 'FULL_BANNER',
    LEADERBOARD: 'LEADERBOARD',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE'
};
window.BannerAdSize = BannerAdSize;

const BannerAdPluginEvents = {
    SizeChanged: 'bannerAdSizeChanged',
    Loaded: 'bannerAdLoaded',
    FailedToLoad: 'bannerAdFailedToLoad',
    Opened: 'bannerAdOpened',
    Closed: 'bannerAdClosed',
    AdImpression: 'bannerAdImpression'
};
window.BannerAdPluginEvents = BannerAdPluginEvents;

const RewardAdPluginEvents = {
    Loaded: 'onRewardedVideoAdLoaded',
    FailedToLoad: 'onRewardedVideoAdFailedToLoad',
    Showed: 'onRewardedVideoAdShowed',
    FailedToShow: 'onRewardedVideoAdFailedToShow',
    Dismissed: 'onRewardedVideoAdDismissed',
    Rewarded: 'onRewardedVideoAdReward'
};
window.RewardAdPluginEvents = RewardAdPluginEvents;

const AdmobConsentStatus = {
    NOT_REQUIRED: 'NOT_REQUIRED',
    OBTAINED: 'OBTAINED',
    REQUIRED: 'REQUIRED',
    UNKNOWN: 'UNKNOWN'
};
window.AdmobConsentStatus = AdmobConsentStatus;

const AdmobConsentDebugGeography = {
    DISABLED: 0,
    EEA: 1,
    NOT_EEA: 2
};
window.AdmobConsentDebugGeography = AdmobConsentDebugGeography;

let isAdMobInitialized = false;
let isBannerListenersRegistered = false;
let isInterstitialListenersRegistered = false;
let isRewardedListenersRegistered = false;
let isBannerActive = false;
let isBannerLoaded = false;
let isBannerLoading = false;
let isNativeBannerCreated = false;
let bannerVisibilityTimeout = null;

// Stato deferred per la gestione della Promise di showRewardedForContinue
let currentRewardedDeferred = null;
let isRewardGranted = false;

/**
 * Rileva in modo affidabile l'ambiente Capacitor.
 */
function detectEnvironment() {
    const hasCapacitor = typeof window !== 'undefined' && Boolean(window.Capacitor);
    let platform = 'web';
    let isNative = false;

    if (hasCapacitor) {
        if (typeof window.Capacitor.getPlatform === 'function') {
            platform = window.Capacitor.getPlatform();
        } else if (window.Capacitor.platform) {
            platform = window.Capacitor.platform;
        }

        if (typeof window.Capacitor.isNativePlatform === 'function') {
            isNative = window.Capacitor.isNativePlatform();
        } else if (typeof window.Capacitor.isNative === 'boolean') {
            isNative = window.Capacitor.isNative;
        } else {
            isNative = (platform === 'android' || platform === 'ios');
        }
    }

    return { hasCapacitor, platform, isNative };
}
window.detectAdMobEnvironment = detectEnvironment;

/**
 * Recupera in modo sicuro l'istanza nativa del plugin AdMob da Capacitor.
 */
function getNativeAdMobPlugin() {
    const env = detectEnvironment();
    if (!env.hasCapacitor || !env.isNative) {
        return null;
    }

    if (window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        return window.Capacitor.Plugins.AdMob;
    }

    if (typeof window.Capacitor.registerPlugin === 'function') {
        try {
            return window.Capacitor.registerPlugin('AdMob');
        } catch (err) {
            console.warn('[AdMob DEBUG] registerPlugin("AdMob") warning:', err);
        }
    }

    return null;
}
window.getNativeAdMobPlugin = getNativeAdMobPlugin;

/**
 * GESTIONE CONSENSO UMP (User Messaging Platform / GDPR)
 */
async function requestAndHandleConsent(AdMob) {
    console.log('[AdMob UMP] Richiesta informazioni consenso UMP (requestConsentInfo)...');
    try {
        const consentOptions = {
            debugGeography: AdmobConsentDebugGeography.EEA,
            tagForUnderAgeOfConsent: false
        };

        const consentInfo = await AdMob.requestConsentInfo(consentOptions);
        console.log('[AdMob UMP] Risultato requestConsentInfo:', JSON.stringify(consentInfo, null, 2));

        if (consentInfo && consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
            console.log('[AdMob UMP] Modulo consenso disponibile e RICHIESTO. Apertura showConsentForm()...');
            const formResult = await AdMob.showConsentForm();
            console.log('[AdMob UMP] Modulo consenso completato con successo:', JSON.stringify(formResult, null, 2));
            return formResult;
        } else {
            console.log(`[AdMob UMP] Modulo non richiesto o già ottenuto. Status: ${consentInfo?.status}, Disponibile: ${consentInfo?.isConsentFormAvailable}`);
            return consentInfo;
        }
    } catch (consentErr) {
        console.warn('[AdMob UMP] ⚠️ Errore o eccezione durante il flow UMP (continuo con inizializzazione):', consentErr);
        return null;
    }
}
window.requestAndHandleConsent = requestAndHandleConsent;

/**
 * Registra TUTTI i listener degli eventi del banner PRIMA della chiamata a showBanner().
 */
function registerBannerListeners(AdMob) {
    if (!AdMob || isBannerListenersRegistered) {
        return;
    }

    console.log('[AdMob STEP 2/4] Registrazione listener eventi AdMob Banner...');

    try {
        AdMob.addListener(BannerAdPluginEvents.Loaded, (info) => {
            console.log('[AdMob EVENT] ✅ BannerAdPluginEvents.Loaded - Banner caricato con successo!', info || '');
            isBannerActive = true;
            isBannerLoaded = true;
            isBannerLoading = false;
            updateSubtitles('Google AdMob Native • Test Ad Attivo');
            // Il banner appare nel gioco SOLO quando viene caricato, senza bloccare la partita
            applyBannerVisibility();
        });

        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
            const code = (err && typeof err.code !== 'undefined') ? err.code : 'N/A';
            const message = (err && err.message) ? err.message : 'Nessun messaggio fornito';

            let explanation = '';
            switch (Number(code)) {
                case 0:
                    explanation = 'ERROR_CODE_INTERNAL_ERROR (Errore interno Google SDK)';
                    break;
                case 1:
                    explanation = 'ERROR_CODE_INVALID_REQUEST (Parametri richiesta non validi o App ID disallineato)';
                    break;
                case 2:
                    explanation = 'ERROR_CODE_NETWORK_ERROR (Errore di connessione a internet)';
                    break;
                case 3:
                    explanation = 'ERROR_CODE_NO_FILL (Nessun annuncio disponibile da Google. Causa tipica: mancato consenso GDPR o account AdMob non ancora approvato)';
                    break;
                default:
                    explanation = `Codice sconosciuto (${code})`;
            }

            console.error(`[AdMob EVENT] ❌ BannerAdPluginEvents.FailedToLoad - CODE: ${code} | MSG: "${message}" | DETTAGLIO: ${explanation} | RAW:`, JSON.stringify(err, null, 2));
            isBannerActive = false;
            isBannerLoaded = false;
            isBannerLoading = false;
            updateSubtitles(`AdMob Code ${code}: ${message}`);
        });

        AdMob.addListener(BannerAdPluginEvents.SizeChanged, (sizeInfo) => {
            console.log('[AdMob EVENT] 📐 BannerAdPluginEvents.SizeChanged - Dimensioni:', JSON.stringify(sizeInfo));
        });

        AdMob.addListener(BannerAdPluginEvents.Opened, () => {
            console.log('[AdMob EVENT] 🔗 BannerAdPluginEvents.Opened - Click utente registrato.');
        });

        AdMob.addListener(BannerAdPluginEvents.Closed, () => {
            console.log('[AdMob EVENT] ✖️ BannerAdPluginEvents.Closed - Banner chiuso.');
        });

        AdMob.addListener(BannerAdPluginEvents.AdImpression, () => {
            console.log('[AdMob EVENT] 👁️ BannerAdPluginEvents.AdImpression - Impressione registrata da Google.');
        });

        isBannerListenersRegistered = true;
        console.log('[AdMob STEP 2/4] ✅ Listener banner registrati con successo PRIMA di showBanner().');
    } catch (listenerErr) {
        console.error('[AdMob STEP 2/4] ❌ Errore durante registrazione listener banner:', listenerErr);
    }
}

/**
 * Registra i listener per gli annunci Interstitial (una sola volta).
 */
function registerInterstitialListeners(AdMob) {
    if (!AdMob || isInterstitialListenersRegistered) return;

    try {
        AdMob.addListener('interstitialAdLoaded', (info) => {
            console.log('[AdMob INTERSTITIAL] ✅ interstitialAdLoaded - Annuncio caricato con successo!', info || '');
        });

        AdMob.addListener('interstitialAdFailedToLoad', (err) => {
            console.error(`[AdMob INTERSTITIAL] ❌ interstitialAdFailedToLoad - CODE: ${err?.code} | MSG: "${err?.message}" | RAW:`, JSON.stringify(err, null, 2));
        });

        AdMob.addListener('interstitialAdShowed', () => {
            console.log('[AdMob INTERSTITIAL] 👁️ interstitialAdShowed - Annuncio a tutto schermo mostrato.');
        });

        AdMob.addListener('interstitialAdDismissed', () => {
            console.log('[AdMob INTERSTITIAL] ✖️ interstitialAdDismissed - Utente ha chiuso l\'interstitial.');
        });

        isInterstitialListenersRegistered = true;
    } catch (e) {
        console.warn('[AdMob INTERSTITIAL] Errore listener interstitial:', e);
    }
}

/**
 * REGISTRAZIONE LISTENER REWARDED AD (UNA SOLA VOLTA ALL'AVVIO DELL'APP)
 * Evita il bug delle registrazioni multiple nei click listener del plugin.
 */
function registerRewardedListeners(AdMob) {
    if (!AdMob || isRewardedListenersRegistered) return;

    try {
        // Evento 1: Loaded
        AdMob.addListener(RewardAdPluginEvents.Loaded, async () => {
            console.log('[Rewarded] Loaded');
            try {
                // Chiama showRewardVideoAd non appena il video è caricato e pronto
                await AdMob.showRewardVideoAd();
            } catch (showErr) {
                const code = (showErr && typeof showErr.code !== 'undefined') ? showErr.code : 'N/A';
                const message = (showErr && showErr.message) ? showErr.message : showErr;
                console.error(`[Rewarded] FailedToShow → code: ${code}, message: ${message}`);
                if (currentRewardedDeferred) {
                    currentRewardedDeferred.reject(showErr);
                    currentRewardedDeferred = null;
                }
            }
        });

        // Evento 2: Showed
        AdMob.addListener(RewardAdPluginEvents.Showed, () => {
            console.log('[Rewarded] Showed');
        });

        // Evento 3: Rewarded
        AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
            const amount = (reward && typeof reward.amount !== 'undefined') ? reward.amount : 1;
            const type = (reward && reward.type) ? reward.type : 'revive';
            console.log(`[Rewarded] Rewarded → amount: ${amount}, type: ${type}`);
            isRewardGranted = true;
        });

        // Evento 4: Dismissed
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            console.log('[Rewarded] Dismissed');
            if (currentRewardedDeferred) {
                if (isRewardGranted) {
                    currentRewardedDeferred.resolve({ rewarded: true });
                } else {
                    currentRewardedDeferred.reject(new Error('Video unavailable. Try again later.'));
                }
                currentRewardedDeferred = null;
            }
            isRewardGranted = false;
        });

        // Evento 5: FailedToLoad
        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
            const code = (err && typeof err.code !== 'undefined') ? err.code : 'N/A';
            const message = (err && err.message) ? err.message : 'Nessun messaggio fornito';
            console.error(`[Rewarded] FailedToLoad → code: ${code}, message: ${message}`);
            if (currentRewardedDeferred) {
                currentRewardedDeferred.reject(err);
                currentRewardedDeferred = null;
            }
            isRewardGranted = false;
        });

        // Evento 6: FailedToShow
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {
            const code = (err && typeof err.code !== 'undefined') ? err.code : 'N/A';
            const message = (err && err.message) ? err.message : 'Nessun messaggio fornito';
            console.error(`[Rewarded] FailedToShow → code: ${code}, message: ${message}`);
            if (currentRewardedDeferred) {
                currentRewardedDeferred.reject(err);
                currentRewardedDeferred = null;
            }
            isRewardGranted = false;
        });

        isRewardedListenersRegistered = true;
        console.log('[AdMob] Listener Rewarded registrati con successo all\'avvio.');
    } catch (e) {
        console.warn('[AdMob] Errore registrazione listener Rewarded:', e);
    }
}

/**
 * FUNZIONE PUBBLICA: showRewardedForContinue()
 * a. Chiama AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917', isTesting: true })
 * b. Attende l'evento Loaded, poi chiama AdMob.showRewardVideoAd()
 * c. Restituisce una Promise che si risolve SOLO quando l'utente completa il video (evento Rewarded)
 *    e si rifiuta se l'utente chiude prima (Dismissed senza Rewarded) o se c'è un errore.
 */
async function showRewardedForContinue() {
    const env = detectEnvironment();

    // Fallback di simulazione per testing su Web / Localhost
    if (!env.isNative) {
        console.log('[Rewarded] Modalità Web/Localhost: simulazione annuncio rewarded...');
        return new Promise((resolve) => {
            console.log('[Rewarded] Loading...');
            setTimeout(() => {
                console.log('[Rewarded] Loaded');
                console.log('[Rewarded] Showed');
                console.log('[Rewarded] Rewarded → amount: 1, type: revive');
                console.log('[Rewarded] Dismissed');
                resolve({ amount: 1, type: 'revive' });
            }, 600);
        });
    }

    const AdMob = getNativeAdMobPlugin();
    if (!AdMob) {
        throw new Error('Plugin AdMob non disponibile sulla piattaforma corrente.');
    }

    if (!isAdMobInitialized) {
        await initAdMob();
    }

    if (currentRewardedDeferred) {
        console.warn('[Rewarded] Una richiesta di rewarded video è già in corso.');
        return currentRewardedDeferred.promise;
    }

    isRewardGranted = false;

    return new Promise(async (resolve, reject) => {
        currentRewardedDeferred = { resolve, reject };

        try {
            console.log('[Rewarded] Loading...');

            // ID Ufficiale di TEST Google per Rewarded Video (Android): ca-app-pub-3940256099942544/5224354917
            // TODO GO-LIVE: sostituire con ca-app-pub-7566982605361565/5016164080 prima della pubblicazione
            const rewardedAdUnitId = ADMOB_CONFIG.testRewardedAdUnitIdAndroid;

            await AdMob.prepareRewardVideoAd({
                adId: rewardedAdUnitId,
                isTesting: true
            });
            // Al completamento del caricamento, il listener 'onRewardedVideoAdLoaded' invocherà showRewardVideoAd()
        } catch (prepErr) {
            const code = (prepErr && typeof prepErr.code !== 'undefined') ? prepErr.code : 'N/A';
            const message = (prepErr && prepErr.message) ? prepErr.message : prepErr;
            console.error(`[Rewarded] FailedToLoad → code: ${code}, message: ${message}`);
            currentRewardedDeferred = null;
            reject(prepErr);
        }
    });
}
window.showRewardedForContinue = showRewardedForContinue;

/**
 * Aggiorna il testo di stato nel banner HTML.
 */
function updateSubtitles(text) {
    const el = document.querySelector('.google-test-subtitle');
    if (el) {
        el.textContent = text;
    }
}

function isHomeScreenActive() {
    const homeScreen = document.getElementById('home-screen');
    return Boolean(homeScreen && !homeScreen.classList.contains('hidden'));
}

function isTutorialActive() {
    if (typeof window !== 'undefined' && window.TutorialManager && window.TutorialManager.isActive) {
        return true;
    }
    const tutorialModal = document.getElementById('tutorial-modal-overlay');
    const tutorialBanner = document.getElementById('tutorial-banner') || document.getElementById('tutorial-step-banner');
    return Boolean(tutorialModal || tutorialBanner);
}

function isGameScreenActive() {
    const homeScreen = document.getElementById('home-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const isHome = homeScreen && !homeScreen.classList.contains('hidden');
    const isGame = appWrapper && appWrapper.style.display !== 'none';
    return !isHome && Boolean(isGame);
}

/**
 * Applica la visibilità del banner in base allo stato attuale.
 * REGOLA:
 * 1. In Home o durante il Tutorial: SEMPRE nascosto.
 * 2. In Gioco: il banner appare SOLO quando è caricato (isBannerLoaded === true).
 * 3. Il gioco parte subito senza aspettare il caricamento del banner.
 */
function applyBannerVisibility() {
    const isHome = isHomeScreenActive();
    const isTutorial = isTutorialActive();
    const isGame = isGameScreenActive();
    const bannerEl = document.getElementById('admob-banner-container');

    if (isHome || isTutorial) {
        if (bannerEl) bannerEl.style.display = 'none';
        const env = detectEnvironment();
        if (env.isNative) {
            const AdMob = getNativeAdMobPlugin();
            if (AdMob && isNativeBannerCreated) {
                AdMob.hideBanner().catch(() => { });
            }
        }
        return;
    }

    if (isGame) {
        const env = detectEnvironment();
        if (!env.isNative) {
            if (bannerEl) bannerEl.style.display = 'flex';
            if (!isBannerActive) initWebTestBanner();
            return;
        }

        const AdMob = getNativeAdMobPlugin();
        if (!AdMob || !isAdMobInitialized) return;

        if (isBannerLoaded) {
            // Il banner è pronto: mostralo sia nel DOM che nell'overlay nativo
            if (bannerEl) bannerEl.style.display = 'flex';
            if (isNativeBannerCreated) {
                AdMob.resumeBanner().catch(() => {
                    requestBannerLoad();
                });
            }
        } else {
            // Non ancora caricato: il DOM resta nascosto e viene richiesto
            // il caricamento in background. IL GIOCO NON ASPETTA NULLA!
            if (bannerEl) bannerEl.style.display = 'none';
            requestBannerLoad();
        }
    }
}

/**
 * Aggiorna la visibilità del banner in modo non bloccante.
 */
function updateBannerVisibility() {
    if (bannerVisibilityTimeout) clearTimeout(bannerVisibilityTimeout);
    bannerVisibilityTimeout = setTimeout(applyBannerVisibility, 16);
}
window.updateBannerVisibility = updateBannerVisibility;

/**
 * Richiede il caricamento del banner in background in modo 100% asincrono.
 * Non blocca mai il thread principale né l'avvio del gioco.
 */
function requestBannerLoad() {
    if (isBannerLoading || isBannerLoaded) return;
    isBannerLoading = true;

    setTimeout(async () => {
        try {
            const env = detectEnvironment();
            if (!env.isNative) {
                isBannerLoaded = true;
                isBannerLoading = false;
                applyBannerVisibility();
                return;
            }

            const AdMob = getNativeAdMobPlugin();
            if (!AdMob) {
                isBannerLoading = false;
                return;
            }

            if (!isAdMobInitialized) {
                await initAdMob();
            }

            registerBannerListeners(AdMob);

            const isIos = (env.platform === 'ios');
            const googleOfficialTestUnit = isIos
                ? ADMOB_CONFIG.testBannerAdUnitIdIos
                : ADMOB_CONFIG.testBannerAdUnitIdAndroid;

            const selectedAdUnitId = ADMOB_CONFIG.isTesting
                ? googleOfficialTestUnit
                : ADMOB_CONFIG.productionBannerAdUnitId;

            const bannerOptions = {
                adId: selectedAdUnitId,
                adSize: BannerAdSize.BANNER,
                position: BannerPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: true
            };

            console.log('[AdMob] Richiesta caricamento banner in background...');
            await AdMob.showBanner(bannerOptions);
            isNativeBannerCreated = true;

            // Se l'utente è ancora nella Home, mantieni la vista nascosta
            if (isHomeScreenActive()) {
                await AdMob.hideBanner().catch(() => { });
            } else if (isGameScreenActive()) {
                applyBannerVisibility();
            }
        } catch (err) {
            console.warn('[AdMob] Errore caricamento banner in background:', err);
            isBannerLoading = false;
        }
    }, 50);
}
window.requestBannerLoad = requestBannerLoad;

/**
 * Inizializza il banner di test per l'ambiente web/browser (localhost).
 */
function initWebTestBanner() {
    console.log('[AdMob WEB] ✅ Inizializzazione Google Test Banner per browser/localhost...');
    isBannerActive = true;
    isBannerLoaded = true;

    const ctaBtn = document.getElementById('google-test-cta-btn');
    const adBox = document.getElementById('google-test-ad-box');

    const handleClick = (e) => {
        e.stopPropagation();
        console.log('[AdMob EVENT] 🔗 BannerAdPluginEvents.Opened (Simulazione click banner di test Google)');
        window.open('https://developers.google.com/admob/android/test-ads', '_blank');
    };

    if (ctaBtn) ctaBtn.onclick = handleClick;
    if (adBox) adBox.onclick = handleClick;

    updateSubtitles('Google AdMob Test Mode • google.com');
}

/**
 * Inizializza l'SDK di AdMob (senza bloccare il gioco).
 */
async function initAdMob() {
    const env = detectEnvironment();
    console.log('[AdMob DEBUG] Inizio initAdMob(). Ambiente rilevato:', env);

    if (!env.isNative) {
        initWebTestBanner();
        return true;
    }

    const AdMob = getNativeAdMobPlugin();
    if (!AdMob) {
        console.warn('[AdMob DEBUG] Plugin AdMob nativo non ancora pronto.');
        return false;
    }

    if (isAdMobInitialized) {
        return true;
    }

    // STEP 1: GESTIONE CONSENSO UMP PRIMA DI INITIALIZE
    console.log('[AdMob STEP 1/4] Gestione Consenso UMP GDPR...');
    await requestAndHandleConsent(AdMob);

    // STEP 2: REGISTRAZIONE LISTENER (UNA SOLA VOLTA ALL'AVVIO)
    registerBannerListeners(AdMob);
    registerInterstitialListeners(AdMob);
    registerRewardedListeners(AdMob);

    // STEP 3: INITIALIZE
    console.log('[AdMob STEP 3/4] Invocazione AdMob.initialize({ initializeForTesting: true })...');
    try {
        const initResult = await AdMob.initialize({
            initializeForTesting: true,
            testingDevices: []
        });
        isAdMobInitialized = true;
        console.log('[AdMob STEP 3/4] ✅ AdMob.initialize() completato con successo!', JSON.stringify(initResult || {}));
        return true;
    } catch (err) {
        console.error('[AdMob STEP 3/4] ❌ Errore in AdMob.initialize():', err);
        return false;
    }
}
window.initAdMob = initAdMob;

/**
 * Funzione pubblica: richiede l'esposizione del banner senza bloccare il gioco.
 */
async function showBottomBanner(position = BannerPosition.BOTTOM_CENTER, customAdUnitId = null, forceTest = true) {
    if (isHomeScreenActive()) {
        console.log('[AdMob] Schermata Home attiva: il banner deve essere presente SOLO nella schermata di gioco.');
        await hideBanner();
        return false;
    }

    if (isBannerLoaded) {
        applyBannerVisibility();
        return true;
    }

    requestBannerLoad();
    return true;
}
window.showBottomBanner = showBottomBanner;
window.showBanner = showBottomBanner;

/**
 * TEST FORMATO 2: INTERSTITIAL TEST (AdMob)
 */
async function testInterstitialAd() {
    console.log('[AdMob TEST] 🎬 Avvio test annuncio Interstitial...');
    const AdMob = getNativeAdMobPlugin();
    if (!AdMob) {
        alert('Test Interstitial disponibile su app mobile nativa.');
        return;
    }

    try {
        if (!isAdMobInitialized) {
            await initAdMob();
        }

        registerInterstitialListeners(AdMob);

        console.log('[AdMob INTERSTITIAL] Chiamata prepareInterstitial con ID test:', ADMOB_CONFIG.testInterstitialAdUnitIdAndroid);
        await AdMob.prepareInterstitial({
            adId: ADMOB_CONFIG.testInterstitialAdUnitIdAndroid,
            isTesting: true
        });
        console.log('[AdMob INTERSTITIAL] Interstitial caricato. Presentazione a schermo con showInterstitial()...');
        await AdMob.showInterstitial();
        console.log('[AdMob INTERSTITIAL] ✅ Interstitial mostrato con successo!');
    } catch (e) {
        console.error('[AdMob INTERSTITIAL] ❌ Errore Interstitial:', e);
        alert(`Errore Interstitial AdMob:\nCode: ${e?.code || 'N/A'}\nMessage: ${e?.message || e}`);
    }
}
window.testInterstitialAd = testInterstitialAd;

/**
 * TEST MANUALE DEL MODULO DI CONSENSO UMP
 */
async function testConsentForm() {
    console.log('[AdMob TEST] 📋 Test manuale modulo di consenso UMP...');
    const AdMob = getNativeAdMobPlugin();
    if (!AdMob) {
        alert('Consenso UMP disponibile su app mobile nativa.');
        return;
    }

    try {
        if (typeof AdMob.resetConsentInfo === 'function') {
            await AdMob.resetConsentInfo();
            console.log('[AdMob TEST] resetConsentInfo completato.');
        }

        const result = await requestAndHandleConsent(AdMob);
        alert(`Risultato test consenso UMP:\n${JSON.stringify(result, null, 2)}`);
    } catch (e) {
        console.error('[AdMob TEST] Errore test consenso:', e);
        alert(`Errore test consenso:\n${e.message || e}`);
    }
}
window.testConsentForm = testConsentForm;

/**
 * Nasconde temporaneamente il banner
 */
async function hideBanner() {
    const bannerEl = document.getElementById('admob-banner-container');
    if (bannerEl) bannerEl.style.display = 'none';

    const AdMob = getNativeAdMobPlugin();
    if (!AdMob) return false;

    try {
        await AdMob.hideBanner();
        isBannerActive = false;
        return true;
    } catch (err) {
        return false;
    }
}
window.hideBanner = hideBanner;

/**
 * Rimuove definitivamente il banner dalla vista
 */
async function removeBanner() {
    const bannerEl = document.getElementById('admob-banner-container');
    if (bannerEl) bannerEl.style.display = 'none';

    const AdMob = getNativeAdMobPlugin();
    if (!AdMob) return false;

    try {
        await AdMob.removeBanner();
        isBannerActive = false;
        return true;
    } catch (err) {
        return false;
    }
}
window.removeBanner = removeBanner;

/**
 * Avvio del ciclo AdMob
 */
function startAdMobLifecycle() {
    initAdMob().then(() => {
        // Precarica il banner in background mentre l'utente è sulla Home.
        // In questo modo, quando farà Play, il banner sarà già pronto o continuerà a caricarsi
        // in background SENZA causare alcuna attesa prima di iniziare a giocare.
        // Il banner rimarrà nascosto finché si è in Home.
        requestBannerLoad();
    }).catch(err => {
        console.error('[AdMob DEBUG] Errore startAdMobLifecycle:', err);
    });
}

// Inizializzazione automatica sia su DOMContentLoaded che deviceready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(startAdMobLifecycle, 300);
    });
} else {
    setTimeout(startAdMobLifecycle, 300);
}

document.addEventListener('deviceready', () => {
    console.log('[AdMob DEBUG] Evento "deviceready" intercettato.');
    startAdMobLifecycle();
});

// Hook per i pulsanti di test diagnostici
document.addEventListener('DOMContentLoaded', () => {
    const btnInterstitial = document.getElementById('btn-test-admob-interstitial');
    if (btnInterstitial) {
        btnInterstitial.addEventListener('click', (e) => {
            e.stopPropagation();
            testInterstitialAd();
        });
    }

    const btnRewarded = document.getElementById('btn-test-admob-rewarded');
    if (btnRewarded) {
        btnRewarded.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('[AdMob TEST] 🎁 Test manuale annuncio Rewarded...');
            try {
                const res = await showRewardedForContinue();
                alert(`Rewarded Video completato con successo!\n${JSON.stringify(res)}`);
            } catch (err) {
                alert(`Rewarded Video non completato o errore:\n${err?.message || err}`);
            }
        });
    }

    const btnConsent = document.getElementById('btn-test-admob-consent');
    if (btnConsent) {
        btnConsent.addEventListener('click', (e) => {
            e.stopPropagation();
            testConsentForm();
        });
    }

    updateBannerVisibility();
});

window.addEventListener('resize', updateBannerVisibility);
