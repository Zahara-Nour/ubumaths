/**
 * Robot à produire à l'écran (chantier `docs/wip/suite-fleches-progress.md`, PR 1b)
 *
 * Phase 0 : cartes à toucher ou glisser ; « avance de » + un chiffre 1 à 9 ; 15 cartes au
 * plus ; réponse = le code en texte ; pas de bouton « Essayer » ; après la validation, le
 * trajet de l'élève (vert / rouge) et celui d'un code juste en pointillés ; corrigé = le CODE
 * juste, jamais la chaîne `<scène> | <code>` de la réponse attendue.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import RobotCode from '../RobotCode.svelte';
import FillBlanksInput from '#lib/components/question-inputs/FillBlanksInput.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import RobotCorrige from '../RobotCorrige.svelte';
import BuildAnswer from '#lib/components/questions/BuildAnswer.svelte';
import { parseRobotContent } from '#lib/ubumark/parser/robot-parser.ts';
import { expectedRobotAnswer } from '#lib/ubumark/utils/robot-answer.ts';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const source = (...lines: string[]) => lines.join('\n');
const FLECHES = source(
	'quadrillage: 8 x 5',
	'départ: 2, 1',
	'arrivée: 6, 4',
	'interdites: 4, 1 ; 4, 2',
	'produire: oui',
	'case: 0'
);
const AVANCE_PIVOTE = source(
	'quadrillage: 8 x 5',
	'codage: avance-pivote',
	'départ: 2, 1, droite',
	'arrivée: 6, 4',
	'produire: oui',
	'case: 0'
);

function attendue(texte: string): string {
	const node = parseRobotContent(texte);
	if (!node.spec?.solution) throw new Error('pas une question');
	return expectedRobotAnswer(node.spec, node.spec.solution);
}

/** Une case de question qui garde ce qu'on lui donne, comme `FillBlanksInput` */
function caseDeReponse(valeur = '', isCorrect: boolean | null = null) {
	const recu: string[] = [];
	return {
		recu,
		answer: { value: valeur, isCorrect, disabled: false, onChange: (v: string) => recu.push(v) }
	};
}

const derniere = (recu: string[]) => recu[recu.length - 1];
const ajouter = (nom: string) => page.getByRole('button', { name: `Ajouter : ${nom}` });

const carte = (rang: number) =>
	page.getByRole('button', { name: new RegExp(`^Instruction ${rang} sur`) });

/** Événement de pointeur synthétique (aucun vrai pointeur à capturer) */
function pointer(target: EventTarget, type: string, x: number, y: number, pointerId = 7) {
	target.dispatchEvent(
		new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId, button: 0 })
	);
}

/** Glisse `source` jusqu'au point `at` ; `pendant` : entre le mouvement et le lâcher */
function glisser(source: HTMLElement, at: { x: number; y: number }, pendant?: () => void) {
	const depart = source.getBoundingClientRect();
	source.setPointerCapture = () => {};
	pointer(source, 'pointerdown', depart.left + 5, depart.top + 5);
	pointer(window, 'pointermove', at.x, at.y);
	pendant?.();
	pointer(window, 'pointerup', at.x, at.y);
}

