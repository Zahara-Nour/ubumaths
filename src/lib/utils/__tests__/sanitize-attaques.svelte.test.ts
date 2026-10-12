/**
 * Suite d'attaque des nettoyeurs HTML de l'app, côté NAVIGATEUR (Chromium :
 * c'est le chemin de l'hydratation et de la navigation côté client).
 *
 * Le pendant serveur (jsdom) est `sanitize-attaques.test.ts`. Le nettoyeur des
 * notifications côté serveur (`$lib/server/sanitization`) n'est attaqué que là.
 */
import { describe, expect, it } from 'vitest';
import {
	sanitizeHtml,
	sanitizeHtmlWithMath,
	sanitizePlainText,
	transformMathHtml
} from '../sanitize';
import { sanitizeNotificationHtml } from '../sanitize-notification';
import { ALLOWED_RICH_CONTENT, describeAttackSuite } from './sanitize-attack-vectors';

describeAttackSuite([
	{ name: 'sanitizeHtml', sanitize: sanitizeHtml },
	{ name: 'sanitizeHtmlWithMath', sanitize: sanitizeHtmlWithMath },
	{ name: 'transformMathHtml', sanitize: transformMathHtml },
	{ name: 'sanitizePlainText', sanitize: sanitizePlainText },
	{ name: 'sanitizeNotificationHtml', sanitize: sanitizeNotificationHtml }
]);

describe('sanitizeHtml — contenu riche autorisé conservé', () => {
	it.each(ALLOWED_RICH_CONTENT)('%s', (html) => {
		expect(sanitizeHtml(html)).toBe(html);
	});
});
