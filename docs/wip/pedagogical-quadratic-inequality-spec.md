# Pedagogical Quadratic Inequality — Spec V1 (palier 2b)

**Statut** : validée par le plan utilisateur le 2026-05-06.
**Module cible** : extension de `src/lib/mathAST/pedagogical-solve/`.

## Objectif

Générer des étapes pédagogiques (`EquationStep[]`) résolvant une inéquation
**du second degré** à coefficients **numériques**, en suivant la méthode
standard du programme de 1ère/Terminale : identification des coefficients
→ calcul du discriminant Δ → racines (formule quadratique) → tableau de
signes → lecture du domaine solution.

Symétrique et réutilisateur du palier 2a (linéaire) : même renderer
polyvalent (`QuadraticEquationRenderer` étendu), même type `EquationStep`,
intégration Mode B identique, dispatcher `generateInequalitySteps` étendu
pour router le degré 2.

Hors scope V1 :

- Cas spéciaux dédiés `ax² + c` (b=0), `ax² + bx` (c=0), forme factorisée
  `(x−α)(x−β)` — tout passe par Δ en V1 (chemin uniforme).
- Coefficients paramétriques (palier 2c/d, V2).

## Décisions verrouillées

| Q                  | Décision                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | -------------------- |
| Stratégie          | Discriminant Δ uniforme. Cas spéciaux V1.1.                                                      |
| Format tableau     | Structure de données dans le step + LaTeX `\begin{array}{c                                       | ...}` pour le rendu. |
| Renderer           | Étendre `QuadraticEquationRenderer` (polyvalent), pas de classe séparée.                         |
| Niveaux            | `lycee` + `superieur` uniquement.                                                                |
| a = 0 dégénéré     | Délégation transparente vers `generateLinearInequalitySteps` (cohérent avec dispatcher pattern). |
| Mode B integration | Immédiate, kind `'quadratic-inequality'`.                                                        |

## API

```ts
// Nouveau
export function generateQuadraticInequalitySteps(
	inequality: RelationNode,
	options: QuadraticInequalityStepsOptions
): readonly EquationStep[];

// Options (mirror QuadraticEquationStepsOptions)
export interface QuadraticInequalityStepsOptions {
	readonly level: QuadraticSchoolLevel; // = 'lycee' | 'superieur'
	readonly includeSubSteps?: boolean;
	readonly variable?: string;
}

// Erreurs réutilisées (palier 2a)
// - PedagogicalInequalityError (relation '=' rejetée)
// - UnsupportedInequalityDegree(degree) (degré ≥ 3)
// - InequalityNotSolvable (coefs paramétriques)

// Dispatcher étendu (déjà présent palier 2a)
export function generateInequalitySteps(
	inequality: RelationNode,
	options: InequalityStepsOptions
): readonly EquationStep[];
// Routing :
//   - relation '=' → throw PedagogicalInequalityError
//   - pas de variable → linear (cas constant)
//   - degré null → throw UnsupportedInequalityDegree(null)
//   - degré 0/1 → generateLinearInequalitySteps
//   - degré 2 → generateQuadraticInequalitySteps (NEW)
//   - degré ≥ 3 → throw UnsupportedInequalityDegree(degree)
```

## Pipeline

```
generateQuadraticInequalitySteps(ineq, opts):
  1. Validation operator (rejet de '=')
  2. Détection variable + rejet paramétrique
  3. Sanity check : degré exactement 2 (sinon throw)
  4. Standardize : (lhs − rhs) → ax² + bx + c
  5. Extraire (a, b, c). Si a = 0 → délégation linéaire
  6. Émettre :
     a. identify-equation (kind='quadratic')                        — réutilise
     b. standardize (si pas déjà sous forme f(x) ⊻ 0)                — réutilise
     c. identify-coefficients (a, b, c)                             — réutilise
     d. compute-discriminant (Δ = b² − 4ac)                         — réutilise
     e. discriminant-{positive | zero | negative}                   — réutilise
     f. apply-quadratic-formula (si Δ ≥ 0, racines exactes)         — réutilise
     g. quadratic-sign-table (NEW)                                  — données + LaTeX
     h. inequality-conclude-quadratic (NEW)                         — solution finale
```

**Réutilisation maximale** : 6 des 8 kinds émises sont **déjà existantes**.
Seules 2 nouvelles kinds sont introduites (sign-table + conclusion).

## Nouvelles `EquationOperation` kinds

