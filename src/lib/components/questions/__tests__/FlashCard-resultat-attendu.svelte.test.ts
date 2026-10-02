/**
 * FlashCard — verso = résultat attendu + correction (chantier « résultat
 * attendu », lot 3, R14, Q91)
 * =====================================================================
 *
 * - Sans réponse d'élève (flash-cards, révision, En classe, aperçus) : R9 —
 *   l'énoncé rempli en vert, ou pour un calcul R1 la solution `3 + 5 = 8`
 *   encadrée, précédée de la consigne (Q104).
 * - Avec réponse (FlashCard `interactive`) : R1-R7 avec la réponse de l'élève,
 *   statut global du barème de l'entraînement (Q105).
 * - En bas : la correction concise ↔ détaillée (`CorrectionView`).
 * - Carte de cours : inchangée (Q96).
 *
 * Sécurité (audits #643) : la réponse de l'élève n'est rendue qu'en formule.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import FlashCard from '../FlashCard.svelte';
import { TILE_CARD_HEIGHT } from '../tile-card';
import type { QuestionInstance } from '$lib/questions/types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { REAL_TEMPLATES } from '$lib/server/validation/__tests__/fixtures/real-templates';
import { resolvedMarkdown } from '$lib/ubumark';
import type { MathfieldElement } from 'mathlive';

// Fixtures
function instance(overrides: Partial<QuestionInstance>): QuestionInstance {
	return {
		templateId: 't',
		statement: resolvedMarkdown('Calcule $3 + 5 = \\placeholder[0]{}$'),
		blanks: [{ expectedAnswer: '8', expectedAnswerLatex: '8', type: 'math' }],
		correction: {
			steps: [resolvedMarkdown('On ajoute les unités [3 + 5 donne 8]{.calcul}.')]
		},
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Additionner',
		level: 1,
		generatedAt: new Date().toISOString(),
		...overrides
	} as QuestionInstance;
}

const calc = instance({});
const twoBlanks = instance({
	statement: resolvedMarkdown(
		'$7 + \\placeholder[0]{} = 10$ et $\\placeholder[1]{} \\times 2 = 8$'
	),
	blanks: [
		{ expectedAnswer: '3', expectedAnswerLatex: '3', type: 'math' },
		{ expectedAnswer: '4', expectedAnswerLatex: '4', type: 'math' }
	]
});
const qcm = instance({
	statement: resolvedMarkdown('Quel nombre est pair ?'),
	blanks: undefined,
	choices: [
		{ content: resolvedMarkdown('7'), isCorrect: false },
		{ content: resolvedMarkdown('12'), isCorrect: true },
		{ content: resolvedMarkdown('9'), isCorrect: false }
	],
	shuffledChoices: [
		{ content: resolvedMarkdown('9'), originalIndex: 2 },
		{ content: resolvedMarkdown('12'), originalIndex: 1 },
		{ content: resolvedMarkdown('7'), originalIndex: 0 }
	]
} as Partial<QuestionInstance>);
const textBlank = instance({
	statement: resolvedMarkdown('Un triangle à trois côtés égaux est {{blank:0}}.'),
	blanks: [{ expectedAnswer: 'équilatéral', type: 'text' }]
});

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
	try {
		localStorage.removeItem('chiphre:correction-detail');
	} catch {
		// stockage indisponible
	}
});

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

async function show(props: Record<string, unknown>) {
	return await render(FlashCard, { target: mainElement(), props: props as never });
}

const back = (c: HTMLElement) => c.querySelector('.flip-card-back') as HTMLElement;
const front = (c: HTMLElement) => c.querySelector('.flip-card-front') as HTMLElement;
/** Source LaTeX des formules rendues */
const formulas = (root: HTMLElement) =>
	[...root.querySelectorAll('math-span')].map((m) => m.textContent ?? '').join('\n');
const SOLUTION_8 = '\\bbox[border:1px solid var(--expected-correct); border-radius:4px]{8}';

