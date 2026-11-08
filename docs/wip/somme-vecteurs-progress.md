# Chantier `somme-vecteurs` — somme de deux vecteurs à tracer

## Reprendre ici

_Mis à jour le 2026-11-08, PR 2 ouverte (#2472)._

- **État** : outil #2467 mergé, **pas encore en prod** ; PR 2 #2472 (réécriture de `51192dc4`, lot `somme-vecteurs-2de` de `update-published-questions.ts`) ouverte · **Prochaine action** : après le `deploy:prod` qui livre #2467 (David) : `pnpm tsx scripts/update-published-questions.ts --lot somme-vecteurs-2de` (simulation), puis `--publier`, relire en prod ; ensuite versement du chantier (journal archivé, ligne 3 de `outils-manquants.md` déjà rayée) · **En attente de David** : `deploy:prod` ; dire si le nom de A qui chevauche la flèche v⃗ gêne (§ 3) · **Pièges en cours** : ne JAMAIS `--publier` avant le déploiement (le bloc serait refusé en prod) ; le modèle est PUBLIÉ : `create-questions` ne le touche pas, c'est `update-published-questions` · **Worktree / branche** : `../ubumaths-wt-somme-vecteurs`, `content/somme-vecteurs-2297`

## 0. Origine

Ligne 3 du § 1 de [`outils-manquants.md`](outils-manquants.md) (point 2-297 « Représenter la somme de deux
vecteurs à partir de représentants de même origine »). Ordre du 2026-11-06 : après le n° 14 (livré, #2456).

## 1. Constat (2026-11-08)

- **2-297 est déjà couvert en prod** : modèle `51192dc4` « Représenter la somme de deux vecteurs » (lot 12 b-1
  de `questions-2de`, § 78, publié le 2026-11-04), fichier `scripts/questions/2de-vecteurs-c1/05-representer-la-somme.json`.
  Il se sert du geste existant : ` ```courbe ` avec `points: A, B, C` et `tracer: vecteur (a+c ; b+d) depuis A`.
- Ce qui manque à ce modèle (et donc à l'outil) :
  1. **u⃗ et v⃗ ne sont pas dessinés** : ` ```courbe ` n'a pas de flèche d'affichage ; l'élève voit trois points
     et lit « u⃗ = AB⃗, v⃗ = AC⃗ » dans la phrase.
  2. **La tâche est écrite en coordonnées** : la phrase d'erreur dit « Ta flèche représente le vecteur
     (0 ; −3), pas (4 ; 4). » — elle ne reconnaît ni u⃗ − v⃗, ni u⃗ seul, ni la diagonale BC.
  3. La correction ne montre que la flèche verte ; le parallélogramme vit dans une étape ` ```figure ` à part.
- Le bloc ` ```solide ` a déjà le modèle à suivre : `vecteurs: AB, u = AI` (flèches données) et
  `tracer: vecteur 2 u - v depuis A` (combinaison, `SolideTask`, phrases `solideVectorMistake`).
- Voisin : 3-026 (3e, `787cc937`, somme de deux vecteurs en case choix) — session `questions-3`.

## 2. Phase 0 proposée (2026-11-08, à valider)

Outil : dans ` ```courbe `, la même écriture que ` ```solide `.

- `vecteurs: u = AB, v = AC` : flèches données, dessinées (nom u⃗ près du milieu), écran et PDF ; points pris
  dans `points:`.
- `tracer: vecteur u + v depuis A` : combinaison de vecteurs nommés (ou de couples de points, `AB + AC`) ;
  l'attendu est calculé (plus de coordonnées écrites à la main) ; `depuis A` facultatif comme aujourd'hui.
- Juge inchangé (extrémité − origine = la combinaison) ; case `x1;y1/x2;y2` inchangée.
- Phrases reconnues (en plus des actuelles) : « Ta flèche représente u⃗, pas u⃗ + v⃗. », idem v⃗, u⃗ − v⃗,
  v⃗ − u⃗, −(u⃗ + v⃗) (sens) ; sinon « Ta flèche représente le vecteur (0 ; −3), pas u⃗ + v⃗. »
- Correction : flèche verte + construction en pointillés (parallélogramme si même origine).
- Refusé au prof : nom absent de `vecteurs:`, point absent de `points:`, combinaison nulle, extrémité hors
  fenêtre, `tracer: vecteur (3 ; -2)` inchangé (toujours accepté).
- Ensuite : `51192dc4` réécrit avec l'outil (PR de contenu à part).

Questions à David :

- **SV1 — Représentants** : seulement de même origine (2-297), ou aussi bout à bout / ailleurs sur la grille
  (Chasles, 3-026 enchaînements) ? → Je recommande **n'importe où** : le juge ne regarde que les
  coordonnées ; seule la correction change (parallélogramme si même origine, sinon v⃗ mis au bout de u⃗).
- **SV2 — Coefficients** : somme et différence seules, ou entiers (`2u - v`) ? → Je recommande **entiers de −3
  à 3** (pas de fractions : la grille), comme `solide` sans les fractions.
- **SV3 — Phrases d'erreur** : la liste ci-dessus (u⃗ seul, v⃗ seul, u⃗ − v⃗, v⃗ − u⃗, sens) ? → Je recommande
  **oui**, pour une combinaison de deux vecteurs seulement ; au-delà, la phrase générale.
- **SV4 — Correction** : pointillés de construction sur le repère de l'élève, ou laisser l'étape ` ```figure `
  du modèle ? → Je recommande **sur le repère** (l'étape ` ```figure ` disparaît du modèle réécrit).
- **SV5 — Contenu** : réécrire `51192dc4` dans ce chantier (PR de contenu à part, page à cocher) ;
  3-026 reste à la session `questions-3` ? → Je recommande **oui aux deux**.

Question d'accès : personne (aucune migration, outil d'affichage et de geste).

