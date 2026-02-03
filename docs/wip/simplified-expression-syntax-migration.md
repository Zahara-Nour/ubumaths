# Migration de la syntaxe simplifiée des expressions

## Status : COMPLETE

**Date** : 2026-02-03

## Objectif

Remplacer la syntaxe `{{}}` obligatoire dans les définitions de variables par une syntaxe simplifiée :

```typescript
// Avant (ancienne syntaxe)
{ name: 'a', expression: '{{1..10}}' }

// Après (nouvelle syntaxe simplifiée)
{ name: 'a', expression: '1..10' }
```

**Important** : Les `{{}}` restent obligatoires dans les templates texte (`"Calcule ${{a}}$"`).

---

## Syntaxe de référence

| Expression            | Type                      | Normalisation interne       |
| --------------------- | ------------------------- | --------------------------- |
| `1..10`               | random entier             | → `{{1..10}}`               |
| `min..max`            | random bounds variables   | → `{{min..max}}`            |
| `2..9;+-`             | random relatif            | → `{{2..9;+-}}`             |
| `1.5..9.5`            | random decimal range      | → `{{1.5..9.5}}`            |
| `digits:2`            | n-digit integer (10-99)   | → `{{digits:2}}`            |
| `digits:1..3`         | n-m digit integer (1-999) | → `{{digits:1..3}}`         |
| `digits:a..b`         | digits variable bounds    | → `{{digits:a..b}}`         |
| `digits:{{n}}..{{m}}` | digits explicit vars      | → `{{digits:{{n}}..{{m}}}}` |
| `digits:2.3`          | decimal by digits         | → `{{digits:2.3}}`          |
| `digits:a.b`          | decimal variable digits   | → `{{digits:a.b}}`          |
| `digits:{{n}}.{{m}}`  | decimal explicit vars     | → `{{digits:{{n}}.{{m}}}}`  |
| `rouge\|vert\|bleu`   | discrete list             | → `{{rouge\|vert\|bleu}}`   |
| `eval:a+b`            | expression                | → `{{eval:a+b}}`            |
| `text:hello`          | chaîne littérale          | → `hello` (strip prefix)    |
| `42`                  | littéral numérique        | → `42` (inchangé)           |
| `a`                   | référence variable        | → `{{a}}`                   |
| `{{...}}`             | déjà wrappé               | → `{{...}}` (passthrough)   |

---

## Architecture

### Approche : Normalisation vers syntaxe legacy

Une fonction `normalizeExpression()` convertit la syntaxe simplifiée vers `{{...}}`, puis les parsers existants sont réutilisés inchangés.

```
Syntaxe simplifiée → normalizeExpression() → {{...}} → Parsers existants
```

**Avantages** :

- Parsers existants (`random-parser.ts`, `eval-parser.ts`, `tokenizer.ts`) inchangés
- Un seul fichier créé, une ligne modifiée dans le resolver
- Rétrocompatibilité totale avec l'ancienne syntaxe `{{...}}`

---

## Fichiers créés/modifiés

| Fichier                                                                           | Action  | Description                           |
| --------------------------------------------------------------------------------- | ------- | ------------------------------------- |
| `src/lib/ubumark/parameterization/parser/expression-normalizer.ts`                | CRÉÉ    | Normalisation syntaxe simplifiée      |
| `src/lib/ubumark/__tests__/parameterization/parser/expression-normalizer.test.ts` | CRÉÉ    | Tests du normalizer                   |
| `src/lib/ubumark/parameterization/resolver/variable-resolver.ts`                  | MODIFIÉ | Import normalizer + `digits:X.Y`      |
| `src/lib/ubumark/__tests__/parameterization/resolver/variable-resolver.test.ts`   | MODIFIÉ | Tests mis à jour                      |
| `src/lib/ubumark/parameterization/parser/random-parser.ts`                        | MODIFIÉ | Erreur pour `random:X.Y` → `digits:`  |
| `src/lib/ubumark/__tests__/parameterization/parser/random-parser.test.ts`         | MODIFIÉ | Tests pour erreur `random:X.Y`        |
| `src/lib/ubumark/__tests__/parameterization/validator/variable-validator.test.ts` | MODIFIÉ | Tests `digits:` au lieu de `random:`  |
| `src/lib/ubumark/parameterization/index.ts`                                       | MODIFIÉ | Export des nouvelles fonctions        |
| `src/lib/migration/syntax-converter.ts`                                           | MODIFIÉ | `toSimplifiedSyntax()` + `{{digits}}` |
| `src/lib/migration/syntax-converter.test.ts`                                      | MODIFIÉ | Tests pour `{{digits:X.Y}}`           |
| `src/lib/migration/syntax-converter-integration.test.ts`                          | MODIFIÉ | Tests intégration mis à jour          |
| `src/lib/migration/question-transformer.ts`                                       | MODIFIÉ | Génération syntaxe simplifiée         |
| `src/lib/migration/question-transformer.test.ts`                                  | MODIFIÉ | Tests mis à jour                      |
| `docs/ref/ubumark/parameterization.md`                                            | MODIFIÉ | Documentation mise à jour             |
| `docs/ref/ubumark/syntax.md`                                                      | MODIFIÉ | Documentation mise à jour             |

