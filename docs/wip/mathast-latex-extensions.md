# MathAST LaTeX Extension Tracker

> **Purpose**: Track LaTeX features that cannot be converted to custom syntax, to guide future mathAST improvements.
>
> **Updated**: 2025-12-10
>
> **Related**: `src/lib/ubumark/importers/latex/converters/math-to-custom.ts`

---

## Currently Supported

### Greek Letters (5)

| Letter | LaTeX    | Custom Syntax |
| ------ | -------- | ------------- |
| pi     | `\pi`    | `\pi`         |
| alpha  | `\alpha` | `\alpha`      |
| beta   | `\beta`  | `\beta`       |
| gamma  | `\gamma` | `\gamma`      |
| theta  | `\theta` | `\theta`      |

### Symbols (1)

| Symbol   | LaTeX    | Custom Syntax |
| -------- | -------- | ------------- |
| infinity | `\infty` | `\infty`      |

### Operations

| Operation                 | LaTeX         | Custom Syntax          |
| ------------------------- | ------------- | ---------------------- |
| Addition                  | `a + b`       | `a+b`                  |
| Subtraction               | `a - b`       | `a-b`                  |
| Multiplication (implicit) | `ab`          | `ab`                   |
| Multiplication (explicit) | `a \cdot b`   | `a*b`                  |
| Division/Fraction         | `\frac{a}{b}` | `a/b` or `{a+b}/{c+d}` |
| Power                     | `x^2`         | `x^2`                  |
| Subscript                 | `x_1`         | `x_1`                  |
| Square root               | `\sqrt{x}`    | `sqrt(x)`              |
| Nth root                  | `\sqrt[n]{x}` | `sqrt[n](x)`           |

### Functions

| Function      | LaTeX       | Custom Syntax |
| ------------- | ----------- | ------------- | --------- | ------- | --- | --- | --- | --- |
| sin           | `\sin(x)`   | `sin(x)`      |
| cos           | `\cos(x)`   | `cos(x)`      |
| tan           | `\tan(x)`   | `tan(x)`      |
| log           | `\log(x)`   | `log(x)`      |
| log with base | `\log_2(x)` | `log_2(x)`    |
| ln            | `\ln(x)`    | `ln(x)`       |
| exp           | `\exp(x)`   | `exp(x)`      |
| abs           | `           | x             | `or`\left | x\right | `   | `   | x   | `   |

### Relations

| Relation         | LaTeX  | Custom Syntax |
| ---------------- | ------ | ------------- |
| Equals           | `=`    | `=`           |
| Less than        | `<`    | `<`           |
| Greater than     | `>`    | `>`           |
| Less or equal    | `\leq` | `<=`          |
| Greater or equal | `\geq` | `>=`          |
| Not equals       | `\neq` | `!=`          |

---

## Unsupported Features (Extensions Needed)

### Greek Letters (Remaining)

| Letter  | LaTeX      | Priority | Complexity | Notes                      |
| ------- | ---------- | -------- | ---------- | -------------------------- |
| delta   | `\delta`   | High     | Low        | Common in physics/calculus |
| epsilon | `\epsilon` | High     | Low        | Common in limits           |
| lambda  | `\lambda`  | High     | Low        | Common in physics          |
| mu      | `\mu`      | Medium   | Low        | Statistics                 |
| sigma   | `\sigma`   | High     | Low        | Statistics, summation      |
| omega   | `\omega`   | Medium   | Low        | Angular frequency          |
| phi     | `\phi`     | Medium   | Low        | Golden ratio, angles       |
| psi     | `\psi`     | Low      | Low        | Quantum mechanics          |
| rho     | `\rho`     | Medium   | Low        | Density                    |
| tau     | `\tau`     | Low      | Low        | Time constant              |
| xi      | `\xi`      | Low      | Low        |                            |
| zeta    | `\zeta`    | Low      | Low        |                            |
| eta     | `\eta`     | Low      | Low        |                            |
| kappa   | `\kappa`   | Low      | Low        |                            |
| nu      | `\nu`      | Low      | Low        |                            |
| chi     | `\chi`     | Low      | Low        |                            |
| Delta   | `\Delta`   | High     | Low        | Change notation            |
| Sigma   | `\Sigma`   | High     | Low        | Summation                  |
| Pi      | `\Pi`      | Medium   | Low        | Product notation           |
| Omega   | `\Omega`   | Medium   | Low        | Ohms, big-O                |
| Phi     | `\Phi`     | Low      | Low        |                            |
| Psi     | `\Psi`     | Low      | Low        |                            |
| Lambda  | `\Lambda`  | Low      | Low        |                            |
| Gamma   | `\Gamma`   | Medium   | Low        | Gamma function             |

### Symbols

