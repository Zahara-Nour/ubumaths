# 0006 — Réduire pour comparer, pas pour écrire

- **Statut** : acceptée
- **Date** : 2026-09-20 · **Décidée par** : David

## Contexte

Pour que le décideur (`areEquivalent`) reconnaisse `tan ≡ sin/cos`, `sin² + cos² ≡ 1`, etc., il faut
réduire les expressions trigonométriques. Deux emplacements possibles : la forme normale elle-même, ou
une forme dédiée à la comparaison.

## Décision

La réduction vit dans **`equivalenceForm`** (`normal/normalize.ts`), utilisée **seulement pour
comparer**. `normalize` rend la forme affichée, inchangée.

Décision de produit liée : `(x² − y²)/(x − y) ≡ x + y` est **compté juste**, bien que les deux
écritures diffèrent en `x = y` (choix déjà en place à une variable).

## Écarté

- **Réduire la forme normale** : implémenté puis mesuré — 9 tests cassaient, `tan(−x)` perdait sa
  parité, `enableTrig: false` ne coupait plus rien, et la reconnaissance de motifs de l'intégration
  lit cette même forme.

## Conséquences

- Toute nouvelle équivalence de comparaison s'ajoute dans `equivalenceForm`, pas dans `normalize`.
- Un faux positif du décideur compte juste une réponse fausse d'élève : toute réduction
  (ex. division multivariée) est **vérifiée** (recalcul `b·q`) plutôt que prouvée.
- Hors d'atteinte sans changer la forme normale : exposant symbolique sur base quelconque
  (`x^a·x^b`). Sens détaillé par domaine : `docs/ref/convention-equivalence.md`.
