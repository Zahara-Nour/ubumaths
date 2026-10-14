/**
 * Le modèle possède son contenu : l'ORDRE des opérations serveur (ADR 0029)
 * ========================================================================
 *
 * Ce que la base ne peut pas garantir seule, et qui tient à l'ordre dans lequel
 * le serveur enchaîne ses appels :
 *
 * - détacher : une copie de fichier en échec arrête tout AVANT de délier ;
 * - faire un modèle : la copie du contenu précède l'instanciation (sinon la base
 *   diffuse des doublons), les sections s'adoptent d'abord ;
 * - supprimer un modèle : refus s'il est relié, fichiers supprimés avant la ligne ;
 * - instancier : un lien en échec supprime le chapitre créé ;
 * - retirer : le fichier n'est supprimé que si la ligne l'a été.
 *
 * Le client Supabase est simulé par un « script » qui enregistre chaque appel et
 * rend la réponse choisie par le test. Le comportement réel sous RLS est prouvé
 * par `tests/integration/modele-serveur.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	createTemplateFromChapter,
	deleteChapterTemplate,
	detachChapterFromTemplate,
	instantiateTemplate,
	publishTemplate,
	TemplateInUseError,
	TemplateUnusableError
} from '../chapter-templates';
import { retireTemplateElement } from '../template-content';

/**
 * Le client service (suppression des fichiers d'un modèle supprimé) : simulé, et
 * branché sur le MÊME journal que le faux client, pour juger de l'ordre.
 */
const serviceFake = vi.hoisted(() => {
	const journal: string[] = [];
	const removed: string[][] = [];
	return {
		journal,
		removed,
		client: {
			storage: {
				from: () => ({
					list: async () => ({
						data: [
							{ id: 'f', name: 'a.pdf' },
							{ id: null, name: 'sous-dossier' }
						],
						error: null
					}),
					remove: async (paths: string[]) => {
						journal.push('service:remove');
						removed.push(paths);
						return { data: paths.map(() => ({})), error: null };
					}
				})
			}
		}
	};
});
vi.mock('../serviceRoleClient', () => ({ createServiceRoleClient: () => serviceFake.client }));

beforeEach(() => {
	serviceFake.journal.length = 0;
	serviceFake.removed.length = 0;
});

// Types
type Op = 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'copy' | 'remove' | 'list';

interface Call {
	table: string;
	op: Op;
	payload?: unknown;
	filters: string[];
}

type Reply = { data?: unknown; error?: { message: string; code?: string } | null };

// Constantes
const PROF = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';
const CHAPITRE = '33333333-3333-4333-8333-333333333333';
const CLASSE = '44444444-4444-4444-8444-444444444444';

// Functions
/**
 * Un faux client : chaque requête terminée est enregistrée dans `calls`, et sa
 * réponse est celle que `reply` choisit (par défaut : succès vide).
 */
function fakeSupabase(reply: (call: Call, calls: Call[]) => Reply | undefined) {
	const calls: Call[] = [];
	const answer = (call: Call) => {
		calls.push(call);
		serviceFake.journal.push(`${call.op}:${call.table}`);
		const r = reply(call, calls) ?? {};
		return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
	};

	const from = (table: string) => {
		const call: Call = { table, op: 'select', filters: [] };
		const builder: Record<string, unknown> = {};
		const chain = (name: string) =>
			((...args: unknown[]) => {
				call.filters.push(`${name}:${args.map(String).join(',')}`);
				return builder;
			}) as unknown;
		for (const name of ['eq', 'not', 'is', 'in', 'order', 'limit', 'range', 'ilike']) {
			builder[name] = chain(name);
		}
		builder.select = () => builder;
		builder.insert = (payload: unknown) => {
			call.op = 'insert';
			call.payload = payload;
			return builder;
		};
		builder.update = (payload: unknown) => {
			call.op = 'update';
			call.payload = payload;
			return builder;
		};
		builder.delete = () => {
			call.op = 'delete';
			return builder;
		};
		builder.single = () => answer(call);
		builder.maybeSingle = () => answer(call);
		builder.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) =>
			answer(call).then(ok, ko);
		return builder;
	};

	const client = {
		from,
		rpc: (fn: string, args: unknown) =>
			answer({ table: fn, op: 'rpc', payload: args, filters: [] }),
		storage: {
			from: () => ({
				copy: (a: string, b: string) =>
					answer({ table: 'storage', op: 'copy', payload: [a, b], filters: [] }),
				remove: (paths: string[]) =>
					answer({ table: 'storage', op: 'remove', payload: paths, filters: [] }),
				list: (prefix: string) =>
					answer({ table: 'storage', op: 'list', payload: prefix, filters: [] })
			})
		}
	};

	return { supabase: client as unknown as SupabaseClient<Database>, calls };
}

