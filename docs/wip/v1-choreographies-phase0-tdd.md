# Phase 0 — Spécification TDD : décorateurs de chorégraphie V1

> Date : 2026-05-19
> Plan parent : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Statut : Spec validée, début Phase 1.

## Objectif

Spécifier les comportements attendus pour le V1 des décorateurs de chorégraphie de construction, AVANT d'écrire le moindre code. Sert de base à la rédaction des tests TDD pour chaque phase ultérieure.

---

## P0.1 — Tokenizer

**Acquis** : le token `AT_DIRECTIVE` existe déjà (`tokenizer.ts:168-184`). Il matche `@identifier` n'importe où dans la source.

**Spec V1** :

- Le tokenizer ne change pas. Aucune nouvelle règle.
- `@identifier` après une expression complète (sur la même ligne) émet `AT_DIRECTIVE` comme aujourd'hui.
- Plusieurs `@identifier` séparés par des espaces sur une même ligne : émettent plusieurs `AT_DIRECTIVE` à la suite (idem aujourd'hui).
- Cas inchangé : `@identifier` en début de ligne reste consommé par le path "directive statement-level" via `parseDirective()`.

**Tests** : aucun nouveau test tokenizer en Phase 1. Les tests existants `tokenizer.test.ts` doivent continuer à passer (régression check).

---

## P0.2 — Parser

**Modifications** :

1. **`DslAssignment`** (dans `types.ts`) : ajout d'un champ optionnel `decorators?: string[]`. Présent uniquement quand le statement porte des décorateurs ; sinon absent ou tableau vide.

2. **`parseAssignmentOrExpr`** (dans `parser.ts`, ~ligne 213) : après avoir parsé la RHS expression, AVANT `expectNewline()`, consommer **0 à N** tokens `AT_DIRECTIVE` consécutifs et stocker leur `value` (sans le `@`) dans `decorators`.

3. **`expectNewline`** (lignes 355-361) : pas de changement, mais le parser appelant doit avoir consommé tous les `AT_DIRECTIVE` avant.

**Spec comportementale** :

| Script                                                 | `decorators` attendu                    |
| ------------------------------------------------------ | --------------------------------------- |
| `d = mediatrice(A, B)`                                 | `[]` (ou absent)                        |
| `d = mediatrice(A, B) @euclide`                        | `['euclide']`                           |
| `d = mediatrice(A, B) @euclide @epure`                 | `['euclide', 'epure']`                  |
| `d = mediatrice(A, B) @euclide @arcs_egaux @complet`   | `['euclide', 'arcs_egaux', 'complet']`  |
| `d = mediatrice(A, B) @epure @euclide`                 | `['epure', 'euclide']` (ordre préservé) |
| `cc = cercle_circonscrit(A, B, C) @euclide @squelette` | `['euclide', 'squelette']`              |

**Cas refusés en V1** :

| Script                                                              | Comportement                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `d = mediatrice(A, B) \n  @euclide` (décorateur sur ligne suivante) | Erreur parser : "décorateurs doivent être sur la même ligne que l'assignation" |
| `point(0, 0) @euclide` (suffixe sur `exprStatement`)                | Erreur parser : "décorateurs supportés uniquement sur les assignations en V1"  |
| `[A, B] = quelque_chose() @euclide` (sur `destructuring`)           | Erreur parser : "décorateurs non supportés sur destructuring en V1"            |

**Cas particulier : directives statement-level inchangées** :

```dsl
@pause(500)
@instrument("compas")
d = mediatrice(A, B) @euclide
```

Les trois premiers `@xxx` (avant assignation) sont des `DslDirective` statement-level. Le `@euclide` après l'expression est un décorateur. Le parser distingue par position : si `AT_DIRECTIVE` est lu en début de statement → directive ; si lu en suffixe d'expression → décorateur.

**Tests TDD à écrire (parser-decorators.test.ts)** :

1. Assignation sans décorateur → `decorators` vide ou absent.
2. Assignation avec 1 décorateur → tableau de 1.
3. Assignation avec 3 décorateurs → tableau de 3, ordre préservé.
4. Multiplicité accents/casse : `@Euclide` ≠ `@euclide` (case-sensitive en V1, on rejette en Phase 2 si méconnu).
5. Décorateur sur ligne suivante → erreur parser claire.
6. Décorateur après expression-statement (`point(0,0) @euclide`) → erreur.
7. Décorateur après destructuring → erreur.
8. Mélange : `@pause(500)` directive + `d = ... @euclide` décorateur → 2 statements, le premier `DslDirective`, le second `DslAssignment` avec decorators.
9. Décorateur avec underscore : `@arcs_egaux` accepté.
10. Décorateur avec chiffre : `@v1` accepté (pas de restriction au niveau parser).
11. Décorateur avec args (`@euclide(arg)`) : en V1, le `(arg)` est rejeté ou ignoré ? Décision : **rejeté** (KISS — pas d'args sur décorateurs en V1).
12. Espaces entre décorateurs : `d = ... @a   @b` (multi-espaces) accepté.
13. Tab entre décorateurs : accepté.
14. Décorateur à la fin d'une ligne avec commentaire : `d = ... @euclide  # commentaire` accepté.
15. Roundtrip parseDsl + serializeDsl : décorateurs préservés.

---

## P0.3 — Validation runtime (resolveDecorators)

**Fonction** : `resolveDecorators(decorators: string[], builtinName: string, line: number) → DecoratorTriple`

**Spec comportementale** :

| Input                                                              | Output ou erreur                                                                                   |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `[]`, builtin='mediatrice'                                         | `{ contrainte: 'direct', methode: null, visibilite: 'squelette' }`                                 |
| `['euclide']`, builtin='mediatrice'                                | `{ contrainte: 'euclide', methode: null, visibilite: 'squelette' }` (méthode = défaut du registre) |
| `['euclide', 'arcs_egaux']`, builtin='mediatrice'                  | `{ contrainte: 'euclide', methode: 'arcs_egaux', visibilite: 'squelette' }`                        |
| `['euclide', 'epure']`, builtin='mediatrice'                       | `{ contrainte: 'euclide', methode: null, visibilite: 'epure' }`                                    |
| `['euclide', 'cercles_rayon_ab', 'complet']`, builtin='mediatrice' | `{ contrainte: 'euclide', methode: 'cercles_rayon_ab', visibilite: 'complet' }`                    |

**Erreurs** :

| Input                                                                        | Erreur attendue                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `['euclide', 'mesure']`                                                      | "Contraintes mutuellement exclusives : `@euclide` et `@mesure`. Choisissez une seule contrainte."                                                                                                  |
| `['epure', 'squelette']`                                                     | "Visibilités mutuellement exclusives : `@epure` et `@squelette`. Choisissez une seule visibilité."                                                                                                 |
| `['inconnu']`                                                                | "Décorateur inconnu : `@inconnu`. Décorateurs reconnus : contraintes (`@direct`, `@euclide`, `@equerre`, `@mesure`), visibilités (`@epure`, `@squelette`, `@complet`), méthodes selon le builtin." |
| `['euclide', 'parallelogramme']`, builtin='mediatrice'                       | "`@parallelogramme` n'est pas une méthode disponible pour `mediatrice` en mode `@euclide`. Méthodes disponibles : `@arcs_egaux` (par défaut), `@cercles_rayon_ab`."                                |
| `['parallelogramme']` (sans contrainte explicite, mais builtin='mediatrice') | "`@parallelogramme` est une méthode et requiert une contrainte explicite (ex: `@euclide @parallelogramme`). Méthodes disponibles pour `mediatrice` : voir doc."                                    |
| `['euclide', 'arcs_egaux', 'arc_milieu']`, builtin='mediatrice'              | "Deux méthodes simultanées : `@arcs_egaux` et `@arc_milieu`. Choisissez une seule méthode."                                                                                                        |

**Tests TDD à écrire (choreographies-resolve.test.ts)** :

1-5. Cas nominaux ci-dessus.
6-12. Erreurs ci-dessus, chacune avec vérification du message. 13. `decorators=[]` retourne les défauts globaux. 14. Ordre indifférent : `['euclide', 'epure']` == `['epure', 'euclide']` en termes de résultat. 15. Builtin sans aucune voie pour contrainte demandée : `['equerre']` sur `cercle_circonscrit` (pas implémenté V1) → erreur "Contrainte `@equerre` non disponible pour `cercle_circonscrit`. Disponibles : `@direct`, `@euclide`."

---

## P0.4 — Comportements V1 par builtin

### `mediatrice(A, B)`

**Voies déclarées** :

| Méthode            | `defaut` | Contrainte | Description                                                                            |
| ------------------ | -------- | ---------- | -------------------------------------------------------------------------------------- |
| `arcs_egaux`       | true     | `euclide`  | 2 arcs égaux centrés en A et B (rayon r > AB/2), 2 intersections, règle. Euclide I.10. |
| `cercles_rayon_ab` | false    | `euclide`  | Variante avec rayon = AB exactement. Visuellement plus net.                            |

**Spec animation** :

- `@direct` : fade-in de la droite, instruments masqués.
- `@euclide` (= `arcs_egaux`) :
  1. Compas en A, ouverture r = 0.7 × AB, tracé du cercle rouge (couleur de trace).
  2. Compas en B, ouverture identique, tracé du cercle.
  3. Deux points d'intersection apparaissent (haut + bas, fade-in).
  4. Règle posée sur les 2 points d'intersection.
  5. Tracé de la droite.
- `@euclide @cercles_rayon_ab` : identique mais r = distance AB.

### `bissectrice(A, V, B)`

**Voies déclarées** :

| Méthode      | `defaut` | Contrainte | Description                                                                                           |
| ------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `arcs_egaux` | true     | `euclide`  | Cercle en V → A', B' sur les côtés. 2 arcs égaux en A' et B'. Intersection P. Règle V→P. Euclide I.9. |
| `arc_milieu` | false    | `euclide`  | Cercle en V → A', B'. Milieu M de [A'B']. Règle V→M.                                                  |

**Spec animation** :

- `@direct` : fade-in de la droite.
- `@euclide` (= `arcs_egaux`) :
  1. Compas en V, rayon arbitraire, tracé cercle qui croise (VA) en A' et (VB) en B'.
  2. A' et B' fade-in.
  3. Compas en A', rayon r' = 0.7 × A'B', tracé arc.
  4. Compas en B', même r', tracé arc.
  5. Point d'intersection P fade-in.
  6. Règle V→P.
  7. Tracé bissectrice.
- `@euclide @arc_milieu` :
  1-3 identique. 4. Construction du milieu M de [A'B'] (composition interne : sous-chorégraphie `mediatrice(A', B') @euclide @epure` puis intersection avec [A'B'] ; ou simplement créer M comme point milieu visible). 5. Règle V→M. 6. Tracé.

### `parallele(P, A, B)`

**Voies déclarées** :

| Méthode                  | `defaut` | Contrainte | Description                                                                                    |
| ------------------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `parallelogramme`        | true     | `euclide`  | Euclide I.31 : compas en P de rayon AB ; compas en A de rayon BP ; intersection Q ; règle P→Q. |
| `double_perpendiculaire` | false    | `euclide`  | Perpendiculaire à (AB) par P → droite e. Perpendiculaire à e par P → parallèle à (AB).         |

**Spec animation** :

- `@direct` : fade-in.
- `@euclide` (= `parallelogramme`) :
  1. Compas en P, rayon AB, tracé cercle.
  2. Compas en A, rayon BP, tracé cercle.
  3. Intersection Q fade-in.
  4. Règle P→Q.
  5. Tracé parallèle.
- `@euclide @double_perpendiculaire` :

  1. Sous-chorégraphie `perpendiculaire(P, A, B) @euclide @squelette` → droite auxiliaire e visible.
  2. Sous-chorégraphie `perpendiculaire(P, *e*) @euclide @squelette` → la parallèle.

  Note : `perpendiculaire(P, *e*)` n'est pas un builtin V1. Pour cette voie, on utilise un raccourci : créer une perpendiculaire à `e` via un autre couple de points sur `e`. Détails en Phase 4.

### `cercle_circonscrit(A, B, C)`

**Voies déclarées** :

| Méthode                          | `defaut` | Contrainte | Description                                      |
| -------------------------------- | -------- | ---------- | ------------------------------------------------ |
| (canonique, sans nom de méthode) | true     | `euclide`  | 2 médiatrices composées + intersection + cercle. |

**Spec animation** :

- `@direct` : fade-in du cercle.
- `@euclide` :
  1. Sous-chorégraphie `mediatrice(A, B) @euclide @squelette` → droite m1 visible.
  2. Sous-chorégraphie `mediatrice(B, C) @euclide @squelette` → droite m2 visible.
  3. Intersection O fade-in.
  4. Compas en O, ouverture OA, tracé cercle.

**Composition critique** : c'est le test qui valide `ctx.sub(...)`.

---

## P0.5 — Comportement visibilité

### `@epure`

À la fin de la chorégraphie :

- L'objet retourné (`d`, `cc`, `b1`, etc.) : `visible: true`.
- TOUS les autres éléments créés pendant la chorégraphie : `visible: false`.

### `@squelette` (défaut)

- L'objet retourné : `visible: true`.
- Les objets-charnières (déclarés explicitement par la chorégraphie comme « charnière ») : `visible: true`.
- Les traces éphémères (arcs de compas) : `visible: false`.

**Définition d'« objet-charnière »** : un sous-élément qui définit sémantiquement le résultat principal. Exemples :

- Pour `mediatrice` : les 2 points d'intersection des cercles (ils définissent la droite).
- Pour `bissectrice @arcs_egaux` : le point P d'intersection des 2 arcs (il définit la bissectrice).
- Pour `cercle_circonscrit` : le centre O, et les 2 médiatrices m1, m2.

**Exclusion** : les points A', B' sur les côtés de l'angle dans la bissectrice sont des **traces** (ne définissent pas la bissectrice, juste l'animation), donc masqués en `@squelette`.

### `@complet`

- TOUS les éléments créés : `visible: true`.
- Les traces éphémères ont un style adapté : `style.dash = 'dashed'`, `style.opacity = 0.4`.
- Les objets-charnières ont leur style normal.
- L'objet principal a son style normal.

### Mécanisme d'implémentation

Chaque chorégraphie retourne, en plus de la liste `ChoreographyStep[]`, une **catégorisation** des éléments produits :

```ts
type ChoreographyResult = {
	steps: ChoreographyStep[];
	produced: {
		principal: string; // id du résultat
		charnieres: string[]; // ids
		traces: string[]; // ids
	};
};
```

Un helper `applyFinalVisibility(figure, produced, visibilite)` applique la règle ci-dessus.

---

## Questions ouvertes (à résoudre en phases ultérieures)

1. **Position du compas/règle initial** : actuellement positionnée par `autoShowInstruments` selon le type de drawable créé. Pour `@euclide`, on veut un contrôle fin (compas en A puis B puis A' puis B'). Solution Phase 4 : la chorégraphie déclare les positions explicites de chaque instrument.

2. **Speed factor pour composition** : `cercle_circonscrit @euclide` produit 2 sous-chorégraphies × ~5 étapes + intersection + cercle = ~13 étapes. À vitesse normale, ~13 × 1s = 13s. Trop long ? Solution : appliquer un facteur 1.5x ou 2x sur les sous-chorégraphies (paramètre `ctx.sub(..., speedFactor: 1.5)`). À mesurer en Phase 4 et ajuster.

3. **Coordonnées hors viewport** : si un cercle de chorégraphie sort du canvas (rayon trop grand), l'animation est tronquée. Solution actuelle (canvas extend) suffisante.

4. **Erreurs de routing en cours d'animation** : si l'utilisateur tape `@invalid`, l'erreur est détectée en `resolveDecorators` lors du pré-pass (`calculateStepDurations`). Elle apparaît dans le panneau d'erreur existant. Test cible : le partial figure reste visible (mécanisme `_loadError`).

5. **Tests E2E Playwright** : reportés V1.5. En V1 : tests unitaires + manuels via `/construction-demo`.

---

## Validation Phase 0

Cette spec sera validée implicitement par les tests TDD écrits en Phase 1 (parser), Phase 2 (resolve), Phase 3 (executor routing), Phase 5 (visibilité).

Si un test révèle une ambiguïté dans cette spec, on met à jour ce document.

**Progression** : ce document est versionné dans `docs/wip/` et sert de référence pour toutes les phases ultérieures.
