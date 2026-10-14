/**
 * Un seul éditeur de plan, deux propriétaires (ADR 0029)
 * ======================================================
 *
 * Le MÊME `ChapterSectionsEditor` édite le plan d'un chapitre et celui d'un
 * modèle de chapitre. Ce qui doit se voir à l'écran :
 *
 * - modèle : aucune publication (un modèle ne donne rien aux élèves), les
 *   sections partent vers les routes du MODÈLE, et supprimer s'appelle
 *   « Retirer du modèle » ;
 * - chapitre lié : un élément venu du modèle porte la marque « Modèle », ne se
 *   corrige ni ne se supprime ici, et se MASQUE ; un élément masqué quitte le
 *   plan, et revient par l'interrupteur « Afficher ce qui est masqué (n) ».
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	SHADOW_ITEM_MARKER_PROPERTY_NAME,
	SHADOW_PLACEHOLDER_ITEM_ID,
	TRIGGERS
} from 'svelte-dnd-action';
import type {
	ChapterChecklistItem,
	ChapterDocument,
	ChapterSection,
	ChapterSeries
} from '$lib/types/chapters';
import ChapterSectionsEditor from '../ChapterSectionsEditor.svelte';

// Constantes
const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';
const COURS = '33333333-3333-4333-8333-333333333333';
const DOC_MODELE = '44444444-4444-4444-8444-444444444444';
const DOC_PROPRE = '55555555-5555-4555-8555-555555555555';
const SOURCE = '66666666-6666-4666-8666-666666666666';
const OBJECTIF = '77777777-7777-4777-8777-777777777777';
const SERIE = '88888888-8888-4888-8888-888888888888';
const QUAND = '2026-10-14T05:36:02.215Z';

// Functions
function section(partiel: Partial<ChapterSection> = {}): ChapterSection {
	return {
		id: COURS,
		chapterId: CHAPITRE,
		sourceId: null,
		hidden: false,
		title: 'Le cours',
		displayOrder: 0,
		createdAt: QUAND,
		updatedAt: QUAND,
		...partiel
	};
}

function document(partiel: Partial<ChapterDocument> = {}): ChapterDocument {
	return {
		id: DOC_PROPRE,
		chapterId: CHAPITRE,
		title: 'Mon document',
		description: null,
		sourceType: 'google_drive',
		storagePath: null,
		fileName: null,
		mimeType: null,
		fileSize: null,
		googleFileId: null,
		googleDriveUrl: 'https://drive.google.com/file/d/abc',
		thumbnailUrl: null,
		displayOrder: 0,
		sectionId: COURS,
		sectionOrder: 0,
		createdAt: QUAND,
		updatedAt: QUAND,
		publishedAt: null,
		sourceId: null,
		hidden: false,
		...partiel
	};
}

function objectif(partiel: Partial<ChapterChecklistItem> = {}): ChapterChecklistItem {
	return {
		id: OBJECTIF,
		chapterId: CHAPITRE,
		content: 'Factoriser un trinôme',
		description: null,
		displayOrder: 0,
		sectionId: COURS,
		sectionOrder: 1,
		createdAt: QUAND,
		updatedAt: QUAND,
		publishedAt: null,
		sourceId: null,
		hidden: false,
		...partiel
	};
}

function serie(partiel: Partial<ChapterSeries> = {}): ChapterSeries {
	return {
		id: SERIE,
		chapterId: CHAPITRE,
		seriesId: '99999999-9999-4999-8999-999999999999',
		form: 'flash',
		displayOrder: 0,
		sectionId: COURS,
		sectionOrder: 2,
		createdAt: QUAND,
		publishedAt: null,
		sourceId: null,
		hidden: false,
		title: 'Discriminant',
		questionCount: 3,
		launchHref: null,
		...partiel
	};
}

interface Contenu {
	sections?: ChapterSection[];
	documents?: ChapterDocument[];
	checklistItems?: ChapterChecklistItem[];
	chapterSeries?: ChapterSeries[];
}

const COMMUN = { exercises: [], worksheets: [], onAdd: () => {}, onEditChecklistItem: () => {} };

async function rendreChapitre(contenu: Contenu) {
	const { container } = await render(ChapterSectionsEditor, {
		chapterId: CHAPITRE,
		sections: contenu.sections ?? [section()],
		documents: contenu.documents ?? [],
		checklistItems: contenu.checklistItems ?? [],
		chapterSeries: contenu.chapterSeries ?? [],
		...COMMUN
	});
	return container as HTMLElement;
}

async function rendreModele(contenu: Contenu) {
	const { container } = await render(ChapterSectionsEditor, {
		templateId: MODELE,
		sections: contenu.sections ?? [section()],
		documents: contenu.documents ?? [],
		checklistItems: contenu.checklistItems ?? [],
		chapterSeries: contenu.chapterSeries ?? [],
		...COMMUN
	});
	return container as HTMLElement;
}

/**
 * La ligne d'une ressource, repérée par son libellé. La première liste est
 * celle des sections elles-mêmes ; les suivantes sont les zones de ressources.
 */