const writes = (calls: Call[]) =>
	calls.filter((c) => ['insert', 'update', 'delete'].includes(c.op));

describe('détacher un chapitre', () => {
	it('une copie de fichier en échec arrête tout AVANT de délier', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_template_instantiations') {
				return { data: { id: 'inst', is_detached: false } };
			}
			if (call.table === 'chapter_documents' && call.op === 'select') {
				return {
					data: [
						{ id: 'd1', source_type: 'upload', storage_path: `templates/${MODELE}/a.pdf` },
						{ id: 'd2', source_type: 'upload', storage_path: `templates/${MODELE}/b.pdf` }
					]
				};
			}
			if (call.op === 'copy') {
				const [source] = call.payload as string[];
				return source.endsWith('b.pdf') ? { error: { message: 'refusé' } } : { data: {} };
			}
		});

		const { error } = await detachChapterFromTemplate(CHAPITRE, supabase);

		expect(error?.message).toMatch(/reste lié/);
		expect(writes(calls)).toEqual([]);
		// La copie déjà faite est nettoyée.
		const nettoyage = calls.find((c) => c.op === 'remove');
		expect(nettoyage?.payload).toEqual([
			expect.stringMatching(new RegExp(`^chapters/${CHAPITRE}/`))
		]);
	});

	it('délie les documents copiés, puis le reste, sections en dernier, puis l’instanciation', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_template_instantiations' && call.op === 'select') {
				return { data: { id: 'inst', is_detached: false } };
			}
			if (
				call.table === 'chapter_documents' &&
				call.op === 'select' &&
				!call.filters.includes('limit:1')
			) {
				return {
					data: [{ id: 'd1', source_type: 'upload', storage_path: `templates/${MODELE}/a.pdf` }]
				};
			}
			if (call.op === 'update') return { data: [{ id: 'x' }] };
			if (call.op === 'select') return { data: [] };
		});

		const { error } = await detachChapterFromTemplate(CHAPITRE, supabase);

		expect(error).toBeNull();
		const ecritures = writes(calls).map((c) => c.table);
		expect(ecritures).toEqual([
			'chapter_documents',
			'chapter_documents',
			'chapter_checklist_items',
			'chapter_exercises',
			'chapter_worksheets',
			'chapter_series',
			'chapter_sections',
			'chapter_template_instantiations'
		]);
		const premier = writes(calls)[0].payload as { source_id: null; storage_path: string };
		expect(premier.source_id).toBeNull();
		expect(premier.storage_path).toMatch(new RegExp(`^chapters/${CHAPITRE}/`));
	});
});

