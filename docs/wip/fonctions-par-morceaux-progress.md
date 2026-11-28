# Chantier `fonctions-par-morceaux` — `f(x) = x pour x < k, x^2 pour x >= k` dans l'Atelier

## Reprendre ici

_Mis à jour le 2026-11-28, phase 0 validée._

- **État** : phase 0 validée, code pas commencé.
- **Prochaine action** : tests rouges (lecture, refus, image), puis implémentation.
- **En attente de David** : rien.
- **Pièges en cours** : —
- **Worktree / branche** : `../ubumaths-wt-fonctions-par-morceaux` · `feat/fonctions-par-morceaux`.

## Demande

« je veux poursuivre ce qu'on vient de faire sur l'écriture du domaine d'une fonction (par
exemple f(x)=x pour x>k) dans l'atelier, en l'étendant aux fonctions par morceaux. je veux
maintenant pouvoir écrire : f(x)=x pour x<k, x^2 pour x>=k » (David, 2026-11-28).

Suite de `fonctions-domaines` (#3304, #3310) et `fonctions-morceaux` (#3298, `[k;5]`).

## Phase 0 (validée par David le 2026-11-28, « je te suis » à mes recommandations)

- **Nominal** : `k = 2`, `f(x) = x pour x < k, x^2 pour x >= k` → tracée en deux morceaux,
  coupure qui suit le curseur ; `f(1)` = 1, `f(3)` = 9 ; la carte réaffiche ce qui a été tapé ;
  les propriétés disent l'ensemble (réunion des conditions). Trois morceaux ou plus acceptés.
- **Limites** : trou entre les morceaux accepté (`x pour x < 0, x^2 pour x > 1` : non définie sur
  [0 ; 1], `f(0,5)` refusé, message habituel). Curseur qui fait se chevaucher les conditions →
  carte en erreur, retour quand k revient (règle de `[k;5]`).
- **Refus** : morceau sans condition au milieu ; autre lettre que celle de la fonction ;
  formule hors de son domaine sur sa condition (`ln(x) pour x < 1`).
- **Q1** : conditions qui se chevauchent → **refus** (« Les conditions se chevauchent … »).
- **Q2** : `sinon` en dernier morceau → **accepté** (`x pour x < 0, x^2 sinon`).
- **Q3** : `.résoudre`, `.variations`, `.dériver`, tableau de valeurs sur une fonction par
  morceaux → **refus clair dans ce chantier** ; un second chantier les fera morceau par morceau.
- **Q4** : tracé aux coupures, rond plein (borne comprise) / rond vide (exclue) → **oui si
  l'outil de tracé le permet** ; sinon revenir vers David avant de promettre.

## Constats de départ (mesurés dans le code, 2026-11-28)

- mathAST a `PiecewiseNode` (`types.ts`, `factory.ts piecewise`), dérivé (`differentiate.ts`),
  compilé en numérique (`eval/compile.ts`), rendu LaTeX `\begin{cases}`. Pas d'évaluation
  exacte, ni `solve`, ni `variations`.
- `interval.ts` refuse aujourd'hui la seconde formule (`ONE_FORMULA`).

## Ce qui est fait

—
