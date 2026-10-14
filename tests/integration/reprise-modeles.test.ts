/**
 * Reprise des modèles à snapshot (ADR 0029, étape 4) — base locale requise
 * =======================================================================
 *
 * Reconstruit en local l'état RÉEL de la production lu le 2026-10-14
 * (docs/wip/refonte-modeles-chapitre-progress.md, points 18-19) :
 *
 * - un modèle PUBLIÉ dont le contenu n'existe que dans `content_snapshot` (4 documents
 *   `storage://chapters/<chapitre d'origine>/…`) ;
 * - le chapitre d'origine, lié au modèle (non détaché), 6 sections, 4 PDF réellement
 *   déposés et PUBLIÉS, rangés dans 3 sections — plus un objectif coché par un élève ;
 * - un second chapitre créé depuis le modèle par l'ancien code : 6 sections semées
 *   vides, 4 faux liens Google Drive `storage://…` non publiés.
 *
 * Contrainte de David : les élèves gardent l'accès aux documents publiés À TOUT
 * INSTANT. Prouvé ici par la VRAIE route `/api/documents/[id]`, avant et après.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { present } from '../helpers/present';
import { migrateSnapshotTemplate } from '$lib/server/chapter-template-reprise';
import { GET as serveDocument } from '../../src/routes/api/documents/[id]/+server';

// La route sert le fichier par le client service : branché sur la base LOCALE.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// Types
type Table = keyof Database['public']['Tables'];
type DocRow = Database['public']['Tables']['chapter_documents']['Row'];

// Constantes
const BUCKET = 'chapter-documents';
const TABLES_CONTENU = [
	'chapter_sections',
	'chapter_documents',
	'chapter_checklist_items',
	'chapter_exercises',
	'chapter_worksheets',
	'chapter_series'
] as const;
/** Publiés il y a des jours, à des dates distinctes : elles doivent survivre telles quelles. */
const DATES_PUBLICATION = [5, 4, 3, 2].map((j) =>
	new Date(Date.now() - j * 86_400_000).toISOString()
);

// Variables
const service = createServiceRoleClient();
const ecrits: string[] = [];

// Functions
async function insert<T extends Table>(
	client: SupabaseClient<Database>,
	table: T,
	row: Database['public']['Tables'][T]['Insert']
): Promise<string> {
	const { data, error } = await client
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${String(table)}: ${error.message}`);
	return (data as { id: string }).id;
}

function contenuPdf(i: number): string {
	return `%PDF-1.4 reprise ZZ document ${i}`;
}

async function deposer(path: string, contenu: string): Promise<void> {
	const { error } = await service.storage
		.from(BUCKET)
		.upload(path, new Blob([contenu], { type: 'application/pdf' }), {
			contentType: 'application/pdf',
			upsert: true
		});
	if (error) throw new Error(`dépôt ${path} : ${error.message}`);
	ecrits.push(path);
}

async function existe(path: string): Promise<boolean> {
	const { data } = await service.storage.from(BUCKET).download(path);
	return data !== null;
}

async function fichiersDuModele(modele: string): Promise<string[]> {
	const { data } = await service.storage.from(BUCKET).list(`templates/${modele}`);
	return (data ?? []).filter((f) => f.id !== null).map((f) => `templates/${modele}/${f.name}`);
}

function localsEleve(client: SupabaseClient<Database>, userId: string): App.Locals {
	const user = { id: userId } as User;
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		profile: { id: userId, role: 'student' },
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

/** Ce que la vraie route rend à l'élève : le statut, et le contenu s'il l'a. */
async function lireCommeEleve(
	client: SupabaseClient<Database>,
	eleveId: string,
	documentId: string
): Promise<{ status: number; corps: string | null }> {
	try {
		const r = (await serveDocument({
			locals: localsEleve(client, eleveId),
			params: { id: documentId },
			url: new URL(`http://localhost/api/documents/${documentId}`)
		} as never)) as Response;
		return { status: r.status, corps: r.status === 200 ? await r.text() : null };
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return { status, corps: null };
		throw e;
	}
}

/** Toutes les lignes de contenu d'un propriétaire, table par table (photo de l'état). */
async function photo(colonne: 'chapter_id' | 'template_id', id: string) {
	const etat: Record<string, unknown[]> = {};
	for (const t of TABLES_CONTENU) {
		const { data, error } = await service.from(t).select('*').eq(colonne, id).order('id');
		expect(error).toBeNull();
		etat[t] = data ?? [];
	}
	return etat;
}

async function instanciations(modele: string) {
	const { data, error } = await service
		.from('chapter_template_instantiations')
		.select('chapter_id, is_detached')
		.eq('template_id', modele)
		.order('chapter_id');
	expect(error).toBeNull();
	return data ?? [];
}

