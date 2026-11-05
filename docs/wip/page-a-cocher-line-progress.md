# Chantier `page-a-cocher-line` — la page à cocher dessine ` ```line `

## Reprendre ici

_Mis à jour le 2026-11-05, PR ouverte._

- **État** : dessin écrit, tests verts (72), essayé sur `cm2-7b`, `cm1-3a`, `3-representer` · **Prochaine action** : revue, CI, merge, puis ligne 16 de `outils-manquants.md` passée dans « Livré » · **En attente de David** : rien · **Pièges en cours** : la ligne « Page à cocher : `line` non dessiné » du « Reprendre ici » de `questions-cm2` devient fausse au merge (journal d'une autre session : la lui laisser corriger) · **Worktree / branche** : `ubumaths-wt-page-a-cocher-line` / `feat/page-a-cocher-line`

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
