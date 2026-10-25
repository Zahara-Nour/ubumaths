# Chantier « geometrie-validation » — valider une figure faite par l'élève (case « figure »)

## Reprendre ici

_Mis à jour le 2026-10-25, après #1775._

- **État** : PR 1 (moteur, #1768), renommage (#1774) et PR 2 (écran élève, § 5, #1775) mergés ; rien en prod.
- **Prochaine action** : PR 3 — modèle CP-059 (3 variations, `delay` 60 s), fiche du catalogue, doc système, verso de
  `FlashCard` et copie corrigée en figure, garde du verdict de `CorrectionCard`, corrigé PDF (à trancher) ; nouveau
  worktree `../ubumaths-wt-geometrie-validation`.
- **En attente de David** : statut de **CP-034** et de **CP-058** ; phase 0 de CP-060 ; Q3/Q4 du § 5 prises « sans
  changement » (à corriger s'il le veut) ; corrigé PDF des cases portées par un bloc (séries).
- **Pièges en cours** : `CorrectionCard` juge sans positions inscrites → « faux » en silence (§ 5, revue) ; la correction
  s'affiche dans `FlashCard` (`QuestionCard` jamais) ; essai : `/dev/carte-question`, « Figure à compléter (CP-059) ».
- **Worktree / branche** : aucun (retirés après #1775).

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
