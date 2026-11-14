/**
 * Programme de calcul à l'écran (chantier `docs/wip/blockly-progress.md`, PR 5b)
 *
 * Phase 0 (PR 5, Q4) : blocs + « Essayer avec » + Lancer + affichages ; programme vide → réponse
 * vide ; trop long → refusé avant l'envoi ; `départ:` posé dans l'espace de travail ; corrigé =
 * programme de référence + tableau nombre → résultat sur les essais ; évaluation notée : jamais
 * la référence.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import * as Blockly from 'blockly';
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import CalculProgramme from '../CalculProgramme.svelte';
import CalculCorrige from '../CalculCorrige.svelte';
import TortueProgramme from '../TortueProgramme.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import { parseCalculContent } from '$lib/ubumark/parser/calcul-parser';
import { parseTortueContent } from '$lib/ubumark/parser/tortue-parser';
import { texteVersEtatCalcul } from '$lib/shared/blockly/calcul/notation';
import { LONGUEUR_MAX_PROGRAMME } from '$lib/shared/blockly/tortue/notation';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

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

const ATTENDU = 'afficher (nombre + 2) × 4';
const node = (...lines: string[]) => parseCalculContent(lines.join('\n'));
const QUESTION = node(`attendu: ${ATTENDU}`, 'case: 0');

/** L'espace de travail Blockly prêt (chargé à la demande) */
async function attendreBlocs(root: Element): Promise<void> {
	await expect
		.poll(() => root.querySelector('[aria-label="Espace de travail Blockly"] svg'), {
			timeout: 15_000
		})
		.not.toBeNull();
}

