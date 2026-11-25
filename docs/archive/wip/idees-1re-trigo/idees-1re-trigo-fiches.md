# Fiches de phase 0 : fonctions trigonométriques de Première (2026-11-25)

Chantier [`idees-1re-trigo`](idees-1re-trigo-progress.md) · [relevé](idees-1re-trigo-releve.md). Pour
chaque idée : ma recommandation, son point (un seul, ADR 0020), sa sous-notion, ses variations, ses
plages, sa forme de réponse et le passage « chez eux → chez nous ». Chaque variation aura ses
`testSpecs`, trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

Bornes : décision **l1s-3** (valeurs 0, π/6, π/4, π/3, π/2 et tout réel associé lisible sur le cercle, à
2kπ près ; valeurs numériques, pas de simplification littérale).

**Question d'accès** : personne ne gagne d'accès. Un modèle neuf est rangé (nœud et point) et des
variations s'ajoutent à des modèles publiés.

## F1. Radians ↔ degrés hors valeurs remarquables (1AN40-1) : 2 variations de 4b3c1d88 (1SPE-409)

- **Chez eux → chez nous** : une saisie dans les deux sens ; radians quelconques (aπ/b, a, b ≤ 50) vers
  degrés arrondis au dixième. Chez nous, une saisie exacte : on choisit des réels dont la mesure en
  degrés est entière, et des degrés entiers. L'arrondi au dixième ne vérifie que la calculatrice.
- **V3** (radians → degrés) : π/12, 5π/12, 7π/12, 11π/12, π/5, 2π/5, 3π/5, 4π/5, π/9, 2π/9, 4π/9,
  π/10, 3π/10, π/18 → 15°, 75°, 36°, 40°… v2 ne fait que le sens degrés → radians.
- **V4** (degrés → radians, fraction simplifiée) : 10°, 20°, 25°, 35°, 40°, 50°, 70°, 80°, 100°,
  140°, 160°, 200°, 250°, 320° → π/18, π/9, 5π/36… La fraction doit être irréductible (`requiredForm`).
