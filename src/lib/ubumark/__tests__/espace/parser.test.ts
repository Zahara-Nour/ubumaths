/**
 * Bloc ```cubes : lecture du texte (parseur)
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { EspaceNode } from '$lib/ubumark/types/espace';

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'));
const heights = (...lines: string[]) => {
	const spec = read(...lines).spec;
	return spec?.heights ?? null;
};

describe('```cubes — hauteurs', () => {
	it('rangées séparées par /, la première au fond', () => {
		const node = read('hauteurs: 2 1 1 / 1 0 1');
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			kind: 'cubes',
			heights: [
				[2, 1, 1],
				[1, 0, 1]
			],
			view: 'perspective'
		});
	});

	it('rangées en retrait sous la clé', () => {
		expect(heights('hauteurs:', '  2 1 1', '  1 0 1')).toEqual([
			[2, 1, 1],
			[1, 0, 1]
		]);
	});

	it('bords vides retirés, trou intérieur gardé', () => {
		expect(heights('hauteurs: 0 0 / 0 3')).toEqual([[3]]);
		expect(heights('hauteurs: 0 0 0 / 0 1 0 / 0 0 0')).toEqual([[1]]);
		expect(heights('hauteurs: 1 0 1 / 0 0 0 / 1 0 1')).toEqual([
			[1, 0, 1],
			[0, 0, 0],
			[1, 0, 1]
		]);
	});

	it('un cube', () => {
		expect(heights('hauteurs: 1')).toEqual([[1]]);
	});

	it('les vues', () => {
		for (const view of ['perspective', 'dessus', 'face', 'droite', 'gauche']) {
			expect(read('hauteurs: 1', `vue: ${view}`).spec?.view).toBe(view);
		}
	});
});

describe('```cubes — erreurs situées', () => {
	it('rangées de longueurs différentes', () => {
		const node = read('hauteurs: 2 1 1 / 1 0');
		expect(node.spec).toBeNull();
		expect(node.errors.join()).toContain(
			'Ligne 1 : chaque rangée doit avoir le même nombre de cases'
		);
	});

	it.each(['-1', '1.5', 'x', '7'])('hauteur « %s » refusée', (bad) => {
		const node = read('hauteurs: 1 ' + bad);
		expect(node.spec).toBeNull();
		expect(node.errors.join()).toContain('une hauteur est un nombre entier de 0 à 6');
	});

	it('plus de 6 rangées, plus de 6 colonnes', () => {
		expect(read('hauteurs: ' + Array(7).fill('1').join(' / ')).errors.join()).toContain(
			'au plus 6 rangées'
		);
		expect(read('hauteurs: 1 1 1 1 1 1 1').errors.join()).toContain('au plus 6 colonnes');
		expect(read('hauteurs: ' + Array(6).fill('1 1 1 1 1 6').join(' / ')).errors).toEqual([]);
	});

	it('tout à 0 : assemblage vide', () => {
		expect(read('hauteurs: 0 0 / 0 0').errors.join()).toContain('assemblage vide');
	});

	it('hauteurs: absente', () => {
		const node = read('vue: face');
		expect(node.spec).toBeNull();
		expect(node.errors.join()).toContain('il manque les hauteurs');
	});

	it('vue inconnue : les vues permises sont listées', () => {
		const node = read('hauteurs: 1', 'vue: dessous');
		expect(node.spec).toBeNull();
		expect(node.errors.join()).toContain(
			'vues possibles : perspective, dessus, face, droite, gauche'
		);
	});

	it('clé inconnue ou répétée', () => {
		expect(read('hauteurs: 1', 'couleur: rouge').errors.join()).toContain(
			'clé « couleur » inconnue'
		);
		expect(read('hauteurs: 1', 'hauteurs: 2').errors.join()).toContain('déjà donnée ligne 1');
	});

	it('numéro de ligne exact', () => {
		expect(read('vue: face', 'hauteurs: 1 / 1 2').errors[0]).toMatch(/^Ligne 2 :/);
	});
});

describe('```cubes — dans un document', () => {
	it('devient un nœud espace de genre cubes', () => {
		const node = parseMarkdown('```cubes\nhauteurs: 2 1\n```').children[0] as EspaceNode;
		expect(node.type).toBe('espace');
		expect(node.genre).toBe('cubes');
		expect(node.source).toBe('hauteurs: 2 1');
		expect(node.errors).toEqual([]);
	});

	it('un bloc en erreur reste un nœud', () => {
		const node = parseMarkdown('```cubes\nhauteurs: 9\n```').children[0];
		expect(node.type).toBe('espace');
	});

	it('dans un item de liste, rangées en retrait comprises', () => {
		const md = '1. Combien de cubes ?\n\n   ```cubes\n   hauteurs: 2 1 / 1 0\n   ```';
		expect(JSON.stringify(parseMarkdown(md))).toContain('"type":"espace"');
	});

	it('non fermé : erreur située, la suite lue normalement', () => {
		const nodes = parseMarkdown('```cubes\nhauteurs: 1\n\nSuite').children;
		expect((nodes[0] as EspaceNode).errors.join()).toContain('bloc non fermé');
		expect(nodes.some((n) => n.type === 'paragraph')).toBe(true);
	});
});
