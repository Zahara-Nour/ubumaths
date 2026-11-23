# Chantier `page-a-cocher-line` — la page à cocher dessine ` ```line `

## Reprendre ici

_Mis à jour le 2026-11-05, après #2404 — chantier clos et archivé._

- **État** : livré (#2404, mergé) ; ligne 16 de `docs/wip/outils-manquants.md` passée dans « Livré » · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : le « Reprendre ici » de `questions-cm2` dit encore « `line` non dessiné » (journal d'une autre session, à corriger à sa reprise) · **Worktree / branche** : supprimés

## Phase 0 (validée par David le 2026-11-05)

- Droite simple : même dessin que `NumberLine.svelte` (axe, flèches, graduations, nombres en KaTeX à
  la française, points, segments et demi-droites à crochets, « ? » des étiquettes cachées, échelle log).
- `placer:` : énoncé = droite sans les points ; construction juste = points posés sur la droite, nommés.
- `representer:` : énoncé = droite nue ; construction juste = l'intervalle attendu tracé.
- Bloc en erreur → la page s'arrête ; avertissements (couleur, écart téléphone d'une droite à placer)
  → alertes de fiche ; `representer:` sans intervalle lisible → alerte, pas de solution vide.

## Fait

- `scripts/lib/page-a-cocher.ts` : `droiteSvg`, `droite` (fonctions pures de `number-line-render`).
- Gabarit : styles `.nl` ; la construction juste passe désormais par `formules()` (ses nombres en
  KaTeX), libellé de la solution généralisé.
- Constat : `formatAutoLabel` de l'appli écrit 0,5 en `\frac{1}{2}` ; la page fait pareil.
- Doc : `docs/pratiques/couvrir-un-niveau.md` § 8.
- Revue (`code-reviewer`, Sonnet) : rien de bloquant ; correction en vert comme l'écran
  (`SOLUTION_COLOR`), tests de positions ajoutés (crochets, noms côte à côte, étages). Le parseur
  refuse déjà `points:` avec `placer:` et `segments:` avec `representer:`.
