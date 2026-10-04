# Bloc ```nuage (manche 15, PR a) — progression

Décisions Q166-Q172 (`outils-statistiques-v2-progress.md`). Spec validée par David le 2026-10-04.

## Exemple de référence (Python, fractions)

`x: 1 ; 2 ; 3 ; 4 ; 5 ; 6` / `y: 12 ; 15 ; 19 ; 22 ; 27 ; 30` :
G(7/2 ; 125/6) → G(3,5 ; 20,833) ; a = 129/35 ≈ 3,686 ; b = 119/15 ≈ 7,933 ; r ≈ 0,998 ;
x = 4,5 → y ≈ 24,519 (interpolation) ; x = 8 → y ≈ 37,419 (extrapolation) ;
y = 25 → x ≈ 4,630 (interpolation).

## Périmètre

- Sans option : nuage seul, axes adaptés aux données, titres « x » / « y » ou `nom x:` / `nom y:`.
- `ajustement: affine` : droite des moindres carrés (y en x) sur toute la largeur + « y = 3,686x + 7,933 ».
- `indicateurs:` point moyen (G placé + écrit), équation, r ; `r²` refusé (« r seulement :
  le coefficient de corrélation »).
- `prévoir: x = 4,5 ; x = 8 ; y = 25` : valeur + interpolation / extrapolation (étendue des x
  observés), pointillés vers les deux axes ; refusé sans `ajustement: affine` ; pente nulle +
  `y = …` → « aucune solution » écrit.
- `arrondi: N` (défaut 3) ; `origine: oui` ; `titre:` (gardé avec la figure).
- Exact : moyennes, a, b en fractions, arrondis une fois ; r décimal.
- Erreurs (avec ligne) : longueurs différentes ; < 2 ou > 100 points ; abscisses toutes égales ;
  indicateur inconnu ; `r²`.
- Écran (SVG accessible : nb de points, G, équation) + Typst (cetz) ; anglais (point décimal,
  interpolation / extrapolation, mean point, correlation coefficient).
- `fitAffine` reste la source de l'atelier ; l'affichage du bloc passe par les fractions.

## Étapes

- [x] Tests rouges · [x] Implémentation · [ ] Fiche compilée et regardée · [ ] Revue ·
      [ ] PR, CI, merge
