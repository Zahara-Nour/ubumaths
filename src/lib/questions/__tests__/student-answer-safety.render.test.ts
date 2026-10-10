/**
 * Réponse d'élève neutralisée, vérifiée sur la SORTIE réelle de MathLive
 * =====================================================================
 *
 * Audit de la PR #643 : `\style` (alias de `\htmlStyle`) et `\bbox`, puis
 * `\enclose` (qui recopie `mathbackground` / `padding` dans `style=`), laissaient
 * passer du CSS (calque plein écran, image espion) chez le professeur. On rend
 * la réponse neutralisée avec MathLive et on vérifie l'absence de lien, d'URL, de
 * positionnement et d'attribut de données.
 *
 * Liste BLANCHE (lot 2) : le test « corpus » vérifie qu'aucune réponse attendue
 * réelle n'est abîmée, et que tout ce que le clavier MathLive produit est admis.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';
import { convertLatexToMarkup } from 'mathlive/ssr';
import { neutralizeStudentLatex } from '../student-answer-safety';
import { draftTemplate, parseReviewFile } from '$lib/migration/review/review-file';
import { generateInstance } from '../generator/instance-generator';
import { REAL_TEMPLATES } from '$lib/server/validation/__tests__/fixtures/real-templates';
import { parseLatex, toLatex } from '$lib/mathAST';
import { unitWritingToLatex } from '$lib/mathAST/units/display';
import type { QuestionTemplate } from '../types';

function nest(times: number, wrap: (inner: string) => string, seed = 'x'): string {
	let latex = seed;
	for (let i = 0; i < times; i++) latex = wrap(latex);
	return latex;
}

const CHARGES = [
	String.raw`\style{position:fixed;top:0;left:0;width:100vw;height:100vh;background:url(https://evil.example/x.png)}{x}`,
	String.raw`\htmlStyle{position:fixed}{x}`,
	String.raw`\bbox[background:url(https://e.x/b);position:fixed]{x}`,
	String.raw`\textcolor{url(https://e.x)}{x}`,
	String.raw`\colorbox{url(https://e.x)}{x}`,
	String.raw`\href{https://evil.example}{clic}`,
	String.raw`\htmlData{onclick=alert(1)}{x}`,
	String.raw`\rule{999em}{999em}`,
	String.raw`\kern{-999em}x`,
	String.raw`\raisebox{-999em}{x}`,
	String.raw`\enclose{box}[mathbackground="red;position:fixed;background-image:url(https://e.x/spy.png)"]{3}`,
	String.raw`\enclose{box}[padding="999em"]{3}`,
	String.raw`\enclose{box}[mathbackground="red;position:fixed"]{3}`,
	// Un retrait ne doit pas fabriquer une commande en accolant deux morceaux
	String.raw`\text\foo[x]color{url(https://e.x)}{x}`,
	String.raw`\mathrm\x[y]bbox[position:fixed]{x}`,
	// Vecteur en colonne : option d'espacement derrière un blanc, lignes en masse (audit 2026-10-04)
	'\\begin{pmatrix}1\\\\\t[999em]2\\end{pmatrix}',
	'\\begin{pmatrix}1\\\\\u00a0[999em]2\\end{pmatrix}',
	`\\begin{pmatrix}${'\\\\'.repeat(1000)}\\end{pmatrix}`,
	// Rendu géant avec des commandes ADMISES (2026-10-05) : taille doublée à chaque `\left`
	nest(13, (s) => String.raw`\left(\dfrac{${s}}{1}\right)`),
	nest(20, (s) => String.raw`\left(\frac{${s}}{1}\right)`),
	nest(13, (s) => String.raw`\left(\dfrac1${s}\right)`),
	nest(50, (s) => String.raw`\binom{${s}}{1}`),
	`${'\\sqrt'.repeat(300)}x`,
	nest(8, (s) => String.raw`\begin{pmatrix}${s}\\1\\2\end{pmatrix}`),
	// Matrices (case « matrice », 2026-10-05) : six lignes au plus pour toute la formule
	nest(6, (s) => String.raw`\begin{pmatrix}${s}\\1\\1\\1\\1\\1\end{pmatrix}`),
	nest(3, (s) => String.raw`\begin{pmatrix}${s}&${s}\\${s}&${s}\\${s}&${s}\end{pmatrix}`),
	// 6 × 6 de fractions : sous la borne de longueur, rendu complet
	`\\begin{pmatrix}${Array.from({ length: 6 }, () => Array(6).fill('\\dfrac{\\sqrt{2}}{3}').join('&')).join('\\\\')}\\end{pmatrix}`,
	`\\begin{pmatrix}${'1&'.repeat(450)}1\\end{pmatrix}`,
	'1&2&3\\\\4',
	// Audit du 2026-10-05 : un `\end{pmatrix}` DANS un groupe fermait la matrice pour le
	// filtre, pas pour MathLive → plus aucun `&` compté (965 colonnes : 116em, 191 Ko)
	`\\begin{pmatrix}{\\end{pmatrix}}${'&'.repeat(965)}`,
	...[
		'\\text{\\end{pmatrix}}',
		'\\mathrm{\\end{pmatrix}}',
		'\\operatorname{\\end{pmatrix}}',
		'\\sqrt[\\end{pmatrix}]{2}',
		'\\left(\\end{pmatrix}\\right)'
	].map((closer) => `\\begin{pmatrix}${closer}${'1&'.repeat(470)}`),
	`\\begin{pmatrix}{\\end{pmatrix}}${`${'1&'.repeat(74)}1\\\\`.repeat(6)}`,
	nest(
		3,
		(s) => String.raw`\left(\dfrac{${s}}{1}\right)`,
		nest(30, (s) => String.raw`\dfrac{${s}}{1}`)
	),
	nest(2000, (s) => `{${s}}`),
	'{'.repeat(1990),
	'1+'.repeat(10_000),
	String.raw`\dfrac{1}{2}`.repeat(83),
	// `\overbrace` / `\underbrace` : SVG étirable de largeur fixe 400em (ignorée par la
	// mesure) ; imbriqués ou en 6 × 6, le rendu reste borné (audit du 2026-10-05)
	nest(11, (s) => String.raw`\overbrace{${s}}`),
	nest(40, (s) => String.raw`\underbrace{\overbrace{${s}}}`),
	`\\begin{pmatrix}${Array.from({ length: 6 }, () => Array(6).fill('\\overbrace{\\overbrace{x}}').join('&')).join('\\\\')}\\end{pmatrix}`,
	// `\&` : esperluette affichée, pas un séparateur de colonne
	'\\&'.repeat(500),
	'\\&'.repeat(1000)
];

/** HTML et temps de rendu bornés : une réponse ne doit pas bloquer la page du professeur */
const MAX_HTML_LENGTH = 200_000;
const MAX_RENDER_MS = 1_000;
const MAX_EM = 50;

