# Chantier « questions » — compléter les modèles pour couvrir les programmes (CP d'abord)

## Reprendre ici

_Mis à jour le 2026-10-26, skill `couvrir-niveau` écrit (§ 4 sexdecies)._

- **État** : 72 modèles CP publiés (groupes A, H, B, M, C). Skill `couvrir-niveau` + doc `docs/pratiques/couvrir-un-niveau.md` écrits (commit direct sur `main`).
- **Prochaine action** : PR d'outillage : `scripts/questions/page-a-cocher.ts` (dossier de lot → page HTML, gabarit commun) et `scripts/questions/publier-lot.ts` (simulation / `--publier`), testés ; puis la doc y renvoie (encadré du § 8 à retirer, `couvre:` à compléter).
- **En attente de David** : vérification manuelle #1702 (plus tard, dit-il) ; reste du CP en suspens (case « figure », réponses à placer, 058).
- **Pièges en cours** : un modèle porte au plus UN point (ADR 0020) ; QCM OU cases ; case dans un tableau = `$?$` ; prénom dans le texte ; **`{{if:…}}` imbriqué non résolu dans `correctChoiceIndex`** (variable) ; jamais de variable `e` ; **niveaux numérotés dès l'écriture** ; **montants en `$n~\unit{€}$`, jamais « : » juste après** ; **écriture en prod refusée par le classifieur du mode auto : David la lance (`!`)** ; **`gh pr checks --watch` peut rendre la main avant le job d'intégration : suivre le run** ; migration qui change l'arbre ou les points → `LATER` + copies figées ; `create-questions` vise `.env` (prod) : pour la base locale, `set -a; . ./.env.local; set +a` avant ; 4 brouillons du lot C en base LOCALE (essais) ; `Trace la droite qui passe par deux points` (`010d81a5`) est le seul brouillon CP en prod, pas de ce chantier.
- **Worktree / branche** : aucun (retiré après #1832).
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

## 2 bis. Case « figure » → chantier à part

Relevé, verdict du conseil et phase 0 de CP-059 : déplacés le 2026-10-25 dans [geometrie-validation](geometrie-validation-progress.md).

## 3. Outils proposés

1. Bloc `horloge` (cadran paramétrable ; CP heures entières, puis minutes CE1/CE2) — recommandé en premier.
2. Bloc `collection` (vrac, barres de dix + cubes, groupements partiels).
3. Bloc `monnaie` (pièces et billets d'euros).
4. Plus tard : réponses à placer (point sur la droite, étiquettes à ranger, aiguilles) — reçoit **CP-008** (verdict du conseil, [geometrie-validation](geometrie-validation-progress.md), suivi par David le 2026-10-25).
5. **Case « figure »** ([geometrie-validation](geometrie-validation-progress.md), verdict du conseil) : objets de l'élève retrouvés par leur position sur les nœuds, vérification de propriétés en tout-ou-rien ; CP-059 d'abord, puis 060, puis 034.
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

## 4 quater. Lot A2 : décisions (David, 2026-10-25)

- 7 modèles CP, domaine Apprivoiser : CP-003 « suit / précède » (Ecriture/11) et « compléter la suite » (Ecriture/12) ; CP-004 « dizaines et unités → nombre », ordre normal et inversé (Décomposition/12) ; CP-007 « ranger » 4 nombres, croissant / décroissant (Comparer/5) ; CP-075 « juste avant / juste après » (Encadrer/4) et « encadrer » libre (Encadrer/5) ; CP-076 « intercaler » (Encadrer/6, pas de sous-domaine neuf).
- Nombres en lettres (CP-004) : **pas en A2**, renvoyés à A6 (lexique) — aucun outil « nombre → lettres » dans le moteur.
- Encadrement libre : `rulesSuffice`, en bas tout entier de 0 à n − 1, en haut tout entier > n (plafond technique 1 000 000) : une réponse vraie (150) n'est jamais refusée.
- Ranger : le moteur ne trie pas → 4 nombres tirés rangés, affichés selon une permutation fixe parmi 4 (ni croissante ni décroissante).

## 4 quinquies. Lot A4 : décisions (David, 2026-10-25)

- Rangement : sur la **notion** du point, sans sous-notion ni nœud neuf — « Entiers : addition et soustraction » (CP-014, 077, 015, 078, 079), « Entiers : multiplication » (CP-017).
- ~~Modèles mélangés à deux tags~~ : interdit par l'ADR 0020 (au plus un point par programme), que j'avais manqué (refus vu au test d'intégration). **Option A choisie** : un modèle par point, l'autre opération en leurre — « Addition ou soustraction ? » (CP-014 : réunion, ajout, retrait) et « Soustraction ou addition ? » (CP-077 : retrait, écart, ajout), nombres ≤ 20 ; « Les signes + et − » (CP-015) et « Les signes − et + » (CP-078) : lire, sens, écrire, le signe du point deux fois sur trois.
- « Addition ou soustraction ? » : deux choix seulement (a + b / a − b), pas de leurre artificiel.
- « Le signe = » (CP-079) : signe manquant (+, −, =) et égalités vraies ou fausses (8 = 5 + 3, 5 + 3 = 3 + 5, 5 + 3 = 5 + 5).
- CP-017 : « fois » et addition répétée, **sans le signe ×** (livret CP : × en fin de CP ou au CE1) ; groupes et taille de 2 à 5. Deux modèles (QCM « quel calcul ? » et case « combien ? »), un modèle ne pouvant mêler QCM et cases.

## 4 sexies. Lot A5 : décisions (David, 2026-10-25)

- Rangement : sur la **sous-notion** du point (« Problèmes arithmétiques > parties-tout / en deux étapes ou plus / multiplicatifs ») ; aucun modèle n'y est en prod. Réponses en case nombre.
- **CP-029, deux modèles** (livret : 20 en début d'année, puis 100) : « jusqu'à 20 » et « jusqu'à 100 ». Variations : tout (2 parties), tout (3 parties), ajout, retrait, une partie, ajout inconnu. Dans « jusqu'à 100 », le tout et l'ajout vont à 100 ; **retrait, partie et ajout inconnu restent ≤ 30** (soustraire au-delà n'est pas CP).
- **Pas de comparaison** (« combien de plus que ») : CE1-037.
- **CP-030** (≤ 30, intermédiaire et final compris) : retrait puis ajout (bus), deux retraits, deux ajouts, réunion puis retrait.
- **CP-031** (≤ 30, sans reste, sans le signe ×) : valeur du tout, nombre de parts, valeur d'une part ; 2 à 6 groupes de 2 à 10 ; corrigé par addition répétée.

## 4 septies. Lot A3 : décisions (David, 2026-10-25)

David suit mes cinq recommandations (« je te suis », après les avoir demandées).

- Rangement : sous-notion « ordinaux et rangs » (les 5 points y sont), aucun modèle en prod.
- 6 modèles, rangs jusqu'au 20e : CP-009 « Le rang en lettres » (QCM) et « Le rang en chiffres » (case) ; CP-010 « Dire la place » (QCM : perles, file d'enfants) ; CP-011 « Repérer un rang » (case : liste de 5 nombres dans les deux sens, perles depuis la gauche ou la droite) ; CP-012 « Rang et nombre devant » (devant, rang, derrière : exemple du BO) ; CP-013 « Suites qui se répètent » (QCM : ● ▲, ● ● ▲, ■ ▲ ●, A B C D).
- Leurres des QCM de mots : les rangs voisins et le nombre ordinaire (sixième / huitième / sept), pas de fautes d'orthographe.
- Notation $7^{\text{e}}$, $1^{\text{er}}$ / $1^{\text{re}}$ ; « premier / première » accordé avec l'objet ; pas de « second ».
- Sens : CP-010 de gauche à droite seulement ; CP-011 les deux sens, le sens en gras.
- Suites : motif montré deux fois, place demandée au-delà, jusqu'à la 20e ; pas de suite de nombres (1, 3, 5… relève de CP-003).

## 4 octies. Lot A6 : décisions (David, 2026-10-25)

David suit mes quatre recommandations (« je suis tes recos »).

- 9 modèles, chacun sur le nœud de son point (sous-notion s'il y en a une), un tag ; `theme` Grandeurs (domain Longueurs / Masses / Monnaie / Durées) ; entiers ≤ 100.
- CP-032 « Long, court, près, loin » (QCM : plus long / plus court, plus près / plus loin en pas, contraires) ; CP-039 « Lourd ou léger ? » (QCM : objets familiers très différents, contraire ; pas de balance, c'est CP-040).
- CP-036 « Mètre ou centimètre ? » (QCM : unité adaptée, symbole, lecture) ; CP-037 « Quelle longueur ? » (QCM : ordre de grandeur, ex. du BO trousse 2 cm / 20 cm / 1 m) — 036 = unité et symbole, 037 = ordre de grandeur.
- CP-038 « Un mètre, c'est 100 centimètres » (QCM : 1 m = … cm ; 1 m ou n cm, n de 30 à 90, 100 → même longueur ; pas de conversion composée).
- CP-041 « Les mots de la monnaie » (QCM : plus / moins cher, pièce ou billet, rendre la monnaie, €) ; pas de calcul (CP-043, 045 → outil monnaie).
- CP-048 « Quelle heure pour… ? » (QCM, sans horloge) : heures **sur 12 h avec le moment** (« 8 heures du matin », « midi », « 2 heures de l'après-midi », « 8 heures du soir »).
- CP-004 (renvoyé de A2), ≤ 50 : « Écrire un nombre en lettres » (QCM ; leurres : chiffres inversés, voisins) et « Lire un nombre écrit en lettres » (case) ; **orthographe rectifiée** (« vingt-et-un », traits d'union partout).

## 4 nonies. Suite après le groupe A (David, 2026-10-25)

David suit mes recommandations (« je te suis »).

1. D'abord, ses relectures en attente (A3, `92c8e499`) puis la publication A1-A6 en un lot : elles orientent les lots suivants.
2. **Lot H** (une PR) : modèles d'horloge CP-046 (lire) et CP-047 (positionner, en QCM d'horloges) + **CP-016** (addition posée, le lot 1 d'`operations-posees` est sur `main`). Les deux blocs ne sont pas en prod : brouillons jusqu'au `deploy:prod`.
3. **Groupe B inséré avant la case « figure »** (aucun outil neuf), trois lots : **B1** tableaux (068, 069, 084) → **B2** reconnaître sur une figure, affichage seul (054-056, 057, 061, 062, 067) → **B3** images fixes (049-052, 040). 034 (avec 059, 060) reste pour la case « figure » ; **008** passe aux « réponses à placer » (§ 3.4) et **058** est à réexaminer (pas forcément une figure) — David suit le verdict du conseil ([geometrie-validation](geometrie-validation-progress.md)), 2026-10-25.
4. Puis case « figure » (chantier à part), collection, monnaie — inchangé (§ 4 bis).

## 4 decies. Lot H : décisions (David, 2026-10-25)

David suit mes recommandations (« je suis tes recos. go »).

- 3 modèles, chacun sur la sous-notion de son point, un tag : CP-046 « Quelle heure est-il ? » (case, « Il est [_] h. », réponse 1 à 12, 15 refusé pour 3 h) ; CP-047 « Quelle horloge indique… ? » (QCM de 3 horloges : bonne, aiguilles inversées — 12 h 5n, ou 6 h pour 12 h —, heure voisine ; V2 en contexte : école 8 h, cantine midi, goûter 4 h de l'après-midi, dîner 7 h du soir) ; CP-016 « Pose et calcule une addition » (bloc ```operation, `retenues: oui`, cases de retenue non jugées ; sans retenue, avec retenue, 2 + 1 chiffres, trois termes avec retenue ; somme ≤ 99, le plus grand terme en premier).
- Pas de QCM pour CP-046 (la case suffit). Les blocs `horloge et `operation ne sont pas en prod : brouillons jusqu'au `deploy:prod`.

## 4 undecies. Lot B1 : décisions (David, 2026-10-25)

David suit mes recommandations (« je suis tes recos, go »).

- 3 modèles, réponses en case nombre dans un tableau markdown (`tableau-croise` n'a pas de case jugée) ; chacun sur la sous-notion de son point, un tag.
- CP-068 « Compte et range dans un tableau » (« tableaux ») : file de formes mélangées, tableau Forme / Nombre ; 3 formes ● ▲ ■ et 9 objets, ou 4 formes (+ ★) et 12 objets ; un compte à 0 est une réponse valable.
- CP-069 « Complète le tableau à double entrée » : table d'addition 3 × 3 (en-têtes croissants de 1 à 9, 4 cases en croix) ; formes pleines ou vides (10 objets parmi ● ○ ▲ △ ■ □, rond / triangle / carré × plein / vide, 2 cases données, 4 à remplir).
- CP-084 « Remplis le tableau à double entrée » : tableau préparé entièrement vide, données en phrases (« Léa a 3 billes rouges et 2 billes bleues. ») ; 2 ou 3 enfants × 2 couleurs. Nombres de 1 à 9 (et non 0 à 9 : « Léa a 0 bille rouge » ne se dit pas) — validé par David. En-tête à trouver : écarté (réponse en mot).
- Formes en symboles (pas d'emojis : rendu PDF incertain).
- Table d'addition 4 colonnes : léger défilement horizontal au téléphone, accepté par David (tient sur tablette).

## 4 duodecies. Lot B2 : décisions (David, 2026-10-25)

David suit mes cinq recommandations (« je te suis »).

- 10 modèles, figures affichées seulement (case nombre ou QCM), chacun sur le nœud de son point, un tag : CP-054 « Combien de formes dans le dessin ? » (maison, bateau, robot ; « un carré ne compte pas comme un rectangle ») ; CP-055 « Quelle est cette forme ? » (QCM des 4 noms, **carré sur une pointe** compris) ; CP-056 « Combien de côtés ? Combien de sommets ? » (case) et « Qui suis-je ? » (QCM, devinette) ; CP-057 « Quels points sont alignés ? » ; CP-061 « Où est-il ? » (gauche/droite/au-dessus/en dessous, entre, sur/sous/à côté, devant/derrière) ; CP-062 « Qui est assis à côté ? » (plan de classe vu du dessus, tableau en haut, élèves face au tableau) ; CP-067 « Le robot sur le quadrillage » (**flèches absolues** en LaTeX ; « tourne à gauche » laissé au CE1).
- **CP-035 ajouté à B2** (oublié du plan) : « Mesure avec la règle », segment de 2 à 12 cm, **le 0 au début du segment**.
- **CP-034 en QCM sur figure** : « Quel segment est le plus long / court ? », trois directions, 1 cm d'écart au moins ; le report (bande de papier) attend la case « figure ».
- **CP-058** reste hors de B2, à réexaminer.

## 4 terdecies. Lot B3 : décisions (David, 2026-10-25)

David suit mes recommandations (« je suis tes recos, go »).

- **Dessin en bloc ```figure**, pas d'image fixe (une image n'arriverait en prod qu'avec un `deploy:prod`). Le bloc refuse `courbe()` : les ellipses sont des lignes brisées aux coordonnées calculées par le générateur (16 segments par demi-ellipse) ; la moitié cachée est en **tirets faits main** (un morceau sur deux, en trait plein) : le motif du trait (12 px) ne tient pas sur des morceaux de 10 px, la ligne sortait pleine. Perspective cavalière (45°, réduction 1/2), arêtes cachées en tirets.
- 7 modèles, chacun sur le nœud de son point, un tag : CP-049 « Trouve le solide » (les 5 solides numérotés, 4 rangements, case nombre) et « À quel solide ressemble cet objet ? » (objets de tous les jours, QCM texte) ; CP-050 « Comment s'appelle ce solide ? » (cube, petit cube, pavé couché, pavé debout, boule ; les 5 noms au choix) ; CP-051 « Comment s'appelle la partie coloriée ? » (face, côté, sommet — **pas « arête »**, hors CP ; face en bleu translucide : le jaune du thème clair sort moutarde) ; CP-052 « Combien de faces ? » (6 ; leurre 3, les faces vues) et « De quelle forme sont les faces ? » (cube → carrés ; **pavé sans face carrée** → rectangles) ; CP-040 « Lequel est le plus lourd ? » (balance à plateaux suspendus, penchée ou à l'équilibre, plus lourd ou plus léger ; **formes de même taille** ● ■ ▲ appelées disque, carré, triangle comme en B2 ; deux balances à enchaîner laissées au CE1).
- **CP-058** hors de B3 (geste de la règle : case « figure » ou réponses à placer).

## 4 quattuordecies. Lot M (monnaie) : décisions (David, 2026-10-26)

David suit mes recommandations (« je suis tes recos »).

- 6 modèles, affichage seul (bloc ```monnaie, aucun geste : « construire » attend), entiers ≤ 100, prénoms écrits dans le texte ; sous-notion de chaque point (« pièces et billets » ou « rendre la monnaie »), un tag, **niveaux numérotés** sur « pièces et billets ».
- M1 CP-043 « Combien d'argent ? » (case ; pièces seules ≤ 10 €, billets de 10 € + pièces, billets 5/10/20 + pièces, puis `mélangé`) ; M2 CP-042 « Qui a le plus d'argent ? » (QCM Léa / Tom / Autant ; piège 10 × 1 € = un billet de 10 € ; moins d'objets mais plus d'argent) ; M3 CP-044 « Quel porte-monnaie contient exactement N € ? » (QCM de **3** ensembles à 6 cm ; leurres pièce oubliée, chiffres inversés, même nombre d'objets ; variation « sans pièce de 1 € ») ; M4 CP-044 « Combien de pièces de 2 € faut-il ajouter ? » (case) ; M5 CP-071 « Combien le marchand rend-il ? » (case ; prix dans l'énoncé, billet de 10, 20 puis 50 € ; rendu ≤ 20 € ; corrigé `montant:`) ; M6 **CP-045** « Peut-il acheter ? » (QCM Oui / Non ; une variation pile au prix).
- Bloc ```monnaie pas en prod : brouillons jusqu'au `deploy:prod`.
- Question d'accès : tranchée AVANT le SQL (personne ne gagne ni ne perd d'accès).

## 4 quindecies. Lot C (construire) : décisions (David, 2026-10-26)

David suit mes recommandations (« je suis tes recos »). Les blocs à construire (chantier [construire](construire-progress.md), #1812, #1820, #1825) ne sont pas en prod : brouillons jusqu'au `deploy:prod`.

- 4 modèles, l'élève **construit** (bloc avec `construire:`, sa case posée par le générateur), chacun sur la sous-notion de son point, un tag.
- C1 **CP-002** « Construis le nombre » (dénombrement ; `Entiers / Apprivoiser / Dénombrer`, niveau 1) : barres de dix et cubes ; 11 à 19, 20 à 59, 60 à 99. Pas de variation en lettres (autre point).
- C2 **CP-044** « Pose la somme » (pièces et billets, niveau 6) : jusqu'à 10 € en pièces (réserve 1 2 5), 11 à 50 € (réserve 1 à 20 €), « sans pièce de 1 € » (réserve 2 5 10 20, 11 à 49 €).
- C3 **CP-071** « Rends la monnaie » (rendre la monnaie, niveau 2) : les tirages de M5, l'élève pose ce qu'il rend (réserve 1 2 5 10).
- C4 **CP-045** « Paie tes achats » (pièces et billets, niveau 7) : un objet (5 à 50 €) ; deux objets (10 à 30 € + 2 à 9 €), il additionne puis paie.
- Question d'accès : personne ne gagne ni ne perd d'accès (reco suivie par David, AVANT le SQL).
- Phase 0 : je proposais « niveaux 1 à 3 » pour C1 en même temps que « 4 modèles » : C1 est UN modèle (niveau 1) à trois variations.

## 4 sexdecies. Skill réutilisable : décisions (David, 2026-10-26)

- Forme : skill `couvrir-niveau` (le déroulé) + doc `docs/pratiques/couvrir-un-niveau.md` (fait foi) ; 100 % doc, commit direct.
- Les scripts de page à cocher et de publication deviennent réutilisables sous `scripts/questions/`, dans une PR à part, après la doc.
- Le skill comprend la **création des outils qui manquent** (nouveaux blocs, gestes de réponse), en chantiers à part (question de David).
- Vérifications manuelles reportées par David.

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
- 2026-10-25 : groupe A découpé (§ 4 ter) ; lot A1 : 6 modèles créés en brouillon (`create-questions`), #1712 (nœud + tag) mergée, `db:migrate`, vérifié en prod ; page à cocher publiée.
- 2026-10-25 : lot A2, phase 0 validée (§ 4 quater), 7 modèles écrits et verts (`checkTemplate`) ; bug `e` = Euler trouvé au rendu et corrigé.
- 2026-10-25 : A2, 7 brouillons créés en prod (`create-questions --publier`, go de David) ; question d'accès tranchée (personne ne gagne ni ne perd d'accès) ; migration nœud + tag et son test.
- 2026-10-25 : #1720 mergée, `db:migrate`, vérifié en prod ; page à cocher A2 publiée, relue 7/7 OK par David.
- 2026-10-25 : lot A4, phase 0 validée (§ 4 quinquies) ; 5 modèles écrits, specs vertes, rendu relu (accord « 1 bille » corrigé).
- 2026-10-25 : A4, 5 brouillons créés en prod (`create-questions --publier`, go de David), vérifiés.
- 2026-10-25 : A4, tag double refusé par la base (ADR 0020) ; option A : 2 brouillons mis à jour, 2 créés (7 modèles) ; migration nœud + tag et test, rouge puis vert.
- 2026-10-25 : #1728 mergée, `db:migrate`, vérifié en prod ; descriptions de `a59fba89` et `c342f32e` corrigées (`--mettre-a-jour` réécrit désormais la description) ; page à cocher A4 publiée.
- 2026-10-25 : page à cocher A4 relue par David, 7/7 OK.
- 2026-10-25 : lot A5, phase 0 validée (§ 4 sexies), worktree `../ubumaths-wt-questions` (`feat/questions-a5`).
- 2026-10-25 : A5, 4 modèles écrits (specs vertes, rendu relu), 4 brouillons créés en prod (go de David) ; migration nœud + tag et test, rouge puis vert.
- 2026-10-25 : #1736 mergée ; page à cocher A5 publiée, relue 4/4 OK par David ; `db:migrate` en attente de la question d'accès.
- 2026-10-25 : question d'accès A5 tranchée par David ; `db:migrate`, vérifié en prod (4 modèles sur leur sous-notion, 1 tag chacun).
- 2026-10-25 : lot A3, phase 0 validée (§ 4 septies), worktree `../ubumaths-wt-questions` (`feat/questions-a3`) ; 6 modèles écrits, 59 specs vertes, rendu relu (accords et corrigés retouchés).
- 2026-10-25 : A3, 6 brouillons créés en prod (`create-questions --publier`, go de David), vérifiés sans nœud ni tag ; migration nœud + tag et test, rouge puis vert.
- 2026-10-25 : #1744 mergée ; page à cocher A3 publiée ; `db:migrate` en attente de la question d'accès.
- 2026-10-25 : question d'accès A3 tranchée par David (personne) ; `db:migrate` joué, vérifié en prod (6 modèles sur « ordinaux et rangs », 1 tag chacun, `updated_at` inchangé, triggers actifs).
- 2026-10-25 : lot A6, phase 0 validée (§ 4 octies), worktree `../ubumaths-wt-questions` (`feat/questions-a6`).
- 2026-10-25 : A6, 9 modèles écrits, 87 specs vertes, rendu relu (trait d'union au singulier, « qu'une », corrigé des moments retouchés).
- 2026-10-25 : A6, 9 brouillons créés en prod (`create-questions --publier`, go de David), vérifiés sans nœud ni tag ; migration nœud + tag et test, rouge puis vert.
- 2026-10-25 : A6, PR #1753 ; audit sécurité non bloquant (garde « déjà tagué » inatteignable seule : la base refuse un tag sans nœud, testé) ; page à cocher A6 publiée.
- 2026-10-25 : page à cocher A6 relue par David, 8/9 OK ; « Écrire un nombre en lettres » à revoir (leurres sans enjeu) → leurres d'orthographe, de forme et de numération, brouillon mis à jour en prod (go de David), verdict remis à zéro.
- 2026-10-25 : #1753 mergée ; question d'accès A6 tranchée par David (personne) ; `db:migrate` joué, vérifié en prod (9 modèles sur le nœud de leur point, 1 tag chacun, statut brouillon, trigger actif). Groupe A complet.
- 2026-10-25 : lot H, phase 0 validée (§ 4 decies), worktree `../ubumaths-wt-questions` (`feat/questions-h`) ; 3 modèles écrits, 21 specs vertes, rendu relu (singulier « 1 heure », variable `h` renommée `n` : la lettre « h » des valeurs était remplacée).
- 2026-10-25 : H, 3 brouillons créés en prod (`create-questions --publier`, go de David : `9780d3c1`, `f1759d81`, `0f7381e6`), vérifiés sans nœud ni tag ; question d'accès tranchée (personne) ; migration `20261026130000` nœud + tag et test, rouge (5/9) puis vert.
- 2026-10-25 : H, audit sécurité sans finding bloquant (⚠️ `20261026120000_demo_scripts_prof_seul` est sur `main` et pas jouée en prod : un `db:migrate` la jouerait aussi) ; page à cocher H publiée : https://claude.ai/artifact/PG6EhGTHaAkTiEkSSst4st (collection `verdicts`).
- 2026-10-25 : #1759 mergée (CI verte) ; `db:migrate` en attente (migration demo_scripts en file, à lancer par David).
- 2026-10-25 : `db:migrate` lancé par David (demo_scripts + lot H), vérifié en prod : 3 modèles H sur leur sous-notion, 1 tag chacun ; 5 scripts de démo au prof, 0 à l'admin. Page à cocher H relue : 3/3 OK.
- 2026-10-25 : relevé des pages : `92c8e499` (A6) OK depuis 14 h 22 → A6 9/9 OK ; A3 toujours sans verdict.
- 2026-10-25 : page A3 relue par David, 6/6 OK. Tous les brouillons du chantier (A1 à H) sont validés.
- 2026-10-25 : validation des figures faites par l'élève passée au conseil ; verdict consigné ([geometrie-validation](geometrie-validation-progress.md)) et suivi par David : 008 → réponses à placer, 058 à réexaminer (§ 3, § 4 nonies).
- 2026-10-25 : case « figure », phase 0 de CP-059 écrite en brouillon ([geometrie-validation](geometrie-validation-progress.md)), 8 questions à David ; CP-034 à réexaminer (« comparer », pas « reporter »).
- 2026-10-25 : phase 0 de CP-059 validée par David ([geometrie-validation](geometrie-validation-progress.md), 8 décisions) ; modèles 059/060 dans le chantier figure.
- 2026-10-25 : § 2 bis / 2 ter (case « figure ») déplacés dans [geometrie-validation](geometrie-validation-progress.md).
- 2026-10-25 : lot B1, phase 0 validée (§ 4 undecies), worktree `../ubumaths-wt-questions` (`feat/questions-b1`) ; 3 modèles écrits, 16 specs vertes, rendu relu à 390 px (cases `[_]` → `$?$` : le champ texte débordait ; « la ligne de Inès » → Lina).
- 2026-10-25 : B1, 3 brouillons créés en prod (`create-questions --publier`, go de David : `7752c23e`, `76d14aa6`, `55662eef`), vérifiés sans nœud ni tag ; question d'accès tranchée (personne) ; migration `20261026140000` nœud + tag et test, rouge (5/9) puis vert.
- 2026-10-25 : #1763 mergée (CI verte, audit sécurité sans finding bloquant) ; `db:migrate` joué, vérifié en prod (3 modèles B1 sur leur sous-notion, 1 tag chacun) ; page à cocher B1 publiée.
- 2026-10-25 : page à cocher B1 relue par David, 3/3 OK.
- 2026-10-25 : lot B2, phase 0 validée (§ 4 duodecies ; CP-035 rattrapé, oublié du plan), worktree `../ubumaths-wt-questions` (`feat/questions-b2`).
- 2026-10-25 : B2, 10 modèles écrits, 76 specs vertes ; rendu relu à 390 px en base locale : étiquettes S0-S2 qui donnaient la réponse masquées, texte sur fond olive illisible (contours seuls), lettres des points mêlées aux lettres du QCM (numéros), `str.format` qui mangeait les `{{if:…}}` des prénoms, « une maison faite », « 1 triangles » évité.
- 2026-10-25 : B2, 10 brouillons créés en prod (`create-questions --publier`, go de David), vérifiés sans nœud ni tag ; question d'accès tranchée (personne) ; migration `20261026150000` nœud + tag et test, rouge (3/9) puis vert.
- 2026-10-25 : B2, audit sécurité de la migration sans finding bloquant (même structure que B1, 10 lignes exactement, rollback juste).
- 2026-10-25 : #1772 mergée (CI verte) ; `db:migrate` joué depuis le dépôt principal (le worktree n'est pas lié à Supabase), vérifié en prod : 10 modèles B2 sur leur sous-notion, 1 tag chacun ; page à cocher B2 publiée (figures dessinées par `figureToSvg`, script `_page-b2.mts` du scratchpad).
- 2026-10-25 : page à cocher B2 relue par David, 10/10 OK.
- 2026-10-25 : lot B3, phase 0 validée (§ 4 terdecies), worktree `../ubumaths-wt-questions` (`feat/questions-b3`) ; 7 modèles écrits, 66 specs vertes (simulation) ; rendu relu à 390 px : tirets des ellipses cachées faits main, équateur de la boule en 16 segments, face en bleu translucide, fenêtres resserrées.
- 2026-10-25 : B3, 7 brouillons créés en prod (`create-questions --publier`, go de David), vérifiés sans nœud ni tag ; migration `20261026160000` nœud + tag et test, rouge (5/9) puis vert ; question d'accès posée APRÈS l'écriture du SQL (écart à `CLAUDE.md`, signalé à David).
- 2026-10-25 : #1777 mergée (CI verte ; audit sécurité sans finding bloquant) ; `db:migrate` en attente de la question d'accès ; page à cocher B3 publiée.
- 2026-10-25 : question d'accès B3 tranchée par David (personne) ; #1779 (ligne « Accès » de la migration) mergée ; `db:migrate` joué depuis le dépôt principal, vérifié en prod : 7 modèles B3 sur leur sous-notion, 1 tag chacun, en brouillon.
- 2026-10-25 : page à cocher B3 relue par David : 7/7 « ok », aucun commentaire.
- 2026-10-25 : publication des 62 brouillons CP (go de David) par `publishTemplates` (script du scratchpad, même contrôle que l'admin) : 43 publiés, 19 refusés pour collision de catégorie (même sous-notion, niveau 1 partout), restés en brouillon.
- 2026-10-25 : « Combien de formes dans le dessin ? » n'est pas une propriété (David) : option A, nouvelle sous-notion « reconnaître et nommer des formes » pour CP-054/055 ; question d'accès tranchée AVANT le SQL (personne) ; niveaux validés ; migration `20261026170000` et test, rouge (9/11) puis vert (11/11).
- 2026-10-26 : #1785 — revue (Opus) et audit sécurité sans finding bloquant, mineurs corrigés ; CI rouge au premier passage (5 fichiers : la base de CI porte la migration, copies figées de l'arbre et des points, test B2) → chaînage par `LATER` et copies mises à jour, 102 tests verts en local migration jouée ; mergée, `db:migrate` (`--include-all`), vérifiée ; 19 modèles publiés (0 refus) : 62/62 CP publiés.
- 2026-10-26 : lot M (monnaie), phase 0 validée (§ 4 quattuordecies), worktree `../ubumaths-wt-questions` (`feat/questions-monnaie`).
- 2026-10-26 : M, 6 modèles écrits (`lot-m.py` → `scripts/questions/cp-m/`), 33 specs vertes ; 600 tirages sondés (blocs sans erreur, réponses = dessin, montants des leurres dans le corrigé) ; rendu relu à 390 px en base locale : montants en `$n~\unit{€}$` (« € » seul à la ligne avec une espace, même insécable), accords au singulier, case de M4 sans accord, **corrigé de M3 faux quand le bon porte-monnaie n'a pas de pièce de 1 € (n − 1 deux fois) corrigé**.
- 2026-10-26 : M, 6 brouillons créés en prod (`create-questions --publier`, lancé par David : le classifieur du mode auto refuse l'écriture en prod), vérifiés sans nœud ni tag, niveaux 1 à 5 ; aucun modèle publié sur ces sous-notions ; migration `20261026200000` nœud + tag et test, rouge (5/9) puis vert (9/9).
- 2026-10-26 : #1796 mergée (CI verte, audit sécurité sans finding bloquant) ; `db:migrate` joué depuis le dépôt principal, vérifié en prod : 6 modèles M sur leur sous-notion, 1 tag chacun, en brouillon, `updated_at` inchangé. Défaut du bloc relevé : dessin trop petit dans un choix de QCM → `fix/monnaie-qcm-taille` (10 cm, go de David).
- 2026-10-26 : `fix/monnaie-qcm-taille` — dessin de monnaie d'un choix de QCM 6 → 10 cm partout (écran, série figée, PDF ; go de David). À 390 px la colonne d'un choix (196 px) ramenait seuls les choix larges : **échelle commune par QCM** (`monnaieChoiceSize`, `min(10cm, 100cqw / r)`, choix de David) dans la saisie, le corrigé et les aperçus ; au corrigé, l'étiquette « bonne réponse » d'un choix dessiné passe sous le dessin (elle rétrécissait sa ligne). Tests rouges sans le correctif (mutations), verts avec ; captures avant / après 390 px clair et sombre.
- 2026-10-26 : #1804 mergée (CI verte ; job d'intégration suivi par son run, `gh pr checks --watch` rendait la main avant la fin). `fix/questions-monnaie-corrige` : 4 phrases des corrigés du lot M sans « : » juste après un montant (il passait seul à la ligne) ; 3 brouillons à mettre à jour en prod (`--mettre-a-jour`, par David).
- 2026-10-26 : #1806 mergée ; worktree retiré.
- 2026-10-26 : 3 brouillons M mis à jour en prod (`--mettre-a-jour`, lancé par David), vérifiés : corrigés neufs, brouillon, nœud et tag inchangés.
- 2026-10-26 : page à cocher du lot M publiée : https://claude.ai/artifact/NnyA2gEWarz8r3fwjGFhmg (collection `verdicts`) ; un exemple par variation (17), tiré par le vrai générateur, pièces et billets dessinés par `buildMonnaieScene` (script `page-m.mts` du scratchpad), relue à 390 px.
- 2026-10-26 : page à cocher du lot M relue par David : 6/6 « ok », aucun commentaire.
- 2026-10-26 : `deploy:prod` v0.50.0 (demandé par David) ; 6 brouillons M publiés (`publishTemplates`, script `publier-m.mts` du scratchpad, lancé par David), 0 refus, statut `published` relu en base : 68/68 CP publiés.
- 2026-10-26 : lot C (construire), phase 0 validée (§ 4 quindecies) ; 4 brouillons « VERIF construire » de la base locale supprimés (go de David) ; worktree `../ubumaths-wt-questions` (`feat/questions-construire`) ; 4 modèles écrits, `checkTemplate` vert, créés en brouillon en base locale.
- 2026-10-26 : #1830 mergée (fichiers du lot C ; CI verte ; revue : aucune, contenu) ; modèles joués dans l'aperçu admin en base locale, juste et faux, pour les 4.
- 2026-10-26 : `deploy:prod` v0.51.0 (lancé par David) ; 4 brouillons C créés en prod (`create-questions --publier`, lancé par David : `ded05f7c`, `541b3209`, `8f587948`, `7be00c4a`), vérifiés : brouillon, sans nœud ni tag, niveaux 1, 6, 7 et 2 ; migration `20261026210000` nœud + tag et test, rouge (2/9) puis vert (9/9) ; #1832.
- 2026-10-26 : #1832 mergée (CI verte au 2e essai : un job navigateur annulé ; audit sécurité sans bloquant) ; `db:migrate` joué depuis le dépôt principal, vérifié en prod : 4 modèles C sur leur sous-notion, 1 tag chacun, en brouillon, `updated_at` inchangé.
- 2026-10-26 : page à cocher du lot C publiée : https://claude.ai/artifact/Ve9QRxVDiqSuYnbg3D12gp (collection `verdicts`) ; un exemple par variation (11), tiré par le vrai générateur ; réserve, plan vide et construction juste dessinés par les scènes `collection` / `monnaie` (script `page-c.mts` du scratchpad), relue à 390 px.
- 2026-10-26 : page à cocher du lot C relue par David, 4/4 « ok », aucun commentaire ; 4 brouillons C publiés (`publishTemplates`, script `publier-c.mts` du scratchpad, lancé par David), 0 refus, statut `published` relu en base : 72 modèles CP publiés pour ce chantier.
- 2026-10-26 : skill `couvrir-niveau` et doc `couvrir-un-niveau.md` écrits (§ 4 sexdecies), création d'outils comprise ; § 5 versé dans la doc.
