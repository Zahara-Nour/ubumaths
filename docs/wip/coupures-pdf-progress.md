# Chantier `coupures-pdf` — quelles coupures de colonne et de page on autorise dans les PDF

## Reprendre ici

_Mis à jour le 2026-11-09, après #2521._

- **État** : PR 1 (#2518) et PR 2 (#2521, titre / numéro jamais seul en bas de page devant un dessin, § 6) mergées. Questions désormais justifiées (David). Rien en prod.
- **Prochaine action** : clore le chantier — versement du durable dans `docs/systeme/` (déjà fait dans `ubumark.md` et `fiches-et-pdf.md`, à relire), journal archivé.
- **En attente de David** : `deploy:prod` (sur sa demande) . Fiche `eval-premiere` écrite en prod le 2026-11-09 (carré `width=65%` FR + EN, durée 30 min) ; « Choisir un seul exercice » ne peut pas aller dans l'en-tête de la fiche (les consignes imprimées viennent du **devoir**, `assignment.instructions`) → à mettre en consigne au moment de donner le devoir.
- **Pièges en cours** : un titre `sticky` ne suit l'énoncé que si son PREMIER MORCEAU est vide ; tests de forme du Typst aussi dans `src/lib/typst` (pas seulement ubumark/worksheets) ; mesurer x ET y.
- **Worktree / branche** : supprimés après #2521.

---

## Origine

Fiche `eval-premiere` (`f337aa82-…`, 1re spé, second degré) : l'exercice 2 (« Le massif de fleurs »)
part en colonne 2, un trou d'un cinquième de colonne reste en bas de la colonne 1, et la fin de
l'exercice 3 déborde sur une page 2. Cause : chaîne de règles « titre collé au paragraphe »
(`render-exercise.ts`) + « paragraphe collé au dessin » (`typst-generator.ts`, `keepsWithNext`,
décision du 2026-10-26) → un bloc insécable « titre + 5 lignes + dessin » d'une demi-colonne.

## 1. Décision de David (2026-11-09) : trois niveaux

But : **éviter les trous, sans gêner la lecture outre mesure**. Une coupure de colonne laisse les
deux morceaux sur la même feuille ; une coupure de page oblige à tourner la feuille.

| Niveau                                 | Coupures                                                                                                                 | Règles actuelles                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Toujours interdite                     | titre d'exercice seul en bas ; numéro de question seul ; cadre de réponse seul en haut ; dessin ou tableau coupé en deux | A (`render-exercise.ts:195, 265`), C (`ubu-item`, `tete:`), D (`fiches-et-pdf.md` § cadres) |
| Interdite en fin de **page** seulement | paragraphe d'introduction séparé du bloc qui le suit (dessin, formule, tableau, liste)                                   | B (`keepsWithNext`)                                                                         |
| Permise                                | entre deux questions, dans un énoncé long, entre énoncé et 1)                                                            | —                                                                                           |

## 2. Garde-fou : à étudier en profondeur (David, 2026-11-09)

Idée : couper quand même quand garder ensemble laisserait un trou de plus d'une fraction de
colonne (un tiers ?). Plus souple, moins prévisible, plus dur en typst. À étudier avant toute
décision : faisabilité, convergence, cas réels mesurés sur les fiches en base.

**Décision de David (2026-11-09, « je suis tes recos »)** : garde-fou **abandonné** (gain d'une
page sur 104 pour 4 introductions séparées de leur dessin par un changement de page, § 3.2).

## 3. Étude typst (2026-11-09)

Prototypes et banc dans le scratchpad de la session (non conservés) ; compilateur exact de la
prod (`compile-prod.mjs`, avertissements affichés), PDF relus par PyMuPDF.

### 3.1 Mécanisme trouvé : « collé seulement en fin de page »

