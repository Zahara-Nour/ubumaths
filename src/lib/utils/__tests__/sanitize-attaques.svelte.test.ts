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

describe('transformMathHtml — formules TipTap (navigateur)', () => {
	it('lit la formule quelle que soit la place de latex (sortie de TipTap)', () => {
		const output = transformMathHtml(
			'<p>Soit <span data-math-inline="" data-math-syntax="latex" data-math-original="" latex="2x+3=11"></span>.</p>'
		);
		expect(output).toContain('<math-field read-only>2x+3=11</math-field>');
	});
});
