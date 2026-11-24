# Chantier `idees-3e-fonctions-affines`

## Reprendre ici

_Mis à jour le 2026-11-24, avant toute PR._

- **État** : phase 0 validée (« je suis tes recos », § Phase 0). 3 modèles publiés exportés dans
  `scripts/questions/idees-3e-fonctions-affines-publies/` et réservés. Lot en cours d'écriture par
  deux agents, NON commité : `docs/wip/questions/idees-3e-fonctions-affines-{publies,neufs}.py`
  → `scripts/questions/idees-3e-fonctions-affines-{publies,neufs}/`.
- **Prochaine action** : relire ces fichiers DANS LE CODE (agent interrompu = fichiers peut-être
  incomplets) ; relancer les contrôles (script, `question:specs --file`, `create-questions` en
  simulation, `sonde-courbes`, diff des publiés = ajouts en fin seulement) ; essai en base
  locale ; PR des fichiers.
- **En attente de David** : rien avant la PR ; avant le rangement, la conséquence de Q1 (N2 rangé
  en géométrie, § Phase 0).
- **Pièges en cours** : 27ac630c (brouillon d'un autre chantier, `associer`) n'est pas à nous.
  Page à cocher (non remplie) : https://claude.ai/artifact/1LaJj9eyGg6Zr3Vh3zyG9f.
- **Worktree / branche** : `../ubumaths-wt-idees-3e-fonctions-affines`,
  `feat/idees-3e-fonctions-affines`.

## Phase 0 (2026-11-24)

**Décision de David (2026-11-24)** : « je suis tes recos » — les 7 fiches (F1-F3, N1-N4) et les
réponses recommandées à Q1 (point 2-322), Q2 (antécédent fractionnaire : oui), Q3 (seulement
x/c + b). Page à cocher non remplie. Modèles publiés 15ddcc75, 7c7b7593, 45247528 réservés dans
le tableau de répartition (main b6c08a4aea).

⚠️ Conséquence de Q1 relevée après coup (à dire à David avant la migration de rangement) : le
point 2-322 est rangé sous « Géométrie > Géométrie repérée > équations de droites » ; la règle
« point sur le nœud ou sur sa notion » range donc N2 dans ce nœud de géométrie, pas sous
« Fonctions affines ». Autre choix : N2 sans point, sous « Fonctions > Fonctions affines >
expression et droite ».

Question d'accès de la migration : **personne** ne gagne de lecture (on range et on tague des
modèles de questions).

Chaque fiche : chez eux → chez nous, ma recommandation, point (un seul), variations, plages, forme
de réponse.

### F1 — Image par une fonction affine : plus de formes (variations de 15ddcc75, 3-066)

- Chez eux (3F20-1) : image par f(x) = ax + b, a entier ou fraction. Chez nous : une seule
  variation (a ∈ ±[2 ; 9], b ∈ ±[1 ; 9], x ∈ [−9 ; 9]).
- **Recommandation** : 3 variations ajoutées à la fin. v2 forme b + ax ; v3 fonction écrite
  f : x ↦ ax + b ; v4 coefficient en demis, a = k/2 et x pair (image entière). Saisie d'un nombre.
- Erreurs prévues : ax oublié (b seul), a + x au lieu de ax, signe de b perdu.

### F2 — Antécédent par le calcul (variations de 7c7b7593, 3-040)

- Chez eux (3F23-1) : antécédent par ax + b, a(x + b) + c, a(bx + c) + dx + e ; réponse
  fractionnaire ; QCM dont les leurres sont des erreurs d'élève.
