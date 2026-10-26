# Chantier « questions-6 » — couvrir la 6e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle3.json` → `6.points`.

## Reprendre ici

_Mis à jour le 2026-10-27, PR 2 en cours._

- **État** : PR 2 (rangement) écrite et relue : migration `20261027100100_questions_6_rangement_tags` générée par `questions-6/lot-rangement-6.py` (relevé du 2026-10-27), test `questions-6-rangement-tags.test.ts` vert (21), rouge sans la migration ; revues sans bloquant (§ 8).
- **Prochaine action** : CI de la PR, merge, puis `db:migrate` depuis la branche mergée et contrôle au MCP (38 modèles : nœuds, niveaux, statut, 34 tags).
- **En attente de David** : rien.
- **Pièges en cours** : un tag exige le modèle sur le nœud du point ou sa notion ; 24a8e2b1 / c1a54695 sont rangés sur une NOTION (« Échelle d'une carte ») ; `releve-prod.ts` lit `.env` (prod).
- **Worktree / branche** : `../ubumaths-wt-questions-6` · `feat/questions-6-rangement`.

## 1. Relevé (prod, 2026-10-26)

- 111 points de 6e ; 26 ont au moins un modèle, 85 aucun.
- 110 modèles `'6' = any(grades)`, tous publiés, tous rangés sur un nœud ; 65 tagués, 45 sans point.
- Points tagués : 105 (2), 106 (4), 115 (5), 118 (7), 125 (2), 126, 127, 132, 135, 141 (6), 144, 199, 149, 150,
  151, 200 (2), 152, 201, 157 (2), 206 (6), 159 (12), 187, 188, 190 (2), 191 (3), 193 (2).

## 2. L'existant contre les bornes

> ⚠️ **La passe du chantier « arbre des notions » (2026-10-18 → 20) fait foi** et passe avant les
> verdicts ci-dessous : `docs/archive/wip/arbre-notions/analyse/sixieme.csv` (110 modèles : 60 TAG,
> 8 MODIFIER, 42 HORS_PROGRAMME) et `sixieme-notes.md`. Elle ne jugeait que le tag ; les HORS_PROGRAMME
> portent « changement de niveau à part », étape jamais faite (3 modèles seulement passés de 5e en 4e).
> Décisions de David qu'elle applique et que la relecture du 2026-10-26 contredisait :
>
> - **opérations à trou hors tables : pas de tag** (Q1, 2026-10-17) → les 6 multiplications à trou
>   du § 2.3 restent sans point ;
> - **augmentation / diminution = 3-068 (3e), pas de tag en 6e** (2026-10-20) ;
> - **échelle écrite 1/n refusée en 6e**, candidat 5-088 (2026-10-20) ;
> - aires en mm² à km² : TAG (la borne d'unités de 6-150 ne vaut que pour les conversions) ;
>   « Fréquence » : TAG 6-188 (couverture partielle acceptée) ; côté du carré par l'aire : TAG 6-151.
>
> Ce qui reste nouveau : le doublon 3a7a5711 / 059e3fc9 (déjà relevé alors, non traité), la variation
> en double de 82748db8, la coquille de ae7a332e, le niveau des 42 HORS_PROGRAMME.

Vérifié par tirages réels (`question:specs --apercu`, specs toutes vertes ; le « NON importable » du
script en mode `--template` vient des colonnes `created_at` / `updated_at` / `created_by`, pas des modèles).

### 2.1 Tagués : OK

Durées (206, 157, 159 : 22 modèles), pourcentages (105, 106, 141), fractions (125, 126, 127, 132, 135),
produits (115, 118), périmètres (144, 199, 149), proportionnalité (190, 191), échelles (193), probabilité (187).

Remarques mineures : 000368e1 / c1a83c8f / 81a64b0a (forme fractionnaire, niv. 1, 2, 12) = même tirage, seul
l'énoncé change ; 447b5613 / 4b080eed (4e proportionnelle) passent par « × c » (valeur pour une unité, sans
nommer le coefficient) — dans les bornes ; 00e255ee rangé sur « comparaison et mesure » au lieu de « carré ».

### 2.2 Tagués : à reprendre

- **Aires en mm², dam², hm², km²** (environ 4 tirages sur 7) : 01e205ed (aire carré, 6-152), fdd849f5 (aire
  rectangle, 6-201), 9f33998e (côté par l'aire, 6-151), 3a7a5711 et 059e3fc9 (largeur, 6-200). La 6e : cm², dm², m².
- **3a7a5711 = 059e3fc9** (même contenu, une phrase de case diffère) : doublon, un à archiver.
- **Tags inexacts des problèmes inverses** : « largeur d'un rectangle » tagué 6-200 (connaître la formule),
  « côté d'un carré par son aire » tagué 6-151 ; aucun point de 6e ne nomme « retrouver une dimension ».
- **82748db8** (conversions d'aire, 6-150) : variations 0 et 4 identiques (dm² → m² sort 2 fois sur 5).
- **4290259a** « Fréquence » (6-188) : calcule une fréquence sans la comparer à une probabilité → 5-134
  (« Calculer une fréquence ») ; ou ajouter la comparaison à 1/2 pour rester en 6e.
- Détail de notation (durées) : espace `\,` ou `~` entre « h » et les minutes selon le modèle ; horaires
  de nuit (1 h à 4 h) dans « Soustraire des durées ».

### 2.3 Sans point : un point de 6e convient

- 59ac62a2, f9a3333d, 99c4ab73, def797c6 (multiplication à trou par 0,1 / 0,01 / 0,001) → **6-116**.
- 9cc8cd82, c5607804 (multiplication à trou par 0,5) → **6-118**.
- 290dcf6f « Augmentation » → 6-141 **après retrait de la variation à 200 %** (ou 3-068).
- 24f7a007 « Diminution » → 6-141 (ou 3-069) ; la variation à 100 % donne un prix de 0.
- b9677e1f « Chiffre des unités d'un produit » → 6-119 (ordre de grandeur) au mieux, discutable.

### 2.4 Sans point : relèvent d'un niveau suivant (marqués 6e à tort ?)

| Modèles                                                    | Ce qu'ils font                                 | Point         |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------- |
| 49e31496, 9c7978da, 6632e5c2                               | division par un décimal (0,12 : 0,02)          | 5-003         |
| e0f6b04e, 6ca011c9                                         | expressions avec parenthèses                   | 5-007         |
| 108b97fa, bf774c82, 26d4c7c5, 98c41bde, 053391dc, a869c2c1 | distributivité                                 | 5-008         |
| 72ac333e, 4a1e0767, 91c0f9a0, f3ae46e9, d006d936           | aire du triangle (et base, hauteur, côté)      | 5-061         |
| 5fb2d24b, 1de71a20                                         | aire du parallélogramme (base, hauteur)        | 5-073         |
| 355bd41a, b79d4cb7                                         | volumes, L ↔ dm³ (km³, mm³ même hors 5e)       | 5-051 / 5-129 |
| 8a3191ce, ae7a332e                                         | coefficient de proportionnalité, nombres nus   | 5-088 / 4-054 |
| 44a3062b                                                   | 4e proportionnelle à coefficient fractionnaire | 4-055         |
| 24a8e2b1, c1a54695                                         | échelle-rapport 1/n                            | 5-088         |

Coquille : ae7a332e finit par « est $?.$ » (point dans la formule).

### 2.5 Sans point : aucun point de 6e (prérequis du cours moyen)

- 819df2a9, f3bf4c64 (× 10 / 100 / 1000, CM2) ; d793de49 (575 × 2 par décomposition) ; 5d515eb1 (traduire
  une phrase en une opération).
- Conversions de longueur, masse, contenance : 7a90fc45, c31c9d95 (jusqu'à « 1 hL = 100 000 mL »,
  « 3 mL = 0,0003 daL »), b6269f1e, 64e55fc7 → CM1-068 / 077 / 083. La borne générale permet ces
  automatismes en 6e, mais aucun point ne les porte.

## 3. Les 85 points sans modèle

- **A. Texte / formule seuls (environ 45)** :
  - nombres : 101, 102, 103, 104, 109, 111, 112, 113, 202 ; 110 (ordonner : réponse en liste, à trancher) ;
  - calcul : 114, 198, 116 (aussi par les 4 modèles du § 2.3), 117, 119, 120, 121, 122, 123, 124 ;
  - fractions : 130, 131, 133, 203, 134, 204, 205, 136, 137 ;
  - pourcentages, proportionnalité : 139, 140, 189, 211 ;
  - grandeurs : 145, 146, 147, 153, 156, 158 ; géométrie (cours) : 163, 175, 177, 178 ;
  - probabilités : 186 ; programmes : 194, 195, 196 (exécuter un programme de calcul écrit en texte).
- **B. Outil existant (environ 20)** :
  - droite graduée ` ```line ` (`points:`, `labels:`) → **108** (repérer) ;
  - ` ```operation ` (division posée) → 121, 123 en variante ;
  - ` ```figure ` (énoncé dessiné, réponse en case ou QCM) → 148 (périmètres composés), 160, 161, 162,
    164, 165, 166, 167, 168 (lexique des angles), 171, 172 (calcul), 174, 176 (angles du triangle), 179 ;
  - tableau markdown / ` ```tableau-croise ` à trous → 184, 185, 192 ;
  - ` ```figure ` pour dessiner les motifs → 143 (motif évolutif : « combien au rang 10 ? »).
- **C. Outil neuf** :
  1. **Placer sur une droite graduée** (geste « placer », déjà manquant au CP pour CP-008) → 107, 128.
  2. **Assemblages de cubes** (perspective, vues de dessus / face / côté) → 154, 155, 181, 208, 209
     (et 153 en dessin). Rien de tel n'existe.
  3. **Rapporteur posé sur une figure** (lire une mesure) → 169 : pas un outil neuf, le rapporteur existe
     dans `constructions-v2` (`buildRapporteur`, instrument `rapporteur`) ; il s'agit de le brancher dans
     un bloc de question (dessin fixe), puis comme geste pour 170.
  4. **Figure à compléter, nouveaux contrôles** (aujourd'hui `droite_par`, `carre`, `rectangle`) : angle de
     mesure donnée (170), triangle (173), symétrique (180), cercle circonscrit (207), bissectrice et
     médiatrice construites (172, 166) → dans le chantier `figure-et-choix`.
  5. **Schéma en barres** (modèle pré-algébrique) → 142 ; un bloc d'affichage simple.
- **D. Non évaluables dans l'appli** : 182 (planifier une enquête), 183 (réaliser des mesures), 138
  (inventer des problèmes), 129 (graduer un segment : pliage, guide-âne), 210 et 197 (produire un
  programme, programmer un chemin : Blockly, futur).

## 4. Lots proposés (après les réponses)

1. **Corrections de l'existant** (§ 2.2 à 2.5) : contenus (aires, doublons, augmentation), tags, niveaux.
2. **Nombres** (A) : 101, 102, 103, 104, 109, 111, 112, 113, 202.
3. **Calcul décimal** (A) : 114, 198, 116, 117, 119, 121, 123 + problèmes 120, 122, 124.
4. **Fractions** (A) : 130, 131, 133, 203, 134, 204, 205, 136, 137.
5. **Pourcentages, proportionnalité, grandeurs** (A) : 139, 140, 189, 211, 145-147, 153, 156, 158, 186.
6. **Géométrie dessinée** (B) : 148, 160-168, 171-179 — après lecture de `figure-et-choix`.
7. **Droite graduée et tableaux** (B) : 108, 184, 185, 192, 143 ; programmes en texte 194-196.
8. Outils C, chacun en chantier à part, dans l'ordre que choisit David.

## 5. Questions à David

1. **Modèles de 5e marqués 6e** (§ 2.4, 25 modèles) : passer leurs `grades` à `5` (ou `4`) et les taguer du
   point de 5e, ou les laisser en 6e sans tag ?
2. **Prérequis du cours moyen** (§ 2.5, 8 modèles) : les garder en 6e comme automatismes sans point, ou
   retirer `6` de leurs `grades` ?
3. **Aires** : ne garder que cm², dm², m² (km² ?) dans les 5 modèles d'aire ; archiver le doublon 059e3fc9 ?
4. **Problèmes inverses** (largeur, côté par l'aire) : quel point ? (6-127 « égalités à trous
   multiplicatives » pour la largeur ; 6-151 gardé pour le côté ?)
5. **Augmentation / diminution** : 6-141 (en retirant 200 %) ou 3-068 / 3-069 ? « Fréquence » : 5-134 ou
   reprise avec comparaison à la probabilité ?
6. **Outils neufs** : lesquels lancer, dans quel ordre ? (Recommandation : « placer sur la droite graduée »
   d'abord — il sert aussi au CP et à tout le cycle 3 — puis les assemblages de cubes, 5 points.)
7. **Ordonner** (110, 134, 204) : réponse en une case « a < b < c », ou attendre « étiquettes à ranger » ?
8. **Groupe D** laissé sans modèle ?

**Réponses de David aux questions 6-8 (2026-10-26, « je valide »)** :

- **6. Outils** : « placer sur une droite graduée » existe déjà (`reponses-a-placer`, #1846, un point ; plusieurs
  points = sa PR 2) → 107 et 128 attendent sa livraison, aucun outil neuf. Ordre des outils neufs :
  (1) assemblages de cubes (154, 155, 181, 208, 209, 153), chantier à part ; (2) rapporteur posé sur une
  figure (169, puis 170), à brancher depuis `constructions-v2` ; (3) schéma en barres (142). Les contrôles
  de figure à compléter (170, 173, 180, 207, 172, 166) restent dans `figure-et-choix`.
- **7. Ordonner** (110, 134, 204) : trois cases `$? < ? < ?$` (une par nombre), sans attendre les étiquettes
  à ranger (hors chantier `reponses-a-placer`) ; passage aux étiquettes si l'outil arrive.
- **8. Groupe D** : sans modèle, marqué « non évaluable » : 182, 183, 138, 129 ; 197 et 210 « en attente de
  Blockly » (futur, pas jamais).

## 6. Lot « corrections » : phase 0 (validée par David le 2026-10-26)

Règle validée par David (2026-10-26) : un modèle HORS_PROGRAMME prend le niveau du point qui le décrit
(niveau suivant : `grades` remplacé ; cours moyen : niveau ajouté, 6 gardé). Destinations vérifiées
en inclusion stricte contre les bornes du niveau cible : [questions-6/destinations-42.csv](questions-6/destinations-42.csv)
(18 TAG, 19 MODIFIER dont 17 simples déplacements de nœud, 5 sans point).

Usages en prod (2026-10-26) : 0 carte FSRS, 0 cahier de texte, 0 question d'évaluation, 1 essai d'élève
(6ca011c9) ; une série « Essai évaluation » de 6e (0 chapitre, 0 assignation) pioche « Avec parenthèses », niveau 2.

- **PR 1, contenus** (instantané d'abord, David lance `--mettre-a-jour`) : 819df2a9 et f3bf4c64 (au plus
  3 décimales) ; b79d4cb7 (garder m³ / dm³ / cm³, 5 variations) ; 24f7a007 (retirer −100 %) ;
  82748db8 (variation en double) ; ae7a332e (coquille) ; 3a7a5711 archivé (doublon de 059e3fc9).
- **PR 2, migration** : niveaux, nœuds (déplacements R2) et tags des 37 modèles TAG / MODIFIER.
- **Décisions de David (2026-10-26, « je valide »)** :
  - échelle 1/n (24a8e2b1, c1a54695) → 5e, déplacés sur « coefficient de proportionnalité », tag 5-088 ;
  - coefficient sur nombres nus (8a3191ce, ae7a332e) → `grades` 5, **sans tag** (habillage en grandeurs au chantier de la 5e) ;
  - trous à facteur décimal (6632e5c2, 59ac62a2, 99c4ab73, f9a3333d, def797c6, 9cc8cd82, c5607804) → 5-126, nœud « ax = b » (comme m-transversal-2) ;
  - 5d515eb1 → `grades` 4, **sans tag** ;
  - le reste comme `destinations-42.csv` (cours moyen : niveau ajouté, 6 gardé ; 5 modèles restent en 6e sans point) ;
  - question d'accès : élèves de 5e / 4e / 3e / CM voient ces modèles ; élèves de 6e perdent les 32 qui partent au-dessus ; les tags restent lisibles par tout connecté, aucune règle ne change.
- Bilan : 34 tags posés, niveaux changés sur 37 modèles, 17 déplacements de nœud.

## 7. PR 1, contenus (2026-10-26)

- Instantané `questions-6/etat-prod-2026-10-26/` relevé par `questions-6/releve-prod.ts` (lecture seule,
  `.env`) : md5 des 8 modèles (les 6 du lot, 3a7a5711, 059e3fc9) = MCP ; 0 donnée d'élève.
- `questions-6/lot-corrections-6.py` → migration `20261027100000_questions_6_contenu` + fixture ; test
  `questions-6-contenu.test.ts` vert (12), rouge sans la migration. `question:specs` vert sur les 6
  (specs toutes vertes, 3 600 tirages sans échec).
- Retouches : 819df2a9 / f3bf4c64 q = 1..3, specs à 4 décimales réécrites (f3bf4c64 : spec « sans espace »
  remplacée par « produit recopié », aucune réponse ne dépasse 3 chiffres de part et d'autre de la
  virgule) ; b79d4cb7 variations 2, 3, 6, 7, 10 ; 24f7a007 sans −100 %, spec « prix de départ » sur −50 % ;
  82748db8 sans la variation 4 ; ae7a332e « $?$. ».
- Revues : `security-auditor` sans finding bloquant (gardes, rollback identique à l'« avant », md5 prod
  = « avant »), `code-reviewer` sans finding bloquant (mineurs : branche « dix-millièmes » morte dans la
  correction de 819df2a9, plus de spec d'espaces sur f3bf4c64). DoD : check 0 erreur, cliquet, lint rapide.
- **Écart au § 6** : l'archivage de 3a7a5711 passe dans la migration de rangement (PR 2), le générateur
  ne change pas de statut. Son tag 6-200 y est retiré.
- #1845 mergée le 2026-10-26, `db:migrate` joué ; les 6 md5 en prod = « après » (MCP).

## 8. PR 2, rangement (2026-10-27)

- Relevé `questions-6/etat-prod-2026-10-27/` (38 modèles : les 37 + 3a7a5711) : tous publiés en [6], un seul tag (3a7a5711 → 6-200). MCP : 0 carte SRS, 0 journal, 0 question d'évaluation, 1 tentative de compétence (6ca011c9, qui garde la 6e).
- `questions-6/lot-rangement-6.py` → migration + fixture `tests/integration/fixtures/questions-6-rangement.json`. Gabarit : `20261027000100_questions_ce1_rangement_tags` (modèles déjà rangés : gardes sur nœud, niveaux, statut et tags EXACTS), rollback piloté par les mêmes données.
- Chaque point posé est sur le nœud d'arrivée ou sa notion (vérifié par le générateur et par le trigger dans le test).
- **Écarts aux comptes du § 6** : **18** déplacements (et non 17 : b79d4cb7, compté comme une scission avant la PR 1, est devenu un simple déplacement) ; **29** modèles quittent la 6e (et non 32 : 8 modèles du cours moyen gardent la 6e), plus 3a7a5711 en brouillon.
- « Archiver » 3a7a5711 = statut `draft` (la table n'a que `draft` / `published`) + retrait de 6-200, nœud gardé.
- Niveaux CM écrits `[CM2, 6]` / `[CM1, 6]` (ordre du cycle ; aucun précédent CM + 6 en prod).
- Revues : `code-reviewer` et `security-auditor` sans finding bloquant. Corrigés : `drop if exists` + clé primaire sur les tables de nœuds (migration et rollback), garde de présence 38 / 0 dans le rollback (test ajouté, rouge sans elle), fixture passée par prettier dans le générateur. Laissés : ordre verrou consultatif / ligne opposé à celui de l'appli (interblocage possible → échec entier, à relancer ; hérité du gabarit) ; `set local` sous `db push` (même forme que les migrations passées).