describe('robot à produire : les cartes', () => {
	it('toucher les cartes de la réserve compose le code, en texte', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers la droite').click();
		expect(derniere(recu)).toBe('↑ ↑ →');
		// Pas de bouton « Essayer » ni « Lancer » (phase 0, Q4)
		expect(page.getByRole('button', { name: /essayer|lancer/i }).elements()).toHaveLength(0);
	});

	it('toucher une carte posée la retire ; « Effacer la dernière », « Tout effacer »', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers la droite').click();
		await ajouter('flèche vers le bas').click();
		await page.getByRole('button', { name: /^Instruction 2 sur 3/ }).click();
		expect(derniere(recu)).toBe('↑ ↓');
		await page.getByRole('button', { name: 'Effacer la dernière' }).click();
		expect(derniere(recu)).toBe('↑');
		await page.getByRole('button', { name: 'Tout effacer' }).click();
		expect(derniere(recu)).toBe('');
	});

	it('« avance de » : réponse vide tant que le chiffre manque, puis « avance de 3 »', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(AVANCE_PIVOTE), answer }
		});
		await ajouter('avance de, chiffre à choisir').click();
		expect(derniere(recu)).toBe('');
		const chiffres = page.getByRole('group', { name: 'De combien de cases avance le robot ?' });
		await expect.element(chiffres).toBeVisible();
		await chiffres.getByRole('button', { name: '3', exact: true }).click();
		expect(derniere(recu)).toBe('avance de 3');
		await ajouter('pivote à gauche').click();
		expect(derniere(recu)).toBe('avance de 3, pivote à gauche');
		// Toucher la carte posée rouvre les chiffres, avec « Retirer »
		await page.getByRole('button', { name: /^Instruction 1 sur 2 : avance de 3/ }).click();
		await chiffres.getByRole('button', { name: '5', exact: true }).click();
		expect(derniere(recu)).toBe('avance de 5, pivote à gauche');
		await page.getByRole('button', { name: /^Instruction 1 sur 2/ }).click();
		await page.getByRole('button', { name: 'Retirer', exact: true }).click();
		expect(derniere(recu)).toBe('pivote à gauche');
		expect(screen.container.textContent).not.toContain('avance de 5');
	});

	it('un « avance de » sans chiffre ne disparaît pas quand la case reçoit la réponse vide', async () => {
		const recu: string[] = [];
		const node = parseRobotContent(AVANCE_PIVOTE);
		const props = $state({
			node,
			answer: {
				value: 'pivote à droite',
				isCorrect: null as boolean | null,
				disabled: false,
				onChange: (v: string) => {
					recu.push(v);
					props.answer.value = v;
				}
			}
		});
		await render(RobotCode, { target: mainElement(), props });
		await ajouter('avance de, chiffre à choisir').click();
		expect(props.answer.value).toBe('');
		await expect
			.element(page.getByRole('button', { name: /^Instruction 2 sur 2 : avance de, chiffre/ }))
			.toBeVisible();
	});

	it('15 cartes au plus : la réserve se grise, « 15 instructions au plus »', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		for (let k = 0; k < 15; k++) await ajouter('flèche vers la droite').click();
		expect(derniere(recu).split(' ')).toHaveLength(15);
		await expect.element(ajouter('flèche vers la droite')).toBeDisabled();
		await expect.element(page.getByText('15 instructions au plus.')).toBeVisible();
	});

	it('glisser une carte de la réserve l’insère où on la lâche', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers le haut').click();
		const source = ajouter('flèche vers la droite').element() as HTMLElement;
		const rect = carte(1).element().getBoundingClientRect();
		// Lâchée sur la moitié gauche de la 1re carte : insérée avant elle
		glisser(source, { x: rect.left + 3, y: rect.top + rect.height / 2 });
		expect(derniere(recu)).toBe('→ ↑ ↑');
	});

	it('glisser une carte posée dans la bande la déplace', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers la droite').click();
		await ajouter('flèche vers le bas').click();
		const source = carte(3).element() as HTMLElement;
		const rect = carte(1).element().getBoundingClientRect();
		glisser(source, { x: rect.left + 3, y: rect.top + rect.height / 2 });
		expect(derniere(recu)).toBe('↓ ↑ →');
	});

	it('glisser une carte posée sur la réserve la retire', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers la droite').click();
		const source = carte(1).element() as HTMLElement;
		const rect = ajouter('flèche vers le bas').element().getBoundingClientRect();
		glisser(source, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
		expect(derniere(recu)).toBe('→');
	});

	it('un glissement n’avale pas le geste suivant au clavier', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		const source = ajouter('flèche vers la droite').element() as HTMLElement;
		const rect = carte(1).element().getBoundingClientRect();
		glisser(source, { x: rect.right - 3, y: rect.top + rect.height / 2 });
		expect(derniere(recu)).toBe('↑ →');
		// Entrée sur une carte de la réserve, juste après : elle est ajoutée
		(ajouter('flèche vers le bas').element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		expect(derniere(recu)).toBe('↑ → ↓');
	});

	it('pointercancel d’un autre doigt n’annule pas le glissement en cours', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		const source = ajouter('flèche vers la droite').element() as HTMLElement;
		const rect = carte(1).element().getBoundingClientRect();
		glisser(source, { x: rect.left + 3, y: rect.top + rect.height / 2 }, () =>
			pointer(window, 'pointercancel', 0, 0, 8)
		);
		expect(derniere(recu)).toBe('→ ↑');
	});

	it('clavier : Alt + ← → déplace la carte posée, le focus la suit', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers la droite').click();
		await ajouter('flèche vers le bas').click();
		(carte(3).element() as HTMLElement).focus();
		await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
		expect(derniere(recu)).toBe('↑ ↓ →');
		await expect.element(carte(2)).toHaveFocus();
		await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
		expect(derniere(recu)).toBe('↓ ↑ →');
		// Déjà en tête : rien ne bouge
		await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
		expect(derniere(recu)).toBe('↓ ↑ →');
		await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
		expect(derniere(recu)).toBe('↑ ↓ →');
		await expect.element(carte(2)).toHaveFocus();
	});

	it('focus : retirer une carte passe à sa voisine, la bande vide rend le focus à la réserve', async () => {
		const { answer } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		await ajouter('flèche vers le haut').click();
		await ajouter('flèche vers la droite').click();
		(carte(1).element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		await expect
			.element(page.getByRole('button', { name: /^Instruction 1 sur 1 : flèche vers la droite/ }))
			.toHaveFocus();
		await userEvent.keyboard('{Enter}');
		await expect.element(ajouter('flèche vers la gauche')).toHaveFocus();
	});

	it('focus : la 15e carte grise la réserve, le focus passe à la carte posée', async () => {
		const { answer } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer }
		});
		for (let k = 0; k < 14; k++) await ajouter('flèche vers la droite').click();
		(ajouter('flèche vers la droite').element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		await expect.element(carte(15)).toHaveFocus();
	});

	it('focus : « avance de » ouvre les chiffres le focus sur 1 ; le chiffre posé le rend à la carte', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(AVANCE_PIVOTE), answer }
		});
		(ajouter('avance de, chiffre à choisir').element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		const chiffres = page.getByRole('group', { name: 'De combien de cases avance le robot ?' });
		await expect.element(chiffres.getByRole('button', { name: '1', exact: true })).toHaveFocus();
		await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}');
		expect(derniere(recu)).toBe('avance de 3');
		await expect.element(carte(1)).toHaveFocus();
		// Rouverte : le focus sur le chiffre posé ; Échap ferme et rend le focus à la carte
		await userEvent.keyboard('{Enter}');
		await expect.element(chiffres.getByRole('button', { name: '3', exact: true })).toHaveFocus();
		await userEvent.keyboard('{Escape}');
		await expect.element(chiffres).not.toBeInTheDocument();
		await expect.element(carte(1)).toHaveFocus();
	});

	it('la rangée de chiffres se ferme quand son « avance de » est effacé', async () => {
		const { answer, recu } = caseDeReponse();
		await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(AVANCE_PIVOTE), answer }
		});
		await ajouter('pivote à gauche').click();
		await ajouter('avance de, chiffre à choisir').click();
		const chiffres = page.getByRole('group', { name: 'De combien de cases avance le robot ?' });
		await expect.element(chiffres).toBeVisible();
		await page.getByRole('button', { name: 'Effacer la dernière' }).click();
		expect(derniere(recu)).toBe('pivote à gauche');
		await expect.element(chiffres).not.toBeInTheDocument();
		await expect.element(page.getByText('Choisis de combien')).not.toBeInTheDocument();
	});

	it('sans produire: le quadrillage seul, aucune carte', async () => {
		const screen = await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(source('quadrillage: 5 x 4', 'départ: 1, 1')) }
		});
		expect(screen.container.querySelector('svg[role="img"]')).not.toBeNull();
		expect(screen.container.querySelectorAll('button')).toHaveLength(0);
	});
});