async function submit(container: HTMLElement) {
	const button = [...front(container).querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Valider'
	);
	expect(button).toBeDefined();
	button!.click();
	flushSync();
	await tick();
}

/** Tape `keys` dans la case du champ MathLive (vrai clavier) */
async function typeInPrompt(container: HTMLElement, keys: string) {
	await expect.poll(() => front(container).querySelector('math-field')).toBeTruthy();
	const field = front(container).querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	await userEvent.keyboard(keys);
	await expect.poll(() => field.getPromptValue('0')).toBe(keys);
}

// Tests
describe('FlashCard — verso sans réponse (R9)', () => {
	it('calcul R1 : consigne, puis `3 + 5 = 8` encadré, puis la correction concise', async () => {
		const { container } = await show({ instance: calc });
		const verso = back(container);
		const expected = verso.querySelector<HTMLElement>('[data-testid="expected-result"]');
		expect(expected).not.toBeNull();
		const solution = expected!.querySelector<HTMLElement>('[data-kind="solution"]');
		expect(solution).not.toBeNull();
		expect(formulas(solution!)).toContain('3 + 5');
		expect(formulas(solution!)).toContain(SOLUTION_8);
		// Consigne seule (Q104) : jamais la formule à case vide
		expect(verso.querySelector('[data-testid="instruction"]')?.textContent).toContain('Calcule');
		expect(formulas(verso)).not.toContain('placeholder');
		// Correction concise en dessous, détail masqué
		expect(verso.textContent).toContain('On ajoute les unités');
		expect(verso.textContent).not.toContain('3 + 5 donne 8');
		const order = expected!.compareDocumentPosition(
			verso.querySelector('.correction-steps') as HTMLElement
		);
		expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('trou à deux cases : l’énoncé rempli, solutions en vert', async () => {
		const { container } = await show({ instance: twoBlanks });
		const filled = back(container).querySelector<HTMLElement>('[data-kind="filled-statement"]');
		expect(filled).not.toBeNull();
		const latex = formulas(filled!);
		expect(latex).toContain('7 + \\textcolor{var(--expected-correct)}{3} = 10');
		expect(latex).toContain('\\textcolor{var(--expected-correct)}{4} \\times 2 = 8');
		// L'énoncé est déjà rempli : pas de consigne en double
		expect(back(container).querySelector('[data-testid="instruction"]')).toBeNull();
	});

	it('QCM : tous les choix dans l’ordre affiché, le bon marqué « bonne réponse »', async () => {
		const { container } = await show({ instance: qcm });
		const items = [...back(container).querySelectorAll<HTMLElement>('[data-kind="choices"] li')];
		expect(items.map((li) => li.getAttribute('data-status'))).toEqual([
			'neutral',
			'solution',
			'neutral'
		]);
		expect(items[1].textContent).toContain('bonne réponse');
		expect(items[1].textContent).toContain('12');
	});

	it('unité (modèle réel) : la réponse attendue en formule, avec son unité', async () => {
		const generated = generateInstance(REAL_TEMPLATES.unit, 2);
		if (!generated.success) throw new Error('génération');
		const inst = generated.instance;
		const { container } = await show({ instance: inst });
		const expected = back(container).querySelector<HTMLElement>('[data-testid="expected-result"]');
		expect(expected).not.toBeNull();
		// `40~\\unit{km.h^{-1}}` affiché en unités lisibles, en vert
		expect(inst.blanks![0].expectedAnswerLatex).toBe('40~\\unit{km.h^{-1}}');
		expect(formulas(expected!)).toContain(
			'\\textcolor{var(--expected-correct)}{40~\\mathrm{km}\\cdot\\mathrm{h}^{-1}}'
		);
		expect(formulas(expected!)).not.toContain('\\unit');
	});

	it('case graphique : la réponse attendue sur sa ligne, sans erreur', async () => {
		const { container } = await show({
			instance: instance({
				statement: resolvedMarkdown('Place le point A d’abscisse 2,5 sur la droite.'),
				blanks: [{ expectedAnswer: '2.5', expectedAnswerLatex: '2{,}5', type: 'graphical' }]
			})
		});
		const only = back(container).querySelector<HTMLElement>('[data-kind="expected-only"]');
		expect(only).not.toBeNull();
		expect(formulas(only!)).toContain('2{,}5');
	});

	it('carte de cours : verso inchangé, aucun résultat attendu', async () => {
		const generated = generateInstance(REAL_TEMPLATES.courseCard, 1);
		if (!generated.success) throw new Error('génération');
		const { container } = await show({ instance: generated.instance });
		expect(back(container).querySelector('[data-testid="expected-result"]')).toBeNull();
		expect(back(container).querySelector('[data-verso-title]')?.textContent?.trim()).toBe('Verso');
	});

	it('tuile sm (hauteur imposée, En classe) : rien ne déborde, le verso défile', async () => {
		const { container } = await show({
			instance: instance({
				...twoBlanks,
				correction: {
					steps: Array.from({ length: 8 }, (_, i) =>
						resolvedMarkdown(`Étape ${i + 1} : une explication assez longue pour remplir.`)
					)
				}
			}),
			size: 'sm',
			height: TILE_CARD_HEIGHT,
			startFlipped: true,
			flippable: false
		});
		const verso = back(container);
		expect(verso.inert).toBe(false);
		const scroller = verso.querySelector<HTMLElement>('[data-slot="card"]')!;
		expect(getComputedStyle(scroller).overflowY).toBe('auto');
		expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth + 1);
		const card = verso.getBoundingClientRect();
		const expected = verso.querySelector<HTMLElement>('[data-testid="expected-result"]')!;
		expect(expected.getBoundingClientRect().right).toBeLessThanOrEqual(card.right + 1);
	});
});

describe('FlashCard interactive — verso avec la réponse de l’élève (R1-R7)', () => {
	it('R1 faux : `3 + 5 ≠ 9`, puis `= 8` encadré, statut global « Faux »', async () => {
		const { container } = await show({ instance: calc, interactive: true });
		await typeInPrompt(container, '9');
		await submit(container);

		const verso = back(container);
		const comparison = verso.querySelector<HTMLElement>('[data-kind="comparison"]');
		expect(comparison?.getAttribute('data-status')).toBe('incorrect');
		expect(formulas(comparison!)).toContain('\\neq');
		expect(formulas(comparison!)).toContain('9');
		// Comparaison et solution dans UN bloc aligné : `= 8` sous le `≠`
		expect(formulas(comparison!)).toMatch(
			/\\begin\{aligned\}.*&\\mathrel.*\\\\ &= .*\\end\{aligned\}/
		);
		expect(formulas(comparison!)).toContain(SOLUTION_8);
		expect(verso.querySelector('[data-testid="global-verdict"]')?.textContent).toContain('Faux');
	});

	it('avant de répondre : le verso montre la solution seule (R9)', async () => {
		const { container } = await show({ instance: calc, interactive: true });
		expect(back(container).querySelector('[data-kind="comparison"]')).toBeNull();
		expect(back(container).querySelector('[data-kind="solution"]')).not.toBeNull();
		expect(back(container).querySelector('[data-testid="global-verdict"]')).toBeNull();
	});

	it('QCM coché à tort : choix rouge, bon choix encadré, « Faux »', async () => {
		const { container } = await show({ instance: qcm, interactive: true });
		// Position affichée 0 = « 9 » (faux)
		front(container).querySelectorAll<HTMLButtonElement>('.choice-button')[0].click();
		flushSync();
		await submit(container);
		const statuses = [
			...back(container).querySelectorAll<HTMLElement>('[data-kind="choices"] li')
		].map((li) => li.getAttribute('data-status'));
		expect(statuses).toEqual(['incorrect', 'solution', 'neutral']);
		expect(back(container).querySelector('[data-testid="global-verdict"]')?.textContent).toContain(
			'Faux'
		);
	});

	it('sécurité : un lien tapé dans une case n’est jamais rendu en lien', async () => {
		const { container } = await show({ instance: textBlank, interactive: true });
		const input = front(container).querySelector<HTMLInputElement>('input')!;
		await userEvent.fill(input, '[clic](https://exemple.org)');
		await submit(container);
		const verso = back(container);
		expect(verso.querySelector('[data-kind="your-answer"]')).not.toBeNull();
		expect(verso.querySelector('a[href]')).toBeNull();
	});
});

/**
 * Hiérarchie du verso (ajustement du lot 3) : en-tête « Réponse » (résultat
 * attendu), filet, puis « Correction » au-dessus de la correction concise.
 * Sans correction : ni filet ni intitulé.
 */
describe('FlashCard — verso : « Réponse », filet, « Correction »', () => {
	it('avec correction : en-tête « Réponse », filet puis intitulé « Correction » avant la correction', async () => {
		const { container } = await show({ instance: twoBlanks });
		const verso = back(container);
		expect(verso.querySelector('[data-verso-title]')?.textContent?.trim()).toBe('Réponse');
		const separator = verso.querySelector<HTMLElement>('[data-testid="correction-separator"]');
		const heading = verso.querySelector<HTMLElement>('[data-testid="correction-heading"]');
		expect(separator).not.toBeNull();
		expect(heading?.textContent?.trim()).toBe('Correction');
		// Ordre : résultat attendu, filet, intitulé, correction
		const expected = verso.querySelector('[data-testid="expected-result"]')!;
		const steps = verso.querySelector('.correction-steps')!;
		const follows = (a: Node, b: Node) =>
			Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
		expect(follows(expected, separator!)).toBe(true);
		expect(follows(separator!, heading!)).toBe(true);
		expect(follows(heading!, steps)).toBe(true);
		// Un filet visible, mais pas un encadré
		expect(getComputedStyle(separator!).borderTopStyle).not.toBe('none');
	});

	it('sans correction : ni filet ni intitulé', async () => {
		const { container } = await show({ instance: { ...twoBlanks, correction: undefined } });
		const verso = back(container);
		expect(verso.querySelector('[data-verso-title]')?.textContent?.trim()).toBe('Réponse');
		expect(verso.querySelector('[data-testid="correction-separator"]')).toBeNull();
		expect(verso.querySelector('[data-testid="correction-heading"]')).toBeNull();
	});
});

/**
 * Recto et verso d'accord (ajustement du lot 3) : le bandeau du recto dit le
 * même statut global que le badge du verso — barème de l'évaluation (Q105).
 */
describe('FlashCard interactive — recto et verso disent le même statut', () => {
	const twoTextBlanks = instance({
		statement: resolvedMarkdown('Le triangle est {{blank:0}} et {{blank:1}}.'),
		blanks: [
			{ expectedAnswer: 'isocèle', type: 'text' },
			{ expectedAnswer: 'rectangle', type: 'text' }
		]
	});

	it('une case vide sur deux : « ½ point » au recto et au verso', async () => {
		const { container } = await show({ instance: twoTextBlanks, interactive: true });
		const inputs = front(container).querySelectorAll<HTMLInputElement>('input');
		await userEvent.fill(inputs[0], 'isocèle');
		await submit(container);
		const banner = front(container).querySelector('[data-testid="front-verdict"]');
		expect(banner?.textContent).toContain('½ point');
		expect(banner?.getAttribute('data-kind')).toBe('half');
		expect(back(container).querySelector('[data-testid="global-verdict"]')?.textContent).toContain(
			'½ point'
		);
	});

	it('réponse fausse : « Faux » au recto et au verso', async () => {
		const { container } = await show({ instance: calc, interactive: true });
		await typeInPrompt(container, '9');
		await submit(container);
		expect(front(container).querySelector('[data-testid="front-verdict"]')?.textContent).toContain(
			'Faux'
		);
		expect(back(container).querySelector('[data-testid="global-verdict"]')?.textContent).toContain(
			'Faux'
		);
	});
});
