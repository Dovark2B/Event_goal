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
const params = new URLSearchParams(window.location.search);
if (params.has("levels")) {
    try {
        GOAL_SETTINGS.levels = JSON.parse(decodeURIComponent(params.get("levels")));
    } catch (e) { console.error("Erreur lecture niveaux:", e); }
}
if (params.has("points")) {
    try {
        GOAL_SETTINGS.points = JSON.parse(decodeURIComponent(params.get("points")));
    } catch (e) { console.error("Erreur lecture points:", e); }
}
updateBar();

function addPoints(pts) {
    currentPoints += pts;
    const level = GOAL_SETTINGS.levels[currentLevel];
    if (currentPoints >= level.target) {
        currentPoints = currentPoints - level.target;
        advanceLevel();
    }
    updateBar();
}
function advanceLevel() {
    if (currentLevel + 1 < GOAL_SETTINGS.levels.length) {
        currentLevel++;
        console.log("Nouveau palier :", GOAL_SETTINGS.levels[currentLevel].name);
    }
}
function updateBar() {
    const level = GOAL_SETTINGS.levels[currentLevel];
    const progress = (currentPoints / level.target) * 100;
    goalTitle.textContent = level.name;
    goalProgressText.textContent = `${progress.toFixed(1)}%`;
    currentPointsText.textContent = `${currentPoints.toFixed(2)} pts`;
    goalTargetText.textContent = `/ ${level.target} pts`;
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
    const tier = String(response.data.subTier || '').toLowerCase();
    let points = GOAL_SETTINGS.points.sub; // Default Tier 1

    if (tier === '2000') points = 3;    // Tier 2
    else if (tier === '3000') points = 4; // Tier 3

    // Pour gérer les bombes ou séries, cumlativeTotal ou communitySubGiftCount
    const count =
        parseInt(response.data.communitySubGiftCount, 10) ||
        parseInt(response.data.cumlativeTotal, 10) ||
        1; // par défaut une seule sub

    // Sauf si tu veux ajouter à chaque appel, alors juste 1

    // Calcul total des points attribués
    const totalPoints = points * count;

    console.log(`SubGift : tier = ${tier}, count = ${count}, total points = ${totalPoints}`);
    addPoints(totalPoints);
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
client.on('TipeeeStream.Donation', ({ event, data }) => {
    const amount = parseFloat(data.amount) || 0;
    console.log('Received event:', event.source, event.type);
    console.log('Event data:', data)
    addPoints(amount * GOAL_SETTINGS.points.donation);
});


 /*TEST TRIGGERS
client.on('Raw.Action', (response) => {
    const args = response.data?.arguments;
    if (!args) return;

    // DONATION TEST
    if (args.triggerName === "Donation" && args.triggerCategory === "Integrations/TipeeeStream") {
        let amount = parseFloat(args.amount) || 0;
        if (args.currency === "USD") amount *= 0.95;
        addPoints(amount * GOAL_SETTINGS.points.donation);
        return;
    }

    // SUB TEST
    if (args.triggerName === "Subscription" && args.triggerCategory === "Twitch/Subscriptions") {
        addPoints(GOAL_SETTINGS.points.sub);
        return;
    }

    // GIFT SUB TEST
    if (args.triggerName === "Gift Subscription" && args.triggerCategory === "Twitch/Subscriptions") {
        let points = GOAL_SETTINGS.points.sub;
        const tier = String(args.tier || '').toLowerCase();
        if (tier.includes('2')) points = 3;
        if (tier.includes('3')) points = 4;
        addPoints(points);
        return;
    }

    // BITS TEST
    if (args.triggerName === "Cheer" && args.triggerCategory === "Twitch/Chat") {
        const bits = parseInt(args.bits, 10) || 0;
        const pts = parseFloat((bits * GOAL_SETTINGS.points.bits / 100).toFixed(2));
        console.log(`Ajout de points bits: ${bits} bits -> ${pts} pts`);
        addPoints(pts);
        return;
    }
});
*/
