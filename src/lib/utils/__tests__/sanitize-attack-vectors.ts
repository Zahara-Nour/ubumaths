/**
 * Vecteurs d'attaque XSS partagés par les suites qui attaquent les nettoyeurs
 * HTML de l'app (`sanitize-attaques.test.ts` côté serveur / jsdom,
 * `sanitize-attaques.svelte.test.ts` côté navigateur).
 *
 * On attaque les FONCTIONS DE L'APP (`sanitizeHtml`, `transformMathHtml`,
 * `sanitizeNotificationHtml`…), jamais DOMPurify nu : c'est la configuration de
 * l'app qui fait la défense, et c'est elle qu'une montée de version peut casser.
 */

import { describe, expect, it } from 'vitest';

/** Un vecteur : un nom lisible et la charge utile envoyée au nettoyeur. */
export interface AttackVector {
	name: string;
	payload: string;
}

export const ATTACK_VECTORS: readonly AttackVector[] = [
	{ name: 'script', payload: '<p>a</p><script>alert(1)</script>' },
	{ name: 'script en majuscules', payload: '<SCRIPT SRC=//evil.example/x.js></SCRIPT>' },
	{ name: 'img onerror', payload: '<img src=x onerror=alert(1)>' },
	{ name: 'svg onload', payload: '<svg onload=alert(1)><circle r=1 /></svg>' },
	{
		name: 'svg animate href',
		payload:
			'<svg><a><animate attributeName=href values=javascript:alert(1) /><text>x</text></a></svg>'
	},
	{ name: 'a href javascript', payload: '<a href="javascript:alert(1)">x</a>' },
	{ name: 'a href javascript tabulé', payload: '<a href="jav&#x09;ascript:alert(1)">x</a>' },
	{ name: 'a href javascript retour à la ligne', payload: '<a href="java\nscript:alert(1)">x</a>' },
	{
		name: 'a href javascript entités',
		payload:
			'<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">x</a>'
	},
	{
		name: 'a href javascript espaces en tête',
		payload: '<a href=" \u0001javascript:alert(1)">x</a>'
	},
	{ name: 'a href vbscript', payload: '<a href="vbscript:msgbox(1)">x</a>' },
	{
		name: 'a href data text/html',
		payload: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'
	},
	{ name: 'img src javascript', payload: '<img src="javascript:alert(1)">' },
	{ name: 'iframe', payload: '<iframe src="https://evil.example"></iframe>' },
	{ name: 'iframe srcdoc', payload: '<iframe srcdoc="<script>alert(1)</script>"></iframe>' },
	{ name: 'object', payload: '<object data="javascript:alert(1)"></object>' },
	{ name: 'embed', payload: '<embed src="javascript:alert(1)">' },
	{
		name: 'mutation XSS math/mglyph',
		payload: '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'
	},
	{
		name: 'mutation XSS math/style commentaire',
		payload:
			'<math><mtext><h1><a><h6></a></h6><mglyph><svg><mtext><style><a title="</style><img src onerror=alert(1)>"></style></h1>'
	},
	{
		name: 'mutation XSS noscript',
		payload: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">'
	},
	{
		name: 'style @import',
		payload: '<style>@import "https://evil.example/x.css";</style><p>a</p>'
	},
	{ name: 'style expression', payload: '<p style="width: expression(alert(1))">a</p>' },
	{
		name: 'form action',
		payload: '<form action="https://evil.example"><input name=p><button>ok</button></form>'
	},
	{ name: 'button formaction', payload: '<button formaction="javascript:alert(1)">x</button>' },
	{
		name: 'meta refresh',
		payload: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
	},
	{ name: 'base href', payload: '<base href="https://evil.example/">' },
	{ name: 'link stylesheet', payload: '<link rel=stylesheet href="https://evil.example/x.css">' },
	{ name: 'div onmouseover', payload: '<div onmouseover="alert(1)">a</div>' },
	{ name: 'details ontoggle', payload: '<details open ontoggle=alert(1)>' },
	{ name: 'attribut data-*', payload: '<p data-x="1" data-math-evil="2">a</p>' },
	{
		name: 'math-field onfocus',
		payload: '<math-field onfocus="alert(1)" autofocus>x</math-field>'
	},
	{ name: 'clobbering id/name', payload: '<img name=getElementById><form id=location></form>' },
	{ name: 'template', payload: '<template><img src=x onerror=alert(1)></template>' },
	{
		name: 'commentaire conditionnel',
		payload: '<!--[if gte IE 4]><script>alert(1)</script><![endif]-->'
	}
];

