/**
 * Rapports de bug : l'auteur n'écrit que ce que l'écran lui propose (base locale requise)
 * =====================================================================================
 *
 * Écart T29, constat du `security-auditor` sur #3115 : la policy UPDATE de
 * `bug_reports` (« Users can update own pending bug reports ») n'a pas de liste
 * de colonnes, et la policy INSERT ne contrôle que l'auteur. Par l'API de la
 * base, l'auteur d'un rapport pouvait le créer déjà « résolu », avec une note de
 * résolution et une date choisie, puis en réécrire toutes les colonnes tant
 * qu'il était en attente, chemin de la capture compris.
 *
 * Écart T28 : les règles d'accès du stockage des captures (`bug-report-screenshots`)
 * n'étaient dans aucune migration. Sur une base recréée, l'admin ne pouvait plus
 * effacer une capture, et l'auteur ne pouvait pas en déposer.
 *
 * Décision de David (2026-11-26) :
 *   - à la création, un rapport naît « en attente », daté de maintenant, sans
 *     capture, sans note ni date de résolution ; toute autre valeur est refusée ;
 *   - tant qu'il est en attente, son auteur ne change que le titre, la
 *     description et la capture (chemin rangé dans SON dossier et celui de CE
 *     rapport) ; tout le reste est figé pour lui ;
 *   - l'admin garde tous ses droits ; le serveur garde la main ;
 *   - stockage : les règles de la prod, recopiées telles quelles.
 *
 * Ce que le fichier prouve :
 *   1. création : le parcours de l'application passe ; un état, une résolution,
 *      une capture ou une date choisis sont refusés par une erreur ;
 *   2. modification par l'auteur : titre, description et capture conforme
 *      passent ; toute autre colonne est refusée par une erreur, seule ou glissée
 *      derrière une colonne permise ; un chemin de capture hors de son dossier ou
 *      d'un autre rapport est refusé ;
 *   3. rapport pris en charge : l'auteur ne modifie plus rien (silence de la RLS,
 *      inchangé) ; un autre élève ne modifie jamais le rapport d'un camarade ;
 *   4. l'admin traite un rapport comme avant ; le serveur écrit ce qu'il veut ;
 *   5. la suppression du compte d'un admin vide toujours `resolved_by`, même
 *      pendant la session d'un autre compte (clé étrangère ON DELETE SET NULL) ;
 *   6. stockage : l'auteur dépose et relit dans son dossier, pas dans celui d'un
 *      autre ; un camarade et le prof ne lisent ni n'effacent ; l'admin lit et
 *      efface.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type Profile = Database['public']['Tables']['profiles']['Row'];
type ReportUpdate = Database['public']['Tables']['bug_reports']['Update'];
type ReportInsert = Database['public']['Tables']['bug_reports']['Insert'];

// ============================================================================
// CONSTANTES
// ============================================================================

const BUCKET = 'bug-report-screenshots';
const TITRE = 'Le bouton Valider ne répond pas';
const DESCRIPTION = 'Sur la page des exercices, le bouton Valider reste gris après ma réponse.';
const L_AN_DERNIER = '2025-11-26T10:00:00.000Z';
/** Écart toléré entre l'horloge du test et celle de la base. */
const TOLERANCE_MS = 60_000;
/** En-tête PNG : le bucket n'accepte que des images. */
const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

/** Ce que l'application envoie à la création (api/bug-reports, POST). */
function commeLApplication(userId: string): ReportInsert {
	return {
		user_id: userId,
		category: 'bug',
		severity: 'medium',
		title: TITRE,
		description: DESCRIPTION,
		page_url: 'http://localhost/exercices',
		user_agent: 'navigateur de test',
		viewport_size: '390x844',
		session_context: { capturedAt: new Date().toISOString() },
		auto_generated: false
	};
}

/** Crée un rapport avec le client service ; rend son identifiant. */
async function creer(userId: string, enPlus: Partial<ReportInsert> = {}): Promise<string> {
	const { data, error } = await service
		.from('bug_reports')
		.insert({ ...commeLApplication(userId), ...enPlus })
		.select('id')
		.single();
	if (error || !data) throw new Error(`création du rapport impossible : ${error?.message}`);
	return data.id;
}

