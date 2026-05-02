# Prompt : Forme polaire pour `courbe()` (V2 paramétrique — point A)

## Contexte

Le module `geometry-core` supporte déjà :

- **Cartésien** : `courbe("y = x^2")`, `courbe("x^2 + y^2 = 4")` (1 string positionnelle)
- **Paramétrique** : `courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*\pi)` (2 strings)

V1 paramétrique livrée en mai 2026 (102 tests TDD verts, 6 commits + 3 fixes post-V1). Détails complets : `docs/wip/geometry/parametric-curves-v1-progress.md`.

**Cette V2 ajoute la 3e branche : forme polaire** — déjà spec dans Phase 0 ligne 22 de la V1 :

```
# Surface API visée
courbe("r = 2*cos(theta)", theta_min=0, theta_max=pi)
courbe("r = 1 - cos(theta)", theta_min=0, theta_max=2*\pi)             # cardioïde
courbe("r = 1 + 2*cos(theta)", theta_min=0, theta_max=2*\pi)           # limaçon
courbe("r = sin(2*theta)", theta_min=0, theta_max=2*\pi)               # rosace 4 pétales
courbe("r = theta", theta_min=0, theta_max=6*\pi)                      # spirale d'Archimède
```

Une courbe polaire `r = f(θ)` est représentée intérieurement comme une courbe paramétrique `(x(θ), y(θ)) = (f(θ)·cos(θ), f(θ)·sin(θ))` — donc on **réutilise toute la machinerie V1** plutôt que d'introduire un nouveau type d'élément.

## Comportements à valider avant d'écrire du code (TDD Phase 0)

Avant d'écrire les tests, **proposer ces comportements à l'utilisateur en français** et attendre validation :

1. **Surface API** : `courbe("r = ...", theta_min=..., theta_max=..., couleur=...)` — strict, sans alias.
2. **Détection de la branche polaire** : 1 string positionnelle dont la LHS de la relation est `r` (variable simple) ET la présence d'au moins un de `theta_min`, `theta_max` dans les nommés. Si une seule LHS `r` est présente sans `theta_min`/`theta_max`, lever une erreur dédiée (pour éviter qu'un cartésien `r = 2x` soit interprété en polaire).
3. **Variable angulaire** : `theta` ASCII OU `\theta` LaTeX. mathAST accepte les deux désormais (commit `2c1cc1fc5`). Choisir une seule forme canonique en interne (recommandé : `theta` ASCII pour rester cohérent avec `t` du paramétrique).
4. **Bornes** : `theta_min` et `theta_max` obligatoires, scalaire/slider/numérique. Mêmes règles de validation que `t_min`/`t_max`.
5. **Auto-détection variable libre** : analogue au paramétrique — la variable libre dans le RHS de `r = ...` doit être `theta` (ou `\theta`). Si autre variable libre détectée → erreur "paramètre incohérent" ou "variable inattendue".
6. **Réécriture interne** :
   - Parser `r = f(θ)` → extraire le RHS `f(θ)`
   - Construire `xRhs = f(θ)·cos(θ)`, `yRhs = f(θ)·sin(θ)` au niveau MathNode (via `multiplication(rhs, cos(theta))` etc.)
   - Réutiliser `createParametricCurveFromEquations` _ou_ extraire un helper commun. Recommandation : extraire un helper `buildParametricCurveFromXY(xRhs, yRhs, paramName, tMin, tMax, ...)` que les 2 branches appellent.
7. **Sérialisation round-trip** : décision à valider —
   - **Option α (simple)** : on perd l'intention polaire ; le serializer produit `courbe("x=...", "y=...", t_min=..., t_max=...)`. Inconvénient : un script `r = 2*cos(theta)` devient illisible après sauvegarde.
   - **Option β (recommandée)** : marquer `polar: true` + stocker `equationR: string` + `parameter: 'theta'` dans le `GeoParametricCurve`. Le serializer reproduit alors `courbe("r = ${equationR}", theta_min=..., theta_max=...)`.