/**
 * Ce que l'app autorise VOLONTAIREMENT dans `sanitizeHtml` (contenu riche :
 * sorties HTML du carnet, énoncés, modèles de messages) : doit sortir intact.
 */
export const ALLOWED_RICH_CONTENT: readonly string[] = [
	'<p><strong>Gras</strong> et <em>italique</em></p>',
	'<a href="https://chiph.re/cours" target="_blank" rel="noopener">lien</a>',
	'<a href="mailto:prof@example.com">écrire</a>',
	'<a href="/dashboard/student">relatif</a>',
	'<img src="https://chiph.re/a.png" alt="figure" width="10" height="20">',
	'<table><thead><tr><th colspan="2">T</th></tr></thead><tbody><tr><td rowspan="1">1</td></tr></tbody></table>',
	'<math-field read-only="">x^2</math-field>',
	'<p class="note" style="color: red;">rouge</p>',
	'<ul><li>a</li></ul><ol><li>b</li></ol><blockquote>c</blockquote><pre><code>d</code></pre>'
];

// Balises qui ne doivent JAMAIS ressortir d'un nettoyeur de l'app
// (`math-field` est autorisé : on n'interdit que `<math` suivi d'un blanc ou de `>`).
const FORBIDDEN_TAG =
	/<\s*(script|iframe|object|embed|svg|math|mglyph|style|form|button|input|meta|base|link|template|noscript|frame|frameset|details)(\s|>|\/)/i;
// Attribut gestionnaire d'événement (`onerror=`, `onload=`…)
const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=/i;
// Attributs qui naviguent ou embarquent un document
const DANGEROUS_ATTR = /\s(srcdoc|formaction|action|xlink:href)\s*=/i;
// Valeur d'attribut d'URL : href / src
const URL_ATTR = /\s(?:href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]*))/gi;
const SAFE_URL_SCHEMES = new Set(['http', 'https', 'mailto']);

/**
 * Raisons pour lesquelles une sortie nettoyée reste dangereuse (vide = sûre).
 * Lit la sortie comme le navigateur : contrôles et blancs retirés du schéma.
 */
export function findDangers(output: string): string[] {
	const dangers: string[] = [];
	// Le contenu d'une valeur d'attribut entre guillemets est inerte (le
	// sérialiseur échappe `"`) : jsdom y laisse `<img onerror=…>` en clair,
	// Chromium l'échappe. On ne cherche balises et attributs que hors valeurs.
	const markup = output.replace(/="[^"]*"/g, '=""');
	const tag = FORBIDDEN_TAG.exec(markup);
	if (tag) dangers.push(`balise interdite <${tag[1]}>`);
	if (EVENT_HANDLER_ATTR.test(markup)) dangers.push('gestionnaire on*=');
	const attr = DANGEROUS_ATTR.exec(markup);
	if (attr) dangers.push(`attribut ${attr[1]}`);
	for (const match of output.matchAll(URL_ATTR)) {
		const raw = match[2] ?? match[3] ?? match[4] ?? '';
		// eslint-disable-next-line no-control-regex -- on reproduit la lecture du navigateur
		const normalized = decodeEntities(raw).replace(/[\u0000- ]/g, '');
		const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1].toLowerCase();
		if (scheme !== undefined && !SAFE_URL_SCHEMES.has(scheme)) {
			dangers.push(`URL de schéma ${scheme}:`);
		}
	}
	return dangers;
}

/** Décode les entités numériques et les quelques entités nommées utiles ici. */
function decodeEntities(value: string): string {
	return value
		.replace(/&#x([0-9a-f]+);?/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);?/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
		.replace(/&colon;/gi, ':')
		.replace(/&tab;/gi, '\t')
		.replace(/&newline;/gi, '\n')
		.replace(/&amp;/gi, '&');
}

/** Un nettoyeur de l'app à attaquer. */
export interface NamedSanitizer {
	name: string;
	sanitize: (dirty: string) => string;
}

/**
 * Déclare la suite d'attaque sur chaque nettoyeur : aucun vecteur ne doit
 * laisser de construction exécutable dans la sortie.
 */
export function describeAttackSuite(sanitizers: readonly NamedSanitizer[]): void {
	for (const { name, sanitize } of sanitizers) {
		describe(`${name} — vecteurs d'attaque neutralisés`, () => {
			it.each(ATTACK_VECTORS)('$name', ({ payload }) => {
				const output = sanitize(payload);
				expect(findDangers(output), output).toEqual([]);
			});
		});
	}
}