function poser(texte: string): void {
	const lu = texteVersEtatCalcul(texte);
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

const sortie = (root: Element) => root.querySelector('.calcul-sortie')?.textContent ?? '';

describe('programme de calcul : la carte', () => {
	it('les blocs posés deviennent la réponse, en texte', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: QUESTION, answer }
		});
		await attendreBlocs(screen.container);
		poser('afficher nombre × 4 + 8');
		await expect.poll(() => recu.at(-1)).toBe('afficher nombre × 4 + 8');
	});

	it('« Essayer avec » : Lancer montre ce que le programme affiche pour ce nombre', async () => {
		const { answer } = caseDeReponse();
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: QUESTION, answer }
		});
		await attendreBlocs(screen.container);
		poser('résultat = nombre + 2 ; afficher résultat × 4 ; afficher résultat');
		const champ = page.getByLabelText('Essayer avec');
		await champ.fill('2,5');
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect
			.poll(() => sortie(screen.container))
			.toContain('Avec 2,5, le programme affiche : 18 ; 4,5');
		// Entrée relance avec un autre nombre (sans valider la question)
		await champ.fill('−3');
		await userEvent.keyboard('{Enter}');
		await expect
			.poll(() => sortie(screen.container))
			.toContain('Avec −3, le programme affiche : −4 ; −1');
	});

	it('nombre illisible, rien d’affiché, division par zéro : un message clair', async () => {
		const { answer } = caseDeReponse();
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: QUESTION, answer }
		});
		await attendreBlocs(screen.container);
		const champ = page.getByLabelText('Essayer avec');
		const lancer = page.getByRole('button', { name: 'Lancer' });

		await champ.fill('trois');
		await lancer.click();
		await expect.poll(() => sortie(screen.container)).toContain('Écris un nombre');

		poser('résultat = nombre × 2');
		await champ.fill('3');
		await lancer.click();
		await expect.poll(() => sortie(screen.container)).toContain('le programme n’affiche rien');

		poser('afficher nombre ; afficher 1 ÷ (nombre − 3)');
		await lancer.click();
		await expect.poll(() => sortie(screen.container)).toContain('affiche : 3');
		expect(sortie(screen.container)).toContain('Division par zéro');
	});

	it('modifier les blocs efface le dernier lancer', async () => {
		const { answer } = caseDeReponse();
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: QUESTION, answer }
		});
		await attendreBlocs(screen.container);
		poser('afficher nombre');
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect.poll(() => sortie(screen.container)).toContain('affiche : 5');
		poser('afficher nombre + 1');
		await expect.poll(() => sortie(screen.container)).toBe('');
	});

	it('programme vidé : réponse vide (Valider grisé)', async () => {
		const { answer, recu } = caseDeReponse('afficher nombre + 2');
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: QUESTION, answer }
		});
		await attendreBlocs(screen.container);
		// La réponse déjà donnée revient en blocs, sans être renvoyée
		await expect.poll(() => Blockly.getMainWorkspace().getAllBlocks(false).length).toBe(4);
		expect(recu).toEqual([]);
		Blockly.getMainWorkspace().clear();
		await expect.poll(() => recu.at(-1)).toBe('');
	});

	it('programme trop long : refusé avant l’envoi, réponse vide et message', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: QUESTION, answer }
		});
		await attendreBlocs(screen.container);
		const etat = texteVersEtatCalcul('afficher nombre + 1');
		if (!etat.ok) throw new Error(etat.message);
		const bloc = etat.etat.blocks.blocks[0];
		let tete: Record<string, unknown> = { ...bloc };
		for (let i = 1; i < 150; i++) tete = { ...bloc, next: { block: tete } };
		Blockly.serialization.workspaces.load(
			{ blocks: { languageVersion: 0, blocks: [tete] } },
			Blockly.getMainWorkspace()
		);
		expect(150 * 'afficher nombre + 1 ; '.length).toBeGreaterThan(LONGUEUR_MAX_PROGRAMME);
		await expect.poll(() => recu.at(-1)).toBe('');
		await expect
			.poll(() => screen.container.querySelector('[role="alert"]')?.textContent ?? '')
			.toContain('Programme trop long');
	});

	it('départ: posé dans l’espace de travail, réponse seulement au premier changement', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: { node: node(`attendu: ${ATTENDU}`, 'départ: afficher nombre + 2', 'case: 0'), answer }
		});
		await attendreBlocs(screen.container);
		await expect.poll(() => Blockly.getMainWorkspace().getAllBlocks(false).length).toBe(4);
		await new Promise((r) => setTimeout(r, 300));
		expect(recu).toEqual([]);
		poser('afficher (nombre + 2) × 4');
		await expect.poll(() => recu.at(-1)).toBe(ATTENDU);
	});

	it('verrouillé sans réponse : pas le programme de départ (il n’est pas celui de l’élève)', async () => {
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${ATTENDU}`, 'départ: afficher nombre + 2', 'case: 0'),
				answer: { value: '', isCorrect: null, disabled: true, onChange: () => {} }
			}
		});
		await attendreBlocs(screen.container);
		await new Promise((r) => setTimeout(r, 300));
		expect(Blockly.getMainWorkspace().getAllBlocks(false)).toHaveLength(0);
	});

	it('après la validation : cadre rouge, blocs verrouillés, on peut encore essayer', async () => {
		const screen = await render(CalculProgramme, {
			target: mainElement(),
			props: {
				node: QUESTION,
				answer: {
					value: 'afficher nombre + 2',
					isCorrect: false,
					disabled: true,
					onChange: () => {}
				}
			}
		});
		await attendreBlocs(screen.container);
		expect(screen.container.querySelector('.calcul-faux')).not.toBeNull();
		expect(screen.container.textContent).not.toContain('Effacer');
		await expect.poll(() => Blockly.getMainWorkspace().getAllBlocks(false).length).toBe(4);
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect.poll(() => sortie(screen.container)).toContain('affiche : 7');
	});

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-calcul',
				title: 'Programme',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							[
								'Ajoute 2, puis multiplie par 4.',
								'',
								'```calcul',
								`attendu: ${ATTENDU}`,
								'```'
							].join('\n')
						)
					}
				],
				grades: ['5'],
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
		poser('afficher nombre × 4 + 8');
		await expect.poll(() => values[0]).toBe('afficher nombre × 4 + 8');
	});
});

