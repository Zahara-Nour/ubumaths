/**
 * Une seule liste « Corvées », organisée en sections (2026-10-16)
 * ===============================================================
 *
 * Demande de David : l'édition d'une fiche avait deux blocs, la carte
 * « Sections » et la liste des corvées, qui montraient deux fois les mêmes
 * sections. Les sections se gèrent désormais DANS la liste : on y voit la fiche
 * telle qu'elle sera imprimée. Spécification : `docs/wip/fiche-liste-unique-sections-progress.md`.
 *
 * ⚠️ Le glisser-déposer est rejoué avec la VRAIE séquence d'événements de
 * `svelte-dnd-action` (prise → ombre → entrée dans une autre zone → dépose),
 * comme `ChapterSectionsEditor.svelte.test.ts` : un `finalize` isolé ne prouve
 * rien, ce qui casse est l'ombre qui reprend l'identifiant de la corvée tirée.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import {
	SHADOW_ITEM_MARKER_PROPERTY_NAME,
	SHADOW_PLACEHOLDER_ITEM_ID,
	TRIGGERS
} from 'svelte-dnd-action';
import ExerciseList from '../ExerciseList.svelte';
import { lore } from '$lib/config/lore';
import type { WorksheetExerciseWithExercise, WorksheetSectionRow } from '$lib/types/worksheets';

const FICHE = '808e2eee-162a-4493-81f6-8a945c81db3c';
const QUAND = '2026-10-16T08:00:00.000Z';
const CORVEES = `${lore.learning.exercise.toLowerCase()}s`;

function section(id: string, title: string, position: number, instructions: string | null = null) {
	return {
		id,
		worksheet_id: FICHE,
		title,
		instructions,
		translations: null,
		position,
		points_total: null,
		created_at: QUAND,
		updated_at: QUAND
	} satisfies WorksheetSectionRow;
}

function corvee(id: string, title: string, section_id: string | null, position: number) {
	return {
		id,
		worksheet_id: FICHE,
		exercise_id: `exo-${id}`,
		section_id,
		position,
		points: null,
		variant_mode: 'none',
		is_essential: false,
		exercise: { id: `exo-${id}`, title }
	} as unknown as WorksheetExerciseWithExercise;
}

const CALCUL = section('sec-calcul', 'Calcul', 1, 'Sans calculatrice.');
const PROBLEMES = section('sec-problemes', 'Problèmes', 2);

type Appel = { url: string; method: string; body: unknown };

function stubFetch(reponse: (appel: Appel) => Response = () => json({ success: true })) {
	const appels: Appel[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			const appel = {
				url,
				method: init?.method ?? 'GET',
				body: init?.body ? JSON.parse(String(init.body)) : null
			};
			appels.push(appel);
			return reponse(appel);
		})
	);
	return appels;
}

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

async function monter(opts: {
	sections: WorksheetSectionRow[];
	exercises: WorksheetExerciseWithExercise[];
	readonly?: boolean;
}) {
	const onExercisesChange = vi.fn();
	const onSectionsChange = vi.fn();
	const screen = await render(ExerciseList, {
		worksheetId: FICHE,
		sections: opts.sections,
		exercises: opts.exercises,
		readonly: opts.readonly ?? false,
		onExercisesChange,
		onSectionsChange
	});
	return { el: screen.container as HTMLElement, onExercisesChange, onSectionsChange };
}

function zone(el: HTMLElement, nom: string): HTMLElement {
	const z = el.querySelector<HTMLElement>(`[data-zone="${nom}"]`);
	if (!z) throw new Error(`zone ${nom} absente`);
	return z;
}

// ===== Rejouer svelte-dnd-action =====

type Item = { id: string; [cle: string]: unknown };

function poser(z: HTMLElement, nom: 'consider' | 'finalize', items: Item[], info: object) {
	z.dispatchEvent(new CustomEvent(nom, { detail: { items, info } }));
}

function rendu() {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/** Le geste complet, d'une zone à une autre, tel que la bibliothèque l'émet. */
async function glisser(
	depart: HTMLElement,
	arrivee: HTMLElement,
	tiree: Item,
	resteAuDepart: Item[],
	arriveeApres: Item[]
) {
	const ombre: Item = { ...tiree, [SHADOW_ITEM_MARKER_PROPERTY_NAME]: true };
	ombre.id = SHADOW_PLACEHOLDER_ITEM_ID;
	poser(depart, 'consider', [...resteAuDepart, ombre], {
		trigger: TRIGGERS.DRAG_STARTED,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();
	// L'ombre reprend le VRAI identifiant une fois l'original retiré du DOM.
	ombre.id = tiree.id;
	poser(depart, 'consider', resteAuDepart, {
		trigger: TRIGGERS.DRAGGED_ENTERED_ANOTHER,
		id: tiree.id,
		source: 'pointer'
	});
	poser(
		arrivee,
		'consider',
		arriveeApres.map((x) => (x.id === tiree.id ? ombre : x)),
		{ trigger: TRIGGERS.DRAGGED_ENTERED, id: tiree.id, source: 'pointer' }
	);
	await rendu();
	poser(arrivee, 'finalize', arriveeApres, {
		trigger: TRIGGERS.DROPPED_INTO_ZONE,
		id: tiree.id,
		source: 'pointer'
	});
	poser(depart, 'finalize', resteAuDepart, {
		trigger: TRIGGERS.DROPPED_INTO_ANOTHER,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();
}

/** Prendre puis reposer au même rang, dans la même zone. */
async function glisserSurPlace(z: HTMLElement, items: Item[], tiree: Item) {
	const ombre: Item = { ...tiree, [SHADOW_ITEM_MARKER_PROPERTY_NAME]: true };
	ombre.id = SHADOW_PLACEHOLDER_ITEM_ID;
	poser(
		z,
		'consider',
		items.map((x) => (x.id === tiree.id ? ombre : x)),
		{ trigger: TRIGGERS.DRAG_STARTED, id: tiree.id, source: 'pointer' }
	);
	await rendu();
	ombre.id = tiree.id;
	poser(z, 'finalize', items, {
		trigger: TRIGGERS.DROPPED_INTO_ZONE,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Liste unique — ce qu’on voit', () => {
	it('chaque section montre son titre, ses instructions, son nombre de corvées ; « Sans section » en dernier', async () => {
		stubFetch();
		const { el } = await monter({
			sections: [PROBLEMES, CALCUL],
			exercises: [corvee('c1', 'Fractions', CALCUL.id, 1), corvee('n1', 'Bonus', null, 1)]
		});

		const calcul = zone(el, CALCUL.id).closest('[data-section]') as HTMLElement;
		expect(calcul.textContent).toContain('Calcul');
		expect(calcul.textContent).toContain('Sans calculatrice.');
		expect(calcul.textContent).toContain('(1)');

		const titres = Array.from(el.querySelectorAll('[data-section-title]')).map((t) =>
			t.textContent?.trim()
		);
		expect(titres).toEqual(['Calcul', 'Problèmes', 'Sans section']);
	});

	it('aucune section : pas d’en-tête « Sans section »', async () => {
		stubFetch();
		const { el } = await monter({
			sections: [],
			exercises: [corvee('n1', 'Bonus', null, 1)]
		});
		expect(el.textContent).toContain('Bonus');
		expect(el.textContent).not.toContain('Sans section');
	});

	it('des sections mais aucune corvée : les sections restent visibles, prêtes à recevoir', async () => {
		stubFetch();
		const { el } = await monter({ sections: [CALCUL], exercises: [] });
		expect(el.querySelector(`[data-zone="${CALCUL.id}"]`)).not.toBeNull();
		expect(el.querySelector('[data-zone="sans-section"]')).not.toBeNull();
	});

	it('fiche publiée : lecture seule, mais les instructions restent visibles', async () => {
		stubFetch();
		const { el } = await monter({
			sections: [CALCUL],
			exercises: [corvee('c1', 'Fractions', CALCUL.id, 1)],
			readonly: true
		});
		expect(el.textContent).toContain('Sans calculatrice.');
		expect(el.textContent).not.toContain('Ajouter une section');
		expect(el.querySelector('[aria-label="Modifier la section Calcul"]')).toBeNull();
		expect(el.querySelector('[aria-label="Supprimer la section Calcul"]')).toBeNull();
	});
});

describe('Liste unique — gérer les sections', () => {
	it('ajouter une section : en dernière position, sans toucher aux corvées', async () => {
		const nouvelle = section('sec-bonus', 'Bonus', 3);
		const appels = stubFetch(() => json({ section: nouvelle }, 201));
		const { onSectionsChange } = await monter({ sections: [CALCUL, PROBLEMES], exercises: [] });

		await page.getByRole('button', { name: 'Ajouter une section' }).click();
		const creer = page.getByRole('button', { name: 'Créer' });
		await expect.element(creer).toBeDisabled();
		await page.getByLabelText('Titre *').fill('Bonus');
		await creer.click();

		await expect.poll(() => onSectionsChange.mock.calls.length).toBe(1);
		expect(appels[0]).toMatchObject({
			url: `/api/worksheets/${FICHE}/sections`,
			method: 'POST',
			body: { title: 'Bonus', instructions: null, position: 3 }
		});
		expect(onSectionsChange.mock.calls[0][0]).toEqual([CALCUL, PROBLEMES, nouvelle]);
	});

	it('modifier une section depuis son en-tête', async () => {
		const renommee = { ...CALCUL, title: 'Calcul mental' };
		const appels = stubFetch(() => json({ section: renommee }));
		const { onSectionsChange } = await monter({ sections: [CALCUL], exercises: [] });

		await page.getByRole('button', { name: 'Modifier la section Calcul' }).click();
		await page.getByLabelText('Titre', { exact: true }).fill('Calcul mental');
		await page.getByRole('button', { name: 'Enregistrer' }).click();

		await expect.poll(() => onSectionsChange.mock.calls.length).toBe(1);
		expect(appels[0]).toMatchObject({
			url: `/api/worksheets/${FICHE}/sections/${CALCUL.id}`,
			method: 'PUT',
			body: { title: 'Calcul mental', instructions: 'Sans calculatrice.' }
		});
		expect(onSectionsChange.mock.calls[0][0]).toEqual([renommee]);
	});

	it('supprimer une section : la confirmation dit combien de corvées passent dans « Sans section », et elles y passent', async () => {
		const appels = stubFetch();
		const exercises = [
			corvee('c1', 'Fractions', CALCUL.id, 1),
			corvee('c2', 'Décimaux', CALCUL.id, 2),
			corvee('p1', 'Recette', PROBLEMES.id, 1)
		];
		const { onExercisesChange, onSectionsChange } = await monter({
			sections: [CALCUL, PROBLEMES],
			exercises
		});

		await page.getByRole('button', { name: 'Supprimer la section Calcul' }).click();
		await expect
			.element(page.getByText(`Les 2 ${CORVEES} de cette section passeront dans « Sans section »`))
			.toBeInTheDocument();
		await page.getByRole('button', { name: 'Supprimer', exact: true }).click();

		await expect.poll(() => onSectionsChange.mock.calls.length).toBe(1);
		expect(appels[0]).toMatchObject({
			url: `/api/worksheets/${FICHE}/sections/${CALCUL.id}`,
			method: 'DELETE'
		});
		expect(onSectionsChange.mock.calls[0][0]).toEqual([PROBLEMES]);
		const apres = onExercisesChange.mock.calls[0][0] as WorksheetExerciseWithExercise[];
		expect(apres.map((x) => [x.id, x.section_id])).toEqual([
			['c1', null],
			['c2', null],
			['p1', PROBLEMES.id]
		]);
	});
});

describe('Liste unique — glisser-déposer', () => {
	it('une corvée de « Sans section » déposée dans une section vide : sa section est enregistrée', async () => {
		const appels = stubFetch();
		const bonus = corvee('n1', 'Bonus', null, 1);
		const { el, onExercisesChange } = await monter({ sections: [CALCUL], exercises: [bonus] });

		const item = { id: bonus.id };
		await glisser(zone(el, 'sans-section'), zone(el, CALCUL.id), item, [], [item]);

		expect(appels).toHaveLength(1);
		expect(appels[0]).toMatchObject({
			url: `/api/worksheets/${FICHE}/exercises`,
			method: 'PUT',
			body: { exercises: [{ id: 'n1', position: 1, section_id: CALCUL.id }] }
		});
		const apres = onExercisesChange.mock.calls.at(-1)![0] as WorksheetExerciseWithExercise[];
		expect(apres[0].section_id).toBe(CALCUL.id);
	});

	it('d’une section à une autre, toutes deux remplies : arrivée ET départ renumérotés', async () => {
		const appels = stubFetch();
		const c1 = corvee('c1', 'Fractions', CALCUL.id, 1);
		const c2 = corvee('c2', 'Décimaux', CALCUL.id, 2);
		const c3 = corvee('c3', 'Puissances', CALCUL.id, 3);
		const p1 = corvee('p1', 'Recette', PROBLEMES.id, 1);
		const { el } = await monter({ sections: [CALCUL, PROBLEMES], exercises: [c1, c2, c3, p1] });

		// c1 quitte « Calcul » pour la 2e place de « Problèmes »
		await glisser(
			zone(el, CALCUL.id),
			zone(el, PROBLEMES.id),
			{ id: 'c1' },
			[{ id: 'c2' }, { id: 'c3' }],
			[{ id: 'p1' }, { id: 'c1' }]
		);

		expect(appels).toHaveLength(1);
		expect(appels[0].body).toEqual({
			exercises: [
				{ id: 'c1', position: 2, section_id: PROBLEMES.id },
				{ id: 'c2', position: 1, section_id: CALCUL.id },
				{ id: 'c3', position: 2, section_id: CALCUL.id }
			]
		});
		// Et l'écran suit : c1 est rendue dans « Problèmes », plus dans « Calcul »
		await expect.poll(() => zone(el, PROBLEMES.id).textContent).toContain('Fractions');
		expect(zone(el, CALCUL.id).textContent).not.toContain('Fractions');
	});

	it('déposée sur place : aucun appel', async () => {
		const appels = stubFetch();
		const c1 = corvee('c1', 'Fractions', CALCUL.id, 1);
		const c2 = corvee('c2', 'Décimaux', CALCUL.id, 2);
		const { el } = await monter({ sections: [CALCUL], exercises: [c1, c2] });

		await glisserSurPlace(zone(el, CALCUL.id), [{ id: 'c1' }, { id: 'c2' }], { id: 'c1' });

		expect(appels).toHaveLength(0);
	});

	it('déplacement refusé par le serveur : la liste revient à son état d’avant', async () => {
		stubFetch(() => json({ message: 'Refusé' }, 500));
		const bonus = corvee('n1', 'Bonus', null, 1);
		const { el, onExercisesChange } = await monter({ sections: [CALCUL], exercises: [bonus] });

		const item = { id: bonus.id };
		await glisser(zone(el, 'sans-section'), zone(el, CALCUL.id), item, [], [item]);

		await expect.poll(() => onExercisesChange.mock.calls.length).toBe(2);
		expect(onExercisesChange.mock.calls[1][0]).toEqual([bonus]);
		// À l'écran : revenue dans « Sans section », absente de « Calcul »
		await expect.poll(() => zone(el, 'sans-section').textContent).toContain('Bonus');
		expect(zone(el, CALCUL.id).textContent).not.toContain('Bonus');
	});

	it('déplacer une section : le nouvel ordre est enregistré', async () => {
		const appels = stubFetch();
		const { el, onSectionsChange } = await monter({
			sections: [CALCUL, PROBLEMES],
			exercises: []
		});

		const sections = zone(el, 'sections');
		const tiree = { id: PROBLEMES.id };
		const ombre: Item = { ...tiree, [SHADOW_ITEM_MARKER_PROPERTY_NAME]: true };
		ombre.id = SHADOW_PLACEHOLDER_ITEM_ID;
		poser(sections, 'consider', [{ id: CALCUL.id }, ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: tiree.id,
			source: 'pointer'
		});
		await rendu();
		ombre.id = tiree.id;
		poser(sections, 'consider', [ombre, { id: CALCUL.id }], {
			trigger: TRIGGERS.DRAGGED_OVER_INDEX,
			id: tiree.id,
			source: 'pointer'
		});
		await rendu();
		poser(sections, 'finalize', [tiree, { id: CALCUL.id }], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: tiree.id,
			source: 'pointer'
		});
		await rendu();

		expect(appels).toHaveLength(1);
		expect(appels[0]).toMatchObject({
			url: `/api/worksheets/${FICHE}/sections`,
			method: 'PUT',
			body: {
				sections: [
					{ id: PROBLEMES.id, position: 1 },
					{ id: CALCUL.id, position: 2 }
				]
			}
		});
		const apres = onSectionsChange.mock.calls.at(-1)![0] as WorksheetSectionRow[];
		expect(apres.map((x) => [x.id, x.position])).toEqual([
			[CALCUL.id, 2],
			[PROBLEMES.id, 1]
		]);
	});
});
