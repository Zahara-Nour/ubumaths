# Chantier « rectangle-sans-equerre » — construire un rectangle sans équerre (4-038)

> Outil manquant n° 37 de [`outils-manquants.md`](outils-manquants.md). Point servi : 4-038 « Construire des
> rectangles sans équerre » (`cycle4.json`, aucune borne écrite). Né du chantier
> [`questions-4`](questions-4-progress.md) § 54.

## Reprendre ici

_Mis à jour le 2026-11-17, après #2781._

- **État** : PR 1 (l'outil, `verifier: rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm`) mergée (#2781), les 5
  findings de la revue corrigés (§ 5). Worktree retiré, branche supprimée.
- **Prochaine action** : PR 2, le modèle 4-038 dans `questions-4` (énoncé du § 3.1, figure du § 3.2), dans un
  nouveau worktree `../ubumaths-wt-rectangle-sans-equerre` (branche `feat/rectangle-sans-equerre-modele`).
- **En attente de David** : rien.
- **Pièges en cours** : ne pas toucher à `ruled-polygon.ts`. Push : ne pas filtrer sa sortie par
  `grep -E "->…"` (ugrep plante, le push meurt en SIGPIPE).
- **Worktree / branche** : aucun (à recréer pour la PR 2).

## 1. Ce qui existe (lecture du code, 2026-11-17)

- Aimantation d'un toucher : point nommé, sinon intersection de deux traits (droite-droite, droite-cercle,
  cercle-cercle), sinon sur un trait (`src/lib/questions/construction/instruments.ts`, `snapInstrument`,
  `intersectTraits`).
- Point « construit » : départ ou intersection de traits construits, de proche en proche (`constructionOf`,
  `isBuilt`, même fichier).
- Rectangle coté sur papier uni : `verifier: rectangle A ; B ; C ; D : BC = 3 cm`, juge `ruled-polygon.ts`, lié à
  la méthode à l'équerre ; le parseur impose la palette Segment · Équerre · Règle graduée (`ruledPolygonError`,
  `construction-parser.ts`) et refuse toute autre.
- Manque : une forme de vérification sans équerre (parseur) et son juge. L'affichage ne devrait pas changer (à
  confirmer en phase 0).

## 2. Décisions de David (2026-11-17, « je te suis » sur mes recos)

1. **Données** : un côté et une diagonale (« ABCD rectangle, AB = 4 cm, AC = 6 cm ») — la propriété des
   diagonales (même milieu, même longueur). Variations : AB de 3 à 6 cm, AC de AB + 1 à 9 cm, au mm ; noms des
   sommets variés.
2. **Palette** : Segment · Compas · Règle graduée, sans report.
3. **Juge** : le résultat, pas la méthode ; seule exigence de méthode : B, C, D **construits** (intersection de
   traits ou graduation), jamais posés à l'œil. Toute méthode juste passe.
4. **Découpage** : PR 1 = l'outil (parseur, juge, messages, doc `ubumark.md`, page de démo) ; PR 2 = le modèle
   4-038, lot d'un modèle dans `questions-4`. Puis clôture de `questions-4`.
5. **Quand** : phase 0 dans une session neuve, validée par David avant tout code.

## 3. Phase 0 (écrite le 2026-11-17, à valider)

Ancrage : le BO de 4e (`transcriptions/cycle-4/4-espace.md`) place « Construire des rectangles sans équerre »
juste après « triangle rectangle inscrit dans un demi-cercle dont le diamètre est un côté ». Méthode de
référence : la diagonale [AC] est donnée, B est sur le cercle de diamètre [AC] (centre O, milieu de [AC]) et
sur le cercle de centre A de rayon AB ; D par les diagonales (même milieu, même longueur).

### 3.1 Ce que voit l'élève

