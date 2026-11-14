# Console de l'Atelier : modèle « sur [a;b] » pour une définition de fonction

## Reprendre ici

_Mis à jour le 2026-11-14, phase 0 validée par David, rien codé._

- **État** : phase 0 ci-dessous VALIDÉE (« ok » de David, 2026-11-14). Aucun code, aucun worktree.
- **Prochaine action** : `git worktree add -b feat/atelier-modele-definition ../ubumaths-wt-modele-definition origin/main` ; tests d'abord (rouges) dans `src/lib/components/atelier/__tests__/` ; puis `CalculView.svelte` (ligne « Modèle », `model` / `writing`, l. ~396 : aujourd'hui champ texte seulement).
- **En attente de David** : rien.
- **Pièges en cours** : tester l'Atelier sur un autre appareil en HTTPS (Tailscale Serve) ou par tunnel, JAMAIS `http://100.79.226.105` (`crypto.randomUUID` absent → l'Atelier plante) ; `desk.draft` est la ligne en TEXTE même en champ mathématique (`draftTextOf`) ; intervalle lu par `src/lib/atelier/interval.ts`.
- **Worktree / branche** : à créer (voir ci-dessus).

## Phase 0 — comportements validés

**Nominal**

- Ligne = définition de fonction (`f(x) = …`) sans « sur » → sous le champ : « Modèle : f(x) = x² sur [0;3] — pour choisir l'ensemble », avec le nom et la variable tapés (`g(t) = …` → `g(t) = … sur [0;3]`).
- Même ligne dans le champ texte et dans le champ mathématique.
- Place et style de la ligne « Modèle » des commandes.

**Limites**

- « sur » tapé → modèle de l'intervalle : « [a;b], ]a;b[, [0;+∞[ ».
- Rien pour un calcul (`3+4`) ni pour une commande (elle garde son modèle).
- Indication seulement : Entrée calcule toujours la ligne telle quelle.

**Erreur**

- Intervalle mal écrit : message actuel inchangé (« Je n'ai pas su lire l'intervalle : écris par exemple sur [0;+∞[. »).

**Hors périmètre** : les cartes de « Mes objets » (même aide possible plus tard).

## Historique

- 2026-11-14 : chantier ouvert après #2635 / #2640 (chantier `bouton-calculer`, archivé). Idée proposée, non demandée : ligne « Modèle » des commandes dans le champ mathématique ; commandes proposées sans point dans le champ texte.
