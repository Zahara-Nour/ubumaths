/**
 * Bloc ```partage — analyse (phase 0 : `docs/wip/fractions-a-colorier-progress.md` § 4 et 6)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import { findPartageBlocks, parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { partageTotal } from '$lib/ubumark/types/partage';
import type { PartageNode } from '$lib/ubumark/types/partage';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;

function partageOf(children: readonly { type: string }[]): PartageNode {
	const node = children.find((c) => c.type === 'partage');
	expect(node, 'un nœud partage attendu').toBeDefined();
	return node as PartageNode;
}

const parse = (...lines: string[]) => parsePartageContent(lines.join('\n'));

describe('bloc ```partage — cas nominaux', () => {
	it('bande de 8, 3 parts coloriées', () => {
		const node = partageOf(doc('```partage', 'forme: bande 8', 'gris: 3', '```'));
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({ shape: { kind: 'bande', parts: 8 }, gray: [1, 2, 3] });
	});

	it('gris absent : aucune part coloriée', () => {
		expect(parse('forme: disque 6').spec).toEqual({
			shape: { kind: 'disque', parts: 6 },
			gray: []
		});
	});

	it('gris: 0 : aucune part coloriée', () => {
		expect(parse('forme: bande 4', 'gris: 0').spec?.gray).toEqual([]);
	});

	it('gris: tout le total', () => {
		expect(parse('forme: bande 4', 'gris: 4').spec?.gray).toEqual([1, 2, 3, 4]);
	});

	it('une seule part : virgule finale (gris: 4,)', () => {
		expect(parse('forme: bande 8', 'gris: 4,').spec?.gray).toEqual([4]);
		expect(parse('forme: bande 8', 'gris: 4 ,').spec?.gray).toEqual([4]);
	});

	it('liste de rangs non contigus, rangée par ordre croissant', () => {
		expect(parse('forme: bande 8', 'gris: 6, 1, 4').spec?.gray).toEqual([1, 4, 6]);
	});

	it('grille L×C avec × ou x, majuscule comprise', () => {
		for (const text of ['grille 3×4', 'grille 3x4', 'grille 3 x 4', 'Grille 3X4']) {
			expect(parse(`forme: ${text}`).spec?.shape, text).toEqual({
				kind: 'grille',
				rows: 3,
				cols: 4
			});
		}
	});

	it('grille 10×10 : les centièmes ; grille 1×2 et 2×1 : deux parts', () => {
		const shape = parse('forme: grille 10×10').spec?.shape;
		expect(shape && partageTotal(shape)).toBe(100);
		expect(parse('forme: grille 1×2').errors).toEqual([]);
		expect(parse('forme: grille 2×1').errors).toEqual([]);
	});

	it('carre-diagonales : 4 triangles', () => {
		const shape = parse('forme: carre-diagonales', 'gris: 2').spec?.shape;
		expect(shape).toEqual({ kind: 'carre-diagonales' });
		expect(shape && partageTotal(shape)).toBe(4);
	});

	it('bornes : bande et disque de 2 à 12 parts', () => {
		expect(parse('forme: bande 2').errors).toEqual([]);
		expect(parse('forme: bande 12').errors).toEqual([]);
		expect(parse('forme: disque 2').errors).toEqual([]);
		expect(parse('forme: disque 12').errors).toEqual([]);
	});

	it('clés en majuscules, lignes vides et espaces tolérés', () => {
		const node = parse('', '  FORME :  bande   5  ', '', 'Gris: 2');
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({ shape: { kind: 'bande', parts: 5 }, gray: [1, 2] });
	});

	it('garde le texte du bloc (aller-retour de l’éditeur riche)', () => {
		const node = partageOf(doc('```partage', 'forme: bande 8', '```'));
		expect(node.source).toBe('forme: bande 8');
	});

	it('reconnu dans un item de liste', () => {
		const list = doc(
			'1. Combien de parts coloriées ?',
			'',
			'   ```partage',
			'   forme: bande 4',
			'   ```'
		)[0];
		expect(list.type).toBe('list');
		const children = (list as ListNode).items[0].children;
		expect(children.some((c) => c.type === 'partage')).toBe(true);
	});

	it('repérage : bloc fermé, indices clôtures comprises', () => {
		expect(findPartageBlocks(['a', '```partage', 'forme: bande 4', '```', 'b'])).toEqual([
			{ startIndex: 1, endIndex: 3 }
		]);
	});
});

describe('bloc ```partage — erreurs (phrases pour le prof)', () => {
	const messages = (...lines: string[]) => parse(...lines).errors;

	it('forme absente', () => {
		const node = parse('gris: 2');
		expect(node.spec).toBeNull();
		expect(node.errors.join('\n')).toContain('il manque la ligne forme:');
	});

	it('bloc vide', () => {
		expect(messages('').join('\n')).toContain('il manque la ligne forme:');
	});

	it('forme inconnue : liste les formes possibles', () => {
		const text = messages('forme: triangle 3').join('\n');
		expect(text).toContain('Ligne 1 :');
		expect(text).toContain('forme « triangle 3 » inconnue');
		expect(text).toContain('bande N');
	});

	it('bande ou disque sans nombre', () => {
		expect(messages('forme: bande').join('\n')).toContain('écris le nombre de parts');
		expect(messages('forme: disque six').join('\n')).toContain('écris le nombre de parts');
	});

	it('nombre de parts hors bornes', () => {
		expect(messages('forme: bande 1').join('\n')).toContain('de 2 à 12 parts');
		expect(messages('forme: bande 13').join('\n')).toContain('de 2 à 12 parts');
		expect(messages('forme: disque 0').join('\n')).toContain('de 2 à 12 parts');
		expect(messages('forme: disque 15').join('\n')).toContain('de 2 à 12 parts');
	});

	it('grille hors bornes ou à une seule part', () => {
		expect(messages('forme: grille 11×3').join('\n')).toContain('de 1 à 10 lignes');
		expect(messages('forme: grille 3×11').join('\n')).toContain('de 1 à 10 colonnes');
		expect(messages('forme: grille 0×3').join('\n')).toContain('de 1 à 10 lignes');
		expect(messages('forme: grille 1×1').join('\n')).toContain('au moins 2 parts');
	});

	it('grille mal écrite', () => {
		expect(messages('forme: grille 3').join('\n')).toContain('grille L×C');
		expect(messages('forme: grille trois par quatre').join('\n')).toContain('grille L×C');
	});

	it('carre-diagonales n’a pas de nombre', () => {
		expect(messages('forme: carre-diagonales 4').join('\n')).toContain('inconnue');
	});

	it('gris illisible', () => {
		for (const value of ['', 'beaucoup', '2.5', '-1', '1, x', '1,,3', '1, 3,', ',3']) {
			const text = messages('forme: bande 8', `gris: ${value}`).join('\n');
			expect(text, value).toContain('Ligne 2 :');
			expect(text, value).toContain('illisible');
		}
	});

	it('gris: plus de parts que la figure', () => {
		const text = messages('forme: bande 8', 'gris: 9').join('\n');
		expect(text).toContain('Ligne 2 :');
		expect(text).toContain('la figure n’a que 8 parts');
	});

	it('gris: rang hors figure (0, ou trop grand)', () => {
		expect(messages('forme: bande 8', 'gris: 1, 9').join('\n')).toContain('la part 9 n’existe pas');
		expect(messages('forme: bande 8', 'gris: 0, 2').join('\n')).toContain('la part 0 n’existe pas');
		expect(messages('forme: carre-diagonales', 'gris: 1, 5').join('\n')).toContain('de 1 à 4');
	});

	it('gris: rang écrit deux fois', () => {
		expect(messages('forme: bande 8', 'gris: 2, 5, 2').join('\n')).toContain(
			'la part 2 est écrite deux fois'
		);
	});

	it('clé inconnue : liste les clés possibles', () => {
		const text = messages('forme: bande 8', 'couleur: rouge').join('\n');
		expect(text).toContain('clé « couleur » inconnue');
		expect(text).toContain('forme, gris, colorier');
	});

	it('clé répétée', () => {
		expect(messages('forme: bande 8', 'forme: bande 4').join('\n')).toContain(
			'« forme » déjà donnée ligne 1'
		);
		expect(messages('forme: bande 8', 'gris: 1', 'gris: 2').join('\n')).toContain(
			'« gris » déjà donnée ligne 2'
		);
	});

	it('ligne sans clé', () => {
		expect(messages('forme: bande 8', 'trois parts').join('\n')).toContain(
			'ligne « trois parts » non comprise'
		);
	});

	it('une erreur : pas de spec, et le nœud reste dans le document', () => {
		const node = partageOf(doc('```partage', 'forme: bande 99', '```'));
		expect(node.spec).toBeNull();
		expect(node.errors.length).toBeGreaterThan(0);
	});

	it('bloc non fermé : le dit, sans avaler la suite', () => {
		const children = doc('```partage', 'forme: bande 4', '', 'Voici la suite du texte.');
		const node = partageOf(children);
		expect(node.errors.join('\n')).toContain('bloc non fermé');
		expect(children.some((c) => c.type === 'paragraph')).toBe(true);
	});
});
