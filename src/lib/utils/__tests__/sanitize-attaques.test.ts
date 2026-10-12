/**
 * Suite d'attaque des nettoyeurs HTML de l'app, côté SERVEUR (Node + jsdom :
 * c'est le chemin du rendu SSR et de `notifications.ts`).
 *
 * Le pendant navigateur est `sanitize-attaques.svelte.test.ts` : isomorphic-
 * dompurify sert deux codes différents selon l'environnement, les deux sont
 * attaqués. Écrite pour la montée isomorphic-dompurify 2.36 → 4.5 (PR #1088).
 */
import { describe, expect, it } from 'vitest';
import {
	sanitizeHtml,
	sanitizeHtmlWithMath,
	sanitizePlainText,
	transformMathHtml
} from '../sanitize';
import { sanitizeNotificationHtml as sanitizeNotificationClient } from '../sanitize-notification';
import { sanitizeNotificationHtml as sanitizeNotificationServer } from '$lib/server/sanitization';
import { ALLOWED_RICH_CONTENT, describeAttackSuite, findDangers } from './sanitize-attack-vectors';

describeAttackSuite([
	{ name: 'sanitizeHtml', sanitize: sanitizeHtml },
	{ name: 'sanitizeHtmlWithMath', sanitize: sanitizeHtmlWithMath },
	{ name: 'transformMathHtml', sanitize: transformMathHtml },
	{ name: 'sanitizePlainText', sanitize: sanitizePlainText },
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

describe('transformMathHtml — formules TipTap', () => {
	it("n'injecte pas de balise par l'attribut latex", () => {
		const output = transformMathHtml(
			'<span data-math-inline latex="&lt;img src=x onerror=alert(1)&gt;"></span>'
		);
		expect(findDangers(output), output).toEqual([]);
		expect(output.replace(/="[^"]*"/g, '=""')).not.toContain('<img');
	});
});

describe('sanitizePlainText — aucune balise', () => {
	it('garde le texte, retire tout le balisage', () => {
		expect(sanitizePlainText('<p>a <strong>b</strong></p><script>c</script>')).toBe('a b');
	});
});
