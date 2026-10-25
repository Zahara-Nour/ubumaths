# Chantier « questions » — compléter les modèles pour couvrir les programmes (CP d'abord)

## Reprendre ici

_Mis à jour le 2026-10-25, lot B1 en cours (brouillons créés, PR à ouvrir)._

- **État** : groupe A et lot H en prod (brouillons validés). **Lot B1** (tableaux, § 4 undecies) : 3 brouillons créés en prod (go de David : `7752c23e` CP-068, `76d14aa6` CP-069, `55662eef` CP-084), vérifiés sans nœud ni tag ; migration `20261026140000` nœud + tag et test, rouge (5/9) puis vert.
- **Prochaine action** : PR B1, CI, audit sécurité, merge → `db:migrate` (question d'accès tranchée : personne) → page à cocher B1 ; puis phase 0 de B2 (reconnaître sur une figure ; CP-034 y viendra si David le range en QCM sur figure).
- **En attente de David** : publication A1 à H (et B1) en un lot ; vérification manuelle #1702 ; les 8 questions de phase 0 de la case « figure » (session `geometrie-validation`, § 2 ter).
- **Pièges en cours** : un modèle porte au plus UN point par programme (ADR 0020) ; un modèle est QCM OU à cases ; **case dans un tableau = `$?$` (un `[_]` déborde au téléphone)** ; **un prénom rangé dans une variable est relu comme un nom de variable : l'écrire dans le texte** ; le moteur ne mélange pas : indicatrices de Lagrange ; ne pas nommer une variable comme une lettre du texte ; jamais de variable `e` ; corps de commit ≤ 100 caractères par ligne ; la base refuse un tag sur un modèle sans nœud.
- **Worktree / branche** : `../ubumaths-wt-questions` · `feat/questions-b1`.
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

### Verdict du conseil (2026-10-25) — remplace le « cœur » proposé ci-dessus

Proposition passée au conseil (5 conseillers + relecture croisée anonyme). Ce qui change :

- **Pas de vérifications « il existe » au CP** : avec l'aimantation obligatoire, chaque point de l'élève est sur un nœud ;
  on retrouve ses objets **par leurs coordonnées**, plus de problème d'identifiants. « Il existe » → collège.
- **Vérifier des propriétés, pas comparer à UNE figure attendue** : plusieurs bonnes réponses sont possibles (carré
  construit d'un côté ou de l'autre de [AB]). Ex. : 4 sommets sur des nœuds, côtés égaux, angles droits. Les `check*`
  de `checks.ts` resservent si on les fait porter sur des positions plutôt que sur des identifiants.
- **Questions ouvertes tranchées par le conseil** : juger le **résultat** (pas la manière) ; **tout-ou-rien** avec message
  précis sur la première vérification échouée ; **liste nommée** de vérifications (DSL quand deux vrais modèles l'exigeront).
- **Découpage** : CP-059 seul de bout en bout sur tablette → CP-060 → CP-034. **CP-008** sort vers les « réponses à
  placer » (§ 3.4) ; **CP-058** à réexaminer (pas forcément une figure). Tolérance et test « en bougeant les points » :
  collège (sans objet au CP avec aimantation).
- **Ordre des chantiers inchangé** (§ 4 bis). Journal des gestes, note partielle, DSL dès le lot 1 : écartés pour
  l'instant (périmètre ; enregistrer des gestes contredirait « aucune réponse d'élève conservée »).
- **Angles morts à traiter en phase 0** : le prof qui écrit le modèle (exemple, temps d'écriture) ; l'enfant de 6 ans
  (précision au doigt, consigne mal lue, message d'échec, indice, reprise d'une figure à moitié faite) ; exercice rendu
  trivial par quadrillage + aimantation + peu d'outils ; alternative d'une grille cliquable (CP-060).
- Écartés après vérification : « la figure attendue est visible côté client » (vrai de toutes les questions, décision
  figée) ; « geometry-core tourne-t-il dans le navigateur ? » (oui, l'atelier l'utilise).
- **Première action du chantier** : en phase 0, écrire le modèle CP-059 tel que le prof l'écrirait et ce que voit
  l'enfant (consigne, outils, réussite, erreur, blocage), avant toute ligne de code.

## 2 ter. Case « figure » : phase 0 de CP-059 (brouillon du 2026-10-25, à valider)

Écrite avant le chantier (qui reste après B1 → B3) pour que sa phase 0 soit prête. Rien n'est codé.

**Le programme** (`docs/systeme/programmes/bornes/cycle2.md`) : CP-059 « Utiliser la règle comme instrument de tracé » —
« tracer une droite passant par deux points ; horizontale, verticale ou oblique ». Limite assumée : à l'écran on n'évalue
pas le maniement de la règle, seulement « la droite passe par les deux bons points ».

**Ce que le prof écrit** (proposition ; même format JSON que `scripts/questions/cp-h/`) — un bloc neuf ` ```construction `
qui est à la fois la figure de départ et la case réponse :

````text
Trace la droite qui passe par les points {{p}} et {{q}}.

```construction
fenetre: 0 ; 10 ; 0 ; 6
outils: droite
verifier: droite_par {{p}} ; {{q}}
---
A = point({{xa}}, {{ya}})
B = point({{xb}}, {{yb}})
C = point({{xc}}, {{yc}})
```
````

- Trois variations, comme le dit le programme : horizontale, verticale, oblique (tirage de points entiers, conditions :
  points distincts, assez éloignés, dans la fenêtre).
- Un **point en plus** (C) que l'élève ne doit pas prendre : sans lui, avec un seul outil et l'aimantation, il ne peut
  pas se tromper (angle mort « exercice trivial » du conseil).
- `verifier:` = liste nommée ; `droite_par P ; Q` cherche, parmi les droites tracées par l'élève, une droite alignée avec
  P et Q, en comparant des **positions**. Les `testSpecs` donnent la figure de l'élève (objets tracés) et le verdict attendu.

**Ce que voit l'enfant** (tablette d'abord) :

- la consigne en une ligne ; la figure en grand, points en croix nommées ;
- pas de barre d'outils : un seul outil, déjà choisi ; un bouton « Effacer » (annule le dernier trait) et « Valider » ;
- il touche un point puis un autre ; près d'un point donné, le doigt est **aimanté** sur lui (`snapToPoint` existe) ;
  ailleurs, le trait part de l'endroit touché (il peut donc se tromper) ; la droite tracée dépasse des deux côtés ;
- réussite : la droite passe en vert, « Bravo » ;
- erreur : message de la vérification ratée + la bonne droite en pointillés par-dessus ;
- rien tracé + Valider : « Tu n'as rien tracé. » (refus ou faute : à trancher, Q6).

**Comportements (nominal / limite / erreur)** :

| Ce que trace l'élève                 | Verdict | Message                                    |
| ------------------------------------ | ------- | ------------------------------------------ |
| droite par A et B (ou B et A)        | juste   | Bravo                                      |
| droite par A et B + un autre trait   | Q5      | —                                          |
| droite par A et C (le point en plus) | faux    | « Ta droite passe par A et C, pas par B. » |
| droite par A et un point proche de B | faux    | « Ta droite ne passe pas par le point B. » |
| rien                                 | Q6      | « Tu n'as rien tracé. »                    |

**Constaté en écrivant** : CP-034 est « Comparer des segments selon leur longueur » (par superposition, report,
règle graduée), pas « reporter une longueur » comme noté au § 2 bis : comme 058, il est peut-être un QCM sur une figure
(lot B2) plutôt qu'une construction. À réexaminer.

**Questions à David** :

1. **Droite ou segment au CP ?** Le programme dit « droite » (le trait dépasse les points). Outil « droite » seul ?
2. **Geste** : toucher A puis B, ou glisser le doigt de A à B (plus proche du geste de la règle) ?
3. **Quadrillage** pour 059, ou feuille blanche (le quadrillage donne l'horizontale et la verticale gratuitement) ?
4. **Point en plus** (C) : d'accord ? Un ou deux ?
5. **Trait en trop** (la bonne droite + une autre) : ignoré ou faute ?
6. **Valider sans rien tracer** : bouton grisé, ou réponse fausse ?
7. **Temps** : les modèles CP ont un `delay` (30 s pour l'horloge). Quel temps pour tracer ? Pas de lecture à voix haute
   dans l'appli (aucun `speechSynthesis`) : la consigne se lit seule ou avec l'adulte.
8. **Format** : un bloc ` ```construction ` (figure et réponse ensemble), ou une case `[_]` qui renvoie à un bloc
   ` ```figure ` ?

## 3. Outils proposés

1. Bloc `horloge` (cadran paramétrable ; CP heures entières, puis minutes CE1/CE2) — recommandé en premier.
2. Bloc `collection` (vrac, barres de dix + cubes, groupements partiels).
3. Bloc `monnaie` (pièces et billets d'euros).
4. Plus tard : réponses à placer (point sur la droite, étiquettes à ranger, aiguilles) — reçoit **CP-008** (verdict du conseil, § 2 bis, suivi par David le 2026-10-25).
5. **Case « figure »** (§ 2 bis, verdict du conseil) : objets de l'élève retrouvés par leur position sur les nœuds, vérification de propriétés en tout-ou-rien ; CP-059 d'abord, puis 060, puis 034.
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
3. **Groupe B inséré avant la case « figure »** (aucun outil neuf), trois lots : **B1** tableaux (068, 069, 084) → **B2** reconnaître sur une figure, affichage seul (054-056, 057, 061, 062, 067) → **B3** images fixes (049-052, 040). 034 (avec 059, 060) reste pour la case « figure » ; **008** passe aux « réponses à placer » (§ 3.4) et **058** est à réexaminer (pas forcément une figure) — David suit le verdict du conseil (§ 2 bis), 2026-10-25.
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
- 2026-10-25 : validation des figures faites par l'élève passée au conseil ; verdict consigné (§ 2 bis) et suivi par David : 008 → réponses à placer, 058 à réexaminer (§ 3, § 4 nonies).
- 2026-10-25 : case « figure », phase 0 de CP-059 écrite en brouillon (§ 2 ter), 8 questions à David ; CP-034 à réexaminer (« comparer », pas « reporter »).
- 2026-10-25 : lot B1, phase 0 validée (§ 4 undecies), worktree `../ubumaths-wt-questions` (`feat/questions-b1`) ; 3 modèles écrits, 16 specs vertes, rendu relu à 390 px (cases `[_]` → `$?$` : le champ texte débordait ; « la ligne de Inès » → Lina).
- 2026-10-25 : B1, 3 brouillons créés en prod (`create-questions --publier`, go de David : `7752c23e`, `76d14aa6`, `55662eef`), vérifiés sans nœud ni tag ; question d'accès tranchée (personne) ; migration `20261026140000` nœud + tag et test, rouge (5/9) puis vert.
