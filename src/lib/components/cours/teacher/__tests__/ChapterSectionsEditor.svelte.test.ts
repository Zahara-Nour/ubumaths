/**
 * Ranger une ressource par glisser-déposer doit l'ENREGISTRER
 * ===========================================================
 *
 * Le plan du chapitre gardait le déplacement à l'écran sans jamais l'écrire :
 * le professeur voyait son document dans « Le cours », et le rechargement le
 * remettait en « Non classé », sans le moindre message. Ces tests portent sur
 * le seul fait qui compte — l'appel de rangement part-il, et vers quelle
 * section ?
 *
 * ⚠️ La suite REJOUE la séquence d'événements de `svelte-dnd-action` (0.9.69),
 * transcrite de `dist/index.mjs` — `handleDragStart`, `handleDraggedEntered`,
 * `handleDrop`. Fabriquer un `finalize` isolé ne prouverait rien : ce qui casse
 * est justement une étape intermédiaire — la bibliothèque rend son VRAI
 * identifiant à la copie « ombre » dès que Svelte a retiré l'élément d'origine
 * du DOM. La zone d'arrivée contient alors un élément qui porte l'identifiant
 * de la ressource tirée, et le plan croyait la voir DÉJÀ rangée là.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	SHADOW_ITEM_MARKER_PROPERTY_NAME,
	SHADOW_PLACEHOLDER_ITEM_ID,
	TRIGGERS
} from 'svelte-dnd-action';
import type { ChapterDocument, ChapterSection } from '$lib/types/chapters';
import ChapterSectionsEditor from '../ChapterSectionsEditor.svelte';

const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const COURS = '22222222-2222-4222-8222-222222222222';
const METHODES = '33333333-3333-4333-8333-333333333333';
const DOCUMENT = '44444444-4444-4444-8444-444444444444';
const QUAND = '2026-09-14T05:36:02.215Z';

function section(id: string, title: string, displayOrder: number): ChapterSection {
	return { id, chapterId: CHAPITRE, title, displayOrder, createdAt: QUAND, updatedAt: QUAND };
}

function document(sectionId: string | null): ChapterDocument {
	return {
		id: DOCUMENT,
		chapterId: CHAPITRE,
		title: 'Les Fonctions',
		description: null,
		sourceType: 'upload',
		storagePath: 'chapitres/les-fonctions.pdf',
		fileName: 'les-fonctions.pdf',
		mimeType: 'application/pdf',
		fileSize: 1024,
		googleFileId: null,
		googleDriveUrl: null,
		thumbnailUrl: null,
		displayOrder: 0,
		sectionId,
		sectionOrder: 0,
		createdAt: QUAND,
		updatedAt: QUAND,
		publishedAt: null
	};
}

/** Ce que la zone de dépose manipule : un identifiant, et le reste en vrac. */
type Element = { id: string; [cle: string]: unknown };

function poser(zone: HTMLElement, nom: 'consider' | 'finalize', items: Element[], detail: object) {
	zone.dispatchEvent(new CustomEvent(nom, { detail: { items, info: detail } }));
}

/**
 * Les zones de dépose, dans l'ordre du DOM.
 *
 * `svelte-dnd-action` pose `role="list"` sur chacune : la première est la liste
 * des sections elle-même (elles se réordonnent aussi), viennent ensuite les
 * ressources de chaque section, et « Non classé » en dernier.
 */
function zonesDeDepose(racine: HTMLElement) {
	const listes = Array.from(racine.querySelectorAll<HTMLElement>('[role="list"]'));
	return { sections: listes[0], cours: listes[1], methodes: listes[2], nonClassees: listes[3] };
}

