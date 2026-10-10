---
title: mathAST — Audit qualite & dette technique
date: 2026-06-18
severity_globale: Acceptable
audience: maintainers
---

# mathAST — Audit qualite & dette technique

## 1. Metriques globales

| Metrique                          | Valeur                      |
| --------------------------------- | --------------------------- |
| Fichiers source (hors `.test.ts`) | **430**                     |
| Fichiers de test (`.test.ts`)     | **282**                     |
| Cas de test (`it`/`test`)         | **12 614**                  |
| Lignes source totales             | **152 430**                 |
| Exports publics (`index.ts`)      | 71 (re-exporte ~29 modules) |

### Top fichiers par taille

| Fichier                         | Lignes    | Note                              |
| ------------------------------- | --------- | --------------------------------- |
| `normal/normalize.ts`           | **4 210** | candidat prioritaire a la decoupe |
| `parser/latex/parser-pratt.ts`  | 2 365     |                                   |
| `factory.ts`                    | 2 025     |                                   |
| `parser/custom/parser-pratt.ts` | 1 949     |                                   |
| `limits/composition.ts`         | 1 635     |                                   |
| `transforms.ts`                 | 1 624     |                                   |

`normalize.ts` a 4 210 LOC / ~137 Ko est un risque de maintenabilite a lui seul (OOM possible en lecture, difficulte a faire des revues de code, surface de regression elevee). Une decoupe en `normalize-polynomial.ts` / `normalize-rational.ts` / `normalize-trigo.ts` resterait additive et ne casserait pas l'API.

---

## 2. Qualite TypeScript

### Points forts

- **Zero `any` / `as any` reel en source** : 7 occurrences de la chaine `any` existent mais toutes dans des commentaires de prose, pas dans du code. Zero `@ts-ignore`.
- **Union discriminee propre** : `types.ts:147-757` definit `BaseNode` + `readonly type` sur 28 variantes, tous les champs en `readonly`. Exemple de variante : `{ readonly type: 'addition'; readonly left: MathNode; readonly right: MathNode }`.
- **Exhaustivite garantie a la compilation** via le pattern `const _exhaustive: never = node` (ex. `guards.ts:672`). Ajouter une 29e variante sans mettre a jour les switch provoque une erreur de compilation.
- **Discipline des en-tetes** : excellente et constante sur les 430 fichiers source.

### Incohérence d'extension d'import

Quinze fichiers utilisent des imports en `.js` (style ESM explicite) contre ~930 sans extension :

- Tous les fichiers de `normal/` importent en `.js` (ex. `normalize.ts:16-67`).
- Les modules `solve/`, `integration/`, `limits/`, `common/` suivent egalement cette convention.
- Le reste du module importe sans extension.

Cette dichotomie ne cause aucune erreur runtime mais rend la recherche (`grep`) inconsistante et complique une eventuelle migration vers un format de module unifie.

### Collision de noms `isZero` / `isOne`

`index.ts` re-exporte deux familles de fonctions portant le meme nom :

- `guards.ts:743,754` — `isZero(node: MathNode)` / `isOne(node: MathNode)` : predicats **niveau noeud AST** (verifie si le noeud est la constante 0 ou 1).
- `normal/rational.ts` via `normal/index.ts:50-51` — `isZero(r: Rational)` / `isOne(r: Rational)` : predicats **niveau rationnel** (forme normale).

Les deux exports coexistent dans l'espace de noms public. L'importeur qui ecrit `import { isZero } from '$lib/mathAST'` recevra le dernier export gagnant selon l'ordre de re-export dans `index.ts` — comportement fragile. Renommer les predicats rationnel en `isZeroRational`/`isOneRational` (deja fait pour `isZeroTerm`, `isZeroPolynomial`, etc.) supprimerait l'ambiguite.

---

## 3. Invariants structurels (conventions, non garantis par les types)

Ces invariants sont les plus precieux a connaitre pour tout contributeur. Ils ne sont pas exprimables dans le systeme de types TypeScript et se propagent par convention.

### 3.1 Nombres signes interdits dans `number()`

`factory.ts:255-269` : `number('-3')` **throw**. Les valeurs negatives passent obligatoirement par `opposite(number('3'))` ou par `numericNode(...)` (qui gere le signe lui-meme). De meme, `isMinusOne` ne reconnait que `opposite(number('1'))` (`guards.ts:768`), jamais `number('-1')`.

Consequence : tout code qui construit des litteraux numeriques directement (ex. `{ type: 'number', value: '-3' }`) contourne ce garde et produit un noeud invalide.

### 3.2 Delimiteurs = frontieres intangibles de flatten

`flatten.ts:7-8,123-130` : `flattenSumShallow` et `flattenProductShallow` s'arretent aux noeuds `delimiter` et ne descendent pas dedans. Invariant porteur de toute l'analyse structurelle en aval — sans lui, les expressions entre parentheses seraient aplatissables et perdraient leur statut de groupe.

Post-condition forte : apres `flattenSumShallow`, les noeuds `addition`/`subtraction`/`opposite`/`positive` **n'existent plus** au niveau analyse (ils sont absorbes dans les termes signes). Apres `flattenProductShallow`, `multiplication` n'existe plus au niveau analyse.

### 3.3 Contrat round-trip flatten/unflatten