- Énoncé (PR 2) : « Construis le rectangle ABCD tel que AB = 4 cm et AC = 6 cm. La diagonale [AC] est tracée. »
- Figure : A et C nommés, [AC] tracé, papier uni. B et D ne sont pas dans la figure.
- Palette : Segment · Compas · Règle graduée (celle du triangle coté en cm : l'affichage ne change pas).
- Deux rectangles justes, B d'un côté ou de l'autre de (AC) (D est alors de l'autre côté).

### 3.2 Syntaxe de `verifier:` (auteur)

```
fenetre: 0 ; 12 ; 0 ; 9
verifier: rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm
---
A = point(3, 4.5)
C = point(9, 4.5)
d = segment(A, C)
```

- Forme reconnue à la **diagonale** donnée : `AC` (ou `CA`), entre le 1er et le 3e sommet. Avec `BC = 3 cm`
  seul, c'est toujours le rectangle à l'équerre (inchangé).
- Le côté donné est [AB] (ou `BA`) ; les deux longueurs dans n'importe quel ordre, au mm près (`4 cm`,
  `3,5 cm`, `3 cm 5 mm`, `35 mm`), comme le rectangle coté.
- Palette par défaut Segment · Compas · Règle graduée ; `outils:` autre que ces trois → refusé.

Refus à la publication (erreurs d'auteur), un message chacun :

| Cas                                                                                          | Message                                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Diagonale absente ou autre que [AC]                                                          | `rectangle ABCD : donner le côté [AB] et la diagonale [AC], « rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm »` |
| Côté autre que [AB]                                                                          | `rectangle ABCD : le côté donné est [AB] (la diagonale [AC] est tracée), « … »`                                  |
| AB ≥ AC                                                                                      | `rectangle ABCD : le côté [AB] doit être plus court que la diagonale [AC]`                                       |
| Longueur pas au mm                                                                           | `rectangle ABCD : une longueur à la règle graduée se donne au millimètre près (3 cm, 3 cm 5 mm ou 35 mm)`        |
| Quadrillage, autre vérification dans la figure, `outils:` avec équerre / report / rapporteur | refus (même forme que le rectangle coté)                                                                         |
| A ou C absent ; B ou D déjà dans la figure                                                   | comme `ruled-polygon.ts` (« … est déjà un point de la figure (l'élève le construit) »)                           |
| [AC] pas tracé                                                                               | `rectangle ABCD : la diagonale [AC] doit être tracée dans la figure (« d = segment(A, C) »)`                     |
| [AC] de la figure ≠ la longueur écrite                                                       | `rectangle ABCD : [AC] mesure 5,8 cm dans la figure, pas 6 cm (1 unité = 1 cm)`                                  |
| AC plus long que la règle                                                                    | `rectangle ABCD : la diagonale [AC] est plus longue que la règle (… cm) : agrandir la fenêtre`                   |
| B ou D hors de la fenêtre des deux côtés                                                     | `rectangle ABCD : les sommets B et D sortent de la fenêtre des deux côtés de (AC) : agrandir la fenêtre`         |

### 3.3 « Construit » (décision 3)

Points de départ : A, C et les bouts des segments de la figure. Puis, de proche en proche :

1. **Trait construit** : segment entre deux points construits ; cercle centré en un point construit, passant
   par un point construit (`constructionOf`), **ou** ouvert sur une graduation d'une règle posée avant lui, son
   0 au centre (`compassGraduationOf`, comme le triangle coté en cm).
2. **Point construit** : intersection de deux traits construits ; **ou** bout d'un segment arrêté sur une
   graduation d'une règle posée avant lui, son 0 sur un point construit **et sa direction sur un point
   construit** (règle en A vers C : O à 3 cm ; règle en B vers O : D à 6 cm). Une règle posée à l'œil (direction
   libre) ne construit rien : B à 4 cm de A dans une direction quelconque reste « à l'œil ».

Méthodes qui passent (tests verts, une par méthode) :

- **M1 (référence)** : compas ouvert à 3 cm en A → O = croisement avec [AC] ; cercle de centre O passant par A ;
  compas ouvert à 4 cm en A → B ; [AB], [BC] ; règle en B vers O, [BD] arrêté à 6 cm → D ; [CD], [DA].
- **M2** : O à la règle (segment [AO] de 3 cm sur [AC]) ; le reste comme M1.
- **M3** : D au croisement du cercle de centre O et du compas ouvert à 4 cm en C (le bon des deux croisements).
- **M4** : O par la médiatrice de [AC] au compas (deux cercles de même rayon en A et C, segment entre leurs
  croisements).
- Les deux côtés de (AC).

### 3.4 Juge : ordre des messages (élève)

0. Objet hors palette (un point, un report) → faux sans message (réponse forgée, comme ailleurs).
1. Aucun côté tracé (hors [AC] et traits sur les diagonales) → « Trace les côtés du rectangle ABCD. »
2. Pas de quadrilatère fermé A → B → C → D → A (B et D de part et d'autre de (AC)) → « Ta figure n'est pas fermée. »
3. Plusieurs → « Trace un seul rectangle ABCD. »
4. B pas construit → « Ton sommet B est placé à l'œil : construis-le avec ton compas ou ta règle. »
5. AB faux → « Ton côté [AB] mesure 4,5 cm au lieu de 4 cm. » (longueur exacte, B étant construit ; arrondie au
   mm pour le message, et si l'arrondi tombe juste : « Ton côté [AB] ne mesure pas exactement 4 cm. »)
6. Angle en B pas droit (AB juste, B hors du cercle de diamètre [AC]) → « Ton angle ABC n'est pas droit : B doit
   être sur le cercle de diamètre [AC]. » (Q2)
7. D pas construit → « Ton sommet D est placé à l'œil : construis-le avec ton compas ou ta règle. »
8. D faux, BD ≠ AC → « Tes diagonales [AC] et [BD] n'ont pas la même longueur. »
9. D faux, BD = AC → « Tes diagonales [AC] et [BD] n'ont pas le même milieu. »
10. Trait de trop / trait qui dépasse (`leftoverFeedback`), **sauf** les segments posés sur les diagonales
    [AC] et [BD] (traits de construction, Q3). Cercles : toujours des traits de construction.

Le juge ne lit jamais la méthode au-delà de « B et D construits » : un D juste par une autre voie passe.

### 3.5 Correction (après Valider, faux)

Le bon rectangle en pointillés (du côté où l'élève a le plus tracé, sinon le plus haut, comme `ruled-polygon`),
et en traits fins : le cercle de diamètre [AC], l'arc de centre A de rayon AB, la diagonale [BD]. Pas de règle
posée, pas de codage (Q4).

### 3.6 Doc et démo (PR 1)

- `docs/systeme/ubumark.md` : la forme `rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm` à côté du rectangle coté.
- Catalogue (`block-catalog/figure-a-completer.ts`) : `values` et `outils` complétés, un exemple « Construire un
  rectangle sans équerre (diagonales) » avec la source du § 3.2 et l'explication (méthode M1, messages,
  refus) — c'est la page de démo (`/aide-ecriture/blocs/figure-a-completer`).

### 3.7 Questions à David

- **Q1. Syntaxe** : la diagonale écrite (`AB = 4 cm ; AC = 6 cm`, vérifiée contre la figure) ou lue dans la
  figure seulement (`AB = 4 cm`, comme le carré lit son côté) ? **Reco : écrite** — la forme se lit sans
  ambiguïté face à `BC = 3 cm`, et un écart figure / énoncé dans les variations est refusé à la publication.
- **Q2. Message de l'angle en B** : « … B doit être sur le cercle de diamètre [AC] » (donne la méthode du BO) ou
  « Ton angle ABC n'est pas droit. » seul ? **Reco : avec l'indice** (l'élève de 4e n'a pas d'équerre pour voir
  pourquoi).
- **Q3. Traits sur les diagonales** : [BD] et les morceaux de [AC] (comme [AO]) admis comme traits de
  construction ? **Reco : oui** — sinon M1 et M2 seraient fausses.
- **Q4. Correction** : sans codage, ou avec les quatre demi-diagonales codées égales (OA = OB = OC = OD) ?
  **Reco : sans** (l'arc et le cercle suffisent ; le codage s'ajoute après si tu le veux).
- **Q5. Côté donné** : seulement [AB] (depuis A), ou aussi [BC] (depuis C, la même figure retournée) ?
  **Reco : [AB] seul** — l'auteur renomme ; une forme de moins à tester.

### 3.8 Décisions de David (2026-11-17, « je te suis, go »)

Q1 diagonale écrite (`AB = 4 cm ; AC = 6 cm`, vérifiée contre la figure) · Q2 message de l'angle en B avec
l'indice du cercle de diamètre [AC] · Q3 segments sur [AC] et [BD] admis (traits de construction) · Q4
correction sans codage · Q5 côté donné [AB] seul.

## 4. PR 1 — l'outil (2026-11-17)

- Juge `src/lib/questions/construction/diagonal-rectangle.ts` (`DiagonalRectangleCheck`, clé `diagonal`),
  parseur `readDiagonalRectangle` / `diagonalRectangleError`, branchements `judge.ts`, `drawing.ts`,
  `instance-generator.ts` ; le rectangle à l'équerre (`ruled-polygon.ts`) n'est pas touché.
- Tests : `construction-rectangle-diagonales.test.ts` (40, rouges d'abord : module absent), et deux tests de
  vue dans `figure-a-completer-regle.svelte.test.ts` (M1 entière aux touchers → juste ; B à l'œil → message,
  cercle et arc à la correction).
- **Précision prise en codant** (cohérente avec M4 validée) : les segments sur la médiatrice de [AC] sont des
  traits de construction, comme ceux des diagonales (Q3) — sinon M4 serait « trait de trop ».
- **Choix de B** entre les deux sommets du quadrilatère : celui que l'élève a mesuré depuis A (compas piqué
  en A, règle posée en A), sinon le plus près de AB (un rectangle AB = 4,5 cm donnait sinon « [AB] ne mesure
  pas exactement 4 cm », AD ≈ 3,97 cm étant plus près).
- Vue : une seule retouche, l'indice de la Règle posée propose aussi le Segment (O à 3 cm, D à 6 cm de B).
- Doc : `docs/systeme/questions.md`, `docs/systeme/ubumark.md`, exemple du catalogue
  (`block-catalog/figure-a-completer.ts`, page `/aide-ecriture/blocs/figure-a-completer`).

## 5. Revue de la PR 1 (code-reviewer, Opus, 2026-11-17) — corrigée

1. **Important** — D construit sur la règle mais atteint par un autre segment que [BD] refusé
   (`builtPredicate` exige le 0 de la règle sur l'autre bout du MÊME segment). Gestes : règle en B vers O, puis
   [CD] tracé de C jusqu'à la graduation 60 ; ou [BO] puis [OD] arrêté sur la graduation 60. Correction : un
   bout `p` est construit s'il existe une règle posée avant le segment, 0 sur un point construit, dirigée vers
   un point construit, `p` sur une graduation > 0 (comme `ruledGraduationOf` du triangle).
2. **Important** — le choix de B par « mesuré depuis A » passe avant la longueur : `AB = 3 cm ; AC = 5 cm`,
   B pris par CB = 4 (compas en C), D par la règle de B vers O, puis règle posée en A vers D pour tracer [AD]
   → « [AB] mesure 4 cm au lieu de 3 cm » sur une réponse juste. Correction : si un seul des deux sommets est
   à AB de A (à eps près), c'est B ; « mesuré » ne départage que le reste.
3. **Mineur** — parseur : `AB = 4 cm` seul ou `BD = 6 cm` seul renvoient au message du rectangle à
   l'équerre (`BC = 3 cm`) ; router toute longueur seule autre que [BC] vers `readDiagonalRectangle`.
4. **Mineur** — `d = droite(A, C)` (ou un segment plus long passant par A et C) accepté comme diagonale :
   exiger un segment de la figure de bouts A et C.
5. **Mineur** — segment sur la médiatrice de [AC] admis sans limite de longueur : le borner (par exemple aux
   croisements des deux cercles de même rayon) ou le dire dans la doc.

**Corrections (2026-11-17)**, un test rouge chacune (`describe('… revue de la PR 1')`) : 1. bout de segment
construit par toute règle posée avant lui (0 sur un point construit, dirigée vers un point construit),
quel que soit l'autre bout ; 2. B = le seul sommet à AB de A, avant « mesuré » ; 3. toute longueur seule
autre que [BC] → `readDiagonalRectangle` ; 4. [AC] = un segment de la figure de bouts A et C ; 5. segment
sur la médiatrice admis entre les croisements de deux cercles de même rayon centrés en A et en C (au-delà :
trait qui dépasse ; sans ces cercles : trait de trop).

## 6. PR 2 — le modèle 4-038 : phase 0 (proposée le 2026-11-17)

Worktree `../ubumaths-wt-rectangle-sans-equerre`, branche `feat/rectangle-sans-equerre-modele`. Le script
s'écrit comme les lots de `questions-4` (`docs/wip/questions/lot-4-11.py` → `scripts/questions/4-lot-11/`).

### 6.1 Relevé (prod, MCP lecture seule, 2026-11-17)

- 4-038 « Construire des rectangles sans équerre. », 0 modèle, sur la sous-notion
  **Géométrie > Figures planes > triangles** (avec 4-036 et 4-037). Bornes : aucune.
- Modèles de 4e sur ce nœud : « Triangle inscrit dans un demi-cercle » (niveau 1), « Centre du cercle
  circonscrit » (niveau 2), tous deux publiés.
- **L'outil (#2781) n'est pas encore en prod** : merge absent de `origin/production`. Le modèle reste en
  brouillon jusqu'au `deploy:prod` qui le livre (David).

### 6.2 Le modèle proposé

| Point | Titre                                | Nœud, niveau                                  | Réponse            |
| ----- | ------------------------------------ | --------------------------------------------- | ------------------ |
| 4-038 | Construire un rectangle sans équerre | Géométrie > Figures planes > triangles, **3** | figure à compléter |

- **Énoncé** (§ 3.1) : « Construis le rectangle ABCD tel que AB = 4 cm et AC = 6 cm. La diagonale [AC] est
  tracée. » Papier uni, fenêtre 12 × 9 (règle de 12 cm), [AC] horizontale, centrée, A à gauche.
- **Variations** (décision 1) : AB de 3 à 6 cm, AC de AB + 1 à 9 cm, au mm ; noms des sommets tirés parmi
  ABCD, EFGH, MNPQ, RSTU (une seule variation, les noms en variable).
- **Délai** : 240 s (comme « Construire un triangle » de 6e, qui reporte deux longueurs).
- **Correction** : la méthode M1 en trois étapes (O milieu de [AC] ; B au croisement du cercle de diamètre
  [AC] et du cercle de centre A de rayon AB ; D sur (BO) à la distance AC de B, ou par le milieu) ; le juge
  dessine en plus le rectangle, le cercle, l'arc et [BD].
- **`testSpecs`** : M1 des deux côtés de (AC), M3 (D au compas) → justes ; B à l'œil, AB faux, angle en B pas
  droit, D faux → faux.

### 6.3 Question d'accès

Comme les lots de `questions-4` : brouillon, puis migration nœud + tag ; **personne** ne gagne d'accès. À la
publication, les élèves de 4e voient un modèle de plus.

### 6.4 Questions à David

- **Q6. Orientation de [AC]** : toujours horizontale, ou aussi oblique (tirée parmi quelques angles) ?
  **Reco : horizontale** — la figure tient dans la fenêtre pour toutes les longueurs, l'élève de 4e se
  concentre sur la méthode.
- **Q7. Niveau 3** sur la sous-notion « triangles » (après le demi-cercle et le centre du cercle
  circonscrit) ? **Reco : oui**, c'est la suite logique du BO.
