# Lois à densité de maths complémentaires (manche 13, PR b) — progression

Décisions Q150-Q159 (`outils-statistiques-v2-progress.md`). Spec validée par David le 2026-10-04.

## Périmètre

- `X ~ U([a ; b])` (a < b, décimaux admis) : titre « loi uniforme sur [0 ; 10] » ;
  probabilités exactes (longueur / (b − a)) ; E par défaut, V / σ sur demande,
  `indicateurs: aucun` ; `répartition: oui` → « F(x) = (x − a)/(b − a) pour x ∈ [a ; b] ;
  0 avant, 1 après ».
- `X ~ E(λ)` (λ > 0) : titre « E(0,5) » ; P(X ⩽ x) = 1 − e^(−λx), P(X ⩾ x) = e^(−λx),
  P(c ⩽ X ⩽ d), P(X > a | X > b) = e^(−λ(a − b)) ; forme exacte affichée
  (« 1 − e^(−0,5 × 2) = 1 − e^(−1) ≈ 0,632 ») ; E = 1/λ par défaut, V = 1/λ², σ ;
  `répartition: oui` → « F(x) = 1 − e^(−0,5x) pour x ⩾ 0 ».
- `diagramme: oui` : courbe de densité, aire hachurée de la PREMIÈRE probabilité demandée,
  `aire: P(…)` pour en choisir une autre ; exponentielle coupée où il reste < 1 %
  (x ≈ ln(100)/λ, arrondi « joli » vers le haut : 9,2 → 10 pour λ = 0,5).
- `<` et `⩽` donnent la même valeur ; P(X = x) = 0 avec la mention « loi à densité :
  P(X = x) = 0 » (pas un avertissement).
- Erreurs (avec ligne) : U([5 ; 2]) ; E(0), E(−1) « λ est un nombre strictement positif » ;
  `intervalle:`, `seuil:`, `masquer:`, `jusqu'à:` refusés (pas de tableau) ; `aire:` sans
  `diagramme: oui`. Événement hors support → 0 + avertissement « X prend ses valeurs dans
  [0 ; 10] » / « … à partir de 0 » (règle des bornes écrites, Q158).
- Typst identique (cetz, hachures `tiling`) ; anglais : « uniform distribution on [0, 10] »,
  `Exp(0.5)`, axe « Density ».
- Hors PR : simulation ; densité définie par une fonction de l'auteur.

Valeurs de référence (Python) : U([0 ; 10]) P(2 ⩽ X ⩽ 5) = 3/10 ; E 5 ; V 25/3 ≈ 8,33 ;
σ ≈ 2,89. E(0,5) : P(X ⩽ 2) ≈ 0,632 ; P(X ⩾ 4) ≈ 0,135 ; P(1 ⩽ X ⩽ 3) ≈ 0,383 ;
P(X > 5 | X > 2) ≈ 0,223 ; E 2 ; V 4 ; σ 2 ; quantile 99 % ≈ 9,21.

## Étapes

- [ ] Tests rouges · [ ] Implémentation · [ ] Fiche compilée et regardée · [ ] Revue ·
      [ ] PR, CI, merge
