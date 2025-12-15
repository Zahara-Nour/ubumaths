# Troubleshooting

> Problemes courants et solutions pour le systeme de questions.

---

## Erreurs de generation

### "Au moins une variation requise"

**Cause** : Template sans variations.

**Solution** :

```typescript
// INCORRECT
{ type: 'numerical_exact', statement: '...' }

// CORRECT
{
  type: 'numerical_exact',
  variations: [{ statement: '...', solution: '...' }]
}
```

---

### "Variation X: statement requis"

**Cause** : Variation sans enonce.

**Solution** :

```typescript
variations: [
	{
		statement: 'Calculer: $${{a}} + {{b}}$$', // REQUIS
		solution: '{{eval:a+b}}'
	}
];
```

---

### "Variation X: solution requise"

**Cause** : Variation sans solution.

**Solution** :

```typescript
variations: [
	{
		statement: '...',
		solution: '{{eval:a+b}}' // REQUIS
	}
];
```

---

### "Dependance circulaire: a -> b -> a"

**Cause** : Variables qui se referencent mutuellement.

**Probleme** :

```typescript
variables: [
	{ name: 'a', expression: '{{eval:{{b}}+1}}' },
	{ name: 'b', expression: '{{eval:{{a}}+1}}' } // CYCLE!
];
```

**Solution** : Reorganiser les dependances en DAG (graphe acyclique).

```typescript
variables: [
	{ name: 'base', expression: '{{1..10}}' },
	{ name: 'a', expression: '{{eval:{{base}}+1}}' },
	{ name: 'b', expression: '{{eval:{{base}}+2}}' }
];
```

---

### "Variable 'x' non definie"

**Cause** : Reference a une variable non declaree ou declaree apres.

**Probleme** :

```typescript
variables: [
	{ name: 'sum', expression: '{{eval:a+b}}' }, // a, b pas encore definis!
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{1..10}}' }
];
```

**Solution** : Declarer dans le bon ordre.

```typescript
variables: [
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{1..10}}' },
	{ name: 'sum', expression: '{{eval:a+b}}' } // a, b definis avant
];
```

---

### "Impossible de generer une valeur (exclusions)"

**Cause** : Toutes les valeurs possibles sont exclues.

**Probleme** :

```typescript
// Plage 1..3 mais on exclut 1, 2, 3
variables: [
	{ name: 'a', expression: '{{1..3}}' },
	{ name: 'b', expression: '{{1..3!1,2,3}}' } // Plus rien!
];
```

**Solution** : Elargir la plage ou reduire les exclusions.

```typescript
variables: [
	{ name: 'a', expression: '{{1..10}}' },
	{ name: 'b', expression: '{{1..10!{{a}}}}' } // Une seule exclusion
];
```

---

## Erreurs de syntaxe

### "Token non reconnu: {{...}}"

**Cause** : Syntaxe invalide dans les accolades.

**Problemes courants** :

```typescript
// Accolades mal fermees
'{{a}'; // Manque }
'{{a}}'; // Correct

// Imbrication incorrecte
'{{{{a}}..{{b}}'; // Manque }}
'{{{{a}}..{{b}}}}'; // Correct
```

---

### "Expression eval invalide"

**Cause** : Expression mathematique mal formee.

**Problemes courants** :

```typescript
// Operateur manquant
'{{eval:ab}}'; // Manque * entre a et b
'{{eval:a*b}}'; // Correct

// Fonction inconnue
'{{eval:racine(4)}}'; // Pas francais!
'{{eval:sqrt(4)}}'; // Correct

// Parentheses non equilibrees
'{{eval:(a+b}}'; // Manque )
'{{eval:(a+b)}}'; // Correct
```

---

### "Modifier inconnu: x"

**Cause** : Modifier invalide dans eval.

**Modifiers valides** :

```typescript
{{eval:expr;d}}     // decimal
{{eval:expr;+}}     // positive
{{eval:expr;()}}    // bracket
{{eval:expr;d,+}}   // Combinaison
```

---

## Erreurs de validation

### "choices requis pour multiple_choice"

**Cause** : Type multiple_choice sans choix.

**Solution** :

```typescript
{
  type: 'multiple_choice',
  variations: [{
    statement: 'Question?',
    solution: '{{correct}}',
    choices: [  // REQUIS
      { content: '{{correct}}', isCorrect: true },
      { content: '{{wrong}}', isCorrect: false }
    ]
  }]
}
```

---

### "blanks requis pour fill_in_blanks"

**Cause** : Type fill_in_blanks sans definition des blancs.

**Solution** :

```typescript
{
  type: 'fill_in_blanks',
  variations: [{
    statement: '5 + ____ = 12',
    solution: '7',
    blanks: [  // REQUIS
      { position: 0, expectedAnswer: '7' }
    ]
  }]
}
```

---

### "Nombre de blanks ne correspond pas"

**Cause** : Desalignement entre `____` dans statement et `blanks` array.

**Probleme** :

```typescript
{
  statement: '____ + ____ = 10',  // 2 blancs
  blanks: [
    { position: 0, expectedAnswer: '3' }  // 1 seul defini!
  ]
}
```

