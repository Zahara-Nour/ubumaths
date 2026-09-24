/**
 * Déplacer une carte d'une colonne à l'autre doit l'ENREGISTRER
 * ==============================================================
 *
 * Même question que pour le plan de chapitre (`ChapterSectionsEditor`), et pour
 * la même raison : `svelte-dnd-action` laisse une copie « ombre » dans la zone
 * survolée et lui REND l'identifiant de l'élément tiré. Un code qui demande aux
 * zones, au moment de la dépose, d'où vient l'élément, s'entend répondre « il
 * est déjà ici, au même rang » — et n'enregistre rien.
 *
 * ⚠️ La séquence d'événements est transcrite de la bibliothèque (0.9.69,
 * `handleDragStart` / `handleDraggedEntered` / `handleDrop`), l'étape qui casse
 * comprise. Fabriquer un `finalize` isolé ne prouverait rien.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	SHADOW_ITEM_MARKER_PROPERTY_NAME,
	SHADOW_PLACEHOLDER_ITEM_ID,
	TRIGGERS
} from 'svelte-dnd-action';
import KanbanBoardPage from '../+page.svelte';

const TABLEAU = '11111111-1111-4111-8111-111111111111';
const A_FAIRE = '22222222-2222-4222-8222-222222222222';
const EN_COURS = '33333333-3333-4333-8333-333333333333';
const CARTE = '44444444-4444-4444-8444-444444444444';
const PROPRIETAIRE = '55555555-5555-4555-8555-555555555555';
const QUAND = '2026-05-26T21:27:48.983Z';

/** Ce que la zone de dépose manipule : un identifiant, et le reste en vrac. */
type Element = { id: string; [cle: string]: unknown };

const CARTE_TIREE: Element = {
	id: CARTE,
	column_id: A_FAIRE,
	title: 'Relire le chapitre 3',
	description: null,
	due_date: null,
	position: 0,
	created_at: QUAND,
	updated_at: QUAND,
	tag_ids: [],
	assignee_ids: []
};

function poser(zone: HTMLElement, nom: 'consider' | 'finalize', items: Element[], detail: object) {
	zone.dispatchEvent(new CustomEvent(nom, { detail: { items, info: detail } }));
}

/** Laisse Svelte rendre — la bibliothèque, elle, attend une frame. */
function rendu() {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/**
 * Les zones de dépose, dans l'ordre du DOM : d'abord celle des colonnes
 * (elles se réordonnent aussi), puis les cartes de chaque colonne.
 */
function zonesDeDepose(racine: HTMLElement) {
	const listes = Array.from(racine.querySelectorAll<HTMLElement>('[role="list"]'));
	return { colonnes: listes[0], aFaire: listes[1], enCours: listes[2] };
}

const AUTRE_CARTE: Element = {
	...CARTE_TIREE,
	id: '66666666-6666-4666-8666-666666666666',
	title: 'Préparer le contrôle',
	position: 1
};

async function monter(cartesAFaire: Element[] = [CARTE_TIREE], refuse = false) {
	const appels: { url: string; method?: string; body: unknown }[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			appels.push({
				url,
				method: init?.method,
				body: init?.body ? JSON.parse(String(init.body)) : null
			});
			return refuse
				? new Response(JSON.stringify({ error: 'Refusé' }), { status: 500 })
				: new Response(JSON.stringify({ card: { ...CARTE_TIREE, column_id: EN_COURS } }), {
						status: 200
					});
		})
	);

	const { container } = await render(KanbanBoardPage, {
		data: {
			board: {
				id: TABLEAU,
				title: 'Mon tableau',
				class_id: null,
				owner_id: PROPRIETAIRE,
				created_at: QUAND,
				updated_at: QUAND,
				tags: [],
				members: [],
				columns: [
					{
						id: A_FAIRE,
						board_id: TABLEAU,
						title: 'A faire',
						position: 0,
						created_at: QUAND,
						cards: cartesAFaire
					},
					{
						id: EN_COURS,
						board_id: TABLEAU,
						title: 'En cours',
						position: 1,
						created_at: QUAND,
						cards: []
					}
				]
			},
			userId: PROPRIETAIRE,
			isOwner: true
			// Le `data` d'une page porte aussi ce que pose le layout ; la page n'en
			// lit rien d'autre que ce qui est fourni ci-dessus.
		} as unknown as Parameters<typeof KanbanBoardPage>[1]['data']
	});

	return { appels, zones: zonesDeDepose(container as HTMLElement) };
}

