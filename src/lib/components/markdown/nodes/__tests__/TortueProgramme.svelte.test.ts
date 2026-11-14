/**
 * Programme tortue à l'écran (chantier `docs/wip/blockly-progress.md`, PR 4b)
 *
 * Phase 0 (PR 4) : blocs + quadrillage dans la carte ; programme vide → réponse vide ; trop
 * long → refusé avant l'envoi ; après la validation, tracé de l'élève en couleur, attendu en
 * pointillés ; corrigé : programme de référence en texte + figure ; évaluation notée : jamais
 * l'attendu.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import * as Blockly from 'blockly';
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import TortueProgramme from '../TortueProgramme.svelte';
import TortueCorrige from '../TortueCorrige.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import { parseTortueContent } from '$lib/ubumark/parser/tortue-parser';
import { texteVersEtat, LONGUEUR_MAX_PROGRAMME } from '$lib/shared/blockly/tortue/notation';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(async () => {
	for (const m of mains) m.remove();
	mains = [];
	await page.viewport(1280, 900);
});

const CARRE = 'répéter 4 [ avancer 3 ; tourner à droite 90 ]';
const node = (...lines: string[]) => parseTortueContent(lines.join('\n'));
const CARRE_MONTRE = node(`attendu: ${CARRE}`, 'montrer: oui', 'case: 0');

/** Tracés dessinés (`data-trace` de TortueCanvas) */
const trace = (root: Element, nom: 'modele' | 'eleve' | 'attendu') =>
	root.querySelector(`[data-trace="${nom}"]`);

/** L'espace de travail Blockly prêt (chargé à la demande) */
async function attendreBlocs(root: Element): Promise<void> {
	await expect
		.poll(() => root.querySelector('[aria-label="Espace de travail Blockly"] svg'), {
			timeout: 15_000
		})
		.not.toBeNull();
}