8. **Sampling** : aucun changement — le sampler 2D existant `sampleParametric2D` traite `(x(θ), y(θ))` exactement comme `(x(t), y(t))`.
9. **Détection courbe fermée** : aucun changement — comparaison `P(θ_min) ≈ P(θ_max)`. La cardioïde sur `[0, 2π]` est détectée fermée. La spirale d'Archimède sur `[0, 6π]` ne l'est pas.
10. **Erreurs DSL francophones** :
    - `1 string r= sans theta_min/theta_max` → `theta_min et theta_max obligatoires pour une courbe polaire`
    - `theta_min ≥ theta_max` → `theta_max doit être strictement supérieur à theta_min`
    - `r = ...` mais variable libre ≠ theta → `paramètre polaire attendu : theta (ou \\theta)`
    - `1 string r= avec t_min/t_max` (mauvais nommé) → `pour une courbe polaire, utiliser theta_min/theta_max (pas t_min/t_max)`
    - `2 strings dont une r=` → `r = ... attendu seul (pas avec une équation x= ou y=)`

## Architecture existante (à étudier avant d'implémenter)

### Fichier principal du builtin courbe

`src/lib/geometry-core/dsl/builtins.ts` :

- Ligne ~1581 : `case 'courbe'` — dispatch sur le nombre de strings positionnelles
  - 1 string → `createCurveFromEquation` (cartésien — branche line/function/quadratic/implicit)
  - 2 strings → `createParametricCurveFromEquations` (paramétrique)
  - **À ajouter** : si 1 string et `theta_min`/`theta_max` présents → branche polaire
- Ligne ~2214 : `createCurveFromEquation` — branche cartésienne
- Ligne ~2496 : `parseParametricEquation` — helper qui parse `"x = ..."` ou `"y = ..."` et retourne `{ lhs, rhs }`. À adapter ou copier pour `"r = ..."`.
- Ligne ~2560 : `createParametricCurveFromEquations` — pipeline paramétrique complet (parsing, validation, free-variable analysis, différenciation, compilation, dependsOn, factory call). À refactoriser ou réutiliser.

### Type d'élément

`src/lib/geometry-core/types/elements.ts` : `GeoParametricCurve` (chercher la définition). Si on choisit l'**option β** (sérialisation polaire fidèle), ajouter :

```typescript
export interface GeoParametricCurve extends GeoElementBase {
	// ... champs existants ...
	/** True if the curve was originally specified in polar form r = f(theta).
	 *  Used by the serializer to reproduce the original syntax. */
	readonly polar?: boolean;
	/** Original RHS of "r = ..." when polar; undefined for true parametric curves. */
	readonly equationR?: string;
}
```

Et le schema Zod correspondant dans `src/lib/geometry-core/types/schemas.ts`.

### Factory

`src/lib/geometry-core/graph/figure.ts` : `createParametricCurve(...)` — étendre la signature pour accepter `polar?: boolean` et `equationR?: string` (optionnels), ou ajouter un wrapper `createPolarCurve(...)` qui appelle `createParametricCurve` avec les flags adéquats.

### Sérialisation

`src/lib/geometry-core/dsl/serializer.ts` :

- Case `'parametricCurve'` actuelle (chercher `el.type === 'parametricCurve'`) produit `courbe("${equationX}", "${equationY}", t_min=..., t_max=...)`.
- **À étendre** : si `el.polar === true` → produire `courbe("r = ${equationR}", theta_min=..., theta_max=...)` (param= omis car canonique).

### mathAST

Pour construire `xRhs = f(θ)·cos(θ)` au niveau AST, utiliser :

- `multiplication(...)` ou `add`, `subtract` depuis `$lib/mathAST`
- `parseCustom("cos(theta)")` pour obtenir le node `cos(θ)`
- `applyAngleMode(node, angleMode)` pour respecter le mode angle actif (déjà importé dans builtins.ts)

