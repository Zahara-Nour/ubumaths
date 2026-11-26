# Chantier `idees-tle-continuite-combinatoire` — journal

Idées reprises d'ailleurs, rubriques « Continuité des fonctions » (TSA4, 6 exercices) et
« Combinatoire et dénombrement » (TSG1, 9 exercices) de Terminale spécialité, selon le skill
`idees-rubrique`. Relevé : [idees-tle-continuite-combinatoire-releve.md](idees-tle-continuite-combinatoire-releve.md).
Page à cocher de la phase 0 : https://claude.ai/artifact/SmYJM9k1YCqeck3Qs98W4T

## Reprendre ici

_Mis à jour le 2026-11-26, chantier clos._

- **État** : clos. Rubriques TSA4 et TSG1 publiées : 4 neufs (a94acfec TSPE-425, bb7dc033
  TSPE-430, 3603141b TSPE-427, c3f70ab6 TSPE-319) et +5 variations sur 3 publiés (#3153, migrées),
  série de relecture b15c9d00 (#3161), modèles validés par David · **Prochaine action** : aucune ·
  **En attente de David** : rien · **Pièges en cours** : aucun (refus de (π − 1)/2 → ligne 62 de
  `outils-manquants.md`) · **Worktree / branche** : aucun.

## Historique

### 2026-11-25 — rubriques prises, relevé, phase 0

- Rubriques choisies par David (TSA4 + TSG1, en un lot) ; lignes « prises » poussées sur `main`
  (0a32051af).
- Relevé fait par la session (15 exercices lus dans le code) ; 14 modèles de continuité et 17 de
  dénombrement publiés en prod. ✅ 7, 🟡 5, ❌ 3. TSPE-427 n'a aucun modèle. Aucun modèle ne passe
  d'un dénombrement à une probabilité.
- Phase 0, si tout est oui : **4 modèles neufs** (15 variations : N1 fonction par morceaux,
  TSPE-425 ; N2 TVI sur une équation donnée, TSPE-430 ; N4 limite de f(uₙ), TSPE-427 ; N5
  probabilité par dénombrement, TSPE-319) et **5 variations** de 3 modèles publiés (2491dd75 +2,
  10393ff9 +2, 0965c56c +1).
- Idée en attente reprise : TSA5-41 (`idees-tle-ln`) → V1.
- Bornes : le BO exclut de faire justifier la continuité sur un intervalle (N1 ne garde que la
  continuité en a, par les limites) ; ln et exp sont au programme de maths complémentaires (V1 sur
  2491dd75, rangé aussi en TCOMP).
- Outils : rien ne manque. Question d'accès : personne (on range des modèles).
- Q1 : N4 couvre TSPE-427 sans être reprise d'un exercice ; recommandation : l'écrire dans ce lot.

### 2026-11-25 — phase 0 validée

- David : « je valide » (dans la conversation ; la page à cocher est restée vide) → N1, N2, N4, N5,
  V1, V2, V3 oui, R accepté, Q1 oui (N4 écrit dans ce lot). Fiches copiées dans
  [idees-tle-continuite-combinatoire-fiches.md](idees-tle-continuite-combinatoire-fiches.md).
- 2491dd75, 10393ff9 et 0965c56c réservés dans le tableau de répartition ; l'idée en attente
  TSA5-41 retirée de « Idées en attente » (reprise par V1).

### 2026-11-25 — lot écrit

- Scripts `docs/wip/questions/idees-tle-continuite-combinatoire-neufs.py` (→
  `scripts/questions/idees-tle-continuite-combinatoire-neufs/`) et `…-publies.py` (→
  `…-publies/`, 3 modèles exportés de prod le 2026-11-25, variations ajoutées à la fin, relançable).
- Neufs : N1 (3 var., niveau 2, « continuité en un point », TSPE-425), N2 (4 var., niveau 2,
  « valeurs intermédiaires », TSPE-430), N4 (4 var., niveau 2, « point fixe », TSPE-427), N5
  (4 var., niveau 3, « Problèmes de dénombrement », TSPE-319). Publiés : 2491dd75 +2, 10393ff9 +2,
  0965c56c +1.
- Écarts à la fiche, sans changer l'idée : N2 c tire k parmi 1/4, 1/2, 3/4, 1 (fractions et non
  décimaux : une réponse en fraction était refusée quand l'attendue était décimale) ; V1 b tire b
  parmi −2, 0, 1, 2 (b = −1 donnerait e⁰) et ajoute k = 0 (1 solution, la limite 0 n'est pas
  atteinte) ; V1 a et b font aussi tomber k pile sur le minimum.
- Limite du juge vue en N2 c : h(π/2) = π/2 − 1/2 est accepté, mais (π − 1)/2 est refusé en
  `bad_form` (forme différente de l'attendue). Pas contourné : signalé à David.
- Vérifié : `question:specs` vert sur les 7 fichiers ; `create-questions` en simulation vert ;
  `sonde-courbes` 0 problème ; 640 formules des aperçus passées à `validateLatex` + accolades
  (1 seul signalement, `\dots` dans une variation déjà en prod de 0965c56c) ; copies créées en
  base locale et vues dans l'aperçu (`pnpm voir`, iPhone) : N1 v0 (accolade, limites, choix),
  V2 b (courbe à deux sauts, points pleins et creux), V1 a et V1 b (tableaux avec ln et e) ;
  brouillons d'essai supprimés de la base locale.

### 2026-11-25 — brouillons en prod, #3153 mergée

- David a créé les 4 brouillons en prod (15 variations) ; ids commités.
- Niveaux relevés en prod : voisins de N1 (1 à 4), N2 (1 à 3), N5 (1 à 3) ; N4 (niveau 2) est le
  plus simple de « point fixe » (3 à 5) : il ne demande que f(ℓ).
- Migrations générées : rangement 20261125183322 (nœud + tag des 4) et contenu 20261125183331
  (2491dd75 +2, 10393ff9 +2, 0965c56c +1). Tests d'intégration verts (316). `security-auditor` :
  aucun finding bloquant (non bloquant : `updated_at` des 3 publiés avance, normal, leur contenu
  change). Question d'accès : personne (phase 0).
- `db:migrate` refusé à la session (écriture en prod) : à lancer par David.
- David a lancé `db:migrate` (2026-11-26). `garde-niveaux-tags.ts` : 2744 modèles tagués, aucun
  niveau manquant.

### 2026-11-26 — relecture, série, publication

- Série de relecture des 3 publiés complétés
  (`scripts/series/T_SPE-relecture-continuite-denombrement-publies.json`) enregistrée par David :
  b15c9d00.
- David valide les 7 modèles (aucun verdict « À revoir » en base). `publier-lot.ts` en
  simulation : 4 brouillons passent le contrôle.
- (π − 1)/2 refusé en N2 c : la forme de l'attendu (π/2 − 1/2) sert de modèle de forme
  (`checkForm`) ; ½(π − 1) et π/2 − 0,5 aussi refusés, vérifié au correcteur. Noté en ligne 62 de
  `outils-manquants.md` (72bfb100c) ; David publie le modèle tel quel.
- David a publié les 4 brouillons (`publier-lot.ts --publier`) ; vérifié en base : 4 `published`.
- Tableau de répartition : TSA4 et TSG1 « publiée (2026-11-26) », réservations de 2491dd75,
  10393ff9, 0965c56c levées. Journal, relevé et fiches archivés ici. Chantier clos.