/**
 * Plus grande dimension (em) calculée par MathLive (`\\\\[999em]` rend `height:1001.41em`).
 * Ignorée : la largeur FIXE `<svg width=400em` des accolades étirables de `\overbrace` /
 * `\underbrace`, rognée par leur conteneur (`min-width`) — la même pour un seul `x`.
 */
function largestEm(html: string): number {
	const measured = html.replace(/<svg width=400em /g, '<svg ');
	return Math.max(
		0,
		...[...measured.matchAll(/(-?\d+(?:\.\d+)?)em/g)].map((m) => Math.abs(Number(m[1])))
	);
}

/** Texte rendu par MathLive (il découpe les lettres en plusieurs spans) */
function renderedText(html: string): string {
	return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
}

describe('réponse élève neutralisée rendue par MathLive', () => {
	it.each(CHARGES.map((charge) => [charge.slice(0, 80), charge]))(
		'%s : ni lien, ni URL, ni positionnement, ni attribut, rendu borné',
		(_, charge) => {
			const start = performance.now();
			const html = convertLatexToMarkup(neutralizeStudentLatex(charge), { defaultMode: 'math' });
			expect(performance.now() - start).toBeLessThan(MAX_RENDER_MS);
			expect(html.length).toBeLessThan(MAX_HTML_LENGTH);
			expect(html).not.toMatch(/position\s*:/i);
			expect(html).not.toMatch(/url\(/i);
			expect(html).not.toMatch(/href/i);
			expect(html).not.toMatch(/<a[\s>]/i);
			expect(html).not.toMatch(/data-(?!ML)/);
			expect(html).not.toMatch(/999em/);
			expect(largestEm(html)).toBeLessThan(MAX_EM);
		}
	);

	it('la mesure reste discriminante : une charge démesurée NON neutralisée dépasse 50em', () => {
		for (const raw of [
			nest(8, (s) => String.raw`\left(\overbrace{\dfrac{${s}}{1}}\right)`),
			nest(8, (s) => String.raw`\left(\underbrace{\dfrac{${s}}{1}}\right)`),
			'\\begin{pmatrix}1\\\\[999em]2\\end{pmatrix}\\overbrace{x}'
		]) {
			const html = convertLatexToMarkup(raw, { defaultMode: 'math' });
			expect(largestEm(html)).toBeGreaterThan(MAX_EM);
		}
		// Le seul `400em` d'un `\overbrace` ordinaire est ignoré
		const html = convertLatexToMarkup(String.raw`\overbrace{x+1}`, { defaultMode: 'math' });
		expect(html).toContain('width=400em');
		expect(largestEm(html)).toBeLessThan(MAX_EM);
	});

	it('formule mal formée : la réponse ENTIÈRE reste visible chez le professeur', () => {
		for (const [raw, witnesses] of [
			['{\\begin{pmatrix}}}1&2\\\\3%QQQ', ['1&2', 'QQQ']],
			['\\frac{1}{2}}}+7QQQ', ['7QQQ']],
			['\\frac{1}{2QQQ', ['2QQQ']],
			['\\left(1+2QQQ', ['1+2QQQ']],
			['\\begin{pmatrix}1&2QQQ', ['1&2QQQ']],
			['{\\begin{pmatrix}}1&2\\end{pmatrix}+5QQQ', ['1&2', '5QQQ']]
		] as const) {
			const html = convertLatexToMarkup(neutralizeStudentLatex(raw), { defaultMode: 'math' });
			for (const witness of witnesses) expect(renderedText(html), raw).toContain(witness);
		}
	});

	it('`%` collé à un passage à la ligne : la fin de la réponse reste visible', () => {
		for (const raw of [
			'\\begin{pmatrix}1\\\\% secret x=2\\end{pmatrix}',
			`\\begin{pmatrix}${'1\\\\'.repeat(6)}% secret x=2\\end{pmatrix}`,
			'2\\\\% secret'
		]) {
			const html = convertLatexToMarkup(neutralizeStudentLatex(raw), { defaultMode: 'math' });
			expect(renderedText(html)).toMatch(/secret/);
		}
	});

	it('une réponse ordinaire reste rendue', () => {
		const html = convertLatexToMarkup(neutralizeStudentLatex(String.raw`\dfrac{3}{4}+0{,}5`), {
			defaultMode: 'math'
		});
		expect(html).toContain('3');
		expect(html).toContain('4');
	});
});

// Corpus : réponses attendues réelles (cf. answer-complexity-corpus.test.ts)
const RELECTURE_DIR = join(process.cwd(), 'data/relecture');
const SCRIPTS_DIR = join(process.cwd(), 'scripts/questions');
const SEEDS = [0, 1, 2, 3, 4, 5];

function jsonFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return jsonFiles(path);
		return name.endsWith('.json') ? [path] : [];
	});
}

