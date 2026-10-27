# Chantier « questions-6 » — couvrir la 6e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle3.json` → `6.points`.

## Reprendre ici

_Mis à jour le 2026-10-27, après #1868._

- **État** : lots 1 et 2 publiés en prod. Lot 3 « Calcul décimal » (§ 10) : 10 modèles mergés (#1868, `scripts/questions/6-calcul-decimal/`), pas encore en base de prod.
- **Prochaine action** : David lance `! pnpm tsx scripts/create-questions.ts --dir scripts/questions/6-calcul-decimal --publier` (brouillons) ; je relève les `id` au MCP ; migration nœud + tag (gabarit `20261027150000_questions_6_nombres_rangement_tags`, 6-116 sur la notion « Décimaux : calculs ») ; page à cocher ; publication.
- **En attente de David** : le `--publier`. Pour mémoire (audit #1861, non tranché) : `question_template_points_read_authenticated` laisse un élève connecté voir le point d'un brouillon.
- **Pièges en cours** : `e` et `i` interdites dans les `eval` ; prix écrits par `euros()` ; problèmes en euros : `zeros` à `off` ; un tag exige le modèle sur le nœud du point ou sa notion ; `db:migrate` depuis le dépôt principal ; serveur de dev sur `localhost` (pas `127.0.0.1`).
- **Worktree / branche** : aucun (à recréer pour la migration).

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
- #1849 mergée le 2026-10-27, `db:migrate` joué depuis le dépôt principal. MCP : [3] 2, [4] 2, [5] 25, [CM2, 6] 7, [CM1, 6] 1, brouillon 1 (3a7a5711, sans tag) ; 34 tags ; `updated_at` max = 2026-10-26.

## 9. Lot 2 « Nombres » : phase 0 (proposée le 2026-10-27, à valider)

Worktree `../ubumaths-wt-questions-6`, branche `feat/questions-6-nombres`. Bornes : `cycle3.json` → `6.points`
(entiers ≤ 999 999 999 999 ; numération jusqu'au millième ; décimaux jusqu'à 3 décimales dans ce lot).
Case choix (```choix, ADR 0033) **en prod** (v0.51.0, #1816 / #1822) : utilisée là où il y a un choix, jamais
l'ancien QCM. 10 modèles, un point chacun ; sous-notion = nœud du point (posé par la migration).

| #   | Point | Sous-notion (notion)                  | Modèle                               | Rangement ancien (thème / domaine / sous-domaine, niveau) |
| --- | ----- | ------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| 1   | 101   | décomposition (Entiers : numération)  | Le chiffre d'un rang                 | Décimaux / Apprivoiser / Décomposition, 5                 |
| 2   | 101   | décomposition (Entiers : numération)  | Le nombre de dizaines, de centièmes… | Décimaux / Apprivoiser / Décomposition, 6                 |
| 3   | 102   | décomposition (Décimaux : numération) | Liens entre les unités de numération | Décimaux / Apprivoiser / Décomposition, 7                 |
| 4   | 103   | écritures (Entiers : numération)      | Grands nombres jusqu'aux milliards   | Entiers / Apprivoiser / Ecriture, 15                      |
| 5   | 104   | Décimaux : numération                 | Reconnaître un nombre décimal        | Décimaux / Apprivoiser / Ecriture, 11                     |
| 6   | 109   | ordre (Décimaux : numération)         | Comparer deux nombres décimaux       | Décimaux / Apprivoiser / Comparer, 3                      |
| 7   | 111   | arrondis et ordres de grandeur        | Arrondir un nombre décimal           | Décimaux / Apprivoiser / Arrondir, 1 (sous-domaine neuf)  |
| 8   | 112   | arrondis et ordres de grandeur        | Arrondir un quotient, arrondir π     | Décimaux / Apprivoiser / Arrondir, 2                      |
| 9   | 113   | encadrement (Décimaux : numération)   | Encadrer un nombre décimal           | Décimaux / Apprivoiser / Encadrer, 4                      |
| 10  | 202   | encadrement (Décimaux : numération)   | Intercaler un nombre décimal         | Décimaux / Apprivoiser / Encadrer, 5                      |

Variations et réponses :

1. **Chiffre d'un rang** (case) — v1 entier de 6 à 12 chiffres, rang des unités aux centaines de milliards
   (« Dans $45~273~018$, quel est le chiffre des dizaines de mille ? ») ; v2 décimal ≤ 3 décimales, rang des
   centaines aux millièmes. Erreurs : rang voisin, dizaines ↔ dixièmes.
2. **Nombre de …** (case) — v1 entier (« Combien de centaines dans $45~273$ ? » → $452$) ; v2 décimal, borne
   « 1,27 » (« Combien de centièmes dans $1,27$ ? » → $127$). Erreurs : le chiffre ($2$) au lieu du nombre.
3. **Liens entre les unités** (case) — v1 « $1$ centaine $=$ ? dixièmes » (deux unités de la liste, de la plus
   grande à la plus petite) ; v2 « $k$ dixièmes $=$ ? millièmes », k de 2 à 9 ; v3 sens inverse, multiple exact
   (« $300$ centièmes $=$ ? unités ») ; v4 « $\frac{1}{100}=$ ? » en écriture décimale (1/10, 1/100, 1/1 000).
   Erreurs : rapport inversé, un zéro de trop ou de moins.
4. **Grands nombres** (case) — v1 écrire en chiffres une écriture par classes (« $4$ milliards $25$ millions
   $300$ mille $12$ » → $4~025~300~012$, classes vides comprises) ; v2 « Combien de millions dans
   $3~400~000~000$ ? » → $3~400$. Pas d'écriture en lettres (aucune aide au générateur : il faudrait des `if`
   imbriqués). Erreurs : classe vide oubliée (zéros manquants).
5. **Reconnaître un nombre décimal** (case choix Oui / Non, `melanger: non`) — v1 $\frac{a}{b}$ avec b dans
   {10, 100, 1 000} → oui ; v2 b dans {3, 7, 9}, a non multiple de b → non ; v3 un entier → oui (« un entier
   est décimal »). Voir question 1.
6. **Comparer** (case choix $<$ / $=$ / $>$, `melanger: non`) — v1 le piège « plus de chiffres n'est pas plus
   grand » ($3,9$ et $3,12$) ; v2 zéros de fin ($2,5$ et $2,50$) ; v3 parties entières ou millièmes qui
   diffèrent ; v4 signe large : « $3,4 \leqslant 3,40$ : vrai ou faux ? ». Une version CM1 existe (9c0c47ef,
   ≤ 2 décimales, ancien QCM) : celle-ci vise les pièges.
7. **Arrondir un décimal** (case) — v1 à l'unité, v2 au dixième, v3 au centième ; 1 à 3 décimales ; une
   variation sur 3 force la retenue ($3,96$ au dixième → $4$). Erreurs : troncature ($13,4$ pour $13,478$),
   mauvais rang. `4,0` → forme perfectible (zéro inutile).
8. **Arrondir un non décimal** (case) — v1 $\frac{a}{3}$ au dixième ou au centième (a de 1 à 20, non multiple
   de 3) ; v2 $\frac{a}{9}$ ; v3 $\pi$ à l'unité, au dixième, au centième. Voir question 3.
9. **Encadrer** (deux cases « $? < 3,47 < ?$ ») — précision unité, dixième ou centième, nombre à 2 ou 3
   décimales ; piège du 9 ($2,98$ au dixième : $2,9 < 2,98 < 3$). Erreurs : borne supérieure non augmentée.
10. **Intercaler** — voir question 2.

Question d'accès (migration nœud + tag, après le `--publier` de David) : **personne** ne gagne de lecture —
10 modèles neufs en brouillon, visibles des seuls admin et auteur ; ils ne deviennent lisibles qu'à la
publication, après la page à cocher.

Questions à David :

1. **6-104** : la borne dit « fraction de dénominateur 1, 10, 100… ». Ajoute-t-on $\frac{3}{4}$, $\frac{7}{5}$,
   $\frac{1}{2}$ (décimaux par fraction égale) ? Reco : **non** dans ce lot (la définition seule).
2. **6-202 Intercaler** : une case n'accepte qu'une réponse ; aucune case « nombre compris entre a et b ». Reco :
   **case choix** « Lesquels de ces nombres sont compris entre $3,4$ et $3,5$ ? » (`plusieurs: oui`, leurres
   $3,04$, $3,6$, $3,39$…). Autre voie : outil neuf « case à intervalle » (chantier à part).
3. **6-112** : $\frac{a}{3}$, $\frac{a}{9}$ et $\pi$ suffisent-ils ? (Reco : oui ; pas de $\frac{a}{7}$, trop long
   à la main.)
4. Hors lot, pour mémoire : 32724446 et 6379fa20 (CM1, « encadrer au dixième / centième près ») sont sans point.

**Décisions de David (2026-10-27, « je te suis »)** : phase 0 du § 9 validée telle quelle ; 6-104 sans
dénominateur 2, 4, 5… (définition seule) ; 6-202 en case choix `plusieurs: oui`, leurres 3,04 / 3,39 / 3,6 / borne
3,5 ; 6-112 : a/3, a/9, π (pas a/7).

- **6-202 revu (David, 2026-10-27)** : ma phase 0 disait « aucune case n'accepte un nombre entre a et b » — faux :
  règle `range` (`inclusive: false`) + `rulesSuffice`. David choisit la **case libre** (l'élève produit son nombre ;
  3,04, la borne 3,5 et 3,6 jugés faux ; la correction donne un exemple).

### 9.1 Écriture (2026-10-27)

- `docs/wip/questions/lot-6-nombres.py` → `scripts/questions/6-nombres/` (10 fichiers, 75 specs, justes et erreurs
  typiques) ; `create-questions` en simulation : 10 verts. Le script passe prettier (sinon le pre-commit réécrit les JSON).
- Pièges rencontrés : variables `e` (Euler) et `i` (imaginaire) refusées dans les `eval` → `p`, `u`, `w` ; un `?` porté
  par un `{{if}}` n'est pas compté comme case ; `4,0` → `unoptimal_form` avec `['zeros']`, `4025300012` → `['spaces']`.
- Base locale : 10 brouillons créés ; joués dans l'aperçu admin (port 5182) : 01 juste + correction, 06 case choix
  « 16,800 … 16,8 » (virgule, zéros gardés) juste, 10 « 2,72 » juste (≠ exemple 2,75), « 2,07 » faux avec « Une réponse
  possible : 2,75 », 09 deux cases, 03 case dans une fraction : rendus corrects.

### 9.2 En prod (2026-10-27)

David a lancé `create-questions --publier` : 10 brouillons, `[6]`, sans nœud ni tag (MCP). Identifiants et chemins
(branche « Nombres et calculs ») :

| id                                   | modèle                               | point | notion > sous-notion                                   |
| ------------------------------------ | ------------------------------------ | ----- | ------------------------------------------------------ |
| 4d825d44-928a-4461-9df0-3b3c3fdc74fc | Le chiffre d'un rang                 | 6-101 | Entiers : numération > décomposition                   |
| 4bcbbaae-a01d-43c2-903c-1b365a438761 | Le nombre de dizaines, de centièmes… | 6-101 | Entiers : numération > décomposition                   |
| 2c5bae8f-03e3-44c6-9dbd-6849c7177ceb | Liens entre les unités de numération | 6-102 | Décimaux : numération > décomposition                  |
| 8d7edbde-d1d0-4a9d-bb6e-7e516ef1381d | Grands nombres jusqu'aux milliards   | 6-103 | Entiers : numération > écritures                       |
| d7781eed-7930-4619-9b00-caade882a637 | Reconnaître un nombre décimal        | 6-104 | Décimaux : numération (notion)                         |
| a1b46489-4566-449e-a4e9-e1e144a0b11d | Comparer deux nombres décimaux       | 6-109 | Décimaux : numération > ordre                          |
| e75cb1a3-56f6-4498-b6bf-06e852b3252d | Arrondir un nombre décimal           | 6-111 | Décimaux : numération > arrondis et ordres de grandeur |
| 36991abb-b704-4c0f-9165-c5de5e18f70b | Arrondir un quotient, arrondir π     | 6-112 | Décimaux : numération > arrondis et ordres de grandeur |
| 030e3554-0a49-4a22-9931-bebd2a8cb227 | Encadrer un nombre décimal           | 6-113 | Décimaux : numération > encadrement                    |
| 2e982062-0fc9-473f-8aa2-affaf55c567d | Intercaler un nombre décimal         | 6-202 | Décimaux : numération > encadrement                    |

### 9.3 Rangement (2026-10-27)

- Prod revérifiée (MCP) avant le SQL : 10 brouillons, `[6]`, sans nœud ni tag.
- Migration `20261027150000_questions_6_nombres_rangement_tags` (gabarit `cp_c`, grade `6`, 6-104 sur la notion)
  - test `questions-6-nombres-rangement-tags` : rouge sans la migration (ENOENT), 9/9 vert avec.

### 9.4 Page à cocher (2026-10-27)

- #1861 mergée, `db:migrate` joué, prod relue (MCP) : 10 brouillons sur le nœud de leur point, tag juste, `updated_at` inchangé.
- La page refusait le lot : « Comparer deux nombres décimaux » existe aussi en CM1 (9c0c47ef, niveau 2, publié), même
  clé hors niveau. #1863 : départage par le niveau du fichier s'il en désigne un seul, signalé sur la fiche (relecture :
  un ancien lot renuméroté prendrait sinon l'homonyme en silence).
- `security-auditor` (#1861), non bloquant, préexistant : `question_template_points_read_authenticated` (`using (true)`)
  laisse un élève connecté voir à quel point un brouillon est rattaché (pas son contenu). Signalé à David, rien décidé.
- Relecture de David : 10/10 « OK » (verdicts comptés). `publier-lot` en simulation : 10 brouillons passent ; David a lancé
  `--publier` ; relu au MCP : 10 `published`, 10 rangés, 10 tags. **Lot 2 clos.**

## 10. Lot 3 « Calcul décimal » : phase 0 (validée le 2026-10-27)

Relevé MCP (2026-10-27) : 0 modèle sur les 10 points. Voisins en prod : CM1 (sommes et différences sans retenue,
CM1-039 / 133), CM2 (÷ 10, 100, 1 000), CE2 (division euclidienne, diviseur ≤ 10, égalité seulement), 6-115 (5) et
6-118 (7). Le bloc `operation (posée, cases du quotient et du reste) est en prod ; un modèle posé n'a que des
cases d'opération, d'où un modèle à part. Case choix (`choix) là où il y a un choix. Un point par modèle ;
sous-notion = nœud du point (posé par la migration).

| #   | Point | Sous-notion (notion)                        | Modèle                                   | Rangement ancien (thème / domaine / sous-domaine, niveau) |
| --- | ----- | ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| 1   | 114   | addition (Décimaux : calculs)               | Additionner des nombres décimaux         | Décimaux / Additionner / Somme, 5                         |
| 2   | 198   | soustraction (Décimaux : calculs)           | Soustraire des nombres décimaux          | Décimaux / Soustraire / Différence, 5                     |
| 3   | 116   | Décimaux : calculs (notion)                 | Multiplier par 0,1, c'est diviser par 10 | Décimaux / Multiplier / Puissances de 10, 10              |
| 4   | 117   | multiplication (Décimaux : calculs)         | Un produit de décimaux par l'aire        | Décimaux / Multiplier / Produit, 6                        |
| 5   | 119   | arrondis et ordres de grandeur (numération) | Contrôler par un ordre de grandeur       | Décimaux / Apprivoiser / Arrondir, 3                      |
| 6   | 120   | multiplication (Décimaux : calculs)         | Problèmes de produits décimaux           | Décimaux / Problèmes / Multiplication, 1 (neuf)           |
| 7   | 121   | division (Décimaux : calculs)               | Diviser un décimal par un entier         | Décimaux / Diviser / Quotient, 8                          |
| 8   | 122   | division (Décimaux : calculs)               | Problèmes de partage décimal             | Décimaux / Problèmes / Division, 1 (neuf)                 |
| 9   | 123   | division euclidienne (Entiers : division)   | Poser une division euclidienne           | Entiers / Diviser / Division euclidienne, 5               |
| 10  | 124   | division euclidienne (Entiers : division)   | Problèmes de division euclidienne        | Entiers / Problèmes / Division euclidienne, 1 (neuf)      |

Variations et réponses (nombres < 1 000, au plus 3 décimales, sauf mention) :

1. **Additionner** (case, en ligne) — v1 longueurs différentes ($12,7 + 3,85$) ; v2 trois termes dont deux font
   un entier ($2,75 + 4,6 + 0,25$) ; v3 entier + décimal ($7 + 0,35$). Erreurs : chiffres alignés à droite
   ($12,7 + 3,85 \to 5,12$), $7 + 0,35 \to 0,42$, retenue des dixièmes oubliée.
2. **Soustraire** (case, en ligne) — v1 premier terme plus court ($15,2 - 3,47 = 11,73$) ; v2 entier moins
   décimal ($10 - 3,6 = 6,4$) ; v3 retenue sur deux rangs ($8,03 - 2,75$). Erreurs : petit chiffre ôté du
   grand ($12,27$), retenue oubliée ($7,4$), chiffres alignés à droite.
3. **× 0,1 et ÷ 10** — v1 case choix « Multiplier par $0,01$, c'est : diviser par $100$ / multiplier par $100$ /
   diviser par $10$ / diviser par $1~000$ » ; v2 trou « $37 \times 0,1 = 37 \div ?$ » ; v3 trou
   « $4,5 \div 100 = 4,5 \times ?$ » ; v4 les deux calculs donnent le même nombre (case : « $52 \times 0,01 = ?$ »,
   la correction passe par $52 \div 100$). Erreurs : $0,1 \leftrightarrow 10$ inversé, un zéro de trop.
   (Les trous à facteur décimal « $a \times ? = b$ » sont en 5e, 5-126 : pas repris.)
4. **Par l'aire** (deux cases) — v1 rectangle de $3,7$ dm sur $2,9$ dm : « en cm : $37 \times 29 = ?$ cm², donc
   $3,7 \times 2,9 = ?$ » (aire en dm²) ; v2 $0,4$ m sur $0,3$ m : $40 \times 30 = 1~200$ cm² $= 0,12$ m², donc
   $0,4 \times 0,3 = 0,12$. Facteurs à 1 décimale, de $0,1$ à $9,9$ ; unités cm², dm², m². Erreurs :
   $0,4 \times 0,3 \to 1,2$, virgule placée « comme dans l'addition » ($10,73 \to 107,3$).
5. **Ordre de grandeur** (case choix, mélangée) — v1 « Sans poser le calcul, lequel est $48,7 \times 3,1$ ? »
   ($15,097$ / $150,97$ / $1~509,7$ : mêmes chiffres, virgule déplacée) ; v2 même chose pour une somme
   ($398,6 + 51,25$) ; v3 « Un ordre de grandeur de $49,8 \times 21$ : $100$ / $1~000$ / $10~000$ ».
6. **Problèmes de produits** (case, unité écrite après) — v1 prix au kilo ($2,4$ kg à $3,50$ €/kg) ; v2 plein
   d'essence ($35$ L à $1,85$ €) ; v3 produit plus petit qu'un facteur ($0,6$ kg à $4,50$ €/kg $= 2,70$ €).
   Erreurs : addition au lieu du produit, virgule mal placée. Voir question 2.
7. **Diviser un décimal par un entier < 10** (case) — v1 division qui s'arrête ($7,5 \div 3$, $14,4 \div 6$) ;
   v2 entier par entier, quotient décimal ($9 \div 4 = 2,25$) ; v3 division qui ne s'arrête pas, arrondie au
   centième ($10 \div 3$, $73 \div 6$, la borne). Erreurs : zéro oublié ou ajouté ($2,05$), reste pris pour
   les décimales ($9 \div 4 \to 2,1$).
8. **Problèmes de partage** (case, unité) — v1 partager une somme ($22,50$ € entre $3$) ; v2 couper un ruban
   ($4,2$ m en $6$ morceaux $= 0,7$ m) ; v3 prix d'un objet ($4$ cahiers pour $7,60$ €). Diviseur à un chiffre
   (sans calculatrice). Voir questions 2 et 3.
9. **Poser une division euclidienne** (```operation, cases du quotient et du reste) — v1 diviseur à un chiffre,
   dividende de 3 ou 4 chiffres ; v2 diviseur à deux chiffres ($295 \div 18$, $536 \div 45$, la borne) ; v3 un
   $0$ au quotient ($618 \div 3 = 206$). Diviseur de $2$ à $99$.
10. **Problèmes de division euclidienne** (case ou deux cases) — v1 quotient et reste ($295$ œufs en boîtes de
    $12$ : boîtes pleines, œufs restants) ; v2 le reste force un de plus ($230$ élèves, cars de $45$ places
    $\to 6$ cars ; erreur $5$) ; v3 conversion ($150$ jours $= ?$ semaines et $?$ jours). Diviseur < 100.

Question d'accès (migration nœud + tag, après le `--publier` de David) : **personne** ne gagne de lecture —
10 modèles neufs en brouillon, visibles des seuls admin et auteur, lisibles à la publication seulement.

Questions à David :

1. **Posées** : seule la division euclidienne (6-123) est posée en ```operation. Faut-il aussi un modèle posé
   pour 114, 198 (addition, soustraction de décimaux) et 121 (décimal ÷ entier, quotient qui s'arrête) ? Reco :
   **non dans ce lot** (l'addition et la soustraction posées de décimaux relèvent du cours moyen ; 121 garde
   10 ÷ 3, que le bloc refuse) ; un lot « posées » à part si vous le voulez.
2. **Prix** : $7,50$ € accepté comme juste, sans « forme perfectible » (zéro inutile), dans les problèmes en
   euros ? Reco : **oui** ($7,5$ aussi juste).
3. **6-122** : diviseur à un chiffre seulement, pas d'exemple « $57,40$ € ÷ $35$ » (calculatrice) ? Reco : **oui**.

**Décisions de David (2026-10-27, « je suis tes recos »)** : phase 0 du § 10 validée ; seule 6-123 est posée
(pas de modèle posé pour 114, 198, 121 dans ce lot) ; $7,50$ € juste sans « forme perfectible » dans les
problèmes en euros ($7,5$ aussi) ; 6-122 à diviseur d'un chiffre seulement.

### 10.1 Écriture (2026-10-27)

- `docs/wip/questions/lot-6-calcul-decimal.py` → `scripts/questions/6-calcul-decimal/` (10 fichiers, 78 specs, justes et
  erreurs typiques) ; `create-questions` en simulation : 10 verts ; `question:specs` à 300 tirages par variation :
  9 000 tirages réussis, aucun avertissement.
- Retouches après aperçu : prix des corrections à deux décimales (`euros()`, « 2,40 » et non « 2,4 ») ; rectangles
  non carrés ; « 1 jour » au singulier dans la correction des conversions.
- Base locale : 10 brouillons créés ; joués dans l'aperçu admin (port 5183) : 09 division posée (1 226 ÷ 4 = 306
  reste 2) juste, quotient et reste lus ; 06 « 34,20 » juste (zéros inutiles désactivés) ; 05 case choix mélangée,
  juste ; 04 deux cases avec unités, rendu correct.

- #1868 mergée le 2026-10-27 (CI verte) ; worktree retiré.
