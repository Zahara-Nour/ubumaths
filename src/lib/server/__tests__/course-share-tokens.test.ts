/**
 * Lien du cours — module serveur
 * ==============================
 *
 * Ce que le module garantit au-dessus de la base :
 *  - la charge utile des fonctions SQL est VALIDÉE (Zod) : une forme inattendue
 *    rend `null` (404), jamais un objet à moitié lu ;
 *  - le plan d'un chapitre se range comme celui de l'élève (sections ordonnées,
 *    contenus par `section_order`, objectifs groupés, « Non classé » à la fin) ;
 *  - une URL Drive qui n'est pas en `https:` ne devient jamais un lien ;
 *  - révoquer relit ses lignes (`.select()`) : la RLS échoue en silence.
 *
 * Le comportement réel des fonctions SQL est prouvé par
 * `tests/integration/class-course-share-token.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	buildPublicCourseView,
	resolveCourseShareToken,
	resolveCourseWorksheetByShareToken,
	resolveCourseDocumentByShareToken,
	revokeCourseShareToken,
	rotateCourseShareToken,
	type PublicCourse
} from '../course-share-tokens';

const JETON = 'AbCdEfGhJkMnPqRs';
const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const SECTION_A = '22222222-2222-4222-8222-222222222222';
const SECTION_B = '33333333-3333-4333-8333-333333333333';
const FICHE = '44444444-4444-4444-8444-444444444444';

const CATEGORIES = [
	{
		category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
		quantity: 2,
		delay: 20
	}
];

function client(rpcResult: { data: unknown; error: unknown }) {
	const rpc = vi.fn(async () => rpcResult);
	return { rpc, sb: { rpc } as unknown as SupabaseClient<Database> };
}

/** Un cours tel que `get_class_course_by_share_token` le rend. */
function cours(): PublicCourse {
	return {
		class_name: '4e B',
		class_grade: '4e',
		chapters: [
			{
				id: CHAPITRE,
				title: 'Fractions',
				description: null,
				color: 'blue',
				icon: null,
				display_order: 0,
				// Sections dans le désordre : le plan doit les remettre dans l'ordre.
				sections: [
					{ id: SECTION_B, title: 'Exercices', display_order: 2 },
					{ id: SECTION_A, title: 'Le cours', display_order: 1 }
				],
				documents: [
					{
						id: 'doc-1',
						title: 'Polycopié',
						description: null,
						source_type: 'upload',
						file_name: 'poly.pdf',
						mime_type: 'application/pdf',
						file_size: 1200,
						google_drive_url: null,
						section_id: SECTION_A,
						section_order: 2,
						display_order: 0
					},
					{
						id: 'doc-2',
						title: 'Drive piégé',
						description: null,
						source_type: 'google_drive',
						file_name: null,
						mime_type: null,
						file_size: null,
						google_drive_url: 'javascript:alert(1)',
						section_id: null,
						section_order: 0,
						display_order: 1
					}
				],
				worksheets: [
					{
						id: 'cw-1',
						worksheet_id: FICHE,
						title: 'Fiche 1',
						section_id: SECTION_B,
						section_order: 0,
						display_order: 0
					}
				],
				checklist_items: [
					{
						id: 'obj-2',
						content: 'Simplifier',
						description: null,
						section_id: SECTION_A,
						section_order: 3,
						display_order: 1
					},
					{
						id: 'obj-1',
						content: 'Comparer',
						description: 'deux fractions',
						section_id: SECTION_A,
						section_order: 0,
						display_order: 0
					}
				],
				series: [
					{
						id: 'cs-1',
						series_id: 'serie-1',
						title: 'Tables',
						description: null,
						categories: CATEGORIES,
						form: 'flash',
						section_id: SECTION_A,
						section_order: 1,
						display_order: 0
					}
				]
			}
		]
	};
}

describe('resolveCourseShareToken', () => {
	it('rend le cours validé', async () => {
		const { rpc, sb } = client({ data: cours(), error: null });
		const resultat = await resolveCourseShareToken(sb, JETON);
		expect(rpc).toHaveBeenCalledWith('get_class_course_by_share_token', { p_token: JETON });
		expect(resultat?.class_name).toBe('4e B');
		expect(resultat?.chapters[0].series[0].categories).toEqual(CATEGORIES);
	});

	it('rend null quand la fonction SQL rend null', async () => {
		const { sb } = client({ data: null, error: null });
		expect(await resolveCourseShareToken(sb, JETON)).toBeNull();
	});

	it('rend null sur une erreur de la base', async () => {
		const { sb } = client({ data: null, error: { message: 'boom' } });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await resolveCourseShareToken(sb, JETON)).toBeNull();
	});

	it('rend null sur une charge utile de forme inattendue', async () => {
		const { sb } = client({ data: { class_name: 42, chapters: 'non' }, error: null });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await resolveCourseShareToken(sb, JETON)).toBeNull();
	});
});

