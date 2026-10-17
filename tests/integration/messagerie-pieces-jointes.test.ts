/**
 * Messagerie : pièces jointes privées, lues par l'expéditeur, les destinataires et l'admin
 * ======================================================================================
 *
 * Mesuré en prod le 2026-10-13 : le bucket `message-attachments` n'existait pas, toute
 * pièce jointe échouait en silence. Décision de David (2026-10-13) : un élève envoie par
 * exemple le scan de son cahier au prof.
 *   - qui joint : l'expéditeur du message (élève → prof, prof → élèves) ;
 *   - qui lit : l'expéditeur, les destinataires qui ne l'ont pas supprimé, l'admin ;
 *   - bucket PRIVÉ, sans policy de storage : seul le serveur y accède (liens signés) ;
 *   - images JPEG, PNG, WebP, HEIC et PDF, 10 Mo, 3 par message.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const BUCKET = 'message-attachments';
/** Préfixe de nom que le serveur donne à chaque fichier (`<uuid>-<nom>`). */
const UUID_NOM = '0b6f1c2e-5a7d-4e8f-9a1b-2c3d4e5f6a7b';

// ============================================================================
// TESTS
// ============================================================================

describe('messagerie : pièces jointes', () => {
	let prof: { id: string; email: string };
	let eleve: { id: string; email: string };
	let autre: { id: string; email: string };
	let admin: { id: string; email: string };
	let messageId: string;
	let messageDeLAutre: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = await TestData.profile().withRole('teacher').create();
		eleve = await TestData.profile().withRole('student').create();
		autre = await TestData.profile().withRole('student').create();
		admin = await TestData.profile().withRole('admin').create();

		const pg = await getPostgresClient();
		const envoyer = async (expediteur: string, destinataire: string) => {
			const { rows } = await pg.query<{ id: string }>(
				`insert into private_messages (sender_id, subject, content)
				 values ($1, 'zz-scan', '{}'::jsonb) returning id`,
				[expediteur]
			);
			await pg.query(`insert into message_inbox (message_id, recipient_id) values ($1, $2)`, [
				rows[0].id,
				destinataire
			]);
			return rows[0].id;
		};
		messageId = await envoyer(eleve.id, prof.id);
		messageDeLAutre = await envoyer(autre.id, prof.id);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from private_messages where id = any($1)', [
			[messageId, messageDeLAutre]
		]);
		await cleanupAllTestData();
	});

	it('le bucket existe, privé, plafonné à 10 Mo, images et PDF seulement', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`select public, file_size_limit::int as limite, allowed_mime_types::text[] as types
			 from storage.buckets where id = $1`,
			[BUCKET]
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].public).toBe(false);
		expect(rows[0].limite).toBe(10 * 1024 * 1024);
		expect([...rows[0].types].sort()).toEqual(
			[
				'application/pdf',
				'image/heic',
				'image/heif',
				'image/jpeg',
				'image/png',
				'image/webp'
			].sort()
		);
	});

	it('l’expéditeur enregistre une pièce jointe rangée sous son message', async () => {
		const client = await createAuthenticatedClient(eleve.email);
		const { data, error } = await client
			.from('message_attachments_v2')
			.insert({
				message_id: messageId,
				file_name: 'cahier.jpg',
				file_type: 'image/jpeg',
				file_size: 1000,
				storage_path: `messages/${messageId}/${UUID_NOM}-cahier.jpg`,
				uploaded_by: eleve.id
			})
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	// La contrainte de la table plafonnait à 5 Mo, le bucket à 10 Mo (décision de David) :
	// un fichier de 5 à 10 Mo était déposé, puis sa ligne refusée.
	it('une pièce jointe de 8 Mo s’enregistre', async () => {
		const client = await createAuthenticatedClient(eleve.email);
		const { error } = await client
			.from('message_attachments_v2')
			.insert({
				message_id: messageId,
				file_name: 'gros-scan.pdf',
				file_type: 'application/pdf',
				file_size: 8 * 1024 * 1024,
				storage_path: `messages/${messageId}/${UUID_NOM}-gros-scan.pdf`,
				uploaded_by: eleve.id
			})
			.select('id');
		expect(error).toBeNull();
	});

	it.each([
		['sous le message d’un autre', () => `messages/${messageDeLAutre}/x.jpg`],
		['avec un segment « .. »', () => `messages/${messageId}/../${messageDeLAutre}/x.jpg`],
		['hors du dossier messages/', () => `${autre.id}/x.jpg`],
		// Audit de #1256 : ces formes passaient le seul refus de « /../ ».
		['avec %2e%2e encodé', () => `messages/${messageId}/%2e%2e/%2e%2e/x.jpg`],
		['avec une barre oblique inverse', () => `messages/${messageId}/..\\x.jpg`],
		['sans le préfixe uuid du serveur', () => `messages/${messageId}/x.jpg`]
	])('un chemin rangé %s est refusé', async (_cas, chemin) => {
		const client = await createAuthenticatedClient(eleve.email);
		const { error } = await client.from('message_attachments_v2').insert({
			message_id: messageId,
			file_name: 'x.jpg',
			file_type: 'image/jpeg',
			file_size: 1000,
			storage_path: chemin(),
			uploaded_by: eleve.id
		});
		expect(error?.code).toBe('42501');
	});

	it('le destinataire et l’admin voient la pièce jointe, un autre élève non', async () => {
		const voit = async (email: string) => {
			const client = await createAuthenticatedClient(email);
			const { data, error } = await client
				.from('message_attachments_v2')
				.select('file_name')
				.eq('message_id', messageId)
				.eq('file_name', 'cahier.jpg');
			expect(error).toBeNull();
			return data;
		};
		expect(await voit(prof.email)).toEqual([{ file_name: 'cahier.jpg' }]);
		expect(await voit(admin.email)).toEqual([{ file_name: 'cahier.jpg' }]);
		expect(await voit(autre.email)).toEqual([]);
	});

	it('aucun compte ne dépose ni ne lit directement dans le bucket : seul le serveur', async () => {
		// Le bucket existe (test plus haut) : un refus ici vient de l'absence de policy,
		// pas d'un « Bucket not found ».
		const service = createServiceRoleClient();
		const chemin = `messages/${messageId}/${UUID_NOM}-cahier.jpg`;
		const depot = await service.storage
			.from(BUCKET)
			.upload(chemin, new Blob(['zz'], { type: 'image/jpeg' }), { upsert: true });
		expect(depot.error).toBeNull();

		try {
			const client = await createAuthenticatedClient(eleve.email);
			const envoi = await client.storage
				.from(BUCKET)
				.upload(
					`messages/${messageId}/direct.pdf`,
					new Blob(['%PDF-1.4'], { type: 'application/pdf' })
				);
			expect(envoi.error?.message).toMatch(/row-level security|policy|unauthorized/i);

			for (const lecteur of [
				client,
				createClient(SUPABASE_URL, ANON_KEY, {
					auth: { persistSession: false, autoRefreshToken: false }
				})
			]) {
				const lecture = await lecteur.storage.from(BUCKET).download(chemin);
				expect(lecture.data).toBeNull();
			}
		} finally {
			await service.storage.from(BUCKET).remove([chemin]);
		}
	});

	// Purge des messages (3 ans) et retrait d'une pièce jointe : la ligne part, le fichier
	// reste (le SQL ne touche pas au storage). Le cron du dimanche retire les fichiers
	// que cette fonction liste : sans ligne de pièce jointe, et vieux de plus d'un jour
	// (un envoi en cours n'a pas encore enregistré sa ligne).
	it('liste les fichiers orphelins de plus d’un jour, réservée au serveur', async () => {
		const service = createServiceRoleClient();
		const pg = await getPostgresClient();
		const vieux = `messages/${messageId}/zz-orphelin-vieux.pdf`;
		const recent = `messages/${messageId}/zz-orphelin-recent.pdf`;
		const rattache = `messages/${messageId}/zz-rattache.pdf`;
		await pg.query(
			`insert into message_attachments_v2
			   (message_id, file_name, file_type, file_size, storage_path, uploaded_by)
			 values ($1, 'zz-rattache.pdf', 'application/pdf', 1, $2, $3)`,
			[messageId, rattache, eleve.id]
		);
		for (const chemin of [vieux, recent, rattache]) {
			const { error } = await service.storage
				.from(BUCKET)
				.upload(chemin, new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { upsert: true });
			expect(error).toBeNull();
		}
		await pg.query(
			`update storage.objects set created_at = now() - interval '2 days'
			 where bucket_id = $1 and name = any($2)`,
			[BUCKET, [vieux, rattache]]
		);

		try {
			// Fonction née avec cette migration : `database.ts` (généré depuis la prod) ne la
			// connaît qu'après le push, d'où un client non typé.
			const brut = service as unknown as SupabaseClient;
			const { data, error } = await brut.rpc('list_orphan_message_attachment_files', {
				p_limit: 100
			});
			expect(error).toBeNull();
			const noms = (data ?? []).map((ligne: { name: string }) => ligne.name);
			expect(noms).toContain(vieux);
			expect(noms).not.toContain(recent);
			expect(noms).not.toContain(rattache);

			const client = (await createAuthenticatedClient(eleve.email)) as unknown as SupabaseClient;
			const refus = await client.rpc('list_orphan_message_attachment_files', { p_limit: 100 });
			expect(refus.error?.code).toBe('42501');
		} finally {
			await service.storage.from(BUCKET).remove([vieux, recent, rattache]);
		}
	});
});