function ligne(racine: HTMLElement, libelle: string): HTMLElement | null {
	const zones = Array.from(racine.querySelectorAll<HTMLElement>('[role="list"]')).slice(1);
	const lignes = zones.flatMap((z) => Array.from(z.children) as HTMLElement[]);
	return lignes.find((l) => l.textContent?.includes(libelle)) ?? null;
}

function champ(form: Element | null | undefined, nom: string): string | null {
	return form?.querySelector<HTMLInputElement>(`input[name="${nom}"]`)?.value ?? null;
}

/** Laisse Svelte rendre. */
function rendu() {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ChapterSectionsEditor — plan d’un modèle', () => {
	it('ne propose aucune publication : un modèle ne donne rien aux élèves', async () => {
		const racine = await rendreModele({
			documents: [document()],
			checklistItems: [objectif()]
		});

		expect(racine.querySelector('form[action="?/setPublication"]')).toBeNull();
		expect(racine.textContent).not.toContain('Préparé');
		expect(racine.textContent).not.toContain('Publier');
		expect(racine.textContent).not.toContain('élèves les voient');
	});

	it('retirer un élément s’annonce « Retirer du modèle », vers l’action du modèle', async () => {
		const racine = await rendreModele({ documents: [document()] });

		const bouton = racine.querySelector<HTMLButtonElement>(
			'button[aria-label="Retirer Mon document du modèle"]'
		);
		expect(bouton).not.toBeNull();
		expect(bouton?.title).toContain('il reste chez les classes qui l’ont déjà publié');
		const form = bouton?.closest('form');
		expect(form?.getAttribute('action')).toBe('?/deleteDocument');
		expect(champ(form, 'documentId')).toBe(DOC_PROPRE);
	});

	it('l’objectif du modèle se corrige, et la forme d’une série se change', async () => {
		const racine = await rendreModele({
			checklistItems: [objectif()],
			chapterSeries: [serie()]
		});

		expect(
			racine.querySelector('button[aria-label="Modifier Factoriser un trinôme"]')
		).not.toBeNull();
		expect(racine.querySelector('form[action="?/setSeriesForm"]')).not.toBeNull();
	});

	it('les sections partent vers les routes du MODÈLE', async () => {
		const appels: { url: string; method: string }[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
			appels.push({ url: String(url), method: init?.method ?? 'GET' });
			return new Response(JSON.stringify({}), { status: 200 });
		});
		const racine = await rendreModele({});

		racine
			.querySelector<HTMLButtonElement>('button[aria-label="Supprimer la section Le cours"]')
			?.click();
		await rendu();

		expect(appels).toEqual([
			{ url: `/api/teacher/chapter-templates/${MODELE}/sections/${COURS}`, method: 'DELETE' }
		]);
	});

	it('pas d’interrupteur des masqués dans un modèle', async () => {
		const racine = await rendreModele({ documents: [document()] });
		expect(racine.textContent).not.toContain('Afficher ce qui est masqué');
	});
});

