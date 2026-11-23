# Relevé « calcul littéral, équations » de Troisième (en cours, 2026-11-23)

Chantier [`idees-3e-calcul-litteral`](idees-3e-calcul-litteral-progress.md). 47 exercices d'une
autre plateforme (codes 3L10 à 3L16, anciennes versions exclues), lus dans leur code source par
quatre agents. Le tableau « Relevé » (verdicts ✅ / 🟡 / ❌ face à nos modèles) reste à écrire ; nos
modèles relevés en prod sont dans le journal.

## Notes de lecture brutes

### Lot A (3L10 à 3L11-5), lu le 2026-11-23

Communs : saisie libre en une ou plusieurs lignes d'étapes (`'etapes'` : chaque étape vérifiée,
la dernière réduite) ; entiers relatifs non nuls seulement ; lettre souvent tirée (x, y, z, a, b, c).

- **3L10** — Supprimer les parenthèses puis réduire : `±(ax+b)`, `±(ax²+bx+c)`, sommes et différences
  de deux parenthèses (degré 1 ou 2, 10 cas). a, b ∈ [−9 ; 9], c à f ∈ [−11 ; 11]. Réponse réduite.
- **3L10-1** — k ± (ax + b) et kx ± (ax + b). k ∈ [−11 ; 11], a, b ∈ [−9 ; 9]. Réponse réduite (ax,
  constante seule possible).
- **3L10-2** — 3L10 réduit aux cas 5 à 10 (deux parenthèses).
- **3L11** — Simple distributivité : `k(ax+b)`, `(ax+b)k`, `kx(ax+b)`, `(ax+b)kx`, `k(ax+b)+c`,
  `c+k(ax+b)`. k ∈ [2 ; 11] (signé au niveau 3), a, b, c ∈ [1 ; 9] distincts, signés dès le niveau 2.
  Consigne « Développer » (forme développée non réduite attendue, `k × ax + k × b`) ou « Développer
  et réduire » (réduite exigée).
- **3L11-0** — `c(ax+b)`, `(ax+b)c`, `cx(ax+b)`, `(ax+b)cx` ; signes de a, b, c réglables. a, b ∈
  [1 ; 9], c ∈ [2 ; 9]. Réduite exigée.
- **3L11-1** — Double distributivité : `(x+b)(x+d)`, `(ax+b)(cx+d)`, `(ax−b)(cx+d)`, `(ax−b)(cx−d)`.
  a, b, c, d ∈ [2 ; 9] (c ≠ a, d ≠ b) ; `(x+b)(x+d)` : b ∈ [2 ; 10], d ∈ [2 ; 12]. Réduite exigée.
  Terme en x nul possible (ad = bc).
- **3L11-1b** — `(ax+b)(cx+d)`, signes réglables, valeurs ∈ [1 ; 9]. Réduite exigée, étapes.
- **3L11-2** — Réduire si possible : `ax+b` (déjà réduit), `ax+bx`, `ax+bx²` (déjà réduit), `ax×b`,
  `b×ax`, `ax+b+cx+d`, `b+ax+d+cx`, `ax+b+x`, `ax×bx`. Valeurs ∈ [−11 ; 11]. Réduite exigée ;
  résultat 0 ou constante seule possible.
- **3L11-3** — Distributivité et réduction : `cx+e(ax+b)`, `ex+(ax+b)(cx+d)`, `e+(ax+b)(cx+d)`,
  `e−(ax+b)(cx+d)`, `(ax×b)(cx+d)`, `e(ax+b)−(d+cx)`, `k(ax+b)(cx+d)`. Valeurs ∈ [−11 ; 11] ;
  k ∈ {−3, −2, 2, 3}.
- **3L11-3b** — P ± Q, P et Q parmi `c(ax+b)`, `cx(ax+b)`, `(cx+d)(ax+b)`. Valeurs ∈ [−9 ; 9].
  Réduite exigée, étapes. Correction : signe et grandes parenthèses autour de Q mis en évidence.
- **3L11-4** — Factoriser : `ka + nkb` (7a + 21b), `nka ± mkb` (14a + 21b), `nkx ± mkx²`,
  `nx² + x`, `nx² + mx`. k ∈ {2, 3, 5, 7, 11}, (n, m) premiers entre eux de 2 à 10. Par défaut une
  seule lettre (7a + 21). Jugé « factorisé ».
- **3L11-5** — Calcul mental par la distributivité ou une identité remarquable : 103², 98², 302 × 298
  (a·10 ou a·100 ± b, a ∈ [2 ; 9], b ∈ [1 ; 4] pour les carrés, [1 ; 9] pour le produit). Réponse
  numérique. Correction : les deux méthodes côte à côte.