describe('faire un modèle depuis un chapitre', () => {
	function contenuDuChapitre(call: Call): Reply | undefined {
		if (call.op !== 'select') return undefined;
		switch (call.table) {
			case 'class_chapters':
				return { data: { color: null, icon: null } };
			case 'chapter_sections':
				return { data: [{ id: 's1', title: 'Le cours', display_order: 1 }] };
			case 'chapter_checklist_items':
				return {
					data: [
						{
							id: 'c1',
							content: 'Je sais',
							description: null,
							display_order: 0,
							section_id: 's1',
							section_order: 0
						}
					]
				};
			case 'chapter_documents':
			case 'chapter_exercises':
			case 'chapter_worksheets':
			case 'chapter_series':
				return { data: [] };
		}
		return undefined;
	}

	it('copie, PUIS crée l’instanciation, PUIS adopte (sections d’abord)', async () => {
		let n = 0;
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_template_instantiations' && call.op === 'select') {
				return { data: null };
			}
			const contenu = contenuDuChapitre(call);
			if (contenu) return contenu;
			if (call.table === 'chapter_templates' && call.op === 'insert') {
				return {
					data: {
						id: MODELE,
						created_by: PROF,
						status: 'draft',
						title: 'M',
						description: null,
						grades: [],
						color: null,
						icon: null,
						content_snapshot: {},
						instantiation_count: 0,
						current_version: 1,
						created_at: '',
						updated_at: ''
					}
				};
			}
			if (call.op === 'insert')
				return {
					data: call.table === 'chapter_template_instantiations' ? [{ id: 'i' }] : { id: `t${++n}` }
				};
			if (call.op === 'update') return { data: [{ id: 'x' }] };
		});

		const { error } = await createTemplateFromChapter(
			{ chapterId: CHAPITRE, title: 'M', grades: [] },
			PROF,
			supabase
		);

		expect(error).toBeNull();
		const suite = writes(calls).map((c) => `${c.op}:${c.table}`);
		expect(suite).toEqual([
			'insert:chapter_templates',
			'insert:chapter_sections',
			'insert:chapter_checklist_items',
			'insert:chapter_template_instantiations',
			'update:chapter_sections',
			'update:chapter_checklist_items'
		]);
		// L'objectif du modèle est rangé dans la section COPIÉE.
		const objectif = writes(calls)[2].payload as { section_id: string; template_id: string };
		expect(objectif).toMatchObject({ section_id: 't1', template_id: MODELE });
		expect(writes(calls)[4].payload).toEqual({ source_id: 't1' });
	});

	it('une adoption ratée n’est pas un succès silencieux : avertissement', async () => {
		let n = 0;
		const { supabase } = fakeSupabase((call) => {
			if (call.table === 'chapter_template_instantiations' && call.op === 'select') {
				return { data: null };
			}
			const contenu = contenuDuChapitre(call);
			if (contenu) return contenu;
			if (call.table === 'chapter_templates') return { data: { id: MODELE, content_snapshot: {} } };
			if (call.op === 'insert') {
				return {
					data: call.table === 'chapter_template_instantiations' ? [{ id: 'i' }] : { id: `t${++n}` }
				};
			}
			// L'objectif refuse l'adoption (zéro ligne) ; la section l'accepte.
			if (call.op === 'update') {
				return { data: call.table === 'chapter_sections' ? [{ id: 'x' }] : [] };
			}
		});

		const { data, error, warning } = await createTemplateFromChapter(
			{ chapterId: CHAPITRE, title: 'M', grades: [] },
			PROF,
			supabase
		);

		expect(error).toBeNull();
		expect(data).not.toBeNull();
		expect(warning).toMatch(/1 élément/);
	});

	it('un chapitre déjà rattaché garde son rattachement : pas d’adoption', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_template_instantiations' && call.op === 'select') {
				return { data: { id: 'existant' } };
			}
			const contenu = contenuDuChapitre(call);
			if (contenu) return contenu;
			if (call.table === 'chapter_templates') return { data: { id: MODELE, content_snapshot: {} } };
			if (call.op === 'insert') return { data: { id: 'tX' } };
		});

		const { error } = await createTemplateFromChapter(
			{ chapterId: CHAPITRE, title: 'M', grades: [] },
			PROF,
			supabase
		);

		expect(error).toBeNull();
		expect(writes(calls).some((c) => c.op === 'update')).toBe(false);
		expect(writes(calls).some((c) => c.table === 'chapter_template_instantiations')).toBe(false);
	});

	it('une copie en échec supprime le modèle à moitié rempli', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			const contenu = contenuDuChapitre(call);
			if (contenu) return contenu;
			if (call.table === 'chapter_templates' && call.op === 'insert') {
				return { data: { id: MODELE, content_snapshot: {} } };
			}
			if (call.table === 'chapter_checklist_items' && call.op === 'insert') {
				return { error: { message: 'refusé' } };
			}
			if (call.op === 'insert') return { data: { id: 'tX' } };
		});

		const { error } = await createTemplateFromChapter(
			{ chapterId: CHAPITRE, title: 'M', grades: [] },
			PROF,
			supabase
		);

		expect(error).not.toBeNull();
		const derniere = writes(calls).at(-1);
		expect(derniere).toMatchObject({ op: 'delete', table: 'chapter_templates' });
		expect(writes(calls).some((c) => c.table === 'chapter_template_instantiations')).toBe(false);
	});
});

