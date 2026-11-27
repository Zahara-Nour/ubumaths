# Chantier `idees-6e-aires` — idées reprises d'ailleurs, rubrique « Aires » de 6e

## Reprendre ici

_Mis à jour le 2026-11-27, lot écrit, PR des fichiers ouverte._

- **État** : phase 0 tranchée (« je te suis ») ; gros lot écrit : 7 modèles neufs
  (`scripts/questions/idees-6e-aires-neufs/`, 22 variations) et 8 variations ajoutées à 82748db8, fdd849f5,
  01e205ed (`scripts/questions/idees-6e-aires-publies/`) ; specs vertes, sonde des figures 0 problème, essai en
  base locale (7 brouillons joués dans l'aperçu).
- **Prochaine action** : PR des fichiers mergée → David lance `create-questions --publier` (brouillons en prod)
  → commiter les ids → migrations de rangement et de contenu.
- **En attente de David** : `create-questions --publier` après le merge.
- **Pièges en cours** : 82748db8 partage `a` (1..9), fdd849f5 la condition `a>b` ; `e` est Euler (variable
  renommée `q`) ; le bloc figure n'a pas de `secteur` (demi-disque en polygone) ; `{{eval:-b/2}}` s'écrit en
  fraction LaTeX dans une figure (passer par `0.5*b`).
- **Worktree / branche** : `../ubumaths-wt-idees-6e-aires`, `feat/idees-6e-aires`.

## Phase 0 (2026-11-27)

17 exercices lus : 3 ✅ ou couverts, 9 🟡, 5 ❌ (dont 2 hors programme de 6e). Question d'accès de la migration :
**personne ne gagne d'accès**, on range des modèles du prof.

### Fiches

- **N1 — Relations entre m², dm² et cm²** (modèle neuf, point 6-150, 4 variations). Chez eux (6M2autoB, autoD,
  autoE) : phrases à trous en listes déroulantes, toujours la valeur 1. Chez nous : des saisies, sauf en (d).
  (a) « 1 dm² est l'aire d'un carré de côté ? » (cm, dm, m), case à unité (10 cm accepté pour 1 dm) ;
  (b) « 1 m = 10 dm, donc 1 m² = 10 dm × 10 dm = ? dm² » (m → dm, dm → cm) ; (c) « 1 cm² = ? dm² », fraction
  $\frac{1}{100}$ ou décimal 0,01 acceptés (et dm² → m²) ; (d) « 1 cm² est … de 1 dm² », case choix (une dizaine, une
  centaine, un dixième, un centième : leur forme gardée, la réponse est un mot). Erreurs prévues : 1 dm² comme
  côté (une aire au lieu d'une longueur), 10 dm² pour 1 m², 0,1 ou $\frac{1}{10}$ pour 1 cm².
- **N2 — Conversions d'aire, nombres variés** (4 variations ajoutées à 82748db8, publié, 6-150). Chez eux (6M2A) :
  70, 73, 0,7, 12,3, 912,07. Chez nous : a de 1 à 9 seulement. (e) 70 ou 73 dm² → m² (et cm² → dm²) ; (f) 3,7 dm²
  → cm², 0,7 ou 0,07 m² → dm² ; (g) 450 ou 1 200 cm² → dm² ; (h) 2 345 dm² → m². Une case nombre, unité donnée.
  Erreurs prévues : 37 cm² pour 3,7 dm² (× 10 au lieu de × 100), sens inversé (370 000), 0,073 m² pour 73 dm².
- **N3 — Aire en cm² sur un quadrillage de 1 cm** (modèle neuf, point : **Q1**, 3 variations). Chez eux
  (6M2autoC-1) : carrés, rectangles, triangles en carreaux, demi- et quarts de carreau. Chez nous : le BO de 6e
  (« carreaux dont les côtés mesurent 1 cm ») ; CM2 31d64c00 compte en carreaux sur figures fixes. (a) rectangle
  a × b tiré (3..9 × 2..6) sur grille ; (b) carré 2..6 ; (c) rectangle à un côté demi-entier (4,5 cm × 2 cm). Case à
  unité, cm² attendu. Erreurs prévues : le périmètre (2 × (a + b)), a + b, l'aire en cm. Les autres unités (demi-,
  quart de carreau) restent au CM2 : rien.
- **N4 — Comparer des aires sans mesurer** (modèle neuf, point : **Q2**, 3 variations). Chez eux (6M2autoA,
  12 cas) : rectangle hachuré superposé à une figure colorée, QCM « rectangle / figure / autant ». Chez nous :
  d623374d (CM2) compare sur quadrillage ; rien sans quadrillage. (a) une partie ajoutée ou retirée (demi-disque ou
  triangle) ; (b) une partie découpée et recollée de l'autre côté → « autant » ; (c) polygone inscrit dans le
  rectangle, ou rectangle inscrit dans un polygone. Case choix à 3 (leur forme gardée : une comparaison ne se tape
  pas). Erreurs prévues : « la figure colorée » en (b) (« son tour est plus long, mais la partie a seulement changé
  de place »). Le corrigé montre la partie déplacée en pointillés (l'animation : outil n° 70, plus tard).
- **N5 — Formules de l'aire du carré et du rectangle** (2 modèles neufs : 6-151 carré, 6-200 rectangle,
  3 variations chacun). Chez eux (6M2B) : trois listes déroulantes. Chez nous : 61ffb696 (5e) ; en 6e, 9f33998e et
  059e3fc9 calculent l'inverse. (a) « Écris la formule de l'aire $A$ : $A = ?$ », saisie d'expression
  ($c \times c$ ou $c^2$ ; $L \times l$ ou $l \times L$) ; (b) « L'aire d'un rectangle est égale au … de sa longueur
  par sa largeur », case choix (produit, somme, quotient, différence) ; (c) substitution : « $A = L \times l$.
  Calcule $A$ pour $L = 8$ cm et $l = 3$ cm », case à unité (BO : « substitue une valeur numérique à une lettre »).
  Erreurs prévues : $4 \times c$, $c + c$ ; $L + l$, $2 \times (L + l)$ ; 22 cm (le périmètre) en (c).
- **N6 — Aire et périmètre d'un même rectangle** (modèle neuf, 6-201, 3 variations). Chez eux (6M2C-4,
  6M2autoC) : périmètre et aire, deux cases à unité. Chez nous : jamais les deux ensemble (la confusion du
  chapitre). (a) rectangle L 3..11 × l 2..(L − 1) ; (b) carré 2..8 ; (c) deux rectangles de même périmètre
  (6 × 2 et 4 × 4) : lequel a la plus grande aire ? (case choix à 3 : le premier, le second, la même). Deux cases
  (cm, cm²) en (a), (b) : deux grandeurs, deux cases. Erreurs prévues : aire et périmètre inversés, L + l pour le
  périmètre, « la même » en (c).
