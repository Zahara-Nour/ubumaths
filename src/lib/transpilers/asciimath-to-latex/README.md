# ASCIIMath to LaTeX Transpiler

Transpiler ASCIIMath vers LaTeX avec architecture Parser classique.

## Architecture

```
asciimath-to-latex/
├── types.ts          # Types pour tokens, AST nodes, options
├── symbols.ts        # Tables de correspondance (Greek, Functions, Symbols)
├── lexer.ts          # TODO: Tokenization
├── parser.ts         # TODO: AST construction
├── generator.ts      # TODO: LaTeX generation
├── index.ts          # TODO: API publique
└── __tests__/        # Tests unitaires
```

## Types principaux

### Tokens

- `NUMBER`, `IDENTIFIER`, `FUNCTION`, `GREEK`, `SYMBOL`
- `OPERATOR`: `+`, `-`, `*`, `/`, `^`, `_`, `=`, `<`, `>`
- Délimiteurs: `LPAREN`, `RPAREN`, `LBRACKET`, `RBRACKET`, `LBRACE`, `RBRACE`
- `TEMPLATE`: `{{...}}` (préservé tel quel)

### AST Nodes

- Littéraux: `NumberNode`, `IdentifierNode`, `GreekNode`, `SymbolNode`, `TemplateNode`
- Groupes: `GroupNode`, `ParenNode`
- Opérations: `BinaryOpNode`, `UnaryOpNode`, `FractionNode`
- Scripts: `SuperscriptNode`, `SubscriptNode`, `SubSupNode`
- Fonctions: `FunctionNode`, `RootNode`

## Symboles supportés

### Lettres grecques (45)

- Minuscules: `alpha`, `beta`, `gamma`, `delta`, `epsilon`, `varepsilon`, `zeta`, `eta`, `theta`, `vartheta`, `iota`, `kappa`, `lambda`, `mu`, `nu`, `xi`, `pi`, `rho`, `sigma`, `tau`, `upsilon`, `phi`, `varphi`, `chi`, `psi`, `omega`
- Majuscules: `Gamma`, `Delta`, `Theta`, `Lambda`, `Xi`, `Pi`, `Sigma`, `Upsilon`, `Phi`, `Psi`, `Omega`

### Fonctions (8)

- Trigonométrie: `sin`, `cos`, `tan`
- Logarithmes: `log`, `ln`, `exp`
- Spéciales: `sqrt`, `root`, `abs`

### Symboles spéciaux (40+)

- Infini: `oo` → `\infty`
- Arithmétique: `+-`, `-+`, `times`, `cdot`, `*`, `div`
- Relations: `!=`, `<=`, `>=`, `<<`, `>>`, `approx`, `equiv`, `prop`
- Flèches: `->`, `=>`, `<->`, `<=>`
- Ensembles: `in`, `notin`, `subset`, `supset`, `cap`, `cup`
- Logique: `forall`, `exists`, `therefore`, `because`, `and`, `or`, `not`

## Ordre de matching

Les symboles sont ordonnés par longueur (plus longs d'abord) pour éviter les conflits:

- `notin` avant `in`
- `<=>` avant `=>`
- `<<` avant `<`

## Options

```typescript
interface TranspileOptions {
	preserveTemplates?: boolean; // default: true
}
```

## Résultat

```typescript
interface TranspileResult {
	success: boolean;
	latex: string;
	error?: string;
	templatesPreserved: number;
}
```

## Exemples

```typescript
// À venir après implémentation du lexer/parser/generator
```