function loadTemplates(): QuestionTemplate[] {
	const reviewed = jsonFiles(RELECTURE_DIR).flatMap((path) => {
		const source = relative(process.cwd(), path);
		const template = draftTemplate(
			parseReviewFile(JSON.parse(readFileSync(path, 'utf-8')), source)
		);
		return template ? [template] : [];
	});
	const written = jsonFiles(SCRIPTS_DIR).map((path) => {
		const raw = JSON.parse(readFileSync(path, 'utf-8')) as QuestionTemplate;
		return { ...raw, id: raw.id ?? relative(process.cwd(), path) };
	});
	return [...reviewed, ...written, ...Object.values(REAL_TEMPLATES)];
}

/** Réponses attendues (modèle, instance, LaTeX) et réponses des specs */
function expectedAnswers(template: QuestionTemplate): string[] {
	const answers: string[] = [];
	for (const variation of template.variations ?? []) {
		for (const blank of variation.blanks ?? []) answers.push(String(blank.expectedAnswer ?? ''));
		const single: QuestionTemplate = { ...template, variations: [variation] };
		for (const seed of SEEDS) {
			const result = generateInstance(single, seed);
			if (!result.success) continue;
			for (const blank of result.instance.blanks ?? []) {
				answers.push(blank.expectedAnswer, blank.expectedAnswerLatex ?? '');
			}
		}
	}
	for (const spec of template.testSpecs ?? []) answers.push(...(spec.answers ?? []));
	return answers.filter((answer) => answer.trim() !== '');
}

