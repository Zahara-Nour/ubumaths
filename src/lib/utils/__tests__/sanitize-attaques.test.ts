/**
 * Suite d'attaque des nettoyeurs HTML de l'app, côté SERVEUR (Node + jsdom :
 * c'est le chemin du rendu SSR et de `notifications.ts`).
 *
 * Le pendant navigateur est `sanitize-attaques.svelte.test.ts` : isomorphic-
 * dompurify sert deux codes différents selon l'environnement, les deux sont
 * attaqués. Écrite pour la montée isomorphic-dompurify 2.36 → 4.5 (PR #1088).
 */
import { describe, expect, it } from 'vitest';
import { sanitizeHtml, sanitizePlainText } from '../sanitize';
import { sanitizeNotificationHtml as sanitizeNotificationClient } from '../sanitize-notification';
import { sanitizeNotificationHtml as sanitizeNotificationServer } from '$lib/server/sanitization';
import {
	ALLOWED_RICH_CONTENT,
	describeAttackSuite,
	describeSansMathLive,
	describeTextesAccolades
} from './sanitize-attack-vectors';

describeAttackSuite([
	{ name: 'sanitizeHtml', sanitize: sanitizeHtml },
	{ name: 'sanitizePlainText', sanitize: sanitizePlainText },
	{ name: 'sanitizeNotificationHtml (client)', sanitize: sanitizeNotificationClient },
	{ name: 'sanitizeNotificationHtml (serveur)', sanitize: sanitizeNotificationServer }
]);

describeTextesAccolades([
	{ name: 'sanitizeHtml', sanitize: sanitizeHtml },
	{ name: 'sanitizeNotificationHtml (client)', sanitize: sanitizeNotificationClient },
	{ name: 'sanitizeNotificationHtml (serveur)', sanitize: sanitizeNotificationServer }
]);

describe('sanitizeHtml — contenu riche autorisé conservé', () => {
	it.each(ALLOWED_RICH_CONTENT)('%s', (html) => {
		expect(sanitizeHtml(html)).toBe(html);
	});
});

describe('sanitizeHtml — attributs hors liste retirés', () => {
	it('retire les data-* (ALLOW_DATA_ATTR: false)', () => {
		expect(sanitizeHtml('<p data-x="1" data-math-inline="">a</p>')).toBe('<p>a</p>');
	});
});

describe('sanitizePlainText — aucune balise', () => {
	it('garde le texte, retire tout le balisage', () => {
		expect(sanitizePlainText('<p>a <strong>b</strong></p><script>c</script>')).toBe('a b');
	});
});

describeSansMathLive([
	{ name: 'sanitizeHtml', sanitize: sanitizeHtml },
	{ name: 'sanitizeNotificationHtml (client)', sanitize: sanitizeNotificationClient },
	{ name: 'sanitizeNotificationHtml (serveur)', sanitize: sanitizeNotificationServer }
]);
