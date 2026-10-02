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
	String.raw`\mathrm\x[y]bbox[position:fixed]{x}`
];

describe('réponse élève neutralisée rendue par MathLive', () => {
	it.each(CHARGES)('%s : ni lien, ni URL, ni positionnement, ni attribut', (charge) => {
		const html = convertLatexToMarkup(neutralizeStudentLatex(charge), { defaultMode: 'math' });
		expect(html).not.toMatch(/position\s*:/i);
		expect(html).not.toMatch(/url\(/i);
		expect(html).not.toMatch(/href/i);
		expect(html).not.toMatch(/<a[\s>]/i);
		expect(html).not.toMatch(/data-(?!ML)/);
		expect(html).not.toMatch(/999em/);
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
const RELECTURE_DIR = join(process.cwd(), 'docs/relecture');
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
		const changed = [...new Set(answers)].filter((a) => neutralizeStudentLatex(a) !== a);
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
		const refused = commands.filter((name) => neutralizeStudentLatex(`\\${name}`) !== `\\${name}`);
		expect(refused).toEqual([]);
	});

	it('commande hors liste : nom et options retirés, arguments en texte inerte', () => {
		expect(neutralizeStudentLatex(String.raw`\enclose{box}[padding="999em"]{3}`)).toBe('{box}{3}');
		expect(neutralizeStudentLatex(String.raw`\placeholder[3]{}`)).toBe('{}');
		expect(neutralizeStudentLatex(String.raw`\sqrt[3]{8}`)).toBe(String.raw`\sqrt[3]{8}`);
		expect(neutralizeStudentLatex(String.raw`\text\foo[x]color{red}{x}`)).toBe('{red}{x}');
		expect(neutralizeStudentLatex(String.raw`2\@x\\`)).toBe('2@x');
	});
});
