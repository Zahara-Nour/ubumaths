# Chantier `fonctions-par-morceaux` — `f(x) = x pour x < k, x^2 pour x >= k` dans l'Atelier

## Reprendre ici

_Mis à jour le 2026-11-28, PR 1 (moteur) revue faite, PR ouverte._

- **État** : découpage validé (« c'est bon »). PR 1 (moteur) codée, revue (`code-reviewer` Opus) corrigée, 36 tests verts.
- **Prochaine action** : PR 1 ouverte et mergée, puis PR 2 (Atelier).
- **En attente de David** : rien.
- **Pièges en cours** : l'aller-retour texte de `expressionOf` / `syncEngine` perd un nœud par morceaux (syntaxe maison `{ v si c }` illisible, ambiguë : `si` = s·i) → PR 2 passe l'arbre ou relit en LaTeX.
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

## Trajet d'une fonction (carte du 2026-11-28)

- La définition est rangée en TEXTE (`definition`, `interval`), relue par `astOf` à chaque usage.
- `syncEngine` / `expressionOf` (`engine.ts`) font AST → texte maison → AST : le parseur maison
  ne relit pas `{ v si c }` ; le parseur LaTeX ne relit pas `\begin{cases}`.
- Le calcul exact (`eval/evaluate.ts`) ignore `piecewise` : `f(3)` échouerait.
- Graphe (`plot-sync.ts`) : la courbe part d'un texte LaTeX ; la restriction (`CurvePiece`) et
  ses ronds pleins/creux (`endpointMarkers`) valent pour UNE formule.
- Géométrie (`figure-sync.ts`) : `GeoFunction` accepte un `PiecewiseNode`, ronds pleins/creux
  à chaque coupure déjà rendus (`svg-primitives.ts`, `analyzeBoundary`).
- Refus centraux des commandes : `calcul.ts` ~2430 (`cited`) et `computeAction` ; héritage
  `citedIntervals`.

## Découpage (validé par David le 2026-11-28, « c'est bon »)

1. **Moteur** (mathAST) : calcul exact d'un nœud par morceaux quand la condition se décide
   (`f(3)` → 9), relecture de `\begin{cases}` et de `{ v si c }` (aller-retour).
2. **Atelier** : écriture, refus (chevauchement, morceau sans condition, autre lettre, formule
   hors domaine), `sinon`, images, carte, propriétés, refus des commandes (Q3), tracé Géométrie.
3. **Graphe** : tracé morceau par morceau, ronds pleins/creux aux coupures.

## Ce qui est fait

### PR 1 — moteur

- `eval/evaluate.ts` : étape 1a `reducePiecewise` / `chosenPiece` — le premier morceau vrai
  (`evaluateToBoolean`), seul calculé ; condition non tranchée avant la première vraie → nœud
  gardé ; aucun morceau vrai sans `sinon` → `unevaluable`, `NO_PIECE_APPLIES` (« Aucun morceau
  ne s’applique pour cette valeur »), convention de `1/0`.
- `parser/latex/parser-pratt.ts` : `\begin{cases}` (`si`, `pour`, `if` devant la condition ;
  `\text{sinon}`/`\text{otherwise}` en dernier ; ligne sans condition refusée), aller-retour
  avec `toLatex`.
- Tests : `evaluate-piecewise` (15), `web-repl-piecewise` (5, chemin `createFunctionBinding`),
  `cases-environment` (11) ; 25 rouges avant.
- Revue (`code-reviewer`, Opus) : (1) `x = k` / `x ≠ k`, k sans valeur, tranchés à tort
  (comparaison d'écritures) → condition à lettre libre = nœud gardé (`hasFreeLetter`, π exclu) ;
  (2) nœud gardé ouvert quand même, un morceau imbriqué levait « aucun morceau » → pas ouvert ;
  (3) message de `\text{…}` inconnu complété (`if`, `otherwise`). 5 tests, 3 rouges avant.
- Constats : `simplify` ne réduit pas un nœud par morceaux (seul `evaluate`) ; la console ne
  remplace pas une valeur liée dans le corps d'une fonction (vrai pour toute fonction ; l'Atelier
  substitue avant, `expressionOf`).
