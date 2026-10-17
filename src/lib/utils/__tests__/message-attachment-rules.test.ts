/**
 * Forme du chemin d'une pièce jointe que le serveur accepte de signer (audit de #1256).
 * Une « simplification » de la regex rouvrirait la sortie du message ou du bucket.
 */
import { describe, it, expect } from 'vitest';
import { isServerAttachmentPath } from '../message-attachment-rules';

const MESSAGE = '11111111-1111-4111-8111-111111111111';
const UUID = '0b6f1c2e-5a7d-4e8f-9a1b-2c3d4e5f6a7b';

describe('isServerAttachmentPath', () => {
	it.each([
		`messages/${MESSAGE}/${UUID}-cahier_p12.pdf`,
		// Le segment vaut « <uuid>-.. », jamais « .. » : sans effet dans l'URL.
		`messages/${MESSAGE}/${UUID}-..`
	])('accepte %s', (path) => {
		expect(isServerAttachmentPath(path, MESSAGE)).toBe(true);
	});

	it.each([
		['un autre message', `messages/22222222-2222-4222-8222-222222222222/${UUID}-a.pdf`],
		['%2e%2e', `messages/${MESSAGE}/${UUID}-%2e%2e/x.pdf`],
		['un sous-dossier', `messages/${MESSAGE}/${UUID}-a/b.pdf`],
		['une barre oblique inverse', `messages/${MESSAGE}/${UUID}-a\\b.pdf`],
		['un saut de ligne final', `messages/${MESSAGE}/${UUID}-a.pdf\n`],
		['des majuscules dans l’uuid', `messages/${MESSAGE}/${UUID.toUpperCase()}-a.pdf`],
		['MESSAGES/ en majuscules', `MESSAGES/${MESSAGE}/${UUID}-a.pdf`],
		['sans uuid', `messages/${MESSAGE}/a.pdf`],
		['un nom vide', `messages/${MESSAGE}/${UUID}-`],
		['un caractère accentué', `messages/${MESSAGE}/${UUID}-é.pdf`],
		['un nom de plus de 200 caractères', `messages/${MESSAGE}/${UUID}-${'a'.repeat(201)}`]
	])('refuse %s', (_cas, path) => {
		expect(isServerAttachmentPath(path, MESSAGE)).toBe(false);
	});
});
