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
  - Twitch Cheer (bits → points)  
  - Dons (Streamlabs, StreamElements, TipeeeStream)
- Conversion configurable des events en points (bits, subs, dons).  
- Configuration fine via paramètres d’URL (paliers, valeurs de points, points de départ).

## Prérequis

- Streamer.bot installé et configuré (WebSocket activé).
- Un serveur d’overlay (celui de Streamer.bot, ou hébergement statique type GitHub Pages).  
- OBS / logiciel de stream capable d’afficher une source navigateur.

## Installation

1. URL github Pages :
https://dovark2b.github.io/Event_goal/settings



2. Clone du dépôt :

```bash
git clone https://github.com/TON_USER/event_goal.git
cd event_goal
```

## Configuration

L’overlay lit plusieurs paramètres dans l’URL donc pas de mémoire.
Revient au paramètres de base a chaque refresh de la source.


### Exemple d’URL

```text
http://localhost:8080/?&levels=%5B%7B%22name%22%3A%22Palier%201%20%3A%20D%C3%A9collage
%20!%22%2C%22target%22%3A100%7D%2C%7B%22name%22%3A%22Palier%202%20%3A%20Propulsion%20!
%22%2C%22target%22%3A300%7D%2C%7B%22name%22%3A%22Palier%203%20%3A%20Orbite
%20atteinte%20!%22%2C%22target%22%3A600%7D%5D&
points=%7B%22bits%22%3A1%2C%22sub%22%3A2%2C%22donation%22%3A1%7D&startPoints=0
```

Les structures attendues :

```json
// levels
[
  { "name": "Palier 1 : Décollage !", "target": 100 },
  { "name": "Palier 2 : Propulsion !", "target": 300 },
  { "name": "Palier 3 : Orbite atteinte !", "target": 600 }
]

// points
{
  "bits": 1,
  "sub": 2,
  "donation": 1
}
```

Les paliers sont traités comme des seuils **absolus** (100, 300, 600) et le script calcule automatiquement la progression relative par palier.

## Intégration Streamer.bot

L’overlay utilise un `StreamerbotClient` pour écouter les events WebSocket suivants :

- `Twitch.Sub`  
- `Twitch.ReSub`  
- `Twitch.GiftSub`  
- `Twitch.Cheer`  
- `Streamlabs.Donation`  (Pas encore testé)
- `StreamElements.Tip`  (Pas encore testé)
- `TipeeeStream.Donation`

Chaque handler convertit l’event en points selon `GOAL_SETTINGS.points` puis appelle `addPoints(...)` / `addPointsWithSmoothLevels(...)` pour mettre à jour la barre.

Assure‑toi dans Streamer.bot que :

- Le serveur WebSocket est activé.  
- Les triggers correspondants sont bien configurés pour les plateformes que tu utilises.

