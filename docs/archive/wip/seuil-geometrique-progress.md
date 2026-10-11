# `seuil:` pour la loi géométrique (manche 14, PR a) — progression

Décisions Q160-Q165 (`outils-statistiques-v2-progress.md`). Spec validée par David le 2026-10-04.

- Bloc ```loi, `X ~ G(p)`:`seuil:` aux huit formes de la binomiale (`<`, `⩽`, `>`, `⩾`dans
l'événement ;`⩽`, `⩾` dans la comparaison), exact (fractions, BigInt sans réduction),
  arrondi une fois ; même ligne que la binomiale (« plus petit / grand k tel que … : k = …
  (P(X … k) ≈ …) ») ; k cherché de 0 à 1 000, sinon « aucun k de 0 à 1 000 ne vérifie … ».
- Valeurs (Python) pour G(0,2) : P(X > k) ⩽ 0,05 → k = 14 (≈ 0,044) ; P(X ⩽ k) ⩾ 0,95 → 14 ;
  P(X ⩽ k) ⩽ 0,5 → plus grand k = 3 (= 0,488) ; P(X > k) ⩾ 0,1 → plus grand k = 10 (≈ 0,107) ;
  G(0,000001), P(X > k) ⩽ 0,05 → aucun k de 0 à 1 000. G(1) : P(X ⩽ k) = 1 dès k = 1.
- Erreurs (avec ligne) : α hors de ]0 ; 1[ ; seuil mal écrit ou d'une autre variable ;
  U, U([…]), E : « option réservée aux lois binomiale et géométrique ».
- Atelier : `.geometrique X 0,2 seuil P(X > k) ⩽ 0,05` ; `seuil` sans valeur expliqué.
- Anglais : « smallest k such that P(X > k) ≤ 0.05: k = 14 (P(X > 14) ≈ 0.044) ».
- Typst : la ligne compile (FR + EN).

## Étapes

- [x] Tests rouges · [x] Implémentation · [x] Revue Opus (plus grand k au-delà de 1 000 : « tous les k … vérifient », sens écrits en dur, dichotomie = linéaire pour la binomiale) · [x] PR, CI, merge
