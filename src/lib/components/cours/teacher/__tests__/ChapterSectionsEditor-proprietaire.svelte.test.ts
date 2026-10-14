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
 *   plan, et revient par l'interrupteur « Afficher les éléments masqués (n) ».
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
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
		expect(racine.textContent).not.toContain('Afficher les éléments masqués');
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
		expect(racine.textContent).toContain('Afficher les éléments masqués (1)');

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

	it('sans élément masqué, pas d’interrupteur', async () => {
		const racine = await rendreChapitre({
			documents: [document({ id: DOC_MODELE, sourceId: SOURCE })]
		});
		expect(racine.textContent).not.toContain('Afficher les éléments masqués');
	});
});