- `sticky` de typst est binaire : on le calcule. Décision = « la coupure tomberait-elle dans la
  **dernière colonne** de la page ? » ; si non, `sticky: false`. Pas besoin de mesurer les
  hauteurs : `sticky` n'agit que si la coupure arrive.
- **Marqueur** : `block(height: 0pt, above: 0pt, below: 0pt)[#metadata(none) <coupure-marque>]`
  posé **avant le début de la chaîne collée** (avant le titre d'exercice), puis, dans le bloc
  d'introduction, `context` + `query(selector(<coupure-marque>).before(here())).last()` → sa
  position. Le marqueur reste là où finit le contenu précédent, quelle que soit la décision → pas
  d'oscillation.
- Dernière colonne : `pos.x > page.width × (n − 1) / n`, `n` = nombre de colonnes du gabarit
  (le générateur le connaît ; une colonne → toujours la dernière → comportement inchangé).
- Pièges vus :
  1. `metadata` seul (sans bloc de hauteur nulle) part **avec** le bloc collé qui le suit ;
  2. un `sticky` à l'intérieur de `layout(…)` est **perdu** (`layout` crée son propre bloc) :
     pas de `layout` autour du bloc collé ;
  3. marqueur posé entre le titre (collé) et l'introduction → le titre se colle au marqueur et
     peut rester seul : le marqueur va **avant** le titre ;
  4. premier passage de typst : la requête est vide → par défaut `sticky: true`.
- Convergence : **aucun avertissement** sur 36 fiches de 24 exercices (24 décisions chacune).

### 3.2 Mesures (12 fiches aléatoires × 24 exercices, chacun avec un dessin insécable)

Cas défavorable : un dessin dans **chaque** exercice. Trou = espace vide en bas d'une colonne,
dernière page exclue, en fraction de colonne.

| Règle                              | Pages   | Trous > ¼ col | Somme des trous | Intro / dessin coupés par une page | Titre seul |
| ---------------------------------- | ------- | ------------- | --------------- | ---------------------------------- | ---------- |
| Actuelle (toujours collé)          | 110     | 55            | 28,2 col        | 0                                  | 0          |
| **Collé en fin de page seulement** | **104** | **24**        | **16,8 col**    | 0                                  | 0          |
| Idem + garde-fou ⅓                 | 103     | 21            | 16,7 col        | **4**                              | 0          |

- La règle validée en § 1 **divise les trous par deux** et gagne 6 pages sur 110.
- Le **garde-fou** gagne 1 page de plus, au prix de 4 introductions séparées de leur dessin par un
  changement de page. Les gros trous qui restent viennent des **dessins insécables eux-mêmes**
  (un dessin de 9 cm qui ne tient pas) : aucune règle de coupure n'y peut rien.
- Garde-fou prototypé ainsi : dernière colonne, la chaîne ne tient pas (`measure` de l'intro et
  du dessin à la largeur de colonne) et la place restante dépasse ⅓ de colonne → `sticky: false`.
  Il demande les marges et la gouttière du gabarit (pas de « place restante » dans typst 0.13).

### 3.3 Fiche `eval-premiere` (régénérée depuis la base, lecture seule)

- Sans en-tête « Nom / Date / Classe » : **1 page** avec la nouvelle règle (2 avant).
- Avec un en-tête équivalent à celui de l'appli : **toujours 2 pages**, il manque environ deux
  lignes (question 4 de l'exercice 3). La règle comble le trou de la colonne 1, mais la fiche
  reste un peu trop longue.
- Dessin du carré (exercice 2) ramené de 75 % à **65 %** de la colonne : **1 page** avec la nouvelle
  règle ; avec la règle actuelle, toujours 2 pages (même à 40 %) → la fiche attend la livraison
  de ce chantier.

## 4. Phase 0 et PR 1 (2026-11-09)

David (« je valide », réponse au message qui recommandait chaque point) : comportements de phase 0
validés ; la règle s'applique aussi **dans les questions** (numéro + 1re phrase + formule) ; retouche
de la fiche `eval-premiere` (carré à 65 %) après livraison, sur sa demande.

- Code : `typst-generator.ts` (`ubu-colle()`, `TYPST_BREAK_MARKER`, `keepWithNextOnPage`,
  `isChained`, option `chainedStart`), `render-exercise.ts` (marqueur avant section / titre).
- Tests de mise en page réelle : `coupures-colonnes.test.ts` (compilation + `query` des positions ;
  `$typst.query` seul ne compile pas → `createTypstCompiler` + `runWithWorld`).
- Piège trouvé à la mesure : un marqueur en bloc de hauteur nulle, premier bloc d'une colonne,
  empêchait Typst d'y supprimer l'espace au-dessus du titre → 455 → 476 pages. Avec `place` (sans
  alignement vertical) : **455 → 451 pages, aucun PDF plus long, trous > ¼ col 13 → 7**, 0
  diagnostic (48 fiches × fiche + corrigé, `regen-depuis-base --toutes --modele-de-la-fiche`).

## 5. Écart vu à la mesure (déjà en prod, avant ce chantier)

Fiche `41737393` : « 4 Lire les variations » seul en bas de page. L'énoncé commence par une
question dont la tête est collée à un dessin : le titre est collé au bloc de l'énoncé, qui laisse un
premier morceau vide en bas de page. Règle A « titre jamais seul » violée → PR 2.

Relecture de #2518 (`code-reviewer`) : titre `##` sans marqueur (décision lue sur un marqueur
périmé, test rouge puis vert) et marqueurs dans les cellules d'une grille `:colonnes` (largeur de
cellule) → corrigés dans la PR ; forme « Réponses » ajoutée aux tests. Mesure inchangée.