describe('robot à produire : dans la question (FillBlanksInput)', () => {
	it('autre question, même bloc : un « avance de » sans chiffre ne passe pas à la suivante', async () => {
		const generated = generateInstance(
			{
				id: 'test-robot',
				title: 'Robot',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Code.', '', '```robot', ...AVANCE_PIVOTE.split('\n').slice(0, -1), '```'].join('\n')
						)
					}
				],
				grades: ['CE1'],
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const props = $state({
			statement: generated.instance.statement,
			blanks: generated.instance.blanks ?? [],
			values: [] as string[],
			validationResults: []
		});
		await render(FillBlanksInput, { target: mainElement(), props });
		await ajouter('avance de, chiffre à choisir').click();
		await expect.element(carte(1)).toBeVisible();
		expect(props.values[0] ?? '').toBe('');
		// La question suivante, tirée du même modèle : même bloc, case vide
		props.blanks = (generated.instance.blanks ?? []).map((b) => ({ ...b }));
		await expect.element(carte(1)).not.toBeInTheDocument();
		await expect.element(page.getByText('Touche une carte pour l’ajouter.')).toBeVisible();
	});
});

describe('robot à produire : après la validation', () => {
	it('faux : verrouillé, trajet rouge, une croix où il bute, un code juste en pointillés', async () => {
		const { answer } = caseDeReponse('→ → → →', false);
		const screen = await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer, expected: attendue(FLECHES) }
		});
		const svg = screen.container.querySelector('svg')!;
		expect(svg.querySelector('.robot-chemin')?.getAttribute('style')).toContain(
			'--color-destructive'
		);
		expect(svg.querySelector('.robot-croix')).not.toBeNull();
		expect(svg.querySelector('.robot-attendu')).not.toBeNull();
		expect(page.getByRole('button', { name: /^Ajouter/ }).elements()).toHaveLength(0);
		await expect.element(page.getByRole('button', { name: /^Instruction 1 sur 4/ })).toBeDisabled();
	});

	it('juste : trajet vert, sans pointillés', async () => {
		const { answer } = caseDeReponse('↑ ↑ ↑ → → → →', true);
		const screen = await render(RobotCode, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer, expected: attendue(FLECHES) }
		});
		const svg = screen.container.querySelector('svg')!;
		expect(svg.querySelector('.robot-chemin')?.getAttribute('style')).toContain('--color-success');
		expect(svg.querySelector('.robot-attendu')).toBeNull();
	});
});

