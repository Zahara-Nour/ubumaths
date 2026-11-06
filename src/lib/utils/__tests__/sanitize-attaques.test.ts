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
import { ALLOWED_RICH_CONTENT, describeAttackSuite } from './sanitize-attack-vectors';

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
	// Le LaTeX devient le TEXTE du champ, échappé : `findDangers`, qui lit le texte comme
	// du balisage, y verrait `onerror=` — d'où l'égalité exacte. (Sur `main`, ce test
	// passait sans rien prouver : la formule sortait vide, c'était le bug.)
	const SORTIE_ECHAPPEE =
		'<span class="math-inline-wrapper"><math-field read-only="">&lt;img src=x onerror=alert(1)&gt;</math-field></span>';

	it("n'injecte pas de balise par l'attribut latex", () => {
		const output = transformMathHtml(
			'<span data-math-inline latex="&lt;img src=x onerror=alert(1)&gt;"></span>'
		);
		expect(output).toBe(SORTIE_ECHAPPEE);
	});

	// Forme réelle de `editor.getHTML()` : `data-math-inline=""` d'abord, `latex` en
	// dernier. La formule sortait VIDE dans le cahier de texte (élève, lien public) :
	// l'expression ne lisait `latex` que juste après le marqueur, sans `=""`.
	it('lit la formule quelle que soit la place de latex (sortie de TipTap)', () => {
		const output = transformMathHtml(
			'<p>Soit <span data-math-inline="" data-math-syntax="latex" data-math-original="" latex="2x+3=11"></span>.</p>' +
				'<div data-math-block="" data-math-syntax="latex" data-math-original="" latex="x^2&lt;4"></div>'
		);
		expect(output).toContain('<math-field read-only="">2x+3=11</math-field>');
		expect(output).toContain('<math-field read-only="">x^2&lt;4</math-field>');
	});

	it("n'injecte pas de balise par latex placé après le marqueur", () => {
		const output = transformMathHtml(
			'<span data-math-inline="" latex="&lt;img src=x onerror=alert(1)&gt;"></span>'
		);
		expect(output).toBe(SORTIE_ECHAPPEE);
	});
});

describe('sanitizePlainText — aucune balise', () => {
	it('garde le texte, retire tout le balisage', () => {
		expect(sanitizePlainText('<p>a <strong>b</strong></p><script>c</script>')).toBe('a b');
	});
});

// Audit de #2425 : `>` dans une valeur d'attribut (jsdom ne l'échappe pas au rendu
// serveur) fermait la balise pour l'ancienne expression → vrai HTML injecté.
const CHARGES_ATTRIBUT_FERMANT = [
	'<span data-math-inline="" title="></span><img src=x onerror=alert(1)>"></span>',
	'<span data-math-inline="" latex="></span><img src=x onerror=alert(1)>"></span>',
	'<div data-math-block="" title="></div><svg onload=alert(1)>"></div>',
	'<span title="x data-math-inline ></span><img src=x onerror=alert(1)>"></span>',
	'<span latex="a" data-math-inline="" title="></span><img src=x onerror=alert(1)>"></span>'
];

describe('transformMathHtml — `>` dans une valeur d’attribut (audit #2425)', () => {
	it.each(CHARGES_ATTRIBUT_FERMANT)('%s', (charge) => {
		const output = transformMathHtml(charge);
		const horsValeurs = output.replace(/="[^"]*"/g, '=""');
		expect(horsValeurs, output).not.toMatch(/<img|<svg/);
	});
});
