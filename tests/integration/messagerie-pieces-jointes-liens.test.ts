/**
 * Messagerie : liens d'envoi et de lecture des pièces jointes, de bout en bout
 * ============================================================================
 *
 * Le bucket est privé, sans policy de storage : `src/lib/server/message-attachments.ts`
 * décide de l'accès avec le client de l'utilisateur (sa RLS), puis signe avec le client
 * service. Règles de David (2026-10-13) : joint = expéditeur ; lit = expéditeur,
 * destinataire qui n'a pas supprimé le message, admin ; 3 par message.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	createAttachmentUploadUrl,
	getAttachmentDownloadUrl
} from '$lib/server/message-attachments';
import { MESSAGE_ATTACHMENT_BUCKET } from '$lib/utils/message-attachment-rules';

// ============================================================================
// CONSTANTES
// ============================================================================

const SCAN = { file_name: 'cahier p12.pdf', file_type: 'application/pdf' as const, file_size: 9 };
const CONTENU = '%PDF-1.4\n';

// ============================================================================
// TESTS
// ============================================================================

describe('messagerie : liens des pièces jointes', () => {
	const service = createServiceRoleClient();
	let prof: { id: string; email: string };
	let eleve: { id: string; email: string };
	let autre: { id: string; email: string };
	let admin: { id: string; email: string };
	let messageId: string;
	let messageDeLAutre: string;
	let attachmentId: string;
	let chemin: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = await TestData.profile().withRole('teacher').create();
		eleve = await TestData.profile().withRole('student').create();
		autre = await TestData.profile().withRole('student').create();
		admin = await TestData.profile().withRole('admin').create();

		const pg = await getPostgresClient();
		const envoyer = async (expediteur: string) => {
			const { rows } = await pg.query<{ id: string }>(
				`insert into private_messages (sender_id, subject, content)
				 values ($1, 'zz-scan', '{}'::jsonb) returning id`,
				[expediteur]
			);
			await pg.query(`insert into message_inbox (message_id, recipient_id) values ($1, $2)`, [
				rows[0].id,
				prof.id
			]);
			return rows[0].id;
		};
		messageId = await envoyer(eleve.id);
		messageDeLAutre = await envoyer(autre.id);
	});

	afterAll(async () => {
		if (chemin) await service.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove([chemin]);
		const pg = await getPostgresClient();
		await pg.query('delete from private_messages where id = any($1)', [
			[messageId, messageDeLAutre]
		]);
		await cleanupAllTestData();
	});

	it('l’élève dépose le scan par le lien d’envoi, puis l’enregistre sous son message', async () => {
		const client = await createAuthenticatedClient(eleve.email);
		const lien = await createAttachmentUploadUrl(client, service, eleve.id, messageId, SCAN);
		expect(lien.ok).toBe(true);
		if (!lien.ok) return;
		expect(lien.path.startsWith(`messages/${messageId}/`)).toBe(true);
		chemin = lien.path;

		const envoi = await client.storage
			.from(MESSAGE_ATTACHMENT_BUCKET)
			.uploadToSignedUrl(lien.path, lien.token, new Blob([CONTENU], { type: SCAN.file_type }));
		expect(envoi.error).toBeNull();

		const { data, error } = await client
			.from('message_attachments_v2')
			.insert({ message_id: messageId, ...SCAN, storage_path: lien.path, uploaded_by: eleve.id })
			.select('id');
		expect(error).toBeNull();
		attachmentId = data![0].id;
	});

	it('pas de lien d’envoi pour le message d’un autre', async () => {
		const client = await createAuthenticatedClient(eleve.email);
		const lien = await createAttachmentUploadUrl(client, service, eleve.id, messageDeLAutre, SCAN);
		expect(lien).toMatchObject({ ok: false, status: 403 });
	});

	it('le prof (destinataire) et l’admin ouvrent le scan, un autre élève non', async () => {
		for (const compte of [prof, admin, eleve]) {
			const client = await createAuthenticatedClient(compte.email);
			const url = await getAttachmentDownloadUrl(client, service, attachmentId);
			expect(url, compte.email).not.toBeNull();
			const reponse = await fetch(url!);
			expect(reponse.status).toBe(200);
			expect(await reponse.text()).toBe(CONTENU);
		}

		const client = await createAuthenticatedClient(autre.email);
		expect(await getAttachmentDownloadUrl(client, service, attachmentId)).toBeNull();
	});

	it('un destinataire qui a supprimé le message ne l’ouvre plus', async () => {
		const pg = await getPostgresClient();
		await pg.query(
			'update message_inbox set deleted = true where message_id = $1 and recipient_id = $2',
			[messageId, prof.id]
		);
		try {
			const client = await createAuthenticatedClient(prof.email);
			expect(await getAttachmentDownloadUrl(client, service, attachmentId)).toBeNull();
		} finally {
			await pg.query(
				'update message_inbox set deleted = false where message_id = $1 and recipient_id = $2',
				[messageId, prof.id]
			);
		}
	});

	it('pas de 4ᵉ pièce jointe', async () => {
		const pg = await getPostgresClient();
		for (const n of [2, 3]) {
			await pg.query(
				`insert into message_attachments_v2
				   (message_id, file_name, file_type, file_size, storage_path, uploaded_by)
				 values ($1, 'f.pdf', 'application/pdf', 1, $2, $3)`,
				[messageId, `messages/${messageId}/f${n}.pdf`, eleve.id]
			);
		}
		const client = await createAuthenticatedClient(eleve.email);
		const lien = await createAttachmentUploadUrl(client, service, eleve.id, messageId, SCAN);
		expect(lien).toMatchObject({ ok: false, status: 409 });
	});
});