**Décisions de David (2026-11-08)** : phase 0 validée avec mes cinq recommandations (« je valide ») — SV1
représentants n'importe où (parallélogramme si même origine, sinon v⃗ au bout de u⃗) ; SV2 coefficients entiers
de −3 à 3, pas de fractions ; SV3 phrases nommées pour deux vecteurs ; SV4 pointillés sur le repère de l'élève ;
SV5 `51192dc4` réécrit ici (PR de contenu à part), 3-026 laissé à `questions-3`.

## 3. PR 1 — l'outil (2026-11-08)

- Tests d'abord : `courbe-somme.test.ts` (35, rouges sans le module), `CourbeSomme.svelte.test.ts` (4).
- Moteur : `utils/courbe-combinaison.ts` (`readGivenVectors`, `readCombination`, `combinationCoords`,
  `combinationLatex`, `combinationMistake`, `constructionTraces`) ; parseur : clé `vecteurs:`, `tracer: vecteur`
  à combinaison (lue après `points:`), types `CourbeGivenVector`, `CourbeVectorTerm` ; juge et case inchangés.
- Écran : flèches données (`scene.vectors`, `Courbe.svelte`), phrase en inline markdown (`CourbePlacer`),
  pointillés (`dashed`) dans la correction et `BuildAnswer`. PDF : flèches de l'énoncé, pointillés du corrigé ;
  compilé avec `scripts/fiches/compile-prod.mjs` (typst.ts de la prod) : OK, vu à l'œil.
- Vu à l'œil (capture des tests navigateur) : juste. **Défaut connu** : le nom d'un point (posé en haut à
  droite) peut chevaucher une flèche qui en part (A et v⃗ dans l'exemple) ; règle de placement des noms
  existante, non touchée — à voir avec David si gênant.
- Doc : `ubumark.md`, `questions.md`, `grapheur.md`, catalogue `block-catalog/courbe.ts` (clé `vecteurs`,
  exemple « somme »).

## 4. Revue et merge de #2467 (2026-11-08)

- `code-reviewer` (Opus) : aucun attendu faux, aucune phrase qui accuse à tort. Corrigé (`e764b5d8b`) :
  la garde `findUnmaskedAnswers` prenait une combinaison pour une fuite (question écartée des évaluations
  notées) → `isCombinationVectorValue` ; pointillés : côtés d'un couple de points absent de `vecteurs:`
  désormais tracés. Laissé : `Vecteur u + v` (majuscule) accepté alors que `Vecteur (3 ; -2)` est refusé.
- Conflit d'en-tête « Vérifié » (`ubumark.md`, `questions.md`) résolu ; `verifications-manuelles.md`
  reformaté par la fusion, remis à l'identique de main.
- CI verte sur `e764b5d8b`, **#2467 mergée** le 2026-11-08. Vérification manuelle notée
  (`verifications-manuelles.md`, prod après `deploy:prod`).

## 5. PR 2 — réécriture de 51192dc4 (2026-11-08)

- Le modèle est **publié** en prod : `create-questions --mettre-a-jour` ne le touche pas → lot
  `somme-vecteurs-2de` de `update-published-questions.ts`, dossier `scripts/questions/2de-somme-vecteurs-existants/`
  (instantané de prod commité d'abord, identique au fichier du lot 12 b-1 au statut près).
- Énoncé : `vecteurs: u = AB, v = AC`, `tracer: vecteur u + v depuis A` ; correction : l'étape ` ```figure `
  retirée (pointillés sur le repère, SV4), la première étape le dit. Variables, conditions, specs inchangées.
- Simulation sur la prod : 6/6 specs vertes, 100 tirages. Pas de page à cocher (un seul modèle) : ligne de
  `verifications-manuelles.md` à la place. #2472 ouverte.
