---
title: Écarts — lot constructions
date: 2026-11-28
status: en cours
---

# Écarts — lot `constructions`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : L56, M35, M36, M37 corrigés sur la branche (commit local, pas encore poussé). V76 et M38 vérifiés en prod, en attente de la réponse de David (phase 0 ci-dessous).
- **Prochaine action** : selon les réponses, corriger V76 (script pour David) et M38, puis revue `code-reviewer` (+ `security-auditor` si M38 touche l'API), une seule PR.
- **En attente de David** : questions V76 et M38 (§ Phase 0).
- **Pièges en cours** : dans une comparaison d'état de figure, les champs `compute` sont des fonctions neuves à chaque relecture (comparer en JSON).
- **Worktree / branche** : `../ubumaths-wt-ecarts-constructions` · `fix/ecarts-constructions`.

## Écarts du lot

V76, L56, M35, M36, M37, M38 (6).

## Fait

- **M37** : `applyTraceStyle` (`choreographies/visibility.ts`) passe par `figure.updateStyle`, plus par la `Map` privée de la figure. Aucune transaction dans les constructions : l'enregistrement d'annulation de `updateStyle` ne fait rien.
- **M35** : `PIXELS_PER_UNIT = 40` dans `constants.ts`, lu par l'exécuteur (deux calculs de durées), la toile et `PROTRACTOR_RADIUS`. Laissés : l'échelle du convertisseur XML (autre repère) et les cotes du dessin du rapporteur.
- **M36** : nouveau genre de sous-étape `instrument-move` (équerre, règle, rapporteur ou crayon qui se place, sans tracé) ; `compass-measure` ne sert plus qu'au compas. 15 sous-étapes changées dans les chorégraphies, 6 tests mis à jour.
- **L56** : `executor.seekTo(i)` remplace, dans le lecteur, `reset()` + `step()` × (i + 1). En avant : seulement les pas qui manquent ; en arrière : `reset()` puis relecture, et `reset()` ne refait plus la pré-simulation (frise, phases et durées ne dépendent que du script). Un pas qui lève une erreur : le déplacement suivant repart du début. Test `core/__tests__/seek.test.ts` (même état qu'une relecture depuis le début, pas à pas et par sauts).

## Vérifié en prod (lecture seule, 2026-11-28)

- 9 constructions, toutes au format `dsl` (8 publiques, 1 privée) : plus aucune au format JSON (M38).
- V76 : les 3 constructions ont bien leurs `@cacher("X_n")` (« Axes de symétrie et construction d'un carré » 44, « Ajouter 19 » 6, « Soustraire 99 » 6). D'après l'ancienne colonne `script` (JSON d'origine) :
  - carré : les 44 cibles sont des **arcs de compas** (`arc_9`…`arc_73`), traits de construction que l'auteur effaçait ; le DSL converti ne nomme pas ses arcs, donc rien n'est caché et les arcs restent ;
  - « Ajouter 19 », « Soustraire 99 » : les cibles sont des **textes**, devenus des `@instruction` au passage au DSL ; une consigne remplace la précédente, donc rien de visible ne manque. Les `@cacher` y sont seulement inutiles.

## Phase 0

### V76 — les arcs de compas du carré restent affichés

Question posée à David le 2026-11-28 : voir le message de la session.

### M38 — l'ancien format JSON

La page `/constructions/conversion` (bouton sur `/constructions`) est vivante : elle convertit un fichier XML **à la fois** en JSON (ancien format, ancien lecteur, ancien éditeur) et en DSL. Retirer le JSON enlève quelque chose de la page du prof. Question posée à David le 2026-11-28.
