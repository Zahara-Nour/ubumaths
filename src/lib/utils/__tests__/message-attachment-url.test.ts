/**
 * Lien de téléchargement d'une pièce jointe de messagerie : seule une adresse
 * de NOTRE stockage donne un lien.
 *
 * `public_url` est écrit par le navigateur de l'expéditeur (aucun contrôle en
 * base) : un élève pouvait y mettre `javascript:…` ou un site externe, sur
 * lequel le prof cliquait (audit de sécurité du 2026-10-03).
 */
import { describe, expect, it } from 'vitest';
import { safeMessageAttachmentUrl } from '../file-upload';

const SUPABASE_URL = 'https://projet.supabase.co';
const OURS = `${SUPABASE_URL}/storage/v1/object/public/message-attachments/user-1/devoir.pdf`;

describe('safeMessageAttachmentUrl', () => {
	it('garde une pièce jointe légitime', () => {
		expect(safeMessageAttachmentUrl(OURS, SUPABASE_URL)).toBe(OURS);
	});

	it.each([
		['javascript:', 'javascript:alert(1)'],
		['site externe', 'https://site-externe.invalid/storage/v1/object/public/message-attachments/x'],
		[
			'autre projet Supabase',
			'https://autre.supabase.co/storage/v1/object/public/message-attachments/x'
		],
		['autre compartiment', `${SUPABASE_URL}/storage/v1/object/public/avatars/x.png`],
		[
			'remontée de chemin',
			`${SUPABASE_URL}/storage/v1/object/public/message-attachments/../avatars/x`
		],
		['http au lieu de https', OURS.replace('https:', 'http:')],
		['protocole-relatif', '//site-externe.invalid/x'],
		['vide', '']
	])('refuse : %s', (_cas, url) => {
		expect(safeMessageAttachmentUrl(url, SUPABASE_URL)).toBeNull();
	});
});