```ts
// Tableau de signes du polynôme du second degré
| {
    readonly kind: 'quadratic-sign-table';
    readonly a: MathNode;                       // coefficient dominant
    readonly roots: readonly MathNode[];        // 0 (Δ<0), 1 (Δ=0), 2 (Δ>0) racines exactes
    readonly variable: string;
  }

// Lecture du domaine solution depuis le tableau
| {
    readonly kind: 'inequality-conclude-quadratic';
    readonly relation: '<' | '>' | '<=' | '>=' | '!=';
    readonly solutionDescription: string;       // ex: "]2, 3[" ou "ℝ \\ {2}" ou "∅"
    readonly solutionDomain: Domain;            // structure (provient de solveInequality palier 1)
  }
```

## Comportements (25 cas)

### Δ > 0 (1-7)

1. `x² − 5x + 6 < 0` → `]2, 3[`
2. `x² − 5x + 6 > 0` → `]−∞, 2[ ∪ ]3, +∞[`
3. `x² − 5x + 6 ≤ 0` → `[2, 3]`
4. `x² − 5x + 6 ≥ 0` → `]−∞, 2] ∪ [3, +∞[`
5. `x² − 5x + 6 ≠ 0` → `R \ {2, 3}`
6. `−x² + 5x − 6 < 0` (a < 0) → `]−∞, 2[ ∪ ]3, +∞[`
7. `−x² + 5x − 6 > 0` (a < 0) → `]2, 3[`

### Δ = 0 (8-14)

8. `x² − 4x + 4 < 0` → `∅`
9. `x² − 4x + 4 > 0` → `R \ {2}`
10. `x² − 4x + 4 ≤ 0` → `{2}`
11. `x² − 4x + 4 ≥ 0` → `R`
12. `x² − 4x + 4 ≠ 0` → `R \ {2}`
13. `−x² + 4x − 4 ≥ 0` → `{2}`
14. `−x² + 4x − 4 ≤ 0` → `R`

### Δ < 0 (15-19)

15. `x² + 1 < 0` → `∅`
16. `x² + 1 > 0` → `R`
17. `x² + 1 ≥ 0` → `R`
18. `−x² − 1 < 0` → `R`
19. `−x² − 1 > 0` → `∅`

### Cas particuliers (20-22)

20. `2x² − 8 < 0` (b=0) → `]−2, 2[`
21. `(x − 1)(x − 3) < 0` → `]1, 3[` (canonicalisée vers `x²−4x+3`)
22. `0 · x² − 2x + 4 ≥ 0` (a=0) → délégation linéaire → `x ≤ 2`

### Erreurs (23-25)

23. `x³ − 1 < 0` (degré 3) → throw `UnsupportedInequalityDegree(3)`
24. `m·x² + 1 < 0` (m libre) → throw `InequalityNotSolvable`
25. `x² + 1 = 0` (relation '=') → throw `PedagogicalInequalityError`

## Architecture du tableau de signes

Le step `quadratic-sign-table` émet une **structure de données** (a, roots,
variable). Le renderer produit deux formats :

- **LaTeX** (page debug, MathLive, ProseMirror) : `\begin{array}{c|...|c}`
  avec colonnes `x`, séparateurs aux racines, signes pour chaque intervalle.
- **Custom syntax / ASCII** (CLI demo, snapshots tests) : table textuelle
  avec barres `|` et `+`/`−`/`0`.

Le tableau pour `Δ > 0, a > 0` (par ex. `x² − 5x + 6`, racines 2 et 3) :

```latex
\begin{array}{c|ccccc}
  x          & -\infty &      & 2     &      & 3     &      & +\infty \\
  \hline
  x^2 - 5x + 6 &       & +    & 0    & -    & 0    & +    &        \\
\end{array}
```

ASCII équivalent :

```
 x              | -∞   2    3   +∞
----------------+-----+-----+----
 x² − 5x + 6    |  +  0  −  0  +
```

## Tests

Nouveau fichier `__tests__/quadratic-inequality.test.ts` (~25 tests).

Pattern (mirror de `linear-inequality.test.ts`) :

- Pour chaque comportement 1-22 : appel `generateQuadraticInequalitySteps`
  - assertions sur la séquence des op kinds + sur les bornes du domaine
    solution (extrait via la kind `inequality-conclude-quadratic`).
- Pour chaque erreur 23-25 : `expect(() => ...).toThrow(<Class>)`.

Plus un fichier dédié pour le renderer V2 quadratique
`__tests__/quadratic-renderer-inequality.test.ts` (~15 tests) :

- TITLES adaptés (« Inéquation du second degré » au lieu d'« Équation »).
- EXPLANATIONS adaptées en contexte inéquation.
- Format LaTeX du tableau de signes (sanity check sur `\begin{array}`).
- Régression équation : titres et explanations équations inchangés.

## Documents prévus

- `docs/wip/pedagogical-quadratic-inequality-spec.md` (ce document).
- `docs/wip/pedagogical-quadratic-inequality-progress.md` (état après chaque phase).

## Plan d'exécution

Voir tâches #42-#52 dans le tracker.
