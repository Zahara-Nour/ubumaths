# Tableau à cases lisible sur téléphone (outil n° 57) — journal

## Reprendre ici

_Mis à jour le 2026-11-28, après #3274 (mergée). Chantier clos, journal archivé._

- **État** : livré (#3274) ; n° 57 passé dans « Livré » de `docs/wip/outils-manquants.md` ; le durable est dans `docs/systeme/questions.md` (case de tableau au téléphone) · **Prochaine action** : aucune · **En attente de David** : la mise en prod du correctif (`pnpm deploy:prod`) ; 3-013 « Développer avec un tableau » (62528060) publié par David le 2026-11-28 (vérifié en prod) · **Pièges en cours** : aucun · **Worktree / branche** : retirés.

## Phase 0 (validée par David le 2026-11-28)

- Au téléphone (écran tactile), une case dans un tableau n'a plus de bouton clavier : la toucher ouvre le clavier, « Fermer le clavier » le referme (même règle que le tableau de variations à compléter, `VariationTable.svelte`).
- Écran étroit (≤ 30 rem) : cellules et cases resserrées. Le tableau 2 × 2 de 3-013 (3 colonnes) tient sans défiler.
- Ordinateur et tableaux sans case : rien ne change.
- Tableaux de 6-7 colonnes encore trop larges : ils défilent de côté, sans ombre ni signe (décision de David sur ma recommandation : aucun modèle publié concerné ; à rouvrir sur un cas réel).

## Constat (mesuré)

Aperçu admin de 3-013, iPhone 15 (WebKit) : tableau de 354 px dans un cadre de 311 px. Une case = 160 px : bouton clavier 60 px, marges de cellule 32 px (`px-4`), rembourrage du champ 16 px, zone d'écriture 34 px.

Prod (lecture seule, 2026-11-28) : 15 modèles publiés (CP → Tle techno) et 3 brouillons ont un tableau d'au moins 3 colonnes avec des cases `$?$`.

## Correctif

`FillBlanksInput.svelte` : classe `table-with-blanks` sur le cadre du tableau à cases ; `@media (max-width: 30rem)` : cellules `padding-inline: 0.25em`, champ `padding: 2px; margin: 0` ; `@media (pointer: coarse)` : `::part(virtual-keyboard-toggle)` masqué.

## Mesures après correctif (base locale, aperçu admin, 1 à 4 tirages par modèle)

- iPhone 15 : les 15 modèles publiés tiennent (cadre 311 px), 6 colonnes de 6e comprises. Défilent encore : les deux brouillons de Tle expert (matrice d'adjacence 337 px, tables de restes 338-398 px).
- iPhone SE (375 px, cadre 293 px) : tout tient, sauf un tirage de « Tableau de valeurs à partir d'une formule » (5e) à 295 px (2 px de défilement).
- Toucher une case ouvre le clavier (iPhone, Android émulés) ; à l'ordinateur, le bouton clavier reste.

Test : `e2e/verifs/tableau-cases-telephone.spec.ts` (rouge avant correctif sur iPhone et Android : 363 px pour 330).