describe('programme tortue : départ:', () => {
	it('posé dans l’espace de travail, réponse seulement au premier changement', async () => {
		const { answer, recu } = caseDeReponse();
		const screen = await render(TortueProgramme, {
			target: mainElement(),
			props: {
				node: parseTortueContent(['attendu: avancer 4', 'départ: avancer 2', 'case: 0'].join('\n')),
				answer
			}
		});
		await attendreBlocs(screen.container);
		await expect.poll(() => Blockly.getMainWorkspace().getAllBlocks(false).length).toBe(2);
		await new Promise((r) => setTimeout(r, 300));
		expect(recu).toEqual([]);
	});
});

describe('programme de calcul : le corrigé', () => {
	const ligne = (root: Element, nombre: string) =>
		[...root.querySelectorAll('tbody tr')].find(
			(tr) => tr.querySelector('th')?.textContent?.trim() === nombre
		);

	it('réponse fausse : son programme, un programme juste, le tableau des essais', async () => {
		const screen = await render(CalculCorrige, {
			target: mainElement(),
			props: {
				node: node('attendu: ?'),
				answer: 'afficher nombre × 2 + 4',
				correct: false,
				expected: `0 ; 2 ; 5 | ${ATTENDU}`
			}
		});
		const texte = screen.container.textContent ?? '';
		expect(texte).toContain('Ton programme : afficher nombre × 2 + 4');
		expect(texte).toContain(`Un programme juste : ${ATTENDU}`);
		expect(screen.container.querySelectorAll('tbody tr')).toHaveLength(3);
		// 0 : 4 et 8 (faux) ; 2 : 8 et 16 ; 5 : 14 et 28
		const zero = ligne(screen.container, '0');
		expect(zero?.getAttribute('data-juste')).toBe('false');
		expect([...(zero?.querySelectorAll('td') ?? [])].map((td) => td.textContent?.trim())).toEqual([
			'4',
			'8'
		]);
	});

	it('une ligne juste n’est pas marquée fausse', async () => {
		const screen = await render(CalculCorrige, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${ATTENDU}`, 'essais: −2 ; 1'),
				answer: 'afficher nombre × 8',
				correct: false
			}
		});
		// −2 : −16 au lieu de 0 → faux
		expect(ligne(screen.container, '−2')?.getAttribute('data-juste')).toBe('false');
		const juste = await render(CalculCorrige, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${ATTENDU}`, 'essais: −2 ; 1'),
				answer: 'afficher 4 × nombre + 8',
				correct: true
			}
		});
		expect(juste.container.querySelectorAll('[data-juste="true"]')).toHaveLength(2);
	});

	it('programme qui n’affiche rien : « rien » et le message', async () => {
		const screen = await render(CalculCorrige, {
			target: mainElement(),
			props: {
				node: node(`attendu: ${ATTENDU}`, 'essais: 1'),
				answer: 'résultat = nombre',
				correct: false
			}
		});
		expect(ligne(screen.container, '1')?.querySelector('td')?.textContent?.trim()).toBe('rien');
		expect(screen.container.textContent).toContain('Ton programme n’affiche rien.');
	});

	it('sans réponse : le programme de référence et ce qu’il affiche', async () => {
		const screen = await render(CalculCorrige, {
			target: mainElement(),
			props: { node: node(`attendu: ${ATTENDU}`, 'essais: 0 ; 1'), answer: null }
		});
		expect(screen.container.textContent).toContain(`Un programme juste : ${ATTENDU}`);
		expect(screen.container.textContent).toContain('Le programme affiche');
		expect(ligne(screen.container, '1')?.querySelector('td')?.textContent?.trim()).toBe('12');
	});

	it('référence inconnue (énoncé masqué, rien de plus) : aucun programme juste inventé', async () => {
		const screen = await render(CalculCorrige, {
			target: mainElement(),
			props: { node: node('attendu: ?', 'essais: 1'), answer: 'afficher nombre', correct: false }
		});
		expect(screen.container.textContent).not.toContain('Un programme juste');
		expect(screen.container.textContent).not.toContain('Il fallait afficher');
		expect(ligne(screen.container, '1')?.querySelectorAll('td')).toHaveLength(1);
	});
});
