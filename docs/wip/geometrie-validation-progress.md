# Chantier « geometrie-validation » — valider une figure faite par l'élève (case « figure »)

## Reprendre ici

_Mis à jour le 2026-10-26, après #1809._

- **État** : CP-059, CP-060, CP-058 mergés (#1793, #1798), pas en prod ; garde des tirages (#1805) ; côté donné
  prolongé, carré et rectangle, message à part (#1809, § 12).
- **Prochaine action** : réponse de David sur la « figure de travail » (ci-dessous), puis sa phase 0 si go.
- **En attente de David** : (1) fin de l'essai de CP-060 et CP-058 (`docs/wip/verifications-manuelles.md`) ;
  (2) message du carré décalé qui chevauche [AB] (§ 12) ; (3) **figure de travail** (idée de David) : figure
  manipulable NON notée dans l'énoncé (outils limités, ex. droites seules), réponse à côté, QCM compris → CP-058 en
  QCM oui / non. À trancher : geste plus vérifié ? tracé gardé dans la copie ? un bloc figure ou un bloc à part
  (`deplacable:` réservé aux figures stockées, ADR 0027) ? Reco : chantier à part ; **ne pas publier CP-058 en l'état**.
- **Pièges en cours** : lettres impossibles en valeurs de variables (§ 6) ; limites connues de CP-060 au § 9 et § 12.
- **Worktree / branche** : aucun (retiré après #1809).

## 1. Relevé : ce qui existe et ce qui manque (2026-10-24)

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

## 2. Verdict du conseil (2026-10-25) — remplace le « cœur » proposé au § 1

Proposition passée au conseil (5 conseillers + relecture croisée anonyme). Ce qui change :

- **Pas de vérifications « il existe » au CP** : avec l'aimantation obligatoire, chaque point de l'élève est sur un nœud ;
  on retrouve ses objets **par leurs coordonnées**, plus de problème d'identifiants. « Il existe » → collège.
- **Vérifier des propriétés, pas comparer à UNE figure attendue** : plusieurs bonnes réponses sont possibles (carré
  construit d'un côté ou de l'autre de [AB]). Ex. : 4 sommets sur des nœuds, côtés égaux, angles droits. Les `check*`
  de `checks.ts` resservent si on les fait porter sur des positions plutôt que sur des identifiants.
- **Questions ouvertes tranchées par le conseil** : juger le **résultat** (pas la manière) ; **tout-ou-rien** avec message
  précis sur la première vérification échouée ; **liste nommée** de vérifications (DSL quand deux vrais modèles l'exigeront).
- **Découpage** : CP-059 seul de bout en bout sur tablette → CP-060 → CP-034. **CP-008** sort vers les « réponses à
  placer » ([questions](questions-progress.md) § 3.4) ; **CP-058** à réexaminer (pas forcément une figure). Tolérance et test « en bougeant les points » :
  collège (sans objet au CP avec aimantation).
- **Ordre des chantiers inchangé** ([questions](questions-progress.md) § 4 bis). Journal des gestes, note partielle, DSL dès le lot 1 : écartés pour
  l'instant (périmètre ; enregistrer des gestes contredirait « aucune réponse d'élève conservée »).
- **Angles morts à traiter en phase 0** : le prof qui écrit le modèle (exemple, temps d'écriture) ; l'enfant de 6 ans
  (précision au doigt, consigne mal lue, message d'échec, indice, reprise d'une figure à moitié faite) ; exercice rendu
  trivial par quadrillage + aimantation + peu d'outils ; alternative d'une grille cliquable (CP-060).
- Écartés après vérification : « la figure attendue est visible côté client » (vrai de toutes les questions, décision
  figée) ; « geometry-core tourne-t-il dans le navigateur ? » (oui, l'atelier l'utilise).
- **Première action du chantier** : en phase 0, écrire le modèle CP-059 tel que le prof l'écrirait et ce que voit
  l'enfant (consigne, outils, réussite, erreur, blocage), avant toute ligne de code.

## 3. Phase 0 de CP-059 (VALIDÉE par David le 2026-10-25)

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
règle graduée), pas « reporter une longueur » comme noté au § 1 : comme 058, il est peut-être un QCM sur une figure
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

**Décisions de David (2026-10-25, « je suis tes recos »)** : (1) outil **droite** seul ; (2) **toucher** A puis B ;
(3) **feuille blanche**, sans quadrillage ; (4) **un** point piège ; (5) trait en trop = **faux** ; (6) Valider **grisé** tant
que rien n'est tracé ; (7) `delay` **60 s** ; (8) bloc ` ```construction ` (figure de départ et réponse ensemble). Les
modèles CP-059 / 060 s'écrivent **dans le chantier figure** (ils dépendent du bloc neuf), pas dans le chantier questions.
Le code attend toujours la fin de B1 → B3 ([questions](questions-progress.md) § 4 nonies).

## 4. Plan technique (VALIDÉ par David le 2026-10-25)

David ouvre le chantier tout de suite, sans attendre B1 → B3 (rien ne les lie, sauf CP-034 à trancher avant B2).
Précédent suivi : le bloc ` ```operation ` (le bloc porte sa case, la réponse attendue vient du bloc).

1. **PR 1 — moteur, sans écran** : bloc ` ```construction ` (en-tête comme ` ```figure ` + `outils:` / `verifier:`, `---`, DSL) ;
   une case par bloc (`assign-blank-indices`), réponse attendue calculée par le bloc ; réponse élève = chaîne de
   coordonnées (`droite(2;3;7;3)`), bornée par Zod ; juge pur `src/lib/questions/construction/` dans `validateSingleBlank`
   (positions, tout-ou-rien, messages du § 3), aussi côté serveur (évaluations notées).
2. **PR 2 — écran élève** : tracé dans `FillBlanksInput` (toucher A puis B, aimantation, Effacer, Valider grisé), résultat
   (droite verte / bonne droite en pointillés) ; rendu statique hors saisie et **PDF : figure de départ seule** (corrigé : la bonne droite).
3. **PR 3 — modèle CP-059** (3 variations, `delay` 60 s), fiche du catalogue des blocs, doc système.

Revue : `code-reviewer` en Opus (correction des réponses).

**Décisions** : trait en trop → « Tu as tracé une droite de trop. » ; PDF → figure de départ seule ; 3 PR.

**Nom du bloc (David, 2026-10-25)** : ` ```figure-a-completer `. « construction » désigne déjà les constructions animées
(table `constructions`, `/constructions`, ressource `construction`) ; « figure interactive » les figures enregistrées
(ADR 0027 : on explore, rien n'est jugé) ; `geometrie` se confondait avec ` ```figure `. Entrée « Figure à compléter » dans `CONTEXT.md`.

**Positions des points (David, 2026-10-25)** : un **registre**, comme le PDF des figures (`figure-typst-registry.ts`),
plutôt qu'une lecture légère (`point(x, y)` seulement) ou un import direct de geometry-core. Mesuré (esbuild, minifié) :
générateur + juge 1,82 Mo ; avec l'interpréteur 2,25 Mo (+430 Ko, +110 Ko gzip, +24 %) ; avec le registre +11 Ko.
Scinder geometry-core : écarté (interpréteur d'un seul tenant, `builtins.ts` 200 Ko).

**Écarts au plan, à signaler** : ` ```construction ` est reconnu par le repérage de ` ```figure ` (`figure-parser.ts`
touché : regex d'ouverture + aiguillage de `parseFigure`), pour ne pas dupliquer les six repérages du parseur ;
` ```figure ` inchangé (tests). Message ajouté hors tableau : « Ta droite ne passe ni par le point A, ni par le point B. » ;
plusieurs vérifications : « Il manque la droite qui passe par A et C. »

## 5. PR 2 — écran élève (phase 0 VALIDÉE par David le 2026-10-25, « tes recos »)

**Technique** : pas `GeometryCanvas` (mathlive, roughjs, store, outils) : le SVG de `FigureBlockView` (même dessin
qu'en statique et qu'au PDF) reçoit une couche `overlay` ; la vue de saisie `FigureACompleterView` est chargée à la
demande par `FigureBlock` (`answer` ou `showSolution`) et inscrit `positions-setup`. Logique pure :
`questions/construction/drawing.ts`.

| Situation                                      | Ce que voit l'enfant                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| 1er toucher près d'un point (24 px à l'écran)  | aimanté sur le point, rond de départ                                  |
| 1er toucher ailleurs                           | départ à l'endroit touché (arrondi au centième d'unité)               |
| 2e toucher                                     | la droite par les deux, jusqu'aux bords de la fenêtre                 |
| 2e toucher sur le départ                       | rien                                                                  |
| Effacer                                        | le départ en attente, sinon la dernière droite ; grisé si rien        |
| au-delà des plafonds du juge (20, 1 000 car.)  | la droite n'est pas ajoutée                                           |
| clavier                                        | points nommés = boutons (Tab, Entrée / Espace)                        |
| Valider, juste                                 | ses droites en vert                                                   |
| Valider, faux                                  | message du juge + bonne droite en pointillés ; ses droites restent    |
| mode correction / carte flash / statique / PDF | bonne droite / figure de départ / figure de départ / figure de départ |

**Décisions** : (1) SVG + couche ; (2) clavier oui ; (3) copie corrigée et résultats du prof en figure → PR 3 ;
(4) faux : ses droites gardent leur couleur, la bonne en pointillés (§ 3). Q3/Q4 sans reco de ma part : choix « sans
changement », signalé à David.

**Constaté** : le corrigé PDF d'une question n'existe que dans les séries (`serie-automatismes.ts`), qui refusent
déjà les cases portées par un bloc (```operation compris) → PR 3, à trancher.

**Revue (#1775, Opus)** : 3 à corriger + 4 mineurs, corrigés dans la PR (rôle `group` en saisie, départ lié au bloc,
tests du repère en cadre étroit et des bords, zone live permanente, type partagé) sauf un, **pour la PR 3** :
`CorrectionCard` recalcule le verdict côté client (`validateAnswerDetailed`) ; si la vue de saisie n'a pas été chargée
(rechargement de la page de résultats), « positions non inscrites » devient « faux » en silence. À garder par
`hasConstructionPositions()` (aucun appelant aujourd'hui) ou en important `positions-setup` sur cette page.

## 6. PR 3 — modèle CP-059, copie corrigée (2026-10-25)

**Modèle** (`scripts/questions/cp-figure/01-tracer-une-droite.json`, écrit par
`docs/wip/geometrie-validation/modele-cp059.py`) : « Trace la droite qui passe par deux points », `delay` 60 s,
3 variations (horizontale, verticale, oblique montante ou descendante), fenêtre 0..10 × 0..6, points entiers à 1 du
bord au moins. Les deux points à relier sont écartés (4 au moins en horizontale et en oblique, 2 au moins en verticale : la fenêtre fait 6 de haut ; 80 px à taille moyenne, l'aimantation prend le plus proche) ; le piège est à 2 au moins de la droite
(horizontale, verticale) ou à environ 1 (oblique : |produit vectoriel| ≥ 9) et à 3 (Manhattan) des deux points.
`k` (1..3) choisit la lettre du piège (C, B ou A) : les lettres ne pouvant pas être des valeurs de variables, les
positions sont tirées par **rôle** puis données aux lettres (`xa`…`yc`), et les lettres s'écrivent en `{{if:k==…}}`.
18 specs vertes (bonne droite, sens inverse, deux autres points de la droite ; piège, point voisin, trait en trop),
150 tirages sans échec (`create-questions` en simulation).

**Copie corrigée et verso** : ligne `figure` du résultat attendu, dessinée par `FigureAnswer.svelte` (droites de
l'élève vertes si juste ; sinon la bonne en pointillés ; sans réponse, la bonne droite) + message du juge ; consigne
seule au-dessus (`instructionOf` retire le bloc). Plus de `droite(2;3;8;3)` en texte.

**Garde de `CorrectionCard`** (revue de #1775) : sans positions inscrites, la carte charge
`positions-setup` à la demande (`loadConstructionPositions`) et n'affiche ni verdict ni attendu avant. Preuve
rouge : garde neutralisée → « juste » affiché « faux ».

**À trancher (David)** : corrigé PDF des séries — `serie-automatismes.ts` refuse toute case portée par un bloc
(```operation compris). Reco : laisser tel quel (une série d'automatismes CP en PDF n'est pas demandée) ; à rouvrir
avec les fiches CP.

**Décisions de David (2026-10-25, « je te suis »)** : question d'accès de la migration nœud + tag de CP-059 →
personne ne gagne ni ne perd d'accès ; **CP-034** couvert par le QCM du lot B2 (pas d'outil figure) ; **CP-058** = figure
à compléter (« Trace la droite (AB) ») + case texte oui / non (points presque alignés), phase 0 avec CP-060 ; corrigé
PDF des séries laissé tel quel ; Q3/Q4 du § 5 closes.

## 7. Phase 0 de CP-060 — compléter un carré / un rectangle sur quadrillage (2026-10-26, À VALIDER)

**Le programme** : « Sur quadrillage ou papier pointé, côtés suivant les lignes ; compléter un rectangle (deux côtés
consécutifs tracés) ou un carré (un côté tracé) ». Triangle, assemblages, gabarits : hors de ce modèle (Q1).

**Ce que le prof écrit** — même bloc, un outil et deux vérifications neufs :

````text
Termine le carré.

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 7
grille: 1
outils: segment
verifier: carre A ; B
---
A = point({{xa}}, {{ya}}, visible=faux)
B = point({{xb}}, {{yb}}, visible=faux)
s = segment(A, B)
```
````

Rectangle : « Termine le rectangle. », `[AB]` et `[BC]` tracés, `verifier: rectangle A ; B ; C`.

- `carre A ; B` : le côté donné et les segments de l'élève forment un carré de côté [AB], **d'un côté ou de l'autre**
  (deux bonnes réponses : on juge des propriétés, § 2). `rectangle A ; B ; C` : ils forment le rectangle ABCD
  (une seule réponse, D = A + C − B).
- Réponse élève : `segment(x1;y1;x2;y2)`, même format et mêmes plafonds que `droite(…)`.
- **Variations** : carré, côté de 2 à 4, donné horizontal ou vertical ; rectangle, côtés de 2 à 5 (inégaux), quatre
  coins possibles. Les deux carrés possibles tiennent dans la fenêtre (l'élève ne doit pas être bloqué par le bord).

**Ce que voit l'enfant** : quadrillage, le côté donné en trait épais, pas de lettres (Q2) ; un seul outil ; **chaque
toucher est aimanté sur le nœud le plus proche** (verdict du conseil : plus de toucher libre) ; toucher un nœud puis
un autre trace un segment ; Effacer = le dernier segment ; Valider grisé tant que rien n'est tracé.

**Comportements** (message = la première vérification ratée, dans cet ordre) :

| Ce que trace l'élève                                  | Verdict | Message                                                                |
| ----------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| les 3 côtés du carré, d'un côté ou de l'autre de [AB] | juste   | Bravo                                                                  |
| un côté en plusieurs morceaux (2 + 1 carreaux)        | juste   | — (Q3)                                                                 |
| un trait par-dessus le côté donné, en plus            | juste   | — (Q4)                                                                 |
| un trait oblique                                      | faux    | « Trace les côtés en suivant les lignes du quadrillage. »              |
| figure ouverte (un côté manque, ou trop court)        | faux    | « Ta figure n'est pas fermée. »                                        |
| fermée mais rectangle au lieu de carré                | faux    | « Ce n'est pas un carré : ses côtés n'ont pas tous la même longueur. » |
| la bonne figure + un trait ailleurs                   | faux    | « Tu as tracé un trait de trop. »                                      |

Rectangle : mêmes lignes sauf la sixième (avec les deux côtés donnés suivant les lignes, une figure fermée est le
bon rectangle). Faux → la (une) bonne figure en pointillés, ses traits restent (§ 5).

**Questions à David** :

1. **Périmètre** : carré + rectangle seulement ; triangle, assemblage, papier pointé plus tard ? (reco : oui)
2. **Lettres** : aucune au CP, le côté tracé suffit (reco) — ou A, B nommés comme en CP-059 ?
3. **Côté en morceaux** : accepté (reco : on juge le résultat, pas la manière) ou faux ?
4. **Trait repassé sur le côté donné** : ignoré (reco) ou « de trop » ?
5. **Carré faux** : quelle bonne figure en pointillés ? Reco : celle du côté où l'élève a le plus tracé, sinon au-dessus / à droite.
6. **Temps** : `delay` 90 s (reco ; 60 s pour une droite).
7. **Grille cliquable** (toucher le sommet manquant, piste du conseil) : écartée (reco) — « construire » = tracer les côtés.

## 8. Phase 0 de CP-058 — vérifier un alignement à la règle (2026-10-26, À VALIDER)

**Le programme** : « Dire si trois points sont alignés quand ce n'est pas évident à l'œil. » Décidé (§ 6) : figure à
compléter + case oui / non.

**Ce que le prof écrit** :

````text
Les points A, B et C sont-ils alignés ? Trace la droite (AB) pour vérifier.

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 6
outils: droite
verifier: droite_par A ; B
---
A = point(…) · B = point(…) · C = point(…)
```

Réponds oui ou non : [_]
````

- Feuille blanche (un quadrillage trahirait l'alignement), droite (AB) **oblique**, A et B écartés (6 au moins),
  C entre les deux, vers le milieu.
- **Deux variations** : C sur la droite (point entier : A(1;1), B(9;5), C(5;3)…) ; C **presque** dessus, décalé de
  0,25 carreau (Q3), invisible à l'œil, net une fois la droite tracée.
- Lettres : positions tirées par rôle, lettres en `{{if:…}}` comme CP-059 (piège du § 6).

**Constaté en écrivant** : une question est QCM **ou** à cases (`types.ts:144`), pas les deux ; il n'existe pas de
case à choix dans un énoncé. La réponse oui / non est donc une **case texte** que l'enfant tape (Q1). La case
« figure » mêlée à une autre case n'a encore servi dans aucun modèle (piège du § 6) : ce modèle sera le premier.

**Comportements** :

| L'élève                                     | Verdict | Message                                          |
| ------------------------------------------- | ------- | ------------------------------------------------ |
| trace (AB), répond juste                    | juste   | Bravo                                            |
| trace (AB) (ou A puis C quand C est dessus) | juste   | — (juge par positions, comme CP-059)             |
| trace (AB), répond faux                     | faux    | la bonne réponse                                 |
| trace (AC) quand C n'est pas dessus         | faux    | « Ta droite passe par A et C, pas par B. »       |
| répond sans tracer                          | Q2      | —                                                |
| tape « Oui », « OUI », « oui » avec espace  | juste   | — (à vérifier dans le validateur avant de coder) |

**Questions à David** :

1. **Oui / non tapé** au clavier de la tablette (reco : suffit pour l'instant, rien de neuf à coder) — ou une case à
   deux boutons « oui » / « non », à créer (outil réutilisable, plus lisible pour un enfant de 6 ans) ?
2. **Répondre sans tracer** : Valider grisé tant que la droite manque (reco : la consigne dit de tracer, c'est le
   geste qu'on évalue) — ou seule la réponse compte ?
3. **Écart** quand C n'est pas aligné : 0,25 carreau (reco, ~10 px à taille moyenne) ; plus petit = plus dur à voir
   même avec la droite.
4. **Temps** : `delay` 60 s, comme CP-059 (reco).

## 9. Décisions de David et plan de CP-060 (2026-10-26)

**Décisions (« je suis tes recos »)** — § 7 : (1) carré + rectangle seulement ; (2) aucune lettre ; (3) côté en
morceaux accepté ; (4) trait repassé sur le côté donné ignoré ; (5) carré faux → celui du côté où l'élève a le plus
tracé, sinon au-dessus / à droite ; (6) `delay` 90 s ; (7) grille cliquable écartée. § 8 : (1) oui / non tapé ;
(2) Valider grisé tant que la droite manque ; (3) écart 0,25 carreau ; (4) `delay` 60 s.

**PR 4 — CP-060 de bout en bout** (branche `feat/geometrie-validation-carre`) :

- **Moteur** : outil `segment` ; vérifications `carre A ; B` et `rectangle A ; B ; C` ; un seul outil par bloc, et
  l'outil va avec la vérification (segment ↔ carré / rectangle, droite ↔ `droite_par`), sinon erreur d'auteur ;
  réponse `segment(x1;y1;x2;y2)`, mêmes plafonds.
- **Juge** : les segments (côtés donnés compris) sont fusionnés par droite porteuse (morceaux, trait repassé) ; un
  rectangle candidat est « présent » si ses 4 côtés sont couverts ; ordre des messages du § 7. Ajout : un trait qui
  prolonge un côté → « Un de tes traits dépasse de la figure. » (plus juste que « de trop »).
- **Écran** : avec `segment` et une grille, chaque toucher va au nœud le plus proche ; le segment s'arrête à ses
  deux bouts ; clavier : à trancher en codant (les nœuds ne sont pas des points nommés).
- **Modèle** `scripts/questions/cp-figure/02-…` (carré, rectangle), catalogue, doc système. Revue Opus.

**Codé (2026-10-26)** : moteur (`construction/polygon.ts`), écran (nœuds, curseur clavier aux flèches), modèle
`scripts/questions/cp-figure/02-terminer-carre-rectangle.json` (écrit par `geometrie-validation/modele-cp060.py`,
3 variations, 22 specs, message de chaque spec vérifié), exemple sur `/dev/carte-question`.

**Revue Opus** : 1 à corriger — un trait aligné avec un côté, sans le toucher, passait pour juste (corrigé : « trait
de trop », 5 cas rouges avant) ; mineurs corrigés : auteur à sommets confondus → erreur d'auteur ; toucher au bord
hors des nœuds → nœud de la fenêtre ; curseur au clavier seulement (pas au clic) et annonce au lecteur d'écran ;
specs du modèle qui testaient « dépasse » sous le nom « de trop ». **Limites connues, laissées** : un carré fermé sur
une PARTIE du côté donné reçoit « pas fermée » (verdict juste, message imprécis) ; un sommet donné hors des nœuds
rend toute réponse fausse sans prévenir l'auteur (le modèle tire des entiers).

**PR 5 — CP-058** : modèle mixte (figure + case texte), Valider grisé tant que la figure est vide, casse de « oui ».

## 10. PR 5 — CP-058, figure + case oui / non (2026-10-26)

**Modèle** `scripts/questions/cp-figure/03-points-alignes.json` (écrit par
`docs/wip/geometrie-validation/modele-cp058.py`) : « Les points A, B et C sont-ils alignés ? Trace la droite (AB)
pour vérifier. » + « Réponds par oui ou par non : [_] », `delay` 60 s, feuille blanche. Deux variations : C au
milieu de [AB] (alignés, « oui ») ; C à 0,25 carreau au-dessus ou au-dessous (« non »). Droite oblique, écart
horizontal 6 ou 8 (A et B écartés), vertical 2 ou 4 ; `k` choisit la lettre du point à vérifier, comme CP-059.
11 specs vertes : « oui », « Oui », « OUI » avec espaces (la casse est ignorée, vérifié), droite par l'autre paire
de points quand ils sont alignés, réponse fausse, droite par le mauvais point, droite de trop ; 200 tirages.

**Trois correctifs d'écran** (tests `figure-a-completer-mixte.svelte.test.ts`, chacun rouge sans son correctif) :

1. **Valider n'était pas grisé à l'entraînement** : `FlashCard` accepte toute question à cases, même vide (voulu,
   pour « Tu n'as rien répondu. ») ; la décision « grisé tant que rien n'est tracé » (CP-059 Q6) ne valait qu'en
   évaluation (`QuestionCard`). Désormais une case « figure » vide grise Valider partout — Entrée dans la case
   texte ne valide plus non plus. Vaut aussi pour CP-059 et CP-060.
2. **Message global** : figure fausse → « Les blancs suivants sont incorrects: 1 » au lieu du message du juge
   (`aggregateOrderedBlanks`). Avec une case « figure » : le message du juge, ou aucun ; jamais de numéros.
3. **« Blanc 1 : Ta droite… »** sous l'énoncé (`FillBlanksInput`) : retiré pour la case « figure ».

**Revue Opus** : 3 mineurs corrigés — droite fausse et case texte vide : le message du juge passe avant « Tu
n'as pas tout complété. » (test rouge sans) ; « Blanc N » numéroté sans compter la figure ; attente avant de
constater l'absence de verdict. **À trancher (David)** : (1) en évaluation, « oui » tapé sans droite, envoyé à la
fin du test, vaut ½ point (`grading.ts`, cases à moitié vides) — reco : case « figure » vide = 0 ; (4) copie
corrigée : la réponse « non » s'affiche avant la figure (`expected-result.ts`, figure mise à part après l'énoncé
rempli) — reco : la figure d'abord, avec un test du rendu.

**Tranché par David (2026-10-26, « go » sur les recos)** : (1) case « figure » vide, le reste rempli → faux, 0
point, en évaluation (`gradeBlanks`) comme à l'entraînement (`aggregateOrderedBlanks`) ; la droite tracée et la
case texte vide restent à ½. (4) Copie corrigée : la figure d'abord (`expected-result.ts`), test du rendu
(`CorrectionCard`). Garde des tirages : PR à part, juste après. Publication de CP-058 / CP-060 : après le merge
et l'essai de David. Tests rouges sans les correctifs (montré).

**Piège trouvé, non corrigé** : `y3 = eval:(y1 + y2)/2 + h/4` donne `\dfrac{13}{4}` ; la figure ne se construit
pas (exception au jugement : toute réponse fausse) et pourtant 200/200 tirages « réussis » — les tirages ne
construisent pas la figure. Contourné (`{{ym}}.25`) ; noté dans la fiche du catalogue. Garde possible : faire
construire la figure à chaque tirage (`check-template`) — à proposer à David.

## 11. PR 6 — les tirages construisent la figure (2026-10-26)

`checkTemplate` construit, à chaque tirage, la figure de chaque case « figure » (`constructionPositions`,
même calcul que le juge) et vérifie les points de `verifier:` (`assertConstructionChecks`, `judge.ts` :
point sans position, sommets confondus, rectangle sans angle droit). Échec → tirage refusé, modèle NON
importable ; le rapport compte « Figures construites : n/N tirages ». Un point de `verifier:` absent du
texte de la figure était déjà refusé à la génération.

Mesuré : CP-059, CP-060, CP-058 → 150/150, 150/150, 100/100 figures ; CP-058 avec l'ancien
`y3 = eval:(y1 + y2)/2 + h/4` → 50/100, NON importable. 5 tests (`check-template-figure.test.ts`), 4 rouges
sans la garde.

**Revue (Sonnet)**, traitée : détail du premier échec de figure remonté à l'éditeur
(`templatePublicationErrors`) ; deux points de `droite_par` confondus = erreur d'auteur (toute droite par
l'un passait pour juste) ; `positions-setup` importé par `check-template` lui-même ; erreur hors auteur
dite « erreur inattendue » (refusée quand même, pas de plantage de la publication). 4 tests de plus (9),
dont 2 rouges sans leur correctif. Prod balayée : seul CP-059 (brouillon) porte une case « figure ».

## Journal

- 2026-10-24 : relevé « validation de figure élève » dans la géométrie (§ 1), au journal questions.
- 2026-10-25 : proposition passée au conseil ; verdict consigné (§ 2) et suivi par David : 008 → réponses à placer, 058 à réexaminer.
- 2026-10-25 : phase 0 de CP-059 écrite (§ 3) ; CP-034 à réexaminer (« comparer », pas « reporter »).
- 2026-10-25 : phase 0 de CP-059 validée par David (8 décisions) ; modèles 059/060 dans ce chantier.
- 2026-10-25 : § 2 bis / 2 ter sortis du journal questions vers ce journal.
- 2026-10-25 : chantier ouvert sans attendre B1 → B3 (David) ; plan en 3 PR validé (§ 4).
- 2026-10-25 : registre des positions décidé (David) ; PR 1 (moteur) codée, 46 tests neufs, suites voisines vertes.
- 2026-10-25 : revues (code Opus, sécurité) : 5 correctifs (point inconnu refusé à la génération, bloc non fermé = parseur, tolérance par la figure, messages à deux vérifications, `orderIndependent` refusé) ; #1768 mergée.
- 2026-10-25 : bloc renommé ` ```figure-a-completer ` (David) ; ` ```construction ` n'ouvre plus rien.
- 2026-10-25 : PR 2 (écran élève) : phase 0 validée (§ 5), codée ; 16 tests du tracé, 9 d'écran (rouges sans le branchement), 1 PDF.
- 2026-10-25 : revue Opus de #1775 : 6 points corrigés, 4 tests d'écran ajoutés (13), 1 point reporté à la PR 3.
- 2026-10-25 : PR 3 codée : modèle CP-059 (18 specs, 150 tirages), copie corrigée et verso en figure, garde de `CorrectionCard` (rouge sans elle), fiche du catalogue ; 9 tests neufs, rouges sans le code.
- 2026-10-25 : carte CP-059 essayée par David sur `/dev/carte-question` (OK) ; brouillon créé en prod (`010d81a5-61dd-441d-a4d6-fdd0bd6c7af4`, `create-questions --publier`, go de David), vérifié : brouillon, 3 variations, 18 specs, sans nœud ni tag.
- 2026-10-25 : revue Opus de #1782 : 2 à corriger + 3 mineurs, tous traités (garde en échec → bonne droite seule ; case « figure » mêlée à une autre case : bloc retiré de l'énoncé rempli ; consigne pendant le chargement ; libellé de la bonne droite seule ; écart vertical précisé dans le § 6) ; 3 tests neufs, rouges sans les correctifs.
- 2026-10-25 : #1782 mergée (CI verte, revue Opus traitée).
- 2026-10-25 : David suit les recos (accès, CP-034, CP-058, PDF, Q3/Q4) ; migration CP-059 lancée.
- 2026-10-25 : migration nœud + tag de CP-059 écrite (gabarit du lot H) ; test d'intégration 8/8 vert, 4 rouges sans la migration.
- 2026-10-25 : #1787 mergée (CI verte, audit sécurité sans finding bloquant) ; `db:migrate` joué, vérifié en prod (nœud « constructions », tag CP-059, `updated_at` préservé, brouillon).
- 2026-10-26 : phases 0 de CP-060 (§ 7) et CP-058 (§ 8) écrites ; constaté : QCM et cases ne se mêlent pas (oui / non = case texte).
- 2026-10-26 : David suit les recos des § 7 et § 8 ; plan des PR 4 et 5 (§ 9) ; worktree recréé.
- 2026-10-26 : PR 4 codée (moteur, écran, modèle CP-060) ; revue Opus : 1 faux verdict corrigé (trait aligné détaché), 5 mineurs traités, 2 limites notées.
- 2026-10-26 : #1793 mergée (CI verte après fusion de `main`, conflit d’une ligne dans `ubumark.md`).
- 2026-10-26 : PR 5 codée : modèle CP-058 (11 specs), 3 correctifs d’écran (Valider grisé à l’entraînement, message du juge, « Blanc 1 »), exemple au catalogue et sur `/dev/carte-question` ; piège `eval:` → fraction trouvé.
- 2026-10-26 : #1798, décisions de David : figure vide = 0 point (plus ½), la figure d'abord dans la copie corrigée ; 4 tests rouges sans.
- 2026-10-26 : #1798 mergée (CP-058) ; worktree retiré.
- 2026-10-26 : PR 6 codée (garde des tirages, § 11) ; 4 tests rouges sans, le piège de CP-058 attrapé.
- 2026-10-26 : #1805 mergée (garde des tirages, revue Sonnet traitée) ; worktree retiré.

## 12. Essai de CP-060 : le côté donné prolongé (2026-10-26)

**Trouvé à l'essai de David** : l'élève prolonge le côté donné [AB] (3 carreaux) de 2 carreaux et ferme un
rectangle 5 × 3 → « Ta figure n'est pas fermée. », alors qu'elle l'est (le juge ne cherchait les rectangles
fermés que sur la base exacte [AB]). Verdict juste, message faux.

**Décision de David** (reco suivie) : un message à part, « Le côté déjà tracé ne doit pas être prolongé : ton
carré doit avoir ce côté-là. » — et non « Ce n'est pas un carré », faux pour un vrai carré 5 × 5 bâti sur le côté
prolongé (cas frère). Placé après « pas fermée » / « pas un carré » : une figure fermée sur [AB] exact garde
« pas un carré ».

**Codé** : `closedOnProlongedSide` (`construction/polygon.ts`) — un rectangle dont un côté contient [AB] en étant
plus long, sommets pris aux bouts des segments de l'élève. Tests : 5 × 3, 5 × 5, prolongé côté A au-dessous
(rouges avant) ; prolongé mais ouvert → toujours « pas fermée ».

**Rectangle** (décision de David : même message, adapté) : « Les côtés déjà tracés ne doivent pas être prolongés :
ton rectangle doit avoir ces côtés-là. » — `closedOnProlongedSides`, rectangle de coin B dont les côtés sur (BA) et
(BC) vont jusqu'à A et C ou plus loin. Tests : [BC] prolongé, [AB] prolongé, les deux (rouges avant).

**Revue Opus** : aucun faux positif ; 4 tests ajoutés (prolongé des deux côtés, côté vertical, oblique, trou).
**Limites laissées** : carré décalé qui chevauche [AB] sans le contenir → « pas fermée » (message à trancher par
David) ; figure fermée en L → « pas fermée » (existait avant).
