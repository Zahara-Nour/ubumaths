/**
 * « Mon cours » public — rendu en lecture seule (ADR 0025)
 * ========================================================
 *
 * Un lecteur sans compte voit le plan du cours, et rien de ce qui suppose un
 * compte : aucune case à cocher (objectifs en texte seul), aucun lien vers un
 * exercice, une révision ou l'espace élève. Les documents passent par
 * l'adresse du lien, jamais par `/api/documents` ; Drive reste externe.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import type { PageData } from '../$types';

const JETON = 'AbCdEfGhJkMnPqRs';
const FICHE = '44444444-4444-4444-8444-444444444444';

/**
 * La page ne lit que `course` et `token` : le reste de PageData (session,
 * profil, venus du layout) ne la concerne pas.
 */
function donnees() {
	const data = {
		token: JETON,
		course: {
			className: '4e B',
			classGrade: '4e',
			chapters: [
				{
					id: 'chap-1',
					title: 'Fractions',
					description: 'Comparer et simplifier',
					color: 'blue',
					plan: [
						{
							id: 'sec-1',
							title: 'Le cours',
							items: [
								{
									kind: 'checklist' as const,
									items: [
										{ id: 'o1', content: 'Comparer deux fractions', description: null },
										{ id: 'o2', content: 'Simplifier', description: 'par le PGCD' }
									]
								},
								{
									kind: 'document' as const,
									document: {
										id: 'doc-1',
										title: 'Polycopié',
										description: null,
										sourceType: 'upload' as const,
										mimeType: 'application/pdf',
										fileSize: 1200,
										googleDriveUrl: null
									}
								},
								{
									kind: 'series' as const,
									series: {
										title: 'Tables',
										form: 'flash' as const,
										questionCount: 2,
										launchHref: '/automaths/test?categories=abc&mode=flash'
									}
								}
							]
						},
						{
							id: 'non-classe',
							title: null,
							items: [
								{ kind: 'worksheet' as const, worksheetId: FICHE, title: 'Fiche 1' },
								{
									kind: 'document' as const,
									document: {
										id: 'doc-2',
										title: 'Sur Drive',
										description: null,
										sourceType: 'google_drive' as const,
										mimeType: null,
										fileSize: null,
										googleDriveUrl: 'https://drive.google.com/file/d/abc'
									}
								}
							]
						}
					]
				}
			]
		}
	} satisfies Pick<PageData, 'course' | 'token'>;
	return data as PageData;
}

const hrefs = (c: HTMLElement) =>
	[...c.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');

describe('/cours/[token]', () => {
	it('affiche le plan : chapitre, section, objectifs en texte, fiche, série, documents', async () => {
		const { container } = await render(Page, { data: donnees() });
		const texte = container.textContent!.replace(/\s+/g, ' ');
		expect(texte).toContain('4e B · 4e');
		expect(texte).toContain('Fractions');
		expect(texte).toContain('Le cours');
		expect(texte).toContain('Comparer deux fractions');
		expect(texte).toContain('par le PGCD');
		expect(texte).toContain('Fiche 1');

		const liens = hrefs(container as HTMLElement);
		expect(liens).toContain(`/cours/${JETON}/fiche/${FICHE}`);
		expect(liens).toContain('/automaths/test?categories=abc&mode=flash');
		expect(liens).toContain(`/cours/${JETON}/document/doc-1`);
		expect(liens).toContain(`/cours/${JETON}/document/doc-1?download`);
		expect(liens).toContain('https://drive.google.com/file/d/abc');
	});

	it('lecture seule : aucune case à cocher, aucun formulaire, aucun lien vers un espace à compte', async () => {
		const { container } = await render(Page, { data: donnees() });
		expect(container.querySelector('input')).toBeNull();
		expect(container.querySelector('[role="checkbox"]')).toBeNull();
		expect(container.querySelector('form')).toBeNull();

		for (const href of hrefs(container as HTMLElement)) {
			expect(href).not.toMatch(/\/dashboard|\/exercises|\/api\/documents|\/revision/);
		}
	});

	it('sans chapitre : un message, pas une page vide', async () => {
		const data = donnees();
		data.course.chapters = [];
		const { container } = await render(Page, { data });
		expect(container.textContent).toContain('Aucun chapitre publié');
	});
});
