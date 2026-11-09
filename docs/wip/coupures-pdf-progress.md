# Chantier `coupures-pdf` — quelles coupures de colonne et de page on autorise dans les PDF

## Reprendre ici

_Mis à jour le 2026-11-09, ouverture du chantier._

- **État** : trois niveaux validés (§ 1) ; étude typst faite (§ 3) : mécanisme fiable, trous divisés par deux ; garde-fou presque sans gain.
- **Prochaine action** : selon la réponse de David, phase 0 (comportements) puis tests rouges et implémentation dans `typst-generator.ts` + `render-exercise.ts`.
- **En attente de David** : (1) garde-fou abandonné ? (2) règle aussi dans les questions (numéro + 1re phrase + formule) ? (3) fiche `eval-premiere` : comment gagner les deux lignes.
- **Pièges en cours** : `sticky` de typst ne distingue pas colonne et page ; typst.ts 0.6.1-rc5 = Typst 0.13.1 (CLI local = 0.14, pas témoin : `scripts/fiches/compile-prod.mjs`).
- **Worktree / branche** : `../ubumaths-wt-coupures-pdf` · `feat/coupures-pdf`.

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