/** Réponses usuelles réécrites par le moteur, et unités du clavier */
const ENGINE_LATEX = [
	...[
		'\\frac{3}{4}',
		'3\\times10^{-2}',
		'\\sqrt[3]{8}',
		'(x+1)(x-1)',
		'-\\frac{1}{2}',
		'\\frac{\\pi}{3}',
		'\\exp(2)',
		'\\ln(2)',
		'\\cos(x)',
		'|x-1|',
		'45^\\circ',
		'50\\%',
		"f'(x)",
		'a\\cdot b',
		'\\alpha+\\beta'
	].map((latex) => toLatex(parseLatex(latex))),
	...['km', 'cm^3', 'm/s', 'km.h^-1', '°C', '°', '€', 'min'].map(unitWritingToLatex)
];

/** Commandes d'un bloc de la source de MathLive (clavier par défaut, raccourcis) */
function mathliveCommands(source: string, from: string, to: string): string[] {
	const start = source.indexOf(from);
	const end = source.indexOf(to, start);
	// Bloc introuvable : MathLive a changé, la liste blanche est à re-mesurer
	expect(start, `${from} introuvable dans mathlive.mjs`).toBeGreaterThan(-1);
	expect(end, `${to} introuvable dans mathlive.mjs`).toBeGreaterThan(start);
	const block = source.slice(start, end);
	return [...new Set([...block.matchAll(/\\\\([a-zA-Z]+)/g)].map((m) => m[1]))];
}

describe('liste blanche : aucune écriture légitime abîmée', () => {
	it('chaque réponse attendue réelle passe inchangée', () => {
		const answers = [...loadTemplates().flatMap(expectedAnswers), ...ENGINE_LATEX];
		// Seule transformation admise : un `%` nu devient `\%` (même affichage, plus de commentaire)
		const withEscapedPercent = (a: string) => a.replace(/(?<!\\)%/g, '\\%');
		const changed = [...new Set(answers)].filter(
			(a) => neutralizeStudentLatex(a) !== withEscapedPercent(a)
		);
		const commands = new Set(
			answers.flatMap((a) => [...a.matchAll(/\\([a-zA-Z]+)/g)].map((m) => m[1]))
		);
		console.log(
			`${answers.length} réponses, commandes rencontrées :`,
			[...commands].sort().join(' ')
		);
		expect(answers.length).toBeGreaterThan(20_000);
		expect(changed).toEqual([]);
	}, 300_000);

	it('tout ce que le clavier MathLive et ses raccourcis insèrent est admis', () => {
		const source = readFileSync(join(process.cwd(), 'node_modules/mathlive/mathlive.mjs'), 'utf-8');
		const commands = [
			...mathliveCommands(source, 'var LAYOUTS = {', '"compact": {'),
			...mathliveCommands(source, 'var INLINE_SHORTCUTS = {', '\n};')
		];
		expect(commands.length).toBeGreaterThan(150);
		// `\left` / `\right` seuls : formule mal formée (texte inerte) — testés appariés
		const sample = (name: string) =>
			name === 'left' || name === 'right' ? '\\left(x\\right)' : `\\${name}`;
		const refused = commands.filter(
			(name) => neutralizeStudentLatex(sample(name)) !== sample(name)
		);
		expect(refused).toEqual([]);
	});

	it('commande hors liste : nom et options retirés, arguments en texte inerte', () => {
		expect(neutralizeStudentLatex(String.raw`\enclose{box}[padding="999em"]{3}`)).toBe('{box}{3}');
		expect(neutralizeStudentLatex(String.raw`\placeholder[3]{}`)).toBe('{}');
		expect(neutralizeStudentLatex(String.raw`\sqrt[3]{8}`)).toBe(String.raw`\sqrt[3]{8}`);
		expect(neutralizeStudentLatex(String.raw`\text\foo[x]color{red}{x}`)).toBe('{red}{x}');
		expect(neutralizeStudentLatex(String.raw`2\@x\\`)).toBe('2@x');
	});

	it("un `%` de l'élève ne coupe pas la suite de la formule (texte et math)", async () => {
		const { escapeStudentText } = await import('../student-answer-safety');
		const texte = convertLatexToMarkup(
			String.raw`x = \text{${escapeStudentText('50 % des élèves')}} \neq 3`,
			{ defaultMode: 'math' }
		);
		expect(texte).toContain('3');
		expect(texte).toContain('élèves');
		const math = convertLatexToMarkup(String.raw`${neutralizeStudentLatex('5%2')} = 7`, {
			defaultMode: 'math'
		});
		expect(math).toContain('7');
		expect(neutralizeStudentLatex(String.raw`50\%`)).toBe(String.raw`50\%`);
	});
});
