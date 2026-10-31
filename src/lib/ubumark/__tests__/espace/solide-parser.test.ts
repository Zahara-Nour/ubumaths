/**
 * Bloc ```solide : lecture du texte (parseur) — chantier `solides`, lot 3 (§ 8)
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { EspaceNode, SolideSpec } from '$lib/ubumark/types/espace';

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => read(...lines).spec as SolideSpec | null;
const errors = (...lines: string[]) => read(...lines).errors;

describe('```solide — forme:', () => {
	it('pavé : forme, dimensions, rien d’autre par défaut', () => {
		const node = read('forme: pave 4 2 3');
		expect(node.errors).toEqual([]);
		expect(node.genre).toBe('solide');
		expect(node.spec).toEqual({
			kind: 'solide',
			form: 'pave',
			dims: [4, 2, 3],
			names: null,
			marks: [],
			cotes: null,
			hidden: true,
			section: null
		});
	});

	it('les dix formes et leurs dimensions', () => {
		expect(spec('forme: cube 2')?.form).toBe('cube');
		expect(spec('forme: prisme triangle 4 3 5')?.form).toBe('prisme-triangle');
		expect(spec('forme: prisme triangle-rectangle 4 3 5')?.form).toBe('prisme-triangle-rectangle');
		expect(spec('forme: pyramide carree 4 3')?.form).toBe('pyramide-carree');
		expect(spec('forme: pyramide carrée 4 3')?.form).toBe('pyramide-carree');
		expect(spec('forme: pyramide rectangle 4 2 3')?.form).toBe('pyramide-rectangle');
		expect(spec('forme: pyramide triangle 4 3')?.form).toBe('pyramide-triangle');
		expect(spec('forme: cylindre 2 5')?.dims).toEqual([2, 5]);
		expect(spec('forme: cône 2 4')?.form).toBe('cone');
		expect(spec('forme: boule 3')?.dims).toEqual([3]);
		expect(spec('forme: Pavé 4 2 3')?.form).toBe('pave');
	});

	it('dimensions décimales, virgule ou point', () => {
		expect(spec('forme: pave 4,5 2 3')?.dims).toEqual([4.5, 2, 3]);
		expect(spec('forme: pave 4.5 2 3')?.dims).toEqual([4.5, 2, 3]);
	});

	it('cachees: non → tout en trait plein', () => {
		expect(spec('forme: cube 2', 'cachees: non')?.hidden).toBe(false);
		expect(spec('forme: cube 2', 'cachées: non')?.hidden).toBe(false);
		expect(spec('forme: cube 2', 'cachees: oui')?.hidden).toBe(true);
	});

	it('forme absente, inconnue, base inconnue', () => {
		expect(errors('sommets: A B')[0]).toMatch(/forme/);
		expect(errors('forme: sphere 3')[0]).toMatch(/forme « sphere » inconnue/);
		expect(errors('forme: pyramide pentagone 4 3')[0]).toMatch(/carree, rectangle, triangle/);
		expect(errors('forme: prisme carre 4 3 5')[0]).toMatch(/triangle, triangle-rectangle/);
	});

	it('dimensions manquantes, nulles, négatives, illisibles', () => {
		expect(errors('forme: pave 4 2')[0]).toMatch(/3 dimensions/);
		expect(errors('forme: cube 0')[0]).toMatch(/nombre positif/);
		expect(errors('forme: cube -1')[0]).toMatch(/nombre positif/);
		expect(errors('forme: cube x')[0]).toMatch(/nombre positif/);
		expect(errors('forme: cube 2 3')[0]).toMatch(/1 dimension/);
	});

	it('dimension trop grande ou trop précise : erreur (jamais Infinity ni 1e+21 au dessin)', () => {
		expect(errors(`forme: cube ${'9'.repeat(400)}`)[0]).toMatch(/au plus 1000/);
		expect(errors('forme: cube 1001')[0]).toMatch(/au plus 1000/);
		expect(errors('forme: cube 2,54321')[0]).toMatch(/3 chiffres après la virgule/);
		expect(spec('forme: cube 2,545')?.dims).toEqual([2.545]);
	});

	it('cône trop plat (le sommet tomberait dans l’ellipse) : erreur', () => {
		expect(errors('forme: cone 10 3')[0]).toMatch(/cône trop plat/);
		expect(errors('forme: cone 4 2,5')).toEqual([]);
	});

	it('rapport de plus de 10 entre deux dimensions : erreur ; 10 : dessiné', () => {
		expect(errors('forme: pave 10 1 1')).toEqual([]);
		expect(errors('forme: pave 11 1 1')[0]).toMatch(/plus de 10 fois/);
		expect(errors('forme: pave 20 1 1')[0]).toMatch(/plus de 10 fois/);
	});

	it('clé inconnue (vue: est une clé de ```cubes) ; clé répétée', () => {
		expect(errors('forme: cube 2', 'vue: face')[0]).toMatch(/clé « vue » inconnue/);
		expect(errors('forme: cube 2', 'forme: cube 3')[0]).toMatch(/déjà donnée ligne 1/);
	});
});

describe('```solide — sommets:', () => {
	it('noms dans l’ordre documenté', () => {
		expect(spec('forme: pave 4 2 3', 'sommets: A B C D E F G H')?.names).toEqual([
			'A',
			'B',
			'C',
			'D',
			'E',
			'F',
			'G',
			'H'
		]);
		expect(spec('forme: pyramide carree 4 3', 'sommets: S A B C D')?.names).toHaveLength(5);
		expect(spec('forme: cone 2 4', 'sommets: S O')?.names).toEqual(['S', 'O']);
		expect(spec('forme: cylindre 2 4', "sommets: O O'")?.names).toEqual(['O', "O'"]);
		expect(spec('forme: boule 3', 'sommets: O')?.names).toEqual(['O']);
	});

	it('« - » : sommet sans nom', () => {
		expect(spec('forme: cone 2 4', 'sommets: S -')?.names).toEqual(['S', null]);
	});

	it('nombre de noms faux, nom en double, nom illisible', () => {
		expect(errors('forme: pave 4 2 3', 'sommets: A B C D E F G')[0]).toMatch(
			/un pavé a 8 sommets : 8 noms attendus/
		);
		expect(errors('forme: cube 2', 'sommets: A B C D E F G A')[0]).toMatch(/« A » deux fois/);
		expect(errors('forme: boule 2', 'sommets: o')[0]).toMatch(/majuscule/);
	});
});

describe('```solide — marquer:', () => {
	const pave = ['forme: pave 4 2 3', 'sommets: A B C D E F G H'];

	it('face, arête, sommet, séparés par des virgules', () => {
		expect(spec(...pave, 'marquer: face EFGH, arete AE, sommet G')?.marks).toEqual([
			{ kind: 'face', vertices: [4, 5, 6, 7], label: 'face EFGH' },
			{ kind: 'arete', vertices: [0, 4], label: 'arête [AE]' },
			{ kind: 'sommet', vertex: 6, label: 'sommet G' }
		]);
	});

	it('face nommée dans un autre ordre ; arête à l’envers ; arête accentuée', () => {
		expect(spec(...pave, 'marquer: face HGFE')?.marks[0]).toMatchObject({
			vertices: [4, 5, 6, 7]
		});
		expect(spec(...pave, 'marquer: arête EA')?.marks[0]).toMatchObject({ vertices: [0, 4] });
	});

	it('face par sa place, sans noms', () => {
		expect(spec('forme: cube 2', 'marquer: face dessus')?.marks).toEqual([
			{ kind: 'face', vertices: [4, 5, 6, 7], label: 'face du dessus' }
		]);
		expect(spec('forme: pave 4 2 3', 'marquer: face devant')?.marks[0]).toMatchObject({
			vertices: [0, 1, 5, 4]
		});
		expect(spec('forme: prisme triangle 4 3 5', 'marquer: face devant')?.marks[0]).toMatchObject({
			vertices: [0, 1, 2]
		});
		expect(spec('forme: pyramide carree 4 3', 'marquer: face dessous')?.marks[0]).toMatchObject({
			vertices: [1, 2, 3, 4]
		});
	});

	it('pas une face, pas une arête (diagonale), sommet inconnu', () => {
		expect(errors(...pave, 'marquer: face ABD')[0]).toMatch(/ABD n’est pas une face du pavé/);
		expect(errors(...pave, 'marquer: arete AC')[0]).toMatch(/\[AC\] n’est pas une arête du pavé/);
		expect(errors(...pave, 'marquer: sommet Z')[0]).toMatch(/aucun sommet ne s’appelle Z/);
		expect(errors('forme: prisme triangle 4 3 5', 'marquer: face dessus')[0]).toMatch(
			/pas de face du dessus/
		);
	});

	it('marquer par des noms sans sommets: → erreur qui le dit', () => {
		expect(errors('forme: pave 4 2 3', 'marquer: face ABCD')[0]).toMatch(
			/nomme les sommets \(sommets:\) pour marquer ABCD/
		);
	});

	it('solides ronds : seuls les sommets se marquent', () => {
		expect(spec('forme: cone 2 4', 'sommets: S O', 'marquer: sommet S')?.marks).toEqual([
			{ kind: 'sommet', vertex: 0, label: 'sommet S' }
		]);
		expect(errors('forme: cylindre 2 4', 'marquer: face dessus')[0]).toMatch(
			/seuls les sommets nommés se marquent/
		);
	});
});

describe('```solide — cotes:', () => {
	it('unité, ou oui sans unité', () => {
		expect(spec('forme: pave 4 2 3', 'cotes: cm')?.cotes).toEqual({ unit: 'cm' });
		expect(spec('forme: pave 4 2 3', 'cotes: mm')?.cotes).toEqual({ unit: 'mm' });
		expect(spec('forme: pave 4 2 3', 'cotes: oui')?.cotes).toEqual({ unit: '' });
		expect(spec('forme: pave 4 2 3', 'cotes: non')?.cotes).toBeNull();
	});

	it('unité inconnue → valeurs permises listées', () => {
		expect(errors('forme: pave 4 2 3', 'cotes: km')[0]).toMatch(/cm, mm, m, oui, non/);
	});
});

describe('```solide dans un document', () => {
	it('un nœud espace de genre solide', () => {
		const ast = parseMarkdown('Voici :\n\n```solide\nforme: cube 2\n```\n');
		const node = ast.children.find((n) => n.type === 'espace') as EspaceNode | undefined;
		expect(node?.genre).toBe('solide');
		expect(node?.spec?.kind).toBe('solide');
	});

	it('dans un item de liste aussi', () => {
		const ast = parseMarkdown('- a\n\n  ```solide\n  forme: boule 2\n  ```\n');
		expect(JSON.stringify(ast)).toContain('"genre":"solide"');
	});

	it('bloc non fermé : erreur située, le nœud reste', () => {
		const ast = parseMarkdown('```solide\nforme: cube 2\n');
		const node = ast.children.find((n) => n.type === 'espace') as EspaceNode | undefined;
		expect(node?.errors.join(' ')).toMatch(/non fermé/);
	});
});
