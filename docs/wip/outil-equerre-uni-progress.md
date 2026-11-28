---
title: Lot d'outils equerre-uni — journal
date: 2026-11-28
status: outil 40 livré (#3290) ; 38 en PR ; 45 à faire
---

# Lot `equerre-uni` (outils 40, puis 38, puis 45)

## Reprendre ici

_Mis à jour le 2026-11-28, outil 38 en PR._

- **État** : outil 38 codé, revu, PR ouverte depuis `feat/outil-equerre-uni-38` (§ 2, § 2 bis) · **Prochaine
  action** : CI verte → `pnpm pr:merger` ; puis sur `main` : n° de PR dans la ligne « Livré » de
  `outils-manquants.md`, ce bloc ; ensuite outil 45 (figure composée), nouveau worktree · **En attente de
  David** : rien · **Pièges en cours** : à dire à David : la correction de l'outil 40 s'affiche aussi sur
  quadrillage, (d) segment → pied possible hors du segment ; outil 38 : `droite` reste exigée dans `outils:` ·
  **Worktree / branche** : `../ubumaths-wt-outil-equerre-uni`, `feat/outil-equerre-uni-38`.

## 1. Outil 40 — phase 0 (2026-11-28)

**Vérifié dans le code** : l'outil manque encore. Le juge sait déjà qu'une droite tracée à l'équerre est construite
(`isSupported`, `construction/instruments.ts` : équerre posée le long d'un trait, glissée jusqu'à un point construit ;
parallèle « à la 6e » = perpendiculaire en un point quelconque du trait, puis perpendiculaire à celle-ci). Ce qui
manque :

- la **garde de l'auteur** (`assertLines`, `construction/line.ts`) : sur papier uni, elle refuse toute droite qui
  n'est ni une médiatrice ni une bissectrice (« sinon ajouter grille: 1 ») ;
- des **messages** qui disent la cause : aujourd'hui, une droite fausse reçoit « Ta droite n'est pas à sa place. ».

**Syntaxe d'auteur** : rien de neuf, celle du quadrillage sans `grille:` :

```
outils: droite, equerre
verifier: droite p = perpendiculaire(A, d)
verifier: droite q = parallele(A, d)
```

**Exemple d'élève** (CM1-167, papier uni) : une droite (d) oblique et un point A hors de (d). « Trace la
perpendiculaire à (d) passant par A. »

- **Nominal** : l'élève pose l'équerre le long de (d), la fait glisser jusqu'à A et trace → juste. Parallèle : il
  trace une perpendiculaire à (d) n'importe où sur (d), puis la perpendiculaire à celle-ci par A → juste ; la
  perpendiculaire intermédiaire est un trait de construction, ignoré.
- **Limites** : A sur (d) → la perpendiculaire en A, juste. Une parallèle construite au compas (parallélogramme)
  → juste aussi (elle passe par deux points construits). Une droite à la bonne place mais tracée à la règle, par A
  et un point posé à l'œil → « Ta droite est tracée à l'œil : construis-la avec tes instruments. » (message
  existant).
- **Erreurs**, messages proposés (perpendiculaire ; parallèle de même) :
  - rien de tracé : « Trace la perpendiculaire à (d) passant par A. » / « Trace la parallèle à (d) passant par A. »
  - bonne direction, pas par A : « Ta droite est perpendiculaire à (d) mais ne passe pas par A. » / « Ta droite est
    parallèle à (d) mais ne passe pas par A. »
  - par A, mauvaise direction : « Ta droite passe par A mais n'est pas perpendiculaire à (d). » / « … n'est pas
    parallèle à (d). »
  - l'une pour l'autre (par A) : « Ta droite est parallèle à (d) : on demande la perpendiculaire. » et l'inverse.

**Garde de l'auteur** (erreurs à la création du modèle, sur papier uni) : (d) doit être un trait droit de la figure
(l'équerre se pose le long d'un trait), A visible dans la fenêtre, au moins 2 unités de la droite attendue dans la
fenêtre (comme la médiatrice).

**Correction** : la droite attendue ; pour la perpendiculaire, l'angle droit codé au pied ; pour la parallèle, la
perpendiculaire intermédiaire en trait fin, avec ses deux angles droits codés.

**Questions à David** :

1. Les comportements et les messages ci-dessus : OK ?
2. Sur papier uni, **exiger l'équerre dans `outils:`** (sinon erreur d'auteur « ajouter equerre à outils: ») ?
   Reco : oui, sans équerre l'élève ne peut que tracer à l'œil.
