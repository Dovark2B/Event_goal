// === PERSISTENCE AVEC LOCALSTORAGE ===
const STORAGE_KEYS = {
    CURRENT_POINTS: 'subGoal_currentPoints',
    CURRENT_LEVEL: 'subGoal_currentLevel',
    LEVELS: 'subGoal_levels',
    POINTS_CONFIG: 'subGoal_pointsConfig',
    GRADIENT: 'subGoal_gradient',
    OPTIONS: 'subGoal_options',
    FINAL_TITLE: 'subGoal_finalTitle'
};

// Extraction uniquement de l'adresse Streamerbot (optionnel)
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const sbServerAddress = urlParams.get("address") || "127.0.0.1";
const sbServerPort = urlParams.get("port") || "8080";

// Valeurs par défaut (utilisées seulement si localStorage vide)
const DEFAULT_SETTINGS = {
    levels: [
        { name: "Palier 1 : Décollage !", target: 100 },
        { name: "Palier 2 : Propulsion !", target: 300 }
    ],
    points: {
        bits: 1,
        sub: 2,
        donation: 1
    },
    gradient: { c1: "#ad7d22", c2: "#ffb74a" },
    options: { hideWaves: false },
    finalTitle: ""
};

let GOAL_SETTINGS = {
    levels: [...DEFAULT_SETTINGS.levels],
    points: { ...DEFAULT_SETTINGS.points }
};
let currentPoints = 0;
let currentLevel = 0;
let gradient = { ...DEFAULT_SETTINGS.gradient };
let options = { ...DEFAULT_SETTINGS.options };
let finalTitle = DEFAULT_SETTINGS.finalTitle;

let lastProgressDisplay = 0;
let lastPointsDisplay = 0;

const goalTitle = document.getElementById("goal-title");
const goalProgressText = document.getElementById("goal-progress-text");
const goalFill = document.getElementById("goal-fill");
const currentPointsText = document.getElementById("current-points");
const goalTargetText = document.getElementById("goal-target");
const wave1 = document.getElementById("wave1");
const wave2 = document.getElementById("wave2");

// === FONCTIONS DE PERSISTENCE ===

// Sauvegarde la progression
function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_POINTS, currentPoints);
        localStorage.setItem(STORAGE_KEYS.CURRENT_LEVEL, currentLevel);
        console.log(`💾 Progression sauvegardée: ${currentPoints.toFixed(2)} pts, Niveau ${currentLevel}`);
    } catch (e) {
        console.error("Erreur sauvegarde:", e);
    }
}

// Charge la progression
function loadProgress() {
    try {
        const savedPoints = localStorage.getItem(STORAGE_KEYS.CURRENT_POINTS);
        const savedLevel = localStorage.getItem(STORAGE_KEYS.CURRENT_LEVEL);
        
        if (savedPoints !== null) {
            currentPoints = parseFloat(savedPoints) || 0;
            console.log(`📥 Points chargés: ${currentPoints}`);
        }
        
        if (savedLevel !== null) {
            currentLevel = parseInt(savedLevel) || 0;
            console.log(`📥 Niveau chargé: ${currentLevel}`);
        }
    } catch (e) {
        console.warn("Erreur chargement progression:", e);
    }
}

// Sauvegarde toute la configuration
function saveConfig() {
    try {
        localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(GOAL_SETTINGS.levels));
        localStorage.setItem(STORAGE_KEYS.POINTS_CONFIG, JSON.stringify(GOAL_SETTINGS.points));
        localStorage.setItem(STORAGE_KEYS.GRADIENT, JSON.stringify(gradient));
        localStorage.setItem(STORAGE_KEYS.OPTIONS, JSON.stringify(options));
        localStorage.setItem(STORAGE_KEYS.FINAL_TITLE, finalTitle);
        console.log("💾 Configuration sauvegardée");
    } catch (e) {
        console.error("Erreur sauvegarde config:", e);
    }
}

// Charge toute la configuration
function loadConfig() {
    try {
        let hasData = false;
        
        // Charger les paliers
        const savedLevels = localStorage.getItem(STORAGE_KEYS.LEVELS);
        if (savedLevels) {
            GOAL_SETTINGS.levels = JSON.parse(savedLevels);
            console.log("📥 Paliers chargés:", GOAL_SETTINGS.levels);
            hasData = true;
        }
        
        // Charger la config des points
        const savedPoints = localStorage.getItem(STORAGE_KEYS.POINTS_CONFIG);
        if (savedPoints) {
            GOAL_SETTINGS.points = JSON.parse(savedPoints);
            console.log("📥 Config points chargée:", GOAL_SETTINGS.points);
            hasData = true;
        }
        
        // Charger le gradient
        const savedGradient = localStorage.getItem(STORAGE_KEYS.GRADIENT);
        if (savedGradient) {
            gradient = JSON.parse(savedGradient);
            console.log("📥 Gradient chargé:", gradient);
            hasData = true;
        }
        
        // Charger les options
        const savedOptions = localStorage.getItem(STORAGE_KEYS.OPTIONS);
        if (savedOptions) {
            options = JSON.parse(savedOptions);
            console.log("📥 Options chargées:", options);
            hasData = true;
        }
        
        // Charger le titre final
        const savedFinalTitle = localStorage.getItem(STORAGE_KEYS.FINAL_TITLE);
        if (savedFinalTitle !== null) {
            finalTitle = savedFinalTitle;
            console.log("📥 Titre final chargé:", finalTitle);
            hasData = true;
        }
        
        return hasData;
    } catch (e) {
        console.warn("Erreur chargement config:", e);
        return false;
    }
}

