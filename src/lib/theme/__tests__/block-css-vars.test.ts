/**
 * Chaque `var(--x)` des blocs du lot 3 doit exister : déclarée dans app.css, ou
 * localement dans le `<style>` du composant. Une variable absente est jetée en
 * silence par le navigateur (cf. docs/ref/css-color-tokens.md) : avant le lot,
 * les quatre composants lisaient `--foreground`, `--border`… qui n'existent pas,
 * et ne tenaient que par leurs couleurs de repli codées en dur.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appCss = readFileSync(resolve(root, 'src/app.css'), 'utf8');
// Thème par défaut de Tailwind 4 (`--color-green-700`, `--font-mono`, `--spacing`…) :
// déclaré par `@import 'tailwindcss'`, donc légitime
const tailwindTheme = readFileSync(resolve(root, 'node_modules/tailwindcss/theme.css'), 'utf8');

/** Variables posées par une bibliothèque sur ses propres éléments (vérifié à la source) */
const LIBRARY_PREFIXES = ['--bits-'];

/**
 * Crochets de personnalisation avec repli valide : jamais posés, ils retombent
 * proprement sur leur repli (`var(--slide-padding, 2rem)`, `rgba(var(--primary-rgb,
 * 59, 130, 246), 0.05)`). Pas une couleur jetée en silence.
 */
const HOOKS_WITH_FALLBACK = [
	'--slide-background',
	'--slide-padding',
	'--slide-color',
	'--primary-rgb'
];

const COMPONENTS = [
	'src/lib/components/markdown/nodes/NumberLine.svelte',
	'src/lib/components/markdown/nodes/TrigCircle.svelte',
	'src/lib/components/markdown/nodes/VariationTable.svelte',
	'src/lib/components/markdown/nodes/ProbabilityTree.svelte',
	// Restes du lot 3 : éditeurs des blocs, saisie élève, blocs de contenu, questions
	'src/lib/extensions/NumberLineNodeView.svelte',
	'src/lib/extensions/VariationTableNodeView.svelte',
	'src/lib/extensions/ImageNodeView.svelte',
	'src/lib/components/question-inputs/NumberLineInput.svelte',
	'src/lib/components/question-inputs/FillBlanksInput.svelte',
	'src/lib/components/question-inputs/MathInput.svelte',
	'src/lib/components/question-inputs/OrderingInput.svelte',
	'src/lib/components/markdown/MarkdownRaw.svelte',
	'src/lib/components/markdown/nodes/ImageDisplay.svelte',
	'src/lib/components/markdown/nodes/MathPrompt.svelte',
	'src/lib/components/markdown/nodes/ParagraphNode.svelte',
	'src/lib/components/questions/CorrectionCard.svelte',
	'src/lib/components/questions/FlashCard.svelte',
	'src/lib/components/questions/GeneratedStepsCorrection.svelte',
	'src/lib/components/srs/CustomFlashCard.svelte',
	'src/lib/components/srs/TemplateSelector.svelte',
	'src/lib/components/test/TestTimer.svelte',
	'src/lib/components/game/challenges/ChallengeContainer.svelte'
];

/** Retire les commentaires CSS, HTML et JS (`//` en début de ligne ou après un blanc) */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/(^|\s)\/\/.*$/gm, '$1');
}

/**
 * Retire les règles dont le sélecteur vise `.dark` (accolades équilibrées) : une
 * variable définie SEULEMENT en sombre n'existe pas en clair — le bug d'origine
 * des `--number-line-*`.
 */
function stripDarkBlocks(css: string): string {
	let out = '';
	let i = 0;
	while (i < css.length) {
		const open = css.indexOf('{', i);
		if (open === -1) {
			out += css.slice(i);
			break;
		}
		const selectorStart = Math.max(css.lastIndexOf('}', open), css.lastIndexOf(';', open)) + 1;
		const selector = css.slice(Math.max(selectorStart, i), open);
		if (!/\.dark\b/.test(selector)) {
			out += css.slice(i, open + 1);
			i = open + 1;
			continue;
		}
		out += css.slice(i, Math.max(selectorStart, i));
		let depth = 1;
		let j = open + 1;
		while (j < css.length && depth > 0) {
			if (css[j] === '{') depth++;
			else if (css[j] === '}') depth--;
			j++;
		}
		i = j;
	}
	return out;
}

/**
 * Noms déclarés hors commentaires et hors blocs `.dark` : `--nom:` (CSS, jamais
 * précédé de `(` ou `,` : un repli `var(--a, var(--b))` n'est pas une déclaration)
 * ou `style:--nom=` (directive Svelte).
 */