describe('ChapterSectionsEditor — chapitre lié', () => {
	it('les sections d’un chapitre partent toujours vers les routes du CHAPITRE', async () => {
		const appels: string[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
			appels.push(String(url));
			return new Response(JSON.stringify({}), { status: 200 });
		});
		const racine = await rendreChapitre({});

		racine
			.querySelector<HTMLButtonElement>('button[aria-label="Supprimer la section Le cours"]')
			?.click();
		await rendu();

		expect(appels).toEqual([`/api/teacher/chapters/${CHAPITRE}/sections/${COURS}`]);
	});

	it('marque « Modèle » l’élément du modèle, et seulement lui', async () => {
		const racine = await rendreChapitre({
			documents: [
				document({ id: DOC_MODELE, title: 'Cours du modèle', sourceId: SOURCE }),
				document({ title: 'Mon document', sectionOrder: 1 })
			]
		});

		expect(ligne(racine, 'Cours du modèle')?.textContent).toContain('Modèle');
		expect(ligne(racine, 'Mon document')?.textContent).not.toContain('Modèle');
	});

	it('l’élément du modèle ne se supprime pas : il se masque', async () => {
		const racine = await rendreChapitre({
			documents: [document({ id: DOC_MODELE, title: 'Cours du modèle', sourceId: SOURCE })]
		});
		const l = ligne(racine, 'Cours du modèle');

		expect(l?.querySelector('form[action="?/deleteDocument"]')).toBeNull();
		const masquer = l?.querySelector('form[action="?/setHidden"]');
		expect(masquer?.textContent).toContain('Masquer');
		expect(champ(masquer, 'contentType')).toBe('document');
		expect(champ(masquer, 'itemId')).toBe(DOC_MODELE);
		expect(champ(masquer, 'hidden')).toBe('true');
		// La publication reste à la classe.
		expect(l?.querySelector('form[action="?/setPublication"]')).not.toBeNull();
	});

	it('un élément propre au chapitre garde sa suppression, sans « Masquer »', async () => {
		const racine = await rendreChapitre({ documents: [document()] });
		const l = ligne(racine, 'Mon document');

		expect(l?.querySelector('form[action="?/deleteDocument"]')).not.toBeNull();
		expect(l?.querySelector('form[action="?/setHidden"]')).toBeNull();
	});

	it('ni correction d’un objectif du modèle, ni changement de forme d’une série du modèle', async () => {
		const racine = await rendreChapitre({
			checklistItems: [objectif({ sourceId: SOURCE })],
			chapterSeries: [serie({ sourceId: SOURCE })]
		});

		expect(racine.querySelector('button[aria-label="Modifier Factoriser un trinôme"]')).toBeNull();
		expect(racine.querySelector('form[action="?/setSeriesForm"]')).toBeNull();
		// La forme reste lisible.
		expect(ligne(racine, 'Discriminant')?.textContent).toContain('Flash-cards');
		expect(
			ligne(racine, 'Discriminant')?.querySelector('form[action="?/setHidden"]')
		).not.toBeNull();
	});

	it('une section du modèle porte la marque, sans renommer ni supprimer', async () => {
		const racine = await rendreChapitre({ sections: [section({ sourceId: SOURCE })] });

		expect(racine.querySelector('button[aria-label="Renommer la section Le cours"]')).toBeNull();
		expect(racine.querySelector('button[aria-label="Supprimer la section Le cours"]')).toBeNull();
		expect(racine.textContent).toContain('Modèle');
	});

	it('un élément masqué quitte le plan ; l’interrupteur le fait revenir, à réafficher', async () => {
		const racine = await rendreChapitre({
			documents: [
				document({ id: DOC_MODELE, title: 'Cours masqué', sourceId: SOURCE, hidden: true }),
				document({ title: 'Mon document', sectionOrder: 1 })
			]
		});

		expect(ligne(racine, 'Cours masqué')).toBeNull();
		expect(racine.textContent).toContain('Afficher ce qui est masqué (1)');

		racine.querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
		await rendu();

		const l = ligne(racine, 'Cours masqué');
		expect(l?.textContent).toContain('Masqué');
		const reafficher = l?.querySelector('form[action="?/setHidden"]');
		expect(reafficher?.textContent).toContain('Réafficher');
		expect(champ(reafficher, 'hidden')).toBe('false');
		// Un élément masqué n'est jamais publié : il se réaffiche d'abord.
		expect(l?.querySelector('form[action="?/setPublication"]')).toBeNull();
	});

	/**
	 * Après « Détacher du modèle », la page recharge : mêmes identifiants, même
	 * publication, mais `sourceId` à vide. Le plan doit se reconstruire — sinon
	 * il garde les marques « Modèle » et des « Masquer » qui rendent 404.
	 */
	it('détaché : plus de marque « Modèle », la corbeille revient', async () => {
		const lie = {
			chapterId: CHAPITRE,
			sections: [section({ sourceId: SOURCE })],
			documents: [document({ id: DOC_MODELE, title: 'Cours du modèle', sourceId: SOURCE })],
			checklistItems: [],
			chapterSeries: [],
			...COMMUN
		};
		const { container, rerender } = await render(ChapterSectionsEditor, lie);
		const racine = container as HTMLElement;
		expect(racine.textContent).toContain('Modèle');

		await rerender({
			sections: [section({ sourceId: null })],
			documents: [document({ id: DOC_MODELE, title: 'Cours du modèle', sourceId: null })]
		});
		await rendu();

		expect(racine.textContent).not.toContain('Modèle');
		const l = ligne(racine, 'Cours du modèle');
		expect(l?.querySelector('form[action="?/deleteDocument"]')).not.toBeNull();
		expect(l?.querySelector('form[action="?/setHidden"]')).toBeNull();
		expect(
			racine.querySelector('button[aria-label="Supprimer la section Le cours"]')
		).not.toBeNull();
	});

	/**
	 * Le dernier masqué réaffiché, l'interrupteur disparaît. Il ne doit pas
	 * rester allumé en coulisse : le prochain élément masqué s'afficherait
	 * aussitôt, barré, au lieu de quitter le plan.
	 */
	it('plus aucun masqué : l’interrupteur se remet à zéro', async () => {
		const masque = document({
			id: DOC_MODELE,
			title: 'Cours du modèle',
			sourceId: SOURCE,
			hidden: true
		});
		const { container, rerender } = await render(ChapterSectionsEditor, {
			chapterId: CHAPITRE,
			sections: [section()],
			documents: [masque],
			checklistItems: [],
			chapterSeries: [],
			...COMMUN
		});
		const racine = container as HTMLElement;
		racine.querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
		await rendu();
		expect(ligne(racine, 'Cours du modèle')).not.toBeNull();

		// Réaffiché : plus de masqué, plus d'interrupteur.
		await rerender({ documents: [{ ...masque, hidden: false }] });
		await rendu();
		expect(racine.querySelector('button[role="switch"]')).toBeNull();

		// Masqué de nouveau : il quitte le plan, l'interrupteur est éteint.
		await rerender({ documents: [masque] });
		await rendu();
		expect(ligne(racine, 'Cours du modèle')).toBeNull();
		expect(racine.querySelector('button[role="switch"]')?.getAttribute('aria-checked')).toBe(
			'false'
		);
	});

	/**
	 * Masqués cachés, le plan n'affiche que les visibles. Ranger la zone ne
	 * doit pas renuméroter ces seuls visibles : le masqué tomberait à égalité de
	 * rang, et réaffiché, il sauterait n'importe où. La zone part ENTIÈRE.
	 */
	it('ranger une zone garde leur rang aux masqués cachés', async () => {
		const appels: { url: string; body: unknown }[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
			appels.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
			return new Response(JSON.stringify({}), { status: 200 });
		});
		const A = '0000000a-0000-4000-8000-000000000000';
		const H = '0000000b-0000-4000-8000-000000000000';
		const B = '0000000c-0000-4000-8000-000000000000';
		const { container } = await render(ChapterSectionsEditor, {
			chapterId: CHAPITRE,
			sections: [section()],
			documents: [
				document({ id: A, title: 'A', sectionOrder: 0 }),
				document({ id: H, title: 'H', sectionOrder: 1, sourceId: SOURCE, hidden: true }),
				document({ id: B, title: 'B', sectionOrder: 2 })
			],
			checklistItems: [],
			chapterSeries: [],
			...COMMUN
		});
		const zone = (container as HTMLElement).querySelectorAll<HTMLElement>('[role="list"]')[1];
		const res = (id: string) => ({ id: `document:${id}`, kind: 'document', contentId: id });
		const poser = (nom: string, items: object[], info: object) =>
			zone.dispatchEvent(new CustomEvent(nom, { detail: { items, info } }));

		// B prise à son rang (1 parmi les visibles), déposée devant A.
		const ombre = {
			...res(B),
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser('consider', [res(A), ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: `document:${B}`,
			source: 'pointer'
		});
		await rendu();
		poser('finalize', [res(B), res(A)], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: `document:${B}`,
			source: 'pointer'
		});
		await rendu();

		expect(appels).toHaveLength(1);
		expect(appels[0].body).toEqual({
			sectionId: COURS,
			items: [
				{ kind: 'document', id: B, sectionOrder: 0 },
				{ kind: 'document', id: A, sectionOrder: 1 },
				// Le masqué suit A, qu'il suivait : jamais à égalité avec un visible.
				{ kind: 'document', id: H, sectionOrder: 2 }
			]
		});
	});

	it('sans élément masqué, pas d’interrupteur', async () => {
		const racine = await rendreChapitre({
			documents: [document({ id: DOC_MODELE, sourceId: SOURCE })]
		});
		expect(racine.textContent).not.toContain('Afficher ce qui est masqué');
	});
});