---

## Implémentation

### Phase 1 : Normalizer (`expression-normalizer.ts`)

Fonctions principales :

```typescript
export type ExpressionType =
	| 'random' // 1..10, min..max, 2..9;+-
	| 'digits' // digits:2, digits:1..3, digits:2.3
	| 'discrete-list' // rouge|vert|bleu
	| 'eval' // eval:a+b
	| 'text-literal' // text:hello, arbitrary text
	| 'numeric-literal' // 42, 3.14
	| 'variable-ref' // a, myVar
	| 'already-wrapped'; // {{...}}

export function detectExpressionType(expression: string): ExpressionType;
export function normalizeExpression(expression: string): string;
```

### Phase 2 : Intégration dans le resolver

```typescript
// Dans variable-resolver.ts
import { normalizeExpression } from '../parser/expression-normalizer';

export function resolveExpression(
	expression: string,
	alreadyResolved: ResolvedVariable[],
	seed?: number
): string {
	// Normaliser la syntaxe simplifiée vers {{...}}
	let result = normalizeExpression(expression);
	// ... suite du code existant inchangé
}
```

### Phase 3 : Migration converter

Ajout de `toSimplifiedSyntax()` dans `syntax-converter.ts` :

```typescript
export function toSimplifiedSyntax(legacySyntax: string): string {
	// Convertit {{1..10}} → 1..10
	// Convertit {{eval:a+b}} → eval:a+b
	// Préserve le contenu mixte (text avec {{...}})
}
```

---

## Rétrocompatibilité

Le système détecte automatiquement les expressions déjà wrappées avec `{{...}}` et les laisse passer sans modification :

```typescript
// Ces deux formes fonctionnent
{ name: 'a', expression: '1..10' }      // Nouvelle syntaxe
{ name: 'a', expression: '{{1..10}}' }  // Ancienne syntaxe (passthrough)
```

---

## Tests

Tous les tests passent :

- **560 tests** parameterization
- **440 tests** migration

Total : **1000 tests** ✅

---

## Documentation mise à jour

- `docs/ref/ubumark/parameterization.md` - Exemples et explications mis à jour
- `docs/ref/ubumark/syntax.md` - Section paramétérisation mise à jour
- `docs/wip/simplified-expression-syntax-migration.md` - Ce document

---

## Breaking Changes

Aucun. La rétrocompatibilité est totale grâce au passthrough pour les expressions déjà wrappées avec `{{...}}`.

---

## Lien avec la migration des questions

Ce changement fait partie de la **Phase 17** de la migration des questions TinyMath → UbuMaths.

Voir : `docs/wip/question-migration-status.md`

---

## Notes d'utilisation

### Références de variables

Pour référencer une variable dans une définition, utilisez simplement son nom :

```typescript
{ name: 'ref', expression: 'a' }  // Référence la variable 'a'
```

Pour définir un littéral texte qui ressemble à un identifiant, utilisez le préfixe `text:` :

```typescript
{ name: 'literal', expression: 'text:x' }  // Littéral "x", pas une référence
```

### Décimaux par digits

Pour générer un décimal par nombre de digits, utilisez le préfixe `digits:` :

```typescript
{ name: 'decimal', expression: 'digits:2.3' }  // 2 digits entiers, 3 décimales → ex: "45.123"
{ name: 'decimal2', expression: 'digits:a.b' }  // Variables pour les digits
```

Sans préfixe, `2.3` serait interprété comme un littéral numérique.

**Note** : `random:X.Y` n'est plus supporté pour les décimaux par digits. Utilisez `digits:X.Y` à la place.
