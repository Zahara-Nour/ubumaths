# Fiches de phase 0, validées (chantier `idees-tle-suites`)

Validées par David le 2026-11-22 (« je valide », oui aux outils manquants ; F14 : moyenne Sₙ/n
ajoutée au lot). Page à cocher : https://claude.ai/artifact/TAe8JNJyzAsp3Qyv3uZq6q. Relevé :
[idees-tle-suites-releve.md](idees-tle-suites-releve.md). « Chez eux » = l'autre plateforme.

## Variations de modèles publiés (dossier `scripts/questions/idees-tle-suites-publies/`)

Chaque variation est **ajoutée à la fin** du modèle, jamais avant une variation existante.

- **F1 — Pas de limite : cos n et sin n** · 3d7d1d25 Limites usuelles d'une suite · TSPE-402.
  Chez eux (TSA1-20) : saisie avec une touche « n'existe pas ». Chez nous : case choix (0, +∞, −∞,
  k, « la suite n'a pas de limite »), comme ea9d2de8 pour (−1)ⁿ. Variation : uₙ = k·cos n ou
  k·sin n, k de 1 à 5, signe au hasard → pas de limite.
- **F2 — Somme 1 + q + … + qⁿ quand |q| ⩾ 1** · ~~708f8a08~~ → **modèle neuf**
  `f02-somme-geometrique-raison-hors-intervalle` (2026-11-22 : 708f8a08 porte aussi TCOMP-210,
  borné à 0 ⩽ q < 1) · TSPE-383. Chez eux (TSA1-27) : QCM.
  Variations : (a) q de 2 à 5 → +∞, saisie ; (b) q = −1 ou q de −5 à −2 → pas de limite, choix.
- **F3 — Gendarmes avec cos n et sin n** · ~~98ba277c~~ → **modèle neuf** `f03-gendarmes-cos-sin`
  (2026-11-22 : 98ba277c porte aussi TCOMP-205, pas de trigonométrie en complémentaire) · TSPE-578. Chez eux (TSA1-25). Variations :
  (a) uₙ = L + a·cos n / n (ou sin n), a de 1 à 9, L de −9 à 9 → L ; (b) uₙ = (an + c·sin n)/(bn)
  → a/b. Saisie, comme les variations (−1)ⁿ publiées.
- **F4 — Limite infinie par minoration avec cos n** · 7063979e · TSPE-385. Chez eux (TSA1-25, 48).
  Variation : uₙ = n² + a·cos n ou uₙ = n/(a + cos n), a de 2 à 6 → +∞. Case choix comme les 5
  variations publiées.
- **F5 — uₙ explicite d'une arithmético-géométrique, |a| > 1** · 9f14d672 · TCOMP-214 (modèle
  T_SPE et T_COMP). Chez eux (TSA1-34). Variation : a ∈ {2 ; 3 ; 4 ; 5 ; −2 ; −3}, ℓ de −6 à 6 non
  nul, u₀ de −8 à 8 (≠ ℓ) → uₙ = (u₀ − ℓ)·aⁿ + ℓ. Saisie d'une expression en n.
- **F6 — Récurrence : uₙ ⩽ uₙ₊₁ ⩽ ℓ** · d1aee0b9 · TSPE-386. Chez eux (TSA1-10, 45, 46) :
  rédaction libre. Chez nous : la rédaction de l'hérédité à choisir parmi quatre (pièges : oublier
  f(ℓ) = ℓ, inverser le sens, s'appuyer sur u₁). Variations : (a) croissante majorée, a = k/10,
  u₀ < ℓ ; (b) décroissante minorée, a = k/10, u₀ > ℓ.
- **F7 — Limite interprétée en contexte** · 651907b3 · TSPE-387. Chez eux (TSA1-32, 47). Case 1 :
  valeur de stabilisation (saisie). Case 2 : choix avec la raison (« Oui, car ℓ < u₀/2 », « Non,
  car ℓ ⩾ u₀/2 », « Oui, car la suite décroît »…), jamais un Oui / Non nu. Perte de p % (5 à 25),
  apport b, u₀ tiré pour que la réponse soit tantôt oui, tantôt non.
