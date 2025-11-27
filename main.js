// Extraction de la config overlay depuis l'URL (optionnel)
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const sbServerAddress = urlParams.get("address") || "127.0.0.1";
const sbServerPort = urlParams.get("port") || "8080";

// Paramètres des points
const GOAL_SETTINGS = {
    levels: [
        { name: "Palier 1 : Décollage !", target: 100 },
        { name: "Palier 2 : Propulsion !", target: 300 },
        { name: "Palier 3 : Orbite atteinte !", target: 600 }
    ],
    points: {
        bits: 1,        // 100 bits = 1 point
        sub: 2,         // 1 sub = 2 points
        donation: 1     // 1 € = 1 point
    }
};
let currentPoints = 0;
let currentLevel = 0;

const goalTitle = document.getElementById("goal-title");
const goalProgressText = document.getElementById("goal-progress-text");
const goalFill = document.getElementById("goal-fill");
const currentPointsText = document.getElementById("current-points");
const goalTargetText = document.getElementById("goal-target");

// MAJ paramètres depuis l'URL
// Lecture des paramètres URL
const params = new URLSearchParams(window.location.search);

if (params.has("levels")) {
    try {
        const parsedLevels = JSON.parse(decodeURIComponent(params.get("levels")));
        
        // NOUVEAU : Validation - chaque palier doit être >= au précédent
        for (let i = 1; i < parsedLevels.length; i++) {
            if (parsedLevels[i].target < parsedLevels[i - 1].target) {
                console.warn(`⚠️ Palier ${i + 1} (${parsedLevels[i].target}) est inférieur au Palier ${i} (${parsedLevels[i - 1].target}). Correction appliquée.`);
                parsedLevels[i].target = parsedLevels[i - 1].target;
            }
        }
        
        GOAL_SETTINGS.levels = parsedLevels;
    } catch (e) {
        console.error("Erreur parsing levels:", e);
    }
}
if (params.has("points")) {
    try {
        GOAL_SETTINGS.points = JSON.parse(decodeURIComponent(params.get("points")));
    } catch (e) { console.error("Erreur lecture points:", e); }
}

// NOUVEAU : Points de départ
if (params.has("startPoints")) {
    currentPoints = parseFloat(params.get("startPoints")) || 0;
    console.log("Points de départ définis à :", currentPoints);
}

updateBar();

// Retourne le jalon absolu du niveau (on n'additionne plus)
function getGoalThreshold(level) {
    if (level < 0) return 0;
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
        await sleep(400); // Pause avant d'annoncer le nouveau palier

        advanceLevel();
    }

    updateBar();
    // saveProgress();
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
  if (currentLevel >= GOAL_SETTINGS.levels.length) {
    // Tous les paliers sont atteints
    goalTitle.textContent = "Tous les paliers atteints !";
    goalProgressText.textContent = "100%";
    currentPointsText.textContent = `${currentPoints.toFixed(2)} pts`;
    goalTargetText.textContent = `/ ${getGoalThreshold(GOAL_SETTINGS.levels.length - 1)} pts`;
    goalFill.style.width = "100%";
    return;
  }

  const level = GOAL_SETTINGS.levels[currentLevel];
  const prevThreshold = getGoalThreshold(currentLevel - 1);

  const levelProgress = currentPoints - prevThreshold;
  const levelTarget = getLevelTarget(currentLevel);
  const progress = levelTarget > 0 ? (levelProgress / levelTarget) * 100 : 100;

  goalTitle.textContent = level.name;
  goalProgressText.textContent = `${progress.toFixed(1)}%`;
  currentPointsText.textContent = `${currentPoints.toFixed(2)} pts`;
  goalTargetText.textContent = `/ ${getGoalThreshold(currentLevel)} pts`;
  goalFill.style.width = `${Math.min(progress, 100)}%`;

}



// === LOGIQUE MODERNE AVEC EVENTS NATIFS ===
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

// TWITCH RESUB (si tu veux le compter pareil que Sub)
client.on('Twitch.ReSub', (response) => {
    console.log("Event Twitch.ReSub :", response.data);
    addPoints(GOAL_SETTINGS.points.sub);
});

// TWITCH GIFT SUB
client.on('Twitch.GiftSub', (response) => {
    console.log("Event Twitch.GiftSub :", response.data);

    // subTier : "1000" (Tier 1), "2000" (Tier 2), "3000" (Tier 3)
    const tier = String(response.data.subTier || '');
    let points = GOAL_SETTINGS.points.sub; // Default Tier 1 = 3 dans tes paramètres

    if (tier === '2000') points = 3;    // Tier 2
    else if (tier === '3000') points = 4; // Tier 3

    // ✅ UN SEUL SUB PAR ÉVÉNEMENT, pas de multiplication
    console.log(`SubGift : tier = ${tier}, points = ${points}`);
    addPoints(points);
});



// TWITCH CHEER (BITS)
client.on('Twitch.Cheer', (response) => {
    // 'bits' entier natif, 100 bits = 1 point
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
    const data  = payload?.data  || {};

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



// // TEST TRIGGERS
// client.on('Raw.Action', (response) => {
//    const args = response.data?.arguments;
//    if (!args) return;

//    // DONATION TEST
//    if (args.triggerName === "Donation" && args.triggerCategory === "Integrations/TipeeeStream") {
//        let amount = parseFloat(args.amount) || 0;
//        if (args.currency === "USD") amount *= 0.95;
//        addPoints(amount * GOAL_SETTINGS.points.donation);
//        return;
//    }

//    // SUB TEST
//    if (args.triggerName === "Subscription" && args.triggerCategory === "Twitch/Subscriptions") {
//        addPoints(GOAL_SETTINGS.points.sub);
//        return;
//    }

//    // GIFT SUB TEST
//    if (args.triggerName === "Gift Subscription" && args.triggerCategory === "Twitch/Subscriptions") {
//        let points = GOAL_SETTINGS.points.sub;
//        const tier = String(args.tier || '').toLowerCase();
//        if (tier.includes('2')) points = 3;
//        if (tier.includes('3')) points = 4;
//        addPoints(points);
//        return;
//    }

//    // BITS TEST
//    if (args.triggerName === "Cheer" && args.triggerCategory === "Twitch/Chat") {
//        const bits = parseInt(args.bits, 10) || 0;
//        const pts = parseFloat((bits * GOAL_SETTINGS.points.bits / 100).toFixed(2));
//        console.log(`Ajout de points bits: ${bits} bits -> ${pts} pts`);
//        addPoints(pts);
//        return;
//    }
// });

