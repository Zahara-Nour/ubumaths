/**
 * Programme tortue de 4e / 3e à l'écran (chantier `tortue-variables`, PR B ; phase 0 validée le
 * 2026-11-16) : `niveau:` choisit les blocs proposés, la notation de la réponse et le compte des
 * blocs ; le corrigé lit les programmes au niveau.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import * as Blockly from 'blockly';
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import TortueProgramme from '../TortueProgramme.svelte';
import TortueCorrige from '../TortueCorrige.svelte';
import { parseTortueContent } from '#lib/ubumark/parser/tortue-parser.ts';
import { texteVersEtatTortue } from '#lib/shared/blockly/tortue/niveaux.ts';

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

const HEXAGONE = 'mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]';
const node = (...lines: string[]) => parseTortueContent(lines.join('\n'));

/** Tracés dessinés (`data-trace` de TortueCanvas) */
const trace = (root: Element, nom: 'modele' | 'eleve' | 'attendu') =>
	root.querySelector(`[data-trace="${nom}"]`);

async function attendreBlocs(root: Element): Promise<void> {
	await expect
		.poll(() => root.querySelector('[aria-label="Espace de travail Blockly"] svg'), {
			timeout: 15_000
		})
		.not.toBeNull();
}

function poser(texte: string): void {
	const lu = texteVersEtatTortue(texte, '3e');
	if (!lu.ok) throw new Error(lu.message);
	Blockly.serialization.workspaces.load(lu.etat, Blockly.getMainWorkspace());
}

function caseDeReponse(valeur = '') {
	const recu: string[] = [];
	return {
		recu,
		answer: {
			value: valeur,
			isCorrect: null,
			disabled: false,
			onChange: (v: string) => recu.push(v)
		}
	};
}

describe('programme tortue de 4e : la carte', () => {
	it('boîte à outils du niveau : variables, pas de conditions en 4e', async () => {
		const quatrieme = await render(TortueProgramme, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${HEXAGONE}`, 'niveau: 4e', 'case: 0'),
				answer: caseDeReponse().answer
			}
		});
		await attendreBlocs(quatrieme.container);
		await expect.element(page.getByText('Variables', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Conditions', { exact: true })).not.toBeInTheDocument();
	});

	it('les blocs posés deviennent la réponse, dans la notation de 4e', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: node(`attendu: ${HEXAGONE}`, 'niveau: 4e', 'case: 0'), answer }
		});
		await attendreBlocs(screen.container);
		poser(HEXAGONE);
		await expect.poll(() => recu.at(-1)).toBe(HEXAGONE);
	});

	it('départ: à compléter (variable lue jamais mise) : posé d’avance, pas une réponse', async () => {
		const depart = 'répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]';
		const { answer, recu } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${HEXAGONE}`, `départ: ${depart}`, 'niveau: 4e', 'case: 0'),
				answer
			}
		});
		await attendreBlocs(screen.container);
		await expect
			.poll(() =>
				Blockly.getMainWorkspace()
					.getAllBlocks(false)
					.some((b) => b.type === 'variables_get')
			)
			.toBe(true);
		await new Promise((r) => setTimeout(r, 300));
		expect(recu).toEqual([]);
		poser(HEXAGONE);
		await expect.poll(() => recu.at(-1)).toBe(HEXAGONE);
	});

	it('blocs: compte les instructions au niveau, pas les calculs', async () => {
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${HEXAGONE}`, 'niveau: 4e', 'blocs: 4', 'case: 0'),
				answer: caseDeReponse().answer
			}
		});
		await attendreBlocs(screen.container);
		poser(HEXAGONE);
		await expect
			.poll(() => screen.container.querySelector('[data-compteur-blocs]')?.textContent?.trim())
			.toBe('Blocs : 4 / 4');
	});

	it('après la validation : le tracé de l’élève et l’attendu, lus au niveau', async () => {
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${HEXAGONE}`, 'niveau: 4e', 'case: 0'),
				answer: {
					value: 'mettre n à 3 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]',
					isCorrect: false,
					disabled: true,
					onChange: () => {}
				},
				expected: `4e | position | ${HEXAGONE}`
			}
		});
		await attendreBlocs(screen.container);
		await expect
			.poll(() => trace(screen.container, 'attendu')?.querySelectorAll('line').length)
			.toBe(6);
		expect(trace(screen.container, 'eleve')?.querySelectorAll('line')).toHaveLength(3);
	});
});

describe('programme tortue de 4e : le corrigé', () => {
	it('son programme et un programme juste, tracés au niveau', async () => {
		const screen = await render(TortueCorrige, {
			target: mainElement(),
			props: {
				node: node('attendu: ?', 'niveau: 4e'),
				answer: 'mettre n à 3 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]',
				correct: false,
				expected: `4e | position | ${HEXAGONE}`
			}
		});
		const texte = screen.container.textContent ?? '';
		expect(texte).toContain(`Un programme juste : ${HEXAGONE}`);
		expect(texte).not.toContain('pas pris en charge');
		expect(trace(screen.container, 'attendu')?.querySelectorAll('line')).toHaveLength(6);
		expect(trace(screen.container, 'eleve')?.querySelectorAll('line')).toHaveLength(3);
	});

	it('sans réponse attendue : le niveau du bloc', async () => {
		const screen = await render(TortueCorrige, {
			target: mainElement(),
			props: { node: node(`attendu: ${HEXAGONE}`, 'niveau: 4e'), answer: null }
		});
		expect(trace(screen.container, 'eleve')?.querySelectorAll('line')).toHaveLength(6);
	});
});
