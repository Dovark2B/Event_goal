/!\ BEAUCOUP DE VIBE CODE, je suis un noob /!\

Même ce readme c'est pas moi qui l'ai écrit. J'avais la flemme.
Donc possiblement des erreurs, j'ai relu et modifié des trucs car il dit n'imp.

***

# Event Goal Overlay

Event Goal est un overlay HTML/CSS/JS pour suivre un objectif de stream basé sur plusieurs types d’events (dons, subs, bits, etc.), piloté par Streamer.bot et compatible avec TipeeeStream.

## Fonctionnalités

- Barre de progression animée avec dégradé.  
- Paliers configurables (ex. 100 / 300 / 600 points) avec titre par palier.  
- Agrégation de plusieurs sources d’events :
  - Twitch Sub / ReSub / Gift Sub  
  - Twitch Cheer (bits)  
  - Dons Streamlabs (pas testé) / StreamElements (non plus) / TipeeeStream  
- Conversion configurable des events en points (bits, subs, dons).  
- Page de **settings** dédiée pour configurer :
  - Paliers, conversions, couleurs, options d’affichage  
  - Titre final une fois tous les paliers atteints  
  - **Points de départ** (base de la barre, appliqués via un bouton de réinitialisation)  
- **Mémoire locale** : la progression (points, niveau) est sauvegardée en localStorage et conservée entre les refresh, la fermeture d’OBS et les redémarrages du PC.

## Prérequis

- Streamer.bot installé et configuré (serveur WebSocket activé).
- Hébergement statique pour l’overlay (par exemple GitHub Pages).  
- OBS Studio >=32.0.4

## Installation / URLs

### Utilisation via GitHub Pages

- Page **Settings** :  
  `https://dovark2b.github.io/Event_goal/settings/`  
  Permet de configurer paliers, couleurs, conversions, options, et de gérer la progression.
  À utiliser comme Dock personnalisé dans OBS.

- Page **Overlay** :  
  `https://dovark2b.github.io/Event_goal/`  
  À utiliser comme **Source Navigateur** dans OBS.  

Les deux pages partagent le même localStorage car elles sont sur le même domaine, ce qui permet de synchroniser la configuration et la progression.

### Utilisation en local

```bash
git clone https://github.com/dovark2b/Event_goal.git
cd Event_goal
# Servir le dossier avec un serveur statique (par ex. live-server, http-server, overlay SB, etc.)
```

Ensuite :

- `http://localhost:PORT/Event_goal/settings/` → page settings  
- `http://localhost:PORT/Event_goal/` → overlay

## Mémoire et progression

L’overlay ne dépend plus des paramètres d’URL pour sa configuration.  
La mémoire et la config sont gérées via **localStorage** et la page settings.

### Ce qui est sauvegardé

Clés localStorage utilisées :

```text
subGoal_currentPoints   // points actuels
subGoal_currentLevel    // niveau/palier actuel
subGoal_levels          // liste des paliers
subGoal_points          // config des conversions (bits/sub/don)
subGoal_gradient        // couleurs du dégradé
subGoal_options         // options d’affichage (hideWaves)
subGoal_finalTitle      // texte final quand tous les paliers sont atteints
```

Comportement :

- À chaque event (sub, bits, don), l’overlay incrémente `currentPoints`, met à jour la barre et sauvegarde `currentPoints` + `currentLevel` dans localStorage.  
- Au chargement de l’overlay, la config et la progression sont relues depuis localStorage, ce qui permet de reprendre là où tu t’es arrêté, même après redémarrage.
- Quand tu modifies la config ou réinitialises depuis la page settings, l’overlay détecte les changements via l’événement `storage` et met à jour l’affichage.

### Points de départ

Le champ **“Points de départ”** dans la page settings :

- **N’est pas appliqué automatiquement** quand tu cliques sur “Appliquer la configuration”.  
- Il est utilisé **uniquement** par le bouton **“Réinitialiser la progression”**.  
- Quand tu cliques sur ce bouton :
  - `subGoal_currentPoints` est mis à `Points de départ`  
  - `subGoal_currentLevel` est remis à `0`  
  - L’overlay se remet à cette nouvelle base au prochain rafraîchissement (ou immédiatement si l’onglet est ouvert).

## Intégration Streamer.bot

L’overlay utilise `StreamerbotClient` pour écouter les events WebSocket Streamer.bot et transformer les événements en points.

Events utilisés :

- `Twitch.Sub`  
- `Twitch.ReSub`  
- `Twitch.GiftSub`  
- `Twitch.Cheer`  
- `Streamlabs.Donation` *(handler présent, à tester selon setup)*  
- `StreamElements.Tip` *(handler présent, à tester selon setup)*  
- `TipeeeStream.Donation`

Logique de conversion (exemples par défaut) :

```json
{
  "bits": 1,       // 100 bits = 1 point
  "sub":  2,       // 1 sub = 2 points
  "donation": 1    // 1 € = 1 point
}
```

Les handlers Streamer.bot côté overlay :

- Lisent les données de l’event (montant, bits, tier, etc.).  
- Calculent le nombre de points à ajouter.  
- Appellent `addPoints(...)` pour mettre à jour :
  - `currentPoints`  
  - le palier courant  
  - l’animation de la barre  
  - la sauvegarde localStorage (`subGoal_currentPoints`, `subGoal_currentLevel`).

Assure‑toi dans Streamer.bot que :

- Le **serveur WebSocket** est activé.  
- Les intégrations Twitch / Streamlabs / StreamElements / TipeeeStream sont configurées.  
- Les events correspondants sont bien reçus (tu peux vérifier dans les logs Streamer.bot).

***
