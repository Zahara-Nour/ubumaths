---
title: Figure manipulable partout et case « choix » (QCM réécrit en cases)
date: 2026-10-26
status: phase 0 à écrire
---

# Chantier « figure-et-choix »

## Reprendre ici

_Mis à jour le 2026-10-26, à l'ouverture du chantier._

- **État** : décisions de David prises (§ 1) ; rien d'écrit ni de codé.
- **Prochaine action** : écrire la phase 0 (§ 2) : lire l'existant (QCM, `figure-a-completer`, `deplacable:`),
  comportements nominal / limite / erreur, questions restantes à David ; puis attendre sa validation.
- **En attente de David** : rien pour l'instant.
- **Pièges en cours** : migration destructive (retrait de `multiple_choice`) seulement après le `deploy:prod` du
  code qui n'en dépend plus ; question d'accès AVANT tout SQL ; ADR à écrire (révise « QCM ou cases »).
- **Worktree / branche** : `../ubumaths-wt-figure-et-choix`, `feat/figure-et-choix`.

---

## 1. Origine et décisions de David (2026-10-26)

Né de l'essai de CP-058 (« Points alignés ? », chantier `geometrie-validation`, § 13 de son journal) : la figure
y est une case notée alors qu'on veut seulement que l'élève PUISSE vérifier, et le oui / non est une case texte
tapée parce qu'une question est QCM **ou** à cases (`src/lib/questions/types.ts`, `getQuestionType`).

1. **Deux usages d'une figure, au choix du modèle** : « Tu peux vérifier en traçant… » → figure de **travail**
   (tracés possibles, rien de noté, réponse à côté) ; « Montre comment tu vérifies que… » → figure **réponse**,
   notée (le `figure-a-completer` d'aujourd'hui). Outils limités par l'auteur (ex. droites seules).
2. **Figure déplaçable utilisable partout** : revient sur la spécification du 2026-10-13 qui réservait
   `deplacable:` (et `rendu:`) aux figures stockées (`geometry_figures`, ADR 0027 ;
   `src/lib/ubumark/__tests__/figure/figure-reglages-interactifs.test.ts`).
3. **QCM = une case « choix »** (idée de David), option **B** « le plus propre possible, même si c'est plus de
   travail » : TOUS les QCM réécrits en questions à cases, QCM en prod migrés, type `multiple_choice` retiré.
   Écarté : A (case « choix » à côté des QCM gardés).
4. **Tracé sur une figure de travail : GARDÉ, non noté** (reco suivie) : à l'entraînement, visible à côté de la
   correction (rien d'enregistré, comme aujourd'hui) ; en évaluation, enregistré avec la réponse (`test_answers`)
   et montré dans la copie corrigée et le PDF, sans vert ni rouge.

## 2. Phase 0 (à écrire)

À trancher : une réponse ou plusieurs cochables ; ordre des choix mélangé ou non ; notation d'une question mêlant
« choix » et autres cases ; copie corrigée et PDF ; ordre des lots (case « choix », migration des QCM, retrait de
`multiple_choice`, figure de travail, `deplacable:` partout) ; termes dans `CONTEXT.md` ; ADR.
Premier modèle visé : CP-058 (figure de travail + choix oui / non) — **à ne pas publier en l'état d'ici là**.
