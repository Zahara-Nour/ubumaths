# Chantier « questions » — compléter les modèles pour couvrir les programmes (CP d'abord)

## Reprendre ici

_Mis à jour le 2026-10-24, phase 0 du lot A1._

- **État** : groupe A découpé en 6 lots (§ 4 ter) ; lot A1 (calcul mental, 6 points) en phase 0 — détail proposé à David (§ 6).
- **Prochaine action** : validation d'A1 par David, puis écriture des 6 modèles + specs, `checkTemplate`, migration, page à cocher.
- **En attente de David** : vérification manuelle #1702 ; validation du détail d'A1.
- **Pièges en cours** : un modèle CP peut prendre un point CE1 (pas l'inverse) ; inclusion stricte des bornes (`docs/systeme/programmes/bornes/cycle2.json`) ; le × est hors CP (borne CP-017) ; dater après la dernière migration de la prod (`list_migrations`) ; `db:migrate` depuis le dépôt principal ; heredoc `python3 - <<EOF` bloque dans ce shell → script dans le scratchpad.
- **Worktree / branche** : `../ubumaths-wt-questions` · `feat/questions-cp-a1`.
- **But final** : en tirer un skill réutilisable pour les autres niveaux (§ 5).

## 1. Modèles CP existants (prod, 2026-10-24)

40 modèles `grades ∋ CP`, tous publiés, tous avec specs, 19 sans corrigé. 28 tagués sur 12 points (sur 84).

Vérifiés dans les bornes : CP-018 (13 : Tables/1-9, Somme/1-4), CP-073 (A trou/1-3), CP-019 (Double/1-2),
CP-080 (Double/3), CP-022 (Somme/7), CP-024 (Somme/6), CP-025 (Somme astucieuse/1), CP-026 (Somme/5),
CP-083 (Différence/3), CP-006 (Comparer/1), CP-005 (Ecriture/1).

À reprendre :

- `52c4d773` Décomposition/1 (CP-005) : corrigé avec « × 10 », centaines, × 100 (× hors CP) ; « 74 = 70 + 4 » relève plutôt de CP-004.
- `0e5372a4` Complément/1 (CP-023) : seulement le complément à 10 ; le point vise « 74 → 6 ».

Non tagués CP (12) :

- Multiplier/Double et moitié/1-3 (`25285413`, `a3ef26ab`, `89bef942`) : doublons des Additionner avec « 2 × » → CE1 (CE1-028/CE1-101, retirer la valeur 0) ou suppression.
- Soustraire/Différence/2 (`fc29d0c2`, 47 − 3) : pas CP ; **CE1-033** possible sans changement.
- Soustraire/Différence/1, A trou/1-3 ; Additionner/A trou/4-6 ; Somme astucieuse/2 : aucun point CP.

## 2. Les 72 points CP sans modèle

- **A. Texte / formule seuls (32)** : 003, 004, 007, 075, 076 ; ordinaux 009-013 ; 014, 077, 015, 078, 079, 017 ;
  020, 021, 027, 028, 081, 082 ; problèmes 029-031 ; 036, 038, 037 ; lexique 032, 039, 041 ; 048.
- **B. Outil existant** : droite graduée `line` → 008 ; `figure` → 054-056, 057-058, 061-062, 034-035, 067 ;
  `tableau-croise` / `effectifs` → 069, 068 ; images fixes → 049-052, 040.
- **C. Outil neuf** : collections → 001, 004 (en partie), 070 ; monnaie → 042-045, 071 ; horloge → 046, 047 ; opérations posées → 016.
- **D. Non évaluables sans interaction** : 002, 053, 059, 060, 063-066, 074 — **à revoir avec la validation de figure élève (géométrie)**.
- À trancher : 072, 084 (« présenter », « construire » : « compléter » compte-t-il ?).

## 2 bis. Validation d'une figure faite par l'élève (relevé du 2026-10-24)

C'était prévu : phase 3 « mode exercice, l'élève construit lui-même + validation »
(`docs/archive/systeme-2026-06/geometrie/decisions.md` § 1 et § 11, inspiré du `check/` d'apigeom). Ce qui existe :

- **Les prédicats** : `src/lib/geometry-core/validation/checks.ts` (321 lignes, testés) — `checkPointAt`, `checkCollinear`,
  `checkDistance`, `checkSameDistance`, `checkParallel`, `checkPerpendicular`, `checkAngle`, `checkPointOnCircle`, chacun
  `{ valid, message }` en français, en exact quand c'est possible. **Aucun appelant** (`docs/systeme/geometrie/README.md` § 9-10 :
  « `validation/` branché sur des exercices » = jamais fait).
- **La construction à la souris** : livrée dans l'atelier (lot 3, #1533→#1540) — barre d'outils (point, segment, droite,
  demi-droite, cercle, milieu, intersection, point sur un objet, parallèle, perpendiculaire), glisser des points,
  `snapToGrid` (`geometry-core/interaction/`). Vit dans `FigureView.svelte` de l'atelier, pas dans une question.
- **Figures interactives** : `deplacable:` / `rendu:` réservés aux figures stockées, refusés dans un bloc d'exercice.

Ce qui manque pour une question : une **case « figure »** (`answerKind` neuf) — figure de départ (quadrillage, points donnés),
barre d'outils restreinte par le modèle, réponse = la figure de l'élève, jugée par des vérifications déclarées dans le modèle
(liste de `check*`). Prédicats à ajouter pour le primaire : « il existe un segment / une droite passant par A et B »,
« ce polygone est un carré / rectangle / triangle », « sommets sur des nœuds du quadrillage ».

Points CP que cela rendrait évaluables : 059 (tracer une droite par deux points), 060 (compléter un carré / rectangle sur
quadrillage), 058 (vérifier un alignement à la règle), 034 (reporter une longueur), et hors géométrie 008 (placer un point sur
la droite graduée, `checkPointAt`). Restent hors appli : 053, 063-066 (manipulation, espace de la classe), 074 (oral) ;
002 (construire une collection) relève du bloc `collection` s'il devient interactif.

## 3. Outils proposés

1. Bloc `horloge` (cadran paramétrable ; CP heures entières, puis minutes CE1/CE2) — recommandé en premier.
2. Bloc `collection` (vrac, barres de dix + cubes, groupements partiels).
3. Bloc `monnaie` (pièces et billets d'euros).
4. Plus tard : réponses à placer (point sur la droite, étiquettes à ranger, aiguilles).
5. **Case « figure »** (§ 2 bis) : branche les prédicats existants et la barre d'outils de l'atelier dans une question.
6. **Opérations posées** (demandé par David le 2026-10-24) : bloc « en colonnes » (addition au CP, CP-016 ; puis soustraction, multiplication, division aux niveaux suivants) — aucun rendu « posé » n'existe dans `ubumark`. Place dans l'ordre : à trancher.

## 4. Questions à David

1. Quels outils lancer (horloge, collections, monnaie), dans quel ordre ?
2. Doublons Multiplier/Double 1-3 : CE1 ou suppression ?
3. Groupe D laissé sans modèle ? (en attente de l'étude géométrie)
4. CP-072 / 084 : « compléter » vaut-il « présenter / construire » ?
5. Corriger tout de suite `52c4d773` (retirer ×, CP-004 ?) et enrichir `0e5372a4` ?
6. Case « figure » (§ 2 bis) : chantier à ouvrir (avant ou après horloge / collections / monnaie) ?

## 4 bis. Décisions (David, 2026-10-24)

1. Ordre d'ensemble : corrections (5) → groupe A (texte seul) → horloge → case « figure » (chantier à part, worktree et phase 0 propres) → collection → monnaie (bâtie sur collection).
2. Multiplier/Double et moitié 1-3 → CE1-028 / CE1-101, valeur 0 retirée, plages vérifiées ; pas de suppression.
3. Groupe D : 059, 060, 058, 034 (+ 008) attendent la case « figure » ; 053, 063-066, 074 **hors appli**, ne comptent plus comme non couverts.
4. CP-084 : « compléter un tableau préparé » suffit (`tableau-croise` à trous). CP-072 : attend les « réponses à placer » (hauteur des barres).
5. `52c4d773` : retirer ×, × 100, centaines du corrigé ; tag CP-005 → CP-004. `0e5372a4` : garder le complément à 10, ajouter le complément à la dizaine supérieure (≤ 99, unités ≠ 0).
6. Case « figure » : après l'horloge, avant collection et monnaie.

## 4 ter. Groupe A : lots et décisions (David, 2026-10-24)

- **Lots, une PR chacun, dans cet ordre** : A1 calcul mental (020, 081, 021, 082, 028, 027) → A2 suite et ordre (003, 004, 007, 075, 076) → A4 sens des opérations (014, 077, 015, 078, 079, 017) → A5 problèmes (029-031) → A3 ordinaux (009-013) → A6 grandeurs et lexique (036, 038, 037, 032, 039, 041, 048).
- **CP-016** (addition posée) sort du groupe A → outil « opérations posées » (§ 3, 6), placé **juste après l'horloge, avant la case « figure »**.
- **CP-076** (intercaler) : case à remplir en `rulesSuffice` + `range` (bornes exclues) + `isInteger` — pas de QCM.
- **CP-075** (encadrer) : deux variations — « juste avant / juste après » (46 < 47 < 48) et encadrement libre jugé par règles.
- **Réponses en mots** (ordinaux, lettres, lexique) : QCM ; un rang reste une case nombre.
- **Rangement** : nœuds existants (tous présents en prod, y compris « ordinaux et rangs », « problèmes arithmétiques > parties-tout / en deux étapes / multiplicatifs ») ; aucun nœud à créer.

## 5. Méthode (pour le futur skill)

1. Relevé SQL : modèles du niveau + tags ; points du niveau avec nombre de modèles.
2. Vérifier chaque variation contre les bornes du point (plages des variables, corrigé compris).
3. Classer chaque point non couvert : A texte, B outil existant, C outil neuf, D non évaluable.
4. Revoir les modèles non tagués : point du niveau, ou d'un niveau suivant (permis), ou rien.
5. Questions à David, puis écriture par lots, puis tags par migration (page à cocher).
6. Corriger un modèle en prod : relevé MCP (contenu complet, md5, nœuds, points, tags, 0 donnée d'élève), instantané dans `docs/wip/<chantier>/etat-prod-<date>/` (vérifier que ses md5 = prod), générateur `scissions_outils.generer` pour le contenu, `checkTemplate` sur les modèles écrits, test `decrireLotModifier` ; retrait de tag ou niveaux seuls → migration à la main sur le modèle de `tags_lycee`.

## Journal

- 2026-10-24 : inventaire CP (lecture prod MCP read-only).
- 2026-10-24 : relevé « validation de figure élève » dans la géométrie (§ 2 bis).
- 2026-10-24 : décisions du § 4 (§ 4 bis).
- 2026-10-24 : corrections CP — M1 (contenu, 4 modèles) + M2 (rangement, niveaux, tags), branche `fix/questions`.
- 2026-10-24 : #1702 mergée, `db:migrate` (M1 + M2), vérifié en prod ; horloge lancée en parallèle (session « horloge »).