**Note importante** : la branche polaire doit forcer `angleMode === 'rad'` ou wrapper le résultat correctement, car les courbes polaires sont conventionnellement en radians (autrement `cos(theta)` en mode degrés donnerait des résultats inattendus pour `theta ∈ [0, 2π]`). Décision à valider avec l'utilisateur.

## Tests à écrire (TDD red-first)

Créer `src/lib/geometry-core/dsl/__tests__/courbe-polar.test.ts`. Au minimum :

### A. Nominal (≥ 5 tests)

- `r = 2*cos(theta)` sur `[0, π]` → cercle de rayon 1 centré en (1,0), fermé
- `r = 1 - cos(theta)` sur `[0, 2π]` → cardioïde, fermée
- `r = sin(2*theta)` sur `[0, 2π]` → rosace 4 pétales, fermée
- `r = theta` sur `[0, 6π]` → spirale, NON fermée
- `r = 2` (constante) sur `[0, 2π]` → cercle de rayon 2, fermé

### B. Variable angulaire `\theta`

- `r = \theta` (LaTeX) accepté, équivalent à `r = theta`

### C. Réactivité

- `a = slider(min=1, max=3, valeur=2)` puis `r = a*cos(theta)` → courbe avec `dependsOn` contenant l'id du slider, redessinée quand le slider bouge.
- `theta_max = slider(...)` → idem.

### D. Erreurs (≥ 6 tests)

- `r = 2` sans `theta_min`/`theta_max` → message dédié
- `theta_min = 1, theta_max = 0` → message dédié
- `r = a*sin(t)` (t au lieu de theta) → erreur paramètre
- `r = ...` avec `t_min/t_max` → message dédié orientant vers `theta_min/theta_max`
- 2 strings dont une `"r = ..."` → erreur (mélange polar/parametric interdit)
- `r = 1/x` (variable inattendue x) → erreur

### E. Sérialisation (≥ 2 tests)

- Round-trip : parse `r = 2*cos(theta)` → serialize → reparse → même structure (et `polar === true` si option β)
- Slider dans bornes : `theta_max=s` → serializer produit `theta_max=s` (nom symbolique)

### F. Sampling (≥ 2 tests)

- Cardioïde produit ≥ 100 points et `closed: true`
- Spirale produit ≥ 100 points et `closed: false`

## Décisions à prendre / questions à poser à l'utilisateur

1. **Sérialisation polaire (option α vs β)** : préserver la forme polaire dans le round-trip ? (recommandation : β)
2. **Mode angle forcé** : la branche polaire doit-elle forcer `radians` ? Ou respecter `unite_angle("degrees")` actif (et donc multiplier `theta` par π/180 dans le wrapping cos/sin) ?
3. **Variable canonique** : `theta` ASCII ou `\theta` LaTeX en interne ? (recommandation : ASCII, plus court ; `\theta` accepté en entrée et normalisé)
4. **Détection vs disambiguation** : si on tape `courbe("r = 2x")` (cartésien tordu), faut-il l'interpréter cartésien ou polaire avec erreur ? La règle proposée (présence de `theta_min`/`theta_max` → polaire) semble suffisante.

## Plan d'exécution suggéré

| Phase | Description                                                                      | Agent              | Effort |
| ----- | -------------------------------------------------------------------------------- | ------------------ | ------ |
| 0     | Spec validée par l'utilisateur (cf. comportements ci-dessus)                     | (interactif)       | 0,1 j  |
| 1     | Tests TDD red-first (courbe-polar.test.ts)                                       | test-automator     | 0,3 j  |
| 2     | Refactoring helper commun + branche polaire dans builtin                         | backend-developer  | 0,4 j  |
| 3     | Sérialisation polaire (option β) + tests round-trip                              | backend-developer  | 0,2 j  |
| 4     | Code review                                                                      | code-reviewer      | 0,1 j  |
| 5     | Demo page mise à jour avec exemples polaires                                     | frontend-developer | 0,2 j  |
| 6     | Doc `parametric-curves-v1-progress.md` : ajouter section "V2 — Polaire (livrée)" | (direct)           | 0,1 j  |
| 7     | Quality checks (eslint + check:incremental)                                      | (direct)           | 0,1 j  |