describe('ADR 0029, étape 4 — reprise des modèles à snapshot', () => {
	let modele: string;
	let chapSource: string;
	let chapLie: string;
	let eleveSource: SupabaseClient<Database>;
	let eleveSourceId: string;
	let eleveLie: SupabaseClient<Database>;
	let eleveLieId: string;
	let objectif: string;
	const docsSource: { id: string; path: string; publishedAt: string }[] = [];
	const fauxLiens: string[] = [];
	const comptes: string[] = [];
	const classes: string[] = [];
	let ecole: string | undefined;

	beforeAll(async () => {
		await service.storage.createBucket(BUCKET, { public: false }).catch(() => {});

		// L'auteur du modèle : un admin (le compte prof unique de la base locale n'est pas touché).
		const auteur = await TestData.profile().withRole('admin').create();
		comptes.push(auteur.id);
		ecole = await insert(service, 'schools', {
			name: 'Lycée reprise ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert(service, 'school_years', {
			school_id: ecole,
			name: 'Année reprise ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = (nom: string, code: string) =>
			insert(service, 'classes', {
				name: nom,
				school_id: ecole,
				school_year_id: annee,
				join_code: code,
				is_active: true
			});
		classes.push(await classe('1SPE 1 reprise ZZ', 'ZZRPA1'));
		classes.push(await classe('1SPE 2 reprise ZZ', 'ZZRPB1'));
		const [classeSource, classeLiee] = classes;

		const eleve = async (classeId: string) => {
			const e = await TestData.profile().withRole('student').create();
			comptes.push(e.id);
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classeId, student_id: e.id, status: 'active' });
			expect(error).toBeNull();
			return { id: e.id, client: await createAuthenticatedClient(e.email) };
		};
		({ id: eleveSourceId, client: eleveSource } = await eleve(classeSource));
		({ id: eleveLieId, client: eleveLie } = await eleve(classeLiee));

		// Le chapitre d'origine : 6 sections semées par la base, 4 PDF publiés dans 3 d'entre elles.
		chapSource = await insert(service, 'class_chapters', {
			class_id: classeSource,
			title: 'Second degré ZZ',
			is_visible: true,
			display_order: 0
		});
		const { data: sections } = await service
			.from('chapter_sections')
			.select('id')
			.eq('chapter_id', chapSource)
			.order('display_order');
		const sectionsSource = (sections ?? []).map((s) => s.id);
		expect(sectionsSource).toHaveLength(6);
		const rangement = [sectionsSource[0], sectionsSource[0], sectionsSource[2], sectionsSource[4]];

		for (let i = 0; i < 4; i++) {
			const path = `chapters/${chapSource}/17604${i}0000000.pdf`;
			await deposer(path, contenuPdf(i));
			const id = await insert(service, 'chapter_documents', {
				chapter_id: chapSource,
				title: `Document ${i} ZZ`,
				source_type: 'upload',
				storage_path: path,
				file_name: `document-${i}.pdf`,
				file_size: contenuPdf(i).length,
				mime_type: 'application/pdf',
				display_order: i,
				section_id: rangement[i],
				section_order: i,
				published_at: DATES_PUBLICATION[i]
			});
			docsSource.push({ id, path, publishedAt: DATES_PUBLICATION[i] });
		}
		objectif = await insert(service, 'chapter_checklist_items', {
			chapter_id: chapSource,
			content: 'Je sais factoriser ZZ',
			display_order: 0,
			section_id: sectionsSource[1],
			published_at: DATES_PUBLICATION[0]
		});
		await insert(service, 'student_checklist_progress', {
			checklist_item_id: objectif,
			student_id: eleveSourceId,
			is_completed: true,
			completed_at: DATES_PUBLICATION[1]
		});

		// Le modèle : contenu dans le seul snapshot, adresses `storage://` du chapitre d'origine.
		modele = await insert(service, 'chapter_templates', {
			created_by: auteur.id,
			title: 'Second degré ZZ',
			status: 'published',
			content_snapshot: {
				documents: docsSource.map((d, i) => ({
					title: `Document ${i} ZZ`,
					description: null,
					documentUrl: `storage://${d.path}`,
					sourceType: 'google_drive',
					mimeType: 'application/pdf',
					displayOrder: i
				})),
				checklistItems: [],
				exercises: [],
				worksheets: []
			}
		});

		// Le chapitre créé depuis le modèle par l'ancien code : 4 faux liens, rien de publié.
		chapLie = await insert(service, 'class_chapters', {
			class_id: classeLiee,
			title: 'Second degré ZZ',
			is_visible: true,
			display_order: 0
		});
		for (const [i, d] of docsSource.entries()) {
			fauxLiens.push(
				await insert(service, 'chapter_documents', {
					chapter_id: chapLie,
					title: `Document ${i} ZZ`,
					source_type: 'google_drive',
					google_drive_url: `storage://${d.path}`,
					mime_type: 'application/pdf',
					display_order: i
				})
			);
		}

		for (const chapitre of [chapSource, chapLie]) {
			await insert(service, 'chapter_template_instantiations', {
				template_id: modele,
				template_version: 1,
				chapter_id: chapitre,
				current_template_version: 1
			});
		}
	}, 120_000);

	afterAll(async () => {
		const copies = modele ? await fichiersDuModele(modele) : [];
		const aSupprimer = [...ecrits, ...copies];
		if (aSupprimer.length > 0) await service.storage.from(BUCKET).remove(aSupprimer);
		// Nettoyage CIBLÉ (pas de purge globale) : la base locale est partagée entre sessions.
		// Les chapitres d'abord (leurs lignes de lien partent avec eux), puis le modèle.
		for (const chapitre of [chapSource, chapLie].filter(Boolean)) {
			await service.from('class_chapters').delete().eq('id', chapitre);
		}
		if (modele) await service.from('chapter_templates').delete().eq('id', modele);
		for (const c of classes) await service.from('classes').delete().eq('id', c);
		if (ecole) {
			await service.from('school_years').delete().eq('school_id', ecole);
			await service.from('schools').delete().eq('id', ecole);
		}
		for (const id of comptes) await service.auth.admin.deleteUser(id);
	});

	it('décor : AVANT la reprise, l’élève de la classe d’origine lit ses 4 PDF', async () => {
		for (const [i, d] of docsSource.entries()) {
			expect(await lireCommeEleve(eleveSource, eleveSourceId, d.id)).toEqual({
				status: 200,
				corps: contenuPdf(i)
			});
		}
	});

	it('--essai : décrit ce qui serait fait et n’écrit RIEN (ni base, ni stockage)', async () => {
		const avant = {
			source: await photo('chapter_id', chapSource),
			lie: await photo('chapter_id', chapLie),
			modele: await photo('template_id', modele),
			inst: await instanciations(modele)
		};

		const { data, error } = await migrateSnapshotTemplate(modele, chapSource, service, {
			dryRun: true
		});
		expect(error).toBeNull();
		const rapport = present(data);
		expect(rapport.outcome).toBe('dry_run');
		const texte = rapport.lines.join('\n');
		for (const d of docsSource) expect(texte).toContain(d.path);
		expect(texte).toContain('4 faux lien');

		expect(await photo('chapter_id', chapSource)).toEqual(avant.source);
		expect(await photo('chapter_id', chapLie)).toEqual(avant.lie);
		expect(await photo('template_id', modele)).toEqual(avant.modele);
		expect(await instanciations(modele)).toEqual(avant.inst);
		expect(await fichiersDuModele(modele)).toEqual([]);
	});

	it('refuse AVANT toute écriture si un faux lien est publié', async () => {
		const { error: pub } = await service
			.from('chapter_documents')
			.update({ published_at: DATES_PUBLICATION[0] })
			.eq('id', fauxLiens[2])
			.select('id');
		expect(pub).toBeNull();
		const avantLie = await photo('chapter_id', chapLie);
		const avantSource = await photo('chapter_id', chapSource);

		const { data, error } = await migrateSnapshotTemplate(modele, chapSource, service, {
			dryRun: false
		});
		expect(data).toBeNull();
		expect(error?.message).toMatch(/publié/);

		expect(await photo('template_id', modele)).toEqual({
			chapter_sections: [],
			chapter_documents: [],
			chapter_checklist_items: [],
			chapter_exercises: [],
			chapter_worksheets: [],
			chapter_series: []
		});
		expect(await photo('chapter_id', chapLie)).toEqual(avantLie);
		expect(await photo('chapter_id', chapSource)).toEqual(avantSource);
		expect((await instanciations(modele)).every((i) => !i.is_detached)).toBe(true);
		expect(await fichiersDuModele(modele)).toEqual([]);

		const { data: depub } = await service
			.from('chapter_documents')
			.update({ published_at: null })
			.eq('id', fauxLiens[2])
			.select('id');
		expect(depub).toHaveLength(1);
	});

	describe('--appliquer', () => {
		let sourceAvant: Record<string, unknown[]>;

		beforeAll(async () => {
			sourceAvant = await photo('chapter_id', chapSource);
			const { data, error } = await migrateSnapshotTemplate(modele, chapSource, service, {
				dryRun: false
			});
			expect(error).toBeNull();
			const rapport = present(data);
			expect(rapport.outcome).toBe('done');
			expect(rapport.verification.ok).toBe(true);
		}, 60_000);

		it('APRÈS : l’élève de la classe d’origine lit toujours ses 4 PDF, aux mêmes identifiants', async () => {
			for (const [i, d] of docsSource.entries()) {
				expect(await lireCommeEleve(eleveSource, eleveSourceId, d.id)).toEqual({
					status: 200,
					corps: contenuPdf(i)
				});
			}
		});

		it('le chapitre d’origine garde ses lignes : identifiants, publication, sections, case cochée', async () => {
			const apres = await photo('chapter_id', chapSource);
			const idsAvant = (t: string) => (sourceAvant[t] as { id: string }[]).map((r) => r.id);
			const idsApres = (t: string) => (apres[t] as { id: string }[]).map((r) => r.id);
			for (const t of TABLES_CONTENU) expect(idsApres(t)).toEqual(idsAvant(t));

			const docs = apres.chapter_documents as DocRow[];
			for (const d of docsSource) {
				const ligne = present(docs.find((r) => r.id === d.id));
				const avant = present(
					(sourceAvant.chapter_documents as DocRow[]).find((r) => r.id === d.id)
				);
				expect(new Date(present(ligne.published_at)).getTime()).toBe(
					new Date(d.publishedAt).getTime()
				);
				expect(ligne.section_id).toBe(avant.section_id);
				expect(ligne.source_id).not.toBeNull();
				expect(ligne.storage_path?.startsWith(`templates/${modele}/`)).toBe(true);
				expect(await existe(present(ligne.storage_path))).toBe(true);
			}
			// Toutes les sections du chapitre sont devenues des liens vers celles du modèle.
			for (const s of apres.chapter_sections as { source_id: string | null }[]) {
				expect(s.source_id).not.toBeNull();
			}

			const { data: coche } = await service
				.from('student_checklist_progress')
				.select('is_completed')
				.eq('checklist_item_id', objectif)
				.eq('student_id', eleveSourceId)
				.single();
			expect(coche?.is_completed).toBe(true);
		});

		it('les fichiers d’origine `chapters/…` sont toujours là, intacts', async () => {
			for (const [i, d] of docsSource.entries()) {
				const { data } = await service.storage.from(BUCKET).download(d.path);
				expect(await present(data).text()).toBe(contenuPdf(i));
			}
		});

		it('le modèle possède son contenu : 6 sections, 4 documents copiés, 1 objectif', async () => {
			const m = await photo('template_id', modele);
			expect(m.chapter_sections).toHaveLength(6);
			expect(m.chapter_documents).toHaveLength(4);
			expect(m.chapter_checklist_items).toHaveLength(1);
			expect(await fichiersDuModele(modele)).toHaveLength(4);
			expect((await instanciations(modele)).every((i) => !i.is_detached)).toBe(true);
		});

		it('le chapitre lié : faux liens supprimés, 4 vrais liens non publiés, plan du modèle', async () => {
			const lie = await photo('chapter_id', chapLie);
			const docs = lie.chapter_documents as DocRow[];
			expect(docs.map((d) => d.id).filter((id) => fauxLiens.includes(id))).toEqual([]);
			expect(docs).toHaveLength(4);
			for (const d of docs) {
				expect(d.source_id).not.toBeNull();
				expect(d.published_at).toBeNull();
				expect(d.source_type).toBe('upload');
				expect(d.google_drive_url ?? '').not.toMatch(/^storage:/);
			}
			const sections = lie.chapter_sections as { source_id: string | null }[];
			expect(sections).toHaveLength(6);
			expect(sections.every((s) => s.source_id !== null)).toBe(true);
			expect(lie.chapter_checklist_items).toHaveLength(1);

			// Rien de publié : l'élève de cette classe ne lit aucun document.
			for (const d of docs) {
				expect((await lireCommeEleve(eleveLie, eleveLieId, d.id)).status).toBe(404);
			}
		});

		it('une seconde exécution ne fait rien', async () => {
			const avant = {
				source: await photo('chapter_id', chapSource),
				lie: await photo('chapter_id', chapLie),
				modele: await photo('template_id', modele)
			};
			const { data, error } = await migrateSnapshotTemplate(modele, chapSource, service, {
				dryRun: false
			});
			expect(error).toBeNull();
			expect(present(data).outcome).toBe('nothing_to_do');
			expect(present(data).verification.ok).toBe(true);
			expect(await photo('chapter_id', chapSource)).toEqual(avant.source);
			expect(await photo('chapter_id', chapLie)).toEqual(avant.lie);
			expect(await photo('template_id', modele)).toEqual(avant.modele);
		});
	});
});
