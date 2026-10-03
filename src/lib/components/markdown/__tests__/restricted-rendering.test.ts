/**
 * Rendu restreint du chat (S1, 2026-10-03) — fonctions pures
 *
 * Le rendu réel est couvert par `chat-restreint.svelte.test.ts` ; ici, les
 * décisions elles-mêmes, et le FILET sur l'AST (un bloc spécial qui aurait
 * échappé au retrait des langues de bloc de code).
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import type { BlockNode, DocumentNode } from '$lib/ubumark';
import {
	hasUnsafeMathCommand,
	isProjectStorageImage,
	restrictDocument,
	stripFenceLanguages,
	RESTRICTED_BLOCK_PLACEHOLDER
} from '../restricted-rendering';

const SUPABASE = 'https://projet.supabase.co';

describe('hasUnsafeMathCommand', () => {
	it.each([
		'\\htmlStyle{color:red}{x}',
		'\\style{color:red}{x}',
		'\\class{a}{x}',
		'\\htmlClass{a}{x}',
		'\\cssId{a}{x}',
		'\\htmlId{a}{x}',
		'\\htmlData{a=b}{x}',
		'\\href{https://a.b}{x}',
		'\\url{https://a.b}',
		'\\enclose{box}[mathbackground="red"]{x}',
		'\\bbox[red]{x}',
		'\\def\\a{b}',
		'\\newcommand{\\a}{b}',
		'x+\\htmlStyle {a}{b}',
		'\\color{red}x',
		'\\colorbox{zz;background-image:url(https://a.b/c.png)}{x}',
		'\\fontfamily{x}y',
		'\\hspace*{1cm}'
	])('refuse %s', (latex) => {
		expect(hasUnsafeMathCommand(latex)).toBe(true);
	});

	it.each([
		'x^2',
		'\\frac{1}{2}',
		'\\displaystyle\\sum_i i',
		'\\textstyle x',
		// \color n'est plus admis : une couleur non reconnue est recopiée telle
		// quelle dans `style=` (audit du 2026-10-03) — testé avec les refusées
		'\\boxed{x}',
		'\\hrefx'
	])('admet %s', (latex) => {
		expect(hasUnsafeMathCommand(latex)).toBe(false);
	});
});

describe('isProjectStorageImage', () => {
	it('admet le stockage du projet (public, signé)', () => {
		expect(isProjectStorageImage(`${SUPABASE}/storage/v1/object/public/b/x.png`, SUPABASE)).toBe(
			true
		);
		expect(
			isProjectStorageImage(`${SUPABASE}/storage/v1/object/sign/b/x.png?token=t`, SUPABASE)
		).toBe(true);
	});

	it.each([
		'https://exemple.invalid/p.png',
		'https://projet.supabase.co.exemple.invalid/storage/v1/object/public/p.png',
		`${SUPABASE}/autre/p.png`,
		`${SUPABASE}/storage/v1/object/../../p.png`,
		'//exemple.invalid/p.png',
		'data:image/png;base64,AAAA',
		'images/p.png',
		'javascript:alert(1)',
		''
	])('refuse %s', (src) => {
		expect(isProjectStorageImage(src, SUPABASE)).toBe(false);
	});
});

describe('stripFenceLanguages', () => {
	it('retire la langue des ouvertures, partout (retrait, liste, citation, ~~~)', () => {
		const md = [
			'```trig',
			'a',
			'```',
			'  ```figure',
			'- ```courbe',
			'1. ```barres',
			'> ```probtree',
			'~~~line',
			'````variation'
		].join('\n');
		expect(stripFenceLanguages(md)).toBe(
			['```', 'a', '```', '  ```', '- ```', '1. ```', '> ```', '~~~', '````'].join('\n')
		);
	});

	it('ne touche ni au code en ligne ni au texte', () => {
		const md = 'Le code `x` et ```trig dans une phrase.';
		expect(stripFenceLanguages(md)).toBe(md);
	});

	it('après retrait, ```trig est un bloc de code', () => {
		const doc = parseMarkdown(stripFenceLanguages('```trig\npreset: custom\n```'));
		expect(doc.children.map((n) => n.type)).toEqual(['code-block']);
	});
});

describe('restrictDocument — filet sur l’AST', () => {
	const trig = parseMarkdown('```trig\npreset: custom\npoints: M = pi/3\n```').children[0];

	it('le parseur produit bien un cercle (décor du test)', () => {
		expect(trig.type).toBe('trig-circle');
	});

	it('remplace un bloc spécial à la racine, dans une citation et dans une liste', () => {
		const doc: DocumentNode = {
			type: 'document',
			children: [
				trig,
				{ type: 'blockquote', children: [trig] },
				{
					type: 'list',
					ordered: false,
					items: [{ type: 'list-item', children: [{ type: 'text', content: 'a' }, trig] }]
				} as BlockNode
			]
		};
		const out = restrictDocument(doc);
		const json = JSON.stringify(out);
		expect(json).not.toContain('trig-circle');
		expect(json.split(RESTRICTED_BLOCK_PLACEHOLDER).length - 1).toBe(3);
		// L'AST d'origine (en cache) n'est pas modifié
		expect(JSON.stringify(doc)).toContain('trig-circle');
	});

	it('laisse intacts paragraphe, image, formule, code', () => {
		const doc = parseMarkdown('Bonjour $x$\n\n```\ncode\n```\n\n$$y$$');
		expect(restrictDocument(doc)).toEqual(doc);
	});
});
