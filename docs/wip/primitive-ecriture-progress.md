# Écriture des primitives (intégration pédagogique) — progression

Branche `fix/primitive-ecriture`, worktree `../ubumaths-wt-primitive`. Le moteur
`pedagogical-integration` est appelé par `correction-generator.ts` : l'élève voit ces corrections.

## Décisions de David (2026-10-11)

1. Coefficients exacts : `\dfrac{1}{2}` et non `0.5` / `0.3333333333333333` (1/u' calculé en fraction).
2. `e^{u}` partout, jamais `\exp(u)`.
3. Étape finale « On simplifie », comme `withTidyStep` des dérivées : l'étape précédente garde le
   résultat brut (la méthode), la dernière l'écrit simplement (`3\dfrac{x^3}{3}` → `x^3`).
4. Étapes « Intégration par parties » et « Choix de u et dv » : l'intégrale seule, plus le faux
   `∫ \ln x\,dx = \ln x`.
5. Forme : `\dfrac{1}{2}e^{2x}`, `\dfrac{1}{2}\ln\lvert 2x+1\rvert` (méthode « k·e^u »).

Hors périmètre (écart à noter) : `\ln\lvert x^2+1\rvert` garde sa valeur absolue alors que x²+1 > 0.

## Attendus (cas de la démo)

| Intégrande          | Aujourd'hui                         | Attendu                            |
| ------------------- | ----------------------------------- | ---------------------------------- |
| `e^{2x}`            | `0.5 \exp(2x)`                      | `\dfrac{1}{2}e^{2x}`               |
| `e^{3x+1}`          | `0.3333333333333333 \exp(3x+1)`     | `\dfrac{1}{3}e^{3x+1}`             |
| `1/(2x+1)`          | `0.5 \ln(\lvert 2x+1\rvert)`        | `\dfrac{1}{2}\ln\lvert 2x+1\rvert` |
| `5e^x`, `2xe^{x^2}` | `5\exp(x)`, `\exp(x^2)`             | `5e^x`, `e^{x^2}`                  |
| `3x^2+2x+1`         | `3\dfrac{x^3}{3}+2\dfrac{x^2}{2}+x` | `x^3+x^2+x`                        |
| `x/4`               | `\dfrac{1}{4}\dfrac{x^2}{2}`        | `\dfrac{x^2}{8}`                   |
| `x\sin x`           | `x(-\cos x)-(-\sin x)`              | `-x\cos x+\sin x`                  |
| `\ln x`             | `\ln(x)\,x - x`                     | `x\ln x - x`                       |
| `3\sin x+2\cos x`   | `3(-\cos x)+2\sin x`                | `-3\cos x+2\sin x`                 |

## Fait

- [ ] Tests vus rouges
- [ ] Implémentation
- [ ] Doc, code-reviewer, PR