3. Les nouveaux messages aussi **sur quadrillage** (les modèles en prod CM1-167, 168 et leurs jumeaux CM2 les
   recevraient tout de suite) ? Reco : oui, même juge, et « pas à sa place » n'aide pas l'élève.
4. La correction (angle droit codé ; trait fin de la perpendiculaire intermédiaire pour la parallèle) : OK ? Reco :
   oui ; sinon la droite seule, comme aujourd'hui.

### 1 bis. Outil 40 : décisions et travail (2026-11-28)

David : « je suis tes recos » sur les 4 questions (comportements et messages ; équerre exigée dans `outils:` sur
papier uni ; messages aussi sur quadrillage ; correction avec angle droit et perpendiculaire intermédiaire).

- `throughLineOf` (`ubumark/types/construction.ts`) lit `perpendiculaire(A, d)` / `parallele(A, d)` (forme à deux
  arguments ; `perpendiculaire(P, A, B)` reste refusée sur papier uni) ; garde de palette dans le parseur.
- `line.ts` : `throughLineSupportError` (parallèle par un point de (d) refusée partout ; sur papier uni : (d)
  tracée, A visible et dans la fenêtre, 2 unités de droite) ; `judgeThroughLine` lit la cause sur la DERNIÈRE
  droite qui ne repasse pas la figure (les précédentes sont des traits de construction). Écart à la phase 0 :
  « l'une pour l'autre » vaut aussi quand la droite ne passe pas par A (la direction est la première erreur).