| Symbol         | LaTeX             | Priority | Complexity | Notes               |
| -------------- | ----------------- | -------- | ---------- | ------------------- |
| partial        | `\partial`        | High     | Low        | Partial derivatives |
| nabla          | `\nabla`          | High     | Low        | Gradient            |
| forall         | `\forall`         | Medium   | Low        | Logic               |
| exists         | `\exists`         | Medium   | Low        | Logic               |
| in             | `\in`             | High     | Low        | Set membership      |
| notin          | `\notin`          | Medium   | Low        | Not in set          |
| subset         | `\subset`         | Medium   | Low        | Set theory          |
| cup            | `\cup`            | Medium   | Low        | Union               |
| cap            | `\cap`            | Medium   | Low        | Intersection        |
| emptyset       | `\emptyset`       | Medium   | Low        | Empty set           |
| pm             | `\pm`             | High     | Low        | Plus/minus          |
| mp             | `\mp`             | Low      | Low        | Minus/plus          |
| times          | `\times`          | Medium   | Low        | Cross product       |
| div            | `\div`            | Low      | Low        | Division symbol     |
| cdots          | `\cdots`          | Medium   | Low        | Horizontal dots     |
| ldots          | `\ldots`          | Medium   | Low        | Low dots            |
| vdots          | `\vdots`          | Low      | Low        | Vertical dots       |
| ddots          | `\ddots`          | Low      | Low        | Diagonal dots       |
| rightarrow     | `\rightarrow`     | Medium   | Low        | Arrow               |
| leftarrow      | `\leftarrow`      | Medium   | Low        | Arrow               |
| Rightarrow     | `\Rightarrow`     | Medium   | Low        | Implies             |
| Leftrightarrow | `\Leftrightarrow` | Medium   | Low        | Iff                 |
| approx         | `\approx`         | High     | Low        | Approximately       |
| equiv          | `\equiv`          | Medium   | Low        | Equivalent          |
| propto         | `\propto`         | Medium   | Low        | Proportional        |

### Environments

| Environment | LaTeX             | Priority | Complexity | Notes                     |
| ----------- | ----------------- | -------- | ---------- | ------------------------- |
| matrix      | `\begin{matrix}`  | High     | High       | Matrix without delimiters |
| pmatrix     | `\begin{pmatrix}` | High     | High       | Matrix with parentheses   |
| bmatrix     | `\begin{bmatrix}` | High     | High       | Matrix with brackets      |
| vmatrix     | `\begin{vmatrix}` | Medium   | High       | Matrix with vertical bars |
| cases       | `\begin{cases}`   | High     | High       | Piecewise functions       |
| align       | `\begin{align}`   | Medium   | High       | Multi-line equations      |
| array       | `\begin{array}`   | Medium   | High       | General arrays            |

### Special Commands

| Command    | LaTeX                | Priority | Complexity | Notes                |
| ---------- | -------------------- | -------- | ---------- | -------------------- |
| overbrace  | `\overbrace{x}^{n}`  | Low      | Medium     |                      |
| underbrace | `\underbrace{x}_{n}` | Low      | Medium     |                      |
| overline   | `\overline{x}`       | Medium   | Low        | Conjugate, mean      |
| underline  | `\underline{x}`      | Low      | Low        |                      |
| hat        | `\hat{x}`            | Medium   | Low        | Unit vector          |
| vec        | `\vec{x}`            | High     | Low        | Vector               |
| dot        | `\dot{x}`            | High     | Low        | Time derivative      |
| ddot       | `\ddot{x}`           | Medium   | Low        | Second derivative    |
| bar        | `\bar{x}`            | Medium   | Low        | Mean                 |
| tilde      | `\tilde{x}`          | Low      | Low        |                      |
| stackrel   | `\stackrel{a}{=}`    | Low      | Medium     |                      |
| underset   | `\underset{x}{lim}`  | Medium   | Medium     |                      |
| overset    | `\overset{a}{=}`     | Low      | Medium     |                      |
| binom      | `\binom{n}{k}`       | Medium   | Medium     | Binomial coefficient |
| sum        | `\sum_{i=1}^{n}`     | High     | Medium     | Summation            |
| prod       | `\prod_{i=1}^{n}`    | Medium   | Medium     | Product              |
| int        | `\int_{a}^{b}`       | High     | Medium     | Integral             |
| lim        | `\lim_{x \to a}`     | High     | Medium     | Limit                |

---

## Implementation Priority

### Phase 1 (High Priority)

1. Greek: `\delta`, `\epsilon`, `\lambda`, `\sigma`, `\Delta`, `\Sigma`
2. Symbols: `\partial`, `\nabla`, `\in`, `\pm`, `\approx`
3. Commands: `\vec`, `\dot`, `\sum`, `\int`, `\lim`

### Phase 2 (Medium Priority)

1. Remaining common Greek letters
2. Set theory symbols
3. Matrix environments
4. Cases environment

### Phase 3 (Lower Priority)

1. Remaining Greek letters
2. Decorations (overbrace, etc.)
3. Rare symbols

---

## How to Add Support

To add support for a new feature in mathAST custom syntax:

1. **Update `custom-generator.ts`**:

   - Add to `SUPPORTED_GREEK` or create new symbol set
   - Add conversion logic in the appropriate method

2. **Update `parser/custom/`**:

   - Add tokenization for new syntax
   - Add parsing rules

3. **Update this tracker**:

   - Move feature from "Unsupported" to "Supported"
   - Update the date

4. **Add tests** in `src/lib/mathAST/__tests__/`