describe('robot à produire : le corrigé', () => {
	it('copie corrigée : « Un code juste » montre le CODE, jamais la scène', async () => {
		const expected = attendue(FLECHES);
		expect(expected).toContain(' | ');
		const screen = await render(RobotCorrige, {
			target: mainElement(),
			props: { node: parseRobotContent(FLECHES), answer: '→ → → →', correct: false, expected }
		});
		const texte = (screen.container.textContent ?? '').replace(/\s+/g, ' ');
		const code = expected.split(' | ')[1];
		expect(texte).toContain(`Un code juste : ${code}`);
		expect(texte).not.toContain('|');
		expect(texte).not.toContain('8x5');
		expect(texte).toContain('Ton code :');
		expect(texte).toContain('Le robot bute sur une case grise.');
	});

	it('bonne réponse affichée (BuildAnswer, sans réponse) : le trajet juste et le code', async () => {
		const expected = attendue(AVANCE_PIVOTE);
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'robot',
				source: AVANCE_PIVOTE,
				answer: null,
				status: 'solution',
				expected: [expected]
			}
		});
		const texte = (screen.container.textContent ?? '').replace(/\s+/g, ' ');
		expect(texte).toContain(`Un code juste : ${expected.split(' | ')[1]}`);
		expect(texte).not.toContain('|');
		expect(texte).not.toContain('Ton code');
		expect(screen.container.querySelector('.robot-chemin')).not.toBeNull();
	});
});