describe('Kanban — déplacer une carte entre deux colonnes', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('enregistre le changement de colonne', async () => {
		const { appels, zones } = await monter();

		// 1. La prise : l'ombre REMPLACE la carte dans sa colonne.
		const ombre: Element = {
			...CARTE_TIREE,
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser(zones.aFaire, 'consider', [ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		// 2. ⚠️ L'étape qui casse : la bibliothèque rend son vrai identifiant à
		//    l'ombre, sur le MÊME objet, une fois l'élément d'origine retiré du DOM.
		ombre.id = CARTE;

		// 3. L'ombre quitte « A faire » et entre dans « En cours ».
		poser(zones.aFaire, 'consider', [], {
			trigger: TRIGGERS.DRAGGED_ENTERED_ANOTHER,
			id: CARTE,
			source: 'pointer'
		});
		poser(zones.enCours, 'consider', [ombre], {
			trigger: TRIGGERS.DRAGGED_ENTERED,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		// 4. La dépose : l'ombre redevient la carte, dans la colonne d'arrivée.
		poser(zones.enCours, 'finalize', [CARTE_TIREE], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: CARTE,
			source: 'pointer'
		});
		poser(zones.aFaire, 'finalize', [], {
			trigger: TRIGGERS.DROPPED_INTO_ANOTHER,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		// L'écran, lui, montre le déplacement — c'est ce qui rend le défaut
		// invisible. Sans cette vérification, un test muet prouverait seulement
		// que les événements n'ont atteint personne.
		const porte = (zone: HTMLElement) =>
			Array.from(zone.children).filter((l) => l.textContent?.includes('Relire le chapitre 3'))
				.length;
		expect([porte(zones.aFaire), porte(zones.enCours)]).toEqual([0, 1]);

		const patch = appels.find((a) => a.url.includes(`/cards/${CARTE}`));
		expect(patch).toBeDefined();
		expect(patch?.method).toBe('PATCH');
		expect(patch?.body).toMatchObject({ column_id: EN_COURS });
	});
});

describe('Kanban — réordonner dans la même colonne', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/**
	 * Le même geste, sans changer de colonne. Il se comporte différemment — et
	 * c'est ce qui rend le défaut trompeur : ce qu'on essaie d'abord marche.
	 */
	it('enregistre le nouvel ordre', async () => {
		const { appels, zones } = await monter([CARTE_TIREE, AUTRE_CARTE]);

		const ombre: Element = {
			...CARTE_TIREE,
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser(zones.aFaire, 'consider', [ombre, AUTRE_CARTE], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();
		ombre.id = CARTE;

		poser(zones.aFaire, 'consider', [AUTRE_CARTE, ombre], {
			trigger: TRIGGERS.DRAGGED_OVER_INDEX,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		poser(zones.aFaire, 'finalize', [AUTRE_CARTE, CARTE_TIREE], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		const patch = appels.find((a) => a.url.includes(`/cards/${CARTE}`));
		expect(patch?.method).toBe('PATCH');
	});
});

describe('Kanban — les colonnes, et ce qu’un refus doit rendre', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/** Les colonnes se glissent aussi, et l'ombre y tend le même piège. */
	it('enregistre le nouvel ordre des colonnes', async () => {
		const { appels, zones } = await monter();

		// ⚠️ La zone ne contient QUE des colonnes : `dndzone` apparie ses enfants
		// directs avec `items` par index, et le bloc « Créer une colonne » y
		// ajoutait un enfant de trop — traînable, et désignant un élément absent.
		expect(zones.colonnes.children).toHaveLength(2);

		const aFaire: Element = { id: A_FAIRE, title: 'A faire', position: 0, cards: [] };
		const enCours: Element = { id: EN_COURS, title: 'En cours', position: 1, cards: [] };
		const ombre: Element = {
			...aFaire,
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};

		poser(zones.colonnes, 'consider', [ombre, enCours], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: A_FAIRE,
			source: 'pointer'
		});
		await rendu();
		ombre.id = A_FAIRE;

		poser(zones.colonnes, 'consider', [enCours, ombre], {
			trigger: TRIGGERS.DRAGGED_OVER_INDEX,
			id: A_FAIRE,
			source: 'pointer'
		});
		await rendu();

		poser(zones.colonnes, 'finalize', [enCours, aFaire], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: A_FAIRE,
			source: 'pointer'
		});
		await rendu();

		const patch = appels.find((a) => a.url.includes(`/columns/${A_FAIRE}`));
		expect(patch?.method).toBe('PATCH');
	});

	/**
	 * Un refus du serveur doit rendre la carte à sa colonne de départ — une
	 * seule fois. L'écran qui garde le déplacement ment comme le bug d'origine,
	 * et une carte en double lève `each_key_duplicate`.
	 */
	it('remet la carte dans sa colonne quand le serveur refuse', async () => {
		const { zones } = await monter([CARTE_TIREE], true);

		const ombre: Element = {
			...CARTE_TIREE,
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser(zones.aFaire, 'consider', [ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();
		ombre.id = CARTE;

		poser(zones.aFaire, 'consider', [], {
			trigger: TRIGGERS.DRAGGED_ENTERED_ANOTHER,
			id: CARTE,
			source: 'pointer'
		});
		poser(zones.enCours, 'consider', [ombre], {
			trigger: TRIGGERS.DRAGGED_ENTERED,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		poser(zones.enCours, 'finalize', [CARTE_TIREE], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: CARTE,
			source: 'pointer'
		});
		poser(zones.aFaire, 'finalize', [], {
			trigger: TRIGGERS.DROPPED_INTO_ANOTHER,
			id: CARTE,
			source: 'pointer'
		});
		await rendu();

		const porte = (zone: HTMLElement) =>
			Array.from(zone.children).filter((l) => l.textContent?.includes('Relire le chapitre 3'))
				.length;
		expect([porte(zones.aFaire), porte(zones.enCours)]).toEqual([1, 0]);
	});
});