- **N7 — Aire sur figure cotée, longueurs décimales** (2 variations ajoutées à fdd849f5, 6-201, et 2 à 01e205ed,
  6-152, publiés). Chez eux (6M2B-1, 6M2C, 6M2C-2) : figure cotée, décimaux. Chez nous : texte seul, entiers.
  fdd849f5 : (h) rectangle dessiné et coté (cm, entiers) ; (i) longueur 5..9 cm × largeur 1,2..3,9 cm.
  01e205ed : (h) carré dessiné et coté ; (i) côté à un chiffre après la virgule (1,1..5,9 cm). Erreurs prévues :
  le périmètre, 2 × c pour le carré, une virgule mal placée (2,52 au lieu de 25,2).
- **N8 — Rectangles accolés** (modèle neuf, 6-200, 3 variations). Chez eux (6M2C-3) : grille de rectangles, aires
  écrites, divisions successives, 1 à 7 étapes. Chez nous : rien. (a) deux rectangles côte à côte (aire et largeur
  du premier, aire du second : sa largeur ?) ; (b) trois rectangles en L (deux étapes) ; (c) grille 2 × 2 : l'aire
  du quatrième rectangle. Tables de 2 à 9, entiers. Case à unité. Erreurs prévues : une soustraction (42 − 6),
  une multiplication (aire × côté), l'aire en cm.
- **Rien** : 6M2C-1 et 6M2C-flash2 (couverts par 01e205ed, fdd849f5, 9f33998e) ; 6M2A-1 (mm², dam², hm², km², ha,
  deux sauts : hors bornes de 6-150, pour la 5e) ; 6M2B-2 (assemblages qui reposent sur l'aire du triangle : 5e).
  Les deux vont dans « Idées en attente » du tableau, pour une session de 5e.

### Questions

- **Q1 — Point de N3 (aire sur quadrillage).** Le BO de 6e le met dans les automatismes ; en prod, cet automatisme
  est rangé sur un point de CM2 (CM2-072), et un modèle de 6e ne prend pas un point d'un niveau précédent.
  Recommandation : **6-201** (calculer l'aire d'un rectangle : le quadrillage montre la formule, a × b carreaux).
- **Q2 — Niveau et point de N4 (comparer sans mesurer).** Le découpage-recollement est au CM (bornes de CM1-086),
  l'automatisme de 6e est rangé sur CM2-071. Recommandation : modèle de **CM2 et de 6e** (`grades` les deux), point
  **CM2-071**.

- **Q3 — Unités mm², dam², hm², km² de nos modèles de 6e (hors chantier).** 01e205ed, fdd849f5, 9f33998e et 059e3fc9 ont des variations en mm², dam², hm², km², alors que le BO de 6e ne nomme
  que cm², dm², m². Les bornes de ces points sont « général ». Recommandation : ne rien toucher.

## Historique

- 2026-11-27 : David répond « je te suis » au message des fiches N1 à N8 et des questions Q1 à Q3 (page à
  cocher sans verdict) : fiches et propositions retenues telles quelles. Modèles 82748db8, fdd849f5, 01e205ed
  réservés ; idées de 5e (6M2A-1, 6M2B-2) dans « Idées en attente ». Lot écrit par
  `docs/wip/questions/idees-6e-aires-neufs.py` et `…-publies.py`.

- 2026-11-27 : rubrique prise (84e8c5568f), relevé par deux agents Sonnet, plages recoupées dans le code, nos
  modèles relevés en prod ; phase 0 écrite ; outil n° 70 ajouté à `outils-manquants.md`.
