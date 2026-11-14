# Console de l'Atelier : modèle « sur [a;b] » pour une définition de fonction

## Reprendre ici

_Mis à jour le 2026-11-14, PR ouverte (codée, tests verts)._

- **État** : codé sur `feat/atelier-modele-definition` : `src/lib/atelier/draft-hint.ts` (`definitionHint`), branché dans `CalculView.svelte` (ligne « Modèle », les deux champs) ; tests `draft-hint.test.ts`, `CalculView.svelte.test.ts`, `reglages.svelte.test.ts` ; `docs/systeme/atelier.md` à jour.
- **Prochaine action** : CI verte → merge ; puis versement (journal archivé, chantier clos).
- **En attente de David** : essai à l'écran (serveur de la branche, port 5176).
- **Pièges en cours** : tester l'Atelier sur un autre appareil en HTTPS (Tailscale Serve) ou par tunnel, JAMAIS `http://100.79.226.105` (`crypto.randomUUID` absent → l'Atelier plante) ; en champ mathématique, la ligne relue en texte garde « sur » collé (`xsur`) : `definitionHint` la lit comme du LaTeX.
- **Worktree / branche** : `../ubumaths-wt-modele-definition` · `feat/atelier-modele-definition`.

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
- 2026-11-14 : codé (tests d'abord, rouges puis verts). Le modèle s'affiche dès `f(x) =` ; la variable tapée sert aussi au corps (`g(t) = t² sur [0;3]`). Le champ mathématique n'a pas d'`aria-describedby` (hôte MathLive, comme la liste des commandes).