## 6. PR 2 : titre seul en bas de page (2026-11-09)

Cause (mesurée au compilateur de prod, typst.ts 0.6.1-rc5) : le titre d'exercice (`sticky`) ne suit
le bloc de l'énoncé que si le premier morceau de ce bloc est **vide**. Y laissaient une trace : un
`block` qui enveloppe le contenu (bloc de `ubu-item`, grille de `ubu-item-bloc`) et un `context`
(celui de `ubu-item`, et le dessin `cetz`) devant un bloc qui part en entier. Le `pad`, lui, n'en
laisse pas. Cas en échec avant : question à tête collée (fiche 41737393), question qui commence
par un dessin, énoncé qui commence par un dessin, exercice indispensable (filet).

Correctif : `ubu-item` / `ubu-item-bloc` = bloc vide collé + `v(0pt, weak: true)` + `context` →
`pad` + `v(0pt, weak: true)` + bloc vide (espacement 1,5em porté par les blocs vides : le plus grand
l'emporte, comme `block(spacing:)` ; un `v` faible, lui, l'emporte toujours, −3 pt mesurés).
`ubu-item-bloc` : numéro par `place`. Tête et corps dans le même `pad` (un `pad` à part pour le
corps empêchait la tête de suivre un dessin, régression vue sur 41737393 puis corrigée).
`chainedStart` : bloc vide collé en tête de l'énoncé (`CHAINED_START_TYPST`).

Tests : `coupures-colonnes.test.ts`, 7 cas de titre (rouges sur `main`) et un test d'espacement contre
l'ancienne définition (au centième de point, gabarit `block(spacing: 1.8em)`).

Mesure (48 fiches, fiche + corrigé) : 451 → 452 pages (corrigé c9e0effd : titre « 2 » qui restait
seul en bas de page 2, une ligne repoussée en page 4). 29 PDF avec un écart vertical, 25 commencent
par un titre, un « Partie B » ou un numéro seul en bas de page. Effet de bord : le texte des
questions est justifié partout (l'ancienne définition en laissait une partie en drapeau) ; David :
« justifier » (2 fois, après avoir vu le pire cas, un corrigé à formules, 64acbbf3).
