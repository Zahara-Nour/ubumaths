/**
 * Test to reproduce and debug the verbatim freeze issue
 *
 * The bug: transpilation freezes when verbatim is combined with certain content,
 * but works when verbatim is alone or when verbatim is removed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transpileLatexToMarkdown } from '../transpiler';
import { tokenize } from '../tokenizer';
import { parseMarkdown } from '../../../parser/markdown-parser';

// Timeout for tests (5 seconds should be enough - if it takes longer, it's frozen)
const TEST_TIMEOUT = 5000;

// Minimal verbatim content
const VERBATIM_ONLY = `\\begin{verbatim}
>>> def suitethe(m):
        t=4
        for n in range(1,m+1):
            t=sqrt(t)+1/n
\\end{verbatim}`;

// Content before verbatim (simplified from Partie 1)
const CONTENT_BEFORE = `\\section*{Problème}

Montrons par récurrence sur $n$ que la propriété $\\mathcal{P}_n$ : « $u_n \\geq 0$ » est vérifiée.

\\textbf{Initialisation :} $u_0 = \\alpha \\geq 0$.

\\textbf{Hérédité :} $u_{n+1} = \\dfrac{1}{n+1} + \\sqrt{u_n} \\geq 0$.

\\bigskip

\\textbf{2.} Soit deux réels tels que $\\alpha \\geq \\beta \\geq 0$.

La fonction racine carrée conserve le sens des inégalités :
\\[
u_n \\geq v_n \\Longrightarrow \\sqrt{u_n} \\geq \\sqrt{v_n}
\\]`;

// Combined content
const COMBINED = `${CONTENT_BEFORE}

\\subsection*{Partie 2}

\\textbf{6.} Pour tout réel $x$ positif : $1 + \\dfrac{x}{2} - \\dfrac{x^2}{8} \\leq \\sqrt{1+x} \\leq 1 + \\dfrac{x}{2}$.

Un algorithme \\texttt{suitethe()} :

${VERBATIM_ONLY}

Montrons que $1 + \\dfrac{2}{n} \\leq t_n \\leq 1 + \\dfrac{3}{n}$.`;

describe('Verbatim freeze debugging', () => {
	// Add timeout to detect freezes
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should tokenize verbatim only quickly', { timeout: TEST_TIMEOUT }, () => {
		const start = performance.now();
		const tokens = tokenize(VERBATIM_ONLY);
		const elapsed = performance.now() - start;

		expect(tokens.length).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(1000);
		console.log(`Verbatim only: ${tokens.length} tokens in ${elapsed.toFixed(2)}ms`);
	});

	it('should tokenize content before quickly', { timeout: TEST_TIMEOUT }, () => {
		const start = performance.now();
		const tokens = tokenize(CONTENT_BEFORE);
		const elapsed = performance.now() - start;

		expect(tokens.length).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(1000);
		console.log(`Content before: ${tokens.length} tokens in ${elapsed.toFixed(2)}ms`);
	});

	it('should tokenize combined content quickly', { timeout: TEST_TIMEOUT }, () => {
		const start = performance.now();
		const tokens = tokenize(COMBINED);
		const elapsed = performance.now() - start;

		expect(tokens.length).toBeGreaterThan(0);
		expect(elapsed).toBeLessThan(1000);
		console.log(`Combined: ${tokens.length} tokens in ${elapsed.toFixed(2)}ms`);
	});

	it('should transpile verbatim only quickly', { timeout: TEST_TIMEOUT }, () => {
		const start = performance.now();
		const result = transpileLatexToMarkdown(VERBATIM_ONLY);
		const elapsed = performance.now() - start;

		expect(result.markdown).toBeTruthy();
		expect(elapsed).toBeLessThan(2000);
		console.log(`Transpile verbatim: ${elapsed.toFixed(2)}ms, ${result.warnings.length} warnings`);
	});

	it('should transpile content before quickly', { timeout: TEST_TIMEOUT }, () => {
		const start = performance.now();
		const result = transpileLatexToMarkdown(CONTENT_BEFORE);
		const elapsed = performance.now() - start;

		expect(result.markdown).toBeTruthy();
		expect(elapsed).toBeLessThan(2000);
		console.log(
			`Transpile content before: ${elapsed.toFixed(2)}ms, ${result.warnings.length} warnings`
		);
	});

	it('should transpile combined content quickly', { timeout: TEST_TIMEOUT }, () => {
		const start = performance.now();
		const result = transpileLatexToMarkdown(COMBINED);
		const elapsed = performance.now() - start;

		expect(result.markdown).toBeTruthy();
		expect(elapsed).toBeLessThan(2000);
		console.log(`Transpile combined: ${elapsed.toFixed(2)}ms, ${result.warnings.length} warnings`);
	});
});

// Full content that triggers the freeze (EXACT user input - second message)
const FULL_PROBLEMATIC_INPUT = String.raw`\section*{Problème 1 : Étude d'une suite}

\subsection*{Partie 1 : Généralités}

\textbf{1.} Il s'agit dans cette question de justifier la légitimité de la construction par récurrence de la suite « associée à $\alpha$ ». En effet, un terme de la suite n'admet un successeur que s'il est positif.

Montrons par récurrence sur $n$ que la propriété $\mathcal{P}_n$ : « $u_n \geq 0$ » est vérifiée pour tout $n \in \mathbb{N}$ :

\textbf{Initialisation :} $u_0 = \alpha \geq 0$ par hypothèse, $\mathcal{P}_0$ est vérifiée.

\textbf{Hérédité :} Supposons que, pour un certain entier naturel $n$, la propriété $\mathcal{P}_n$ : « $u_n \geq 0$ » soit vérifiée. Alors, puisque la fonction racine carrée est définie sur $\mathbb{R}^+$ et prend ses valeurs dans ce même ensemble, le nombre $\sqrt{u_n}$ existe et est supérieur ou égal à 0.

Il en résulte que : $u_{n+1} = \dfrac{1}{n+1} + \sqrt{u_n} \geq 0$ (car somme de deux nombres positifs).

Si $\mathcal{P}_n$ est vérifiée, alors $\mathcal{P}_{n+1}$ l'est aussi, la propriété $\mathcal{P}_n$ est héréditaire.

Étant initialisée au rang 0 et héréditaire, cette propriété $\mathcal{P}_n$ est vérifiée pour tout entier $n \geq 0$.

Tous les termes de la suite associée à $\alpha$ sont définis et positifs.

\bigskip

\textbf{2.} Soit deux réels tels que $\alpha \geq \beta \geq 0$ et les suites $(u_n)$ et $(v_n)$ qui leur sont respectivement associées. La positivité des nombres $\alpha$ et $\beta$ garantit l'existence de ces suites de nombres positifs. Montrons par récurrence sur $n$ que la propriété $\mathcal{P}_n$ : « $u_n \geq v_n$ » est vérifiée pour tout $n \in \mathbb{N}$ :

\textbf{Initialisation :} $u_0 = \alpha \geq \beta = v_0$ par hypothèse, $\mathcal{P}_0$ est vérifiée.

\textbf{Hérédité :} Supposons que, pour un certain entier naturel $n$, la propriété $\mathcal{P}_n$ : « $u_n \geq v_n$ » soit vérifiée. La fonction racine carrée étant une fonction croissante sur $\mathbb{R}^+$, elle conserve le sens des inégalités :
\[
u_n \geq v_n \Longrightarrow \sqrt{u_n} \geq \sqrt{v_n}
\]
et en conséquence : $u_{n+1} = \dfrac{1}{n+1} + \sqrt{u_n} \geq \dfrac{1}{n+1} + \sqrt{v_n} = v_{n+1}$.

Si $\mathcal{P}_n$ est vérifiée, alors $\mathcal{P}_{n+1}$ l'est aussi, la propriété $\mathcal{P}_n$ est héréditaire.

Étant initialisée au rang 0 et héréditaire, cette propriété $\mathcal{P}_n$ est vérifiée pour tout entier $n \geq 0$.

Pour tout entier naturel $n$ : $u_n \geq v_n$.

\bigskip

\textbf{3.} Soit $(v_n)$ la suite associée à 0. Montrons par récurrence sur $n$ que la propriété $\mathcal{P}_n$ : « $v_n \geq 1$ » est vérifiée pour tout entier strictement positif $n$ :

\textbf{Initialisation :} $v_1 = \dfrac{1}{0+1} + \sqrt{0} = 1$ ce qui montre que $\mathcal{P}_1$ est vérifiée.

\textbf{Hérédité :} Supposons que, pour un certain entier strictement positif $n$, la propriété $\mathcal{P}_n$ : « $v_n \geq 1$ » soit vérifiée. La fonction racine carrée étant une fonction croissante sur $\mathbb{R}^+$, elle conserve le sens des inégalités : $v_n \geq 1 \Longrightarrow \sqrt{v_n} \geq \sqrt{1} = 1$ et en conséquence : $v_{n+1} = \dfrac{1}{n+1} + \sqrt{v_n} \geq \dfrac{1}{n+1} + 1 \geq 1$.

Si $\mathcal{P}_n$ est vérifiée, alors $\mathcal{P}_{n+1}$ l'est aussi, la propriété $\mathcal{P}_n$ est héréditaire.

Étant initialisée au rang 1 et héréditaire, cette propriété $\mathcal{P}_n$ est vérifiée pour tout entier $n \geq 1$.

Pour tout entier strictement positif $n$ : $v_n \geq 1$.

\textbf{N.B.} Si les termes de rang $\geq 1$ de la suite associée à 0 sont $\geq 1$, alors d'après la question 2 il en est de même de tous les termes de toute suite $(u_n)$ associée à un réel positif donné $\alpha$ puisqu'une telle suite majore $(v_n)$. Pour tout entier strictement positif $n$ : $u_n \geq v_n \geq 1$.

\bigskip

\textbf{4.} Supposons que la suite $(u_n)$ associée à un réel positif donné $\alpha$ soit convergente vers un réel $\ell$. D'après la remarque de la question précédente : $\ell \geq 1$.

Passons à la limite dans la relation de récurrence, en tenant compte du fait que la limite d'une suite ne dépend pas d'un décalage d'indexation :
\[
\ell = \lim_{n \to \infty} u_{n+1} = \lim_{n \to \infty} \left( \frac{1}{n+1} + \sqrt{u_n} \right) = \lim_{n \to \infty} \left( \frac{1}{n+1} \right) + \lim_{n \to \infty} \left( \sqrt{u_n} \right)
\]

D'une part $\lim_{n \to \infty} \left( \dfrac{1}{n+1} \right) = 0$ et d'autre part, la fonction racine carrée étant continue sur $\mathbb{R}^+$, donc en particulier en $\ell$, $\lim_{n \to \infty}(\sqrt{u_n}) = \sqrt{\lim_{n \to \infty} u_n} = \sqrt{\ell}$.

Il en résulte que le nombre $\ell$ est solution de l'équation $\ell = \sqrt{\ell}$. Cette équation ayant pour solutions 0 et 1, la seule possibilité dans ce contexte est $\ell = 1$.

Si la suite $(u_n)$ associée à un réel positif donné $\alpha$ est convergente, alors elle converge vers 1.

\bigskip

\textbf{5.} Considérons la suite $(u_n)$ associée à un réel positif donné $\alpha$. Étudions les différences de deux termes consécutifs de cette suite, en écrivant à leur propos une relation de récurrence :
\begin{align*}
u_{n+2} - u_{n+1} &= \left( \frac{1}{n+2} + \sqrt{u_{n+1}} \right) - \left( \frac{1}{n+1} + \sqrt{u_n} \right) = -\frac{1}{(n+1)(n+2)} + \left( \sqrt{u_{n+1}} - \sqrt{u_n} \right) \\
u_{n+2} - u_{n+1} &= -\frac{1}{(n+1)(n+2)} + \frac{u_{n+1} - u_n}{\sqrt{u_{n+1}} + \sqrt{u_n}}
\end{align*}

Nous obtenons ainsi une relation liant $u_{n+2} - u_{n+1}$ à $u_{n+1} - u_n$.

Considérons la propriété $\mathcal{P}_n$ : « $u_{n+1} - u_n \leq 0$ » et montrons que cette propriété est héréditaire :

Supposons que, pour un certain entier naturel $n$, la propriété $\mathcal{P}_n$ : « $u_{n+1} - u_n \leq 0$ » soit vérifiée. Alors, nous avons aussi $u_{n+2} - u_{n+1} \leq 0$ car $u_{n+2} - u_{n+1}$ est dans ce cas la somme des deux nombres réels négatifs, $-\dfrac{1}{(n+1)(n+2)}$ et $\dfrac{u_{n+1} - u_n}{\sqrt{u_{n+1}} + \sqrt{u_n}}$.

Si $\mathcal{P}_n$ est vérifiée, alors $\mathcal{P}_{n+1}$ l'est aussi, la propriété $\mathcal{P}_n$ est héréditaire.

Il reste à voir si cette propriété peut être initialisée et, si oui, quel est le lien avec le nombre $\dfrac{3+\sqrt{5}}{2}$.

Remarquons d'abord que $\sqrt{\dfrac{3+\sqrt{5}}{2}} = \dfrac{1+\sqrt{5}}{2}$. (Le lecteur pourra vérifier que $\left( \dfrac{1+\sqrt{5}}{2} \right)^2 = \dfrac{3+\sqrt{5}}{2}$).

Évaluons la différence entre les deux premiers termes de cette suite lorsque son terme initial est $\alpha$ :
\[
u_1 - u_0 = (1 + \sqrt{\alpha}) - \alpha
\]
Cette différence est la valeur en $x = \sqrt{\alpha}$ du trinôme du second degré $T$ défini par : $T(x) = -x^2 + x + 1$.

Or, ce trinôme $T$ a deux racines, $\dfrac{1+\sqrt{5}}{2}$ et $\dfrac{1-\sqrt{5}}{2}$, et se factorise en :
\[
T(x) = -\left( x - \frac{1+\sqrt{5}}{2} \right) \left( x - \frac{1-\sqrt{5}}{2} \right)
\]

Il est strictement négatif quand $x > \dfrac{1+\sqrt{5}}{2}$.

Lorsque $\alpha > \dfrac{3+\sqrt{5}}{2}$, nous avons $\sqrt{\alpha} > \dfrac{1+\sqrt{5}}{2}$ et $u_1 - u_0 = T(\sqrt{\alpha}) < 0$. En conséquence $\mathcal{P}_0$ est vérifiée.

Ainsi, la condition $\alpha > \dfrac{3+\sqrt{5}}{2}$ permet l'initialisation au rang 0 de la propriété $\mathcal{P}_n$ : « $u_{n+1} - u_n \leq 0$ ».

La propriété $\mathcal{P}_n$ est à la fois initialisée au rang 0 et héréditaire. Nous concluons :

Lorsque $\alpha > \dfrac{3+\sqrt{5}}{2}$, la propriété $\mathcal{P}_n$ : « $u_{n+1} - u_n \leq 0$ » est vérifiée pour tout entier naturel $n$, la suite associée à $\alpha$ est alors une suite décroissante.

Une telle suite étant décroissante et minorée par 1 est convergente. Elle converge donc vers 1, seule limite possible.

Considérons maintenant une suite $(u_n)$ associée à un réel $\alpha \leq \dfrac{3+\sqrt{5}}{2}$. D'après la question 2, elle est majorée par n'importe quelle suite associée à un réel $> \dfrac{3+\sqrt{5}}{2}$ (par exemple celle qui est associée à 3).

$(u_n)$ est donc encadrée par la suite constante 1 (d'après la question 3) et par une suite qui converge vers 1. D'après le théorème des gendarmes, elle converge vers 1.

Ainsi, toute suite $(u_n)$ associée à un nombre positif $\alpha$ converge vers 1, que $\alpha > \dfrac{3+\sqrt{5}}{2}$ ou non.

\newpage

\subsection*{Partie 2 : Un cas particulier}

\textbf{6.} N.B. Dans cette question, admettons et utilisons l'encadrement de la fonction $x \mapsto \sqrt{1+x}$ :

Pour tout réel $x$ positif : $1 + \dfrac{x}{2} - \dfrac{x^2}{8} \leq \sqrt{1+x} \leq 1 + \dfrac{x}{2}$.

Un algorithme \texttt{suitethe()} pour avoir une petite idée du comportement des suites étudiées dans cette partie :

\begin{verbatim}
>>> def suitethe(m):
        t=4
        for n in range(1,m+1):
            t=sqrt(t)+1/n
            s=round(n*(t-1),4)
            x=round(1+2/n-t,4)
            y=round(1+3/n-t,4)
            print("n=",n,"t=",round(t,4),"s=",s,"x=",x,"y=",y)

>>> suitethe(10)
n= 1 t= 3.0 s= 2.0 x= 0.0 y= 1.0
n= 2 t= 2.2321 s= 2.4641 x= -0.2321 y= 0.2679
n= 3 t= 1.8273 s= 2.482 x= -0.1607 y= 0.1727
n= 4 t= 1.6018 s= 2.4072 x= -0.1018 y= 0.1482
n= 5 t= 1.4656 s= 2.3281 x= -0.0656 y= 0.1344
n= 6 t= 1.3773 s= 2.2638 x= -0.044 y= 0.1227
n= 7 t= 1.3164 s= 2.2151 x= -0.0307 y= 0.1121
n= 8 t= 1.2724 s= 2.1789 x= -0.0224 y= 0.1026
n= 9 t= 1.2391 s= 2.1519 x= -0.0169 y= 0.0942
n= 10 t= 1.2131 s= 2.1315 x= -0.0131 y= 0.0869
\end{verbatim}`;

describe('Full problematic input', () => {
	it('should transpile full input without freezing', { timeout: TEST_TIMEOUT }, async () => {
		const start = performance.now();

		// Use a promise with timeout to detect freeze
		const result = await Promise.race([
			Promise.resolve(transpileLatexToMarkdown(FULL_PROBLEMATIC_INPUT)),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('Transpilation timed out - likely frozen')), 4000)
			)
		]);

		const elapsed = performance.now() - start;

		expect(result.markdown).toBeTruthy();
		expect(elapsed).toBeLessThan(3000);
		console.log(`Full input: ${elapsed.toFixed(2)}ms, ${result.warnings.length} warnings`);
		console.log('Warnings:', result.warnings);
	});

	it('should print transpiled markdown for debugging', { timeout: TEST_TIMEOUT }, () => {
		// Just transpile and print - don't parse markdown
		const result = transpileLatexToMarkdown(FULL_PROBLEMATIC_INPUT);
		console.log('=== TRANSPILED MARKDOWN ===');
		console.log(result.markdown);
		console.log('=== END MARKDOWN ===');
		console.log('Length:', result.markdown.length);
		expect(result.markdown).toBeTruthy();
	});

	it('should inspect code block area', { timeout: 5000 }, () => {
		const result = transpileLatexToMarkdown(FULL_PROBLEMATIC_INPUT);
		const lines = result.markdown.split('\n');
		console.log(`Total lines: ${lines.length}`);

		// Show lines around code block
		console.log('\n=== Lines 100-128 ===');
		for (let i = 100; i < lines.length; i++) {
			console.log(`${i}: ${JSON.stringify(lines[i])}`);
		}

		// Test different ranges
		console.log('\n=== Parsing tests ===');

		// Lines 0-105 (before code block)
		let chunk = lines.slice(0, 105).join('\n');
		let t0 = performance.now();
		let ast = parseMarkdown(chunk);
		console.log(
			`Lines 0-105: ${(performance.now() - t0).toFixed(0)}ms, ${ast.children.length} nodes`
		);

		// Lines 0-110 (into code block)
		chunk = lines.slice(0, 110).join('\n');
		t0 = performance.now();
		ast = parseMarkdown(chunk);
		console.log(
			`Lines 0-110: ${(performance.now() - t0).toFixed(0)}ms, ${ast.children.length} nodes`
		);

		// Lines 0-120
		chunk = lines.slice(0, 120).join('\n');
		t0 = performance.now();
		ast = parseMarkdown(chunk);
		console.log(
			`Lines 0-120: ${(performance.now() - t0).toFixed(0)}ms, ${ast.children.length} nodes`
		);

		expect(true).toBe(true);
	});
});