**Total** : ~1,5 j

## Fichiers concernés (estimatif)

Modifiés :

- `src/lib/geometry-core/dsl/builtins.ts` — branche polaire dans `case 'courbe'`, helper de réécriture θ → (x, y)
- `src/lib/geometry-core/types/elements.ts` — champs `polar?`, `equationR?` sur `GeoParametricCurve` (option β)
- `src/lib/geometry-core/types/schemas.ts` — Zod schema mis à jour
- `src/lib/geometry-core/graph/figure.ts` — `createParametricCurve` accepte les nouveaux champs (option β)
- `src/lib/geometry-core/dsl/serializer.ts` — cas polaire dans `parametricCurve`
- `src/routes/(public)/geometry-demo/parametric/+page.svelte` — section "Courbes polaires" ajoutée

Créés :

- `src/lib/geometry-core/dsl/__tests__/courbe-polar.test.ts` — tests TDD

## Critère de succès

- Les 5 exemples de la surface API ci-dessus s'affichent correctement sur `/geometry-demo/parametric`
- Tous les tests existants passent (V1 paramétrique + cartésien + autres)
- 0 régression sur `pnpm test:server src/lib/geometry-core/`
- 0 erreur sur `pnpm check:incremental`
- Sérialisation round-trip préserve la forme polaire (option β validée par l'utilisateur)

## Contexte mémoire utile

- `docs/wip/geometry/parametric-curves-v1-progress.md` — historique V1 + post-V1 + roadmap
- `docs/wip/geometry/prompt-rosace-lieu.md` — prompt connexe sur les rosaces via `lieu()` (approche alternative à connaître)
- Memory `geometry-core-status.md` (~/.claude/) — status global du module
- CLAUDE.md — règles de planning/exécution (TDD obligatoire, agents spécialisés, doc de progression, etc.)

## Pièges connus / non-obvious

- Le tokenizer mathAST scinde les identifiants multi-caractères (commit `2c1cc1fc5` a étendu `GREEK_COMMANDS` à toutes les lettres grecques minuscules — `\theta` marche désormais). Mais `theta` ASCII reste tokenisé en `t·h·e·t·a` ⇒ utiliser `\theta` ou bien la pré-substitution n'est PAS faite (à l'inverse de `phi` qui est un nombre user-defined).

  **Conséquence** : la variable interne du builtin polaire doit gérer **les deux formes** :

  - utilisateur écrit `\theta` → mathAST produit un GreekLetterNode `theta`
  - utilisateur écrit `theta` → mathAST produit `t·h·e·t·a` (incorrect)
  - la stratégie est donc d'**imposer `\theta`** (ou détecter et lever une erreur claire) plutôt que d'essayer de réparer.

  À valider avec l'utilisateur : exiger `\theta` est plus strict mais sans surprise. Accepter `theta` demanderait une pré-substitution textuelle (comme on a discuté pour `phi`).

- `BACKSLASH_WHITELIST` du tokenizer DSL (`src/lib/geometry-core/dsl/tokenizer.ts:27`) ne contient que `pi`. Donc on ne peut pas écrire `\theta` comme **nom de variable DSL** (assignation `\theta = ...`). Mais à l'**intérieur d'une chaîne d'équation**, le DSL transmet la chaîne brute à `parseCustom` qui accepte `\theta`. C'est compatible avec `r = \theta`.

- Le pattern `for (const p of points) expect(...)` passe à vide si la collection est vide (cf. fix `9279b2b64`). Toujours assertir `length > N` AVANT d'itérer.

- Tests existants à NE PAS casser : `figure-parametric.test.ts`, `figure-parametric-reactivity.test.ts`, `parametric-curve-svg.test.ts`, `courbe-parametric.test.ts`, `dsl-courbe-with-variables.test.ts`, `parametric-exports.test.ts`.