- Chez nous : v4-v5 donnent des antécédents entiers de ax et ax + b. **Leur QCM devient notre
  saisie**, et leurs leurres deviennent nos **erreurs prévues** : (k − b)·a au lieu de (k − b)/a
  (quotient inversé), (k + b)/a (signe non changé), f(k) (image prise pour l'antécédent).
- **Recommandation** : v6 f(x) = a(x + b) + c, antécédent entier ; v7 f(x) = ax + b, antécédent
  fractionnaire (fraction irréductible demandée, `requiredForm`). Pas de a(bx + c) + dx + e
  (calcul littéral plus que fonction).
- ⚠️ Bornes : 3-040 dit « image par une expression littérale simple » ; l'antécédent par le calcul
  y est déjà (v4-v5, chantier précédent). Q2 pour v7.

### F3 — Fonction linéaire par une image (variations de 45247528, 3-043)

- Chez eux (3F20) : f linéaire, f(x₀) = y₀ ; donner f(x), puis l'image ou l'antécédent d'un autre
  nombre. Chez nous : v2 demande seulement « a = ».
- **Recommandation** : v5 « f(n) = … ; donne l'expression de f(x) » (saisie f(x) = ax) ; v6 « f(n)
  = … ; calcule f(m) » (passage par a ou par la proportionnalité) ; v7 « f(n) = … ; quel nombre a
  pour image k ? ». a ∈ ±[2 ; 9], n ∈ [2 ; 6], m ∈ [−9 ; 9].
- Erreurs prévues : f(x) = n·x ou f(x) = y₀·x (rapport renversé), f(m) = y₀ + m.

### N1 — Coefficient directeur et ordonnée à l'origine d'une expression (modèle neuf, 3-044)

- Chez eux (3F20-4) : deux cases a et b sur 12 formes. Chez nous : 2d29792b fait seulement
  nommer a et b dans ax + b (QCM).
- **Recommandation** : modèle neuf « Lire les coefficients d'une fonction affine sur son
  expression », deux cases (coefficient directeur, ordonnée à l'origine) dans une phrase. 6
  variations : b + ax ; ax (b = 0) ; b seul (a = 0, constante) ; x/c + b ; c(ax + b) (à développer)
  ; ax + b + cx (à réduire). Coefficients ±[2 ; 9]. Pas les racines carrées ni les fractions
  ((ax + b)/c) : Q3.
- Erreurs prévues : a et b inversés, signe de b oublié dans b − ax, c(ax + b) lu a et b sans
  développer.

### N2 — Fonction affine par deux images (modèle neuf ; point : Q1)

- Chez eux (3F21-2, 3F20-1 types 2 et 7) : f affine, f(x₁) = y₁ et f(x₂) = y₂ ; donner f(x).
- **Recommandation** : modèle neuf « Déterminer une fonction affine par deux images ». Saisie de
  l'expression f(x) = … (jugée comme expression en x). 4 variations : f(0) = b et f(x₀) = y₀ ;
  x₂ = x₁ + 1 (a se lit directement) ; quelconque à coefficients entiers ; fonction constante
  (y₁ = y₂). Valeurs de [−5 ; 5], a, b entiers. Corrigé : a = (y₂ − y₁)/(x₂ − x₁), puis b.
- Erreurs prévues : a = (x₂ − x₁)/(y₂ − y₁), b oublié (f(x) = ax), b = y₁ sans retrancher ax₁.

### N3 — Expression d'une fonction affine lue sur sa droite (modèle neuf, 3-067)

- Chez eux (3F21-1, 3F21-3) : une à cinq droites, « donner l'expression ». Chez nous : lectures
  séparées (c64028b0 ordonnée, 0d0e88f5 et b9771108 coefficient).
- **Recommandation** : modèle neuf « Lire l'expression d'une fonction affine sur sa droite », une
  droite par question, une case f(x) = …. 3 variations : pente entière ±[1 ; 3] et b ∈ ±[1 ; 4] ;
  linéaire (b = 0) ; pente en demis. Corrigé ` ```courbe ` avec (0 ; b) et (1 ; a + b) marqués.
  Point 3-067 (« Déterminer graphiquement les coefficients »).
- Erreurs prévues : a et b inversés, signe de la pente, pente lue sur le quadrillage à l'envers
  (2 au lieu de 1/2).

### N4 — Tracer la droite d'une fonction affine (modèle neuf, 3-039)

- Chez eux (3F20-3) : figure interactive, droite jugée par deux points. Chez nous : geste
  `tracer:` du ` ```courbe ` (8d4bd94d, Seconde).
- **Recommandation** : modèle neuf de 3e « Représenter graphiquement une fonction affine »,
  vocabulaire de 3e (f(x) = ax + b, pas « équation réduite »). 3 variations : a entier ±[1 ; 3],
  b ∈ ±[1 ; 3] ; linéaire ; a en demis. Repère de −5 à 5. Point 3-039 (« formule, graphique,
  tableau de valeurs »).

### Rien

- 3F23 (intersection par le calcul) : pas dans les points de 3e, la Seconde l'a (718b7183, 2-319).
- 3F23-2 : couvert (15ddcc75, 7c7b7593, brouillon 27ac630c).
- 3F24DNB-1 : rubrique « brevet », à faire en dernier.

### Questions

- **Q1** (N2) : « fonction affine par deux images » n'a pas de point en 3e. Je recommande le point
  de Seconde **2-322** (« Déterminer une équation de droite passant par deux points donnés »),
  permis (niveau suivant), `grades` = 3 et 2. Autre choix : sans point.
- **Q2** (F2 v7) : antécédent fractionnaire en 3e ? Je recommande oui (fraction irréductible).
- **Q3** (N1) : formes fractionnaires (ax + b)/c et x/c + b/d ? Je recommande seulement x/c + b
  (un seul quotient, a = 1/c).
