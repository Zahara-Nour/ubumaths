# Lois discrètes de maths complémentaires (manche 13, PR a) — progression

Décisions Q150-Q157 (`outils-statistiques-v2-progress.md`). Spec validée par David le 2026-10-04.

## Périmètre

- `X ~ G(p)` (p dans ]0 ; 1]) : tableau k = 1 à 10 + « … », `jusqu'à:` (≤ 30) ; P(X = k),
  P(X ⩽ k), P(X > k), P(k ⩽ X ⩽ k′), P(X > a | X > b) (a > b) exactes ; E par défaut,
  V / σ sur demande ; `diagramme:` coupé + « valeurs suivantes non représentées » ;
  `masquer:` ; P(X = 0) = 0 avec avertissement ; `intervalle:` / `seuil:` refusés.
- `X ~ U(a ; b)` entiers, a < b, ≤ 1 000 valeurs ; titre « loi uniforme sur {1, …, 6} » ;
  pas de tableau au-delà de 30 valeurs ; `U([a ; b])` refusé (« loi à densité : bientôt »).
- `B(1 ; p)` : titre « (loi de Bernoulli) ».
- Typst identique ; anglais (Geo(0.2), uniform distribution on {1, …, 6}, Bernoulli
  distribution, following values not shown) ; exact en fractions, arrondi une fois.

Valeurs de référence (Python, fractions) : G(0,2) → 0,2 · 0,16 · 0,128 · 0,102 · 0,082 ·
0,066 · 0,052 · 0,042 · 0,034 · 0,027 ; P(X = 3) 0,128, P(X ⩽ 3) 0,488, P(X > 3) 0,512,
P(2 ⩽ X ⩽ 4) 0,390, P(X > 5 | X > 2) 0,512 ; E 5, V 20, σ 4,472. U(1 ; 6) : E 3,5,
V 35/12 ≈ 2,917, σ 1,708 ; U(0 ; 9) : E 4,5, V 8,25. B(1 ; 0,3) : V 0,21, σ 0,458.

## Étapes

- [x] Tests rouges (statistics, parseur, scène, Typst, anglais) — 2026-10-04
- [x] Implémentation (non commitée, relecture de David)
- [x] Fiche compilée et regardée (FR + EN, débords : 0 ; valeurs identiques après les corrections de revue)
- [x] Revue (Opus) : 6 correctifs (perf BigInt brut, avertissement P(X = 2,5), `<div>` de la
      mention, message des trois lois, E/V approchés pour p décimal, tests conditionnelle) — 2026-10-04
- [ ] À trancher par David : avertissement hors support pour U ; `indicateurs: aucun`
- [x] PR, CI, merge

## PR de suite — Q158, Q159 (accord de David, 2026-10-04)

- Q158 : U(a ; b) — une borne ÉCRITE hors de [a ; b] (P(X = 7) pour U(1 ; 6), P(X ⩽ 0)…)
  avertit « X prend ses valeurs de 1 à 6 », comme G(p) pour une borne < 1.
- Q159 : `indicateurs: aucun` accepté pour B(n ; p), G(p), U(a ; b) : aucun indicateur
  (cache l'E par défaut de G et U ; fiche où l'élève calcule E).
- [x] Tests rouges · [x] Implémentation (non commitée) · [x] Revue (relu par la session principale : diff de 25 lignes) · [x] PR, CI, merge