`flatten.ts:534-616` : `unflattenSum` reconstruit `((a-b)+c)` en left-associatif. `StyledFactor.style` porte le style de l'operateur precedent (`×`, `·`, implicite) ; le 1er facteur porte toujours `'implicit'`. Le round-trip `flatten → modifier les termes → unflatten` preserve le style d'affichage.

### 3.4 Chaines de relation left-nested

`relation('<', relation('<', a, b), c)` avec `unflattenRelationChain`. La variante `relationChain` valide que `relations.length === operands.length - 1` (un operateur entre chaque paire).

### 3.5 Immutabilite = garantie type-level uniquement

Les champs sont `readonly` et les constructeurs utilisent `as const`, mais `Object.freeze` est absent (0 occurrence dans le module). Les noeuds ne sont pas geles au runtime : la garantie d'immutabilite repose sur la discipline du code, pas sur JavaScript. Modifier un champ d'un noeud directement ne provoquera aucune erreur — le bug sera silencieux.

---

## 4. Drift factory — dette [MED]

**~91 litteraux `{ type: '...' }` bruts** construits hors factory ont ete identifies dans le module. Exemples :

- `solve/solvers/transcendental.ts:177`
- `analysis/structures.ts:599, 621, 695`
- plusieurs fichiers de `limits/`

Ces constructions contournent le sign-guard de `number()` (section 3.1) et echappent a toute validation de la factory. Elles constituent une dette double : risque de produire des noeuds invalides, et fragilite face a un futur changement du format interne des noeuds.

**Remede** : remplacer les litteraux bruts par les helpers factory correspondants (`number()`, `opposite()`, `add()`, etc.). L'operation est mecanique mais volumineuse (~91 sites).

---

## 5. Known parser issues

Ces deux comportements sont documentes et **ne doivent pas etre corriges** sans evaluation soigneuse des effets de bord sur l'ensemble du projet.

### 5.1 Moins unaire — `-3y` structure incorrecte

**Parser** : `parseLatex`

**Comportement** : `-3y` produit `multiplication(opposite(number('3')), variable('y'))` au lieu de `opposite(multiplication(number('3'), variable('y')))`.

**Impact** : le resultat numerique est identique. En revanche, les analyses **structurelles** (`extractAffineCombination`, pattern matching structurel, etc.) qui recherchent un `opposite` enveloppant une multiplication ne reconnaissent pas cette forme. Tout code qui tente de "voir" que `-3y` est l'oppose de `3y` doit explicitement gerer le cas de l'`opposite` enfoui dans le facteur.

**Workaround** : normaliser l'expression avant toute analyse structurelle (`normalize()` absorbe ce pattern dans la forme normale).

**Pas de fix parser prevu** : le risque d'effets de bord sur les analyses existantes est juge superieur au benefice.

### 5.2 Slash apres exposant — `x^2/4` erreur

**Parser** : `parseCustomPratt`

**Comportement** : `x^2/4` provoque une erreur de parsing. La priorite de l'exposant consomme le `/4` comme second argument de la puissance.

**Workaround** : ecrire `{x^2}/4` ou `(x^2)/4` pour lever l'ambiguite.

**Pas de fix prevu** pour les memes raisons.

---

## 6. Couverture des tests

### Rapport global

Le module respecte globalement un ratio 1:1 source/test (430 src, 282 test). Les modules CAS centraux sont bien couverts.

### Sous-modules bien couverts

| Module    | Fichiers src | Fichiers test |
| --------- | ------------ | ------------- |
| `normal/` | 19           | 19            |
| `parser/` | 18           | 18            |
| `eval/`   | 11           | 16            |
| `solve/`  | 18           | 15            |
| `domain/` | 25           | 15            |

### Sous-modules sous-couverts (risque eleve)

| Module                  | Fichiers src | Fichiers test | Risque                                         |
| ----------------------- | ------------ | ------------- | ---------------------------------------------- |
| `sign/`                 | 14           | 3             | Pilote les tableaux de signes (paliers eleves) |
| `variations/`           | 8            | 2             | Pilote les tableaux de variations              |
| `taylor/`               | 3            | 1             |                                                |
| `differentiation/`      | 4            | 2             |                                                |
| `pedagogical-simplify/` | 18           | 6             | Pilote les etapes affichees a l'eleve          |
| `pedagogical-solve/`    | 28           | 13            | Pilote les paliers de resolution               |

Les couches pedagogiques (`pedagogical-*`) et `sign/` sont particulierement risquees : elles pilotent directement ce qu'un eleve voit a l'ecran, et une regression n'y est pas detectee par les tests unitaires existants.

---

## 7. Priorites de refactoring

| Priorite | Fichier / zone                              | Raison                                                                    | Effort |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| 1        | `normal/normalize.ts` (4 210 LOC)           | Taille critique, OOM possible, surface de regression                      | Eleve  |
| 2        | ~91 sites drift factory                     | Contournent le sign-guard, propagent des noeuds invalides silencieusement | Moyen  |
| 3        | Collision `isZero`/`isOne` dans `index.ts`  | Ambiguite d'import pour tout consommateur de `$lib/mathAST`               | Faible |
| 4        | Extension `.js` inconsistante (15 fichiers) | Recherche grep incoherente, migration ESM compliquee                      | Faible |
| 5        | Couverture `sign/` et `pedagogical-*`       | Risque eleve sur les paliers eleves                                       | Moyen  |
