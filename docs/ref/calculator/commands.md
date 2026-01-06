# CAS Commands Reference

## Overview

The calculator supports a rich set of Computer Algebra System (CAS) commands for symbolic manipulation, evaluation, and analysis.

**Command Syntax**: `.command [arguments]`

---

## Quick Reference

| Category       | Commands                                              |
| -------------- | ----------------------------------------------------- |
| Core           | `.parse`, `.tree`, `.latex`, `.custom`, `.help`       |
| Simplification | `.simplify`, `.normal`, `.hash`, `.equiv`             |
| Evaluation     | `.eval`, `.let`, `.vars`, `.unset`, `.clear`, `.mode` |
| Functions      | `.def`, `.def-deriv`, `.inv`, `.fns`, `.undef`        |
| Calculus       | `.diff`, `.taylor`                                    |
| Statistics     | `.stats`, `.linreg`                                   |
| Units          | `.convert`, `.unitmode`                               |

---

## Core Commands

### `.parse` (alias: `.p`)

Display parsing information for an expression.

```
.parse x^2 + 1
```

**Output**: Parse format (LaTeX/custom), any errors.

### `.tree` (alias: `.t`)

Display the AST (Abstract Syntax Tree) structure.

```
.tree x^2 + 1
```

**Output**: Hierarchical tree representation.

### `.latex` (alias: `.l`)

Convert expression to LaTeX format.

```
.latex x^2 + 1
```

**Output**: `x^{2}+1`

### `.custom` (alias: `.c`)

Convert expression to custom (human-readable) syntax.

```
.custom \frac{x^2}{2}
```

**Output**: `x^2/2`

### `.help` (aliases: `.h`, `.?`)

Display help information.

```
.help
.help diff
```

---

## Simplification Commands

### `.simplify` (alias: `.s`)

Simplify an expression algebraically.

```
.simplify (x+1)^2 - x^2 - 2*x
```

**Output**: `1`

```
.simplify x^2 - 1
```

**Output**: `(x-1)*(x+1)`

### `.normal` (alias: `.n`)

Convert to normal (canonical) form.

```
.normal 1/x + 1/y
```

**Output**: `(x+y)/(x*y)`

### `.hash`

Compute semantic hash (for equivalence detection).

```
.hash x + y
.hash y + x
```

Both produce the same hash (commutative equivalence).

### `.equiv` (alias: `.eq`)

Check if two expressions are equivalent.

```
.equiv (x+1)^2 , x^2 + 2*x + 1
```

**Output**: `true`

Can also use inline syntax:

```
(x+1)^2 === x^2 + 2*x + 1
```

---

## Evaluation Commands

### `.eval` (alias: `.e`)

Evaluate expression numerically.

```
.eval sin(pi/4)
```

**Output**: `0.7071067811865476`

### `.let`

Define a variable binding.

```
.let a = 5
.let b = a + 3
```

Then use in expressions:

```
a * b
```

**Output**: `40`

**Inline syntax** (without `.let`):

```
x = 10
```

### `.vars` (alias: `.v`)

List all defined variables.

```
.vars
```

**Output**:

```
a = 5
b = 8
x = 10
```

### `.unset`

Remove a variable binding.

```
.unset a
```

### `.clear`

Clear all variable bindings.

```
.clear
```

### `.mode` (alias: `.m`)

Set evaluation mode.

```
.mode exact    # Prefer exact fractions
.mode approx   # Prefer decimals
```

---

## Function Commands

### `.def`

Define a custom function.

```
.def f(x) = x^2 + 1
.def g(x, y) = x*y + x + y
```

Then use:

```
f(3)      # 10
g(2, 3)   # 11
```

### `.def-deriv`

Define the derivative of a function (for `.diff` to use).

```
.def f(x) = x^2
.def-deriv f 2*x
```

### `.inv`

Define the inverse of a function.

```
.def f(x) = 2*x + 1
.inv f (x-1)/2
```

### `.fns` (alias: `.f`)

List all defined functions.

```
.fns
```

**Output**:

```
f(x) = x^2 + 1
g(x, y) = x*y + x + y
```

### `.undef`

Remove a function definition.

```
.undef f
```

---

## Calculus Commands

### `.diff` (alias: `.d`)

Differentiate an expression.

```
.diff x^3
```

**Output**: `3*x^2`

Specify variable:

```
.diff x^2*y , x    # Differentiate w.r.t. x
.diff x^2*y , y    # Differentiate w.r.t. y
```

Higher derivatives:

```
.diff x^4 , x , 2  # Second derivative
```

**Output**: `12*x^2`

### `.taylor`

Compute Taylor series expansion.

```
.taylor sin(x) 0 5
```

**Arguments**: `expression`, `center`, `order`

**Output**: `x - x^3/6 + x^5/120`

---

## Statistics Commands

### `.stats`

Compute statistical summary of a dataset.

```
.stats 1, 2, 3, 4, 5
```

**Output**:

```
Nombre: 5
Moyenne: 3
Mediane: 3
Min: 1
Max: 5
Ecart-type: 1.5811...
Variance: 2.5
```

**Limits**: Max 1000 values (DoS prevention).

### `.linreg`

Perform linear regression.

```
.linreg 1,2,3,4,5 : 2,4,5,4,5
```

**Syntax**: `x_values : y_values`

**Output**:

```
Regression lineaire:
  Pente (a): 0.6
  Ordonnee (b): 2.2
  R^2: 0.6
  Equation: y = 0.6*x + 2.2
```

**Limits**: Max 1000 values per axis.

---

## Unit Commands

### `.convert`

Convert the last result to a different unit.

```
5 km + 3000 m
.convert m
```

**Output**: `8000 m`

```
100 km/h
.convert m/s
```

**Output**: `27.78 m/s`

### `.unitmode`

Set the default unit conversion mode.

```
.unitmode first   # Convert to first operand's unit (default)
.unitmode si      # Convert to SI base units
.unitmode best    # Choose most appropriate unit
```

---

## Error Messages

### French Pedagogical Errors

The calculator provides pedagogical error messages in French:

| Error              | Message                                     |
| ------------------ | ------------------------------------------- |
| Dimension mismatch | "Les unites n'ont pas la meme dimension..." |
| Unknown unit       | "Unite inconnue: 'xyz'"                     |
| Division by zero   | "Division par zero"                         |
| Parse error        | "Erreur de syntaxe..."                      |
| Unknown variable   | "Variable non definie: 'x'"                 |

---

## Chaining Commands

Commands work on the last AST by default:

```
x^2 + 2*x + 1     # Parse and display
.simplify          # Simplify last expression
.diff              # Differentiate the simplified result
```

Or provide inline expression:

```
.diff x^2 + 2*x + 1
```

---

## Full Example Session

```
> .def f(x) = x^3 - 3*x^2 + 2*x
f(x) = x^3 - 3*x^2 + 2*x

> .diff f(x)
3*x^2 - 6*x + 2

> .let a = 1
a = 1

> f(a)
0

> .simplify f(x) / x
x^2 - 3*x + 2

> .simplify x^2 - 3*x + 2
(x-1)*(x-2)

> 100 km + 50000 m
150 km

> .convert m
150000 m

> .stats 10, 20, 30, 40, 50
Nombre: 5
Moyenne: 30
Mediane: 30
Min: 10
Max: 50
Ecart-type: 15.81...
Variance: 250
```
