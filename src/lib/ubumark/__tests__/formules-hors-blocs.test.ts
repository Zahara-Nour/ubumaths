/**
 * L'extraction des formules n'entre plus dans les blocs (Q60-Q61, 2026-10-02).
 *
 * Avant : `extractMath` passait sur tout le document, blocs compris. Un `$$`
 * (SQL Postgres) ou un `~` dans du code y était pris pour une formule ; les
 * lignes repliées décalaient l'appariement PAR RANG des blocs repérés sur le
 * texte à formules remplacées et sur le texte original → code d'un autre bloc
 * affiché, texte avalé. Mis au jour par #630.
 *
 * - Q60 : sont protégés exactement les blocs que le parseur lit lui-même
 *   comme blocs (code, ```courbe, ```variation…), selon leurs propres règles.
 * - Q61 : un `$$…$$` qui enjamberait un bloc n'est plus une formule.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode } from '$lib/ubumark';

const children = (markdown: string) => parseMarkdown(markdown).children as BlockNode[];
const types = (markdown: string) => children(markdown).map((c) => c.type);
const codes = (markdown: string) =>
	children(markdown)
		.filter((c) => c.type === 'code-block')
		.map((c) => (c as { code: string }).code);
const all = (markdown: string) => JSON.stringify(children(markdown));

const VARIATION = [
	'```variation',
	'variable: x',
	'domain: -inf, 0, +inf',
	'',
	'sign: f(x)',
	'  -inf,0: +',
	'  0: z',
	'  0,+inf: -',
	'```'
];

describe('Q60 — le code des blocs est intact', () => {
	it('deux blocs SQL avec `$$`, du texte entre : codes et texte intacts', () => {
		const md = [
			'```sql',
			'CREATE FUNCTION f() ... $$;',
			'```',
			'',
			'milieu',
			'',
			'```sql',
			'CREATE FUNCTION g() ... $$;',
			'```',
			'',
			'fin'
		].join('\n');

		expect(codes(md)).toEqual(['CREATE FUNCTION f() ... $$;', 'CREATE FUNCTION g() ... $$;']);
		expect(types(md)).toEqual(['code-block', 'paragraph', 'code-block', 'paragraph']);
		expect(all(md)).toContain('milieu');
	});

	it('`~~` dans des blocs py : rien n’est avalé', () => {
		const md = '```py\na = ~~x\n```\n\nmilieu\n\n```js\nz ~~\n```\n\nfin';

		expect(codes(md)).toEqual(['a = ~~x', 'z ~~']);
		expect(all(md)).toContain('milieu');
	});

	it('`~~~ a~` (info avec un tilde) : la suite du document est lue', () => {
		const md = '~~~ a~\nx\n~~~\n\nmilieu\n\n```py\ny\n```\n\nfin';

		expect(codes(md)).toEqual(['x', 'y']);
		expect(all(md)).toContain('milieu');
	});

	// Garde-fou (passe aussi sur main)
	it('une formule `$x$` dans le texte autour reste une formule', () => {
		const md = 'avant $x^2$\n\n```py\ny $$\n```\n\naprès $y$';

		expect(all(md)).not.toContain('"avant $x^2$"');
		expect(types(md)).toEqual(['paragraph', 'code-block', 'paragraph']);
		expect(parseMarkdown(md).children[0]).toMatchObject({ type: 'paragraph' });
		expect(all(md)).toContain('x^2');
	});
});

// Repérés sur le texte original mais parcourus avec les indices de l'autre
// texte : une formule sur plusieurs lignes placée avant les décalait
describe('blocs spéciaux après une formule sur plusieurs lignes', () => {
	it('tableau de variations : un tableau, pas un bloc de code', () => {
		const md = ['$$', 'a', '$$', '', ...VARIATION, '', 'fin'].join('\n');

		expect(types(md)).toEqual(['math-block', 'variation-table', 'paragraph']);
	});

	it('cercle trigonométrique : pas de bloc de code en trop', () => {
		const md = '$$\na\n$$\n\n```trig\npoint: pi/3\n```\n\nfin';

		expect(types(md)).not.toContain('code-block');
	});
});

describe('Q61 — un `$$` qui enjamberait un bloc n’est plus une formule', () => {
	it('les `$$` restent du texte, le bloc est intact', () => {
		const md = 'texte $$ a\n\n```py\ny\n```\n\nb $$ fin';

		expect(codes(md)).toEqual(['y']);
		expect(types(md)).not.toContain('math-block');
		expect(all(md)).toContain('$$');
	});
});

describe('ce qui ne change pas', () => {
	it('```courbe non fermé suivi d’un paragraphe avec `$x$` : formule, comme avant', () => {
		const nodes = children('```courbe\nx: -1 ; 1\n\nVoici $x^2$ ici');

		expect(nodes.map((n) => n.type)).toEqual(['courbe', 'paragraph']);
		// Une formule : plus le texte brut `$x^2$`, mais l'expression
		expect(JSON.stringify(nodes[1])).not.toContain('$x^2$');
		expect(JSON.stringify(nodes[1])).toContain('x^2');
	});

	it('Q60 — fence non fermée dans une formule sur plusieurs lignes : formule, comme avant', () => {
		const md = '$$ a\n```py\nb $$\n\nsuite $x$';

		expect(types(md)).toEqual(['math-block', 'paragraph']);
		expect(codes(md)).toEqual([]);
	});

	it('une formule sur plusieurs lignes hors bloc : toujours un bloc de formule', () => {
		expect(types('$$\na\n$$\n\n```py\ny\n```')).toEqual(['math-block', 'code-block']);
	});

	it('tableau de variations seul : rendu identique', () => {
		expect(types(VARIATION.join('\n'))).toEqual(['variation-table']);
	});
});