- Correction : `throughLineCorrections` / `solutionThroughLines`, dessinée dans `FigureACompleterView.svelte`.
- Tests : `construction-droite-equerre.test.ts` (24, rouges avant le code), deux attentes changées dans
  `construction-line.test.ts` (messages de l'outil sur quadrillage, point invisible) ;
  `figure-a-completer-droite-equerre.svelte.test.ts` (4, navigateur : équerre posée, message, correction).
- Rendu vu à l'écran (capture du navigateur de test) : message, droite attendue en pointillés, angle droit au
  pied ; parallèle : perpendiculaire par A en trait fin.
- Revue (`code-reviewer`, Opus) : aucun verdict faux. Corrigé : avec deux vérifications droite, le message de
  l'une lisait la droite juste de l'autre (test ajouté). Laissés, à dire à David : la correction (angle droit,
  perpendiculaire en trait fin) s'affiche aussi sur quadrillage (CM1-167, 168 en prod) ; (d) donnée par un
  segment : le pied peut tomber hors du segment (aucun cas réel).

## 2. Outil 38 — phase 0 (2026-11-28)

**Vérifié dans le code** : l'outil manque encore. Sur papier uni, le juge des droites (`judgeLines`, `line.ts`)
refuse tout objet autre que droite, cercle, report (et repère pour une bissectrice) : une règle posée ou un point
marqué rend la réponse fausse sans message. Le juge « construit » (`constructionOf`, `instruments.ts`) ignore les
graduations : un point posé sur la règle est un point à l'œil. L'écran n'aimante aux graduations que le Segment et
le Compas (`FigureACompleterView.svelte`), pas le Point. L'équerre, elle, sait déjà tracer la perpendiculaire par
un point posé (les points posés sont des cibles d'aimantation).

**Syntaxe d'auteur** : rien de neuf, la palette dit la méthode :

```
outils: regle, point, equerre
verifier: droite m = mediatrice(A, B)
```

**Exemple d'élève** (6-165, papier uni) : un segment [AB] de 6 cm. « Construis la médiatrice de [AB]. »

- **Nominal** : l'élève pose la règle, son 0 en A, le long de [AB] ; il marque un point sur la graduation 3 cm ;
  il pose l'équerre le long de [AB], la glisse jusqu'à ce point et trace → juste.
- **Limites** : le 0 en B → juste aussi. Règle posée de A vers B sans segment tracé (A et B seuls) → juste. Avec
  `compas` aussi dans la palette, les deux cercles de même rayon restent acceptés.
- **Erreurs** (messages existants) :
  - point marqué sur la mauvaise graduation (3,5 cm) → « Ta droite est perpendiculaire à [AB] mais ne passe pas
    par son milieu. » ;
  - par le milieu mais tracée à la règle, pas à l'équerre (deuxième point à l'œil) → « Ta droite est tracée à
    l'œil : construis-la avec tes instruments. » ;
  - milieu posé à l'œil (pas sur une graduation, ou règle pas posée le long de [AB] depuis A ou B) → même
    message « tracée à l'œil » (voir question 3) ;
  - rien de tracé → « Trace la médiatrice de [AB]. » (existant).

**Ce qui change dans le juge** : un point posé sur une graduation d'une règle dont le 0 est un point construit et
qui longe un trait droit construit (ou vise un point construit) devient construit — seulement dans une figure qui
vérifie une médiatrice (comme l'exception de la bissectrice au compas), pour ne rien rendre « construit » ailleurs.

**Garde de l'auteur** (papier uni, `regle` dans `outils:`) : [AB] mesure un nombre PAIR de millimètres (sinon son
milieu n'est sur aucune graduation : 6,5 cm → 3,25 cm) et tient sur la règle ; `point` et `equerre` dans `outils:`.

**Correction** : celle d'aujourd'hui (la médiatrice, angle droit au milieu, moitiés égales codées).

**Questions à David** :

1. Les comportements ci-dessus : OK ?
2. **Le geste pour marquer le milieu** : le Point, aimanté aux graduations quand la règle est posée (le geste du
   cahier : « je marque le milieu ») ; ou le Segment tracé du 0 à la graduation (déjà aimanté, mais il recouvre
   [AB] et ne se voit pas). Reco : le Point.
3. Milieu posé à l'œil : un message à lui, « Ton milieu est placé à l'œil : pose la règle sur [AB] et marque-le
   sur une graduation. », au lieu de « tracée à l'œil » ? Reco : oui, il dit quoi refaire.
4. **Le milieu d'un segment** (`verifier: point M = milieu(A, B)`, `outils: regle, point`) : même mécanisme, le
   point marqué sur la graduation est le milieu. Dans la même PR ? Reco : oui (la ligne 38 le cite, quelques
   lignes de plus).

### 2 bis. Outil 38 : décisions et travail (2026-11-28)

David : « je te suis » sur les 4 questions (comportements ; le Point aimanté aux graduations ; message du milieu
à l'œil ; le milieu d'un segment dans la même PR).

- **Palette** : `outils: droite, regle, point, equerre` (la droite reste exigée pour une vérification `droite`,
  comme à l'outil 40 — écart à la syntaxe de la phase 0) ; milieu : `outils: regle, point`. Règle sans Point ou
  sans Équerre (médiatrice) : erreur d'auteur ; règle sur quadrillage : erreur d'auteur.
- **Le juge lit la palette** : `FigureShapes.tools` (rempli par `positions-setup.ts` depuis `outils:`). Sans la
  règle dans la palette, une règle posée reste une réponse forgée.
- `instruments.ts` : option `rulerLength` de `constructionOf` — un point posé sur une graduation d'une règle bien
  posée (0 sur un point construit, bord vers un point construit ou le long d'un trait droit construit par ce 0)
  est construit ; `isOnRulerGraduation`.
- `line.ts` : `usesRulerMidpoint`, `rulerMidpointError` (nombre pair de mm, pas plus long que la règle),
  `midpointEyeballedFeedback` ; le milieu à l'œil se lit sur le point posé par lequel passe la droite (pas
  `isBuilt` : un point posé sur [AB] devient le croisement de [AB] et de la droite d'équerre tracée par lui).
- `point.ts` : même option et même message pour `milieu(A, B)`.
- Écran : le Point s'aimante à la graduation du mm quand la règle est posée ; ‹ › le déplacent d'un millimètre
  (`nudgeRulerEnd`, forme `point`) — sans eux, toucher le bon millimètre au doigt est trop dur.
- Tests : `construction-mediatrice-regle.test.ts` (27 ; les 25 du juge, 22 rouges avant le code ; 2 de ‹ › écrits après),
  `figure-a-completer-mediatrice-regle.svelte.test.ts` (3, navigateur ; 2 rouges sans l'écran).
- Rendu vu à l'écran (captures du navigateur de test) : règle posée, point marqué à 3 cm, ‹ 1 mm / 1 mm › ;
  « Juste » ; faux à 3,5 cm avec le message, la médiatrice en pointillés, l'angle droit et les moitiés codés.
- Revue (`code-reviewer`, Opus). Corrigé : ‹ › hors de l'outil Point posaient un segment (hors palette → réponse
  fausse sans message) : sans Segment dans la palette, ils posent et déplacent le point, quel que soit l'outil
  (test navigateur, vu rouge sans la correction) ; le milieu à l'œil ne se lit que sur un point posé SUR (AB)
  (test) ; `m[eé]diatrice` dans `rulerMidpointOf` ; l'aide « touche Point » passe avant celle du compas.