/** Le rapport entier tel qu'il est en base, lu par le client service. */
async function enBase(reportId: string) {
	const { data, error } = await service.from('bug_reports').select('*').eq('id', reportId).single();
	if (error || !data) throw new Error(`lecture du rapport impossible : ${error?.message}`);
	return data;
}

/** Le rapport sans sa date de mise à jour, que la base règle seule. */
async function enBaseSansMiseAJour(reportId: string) {
	const { updated_at: _miseAJour, ...reste } = await enBase(reportId);
	return reste;
}

/**
 * Création par un compte connecté avec une valeur qu'il n'a pas à choisir :
 * REFUSÉE par une erreur, et aucun rapport n'est créé.
 */
async function creationRefusee(
	client: Client,
	userId: string,
	enTrop: Partial<ReportInsert>
): Promise<void> {
	const id = crypto.randomUUID();
	const { data, error } = await client
		.from('bug_reports')
		.insert({ ...commeLApplication(userId), id, ...enTrop })
		.select('id');
	expect(data).toBeNull();
	expect(error?.code).toBe('42501');
	expect(error?.message).toContain('se cree en attente');

	const { data: lignes } = await service.from('bug_reports').select('id').eq('id', id);
	expect(lignes).toEqual([]);
}

/**
 * Tentative de réécriture : REFUSÉE par la base (erreur lisible), pas ignorée
 * par la RLS, et la ligne entière reste intacte.
 */
async function reecritureRefusee(
	client: Client,
	reportId: string,
	patch: ReportUpdate,
	message = 'ne se reecrit pas'
): Promise<void> {
	const avant = await enBase(reportId);
	const { data, error } = await client
		.from('bug_reports')
		.update(patch)
		.eq('id', reportId)
		.select('id');
	expect(data).toBeNull();
	expect(error?.code).toBe('42501');
	expect(error?.message).toContain(message);
	expect(await enBase(reportId)).toEqual(avant);
}