describe('supprimer un modèle', () => {
	it('refuse un modèle relié, sans toucher ni aux fichiers ni à la ligne', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates') return { data: { status: 'published' } };
			if (call.table === 'chapter_template_instantiations') return { data: [{ id: 'i' }] };
		});

		const { error } = await deleteChapterTemplate(MODELE, supabase);

		expect(error).toBeInstanceOf(TemplateInUseError);
		expect(error?.message).toMatch(/archivez/);
		expect(calls.some((c) => c.op === 'remove' || c.op === 'delete')).toBe(false);
	});

	it('refuse tant qu’une ligne de lien désigne un élément du modèle, sans rien effacer', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates') return { data: { status: 'published' } };
			if (call.table === 'chapter_template_instantiations') return { data: [] };
			if (
				call.table === 'chapter_documents' &&
				call.filters.some((f) => f.startsWith('eq:template_id'))
			) {
				return { data: [{ id: 'element' }] };
			}
			if (
				call.table === 'chapter_documents' &&
				call.filters.some((f) => f.startsWith('in:source_id'))
			) {
				return { data: [{ id: 'lien' }] };
			}
			return { data: [] };
		});

		const { error } = await deleteChapterTemplate(MODELE, supabase);

		expect(error).toBeInstanceOf(TemplateInUseError);
		expect(calls.some((c) => c.op === 'delete' || c.op === 'remove')).toBe(false);
		expect(serviceFake.removed).toEqual([]);
	});

	it('supprime la ligne (vérifiée), PUIS les fichiers par le client service', async () => {
		const { supabase } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates' && call.op === 'select') {
				return { data: { status: 'draft' } };
			}
			if (call.op === 'delete') return { data: [{ id: MODELE }] };
			return { data: [] };
		});

		const { error } = await deleteChapterTemplate(MODELE, supabase);

		expect(error).toBeNull();
		const ordre = serviceFake.journal.filter((e) => e.includes('delete') || e.includes('remove'));
		expect(ordre).toEqual(['delete:chapter_templates', 'service:remove']);
		// Strictement le dossier du modèle, sans le sous-dossier.
		expect(serviceFake.removed).toEqual([[`templates/${MODELE}/a.pdf`]]);
	});

	it('ligne non supprimée (zéro ligne) : aucun fichier effacé', async () => {
		const { supabase } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates' && call.op === 'select') {
				return { data: { status: 'draft' } };
			}
			return { data: [] };
		});

		const { error } = await deleteChapterTemplate(MODELE, supabase);

		expect(error).not.toBeNull();
		expect(serviceFake.removed).toEqual([]);
	});

	it('refuse toujours un modèle archivé', async () => {
		const { supabase } = fakeSupabase(() => ({ data: { status: 'archived' } }));
		const { error } = await deleteChapterTemplate(MODELE, supabase);
		expect(error?.message).toContain('archivé');
	});
});