function declared(source: string): Set<string> {
	const text = stripDarkBlocks(stripComments(source));
	const css = [...text.matchAll(/(?<![\w(,-])(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]);
	const directives = [...text.matchAll(/style:(--[a-zA-Z0-9-]+)\s*=/g)].map((m) => m[1]);
	return new Set([...css, ...directives]);
}

/** Noms lus (`var(--nom`), replis imbriqués compris, hors commentaires */
function used(source: string): string[] {
	const text = stripComments(source);
	return [...new Set([...text.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]))];
}

/** Variables lues mais jamais déclarées (ni dans app.css, ni localement) */
function missingIn(source: string): string[] {
	const local = declared(source);
	return used(source).filter(
		(name) =>
			!global.has(name) &&
			!local.has(name) &&
			!LIBRARY_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
			!HOOKS_WITH_FALLBACK.includes(name)
	);
}

/** Forme Tailwind 3 `hsl(var(--x))` dans le CODE (un commentaire qui la cite ne compte pas) */
function hasTailwind3Hsl(source: string): boolean {
	return /hsl\(var\(--/.test(stripComments(source));
}

const global = new Set([...declared(appCss), ...declared(tailwindTheme)]);

describe('analyse des variables (garde-fous du test lui-même)', () => {
	it('une variable déclarée SEULEMENT sous .dark est manquante', () => {
		const src = `<style>.a { color: var(--x-only-dark); }\n:global(.dark) .a { --x-only-dark: red; }</style>`;
		expect(missingIn(src)).toEqual(['--x-only-dark']);
	});

	it('une variable déclarée seulement dans un commentaire est manquante', () => {
		const src = `<style>/* --x-comment: red; */ .a { color: var(--x-comment); }</style>`;
		expect(missingIn(src)).toEqual(['--x-comment']);
	});

	it('les replis imbriqués sont lus, et ne valent pas déclaration', () => {
		const src = `<style>.a { --x-local: red; color: var(--x-local, var(--x-nested, var(--color-foreground))); }</style>`;
		expect(missingIn(src)).toEqual(['--x-nested']);
	});

	it('`hsl(var(--x))` cité dans un commentaire ne compte pas, dans le code si', () => {
		expect(
			hasTailwind3Hsl(`<style>/* jamais hsl(var(--border)) */ .a { color: red; }</style>`)
		).toBe(false);
		expect(hasTailwind3Hsl(`<!-- hsl(var(--x)) --><p>texte</p>`)).toBe(false);
		expect(hasTailwind3Hsl(`<style>.a { color: hsl(var(--border)); }</style>`)).toBe(true);
	});

	it('une déclaration hors .dark ou via style:--x= compte', () => {
		expect(
			missingIn(`<div style:--x-dir={c}></div><style>.a { fill: var(--x-dir); }</style>`)
		).toEqual([]);
	});
});

describe('variables CSS des blocs du lot 3', () => {
	for (const file of COMPONENTS) {
		it(`${file.split('/').pop()} : toutes les variables lues existent`, () => {
			const source = readFileSync(resolve(root, file), 'utf8');
			expect(missingIn(source)).toEqual([]);
		});

		it(`${file.split('/').pop()} : pas de forme Tailwind 3 \`hsl(var(--x))\``, () => {
			const source = readFileSync(resolve(root, file), 'utf8');
			expect(hasTailwind3Hsl(source)).toBe(false);
		});
	}
});

describe('balayage de src/lib et src/routes', () => {
	// `:(glob)` : sans lui, `**/` exige au moins un dossier et saute `src/routes/+layout.svelte`
	const files = execSync(
		"git ls-files ':(glob)src/lib/**/*.svelte' ':(glob)src/routes/**/*.svelte'",
		{
			cwd: root,
			encoding: 'utf8'
		}
	)
		.trim()
		.split('\n');

	const offenders = files.filter((file) => {
		const source = readFileSync(resolve(root, file), 'utf8');
		return missingIn(source).length > 0 || hasTailwind3Hsl(source);
	});

	it('couvre les fichiers posés directement sous src/routes', () => {
		expect(files).toContain('src/routes/+layout.svelte');
	});

	it('aucun composant ne lit de variable inexistante ni de `hsl(var(--x))`', () => {
		// Dette soldée le 2026-10-04 (17 fichiers) : plus d'exception, tout nouveau fichier fautif échoue
		expect(offenders).toEqual([]);
	});
});
