# Console de l'Atelier : modèle « sur [a;b] » pour une définition de fonction

## Reprendre ici

_Mis à jour le 2026-11-14, après #2641. Chantier CLOS, journal archivé._

- **État** : livré par #2641 (mergée) : `definitionHint` (`src/lib/atelier/draft-hint.ts`), ligne « Modèle » de `CalculView.svelte`, dans les deux champs ; pas de modèle pour une suite (`u(n) =`, revue). Doc durable : `docs/systeme/atelier.md`.
- **Prochaine action** : aucune. Vérification à l'écran notée dans `docs/wip/verifications-manuelles.md`.
- **En attente de David** : rien.
- **Hors périmètre, à rouvrir un jour** : la même aide sur les cartes de « Mes objets ».

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
- 2026-11-14 : #2641 mergée (revue : suites `u(n)` exclues, espace insécable avant la note). Chantier clos, journal archivé.