// Écoute les changements depuis la page Settings
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('subGoal_')) {
        console.log("🔄 Changement détecté depuis Settings:", e.key);
        
        // Recharger toute la config
        loadConfig();
        loadProgress();
        
        // Réappliquer le gradient et les options
        goalFill.style.background = `linear-gradient(90deg, ${gradient.c1} 0%, ${gradient.c2} 100%)`;
        wave1.style.backgroundColor = gradient.c2;
        wave2.style.backgroundColor = gradient.c2;
        
        if (options.hideWaves) {
            wave1.style.display = "none";
            wave2.style.display = "none";
        } else {
            wave1.style.display = "block";
            wave2.style.display = "block";
        }
        
        updateBar();
    }
});

// === FONCTIONS DE LOGIQUE MÉTIER ===

// Retourne le jalon absolu du niveau
function getGoalThreshold(level) {
    if (level < 0) return 0;
    if (level >= GOAL_SETTINGS.levels.length) return GOAL_SETTINGS.levels[GOAL_SETTINGS.levels.length - 1].target;
    return GOAL_SETTINGS.levels[level].target;
}

// Cible "par palier" = différence entre ce palier et le précédent
function getLevelTarget(levelIndex) {
    if (levelIndex < 0) return 0;
    if (levelIndex === 0) return GOAL_SETTINGS.levels[0].target;
    const prev = GOAL_SETTINGS.levels[levelIndex - 1].target;
    const cur = GOAL_SETTINGS.levels[levelIndex].target;
    return Math.max(0, cur - prev);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addPoints(pts) {
    currentPoints += pts;

    // Avance les paliers si besoin
    while (
        currentLevel < GOAL_SETTINGS.levels.length &&
        currentPoints >= getGoalThreshold(currentLevel)
    ) {
        updateBar();
        await sleep(300);
        advanceLevel();
    }

    updateBar();
    saveProgress(); // ✅ Sauvegarde automatique
}

function animateValue(element, start, end, duration, formatter) {
    const startTime = performance.now();

    function frame(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const value = start + (end - start) * t;

        element.textContent = formatter(value);

        if (t < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function advanceLevel() {
    if (currentLevel + 1 < GOAL_SETTINGS.levels.length) {
        currentLevel++;
        console.log("Nouveau palier :", GOAL_SETTINGS.levels[currentLevel].name);
    } else {
        console.log("Tous les paliers sont atteints !");
        currentLevel = GOAL_SETTINGS.levels.length;
    }
}

function updateBar() {
    const lastIndex = GOAL_SETTINGS.levels.length - 1;

    if (currentLevel >= GOAL_SETTINGS.levels.length) {
        const lastThreshold = getGoalThreshold(lastIndex);
        const rawProgress = (currentPoints / lastThreshold) * 100;
        const clampedWidth = Math.min(rawProgress, 100);

        goalTitle.textContent = finalTitle.trim() !== ""
            ? finalTitle
            : "Tous les paliers atteints !";

        animateValue(
            goalProgressText,
            lastProgressDisplay,
            rawProgress,
            400,
            (v) => `${v.toFixed(1)}%`
        );

        lastProgressDisplay = rawProgress;

        animateValue(
            currentPointsText,
            lastPointsDisplay,
            currentPoints,
            400,
            (v) => `${v.toFixed(2)} pts`
        );

        lastPointsDisplay = currentPoints;
        goalProgressText.textContent = `${rawProgress.toFixed(1)}%`;
        currentPointsText.textContent = `${currentPoints.toFixed(2)} pts`;
        goalTargetText.textContent = `/ ${lastThreshold} pts`;
        goalFill.style.width = `${clampedWidth}%`;
        wave1.style.left = `${clampedWidth}%`;
        wave2.style.left = `${clampedWidth}%`;
        return;
    }

    const level = GOAL_SETTINGS.levels[currentLevel];
    const prevThreshold = getGoalThreshold(currentLevel - 1);

    const levelProgress = currentPoints - prevThreshold;
    const levelTarget = getLevelTarget(currentLevel);
    const progress = levelTarget > 0 ? (levelProgress / levelTarget) * 100 : 100;

    goalTitle.textContent = level.name;

    animateValue(
        goalProgressText,
        lastProgressDisplay,
        progress,
        400,
        (v) => `${v.toFixed(1)}%`
    );
    lastProgressDisplay = progress;

    animateValue(
        currentPointsText,
        lastPointsDisplay,
        currentPoints,
        400,
        (v) => `${v.toFixed(2)} pts`
    );
    lastPointsDisplay = currentPoints;

    goalTargetText.textContent = `/ ${getGoalThreshold(currentLevel)} pts`;
    goalFill.style.width = `${Math.min(progress, 100)}%`;
    wave1.style.left = `${Math.min(progress, 100)}%`;
    wave2.style.left = `${Math.min(progress, 100)}%`;
}

// === INITIALISATION ===
function initialize() {
    console.log("📂 Chargement depuis localStorage...");
    
    const hasData = loadConfig();
    
    // Si aucune donnée, initialiser avec les valeurs par défaut
    if (!hasData) {
        console.log("🆕 Première utilisation - Initialisation avec valeurs par défaut...");
        saveConfig();
    }
    
    loadProgress();
    
    // Appliquer le gradient et les options
    goalFill.style.background = `linear-gradient(90deg, ${gradient.c1} 0%, ${gradient.c2} 100%)`;
    wave1.style.backgroundColor = gradient.c2;
    wave2.style.backgroundColor = gradient.c2;
    
    if (options.hideWaves) {
        wave1.style.display = "none";
        wave2.style.display = "none";
    } else {
        wave1.style.display = "block";
        wave2.style.display = "block";
    }
    
    updateBar();
}

// === CONNEXION STREAMERBOT ===
const client = new StreamerbotClient({
    host: sbServerAddress,
    port: sbServerPort,
    onConnect: () => console.log(`✨ Connecté à Streamer.bot ${sbServerAddress}:${sbServerPort}`),
    onDisconnect: () => console.log("❌ Déconnecté de Streamer.bot")
});

// TWITCH SUB
client.on('Twitch.Sub', (response) => {
    console.log("Event Twitch.Sub :", response.data);
    addPoints(GOAL_SETTINGS.points.sub);
});

// TWITCH RESUB
client.on('Twitch.ReSub', (response) => {
    console.log("Event Twitch.ReSub :", response.data);
    addPoints(GOAL_SETTINGS.points.sub);
});

// TWITCH GIFT SUB
client.on('Twitch.GiftSub', (response) => {
    console.log("Event Twitch.GiftSub :", response.data);

    const tier = String(response.data.subTier || '');
    let points = GOAL_SETTINGS.points.sub;

    if (tier === '2000') points = 3;
    else if (tier === '3000') points = 4;

    console.log(`SubGift : tier = ${tier}, points = ${points}`);
    addPoints(points);
});

// TWITCH CHEER (BITS)
client.on('Twitch.Cheer', (response) => {
    const bits = parseInt(response.data.bits, 10) || 0;
    const pts = parseFloat((bits * GOAL_SETTINGS.points.bits / 100).toFixed(2));
    console.log(`Event Twitch.Cheer : ${bits} bits => ${pts} points`);
    addPoints(pts);
});

// STREAMLABS DONATION
client.on('Streamlabs.Donation', (response) => {
    const amount = parseFloat(response.data.amount) || 0;
    console.log("Event Streamlabs.Donation :", amount);
    addPoints(amount * GOAL_SETTINGS.points.donation);
});

// STREAMELEMENTS TIP
client.on('StreamElements.Tip', (response) => {
    const amount = parseFloat(response.data.amount) || 0;
    console.log("Event StreamElements.Tip :", amount);
    addPoints(amount * GOAL_SETTINGS.points.donation);
});

// TIPEEESTREAM DONATION
client.on('TipeeeStream.Donation', (payload) => {
    try {
        console.log('Tipeee payload brut:', payload);

        const event = payload?.event || {};
        const data = payload?.data || {};

        const rawAmount = data.amount ?? data.value ?? 0;
        const amount = parseFloat(rawAmount) || 0;

        console.log('Received event:', event.source, event.type);
        console.log('Event data:', data);
        console.log('Montant parsé:', amount);

        if (!Number.isFinite(amount)) {
            console.warn('Montant non valide, aucun point ajouté');
            return;
        }

        addPoints(amount * (GOAL_SETTINGS.points.donation || 1));
    } catch (e) {
        console.error('Erreur dans TipeeeStream.Donation handler:', e);
    }
});

// ✅ Initialisation au chargement
initialize();
