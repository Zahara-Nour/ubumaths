/**
 * Énoncé masqué d'une évaluation notée : le même écran (chantier `fuite-enonce`, lots 1 et 2)
 * ============================================================================================
 *
 * Pendant une évaluation, le navigateur reçoit l'énoncé sans la valeur à trouver
 * (`placer: A=?`, `construire: ?`…) et le rhabille par `toDisplayInstance`. L'élève
 * doit voir EXACTEMENT ce qu'il verrait avec l'instance complète, avant tout geste :
 * même HTML, bloc par bloc. Puis le geste marche (la droite masquée remplit sa case).
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';

// Variables
let mains: HTMLElement[] = [];

// Functions
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function block(kind: string, ...lines: string[]): string {
	return ['```' + kind, ...lines, '```'].join('\n');
}

function generated(statement: string): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-enonce-masque',
			title: 'Énoncé masqué',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(`Question.\n\n${statement}`) }],
			grades: ['CE1'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** Ce que l'élève voit : le rendu de la question */
async function screenOf(instance: QuestionInstance, values: string[] = []): Promise<HTMLElement> {
	const screen = await render(FillBlanksInput, {
		target: mainElement(),
		props: {
			statement: instance.statement,
			blanks: instance.blanks ?? [],
			values,
			validationResults: []
		}
	});
	return screen.container as HTMLElement;
}

function html(root: HTMLElement): string {
	// Identifiant de montage du diagramme (`c1-titre`, `c2-titre`) : seul écart permis
	return root.innerHTML.replace(/\bc\d+-/g, 'c-');
}

const CASES: [string, string][] = [
	[
		'droite graduée',
		block('line', 'start: 0', 'end: 20', 'step: 1', 'labels: 0, 10, 20', 'placer: A=3 ; B=7')
	],
	[
		'repère',
		block('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'placer: A=(2 ; 3) ; B=(-1 ; 2)')
	],
	['horloge', block('horloge', 'placer: 9 h 25')],
	['collection', block('collection', 'construire: 34')],
	['monnaie', block('monnaie', 'construire: 35')],
	['figure à colorier', block('partage', 'forme: bande 4', 'unites: 3', 'colorier: 7/4')],
	[
		'diagramme en barres',
		block(
			'barres',
			'axes: Sport ; Effectif',
			'axe: 0 à 20, de 2 en 2',
			'Football = 12',
			'Natation = 8',
			'Danse = 7',
			'placer: Natation ; Danse'
		)
	],
	// Lot 2 (journal § 7)
	['assemblage à retrouver', block('cubes', 'hauteurs: 3 1 2 / 1 0 2', 'retrouver: face, droite')],
	[
		'patron à compléter, tourné et retourné',
		block('patron', 'solide: cube', 'forme: 3', 'tourner: 90', 'retourner: oui', 'completer: 1 5')
	],
	[
		'figure à compléter',
		block(
			'figure-a-completer',
			'fenetre: 0 ; 10 ; 0 ; 6',
			'verifier: carre A ; B',
			'---',
			'A = point(1, 2)',
			'B = point(4, 2)'
		)
	]
];

describe('énoncé masqué : l’élève voit le même écran', () => {
	it.each(CASES)('%s', async (_name, source) => {
		const full = generated(source);
		const masked = toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 }));
		expect(masked.statement).not.toBe(full.statement);
		const expected = html(await screenOf(full));
		const seen = html(await screenOf(masked));
		expect(seen.split('><')).toEqual(expected.split('><'));
	});
});

describe('énoncé masqué : le geste marche', () => {
	it('droite graduée : avancer le point A remplit la case A', async () => {
		const full = generated(CASES[0][1]);
		const masked = toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 }));
		const values: string[] = [];
		const root = await screenOf(masked, values);
		const forward = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
			(b) => b.getAttribute('aria-label') === 'Avancer le point d’une graduation'
		);
		expect(forward, 'bouton du geste').toBeDefined();
		forward!.click();
		await expect.poll(() => values[0] ?? '').not.toBe('');
	});

	it('patron à compléter : poser une face remplit la case', async () => {
		const full = generated(CASES[8][1]);
		const masked = toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 }));
		expect(masked.statement).toContain('completer: ? ?');
		const values: string[] = [];
		const root = await screenOf(masked, values);
		const spot = root.querySelector<SVGElement>('[aria-label^="Emplacement rangée"]');
		expect(spot, 'emplacement du geste').not.toBeNull();
		spot!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await expect.poll(() => values[0] ?? '').toContain('2');
	});
});
