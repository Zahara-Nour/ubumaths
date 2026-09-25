/**
 * Listes en colonnes : marqueur `:colonnes N` (2026-09-25)
 *
 * Spécification validée par David (docs/wip/liste-colonnes-progress.md) :
 * marqueur explicite sur la ligne avant la liste, N ∈ {2, 3, 4}, ligne vide
 * tolérée, `:colonnes 1` = liste normale, marqueur invalide ou sans liste
 * derrière = texte visible, sous-liste ciblée par un marqueur à son retrait.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown, stripMarkdown, type ListNode, type ParagraphNode } from '$lib/ubumark';

function listes(markdown: string): ListNode[] {
	return parseMarkdown(markdown).children.filter((c): c is ListNode => c.type === 'list');
}

function texte(markdown: string): string {
	return parseMarkdown(markdown)
		.children.filter((c): c is ParagraphNode => c.type === 'paragraph')
		.flatMap((p) => p.children)
		.map((c) => ('content' in c ? String(c.content) : ''))
		.join(' ');
}

describe('`:colonnes N` avant une liste', () => {
	it('liste numérotée sur 2 colonnes, marqueur absent du rendu', () => {
		const md = ':colonnes 2\n1. ~cos(\\pi)~\n2. ~sin(\\pi)~\n3. ~cos(0)~';
		const [liste] = listes(md);
		expect(liste.columns).toBe(2);
		expect(liste.items).toHaveLength(3);
		expect(texte(md)).not.toContain('colonnes');
	});

	it('liste à puces sur 3 colonnes', () => {
		const [liste] = listes(':colonnes 3\n- a\n- b\n- c\n- d');
		expect(liste.ordered).toBe(false);
		expect(liste.columns).toBe(3);
	});

	it('N = 4 accepté', () => {
		expect(listes(':colonnes 4\n1. a\n2. b')[0].columns).toBe(4);
	});

	it('le numéro de départ est conservé', () => {
		const [liste] = listes(':colonnes 2\n3. a\n4. b');
		expect(liste.start).toBe(3);
		expect(liste.columns).toBe(2);
	});

	it('une ligne vide entre le marqueur et la liste est tolérée', () => {
		expect(listes(':colonnes 2\n\n1. a\n2. b')[0].columns).toBe(2);
	});

	it('un paragraphe juste avant le marqueur ne l’absorbe pas', () => {
		const md = 'Calculer :\n:colonnes 2\n1. a\n2. b';
		expect(listes(md)[0].columns).toBe(2);
		expect(texte(md)).toBe('Calculer :');
	});

	it('`:colonnes 1` donne une liste normale, sans marqueur visible', () => {
		const md = ':colonnes 1\n1. a\n2. b';
		expect(listes(md)[0].columns).toBeUndefined();
		expect(texte(md)).not.toContain('colonnes');
	});

	it('sans marqueur, pas de colonnes', () => {
		expect(listes('1. a\n2. b')[0].columns).toBeUndefined();
	});

	it('seule la liste qui suit est concernée', () => {
		const ls = listes(':colonnes 2\n1. a\n2. b\n\nTexte.\n\n1. c\n2. d');
		expect(ls.map((l) => l.columns)).toEqual([2, undefined]);
	});
});

describe('`:colonnes N` invalide ou mal placé : texte visible', () => {
	it.each([':colonnes 0', ':colonnes 5', ':colonnes 7', ':colonnes deux', ':colonnes'])(
		'%s reste visible et la liste est normale',
		(marqueur) => {
			const md = `${marqueur}\n\n1. a\n2. b`;
			expect(listes(md)[0].columns).toBeUndefined();
			expect(texte(md)).toContain(marqueur);
		}
	);

	it('marqueur suivi d’un paragraphe : visible', () => {
		const md = ':colonnes 2\n\nPas une liste.';
		expect(listes(md)).toHaveLength(0);
		expect(texte(md)).toContain(':colonnes 2');
	});
});

describe('`:colonnes N` devant une sous-liste', () => {
	const md = [
		'1. Calculer :',
		'   :colonnes 3',
		'   a. ~cos(\\pi/3)~',
		'   b. ~sin(\\pi/6)~',
		'   c. ~cos(\\pi)~',
		'2. Conclure.'
	].join('\n');

	it('la sous-liste est en 3 colonnes, la liste principale non', () => {
		const [principale] = listes(md);
		expect(principale.columns).toBeUndefined();
		expect(principale.items).toHaveLength(2);
		const sousListe = principale.items[0].children.find((c): c is ListNode => c.type === 'list');
		expect(sousListe?.columns).toBe(3);
		expect(sousListe?.items).toHaveLength(3);
	});

	it('le marqueur n’apparaît pas dans le texte de l’item', () => {
		const [principale] = listes(md);
		const paragraphes = JSON.stringify(
			principale.items[0].children.filter((c) => c.type === 'paragraph')
		);
		expect(paragraphes).not.toContain('colonnes');
	});

	it('ligne vide tolérée entre le marqueur et la sous-liste', () => {
		const avecVide = md.replace('   :colonnes 3\n', '   :colonnes 3\n\n');
		const sousListe = listes(avecVide)[0].items[0].children.find(
			(c): c is ListNode => c.type === 'list'
		);
		expect(sousListe?.columns).toBe(3);
	});

	it('marqueur de sous-liste non suivi d’une sous-liste : visible', () => {
		const [principale] = listes('1. Calculer :\n   :colonnes 3\n2. Conclure.');
		expect(JSON.stringify(principale.items[0])).toContain(':colonnes 3');
	});
});

describe('résumés texte', () => {
	it('stripMarkdown n’affiche pas le marqueur', () => {
		expect(stripMarkdown(':colonnes 2\n1. alpha\n2. beta')).not.toContain('colonnes');
	});
});