describe('resolveCourseWorksheetByShareToken', () => {
	it('appelle la fonction du COURS, pas celle du cahier, et garde sections et exercices', async () => {
		const fiche = {
			id: FICHE,
			title: 'Fiche 1',
			description: null,
			type: 'standard',
			config: { a: 1 },
			status: 'published',
			grades: ['4e'],
			translations: null,
			total_points: null,
			estimated_duration_minutes: null,
			sections: [{ id: 's', position: 0 }],
			exercises: [{ id: 'e', exercise: { id: 'x', variations: [] } }]
		};
		const { rpc, sb } = client({ data: fiche, error: null });
		const resultat = await resolveCourseWorksheetByShareToken(sb, JETON, FICHE);
		expect(rpc).toHaveBeenCalledWith('get_course_worksheet_by_share_token', {
			p_token: JETON,
			p_worksheet_id: FICHE
		});
		expect(resultat).toEqual(fiche);
	});

	it('garde le style de la fiche et la mise en page de son auteur (lot 4b)', async () => {
		const style = '55555555-5555-4555-8555-555555555555';
		const fiche = {
			id: FICHE,
			title: 'Fiche 1',
			description: null,
			type: 'standard',
			config: {},
			status: 'published',
			grades: null,
			translations: null,
			total_points: null,
			estimated_duration_minutes: null,
			sections: [],
			exercises: [],
			style_id: style,
			template: {
				id: style,
				name: 'Mes contrôles',
				description: null,
				style_id: style,
				template_content: '// MISE-EN-PAGE\n{{exercises}}'
			}
		};
		const { sb } = client({ data: fiche, error: null });
		expect(await resolveCourseWorksheetByShareToken(sb, JETON, FICHE)).toEqual(fiche);
	});

	it('rend null quand la fonction SQL rend null', async () => {
		const { sb } = client({ data: null, error: null });
		expect(await resolveCourseWorksheetByShareToken(sb, JETON, FICHE)).toBeNull();
	});
});

describe('resolveCourseDocumentByShareToken', () => {
	it('rend le chemin de stockage validé', async () => {
		const doc = {
			storage_path: 'classe/chap/poly.pdf',
			file_name: 'poly.pdf',
			mime_type: 'application/pdf',
			source_type: 'upload',
			google_drive_url: null
		};
		const { rpc, sb } = client({ data: doc, error: null });
		expect(await resolveCourseDocumentByShareToken(sb, JETON, 'doc-1')).toEqual(doc);
		expect(rpc).toHaveBeenCalledWith('get_course_document_by_share_token', {
			p_token: JETON,
			p_document_id: 'doc-1'
		});
	});

	it('rend null quand la fonction SQL rend null', async () => {
		const { sb } = client({ data: null, error: null });
		expect(await resolveCourseDocumentByShareToken(sb, JETON, 'doc-1')).toBeNull();
	});
});

describe('buildPublicCourseView', () => {
	const vue = buildPublicCourseView(cours());
	const plan = vue.chapters[0].plan;

	it('range les sections dans leur ordre et met « Non classé » à la fin, sans titre', () => {
		expect(plan.map((s) => s.title)).toEqual(['Le cours', 'Exercices', null]);
	});

	it('range les contenus par section_order, objectifs groupés à la place du premier', () => {
		expect(plan[0].items.map((i) => i.kind)).toEqual(['checklist', 'series', 'document']);
		const objectifs = plan[0].items[0];
		expect(objectifs.kind === 'checklist' && objectifs.items.map((o) => o.content)).toEqual([
			'Comparer',
			'Simplifier'
		]);
	});

	it('construit le lien de la série dans sa forme, sans note', () => {
		const serie = plan[0].items[1];
		expect(serie.kind).toBe('series');
		if (serie.kind !== 'series') return;
		expect(serie.series.launchHref).toMatch(/^\/automaths\/test\?categories=.*&mode=flash$/);
		expect(serie.series.questionCount).toBe(2);
	});

	it('désigne la fiche par worksheet_id', () => {
		expect(plan[1].items[0]).toEqual({ kind: 'worksheet', worksheetId: FICHE, title: 'Fiche 1' });
	});

	it('ne fait jamais un lien d’une URL Drive qui n’est pas en https', () => {
		const drive = plan[2].items[0];
		expect(drive.kind === 'document' && drive.document.googleDriveUrl).toBeNull();
	});

	it('une composition de série illisible donne une série sans lien', () => {
		const c = cours();
		c.chapters[0].series[0].categories = 'abîmée';
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const item = buildPublicCourseView(c).chapters[0].plan[0].items[1];
		expect(item.kind === 'series' && item.series.launchHref).toBeNull();
	});
});