/** Laisse Svelte rendre — la bibliothèque, elle, attend une frame. */
function rendu() {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/**
 * Le geste complet, de la prise à la dépose, tel que la bibliothèque l'émet.
 *
 * @param depart     la zone d'où part la ressource
 * @param arrivee    la zone qui reçoit
 * @param tiree      la ressource tirée, telle que le plan l'a construite
 * @param resteAuDepart ce qui reste dans la zone de départ après la sortie
 * @param dejaEnArrivee ce que la zone d'arrivée contenait déjà
 */
async function glisser(
	depart: HTMLElement,
	arrivee: HTMLElement,
	tiree: Element,
	resteAuDepart: Element[] = [],
	dejaEnArrivee: Element[] = []
) {
	// 1. La prise : l'ombre REMPLACE la ressource dans sa zone d'origine.
	const ombre: Element = {
		...tiree,
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
		id: SHADOW_PLACEHOLDER_ITEM_ID
	};
	poser(depart, 'consider', [...resteAuDepart, ombre], {
		trigger: TRIGGERS.DRAG_STARTED,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();

	// 2. ⚠️ L'étape qui casse : la bibliothèque rend son vrai identifiant à
	//    l'ombre, sur le MÊME objet, une fois l'élément d'origine retiré du DOM.
	ombre.id = tiree.id;

	// 3. L'ombre quitte la zone de départ et entre dans celle qui reçoit.
	poser(depart, 'consider', resteAuDepart, {
		trigger: TRIGGERS.DRAGGED_ENTERED_ANOTHER,
		id: tiree.id,
		source: 'pointer'
	});
	poser(arrivee, 'consider', [...dejaEnArrivee, ombre], {
		trigger: TRIGGERS.DRAGGED_ENTERED,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();

	// 4. La dépose : l'ombre redevient la ressource, dans la zone d'arrivée.
	poser(arrivee, 'finalize', [...dejaEnArrivee, tiree], {
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

/**
 * Où le plan AFFICHE le document, et en combien d'exemplaires.
 *
 * Le nombre compte autant que la place : une copie « ombre » restée dans l'état
 * donnerait une seconde ligne, grisée, que rien ne permet de retirer.
 */
function affiche(zones: ReturnType<typeof zonesDeDepose>) {
	// Les enfants DIRECTS de la zone, et eux seuls : c'est ce que
	// `svelte-dnd-action` considère comme ses éléments.
	const porte = (zone: HTMLElement) =>
		Array.from(zone.children).filter((ligne) => ligne.textContent?.includes('Les Fonctions'))
			.length;

	return {
		cours: porte(zones.cours),
		methodes: porte(zones.methodes),
		nonClassees: porte(zones.nonClassees)
	};
}

/** Prendre une ressource et la reposer au même rang, dans la même zone. */
async function glisserSurPlace(zone: HTMLElement, tiree: Element, autres: Element[] = []) {
	const ombre: Element = {
		...tiree,
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
		id: SHADOW_PLACEHOLDER_ITEM_ID
	};
	poser(zone, 'consider', [ombre, ...autres], {
		trigger: TRIGGERS.DRAG_STARTED,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();
	ombre.id = tiree.id;

	poser(zone, 'finalize', [tiree, ...autres], {
		trigger: TRIGGERS.DROPPED_INTO_ZONE,
		id: tiree.id,
		source: 'pointer'
	});
	await rendu();
}

/**
 * La ressource telle que le plan la construit pour un document — entière.
 *
 * La bibliothèque repasse l'OBJET du plan, pas un résumé : un décor amputé de
 * son libellé afficherait une ligne vide, et masquerait justement ce qu'on
 * vérifie à l'écran.
 */
const RESSOURCE: Element = {
	id: `document:${DOCUMENT}`,
	kind: 'document',
	contentId: DOCUMENT,
	label: 'Les Fonctions',
	typeLabel: 'Document',
	publishedAt: null,
	openUrl: `/api/documents/${DOCUMENT}`
};

function monter(documents: ChapterDocument[], refuse = false) {
	const appels: { url: string; body: unknown }[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			appels.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
			return refuse
				? new Response(JSON.stringify({ message: 'Rangement refusé' }), { status: 500 })
				: new Response(JSON.stringify({ success: true }), { status: 200 });
		})
	);

	const { container, rerender } = render(ChapterSectionsEditor, {
		chapterId: CHAPITRE,
		sections: [section(COURS, 'Le cours', 1), section(METHODES, 'Méthodes', 2)],
		documents,
		exercises: [],
		checklistItems: [],
		worksheets: [],
		onAdd: () => {},
		onEditChecklistItem: () => {}
	});

	return { appels, rerender, zones: zonesDeDepose(container as HTMLElement) };
}

describe('ChapterSectionsEditor — ranger au glisser-déposer', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/**
	 * LE cas signalé : un chapitre neuf, ses six sections vides, et l'unique
	 * document en « Non classé ». Le déposer dans une section ne changeait rien
	 * en base.
	 */
	it('enregistre l’entrée du seul document dans une section vide', async () => {
		const { appels, zones } = monter([document(null)]);

		await glisser(zones.nonClassees, zones.cours, RESSOURCE);

		expect(appels).toHaveLength(1);
		expect(appels[0].url).toBe(`/api/teacher/chapters/${CHAPITRE}/sections/assign`);
		expect(appels[0].body).toEqual({
			sectionId: COURS,
			items: [{ kind: 'document', id: DOCUMENT, sectionOrder: 0 }]
		});
		// Et une seule fois à l'écran, dans la section visée.
		expect(affiche(zones)).toEqual({ cours: 1, methodes: 0, nonClassees: 0 });
	});

	/** Le même geste d'une section à l'autre : le rangement doit suivre. */
	it('enregistre le passage d’une section à une autre', async () => {
		const { appels, zones } = monter([document(COURS)]);

		await glisser(zones.cours, zones.methodes, RESSOURCE);

		expect(appels).toHaveLength(1);
		expect(appels[0].body).toEqual({
			sectionId: METHODES,
			items: [{ kind: 'document', id: DOCUMENT, sectionOrder: 0 }]
		});
	});

	/** Sortir une ressource d'une section la rend à « Non classé », en base aussi. */
	it('enregistre la sortie vers « Non classé »', async () => {
		const { appels, zones } = monter([document(COURS)]);

		await glisser(zones.cours, zones.nonClassees, RESSOURCE);

		expect(appels).toHaveLength(1);
		expect(appels[0].body).toEqual({
			sectionId: null,
			items: [{ kind: 'document', id: DOCUMENT, sectionOrder: 0 }]
		});
	});
});

describe('ChapterSectionsEditor — ce qu’un glisser ne doit PAS faire', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/**
	 * Reprendre une ressource et la reposer où elle était n'écrit rien : sinon
	 * chaque hésitation du professeur réécrirait tous les rangs de la section.
	 */
	it('n’appelle rien quand la ressource retombe à sa place', async () => {
		const { appels, zones } = monter([document(COURS)]);

		await glisserSurPlace(zones.cours, RESSOURCE);

		expect(appels).toEqual([]);
	});

	/**
	 * Un rangement refusé par le serveur doit REVENIR à l'état d'avant. L'écran
	 * qui garde le déplacement ment exactement comme le bug d'origine — et une
	 * ombre laissée là ferait une seconde ligne, grisée et intraînable.
	 */
	it('remet la ressource à sa place quand le serveur refuse', async () => {
		const { appels, zones } = monter([document(null)], true);

		await glisser(zones.nonClassees, zones.cours, RESSOURCE);

		expect(appels).toHaveLength(1);
		expect(affiche(zones)).toEqual({ cours: 0, methodes: 0, nonClassees: 1 });
	});
});

describe('ChapterSectionsEditor — réordonner les sections', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/**
	 * Les sections se glissent elles aussi, dans une zone à part — et l'ombre y
	 * tend le même piège : elle occupe déjà le rang d'arrivée quand la dépose
	 * arrive.
	 */
	it('enregistre le nouvel ordre', async () => {
		const { appels, zones } = monter([]);

		const cours = { id: COURS, title: 'Le cours', ressources: [] };
		const methodes = { id: METHODES, title: 'Méthodes', ressources: [] };

		// Prise de « Méthodes », à son rang.
		const ombre: Element = {
			...methodes,
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser(zones.sections, 'consider', [cours, ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: METHODES,
			source: 'pointer'
		});
		await rendu();
		ombre.id = METHODES;

		// Elle passe devant « Le cours »…
		poser(zones.sections, 'consider', [ombre, cours], {
			trigger: TRIGGERS.DRAGGED_OVER_INDEX,
			id: METHODES,
			source: 'pointer'
		});
		await rendu();

		// … et on la dépose là.
		poser(zones.sections, 'finalize', [methodes, cours], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: METHODES,
			source: 'pointer'
		});
		await rendu();

		expect(appels).toHaveLength(1);
		expect(appels[0].url).toBe(`/api/teacher/chapters/${CHAPITRE}/sections/reorder`);
		expect(appels[0].body).toEqual({
			sections: [
				{ id: METHODES, displayOrder: 0 },
				{ id: COURS, displayOrder: 1 }
			]
		});
	});
});

describe('ChapterSectionsEditor — un rafraîchissement pendant le geste', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/**
	 * Le plan se rafraîchit depuis le serveur pendant qu'on tire une ressource :
	 * publier un contenu appelle `invalidateAll()`, et les props reviennent. Les
	 * listes sont alors reconstruites — elles portent la ressource RÉELLE, plus
	 * son ombre. Si le rangement échoue ensuite, la restauration ne doit pas la
	 * remettre une seconde fois : deux lignes de même clé, et le rendu lève
	 * `each_key_duplicate`.
	 */
	it('ne duplique pas la ressource quand le rangement est refusé', async () => {
		const { zones, rerender } = monter([document(null)], true);

		const ombre: Element = {
			...RESSOURCE,
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser(zones.nonClassees, 'consider', [ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: RESSOURCE.id,
			source: 'pointer'
		});
		await rendu();
		ombre.id = String(RESSOURCE.id);

		poser(zones.nonClassees, 'consider', [], {
			trigger: TRIGGERS.DRAGGED_ENTERED_ANOTHER,
			id: RESSOURCE.id,
			source: 'pointer'
		});
		poser(zones.cours, 'consider', [ombre], {
			trigger: TRIGGERS.DRAGGED_ENTERED,
			id: RESSOURCE.id,
			source: 'pointer'
		});
		await rendu();

		// Les props reviennent : le document est publié entre-temps.
		await rerender({ documents: [{ ...document(null), publishedAt: QUAND }] });
		await rendu();

		poser(zones.cours, 'finalize', [RESSOURCE], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: RESSOURCE.id,
			source: 'pointer'
		});
		poser(zones.nonClassees, 'finalize', [], {
			trigger: TRIGGERS.DROPPED_INTO_ANOTHER,
			id: RESSOURCE.id,
			source: 'pointer'
		});
		await rendu();

		expect(affiche(zones)).toEqual({ cours: 0, methodes: 0, nonClassees: 1 });
	});
});
