# Chantier : outils statistiques (blocs ubumark + atelier)

Worktree `../ubumaths-wt-stats`, branche `feat/outils-statistiques`. Démarré le 2026-10-01.

## État : phase 0 — questions, tour 1 posé (aucun code écrit)

## Existant vérifié dans le code (2026-10-01)

- `src/lib/atelier/stats.ts` : `describeList` (variance de POPULATION, ÷ n) et `fitAffine`.
- ⚠️ **Deux implémentations** du même calcul : `.stats` du moteur
  (`web-repl-engine.ts` ~l.1605) recalcule moyenne / médiane / variance à la main.
  L'exigence « une seule source » impose de le brancher sur le futur module.
- ⚠️ **Doc périmée, pas le code** : le moteur divise bien par `n` (l.1615-1630),
  mais le 2ᵉ paragraphe de la JSDoc de `describeList` et
  `docs/wip/atelier-vue-donnees-progress.md` (§ « Le diviseur », l.16-30)
  affirment encore qu'il rend l'estimateur `n − 1` (« 9 contre 6 »). À corriger.
- Patron `courbe` présent : `types/courbe.ts`, `parser/courbe-parser.ts`,
  `utils/courbe-scene.ts`, `generators/courbe-typst.ts`, `nodes/Courbe.svelte`,
  aiguillage `markdown-parser.ts` l.1494-1519 (`variation`, `probtree`, `courbe`).
- Pas de `src/lib/statistics/`.
- Programmes : 2de §6.1 (`2-156`…`2-169`), §6.2 tableau croisé (`2-170`…`2-175`),
  `2-176` loi des grands nombres ; 1re spé `1SPE-157`…`1SPE-173` (loi, espérance,
  variance, écart type, échantillons) ; 6e rang 3 : barres + circulaire.
- ⚠️ **Boîte à moustaches** : aucune occurrence dans `docs/wip/referentiel/`.
  **Loi binomiale** : absente du programme de 1re spé du dépôt (Terminale).
- ⚠️ **Conflit de vocabulaire** : « Série » est déjà un terme du glossaire
  (composition de questions, `series`). « Série à effectifs » / « série
  statistique » demande un arbitrage avant de nommer quoi que ce soit.

## Décisions de David

(aucune pour l'instant)

## Questions ouvertes

Tour 1 : voir la conversation du 2026-10-01 (Q1 à Q7) — à reporter ici une fois tranchées.