/** Modification acceptée : une ligne rendue, et la base porte les valeurs. */
async function modificationAcceptee(
	client: Client,
	reportId: string,
	patch: ReportUpdate
): Promise<void> {
	const { data, error } = await client
		.from('bug_reports')
		.update(patch)
		.eq('id', reportId)
		.select('id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
	expect(await enBase(reportId)).toMatchObject(patch);
}

/** Dépose une capture avec le client service ; rend son chemin. */
async function deposerCapture(userId: string, reportId: string): Promise<string> {
	const chemin = `${userId}/${reportId}/${crypto.randomUUID()}.png`;
	const { error } = await service.storage
		.from(BUCKET)
		.upload(chemin, IMAGE, { contentType: 'image/png' });
	if (error) throw new Error(`dépôt de la capture impossible : ${error.message}`);
	return chemin;
}

/** Vrai si le fichier est encore au stockage (lu par le client service). */
async function captureAuStockage(chemin: string): Promise<boolean> {
	const { data } = await service.storage.from(BUCKET).download(chemin);
	return data !== null;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Rapports de bug — l’auteur n’écrit que ce que l’écran lui propose', () => {
	let admin: Profile;
	let teacher: Profile;
	let eleve: Profile;
	let camarade: Profile;
	let adminClient: Client;
	let teacherClient: Client;
	let eleveClient: Client;
	let camaradeClient: Client;
	const captures: string[] = [];

	beforeAll(async () => {
		await cleanupAllTestData();
		admin = await TestData.profile().withRole('admin').create();
		teacher = await TestData.profile().withRole('teacher').create();
		eleve = await TestData.profile().withRole('student').create();
		camarade = await TestData.profile().withRole('student').create();

		adminClient = await createAuthenticatedClient(admin.email);
		teacherClient = await createAuthenticatedClient(teacher.email);
		eleveClient = await createAuthenticatedClient(eleve.email);
		camaradeClient = await createAuthenticatedClient(camarade.email);
	});

	afterAll(async () => {
		if (captures.length > 0) await service.storage.from(BUCKET).remove(captures);
		await cleanupAllTestData();
	});

	describe('à la création', () => {
		it('le parcours de l’application passe : rapport en attente, daté de maintenant', async () => {
			const { data, error } = await eleveClient
				.from('bug_reports')
				.insert(commeLApplication(eleve.id))
				.select('id')
				.single();

			expect(error).toBeNull();
			const rapport = await enBase(data?.id ?? '');
			expect(rapport).toMatchObject({
				user_id: eleve.id,
				status: 'pending',
				title: TITRE,
				screenshot_path: null,
				screenshot_url: null,
				resolution_notes: null,
				resolved_by: null,
				resolved_at: null
			});
			expect(Math.abs(new Date(rapport.created_at).getTime() - Date.now())).toBeLessThan(
				TOLERANCE_MS
			);
		});

		it('un rapport détecté automatiquement passe aussi', async () => {
			const { error } = await eleveClient
				.from('bug_reports')
				.insert({ ...commeLApplication(eleve.id), auto_generated: true })
				.select('id')
				.single();

			expect(error).toBeNull();
		});

		it.each<[string, Partial<ReportInsert>]>([
			['déjà résolu', { status: 'resolved' }],
			['déjà pris en charge', { status: 'acknowledged' }],
			['avec une note de résolution', { resolution_notes: 'Corrigé par l’équipe.' }],
			['avec une date de résolution', { resolved_at: new Date().toISOString() }],
			['daté de l’an dernier', { created_at: L_AN_DERNIER }],
			['avec une date de mise à jour choisie', { updated_at: L_AN_DERNIER }],
			['avec une adresse de capture', { screenshot_url: 'https://exemple.test/image.png' }]
		])('un rapport %s est refusé', async (_cas, enTrop) => {
			await creationRefusee(eleveClient, eleve.id, enTrop);
		});

		it('un rapport résolu au nom de l’admin est refusé', async () => {
			await creationRefusee(eleveClient, eleve.id, { resolved_by: admin.id });
		});

		it('un rapport qui nomme déjà une capture est refusé', async () => {
			const id = await creer(camarade.id);
			const chemin = await deposerCapture(camarade.id, id);
			captures.push(chemin);

			await creationRefusee(eleveClient, eleve.id, { screenshot_path: chemin });
		});

		it('l’admin, à la création, est un auteur comme un autre', async () => {
			await creationRefusee(adminClient, admin.id, { status: 'resolved' });
		});

		it('personne ne crée un rapport au nom d’un autre (RLS, inchangé)', async () => {
			const { data, error } = await eleveClient
				.from('bug_reports')
				.insert(commeLApplication(camarade.id))
				.select('id');

			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});

		it('le serveur crée le rapport qu’il veut', async () => {
			const id = await creer(eleve.id, { status: 'resolved', created_at: L_AN_DERNIER });

			expect(await enBase(id)).toMatchObject({ status: 'resolved' });
			expect(new Date((await enBase(id)).created_at).toISOString()).toBe(L_AN_DERNIER);
		});
	});

	describe('l’auteur, tant que son rapport est en attente', () => {
		it('corrige son titre et sa description', async () => {
			const id = await creer(eleve.id);

			await modificationAcceptee(eleveClient, id, {
				title: 'Le bouton Valider reste gris',
				description: 'Après ma réponse à la question 3, le bouton Valider reste gris.'
			});
		});

		it('joint une capture rangée dans son dossier et celui de ce rapport', async () => {
			const id = await creer(eleve.id);

			await modificationAcceptee(eleveClient, id, {
				screenshot_url: null,
				screenshot_path: `${eleve.id}/${id}/1700000000000.png`
			});
		});

		it('remplace sa capture par une autre', async () => {
			const id = await creer(eleve.id, { screenshot_path: `${eleve.id}/placeholder/1.png` });

			await modificationAcceptee(eleveClient, id, {
				screenshot_path: `${eleve.id}/${id}/2.png`
			});
		});

		it('renvoyer les mêmes valeurs n’est pas une réécriture', async () => {
			const id = await creer(eleve.id);
			const avant = await enBaseSansMiseAJour(id);

			const { data, error } = await eleveClient
				.from('bug_reports')
				.update({ severity: 'medium', category: 'bug', status: 'pending' })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBaseSansMiseAJour(id)).toEqual(avant);
		});

		it.each<[string, ReportUpdate]>([
			['la gravité', { severity: 'critical' }],
			['la catégorie', { category: 'feature' }],
			['la note de résolution', { resolution_notes: 'Corrigé par l’équipe.' }],
			['la date de résolution', { resolved_at: new Date().toISOString() }],
			['la marque « détecté automatiquement »', { auto_generated: true }],
			['la page d’origine', { page_url: 'http://localhost/ailleurs' }],
			['le navigateur', { user_agent: 'un autre navigateur' }],
			['la taille d’écran', { viewport_size: '1x1' }],
			['le contexte technique', { session_context: { errors: [] } }],
			['la date de création', { created_at: L_AN_DERNIER }],
			['la date de mise à jour', { updated_at: L_AN_DERNIER }],
			['l’identifiant', { id: crypto.randomUUID() }]
		])('ne change pas %s', async (_colonne, patch) => {
			const id = await creer(eleve.id);

			await reecritureRefusee(eleveClient, id, patch);
		});

		it('ne passe pas lui-même son rapport à « résolu »', async () => {
			const id = await creer(eleve.id);

			await reecritureRefusee(eleveClient, id, { status: 'resolved' });
		});

		it('ne signe pas la résolution au nom de l’admin', async () => {
			const id = await creer(eleve.id);

			await reecritureRefusee(eleveClient, id, { resolved_by: admin.id });
		});

		it('ne donne pas son rapport à un camarade', async () => {
			const id = await creer(eleve.id);

			await reecritureRefusee(eleveClient, id, { user_id: camarade.id });
		});

		it('ne glisse pas une réécriture derrière une colonne permise', async () => {
			const id = await creer(eleve.id);

			await reecritureRefusee(eleveClient, id, { title: 'Un autre titre', severity: 'critical' });
		});

		it('ne fait pas pointer sa capture vers celle d’un camarade', async () => {
			const id = await creer(eleve.id);
			const autre = await creer(camarade.id);
			const chemin = await deposerCapture(camarade.id, autre);
			captures.push(chemin);

			await reecritureRefusee(eleveClient, id, { screenshot_path: chemin }, 'capture non conforme');
		});

		it('ne fait pas pointer sa capture vers celle d’un autre de ses rapports', async () => {
			const id = await creer(eleve.id);
			const autre = await creer(eleve.id);

			await reecritureRefusee(
				eleveClient,
				id,
				{ screenshot_path: `${eleve.id}/${autre}/1.png` },
				'capture non conforme'
			);
		});

		it.each<[string, (userId: string, reportId: string) => string | null]>([
			['qui remonte d’un dossier', (u, r) => `${u}/${r}/../1.png`],
			['avec un sous-dossier en trop', (u, r) => `${u}/${r}/sous/1.png`],
			['sans nom de fichier', (u, r) => `${u}/${r}/`],
			['sans dossier de rapport', (u) => `${u}/1.png`],
			['au dossier écrit en majuscules', (u, r) => `${u.toUpperCase()}/${r}/1.png`],
			['vide', () => '']
		])('refuse un chemin de capture %s', async (_cas, chemin) => {
			const id = await creer(eleve.id);

			await reecritureRefusee(
				eleveClient,
				id,
				{ screenshot_path: chemin(eleve.id, id) },
				'capture non conforme'
			);
		});

		it('n’écrit pas d’adresse de capture', async () => {
			const id = await creer(eleve.id);

			await reecritureRefusee(
				eleveClient,
				id,
				{ screenshot_url: 'https://exemple.test/image.png' },
				'Adresse de capture non modifiable'
			);
		});

		it('ne retire pas la capture jointe (elle se remplace seulement)', async () => {
			const id = await creer(eleve.id, { screenshot_path: `${eleve.id}/placeholder/1.png` });

			await reecritureRefusee(eleveClient, id, { screenshot_path: null }, 'capture non conforme');
		});

		it('vide « résolu par » resté sur un rapport remis en attente (exception écrite)', async () => {
			const id = await creer(eleve.id, { resolved_by: admin.id });

			await modificationAcceptee(eleveClient, id, { resolved_by: null });
		});

		it('ne glisse rien derrière « résolu par » vidé', async () => {
			const id = await creer(eleve.id, { resolved_by: admin.id });

			await reecritureRefusee(eleveClient, id, { resolved_by: null, severity: 'critical' });
		});
	});

	describe('une fois le rapport pris en charge', () => {
		it('l’auteur ne modifie plus rien, pas même le titre (silence de la RLS)', async () => {
			const id = await creer(eleve.id, { status: 'acknowledged' });
			const avant = await enBase(id);

			const { data, error } = await eleveClient
				.from('bug_reports')
				.update({ title: 'Un autre titre' })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toEqual([]);
			expect(await enBase(id)).toEqual(avant);
		});
	});

	describe('un autre compte', () => {
		it('un camarade ne modifie pas le rapport de l’élève', async () => {
			const id = await creer(eleve.id);
			const avant = await enBase(id);

			const { data, error } = await camaradeClient
				.from('bug_reports')
				.update({ title: 'Un autre titre' })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toEqual([]);
			expect(await enBase(id)).toEqual(avant);
		});

		it('le prof ne modifie pas le rapport de l’élève', async () => {
			const id = await creer(eleve.id);
			const avant = await enBase(id);

			const { data, error } = await teacherClient
				.from('bug_reports')
				.update({ status: 'resolved' })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toEqual([]);
			expect(await enBase(id)).toEqual(avant);
		});
	});

	describe('l’admin', () => {
		it('traite un rapport comme avant : état, note, signature et date', async () => {
			const id = await creer(eleve.id);
			const resoluLe = new Date().toISOString();

			const { data, error } = await adminClient
				.from('bug_reports')
				.update({
					status: 'resolved',
					resolution_notes: 'Corrigé dans la version suivante.',
					resolved_by: admin.id,
					resolved_at: resoluLe
				})
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBase(id)).toMatchObject({
				status: 'resolved',
				resolution_notes: 'Corrigé dans la version suivante.',
				resolved_by: admin.id
			});
		});

		it('remet un rapport en attente', async () => {
			const id = await creer(eleve.id, { status: 'acknowledged' });

			await modificationAcceptee(adminClient, id, { status: 'pending' });
		});

		it('change la gravité d’un rapport', async () => {
			const id = await creer(eleve.id);

			await modificationAcceptee(adminClient, id, { severity: 'critical' });
		});
	});

	describe('le serveur', () => {
		it('réécrit un rapport', async () => {
			const id = await creer(eleve.id);

			const { error } = await service
				.from('bug_reports')
				.update({ severity: 'low', created_at: L_AN_DERNIER })
				.eq('id', id);

			expect(error).toBeNull();
			expect(await enBase(id)).toMatchObject({ severity: 'low' });
		});
	});

	describe('suppression du compte d’un admin', () => {
		it('vide « résolu par », même pendant la session d’un autre compte', async () => {
			const partant = await TestData.profile().withRole('admin').create();
			const id = await creer(eleve.id, { status: 'resolved', resolved_by: partant.id });

			// La clé étrangère (ON DELETE SET NULL) met le rapport à jour au nom du
			// compte connecté : la garde ne doit pas prendre ce passage pour une
			// réécriture par l'auteur.
			const pg = await getPostgresClient();
			await pg.query('begin');
			try {
				await pg.query(`select set_config('request.jwt.claims', $1, true)`, [
					JSON.stringify({ sub: eleve.id, role: 'authenticated' })
				]);
				await pg.query('delete from profiles where id = $1', [partant.id]);
				await pg.query('commit');
			} catch (erreur) {
				await pg.query('rollback');
				throw erreur;
			}

			expect(await enBase(id)).toMatchObject({ status: 'resolved', resolved_by: null });
		});
	});

	describe('stockage des captures', () => {
		it('l’auteur dépose une capture dans son dossier et la relit', async () => {
			const id = await creer(eleve.id);
			const chemin = `${eleve.id}/${id}/1.png`;
			captures.push(chemin);

			const depot = await eleveClient.storage
				.from(BUCKET)
				.upload(chemin, IMAGE, { contentType: 'image/png' });
			expect(depot.error).toBeNull();

			const lecture = await eleveClient.storage.from(BUCKET).download(chemin);
			expect(lecture.error).toBeNull();
			expect(lecture.data).not.toBeNull();
		});

		it('l’auteur remplace sa capture au même chemin, un camarade ne l’écrase pas', async () => {
			const id = await creer(eleve.id);
			const chemin = await deposerCapture(eleve.id, id);
			captures.push(chemin);
			const autreImage = new Uint8Array([...IMAGE, 0x00]);

			const intrus = await camaradeClient.storage
				.from(BUCKET)
				.upload(chemin, autreImage, { contentType: 'image/png', upsert: true });
			expect(intrus.error).not.toBeNull();

			const remplacement = await eleveClient.storage
				.from(BUCKET)
				.upload(chemin, autreImage, { contentType: 'image/png', upsert: true });
			expect(remplacement.error).toBeNull();

			const { data } = await service.storage.from(BUCKET).download(chemin);
			expect(data?.size).toBe(autreImage.length);
		});

		it('l’auteur efface sa propre capture', async () => {
			const id = await creer(eleve.id);
			const chemin = await deposerCapture(eleve.id, id);
			captures.push(chemin);

			const { data, error } = await eleveClient.storage.from(BUCKET).remove([chemin]);

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await captureAuStockage(chemin)).toBe(false);
		});

		it('un élève ne dépose rien dans le dossier d’un camarade', async () => {
			const id = await creer(camarade.id);
			const chemin = `${camarade.id}/${id}/intrus.png`;
			captures.push(chemin);

			const { error } = await eleveClient.storage
				.from(BUCKET)
				.upload(chemin, IMAGE, { contentType: 'image/png' });

			expect(error).not.toBeNull();
			expect(await captureAuStockage(chemin)).toBe(false);
		});

		it('un camarade ne lit ni n’efface la capture de l’élève', async () => {
			const id = await creer(eleve.id);
			const chemin = await deposerCapture(eleve.id, id);
			captures.push(chemin);

			const lecture = await camaradeClient.storage.from(BUCKET).download(chemin);
			expect(lecture.data).toBeNull();

			const { data } = await camaradeClient.storage.from(BUCKET).remove([chemin]);
			expect(data ?? []).toEqual([]);
			expect(await captureAuStockage(chemin)).toBe(true);
		});

		it('le prof ne lit ni n’efface la capture de l’élève', async () => {
			const id = await creer(eleve.id);
			const chemin = await deposerCapture(eleve.id, id);
			captures.push(chemin);

			const lecture = await teacherClient.storage.from(BUCKET).download(chemin);
			expect(lecture.data).toBeNull();

			const { data } = await teacherClient.storage.from(BUCKET).remove([chemin]);
			expect(data ?? []).toEqual([]);
			expect(await captureAuStockage(chemin)).toBe(true);
		});

		it('l’admin lit la capture de l’élève, puis l’efface', async () => {
			const id = await creer(eleve.id);
			const chemin = await deposerCapture(eleve.id, id);
			captures.push(chemin);

			const lecture = await adminClient.storage.from(BUCKET).download(chemin);
			expect(lecture.error).toBeNull();
			expect(lecture.data).not.toBeNull();

			const { data, error } = await adminClient.storage.from(BUCKET).remove([chemin]);
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await captureAuStockage(chemin)).toBe(false);
		});
	});
});
