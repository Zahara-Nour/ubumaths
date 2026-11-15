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
import { page } from 'vitest/browser';
import RobotCode from '../RobotCode.svelte';
import RobotCorrige from '../RobotCorrige.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseRobotContent } from '$lib/ubumark/parser/robot-parser';
import { expectedRobotAnswer } from '$lib/ubumark/utils/robot-answer';

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
		const cible = page.getByRole('button', { name: /^Instruction 1 sur 2/ }).element();
		const depart = source.getBoundingClientRect();
		const rect = cible.getBoundingClientRect();
		// Lâchée sur la moitié gauche de la 1re carte : insérée avant elle
		const at = { x: rect.left + 3, y: rect.top + rect.height / 2 };
		const pointer = (target: EventTarget, type: string, x: number, y: number) =>
			target.dispatchEvent(
				new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 7, button: 0 })
			);
		// Événements synthétiques : aucun vrai pointeur à capturer
		source.setPointerCapture = () => {};
		pointer(source, 'pointerdown', depart.left + 5, depart.top + 5);
		pointer(window, 'pointermove', at.x, at.y);
		pointer(window, 'pointerup', at.x, at.y);
		expect(derniere(recu)).toBe('→ ↑ ↑');
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
