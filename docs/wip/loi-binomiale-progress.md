# Loi binomiale (Terminale, manche 11) — progression

Décisions Q134-Q140 (`outils-statistiques-v2-progress.md`). Programme vérifié sur Éduscol
(spécialité terminale) : P(X = k), P(X ⩽ k), P(k ⩽ X ⩽ k′), intervalle I sans méthode imposée,
seuil (surréservation). Spec PR (a) validée le 2026-10-03.

## PR (a) — `X ~ B(n ; p)` dans le bloc ```loi

- [x] `statistics/binomial.ts` : probabilités EXACTES en entiers (dénominateur commun b^n),
      arrondi exact demi vers le haut (`roundExact`), E / V / σ par les formules
- [x] Parseur : `X ~ B(n ; p)` / `X suit B(n ; p)`, n de 1 à 1 000, p entre 0 et 1 ; `arrondi:`,
      `probabilités:` (bornes entières) ; seule, sans `X =` / `P =` ; avertissement > 30 valeurs
- [x] Scène : tableau arrondi, titre « Loi de X : B(10 ; 0,3) », indicateurs puis probabilités ;
      vertical quand la ligne serait trop large (estimation valeurs × caractères, mesurée sur la
      fiche), pas de tableau au-delà de 30 valeurs ; écran et Typst ; filet anglais
- [x] Fiche compilée et vérifiée à la main (B(10 ; 0,3), B(5 ; 1/2), B(100 ; 0,5))
- [ ] Revue, PR, CI, merge

## PR (b) — `diagramme:`, `intervalle:`, `seuil:`, simulation

## PR (c) — atelier `.binomiale`
