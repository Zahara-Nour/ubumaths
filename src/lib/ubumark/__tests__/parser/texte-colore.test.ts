/**
 * Texte coloré dans la prose : `[texte]{.nom}` (ADR 0042)
 * ======================================================
 *
 * Comportements validés par David le 2026-11-20 (journal texte-colore, § 3) :
 * les 12 noms de la palette des figures, combinables avec un détail de
 * correction ou une marque du dictionnaire ; nom inconnu → texte normal, sans
 * crochets, et le nom inconnu est gardé pour le message au prof.
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import type { InlineNode, ParagraphNode, TextNode } from '#lib/ubumark/index.ts';
import { resolveText } from '#lib/ubumark/parameterization/resolver/text-resolver.ts';
import { inlineColorValue, unknownClassesMessage } from '#lib/components/markdown/inline-color.ts';
import { tableCellMarkedInline } from '#lib/components/markdown/table-cell-inline.ts';

function paragraphChildren(md: string): InlineNode[] {
	const block = parseMarkdown(md).children[0] as ParagraphNode;
	expect(block.type).toBe('paragraph');
	return block.children;
}

function textNodes(md: string): TextNode[] {
	return paragraphChildren(md).filter((n): n is TextNode => n.type === 'text');
}

function plain(md: string): string {
	return textNodes(md)
		.map((n) => n.content)
		.join('');
}

describe('texte coloré — cas normaux', () => {
	it('[le cône]{.orange} : le texte est orange, sans les crochets', () => {
		expect(plain("C'est [le cône]{.orange}.")).toBe("C'est le cône.");
		const colored = textNodes("C'est [le cône]{.orange}.").find((n) => n.content === 'le cône');
		expect(colored?.color).toBe('orange');
	});

	it('le reste de la phrase n’a pas de couleur', () => {
		const nodes = textNodes("C'est [le cône]{.orange}.");
		expect(nodes.filter((n) => n.content !== 'le cône').every((n) => !n.color)).toBe(true);
	});

	it('nom anglais ramené au français, majuscules ignorées', () => {
		expect(textNodes('[a]{.blue}')[0].color).toBe('bleu');
		expect(textNodes('[a]{.Orange}')[0].color).toBe('orange');
	});

	it('les 12 noms de la palette', () => {
		for (const name of [
			'bleu',
			'rouge',
			'vert',
			'orange',
			'violet',
			'jaune',
			'cyan',
			'marron',
			'rose',
			'gris',
			'noir',
			'blanc'
		]) {
			expect(textNodes(`[a]{.${name}}`)[0].color).toBe(name);
		}
	});

	it('casse ignorée aussi pour le dictionnaire : {.Def}', () => {
		expect(textNodes('[a]{.Def}')[0].lexicon).toEqual({ mode: 'force' });
	});

	it('combiné avec le dictionnaire : [le cône]{.orange .def}', () => {
		const node = textNodes('Voici [le cône]{.orange .def}.').find((n) => n.content === 'le cône');
		expect(node).toMatchObject({ color: 'orange', lexicon: { mode: 'force' } });
	});

	it('combiné avec un détail : [la règle]{.rappel .vert}', () => {
		const node = textNodes('On applique [la règle]{.rappel .vert}.').find(
			(n) => n.content === 'la règle'
		);
		expect(node).toMatchObject({ color: 'vert', detail: 'reminder' });
	});

	it('ordre des classes indifférent : {.vert .rappel}', () => {
		const node = textNodes('[la règle]{.vert .rappel}')[0];
		expect(node).toMatchObject({ color: 'vert', detail: 'reminder' });
	});

	it('gras autour : **[le cône]{.orange}**', () => {
		const node = textNodes('**[le cône]{.orange}**')[0];
		expect(node).toMatchObject({ content: 'le cône', bold: true, color: 'orange' });
	});

	it('gras dedans : [**le** cône]{.orange}', () => {
		const nodes = textNodes('[**le** cône]{.orange}');
		expect(nodes.map((n) => n.content).join('')).toBe('le cône');
		expect(nodes.every((n) => n.color === 'orange')).toBe(true);
		expect(nodes.find((n) => n.content === 'le')?.bold).toBe(true);
	});

	it('une formule dans le passage prend la couleur', () => {
		const math = paragraphChildren('Le carré [$x^2$ ici]{.orange}.').find(
			(c) => c.type === 'math-inline'
		);
		expect(math && math.type === 'math-inline' ? math.color : undefined).toBe('orange');
	});

	it('couleur tirée : [le cône]{.{{c}}} avec c = rouge', () => {
		const md = resolveText('[le cône]{.{{c}}}', [{ name: 'c', value: 'rouge' }]);
		expect(md).toBe('[le cône]{.rouge}');
		expect(textNodes(md)[0].color).toBe('rouge');
	});

	it('dans un item de liste et dans une citation', () => {
		const list = parseMarkdown('- [a]{.vert}').children[0];
		expect(JSON.stringify(list)).toContain('"color":"vert"');
		const quote = parseMarkdown('> [a]{.vert}').children[0];
		expect(JSON.stringify(quote)).toContain('"color":"vert"');
	});
});

describe('texte coloré — cas limites', () => {
	it('deux couleurs l’une dans l’autre : la plus proche gagne', () => {
		const nodes = textNodes('[le [grand]{.rouge} cône]{.bleu}');
		expect(nodes.map((n) => n.content).join('')).toBe('le grand cône');
		expect(nodes.find((n) => n.content === 'grand')?.color).toBe('rouge');
		expect(nodes.find((n) => n.content.startsWith('le'))?.color).toBe('bleu');
	});

	it('crochets sans accolade : rien ne change', () => {
		expect(plain('Le mot [x] reste.')).toBe('Le mot [x] reste.');
	});

	it('crochets dans une formule : rien ne change', () => {
		const math = paragraphChildren('Sur $[0;1]$, f croît.').find((c) => c.type === 'math-inline');
		expect(math && math.type === 'math-inline' ? math.expression : undefined).toBe('[0;1]');
	});

	it('jamais dans du code en ligne', () => {
		const node = textNodes('`[x]{.orange}`')[0];
		expect(node).toMatchObject({ code: true, content: '[x]{.orange}' });
		expect(node.color).toBeUndefined();
	});

	it('le dictionnaire visé reste en dernier : {.orange .def=carré (géométrie)}', () => {
		const node = textNodes('[carrés]{.orange .def=carré (géométrie)}')[0];
		expect(node).toMatchObject({
			color: 'orange',
			lexicon: { mode: 'force', target: 'carré (géométrie)' }
		});
	});
});

describe('texte coloré — erreurs', () => {
	it('nom inconnu : texte normal, sans crochets, nom gardé pour le prof', () => {
		expect(plain('Voici [le cône]{.turquoise}.')).toBe('Voici le cône.');
		const node = textNodes('Voici [le cône]{.turquoise}.').find((n) => n.content === 'le cône');
		expect(node?.color).toBeUndefined();
		expect(node?.unknownClasses).toEqual(['turquoise']);
	});

	it('faute de frappe sur un détail (Q1) : même traitement', () => {
		expect(plain('A [x]{.rapel} B')).toBe('A x B');
		expect(textNodes('A [x]{.rapel} B').find((n) => n.content === 'x')?.unknownClasses).toEqual([
			'rapel'
		]);
	});

	it('une classe inconnue n’efface pas les autres', () => {
		const node = textNodes('[a]{.orange .turquoise}')[0];
		expect(node).toMatchObject({ color: 'orange', unknownClasses: ['turquoise'] });
	});

	it('le nom inconnu n’est signalé qu’une fois par passage', () => {
		const nodes = textNodes('[**le** cône]{.turquoise}');
		expect(nodes.filter((n) => n.unknownClasses).length).toBe(1);
	});

	it('variable tirée à une valeur qui n’est pas un nom : texte normal', () => {
		const md = resolveText('[le cône]{.{{c}}}', [{ name: 'c', value: '#ff0000' }]);
		expect(plain(md)).toBe('le cône');
		expect(textNodes(md)[0]).toMatchObject({ unknownClasses: ['#ff0000'] });
		expect(textNodes(md)[0].color).toBeUndefined();
	});

	it('un hex ou primary.N n’est jamais une couleur de texte', () => {
		expect(textNodes('[a]{.primary.0}')[0]).toMatchObject({ unknownClasses: ['primary.0'] });
		expect(textNodes('[a]{.primary.0}')[0].color).toBeUndefined();
	});
});

describe('texte coloré — rendu', () => {
	it('écran : la variable de thème du nom', () => {
		expect(inlineColorValue('orange', false)).toBe('var(--color-fig-orange)');
		expect(inlineColorValue('noir', false)).toBe('var(--color-foreground)');
		expect(inlineColorValue(undefined, false)).toBeUndefined();
	});

	it('chat des élèves (rendu restreint) : aucune couleur', () => {
		expect(inlineColorValue('orange', true)).toBeUndefined();
	});

	it('message au prof : la classe écrite et les couleurs possibles', () => {
		const message = unknownClassesMessage(['turquoise']);
		expect(message).toContain('{.turquoise}');
		expect(message).toContain('bleu, rouge, vert');
		expect(message).toContain('rappel');
	});

	it('cellule de tableau colorée : lue avec sa couleur', () => {
		const cell = tableCellMarkedInline('[le cône]{.orange} et $x$');
		expect(cell?.find((n) => n.type === 'text' && n.content === 'le cône')).toMatchObject({
			color: 'orange'
		});
	});

	it('cellule de tableau sans marque : rendu ordinaire', () => {
		expect(tableCellMarkedInline('le cône et $[0;1]$')).toBeNull();
	});
});
