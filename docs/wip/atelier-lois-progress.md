# Atelier : lois de maths complémentaires (manche 13, PR c) — progression

Décisions Q150 (c) et Q142 (aucune liste créée). Spec validée par David le 2026-10-04.

## Périmètre (modèle : `src/lib/atelier/binomial.ts`)

- `.geometrique X 0,2 [P(X ⩽ 3) ; P(X > 5 | X > 2) ; jusqu'à 15]` → « X suit G(0,2) »,
  tableau 1 à 10 + « … », E, V, σ, diagramme.
- `.uniforme X 1 6` (discrète) → « X suit la loi uniforme sur {1, …, 6} », tableau, E, V, σ,
  diagramme ; `.uniforme X [0 ; 10]` (densité) → courbe + aire de la 1re probabilité, E, V,
  σ, F(x). Options : `P(…)`.
- `.exponentielle T 0,5 [P(T ⩽ 2) ; P(T > 5 | T > 2)]` → « T suit E(0,5) », courbe + aire,
  E, V, σ, F(x).
- Densités : courbe toujours dessinée. Discrètes : diagramme en bâtons affiché, AJOUTÉ aussi
  à `.binomiale` (accord de David, 2026-10-04).
- Erreurs du bloc ```loi sans « Ligne N : » ; option sans valeur et variable minuscule
expliquées ; catalogue `commands.ts` : 3 entrées, exemple jouable, décor vide (Q79).

## Étapes

- [x] Tests rouges · [x] Implémentation · [x] Revue Opus (crochets mal fermés, sauts de ligne refusés, tests sur le diagramme) · [ ] PR, CI, merge