function poser(texte: string): void {
	const lu = texteVersEtat(texte);
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

describe('programme tortue : la carte', () => {
	it('montrer: oui : la figure à reproduire en gris, l’éditeur chargé à la demande', async () => {
		const { answer } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: CARRE_MONTRE, answer }
		});
		expect(trace(screen.container, 'modele')?.querySelectorAll('line')).toHaveLength(4);
		await attendreBlocs(screen.container);
		expect(screen.container.textContent).toContain('Lancer');
		// Avant la validation : jamais l'attendu en pointillés
		expect(trace(screen.container, 'attendu')).toBeNull();
	});

	it('montrer: non : aucune figure', async () => {
		const { answer } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: node(`attendu: ${CARRE}`, 'case: 0'), answer }
		});
		expect(trace(screen.container, 'modele')).toBeNull();
	});

	it('les blocs posés deviennent la réponse, en texte', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: CARRE_MONTRE, answer }
		});
		await attendreBlocs(screen.container);
		poser('avancer 2 ; tourner à gauche 90');
		await expect.poll(() => recu.at(-1)).toBe('avancer 2 ; tourner à gauche 90');
	});

	it('programme vidé : réponse vide (Valider grisé)', async () => {
		const { answer, recu } = caseDeReponse('avancer 2');
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: CARRE_MONTRE, answer }
		});
		await attendreBlocs(screen.container);
		// La réponse déjà donnée revient en blocs, sans être renvoyée
		await expect.poll(() => Blockly.getMainWorkspace().getAllBlocks(false).length).toBe(2);
		expect(recu).toEqual([]);
		Blockly.getMainWorkspace().clear();
		await expect.poll(() => recu.at(-1)).toBe('');
	});

	it('programme trop long : refusé avant l’envoi, réponse vide et message', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: CARRE_MONTRE, answer }
		});
		await attendreBlocs(screen.container);
		const long = Array.from({ length: 200 }, () => 'avancer 1').join(' ; ');
		expect(long.length).toBeGreaterThan(LONGUEUR_MAX_PROGRAMME);
		// Chargé bloc par bloc : la notation du texte refuserait de le lire
		const etat = texteVersEtat('avancer 1');
		if (!etat.ok) throw new Error(etat.message);
		const bloc = etat.etat.blocks.blocks[0];
		let tete: Record<string, unknown> = { ...bloc };
		for (let i = 1; i < 200; i++) tete = { ...bloc, next: { block: tete } };
		Blockly.serialization.workspaces.load(
			{ blocks: { languageVersion: 0, blocks: [tete] } },
			Blockly.getMainWorkspace()
		);
		await expect.poll(() => recu.at(-1)).toBe('');
		await expect
			.poll(() => screen.container.querySelector('[role="alert"]')?.textContent ?? '')
			.toContain('Programme trop long');
	});

	it('après la validation : tracé de l’élève en rouge, attendu en pointillés, blocs verrouillés', async () => {
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: {
				node: CARRE_MONTRE,
				answer: { value: 'avancer 3', isCorrect: false, disabled: true, onChange: () => {} }
			}
		});
		await attendreBlocs(screen.container);
		await expect.poll(() => trace(screen.container, 'attendu')).not.toBeNull();
		expect(trace(screen.container, 'attendu')?.querySelectorAll('line')).toHaveLength(4);
		const eleve = trace(screen.container, 'eleve');
		expect(eleve?.classList.contains('trace-faux')).toBe(true);
		// Tracé final du programme de l'élève, tout de suite (un segment)
		expect(eleve?.querySelectorAll('line')).toHaveLength(1);
		expect(screen.container.textContent).not.toContain('Effacer');
	});

	it.each([
		{ cas: 'attendu vide (case publique)', expected: '' },
		{ cas: 'attendu absent', expected: undefined }
	])(
		'évaluation notée (attendu: ?, $cas) : jamais d’attendu en pointillés, même après la validation',
		async ({ expected }) => {
			const screen = await render(TortueProgramme, {
				target: mainElement(),
				props: {
					node: node('attendu: ?', 'montrer: oui', 'figure: 0 0 3 0', 'case: 0'),
					answer: { value: 'avancer 2', isCorrect: false, disabled: true, onChange: () => {} },
					expected
				}
			});
			await attendreBlocs(screen.container);
			expect(trace(screen.container, 'modele')?.querySelectorAll('line')).toHaveLength(1);
			expect(trace(screen.container, 'attendu')).toBeNull();
		}
	);

	it('réponse relue écrite autrement (point décimal) : pas renvoyée au chargement', async () => {
		const { answer, recu } = caseDeReponse('avancer 2.5');
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: CARRE_MONTRE, answer }
		});
		await attendreBlocs(screen.container);
		await expect.poll(() => Blockly.getMainWorkspace().getAllBlocks(false).length).toBe(2);
		await new Promise((r) => setTimeout(r, 300));
		expect(recu).toEqual([]);
	});

	it('sur téléphone : onglets Blocs / Tortue, « Lancer » montre le quadrillage', async () => {
		await page.viewport(390, 844);
		const { answer } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: { node: CARRE_MONTRE, answer }
		});
		await attendreBlocs(screen.container);
		const quadrillage = page.getByRole('img', { name: /Tracé de la tortue/, includeHidden: true });
		await expect.element(quadrillage).not.toBeVisible();
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect
			.element(page.getByRole('tab', { name: 'Tortue' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(quadrillage).toBeVisible();
	});

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-tortue',
				title: 'Carré',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Trace un carré.', '', '```tortue', `attendu: ${CARRE}`, '```'].join('\n')
						)
					}
				],
				grades: ['CM1'],
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.instance.statement,
				blanks: generated.instance.blanks ?? [],
				values,
				validationResults: []
			}
		});
		await attendreBlocs(screen.container);
		poser('avancer 3');
		await expect.poll(() => values[0]).toBe('avancer 3');
	});
});

describe('programme tortue : le corrigé', () => {
	it('réponse fausse : son programme, un programme juste, l’attendu en pointillés', async () => {
		const screen = await render(TortueCorrige, {
			target: mainElement(),
			props: {
				node: node('attendu: ?', 'montrer: non'),
				answer: 'avancer 3',
				correct: false,
				expected: `position | ${CARRE}`
			}
		});
		const texte = screen.container.textContent ?? '';
		expect(texte).toContain('Ton programme');
		expect(texte).toContain('avancer 3');
		expect(texte).toContain(`Un programme juste : ${CARRE}`);
		expect(trace(screen.container, 'attendu')?.querySelectorAll('line')).toHaveLength(4);
		expect(trace(screen.container, 'eleve')?.classList.contains('trace-faux')).toBe(true);
	});

	it('sans réponse : le tracé juste et le programme de référence', async () => {
		const screen = await render(TortueCorrige, {
			target: mainElement(),
			props: { node: node(`attendu: ${CARRE}`), answer: null }
		});
		expect(trace(screen.container, 'eleve')?.querySelectorAll('line')).toHaveLength(4);
		expect(screen.container.textContent).toContain(`Un programme juste : ${CARRE}`);
	});

	it('référence inconnue (énoncé masqué, rien de plus) : aucun programme juste inventé', async () => {
		const screen = await render(TortueCorrige, {
			target: mainElement(),
			props: { node: node('attendu: ?'), answer: 'avancer 2', correct: false }
		});
		expect(screen.container.textContent).not.toContain('Un programme juste');
		expect(trace(screen.container, 'attendu')).toBeNull();
	});
});