describe('revokeCourseShareToken', () => {
	function updateChain(result: { data: unknown; error: unknown }) {
		const select = vi.fn(async () => result);
		const chain = {
			update: vi.fn(() => chain),
			eq: vi.fn(() => chain),
			select
		};
		const from = vi.fn(() => chain);
		return { from, chain, sb: { from } as unknown as SupabaseClient<Database> };
	}

	it('désactive sur la table du COURS et rend le nombre de lignes relues', async () => {
		const { from, chain, sb } = updateChain({ data: [{ id: 'a' }], error: null });
		expect(await revokeCourseShareToken(sb, 'classe')).toEqual({ revoked: 1, error: null });
		expect(from).toHaveBeenCalledWith('class_course_share_tokens');
		expect(chain.update).toHaveBeenCalledWith({ is_active: false });
	});

	it('zéro ligne relue : revoked = 0, sans erreur inventée', async () => {
		const { sb } = updateChain({ data: [], error: null });
		expect(await revokeCourseShareToken(sb, 'classe')).toEqual({ revoked: 0, error: null });
	});
});

describe('rotateCourseShareToken', () => {
	it('révoque puis insère un jeton de 16 caractères expirant le 31 août', async () => {
		const inserted: Record<string, unknown>[] = [];
		const ligne = { id: 'n', token: 'x' };
		const chain = {
			update: vi.fn(() => chain),
			eq: vi.fn(() => chain),
			insert: vi.fn((v: Record<string, unknown>) => {
				inserted.push(v);
				return chain;
			}),
			single: vi.fn(async () => ({ data: ligne, error: null })),
			// La révocation attend `.select('id')` directement ; l'insertion enchaîne
			// `.select(…).single()`.
			select: vi.fn(() =>
				Object.assign(Promise.resolve({ data: [], error: null }), {
					single: () => chain.single()
				})
			)
		};
		const from = vi.fn(() => chain);
		const sb = { from } as unknown as SupabaseClient<Database>;

		const r = await rotateCourseShareToken(sb, 'classe', 'prof');
		expect(r).toEqual({ token: ligne, error: null });
		expect(chain.update).toHaveBeenCalledWith({ is_active: false });
		expect(inserted[0]).toMatchObject({ class_id: 'classe', created_by: 'prof' });
		expect(String(inserted[0].token)).toMatch(/^[A-Za-z0-9]{16}$/);
		expect(String(inserted[0].expires_at)).toMatch(/-08-31T23:59:59/);
	});
});

describe('buildPublicCourseView — égalités et ordre des chapitres', () => {
	it('à section_order égal, même ordre que buildChapterPlan : documents, séries, fiches, objectifs', () => {
		const c = cours();
		const ch = c.chapters[0];
		// Tout en « Non classé », section_order 0 partout : le cas par défaut en base.
		for (const liste of [ch.documents, ch.worksheets, ch.checklist_items, ch.series]) {
			for (const x of liste) {
				x.section_id = null;
				x.section_order = 0;
			}
		}
		const plan = buildPublicCourseView(c).chapters[0].plan;
		expect(plan).toHaveLength(1);
		expect(plan[0].items.map((i) => i.kind)).toEqual([
			'document',
			'document',
			'series',
			'worksheet',
			'checklist'
		]);
	});

	it('range les chapitres par display_order', () => {
		const c = cours();
		const second = { ...c.chapters[0], id: 'chap-0', title: 'Avant', display_order: -1 };
		c.chapters.push(second);
		expect(buildPublicCourseView(c).chapters.map((x) => x.title)).toEqual(['Avant', 'Fractions']);
	});
});