**Solution** : Definir tous les blancs.

```typescript
{
  statement: '____ + ____ = 10',
  blanks: [
    { position: 0, expectedAnswer: '3' },
    { position: 1, expectedAnswer: '7' }
  ]
}
```

---

## Problemes d'affichage

### LaTeX ne s'affiche pas

**Cause** : Delimiteurs manquants ou incorrects.

**Solutions** :

```typescript
// Inline (simple $)
statement: 'Calculer $x + 1$';

// Block (double $$)
statement: 'Calculer $$x + 1$$';

// Attention aux backslashes
statement: '$$\\frac{1}{2}$$'; // Double backslash en JS
```

---

### Variables non resolues dans l'affichage

**Cause** : La variable n'existe pas ou erreur de syntaxe.

**Debug** :

```typescript
const result = generateInstance(template, 42);
console.log(result.instance.resolvedVariables);
// Verifier que la variable est presente
```

---

### Choix non melanges

**Cause** : Verification que le melange fonctionne.

**Note** : Les choix sont melanges avec le seed. Meme seed = meme ordre.

**Debug** :

```typescript
const result = generateInstance(template, 42);
console.log(result.instance.shuffledChoices);
// Verifier originalIndex pour voir l'ordre original
```

---

## Problemes de performance

### Generation lente

**Causes possibles** :

1. Trop de variables avec exclusions complexes
2. Expressions eval tres complexes
3. Plages trop larges avec beaucoup d'exclusions

**Solutions** :

```typescript
// Eviter
{ name: 'x', expression: '{{1..1000000!{{a}},{{b}},{{c}},...}}' }

// Preferer
{ name: 'x', expression: '{{1..100!{{a}}}}' }
```

---

### Timeout API

**Cause** : Generation qui prend trop de temps.

**Solution** : Simplifier le template ou utiliser des plages plus petites.

---

## Problemes de test

### Tests non deterministes

**Cause** : Pas de seed dans les tests.

**Solution** :

```typescript
// INCORRECT - aleatoire
const result = generateInstance(template);

// CORRECT - deterministe
const result = generateInstance(template, 12345);
expect(result.instance.solution).toBe('10');
```

---

### "Cannot read property of undefined"

**Cause** : Generation echouee mais non verifiee.

**Solution** :

```typescript
const result = generateInstance(template, seed);

// TOUJOURS verifier success
if (!result.success) {
	console.error(result.errors);
	return;
}

// Maintenant on peut acceder a instance
console.log(result.instance.statement);
```

---

## Debug avance

### Activer les logs

```typescript
// Dans instance-generator.ts (dev uniquement)
const DEBUG = import.meta.env.DEV;

if (DEBUG) {
	console.log('Variables resolues:', resolvedVariables);
	console.log('Statement resolu:', statement);
}
```

### Inspecter le pipeline

```typescript
import { tokenize } from '$lib/shared/parameterization/parser/tokenizer';
import { parseRandomSpec } from '$lib/shared/parameterization/parser/random-parser';

// 1. Voir les tokens
const tokens = tokenize('{{a}} + {{eval:b*2}}');
console.log(tokens);

// 2. Parser un random spec
const spec = parseRandomSpec('1..10!5');
console.log(spec);
```

### Tester le Compute Engine

```typescript
import { evaluateExpression, areEquivalent } from '$lib/math/compute-engine';

// Evaluer
console.log(evaluateExpression('sqrt(16)')); // 4

// Equivalence
console.log(areEquivalent('1/2', '0.5')); // true
```

---

## FAQ

### Q: Puis-je avoir des variables partagees entre variations?

**R**: Oui, via `shared.variables`. Elles sont fusionnees (pas ecrasees).

```typescript
{
  shared: { variables: [{ name: 'min', expression: '1' }] },
  variations: [
    { variables: [{ name: 'a', expression: '{{{{min}}..10}}' }], ... }
  ]
}
```

---

### Q: Comment forcer une forme de reponse specifique?

**R**: Utiliser les contraintes avec mode `strict`.

```typescript
options: {
  constraints: {
    reducedFractions: 'strict',  // Fraction reduite obligatoire
    form: 'strict'               // Forme exacte obligatoire
  }
}
```

---

### Q: Comment avoir plusieurs reponses correctes?

**R**: Utiliser `validationRules` au lieu de `solution` fixe.

```typescript
{
  solution: 'dynamic',
  validationRules: [
    { type: 'predicate', predicate: 'isPrime' },
    { type: 'range', min: '1', max: '100' }
  ]
}
```

---

### Q: Comment debugger une generation qui echoue?

**R**:

1. Verifier le resultat de `generateInstance`
2. Si `success: false`, lire `errors`
3. Tester chaque variable individuellement
4. Verifier les cycles de dependances

```typescript
const result = generateInstance(template, 42);
if (!result.success) {
	result.errors.forEach((e) => console.error(e));
}
```

---

## Voir aussi

- [generation.md](generation.md) - Pipeline generation
- [parameterization.md](parameterization.md) - Syntaxe
- [validation.md](validation.md) - Validation
