# Chantier `fonctions-par-morceaux` — `f(x) = x pour x < k, x^2 pour x >= k` dans l'Atelier

## Reprendre ici

_Mis à jour le 2026-11-28, après #3336 (PR 2, Atelier)._

- **État** : PR 1 (moteur) et PR 2 (Atelier) mergées — `f(x) = x pour x < k, x^2 pour x ≥ k` s'écrit dans Calcul et la carte, refus, `sinon`, ensemble, curseur, Q3, Géométrie avec ronds. Rien en prod (pas de `deploy:prod` demandé).
- **Prochaine action** : PR 3 (Graphe) — nouveau worktree `../ubumaths-wt-fonctions-par-morceaux-3` ; les morceaux s'y tracent déjà, il manque les ronds plein/vide aux coupures (`plot-sync.ts`, `CurvePiece`, `endpointMarkers`).
- **En attente de David** : une condition `x = 0` (`sin(x)/x pour x ≠ 0, 1 pour x = 0`) — accepter un morceau en un point, ou garder le refus actuel (« Chaque morceau a sa condition… ») ?
- **Pièges en cours** : `expressionOf` (texte maison) perd un nœud par morceaux : `syncEngine` passe l'arbre, les commandes sont refusées (Q3), une fonction en attente aussi. Texte : `1,2x` reste une virgule décimale (mettre une espace).
- **Worktree / branche** : aucun (celui de PR 2 retiré par `pr:merger`).

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

### PR 2 — Atelier

- **Rangement** : la définition garde TOUTE l'écriture (`x pour x < k, x^2 pour x ≥ k`, en x), sans
  `interval` ; `astOf` la lit en nœud `piecewise` (`parse.ts` → `piecewise.ts`). Aucun champ neuf,
  sauvegarde inchangée. `splitInterval` ne coupe plus une écriture à plusieurs morceaux.
- **Découpage** (`piecewise.ts`, `piecesOf`) : virgules de premier niveau (ni dans `()`/`{}`, ni
  `0,5` en texte, ni `{,}` en LaTeX) ; par morceaux dès qu'une partie a « pour » + condition ou finit
  par « sinon ». Refus : morceau sans condition, `sinon` pas en dernier, formule vide.
- **Conditions en arbre** : chaque comparaison lue seule, « et » plus fort que « ou » (les parseurs
  lisaient mal `x<0 ou x>1` et `2\lt x\lt 4`). L'ensemble, lui, vient de `readInterval`.
- **Atelier** (`checkPieces`, `interval.ts`) : conditions lisibles, pas de chevauchement (Q1, « Les
  conditions se chevauchent sur … »), chaque formule définie sur sa condition (`formulaOutside`,
  factorisé de `checkInterval`) ; ensemble = réunion, ℝ avec `sinon`. Recalculé à chaque passage
  dans `parameterInterval` (comme `[k;5]`) : curseur qui fait chevaucher → carte en erreur « (k = 3) ».
- **`interval-words.ts`** : les mots « sur »/« pour » sortis d'`interval.ts`, pour que `parse.ts`
  les lise sans cycle.
- **Q3** (`piecewise-refusals.ts`) : toute commande (sauf `.domaine`), `f′`, et les boutons sauf
  « Image » refusent une fonction par morceaux ou qui en cite une. `.évaluer` aussi (son chemin
  passe par le texte maison). `.domaine f` : « (réunion des conditions de ses morceaux) ».
- **Carte** : texte de Calcul réaffiché morceau par morceau (`\text{ pour }`, `\text{ sinon}`),
  jamais `\begin{cases}`.
- **Constat** : `a = 3 pour x < 0, 4 pour x ≥ 0` crée une fonction `a` (règle actuelle : `a = x^2`
  aussi).
- **Revue** (`code-reviewer`, Opus) : (1) carte en lettre t, mots collés (`tpourt<3,…`) : le renommage
  mot à mot échouait, le repli rangeait un `\begin{cases}` qui échappait à `checkPieces` → renommage
  morceau par morceau (`renameVariable`), et `\begin{cases}` refusé dans une définition
  (`WRITE_WITH_POUR`) ; (2) `f(1)` sur une fonction par morceaux en attente repassait par le texte
  maison → refus « f attend k » (`pendingPiecewiseRefusal`) ; (4) suite par morceaux : message à elle
  (`SEQUENCE_PIECES`). Restent : `x = 0` (question à David), `1,2x` ambigu en texte. 7 tests.
- **Vu à l'écran** (`e2e/verifs/atelier-fonctions-par-morceaux.spec.ts`, Chrome) : carte, images,
  refus Q3, chevauchement sur la carte, Graphe (deux morceaux, saut en 2, sans ronds).