describe('ChapterSectionsEditor — masquer une section (décision du 2026-10-14)', () => {
	const AUTRE = '12121212-1212-4212-8212-121212121212';
	const TROISIEME = '13131313-1313-4313-8313-131313131313';

	it('chaque section d’un chapitre — du modèle ou propre — se masque ; pas dans un modèle', async () => {
		const racine = await rendreChapitre({
			sections: [
				section({ sourceId: SOURCE }),
				section({ id: AUTRE, title: 'Méthodes', displayOrder: 1 })
			]
		});
		expect(racine.querySelector('button[aria-label="Masquer la section Le cours"]')).not.toBeNull();
		expect(racine.querySelector('button[aria-label="Masquer la section Méthodes"]')).not.toBeNull();

		const modele = await rendreModele({});
		expect(modele.querySelector('button[aria-label^="Masquer la section"]')).toBeNull();
	});

	it('masquer demande confirmation, en disant que le contenu sera dépublié', async () => {
		const racine = await rendreChapitre({ sections: [section()] });

		racine
			.querySelector<HTMLButtonElement>('button[aria-label="Masquer la section Le cours"]')
			?.click();
		await rendu();

		const dialogue = window.document.querySelector('[role="dialog"]');
		expect(dialogue?.textContent).toContain('dépublié');
		const form = window.document.querySelector('form[action="?/setSectionHidden"]');
		expect(champ(form, 'sectionId')).toBe(COURS);
		expect(champ(form, 'hidden')).toBe('true');
	});

	it('le bouton de la confirmation envoie bien le formulaire de masquage', async () => {
		const envoyes: { action: string | null; champs: Record<string, string> }[] = [];
		// Capturé AVANT `enhance` (phase de capture, sur la fenêtre) : on lit ce
		// qui part, sans laisser partir de requête.
		const intercepter = (e: Event) => {
			const form = e.target as HTMLFormElement;
			envoyes.push({
				action: form.getAttribute('action'),
				champs: Object.fromEntries(
					[...new FormData(form).entries()].map(([k, v]) => [k, String(v)])
				)
			});
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		window.addEventListener('submit', intercepter, true);
		try {
			const racine = await rendreChapitre({ sections: [section()] });
			racine
				.querySelector<HTMLButtonElement>('button[aria-label="Masquer la section Le cours"]')
				?.click();
			await rendu();

			const dialogue = window.document.querySelector('[role="dialog"]');
			const confirmer = Array.from(dialogue?.querySelectorAll('button') ?? []).find(
				(b) => b.textContent?.trim() === 'Masquer la section'
			);
			confirmer?.click();
			await rendu();

			expect(envoyes).toEqual([
				{ action: '?/setSectionHidden', champs: { sectionId: COURS, hidden: 'true' } }
			]);
		} finally {
			window.removeEventListener('submit', intercepter, true);
		}
	});

	it('une section masquée APRÈS le rendu quitte le plan ; l’interrupteur la fait revenir barrée', async () => {
		const { container, rerender } = await render(ChapterSectionsEditor, {
			chapterId: CHAPITRE,
			sections: [section()],
			documents: [],
			checklistItems: [],
			chapterSeries: [],
			...COMMUN
		});
		const racine = container as HTMLElement;
		expect(racine.textContent).toContain('Le cours');

		await rerender({ sections: [section({ hidden: true })] });
		await rendu();
		expect(racine.textContent).not.toContain('Le cours');

		racine.querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
		await rendu();
		expect(racine.textContent).toContain('Le cours');
		expect(racine.textContent).toContain('Masquée');
		expect(racine.querySelector('[data-slot="card-title"].line-through')?.textContent).toContain(
			'Le cours'
		);
	});

	it('une section masquée quitte le plan et compte une fois dans l’interrupteur', async () => {
		const racine = await rendreChapitre({
			sections: [section({ hidden: true })],
			// Son contenu, masqué par la base avec elle.
			documents: [document({ title: 'Dans la section', hidden: true })]
		});

		expect(racine.textContent).not.toContain('Le cours');
		expect(racine.textContent).toContain('Afficher ce qui est masqué (1)');
	});

	it('interrupteur allumé : la section revient barrée, à réafficher, sans ajout ni geste par élément', async () => {
		const racine = await rendreChapitre({
			sections: [section({ hidden: true })],
			documents: [
				document({ title: 'Du modèle', hidden: true, sourceId: SOURCE }),
				document({ id: DOC_MODELE, title: 'Propre', hidden: true, sectionOrder: 1 })
			]
		});
		racine.querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
		await rendu();

		expect(racine.textContent).toContain('Masquée');
		const reafficher = racine.querySelector('form[action="?/setSectionHidden"]');
		expect(reafficher?.textContent).toContain('Réafficher la section');
		expect(champ(reafficher, 'hidden')).toBe('false');

		const carte = reafficher?.closest('[data-slot="card"]');
		// Rien ne se range dans une section masquée : il y naîtrait publiable.
		expect(carte?.textContent).not.toContain('Ajouter');
		// Un élément d'une section masquée revient AVEC elle, pas seul.
		expect(ligne(racine, 'Du modèle')?.querySelector('form[action="?/setHidden"]')).toBeNull();
		expect(ligne(racine, 'Du modèle')?.querySelector('form[action="?/setPublication"]')).toBeNull();
	});

	it('réordonner les sections garde son rang à une section masquée cachée', async () => {
		const appels: { url: string; body: unknown }[] = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
			appels.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
			return new Response(JSON.stringify({}), { status: 200 });
		});
		const racine = await rendreChapitre({
			sections: [
				section({ title: 'Le cours', displayOrder: 0 }),
				section({ id: AUTRE, title: 'Masquée', displayOrder: 1, hidden: true }),
				section({ id: TROISIEME, title: 'Bilan', displayOrder: 2 })
			]
		});
		const zone = racine.querySelectorAll<HTMLElement>('[role="list"]')[0];
		const sec = (id: string) => ({ id, title: id, linked: false, hidden: false, ressources: [] });
		const poser = (nom: string, items: object[], info: object) =>
			zone.dispatchEvent(new CustomEvent(nom, { detail: { items, info } }));

		const ombre = {
			...sec(TROISIEME),
			[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
			id: SHADOW_PLACEHOLDER_ITEM_ID
		};
		poser('consider', [sec(COURS), ombre], {
			trigger: TRIGGERS.DRAG_STARTED,
			id: TROISIEME,
			source: 'pointer'
		});
		await rendu();
		poser('finalize', [sec(TROISIEME), sec(COURS)], {
			trigger: TRIGGERS.DROPPED_INTO_ZONE,
			id: TROISIEME,
			source: 'pointer'
		});
		await rendu();

		expect(appels).toHaveLength(1);
		expect(appels[0].body).toEqual({
			sections: [
				{ id: TROISIEME, displayOrder: 0 },
				{ id: COURS, displayOrder: 1 },
				{ id: AUTRE, displayOrder: 2 }
			]
		});
	});
});
