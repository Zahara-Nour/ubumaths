# Lot mathast-b : 13 points (34 sous-points)

Sondes : chemin de l'Atelier (`runInput` avec `new Atelier()` et `new WebReplEngine()`, session neuve par saisie), plus quelques appels directs au moteur (`solve` avec `variable: 'x'`, `tidy`, `toCustom`, `detectSymmetry`) quand le point porte sur une fonction. Sonde jetable `tests/ecarts/_sonde-mathast-b.test.ts`, lancée par `ECARTS_PREUVES=1 pnpm vitest run --project ecarts …`, supprimée. Aucun point du lot n'est au registre (ni ouvert, ni barré) : aucun DOUBLON.

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     28 |
| CORRIGÉ      |      4 |
| FAUX         |      0 |
| PAS UN ÉCART |      0 |
| NON VÉRIFIÉ  |      2 |

## Points

### mathast/README.md:1878 [V] — VRAI (valeur fausse confirmée)

- **Point** : `x² − ab = 0` rend `±√a·√b` si `4ab ≥ 0`, faux pour a, b < 0 (il faut `√(ab)`).
- **Vu** : saisie `.résoudre x^2-ab=0` (et `x^2-a b=0`, même réponse) →
  `S = \left\{ \sqrt{a} \sqrt{b} \,;\, -\sqrt{a} \sqrt{b} \right\} \quad \text{si } 4 a b \geqslant 0`.
  Texte rendu : `Equation quadratique: x^2-ab = 0 / On identifie les coefficients: a = 1, b = 0, c = -ab / … / S = {sqrt(a)sqrt(b) ; -sqrt(a)sqrt(b)}, si 4ab>=0`.
  Au degré 3, `.résoudre x(x^2-ab)=0` → `S = \left\{ 0 \,;\, \sqrt{a} \sqrt{b} \text{ si } 4 a b \geqslant 0 \,;\, -\sqrt{a} \sqrt{b} \text{ si } 4 a b \geqslant 0 \right\}`.
  Moteur (`solve(x^2-ab=0, {variable:'x'})`) : mêmes solutions `\sqrt{a} \sqrt{b}` / `-\sqrt{a} \sqrt{b}`, condition `4 a b \geqslant 0`, étape `x = \dfrac{-0 + \sqrt{4 a b}}{2 \times 1}` → `\sqrt{a} \sqrt{b}` (c'est le découpage `√(4ab) = 2√a√b` qui est faux hors a, b ⩾ 0).
  Pour a = b = −1 la condition 4ab ⩾ 0 est vraie et √a, √b n'existent pas dans ℝ : la réponse affichée est fausse. Avec des valeurs données (session `a = -1`, `b = -1`, puis `.résoudre x^2-ab=0`), la réponse est juste : `S = \left\{ -1 \,;\, 1 \right\}` ; l'écart ne touche que la réponse littérale.
- **Registre** : V · mathAST · `.résoudre x² − ab = 0` répond « √a √b et −√a √b si 4ab ⩾ 0 », faux quand a et b sont tous deux négatifs (il faut ±√(ab)) · preuve : test à écrire, `run('.résoudre x^2-ab=0')` ne contient pas `\sqrt{a} \sqrt{b}` et contient `\sqrt{a b}` (ou une condition ab ⩾ 0 avec √(ab)).

### mathast/README.md:1879 [V] — découpé

#### a. `ax² − 1 = 0` → condition `a ≥ 0` au lieu de `a > 0` — VRAI (latent, lettre L)

- **Vu** : dans l'Atelier, `.résoudre ax^2-1=0` et `.résoudre x(ax^2-1)=0` sont refusés honnêtement : « Le résultat dépend de a : donne-lui une valeur (a = 2) pour l'étudier. » Le moteur, lui (`solve(ax^2-1=0, {variable:'x'})`), rend `\dfrac{\sqrt{a}}{a}` et `\dfrac{-\sqrt{a}}{a}` sous la condition `a \geqslant 0` (division par a = 0 permise par la condition). Même chose pour `x(ax^2-1)=0`.
- **Registre** : L · mathAST · rien de visible dans l'Atelier (qui refuse), mais le moteur résout ax² − 1 = 0 sous la condition a ⩾ 0 alors que a = 0 divise par zéro (a > 0 attendu) · preuve : test à écrire, `solve(ax^2-1=0, {variable:'x'})` porte la condition `a > 0`.

#### b. Conditions non réduites (`4α ≥ 0`, `4a + 4b ≥ 0`) — VRAI

- **Vu** : `.résoudre x^2-4\alpha=0` → `S = \left\{ 2 \sqrt{\alpha} \,;\, -2 \sqrt{\alpha} \right\} \quad \text{si } 16 \alpha \geqslant 0`, alors que `.résoudre x^2-4a=0` → `\text{si } a \geqslant 0` (la lettre grecque n'est pas réduite). `4ab ⩾ 0` non réduit (point 1878). Moteur : `x^2-a-b=0` → condition `4 a + 4 b \geqslant 0`, racines `\dfrac{1}{2} \sqrt{4 a + 4 b}`.
- **Registre** : V · mathAST · la condition d'une équation du second degré à paramètre n'est pas réduite (x² − 4α = 0 répond « si 16α ⩾ 0 », alors que x² − 4a = 0 répond « si a ⩾ 0 ») · preuve : test à écrire, `run('.résoudre x^2-4\\alpha=0')` contient `\alpha \geqslant 0` et pas `16`.

#### c. Racines peu lisibles (`½√(−4a)`) — VRAI

- **Vu** : `.résoudre x^2+a=0` → `S = \left\{ \dfrac{\sqrt{-4 a}}{2} \,;\, -\dfrac{\sqrt{-4 a}}{2} \right\} \quad \text{si } a \leqslant 0` (√(−a) attendu).
- **Registre** : V · mathAST · x² + a = 0 répond √(−4a)/2 au lieu de √(−a) · preuve : test à écrire, `run('.résoudre x^2+a=0')` contient `\sqrt{-a}` et pas `-4 a`.

#### d. Condition réduite à un point écrite `0 ≤ a ≤ 0` — VRAI

- **Vu** : `.résoudre x^3+a^2x=0` → `S = \left\{ 0 \,;\, \dfrac{\sqrt{-4 a^2}}{2} \text{ si } 0 \leqslant a \leqslant 0 \,;\, -\dfrac{\sqrt{-4 a^2}}{2} \text{ si } 0 \leqslant a \leqslant 0 \right\}`.
- **Registre** : V · mathAST · x³ + a²x = 0 répond « 0 ; √(−4a²)/2 si 0 ⩽ a ⩽ 0 ; … » au lieu de S = {0} (la condition est a = 0, et les deux racines valent alors 0) · preuve : test à écrire, `run('.résoudre x^3+a^2x=0')` ne contient pas `0 \leqslant a \leqslant 0`.

#### e. Étapes détaillées en double — NON VÉRIFIÉ

- **Vu** : dans la sortie texte de l'Atelier, les étapes ne paraissent qu'une fois (`Equation quadratique / On identifie les coefficients / On calcule le discriminant / S = …`). Les étapes du moteur (`solve(...).steps`) n'ont pas été lues en entier. Il faut regarder le « Comment ? » de `.résoudre x^2-ab=0` dans l'Atelier, à l'écran, pour conclure.

#### f. Coefficient « a » homonyme du paramètre — VRAI

- **Vu** : texte rendu de `.résoudre x^2-ab=0` : « On identifie les coefficients: a = 1, b = 0, c = -ab » (et `x^2-4a=0` : « a = 1, b = 0, c = -4a ») : « a = 1 » alors que a est le paramètre.
- **Registre** : V · mathAST · dans les étapes de x² − ab = 0, « a = 1, b = 0, c = −ab » réutilise les lettres a et b du paramètre · preuve : test à écrire, la sortie de `run('.résoudre x^2-ab=0')` ne contient pas `a = 1`.

### mathast/README.md:1876 [V] — VRAI

- **Point** : `toCustom` écrit `(1/2)^xe^x`, illisible.
- **Vu** : `toCustom(parseLatex('\left(\frac{1}{2}\right)^x e^x'))` → `(1/2)^xe^x` ; dans l'Atelier, `.simplifier (1/2)^x e^x` affiche en texte `Simplified: (1/2)^xe^x / Custom: (1/2)^xe^x` (le LaTeX, lui, est juste : `\left( \dfrac{1}{2} \right)^x \exponentialE^x`). Visible là où l'Atelier écrit en syntaxe maison (texte de sortie, conditions des intégrales).
- **Registre** : V · mathAST · l'écriture texte de (1/2)ˣ·eˣ est « (1/2)^xe^x », qui se relit comme (1/2) puissance « xe^x » · preuve : test à écrire, `parseCustom(toCustom(t))` rend un arbre égal à `t` pour `t = (1/2)^x e^x` (ou le texte contient un séparateur après l'exposant).

### mathast/README.md:1940 [V] — découpé

Les conditions s'affichent sur une intégrale bornée (`.intégrer … de 0 à 1`), pas sur un calcul seul ni sur `.domaine`.

#### a. Doublons d'écritures entre la saisie et la réponse — VRAI

- **Vu** :
  - `.intégrer \sqrt{a-1.5} x de 0 à 1` → `\dfrac{\sqrt{a - \dfrac{3}{2}}}{2} \quad (a - \dfrac{3}{2} \geqslant 0,\ a \geqslant 1{,}5)` ;
  - `.intégrer \sqrt{a+(-2)} x de 0 à 1` → `(a \geqslant 2,\ a + \left( -2 \right) \geqslant 0)` ;
  - `.intégrer \ln(a^3) x de 0 à 1` → `(a > 0,\ a^3 > 0)` ;
  - `.intégrer \frac{x}{\sqrt{a^2}} de 0 à 1` → `(a \neq 0,\ a^2 \neq 0)` ;
  - `.intégrer \frac{x}{2a-2} de 0 à 1` → `\dfrac{1}{4 a - 4} \quad (4 a - 4 \neq 0,\ 2 a - 2 \neq 0)` (le « 2a − 2 ≠ 0 non réduit » antérieur, doublé).
- **Registre** : V · mathAST · une intégrale à paramètre écrit deux fois la même condition sous deux formes, « (a − 3/2 ⩾ 0, a ⩾ 1,5) » pour √(a − 1,5) · preuve : test à écrire, `run('.intégrer \\sqrt{a-1.5} x de 0 à 1')` ne porte qu'une condition (`a \geqslant`).

#### b. « a > −0 » — VRAI

- **Vu** : `.intégrer \ln(a+0) x de 0 à 1` → `\dfrac{\ln\left( a \right)}{2} \quad (a > 0,\ a > -0)`.
- **Registre** : V · mathAST · ln(a + 0) de 0 à 1 affiche la condition « a > −0 » (en plus de « a > 0 ») · preuve : test à écrire, la réponse ne contient pas `-0`.

#### c. Contradictions affichées telles quelles — VRAI

- **Vu** : `.intégrer \ln(a-3)\ln(3-a) x de 0 à 1` → `\dfrac{\ln\left( 3 - a \right) \ln\left( a - 3 \right)}{2} \quad (a < 3,\ a > 3)` : une valeur est donnée sous des conditions qui ne sont jamais vraies ensemble (`.domaine \ln(a-3)\ln(3-a)` dit bien `D = \emptyset`).
- **Registre** : V · mathAST · ∫₀¹ ln(a − 3) ln(3 − a) x dx rend une valeur « pour a < 3, a > 3 » au lieu de dire qu'elle n'existe pour aucun a · preuve : test à écrire, la réponse est un refus ou « aucune valeur de a ».

#### d. `1/ln(a)` garde « ln(a) ≠ 0 » brut — VRAI

- **Vu** : `.intégrer \frac{x}{\ln(a)} de 0 à 1` → `\dfrac{1}{2 \ln\left( a \right)} \quad (a > 0,\ \ln\left( a \right) \neq 0)` (Q4 de David, laissé exprès : « a > 0, a ≠ 1 » possible).
- **Registre** : V · mathAST · ∫₀¹ x/ln(a) dx garde la condition « ln(a) ≠ 0 » au lieu de « a ≠ 1 » · preuve : test à écrire, la réponse contient `a \neq 1`. (Laissé par décision Q4 : à présenter à David plutôt qu'à corriger.)

#### e. `.intégrer e^{√a x} de 0 à 1` non réduit — CORRIGÉ (dans la réponse affichée)

- **Vu** : LaTeX rendu `\dfrac{\sqrt{a} \exponentialE^{\sqrt{a}} - \sqrt{a}}{a} \quad (a > 0)` (réduit). Seule la ligne texte garde l'ancienne forme : `{-sqrt(a)e^{sqrt(a)*0}+sqrt(a)e^{sqrt(a)*1}}/a`. La doc est périmée sur ce point.

### mathast/README.md:1871 [L] — découpé

#### a. `(a+b)(a−b)/((a−b)(a+b))` rend `(a+b)·1/(a+b)` — CORRIGÉ

- **Vu** : `.factoriser \frac{(a+b)(a-b)}{(a-b)(a+b)}` → « n'est pas une somme : il n'y a rien à factoriser », avec la proposition « Simplifier pour a−b ≠ 0 et a+b ≠ 0 » → `1`. `.simplifier` du même : même proposition `1, pour a − b ≠ 0 et a + b ≠ 0`.

#### b. Facteurs opposés non reconnus (`(x²−1)/(1−x)` reste) — VRAI

- **Vu** : `.factoriser \frac{x^2-1}{1-x}` → `\dfrac{\left( x - 1 \right) \left( x + 1 \right)}{1 - x}`, et avec « avec x ≠ 1 » : même réponse, note « « x \neq 1 » ne change rien ici ». En revanche `.simplifier \frac{x^2-1}{1-x}` propose `-x - 1, pour x ≠ 1` : seul `factoriser` ne voit pas que x − 1 et 1 − x sont opposés.
- **Registre** : V (lettre corrigée : visible dans l'Atelier) · mathAST · `.factoriser (x² − 1)/(1 − x)` s'arrête sur (x − 1)(x + 1)/(1 − x) sans voir les facteurs opposés, même « avec x ≠ 1 » (`.simplifier` trouve −x − 1) · preuve : test à écrire, `run('.factoriser \\frac{x^2-1}{1-x} avec x \\neq 1')` contient `-x - 1` ou `-(x + 1)`.

#### c. `MAX_FRACTIONS = 8` coupe en silence — VRAI

- **Vu** : `src/lib/mathAST/pedagogical-simplify/reduce-steps.ts:95` `const MAX_FRACTIONS = 8;` et `:375` `for (let i = 0; i < MAX_FRACTIONS; i++)` : la boucle sort sans rien signaler quand elle atteint 8.
- **Registre** : L · mathAST · aucun effet visible courant, une expression de plus de 8 fractions simplifiables s'arrête en route sans le dire · preuve : test à écrire, 9 fractions simplifiables dans une somme sont toutes simplifiées (ou un signal est rendu).

### mathast/README.md:1873 [L] — VRAI

- **Point** : `reduceFractionOfSums` ignore `domain` : `(2x−2)/(x−1)` reste.
- **Vu** : `tidy(parse('(2x-2)/(x-1)'), { domain: [x-1] })` → `\dfrac{2 \left( x - 1 \right)}{x - 1}` (identique à `tidy` sans domaine). `src/lib/mathAST/tidy/collect.ts:1218` : `reduceFractionOfSums(term, settings, watch)` ne lit ni `settings.nonZero` ni `settings.positive` (le commentaire 1211-1213 dit exprès qu'il reste des deux côtés). Dans l'Atelier, l'écart ne se voit pas : `.simplifier \frac{2x-2}{x-1} avec x \neq 1` → `2`, et sans « avec », la proposition « Simplifier pour x ≠ 1 » → `2` (autre chemin).
- **Registre** : L · mathAST · aucun effet visible dans l'Atelier, mais `tidy` avec un domaine acquis (x − 1 ≠ 0) laisse 2(x − 1)/(x − 1) · preuve : test à écrire, `tidy(parseLatex('\\frac{2x-2}{x-1}'), { domain: [parseLatex('x-1')] })` rend `2`.

### mathast/README.md:1905 [L] — découpé

#### a. `shiftedLinearRoot` fabrique un nœud `opposite` à la main — VRAI

- **Vu** : `src/lib/mathAST/domain/compute.ts:1173` `return { root: negative ? { type: 'opposite', operand: body } : body, slope };` (hors `factory.ts`, invariant 2).
- **Registre** : L · mathAST · aucun effet visible, le calcul de domaine écrit un opposé à la main au lieu de passer par la fabrique · preuve : commande `test -f src/lib/mathAST/domain/compute.ts && ! grep -q "{ type: 'opposite'" src/lib/mathAST/domain/compute.ts` (code de sortie relevé : 1).

#### b. Inversion de `ln u ⊳ c` sans u non affine ni `log` avec c ≠ 0 — VRAI (refus honnête)

- **Vu** : `.domaine \frac{1}{\ln(x^2)-1}` → refus « Je ne sais pas encore déterminer ce domaine. » ; `.domaine \frac{1}{\log(x)-1}` → même refus ; contrôle : `.domaine \frac{1}{\ln(x)-1}` → `D = ]0 ; +\infty[ \setminus \left\{\exponentialE\right\}`.
- **Registre** : L · mathAST · le domaine de 1/(ln(x²) − 1) et de 1/(log x − 1) est refusé (pas faux) · preuve : test à écrire, `run('.domaine \\frac{1}{\\log(x)-1}')` rend `]0 ; +\infty[ \setminus \{10\}`.

### mathast/README.md:1912 [L] — VRAI

- **Point** : `evaluateNumeric` n'évalue ni π ni e (`null`) ; le moteur compte sur cette lacune pour garder l'exact.
- **Vu** : `src/lib/mathAST/common/numeric.ts:304-390` : `evaluateAtRaw` n'a pas de cas `constant` (cas `number`, `variable`, opérations, `function`, puis `default`) : π et e rendent `null`. Effet attendu toujours là : `.limite (x+1)/(\pi x) en +inf` → `= \dfrac{1}{\pi}` (exact), `.limite (x+1)/(e x) en +inf` → `= \dfrac{1}{\exponentialE}`.
- **Registre** : L · mathAST · aucun effet visible, le calcul de limites garde la valeur exacte (1/π) parce que son évaluateur flottant ne sait pas lire π, pas par un choix écrit · preuve : à la main (refonte de conception : rendre « exact ou numérique » explicite ; une commande qui grepperait un cas `constant` passerait au vert sur le mauvais correctif).

### mathast/README.md:1923 [L] — VRAI (refus, pas de valeur fausse)

- **Vu** : toutes refusées par « Je ne sais pas calculer cette limite. » : `.limite (1-\cos x)^{-1/2} en 0`, `.limite x^{-1}\sin x en 0`, `.limite (1-x)^{-1}\ln x en 1`, `.limite x^2(\cos x-1)^{-1} en 0`, `.limite x^3e^{-x^2+x} en +inf`, `.limite x^2e^{-\sqrt{x}} en +inf`, `.limite x^{\frac{4}{2}} en -inf`. Contrôle : `.limite \frac{\ln x}{1-x} en 1` → `= -1`.
- **Registre** : L · mathAST · plusieurs limites de Terminale sont refusées (pas fausses) : x⁻¹ sin x en 0, x³e^(−x²+x) et x²e^(−√x) en +∞, x^(4/2) en −∞ · preuve : test à écrire, `run('.limite x^{-1}\\sin x en 0')` rend 1 (et une ligne par cas).

### mathast/README.md:1927 [L] — CORRIGÉ

- **Point** : `x²/(x sin(1/x))` en 0⁺ rendu « ≈ 0 ».
- **Vu** : `.limite \frac{x^2}{x\sin\frac1x} en 0+` → refus « Je ne sais pas calculer cette limite. » (pas de « ≈ 0 »). La fonction vaut x/sin(1/x), non bornée près de 0 : le refus est juste. La doc est périmée.

### mathast/README.md:1874 [M] — VRAI

- **Point** : `detectSymmetry` conclut « aucune, prouvé » pour `∛x`, `x^{1/3}`, `x^{2/3}`, `ln(x+√(x²+1))`, sans appelant en production.
- **Vu** : `detectSymmetry(parseLatex(l), 'x')` → `{"symmetry":"none","confidence":"proven","reason":"f(-x) ≠ f(x) and f(-x) ≠ -f(x)"}` pour les quatre (∛x et x^{1/3} sont impaires, x^{2/3} paire, ln(x+√(x²+1)) impaire). Contrôle : `x^3` → `odd`, `proven`. Appelants : `grep -rln detectSymmetry src tests scripts` ne trouve que `analysis/symmetry.ts`, `analysis/index.ts`, `index.ts` (réexports) et `analysis/__tests__/symmetry.test.ts`.
- **Registre** : M · mathAST · aucun effet visible, une fonction de parité sans appelant affirme « prouvé : ni paire ni impaire » pour ∛x, x^(1/3), x^(2/3) et ln(x + √(x² + 1)) · preuve : commande `test -d src/lib/mathAST/analysis && ! grep -rq "export function detectSymmetry" src/lib/mathAST/analysis` (code de sortie relevé : 1 ; vert si la fonction morte est retirée ; si on préfère la corriger : test à écrire, `detectSymmetry(x^{1/3})` ne rend pas `none` + `proven`).

### mathast/README.md:1884 [D] — découpé (état décrit vrai, sauf d)

Saisies dans l'Atelier, titres d'étapes relevés :

- **a. x à droite — VRAI** : `.résoudre 4<2(x-1)` → « On divise les deux membres par $2$ » (`2 < x - 1`), « On soustrait $x$ aux deux membres » (`-x + 2 < -1`), « On soustrait $2$ … » (`-x < -3`), « On divise les deux membres par $-1$ (changement de sens…) » (`x > 3`), `S = ]3 ; +\infty[`.
- **b. « On multiplie par 1,5 » — VRAI** : `.résoudre \frac{2}{3}x=0,5` → « On multiplie les deux membres par $1{,}5$ » (`x = 0{,}75`).
- **c. « On divise par 1/6 » — VRAI** : `.résoudre 0,5x=\frac{x}{3}+1` → « On soustrait $\dfrac{1}{3}x$ … » (`\dfrac{1}{6}x = 1`), « On divise les deux membres par $\dfrac{1}{6}$ ».
- **d. Correction de question `-0,25(x−2) ≥ 1` → « divise par −1/4 » — NON VÉRIFIÉ** : l'Atelier dit bien « On divise les deux membres par $-0{,}25$ » ; la correction d'une question (générateur de corrections, sans `stepsAsShown`) n'a pas été sondée : il faut une question publiée de ce type, ou le générateur de corrections appelé sur cette inéquation.
- **e. Pipeline rationnel qui multiplie la fraction — VRAI** : `.résoudre \frac{x-0,5}{x+1}>0` → « On reconnaît la forme P(x) / Q(x) » : `P(x) = 2x - 1, \quad Q(x) = 2x + 2`.
- **f. `(x−1)/(x²−1) ≥ 0` raisonne sur la fraction simplifiée — VRAI** : `P(x) = 1, \quad Q(x) = x + 1`, « Domaine de définition » `D = \mathbb{R} \setminus \{-1\}`, tableau sans 1, puis `S = ]-1 ; 1[ \cup ]1 ; +\infty[` : la réponse est juste, mais le 1 exclu n'apparaît dans aucune étape (le domaine affiché l'oublie même).
- **g. `x² < −1` sans étapes — VRAI** : `.résoudre x^2<-1` → `S = \emptyset`, aucune étape.
- **Question à David** : « Quand l'Atelier résout une équation ou une inéquation, il garde parfois une écriture qu'un prof n'écrirait pas. Par exemple, pour 4 < 2(x − 1), il obtient 2 < x − 1, puis enlève x des deux côtés et divise par −1, au lieu d'écrire x − 1 > 2. Pour (2/3)x = 0,5, il dit « on multiplie par 1,5 » au lieu de « par 3/2 ». Pour (x − 0,5)/(x + 1) > 0, il annonce P(x) = 2x − 1 alors que l'élève a tapé x − 0,5. Que veux-tu ? » Réponses possibles : (1) tout reprendre comme un prof l'écrirait (échanger les membres, fraction pour une fraction tapée, garder ce que l'élève a tapé) ; (2) seulement les cas qui peuvent troubler l'élève (le 1 interdit qui disparaît des étapes de (x − 1)/(x² − 1), P(x) qui ne ressemble pas à ce qui est tapé) ; (3) laisser tel quel, les réponses sont justes.

### mathast/README.md:1928 [D] — découpé

- **a. Paramètre de signe inconnu refusé — VRAI** : `.limite e^{kx} en +inf` → « Je ne sais pas calculer cette limite : elle peut dépendre du signe de k. »
- **b. Substitution directe qui suppose k ≠ 0 / k > 0 — VRAI** : `.limite \frac{1}{x^2+k} en 0` → `= \dfrac{1}{k}` (faux pour k = 0 : +∞) ; `.limite \ln(x+k) en 0+` → `= \ln\left( k \right)` (n'existe pas pour k ⩽ 0, vaut −∞ pour k = 0).
- **c. `x/(kx+x²)` en 0⁺ → 1/k — CORRIGÉ** : `.limite \frac{x}{kx+x^2} en 0+` est maintenant refusé (« elle peut dépendre du signe de k »).
- **d. Refus à rattraper qui valent la même chose pour tout k — VRAI** : `.limite x^2+kx en 0+`, `.limite x\ln x+kx en 0+`, `.limite \frac{k^2+1}{x} en 0+` → tous refusés « elle peut dépendre du signe de k » (réponses 0, 0, +∞ pour tout k).
- **Registre** (pour b, la seule réponse qui peut être fausse aujourd'hui) : V · mathAST · `.limite 1/(x² + k) en 0` répond 1/k et `.limite ln(x + k) en 0+` répond ln k sans dire « pour k ≠ 0 » ou « pour k > 0 » · preuve : test à écrire, la réponse porte une condition sur k ou est refusée.
- **Question à David** : « Quand une limite contient une lettre comme k, l'Atelier refuse si le résultat dépend du signe de k (e^{kx} en +∞). Mais il répond 1/k pour 1/(x² + k) en 0 sans dire que c'est faux si k = 0, et il refuse x² + kx en 0, qui vaut 0 quel que soit k. Que veux-tu ? » Réponses possibles : (1) ajouter la condition (« 1/k, pour k ≠ 0 ») et accepter les cas qui ne dépendent pas de k, sans discussion de signe ; (2) faire tout de suite la discussion selon le signe de k (choix C, prévu « plus tard ») ; (3) refuser aussi 1/(x² + k) et ln(x + k), en attendant C.

## Vu en passant

- L'Atelier ne lit pas `.résoudre x^2-a-b=0` ni `.résoudre x^2=a+b` : « Je n'ai pas su lire cette expression : vérifie les parenthèses et les signes », alors que `x^2-ab=0` se lit et que le moteur (`solve`) résout `x^2-a-b=0`.
- `.limite (x+1)/(\pi x) en +inf` écrit l'énoncé `\lim\limits_{x\to +\infty} \left( x + 1 \right) / \pi x` : la barre en ligne se relit (x + 1)/π × x (comparer avec `(x+1)/(e x)`, écrit en `\dfrac`).
- La ligne texte de `.intégrer e^{\sqrt{a} x} de 0 à 1` garde `e^{sqrt(a)*0}` non réduit, alors que le LaTeX est réduit (point 1940 e).
