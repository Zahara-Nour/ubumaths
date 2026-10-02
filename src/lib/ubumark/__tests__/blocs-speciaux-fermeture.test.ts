/**
 * Un ``` lointain ne ferme plus un bloc spécial dont il est séparé par du
 * texte (Q66, 2026-10-02) — la règle Q47 des ```courbe / ```figure /
 * statistiques, étendue à ```variation, ```probtree, ```trig, ```line.
 *
 * Avant : un de ces blocs non fermé, suivi plus loin d'un ``` seul, se fermait
 * dessus ; le texte intermédiaire était perdu (variation) ou affiché dans un
 * bloc de code brut (probtree, line).
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode } from '$lib/ubumark';

const children = (markdown: string) => parseMarkdown(markdown).children as BlockNode[];
const types = (markdown: string) => children(markdown).map((c) => c.type);

/** Le paragraphe qui contient ce texte, s'il existe */
const paragraphWith = (nodes: BlockNode[], text: string) =>
	nodes.find((n) => n.type === 'paragraph' && JSON.stringify(n).includes(text));

describe('Q66 — un ``` lointain ne ferme pas un bloc séparé par du texte', () => {
	it.each([
		['variation', '```variation\nvariable: x\ndomain: -inf, +inf'],
		['probtree', '```probtree\nRouge:1/2\nBleue:1/2'],
		['trig', '```trig\npreset: quarters'],
		['line', '```line\nstart: 0\nend: 5']
	])('%s : le texte intermédiaire est un paragraphe', (_, block) => {
		const md = `${block}\n\nVoici le texte qui suit le bloc\n\n\`\`\`\n\nfin`;
		const nodes = children(md);

		expect(paragraphWith(nodes, 'Voici le texte qui suit le bloc')).toBeDefined();
		// Aucun bloc de code ne contient ce texte
		const codes = nodes.filter((n) => n.type === 'code-block');
		expect(JSON.stringify(codes)).not.toContain('Voici le texte');
		// Le ``` resté seul ouvre ensuite un bloc de code, comme après un
		// ```courbe ou une ```figure non fermés (inchangé)
		expect(nodes.at(-1)?.type).toBe('code-block');
	});
});

// Revue : une ligne FAUTIVE (`:` oublié) dans un bloc fermé faisait avaler la
// suite du document en code ; sur main, la ligne était seulement ignorée
describe('une faute de frappe dans un bloc fermé : la suite du document intacte', () => {
	it.each([
		['trig', '```trig\npreset: quarters\n\npreset all\n```'],
		['line', '```line\nstart: 0\nend: 5\n\narrows true\n```'],
		['probtree', '```probtree\nRouge:1/2\n\nBoule rouge 3/5\n```'],
		['variation', '```variation\nvariable: x\ndomain: -inf, +inf\n\nsign f de x\n```']
	])('%s', (_, block) => {
		const nodes = children(`${block}\n\nSuite importante\n\n## Titre`);

		expect(paragraphWith(nodes, 'Suite importante')).toBeDefined();
		expect(nodes.map((n) => n.type)).toContain('heading');
		// Un bloc invalide montre sa source (Q64), mais n'avale pas la suite
		const codes = nodes.filter((n) => n.type === 'code-block');
		expect(JSON.stringify(codes)).not.toContain('Suite importante');
	});
});

describe('ce qui ne change pas', () => {
	it('tableau de variations fermé, avec lignes vides et sections', () => {
		const md = [
			'```variation',
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: z',
			'  0,+inf: -',
			'',
			'variation: f(x)',
			'  -inf: 1',
			'  0: 0',
			'  +inf: 1',
			'```',
			'',
			'fin'
		].join('\n');

		expect(types(md)).toEqual(['variation-table', 'paragraph']);
	});

	it('arbre de probabilités fermé, ligne vide avant les branches', () => {
		const md = '```probtree\nroot: Urne\n\nRouge:3/5\n  Rouge:2/4\nBleue:2/5\n```\n\nfin';

		expect(types(md)).toEqual(['probability-tree', 'paragraph']);
	});

	it('point 2 — ```courbe non fermé, texte, ``` lointain : le texte reste lu', () => {
		const nodes = children('```courbe\nx: -1 ; 1\n\nVoici le texte de la suite\n\n```');

		expect(paragraphWith(nodes, 'Voici le texte de la suite')).toBeDefined();
	});
});