describe('instancier', () => {
	it('relie par la RPC, sans copier de contenu', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates') {
				return { data: { title: 'M', color: null, icon: null, status: 'published' } };
			}
			if (call.table === 'class_chapters') return { data: { id: CHAPITRE } };
			if (call.table === 'chapter_template_instantiations') {
				return {
					data: {
						id: 'i',
						template_id: MODELE,
						template_version: 1,
						chapter_id: CHAPITRE,
						current_template_version: 1,
						is_detached: false,
						instantiated_at: '',
						last_migrated_at: null
					}
				};
			}
			if (call.table === 'chapter_sections' && call.op === 'select') return { data: [] };
		});

		const { data, error } = await instantiateTemplate(
			{ templateId: MODELE, classId: CLASSE, isVisible: false },
			PROF,
			supabase
		);

		expect(error).toBeNull();
		expect(data?.chapterId).toBe(CHAPITRE);
		expect(calls.find((c) => c.op === 'rpc')).toMatchObject({
			table: 'link_chapter_to_template',
			payload: { p_chapter_id: CHAPITRE, p_template_id: MODELE }
		});
		expect(writes(calls).map((c) => c.table)).toEqual(['class_chapters']);
	});

	it('sans titre demandé, le chapitre prend le titre du modèle', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates') {
				return { data: { title: 'Second degré', color: null, icon: null, status: 'published' } };
			}
			if (call.table === 'class_chapters') return { data: { id: CHAPITRE } };
			if (call.table === 'chapter_template_instantiations') return { data: { id: 'i' } };
			return { data: [] };
		});

		await instantiateTemplate(
			{ templateId: MODELE, classId: CLASSE, isVisible: false },
			PROF,
			supabase
		);

		const creation = calls.find((c) => c.op === 'insert' && c.table === 'class_chapters');
		expect(creation?.payload).toMatchObject({ title: 'Second degré', class_id: CLASSE });
	});

	it('un lien en échec supprime le chapitre créé', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.table === 'chapter_templates') {
				return { data: { title: 'M', color: null, icon: null, status: 'published' } };
			}
			if (call.table === 'class_chapters' && call.op === 'insert')
				return { data: { id: CHAPITRE } };
			if (call.op === 'rpc') return { error: { message: 'refusé' } };
			if (call.op === 'delete') return { data: [{ id: CHAPITRE }] };
		});

		const { error } = await instantiateTemplate(
			{ templateId: MODELE, classId: CLASSE, isVisible: false },
			PROF,
			supabase
		);

		expect(error).not.toBeNull();
		expect(writes(calls).at(-1)).toMatchObject({ op: 'delete', table: 'class_chapters' });
	});

	it('refuse un brouillon sans rien créer', async () => {
		const { supabase, calls } = fakeSupabase(() => ({
			data: { title: 'M', color: null, icon: null, status: 'draft' }
		}));
		const { error } = await instantiateTemplate(
			{ templateId: MODELE, classId: CLASSE, isVisible: false },
			PROF,
			supabase
		);
		expect(error).toBeInstanceOf(TemplateUnusableError);
		expect(writes(calls)).toEqual([]);
	});
});

describe('publier un modèle', () => {
	it('refuse un modèle sans élément non retiré, sans écrire', async () => {
		const { supabase, calls } = fakeSupabase(() => ({ data: [] }));
		const { error } = await publishTemplate(MODELE, supabase);
		expect(error?.message).toContain('Modèle vide');
		expect(writes(calls)).toEqual([]);
	});
});

describe('retirer un élément du modèle', () => {
	it('encore publié ailleurs (RESTRICT) : reste retiré, fichier gardé', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.op === 'select' && call.filters.some((f) => f.startsWith('eq:template_id'))) {
				return { data: { id: 'd', retired_at: null } };
			}
			if (call.op === 'select') {
				return { data: { source_type: 'upload', storage_path: `templates/${MODELE}/a.pdf` } };
			}
			if (call.op === 'update') return { data: [{ id: 'd' }] };
			if (call.op === 'delete') return { error: { message: 'restrict', code: '23503' } };
		});

		const { data, error } = await retireTemplateElement(MODELE, 'document', 'd', supabase);

		expect(error).toBeNull();
		expect(data).toEqual({ deleted: false, fileRemoved: false });
		expect(calls.some((c) => c.op === 'remove')).toBe(false);
	});

	it('ne supprime jamais un fichier rangé hors du dossier de CE modèle', async () => {
		const { supabase, calls } = fakeSupabase((call) => {
			if (call.op === 'select' && call.filters.some((f) => f.startsWith('eq:template_id'))) {
				return { data: { id: 'd', retired_at: '2026-10-14' } };
			}
			if (call.op === 'select' && call.filters.some((f) => f.startsWith('eq:storage_path'))) {
				return { data: [] };
			}
			if (call.op === 'select') {
				return { data: { source_type: 'upload', storage_path: `chapters/${CHAPITRE}/a.pdf` } };
			}
			if (call.op === 'delete') return { data: [{ id: 'd' }] };
		});

		const { data } = await retireTemplateElement(MODELE, 'document', 'd', supabase);

		expect(data).toEqual({ deleted: true, fileRemoved: false });
		expect(calls.some((c) => c.op === 'remove')).toBe(false);
		// Déjà retiré : pas de second `retired_at`.
		expect(calls.some((c) => c.op === 'update')).toBe(false);
	});
});
