---
title: Écarts — lot constructions
date: 2026-11-28
status: en cours
---

# Écarts — lot `constructions`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR._

- **État** : les 6 écarts corrigés sur la branche (4 commits + merge de main) ; revues `code-reviewer` et `security-auditor` (Opus) lancées, PR pas encore ouverte. Après un `/clear`, leurs résultats sont perdus : les relancer sur `git diff origin/main...HEAD`.
- **Prochaine action** : corriger les findings, pousser, ouvrir la PR, `pnpm pr:merger`. Après merge : `pnpm constructions:reecrire --lot v76 --cible prod` (simulation, par moi), puis **David** lance `--publier` ; commiter la sauvegarde `avant-v76.json`.
- **En attente de David** : l'écriture en prod de V76 (`--publier`).
- **Pièges en cours** : `masque` coûte un pas de 500 ms (44 arcs : effacement arc par arc) ; les points `_p…` du carré gardent leur étiquette (défaut à part, déjà en prod, non traité).
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

Question posée le 2026-11-28 : (A) préparer le script corrigé du carré, chaque arc nommé et effacé où l'auteur l'effaçait, écriture en prod par David ; (B) retirer seulement les `@cacher` inutiles. Réponse de David : « je te suis », soit A, l'option recommandée.

### M38 — l'ancien format JSON

La page `/constructions/conversion` (bouton sur `/constructions`) convertissait un fichier XML **à la fois** en JSON et en DSL, et enregistrait le JSON (injouable) quand le DSL échouait. Question posée le 2026-11-28 : (A) DSL seul, erreur affichée en cas d'échec, ancien module retiré ; (B) garder. Réponse de David : « je te suis », soit A, l'option recommandée.

## Fait après la phase 0

- **M38** : ancien module `src/lib/constructions/` retiré, ainsi que `api/constructions/convert` (sans appelant) et `scripts/convert-instrumenpoche.ts` ; `JsonEditor` → `src/lib/components/`, instruments du tableau blanc → `src/lib/whiteboard/components/instruments/`. `POST /api/constructions` : `format: 'dsl'` seul, `dsl_script` requis ; `PUT` n'accepte plus `script`. Page de conversion : DSL seul, aperçu par le lecteur v2. Tests d'API ajoutés (`ecriture-reservee.test.ts`).
- **V76** : lot `v76` de `pnpm constructions:reecrire --lot` (`scripts/constructions-prod/arcs-carre.ts`). Les 44 arcs reçoivent le nom de l'arc du JSON d'origine (correspondance vérifiée arc par arc : rayon, angles), `@cacher("arc_n")` → `masque(_arcn)`. Découvert à l'écran : la migration vers le DSL avait changé le signe des angles sans échanger début et fin, 13 arcs de 20° tracés sur 340° (presque des cercles) ; ordre rétabli. Garde ajoutée : `dslAvant` (script de prod identique à la sauvegarde dont le nouveau est tiré). Vu en local dans Chrome : petits arcs pendant la construction, aucun à la fin.