- **Erreurs prévues** : V3 : multiplier par π/180 au lieu de 180/π ; diviser 180 par le numérateur
  (5π/12 → 36) ; répondre en radians. V4 : fraction non simplifiée (50π/180) ; d/180 sans π ;
  180/d·π (rapport à l'envers).
- **Coup de pouce** : « π rad = 180° : remplace π par 180. » (V3) ; « 1° = π/180 rad. » (V4)

## F2. Ramener un réel dans [0 ; 2π[, et dénominateurs 5 et 12 (1AN40-2, 1AN40-3) : 2 variations de f7194c9d (1SPE-304)

- **Chez eux → chez nous** : même forme, une saisie. Leurs dénominateurs 7, 9, 11, 13 ne sont pas repris
  (aucun cercle ne les montre, c'est du calcul de reste sans lien avec la figure) ; 5 et 12 le sont, en
  une variation.
- **V6** : l'intervalle [0 ; 2π[ : −aπ/6, −aπ/4, −aπ/3, ou des réels de 2 à 4 tours (29π/6 → 5π/6,
  −7π/4 → π/4). f7194c9d n'a que ]−π ; π].
- **V7** : ]−π ; π] avec des dénominateurs 5 ou 12 (23π/12 → −π/12, 17π/5 → −3π/5), 1 à 3 tours.
- **Erreurs prévues** : le réel dans ]−π ; π] quand [0 ; 2π[ est demandé (et l'inverse) ; un tour de trop
  ou de moins (± 2π) ; le symétrique (−x au lieu de x − 2kπ).
- **Coup de pouce** : « Ajouter ou retirer 2π ne change pas le point : écris 2π = 12π/6. »

## F3. Lire le réel d'un point dans [0 ; 2π[ (1AN40-3) : 1 variation de aad6c700 (1SPE-304)

- **Chez eux → chez nous** : figure à 16 points nommés, on tape le réel. Chez nous, le bloc `trig` montre
  le point M seul ; une saisie.
- **V6** : point M sur π/6, π/4, π/3 ou π/2 (multiples), mesure demandée dans [0 ; 2π[ (M à −π/3 →
  5π/3).
- **Erreurs prévues** : la mesure de ]−π ; π] (−π/3) ; le symétrique (π/3) ; 2π − x confondu avec π − x.
- **Coup de pouce** : « Dans [0 ; 2π[, on tourne toujours dans le sens direct depuis I. »

## F4. cos et sin d'un réel à plusieurs tours, points des axes (1AN41-1) : 2 variations de 679a2e3e (1SPE-307)

- **Chez eux → chez nous** : une case (cos ou sin), k jusqu'à 30 tours. Chez nous deux cases (cos et sin),
  comme le modèle ; 1 à 4 tours suffisent à faire travailler le « à 2kπ près » de l1s-3.
- **V3** : réels remarquables ou associés plus 2kπ, k de 1 à 4, signes ± : 25π/6, −17π/4, 23π/3.
- **V4** : points des axes : π, 3π/2, −π/2, 3π, −5π/2, 7π/2 (cos et sin valent 0, 1 ou −1). Ni 5a89b292 ni
  679a2e3e ne les ont.
- **Erreurs prévues** : V3 : le signe opposé (mauvais quart) ; cos et sin échangés ; la valeur de l'angle
  de référence sans le signe. V4 : cos et sin échangés ; 1 au lieu de −1 ; 0 partout.
- **Coup de pouce** : « Retire d'abord des tours complets (2π) pour te ramener entre −π et π. »

## F5. Calculer sin x connaissant cos x (1AN41-3) : modèle neuf, 1re spé, 1SPE-305

- **Chez eux → chez nous** : une saisie ; la réponse peut rester √0,91. Chez nous, une saisie exacte
  jugée par nos règles (√0,91 et √91/10 acceptés tous les deux).
- **Sous-notion** : « cosinus et sinus d'un réel », comme ee4e2ac6. `grades = ["1_SPE"]`. Un modèle neuf
  plutôt que des variations de ee4e2ac6 : son titre (« cos x connaissant sin x ») resterait juste.
- **V1** : cos x = a/b (triplets pythagoriciens : 5, 13, 17, 25), x ∈ [0 ; π] → sin x = c/b.
- **V2** : même chose, x ∈ [−π ; 0] → sin x = −c/b.
- **V3** : cos x = a/b, b de 3 à 9, réponse ±√(b² − a²)/b (radical simplifié), intervalle [0 ; π] ou
  [−π ; 0].
- **V4** : cos x décimal (0,6 ; −0,8 ; 0,28 ; 0,3…), réponse décimale ou √(1 − c²).
- **Erreurs prévues** : le bon nombre avec le mauvais signe ; 1 − cos x (sans les carrés) ;
  √(1 + cos² x).
- **Coup de pouce** : « Pour tout réel x, cos² x + sin² x = 1. Le signe se lit sur le demi-cercle où est
  x. »

## F6. cos x connaissant sin x décimal (1AN41-3) : 1 variation de ee4e2ac6 (1SPE-305)

- **Chez eux → chez nous** : comme F5.
- **V7** : sin x décimal (0,6 ; −0,28 ; 0,8…), x ∈ [−π/2 ; π/2] ou [π/2 ; 3π/2] (les intervalles de
  leur exercice) ; ee4e2ac6 n'a que des fractions et des quarts de tour.
- **Erreurs prévues** et **coup de pouce** : ceux de F5, cos et sin échangés.

## F7. Rien : ce qui n'est pas repris

- **1AN41-2** (simplifier cos(x + π)…) : hors programme de 1re (l1s-3, pas de simplification littérale).
  L'idée est déjà écrite dans les brouillons 174e202b et dc4b8d08, laissés sans point par
  `questions-1spe` (D17).
- **Réel → nom du point** sur une figure à 16 points (1AN40-3) : 558c31a7 le fait mieux par le geste
  `placer:`.
- **k jusqu'à 30 tours**, dénominateurs 7, 9, 11, 13, **arrondi au dixième de degré** : rien de plus à
  apprendre que dans F1, F2 et F4.
