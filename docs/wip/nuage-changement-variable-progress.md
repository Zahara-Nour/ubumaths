# Bloc ```nuage : changement de variable (manche 15, PR b) — progression

Décisions Q166-Q172 (`outils-statistiques-v2-progress.md`). Spec validée par David le 2026-10-04 ;
prévisions avec les coefficients EXACTS (pas les arrondis affichés), comme l'affine.

## Exemple de référence (Python)

`x: 0 ; 1 ; 2 ; 3 ; 4 ; 5` / `y: 2,1 ; 3 ; 4,6 ; 6,9 ; 10,2 ; 15,4` / `ajustement: z = ln(y)` :
« z = 0,401x + 0,723 » ; « y = e^0,723 × e^(0,401x) ≈ 2,061 × e^(0,401x) » (vrais exposants) ;
r (sur (x ; z)) = 0,9998 → « r ≈ 1,000 » ; x = 7 → y ≈ 34,152 (extrapolation) ;
y = 50 → x ≈ 7,950.

## Périmètre

- `ajustement:` accepte les 8 formes `z = ln(y)`, `z = y²`, `z = √y`, `z = 1/y`, `t = ln(x)`,
  `t = x²`, `t = √x`, `t = 1/x` (une seule variable changée) ; relation retrouvée écrite sous
  forme naturelle (`z = √y` → y = (ax + b)² ; `t = ln(x)` → y = a ln(x) + b ; …).
- Nuage (x ; y) d'origine + COURBE de la relation retrouvée (pas une droite).
- `nuage: z` (ou `nuage: t`) : nuage transformé + droite z = ax + b.
- `indicateurs:` point moyen (du nuage transformé), équation, r (sur le nuage transformé).
- `prévoir:` x = … / y = … sur la relation retrouvée, interpolation / extrapolation,
  pointillés depuis la courbe ; coefficients exacts.
- Calcul en décimal (ln, √ irrationnels), arrondi une fois.
- Erreurs (avec ligne) : valeur interdite (ln / √ d'un nombre ⩽ 0 ou < 0, 1/0) avec le point
  nommé ; forme hors liste → message avec la liste.
- Écran + Typst + anglais.

## Étapes

- [x] Tests rouges · [x] Implémentation · [x] Fiche compilée et regardée · [x] Revue Opus (valeurs trop grandes, domaine avant pente, arrondi décimal exact, coupe aux pôles) ·
      [ ] PR, CI, merge
