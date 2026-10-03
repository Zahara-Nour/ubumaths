---
title: Produit scalaire 1re SPE — questions
date: 2026-10-02
status: 13 modèles en brouillon (2026-10-02)
---

# Produit scalaire 1re SPE — point de reprise

## Commande de David (2026-10-02)

« go pour le produit scalaire ». Aucun modèle de géométrie n'existait. Décisions validées (« ok ») :

1. Pas de repère : coordonnées données dans le texte ; bloc `figure (sans axes ni grille) pour
illustrer. Un repère pour `figure = chantier séparé éventuel (géométrie repérée).
2. `\lVert … \rVert` interdit (sort « lVert » en PDF) ; `\|\vec u\|` fonctionne.
3. Étiquettes de points qui se chevauchent sur une petite figure : l'agent cherche l'option de
   position du DSL ; si elle ne suffit pas, il RAPPORTE avant de toucher geometry-core.
4. Réponses : forme exacte simplifiée (`a\sqrt b`, dénominateur rationnel) annoncée dans l'énoncé ;
   `acceptDecimal` ; `precision` pour les arrondis (longueur au dixième, angle au degré) ; angles en
   degrés (`45`, `45^\circ`, `45°` acceptés ; `\frac{\pi}{4}` refusé).
   Mesuré : `\sqrt{20}` et `\frac{1}{\sqrt2}` = mauvaise forme ; `\frac{-7}{2}`, `\sqrt5\times2` = non optimal.
5. Nouveau thème « Géométrie », domaine « Produit scalaire » : Calculer un produit scalaire,
   Propriétés, Angles et longueurs, Lieux de points (déclaré dans `category-order.ts`).
6. Exclus : loi des sinus, concourance des hauteurs / médianes (approfondissements).

## Modèles (`scripts/questions/produit-scalaire-1spe/`)

| Sous-domaine                 | Fichiers                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Calculer un produit scalaire | A-01 coordonnées, A-02 normes et angle, A-03 projection (figure), A-04 normes seules, A-05 choisir la méthode (figure) |
| Propriétés                   | B-01 bilinéarité, B-02 ‖u+v‖² et ‖u−v‖², B-03 orthogonalité                                                            |
| Angles et longueurs          | C-01 angle de deux vecteurs, C-02 Al-Kashi longueur (figure), C-03 Al-Kashi angle (figure)                             |
| Lieux de points              | D-01 cercle de diamètre [AB], D-02 MA·MB = k                                                                           |

**13 modèles créés en BROUILLON en production le 2026-10-02.** `question:specs` 190/190 ;
150 tirages par variation (7 350 instances) recalculés en Python, 0 écart ; 1 200 + 2 400 figures
passées par `buildFigureScene` sans erreur, longueurs/angles tracés conformes à l'énoncé ; PDF
compilés (compilateur de prod), pages relues.

Figures : le DSL ne règle pas la position du nom d'un point → noms posés par `texte()` (droits,
pas en italique ; ancrage écran ≠ PDF). Ajout possible à geometry-core (non fait) :
`point(…, etiquette="haut-gauche")`, `texte(…, ancre=…)` aligné écran/PDF.

## Points à relire — traités le 2026-10-02 (branche `fix/questions-points-pedagogiques`, pas encore en base)

Vérifié pour chaque modèle touché : `question:specs --instances 150` vert, 150 tirages par variation
recalculés en Python (0 écart), `buildFigureScene` sans erreur ni avertissement, aucun résidu
(`imaginaryI`, `lVert`, `{{`, NaN). **Les brouillons en base sont à mettre à jour (David).**

- **A-02** : 90° tiré dans les 4 variations (`k` ∈ 1..5, `s = sign(k-3)` → 20 % attendu ; mesuré
  15 %, 14 %, 19 %, 19 % sur 150), π/2 dans la variation en radians. Réponse 0, correction
  « cos 90° = 0 … les vecteurs sont orthogonaux ». Réponse attendue passée à `{{eval:…}}` (sinon
  `\frac{0}{2}`) ; énoncé v1 : « un entier, ou une écriture k√n… ». Specs ajoutées (90° → 0).
- **C-03** : v 120° — 15 triangles distincts sur 150 tirages (au lieu de 4) ; v 60° — 18 (au lieu
  de 8). Cause du 4 : la condition `m != 2*n` (utile à 60°, où elle exclut l'équilatéral) éliminait
  à 120° la famille (3, 5, 7) ; retirée pour 120°. Plages élargies (m, n, facteur k ≤ 4 ou 5) ;
  côtés jusqu'à **35 cm** (120°) et 32 cm (60°), rapport des côtés ≤ 2,2 conservé. Figures relues.
- **C-01** : deux variations ajoutées (v4 : 30°/150°, v5 : 60°/120°), coordonnées en k√3 et k
  (u(√3 ; 1), v(2 ; 2√3)…), normes entières, cos exact puis angle. 92 et 94 couples distincts ;
  angles équilibrés (30 : 78, 150 : 72, 60 : 82, 120 : 68). 12 specs ajoutées.
- **B-04-orthogonaux-ou-non** (nouveau, « Propriétés ») : QCM 2 choix, ordre fixe,
  `correctChoiceIndex` = `abs(sign(N))`. v0 coordonnées, v1 normes + angle en degrés, v2 en radians
  (mesures négatives ou > π : −π/2, 3π/2…), v3 points A, B, C. Orthogonaux : 40 %, 39 %, 53 %, 46 %.
  B-03 laissé tel quel : sa v3 contrôle la VALEUR de u·v, B-04 la CONCLUSION (complémentaires).
- **A-05** : le milieu I de [BC] interdit un trait sur BC (il tombe sur I : caché par [AI] dans le
  triangle, sur le nom I dans le carré — essayé et regardé). Codage retenu : chaque côté coupé en
  deux moitiés marquées d'un même trait (points milieux masqués), donc tous les côtés égaux ET I
  milieu de [BC]. Lisible, mais inhabituel : à valider par David.
- Hors champ, vu en passant : le rectangle de A-05 v2 n'a pas de marque d'angle droit.

## cleanCoefficients activé (2026-10-03)

`shared.cleanCoefficients: true` (`1x` → `x`, `+0` retiré, `+-` → `-`) ; exclusions de ±1 / 0 qui ne servaient qu'à l'affichage levées. Vérifié : specs vertes (150 tirages), 300 tirages par variation sans `1x`, `0x`, `+-`, `--` dans le rendu (les `4+0`, `-1-0` restants sont des étapes de calcul voulues).

- B-03 (orthogonalité) : b et p ∈ [−6 ; 6] privés de 0 seulement (et non de −1, 0, 1).