- **F8 — Escalier en spirale** · 667a3618 · TSPE-432. Chez eux (TSA1-33). Escalier tout tracé par
  le bloc courbe, conjecture de la limite en saisie. f(x) = a·x + b, a ∈ {−0,5 ; −0,25}, point
  fixe entier de 1 à 5, u₀ = point fixe ± 4.

## Modèles neufs (dossier `scripts/questions/idees-tle-suites-neufs/`)

Grades `T_SPE` (tous au programme de Tle spé).

- **F9 — « Démontrer une forme explicite par récurrence : l'hérédité »** · TSPE-386. Chez eux
  (TSA1-12, 13, 14, 44) : rédaction libre. Chez nous : écrire uₖ₊₁ sous la forme de la formule au
  rang k + 1, **forme imposée** (comme d1aee0b9 v3 ; sinon l'élève recopie la relation).
  Variations : (a) arithmético-géométrique uₖ = ℓ + c·rᵏ → ℓ + c·rᵏ⁺¹ ; (b) uₙ₊₁ = uₙ/(b·uₙ + 1),
  uₖ = 1/(bk + a) → 1/(b(k + 1) + a) ; (c) uₙ₊₁ = uₙ/(1 + a·uₙ), vₙ = 1/uₙ, calculer vₙ₊₁ − vₙ (→ a).
- **F10 — « Sens de variation d'une suite arithmético-géométrique »** · TSPE-385. Chez eux
  (TSA1-40). Case 1 : uₙ₊₁ − uₙ en fonction de uₙ (saisie, toute écriture équivalente). Case 2 :
  choix du sens et de la conclusion, sachant uₙ ⩾ ℓ (ou ⩽ ℓ) pour tout n. Variations : (a) a = k/10,
  u₀ > ℓ → décroissante, minorée, converge ; (b) a = k/10, u₀ < ℓ → croissante, majorée, converge.
- **F11 — « Seuil d'une suite récurrente en Python »** · TSPE-392. Chez eux (TSA1-43) : QCM de la
  condition du `while`. Variations : (a) croissante (a de 1,1 à 1,5, b de 4 à 20) : choix de la
  condition (`u <= S` ; pièges : inégalité inversée, `n` au lieu de `u`, égalité) ; (b) décroissante
  vers ℓ : valeur renvoyée par `seuil(S)`, tableau de termes affiché (saisie d'un entier).
- **F12 — « Vrai ou faux : propriétés des suites »** · TSPE-385. Chez eux (TSA1-48) : texte libre.
  Chez nous : choix entre des justifications (la réponse porte sur la raison, pas sur Vrai / Faux
  seul). Variations : toute suite bornée converge (faux, (−1)ⁿ) ; toute suite croissante tend vers
  +∞ (faux, 1 − 1/(n + 1)) ; une suite qui tend vers +∞ est croissante (faux, n + 2(−1)ⁿ) ; si
  uₙ ⩽ vₙ et (vₙ) converge, alors (uₙ) converge (faux, uₙ = −n).
- **F14 bis — « Moyenne des premiers termes d'une suite arithmético-géométrique »** · TSPE-577.
  Chez eux (TSA1-42, partie B). uₙ = ℓ + c·qⁿ donnée (0 < q < 1) ; Sₙ = u₀ + … + uₙ₋₁. Case 1 :
  Sₙ en fonction de n (somme géométrique), case 2 : limite de Sₙ/n (→ ℓ). Variations à fixer à
  l'écriture (q = k/10, q = 1/2).

## Outils et idées laissées

- **F13** : lignes 48 (construire l'escalier) et 49 (case Python exécutée) de
  `outils-manquants.md`, ajoutées le 2026-11-22.
- **F14** : homographique avec étude de f, suites avec ln, suites d'intégrales → « Idées en
  attente » du tableau de répartition (rubriques dérivation, logarithme, intégration).
