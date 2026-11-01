/**
 * Bloc ```patron + `designer:` / `completer:` — analyse, réponses et jugement
 * (spécification : `docs/archive/wip/solides-progress.md` § 10)
 */

import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { PatronSpec } from '$lib/ubumark/types/espace';
import { CUBE_NETS, gridOf, patronNet } from '$lib/ubumark/utils/espace-patrons';
import { solideTopology } from '$lib/ubumark/utils/espace-solides';
import {
	NOTHING_PLACED,
	NOTHING_TOUCHED,
	NOT_FOLDING,
	completerAnswer,
	completerFrame,
	completerHasOtherSolutions,
	completerMistakes,
	completerSpots,
	cubeCellsFold,
	designerMistakes,
	expectedPatronAnswer,
	facesAnswer,
	isCompleterCorrect,
	isDesignerCorrect,
	isPatronAnswerCorrect,
	readCompleterAnswer,
	readFacesAnswer
} from '$lib/ubumark/utils/patron-gestes';

const parse = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'patron');
const messages = (...lines: string[]) => parse(...lines).errors.join(' | ');
const specOf = (...lines: string[]) => {
	const node = parse(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as PatronSpec;
};
const expectedOf = (...lines: string[]) => expectedPatronAnswer(specOf(...lines));

/**
 * La croix (`forme: 1`) : `.X.. / XXXX / .X..`, faces 1 (en haut), 2 à 5 (la
 * bande), 6 (en bas) ; la face 1 devient ABCD, la face 6 EFGH.
 */
const CROIX = ['solide: cube', 'forme: 1'];

describe('designer: — analyse et faces attendues', () => {
	it('opposee : la face opposée à la face marquée, sur la croix', () => {
		const node = parse(...CROIX, 'marquer: face 3', 'designer: opposee', 'case: 2');
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
		expect(node.spec?.task).toEqual({ kind: 'designer', target: { kind: 'opposee' }, faces: [4] });
		expect(expectedOf(...CROIX, 'marquer: face 1', 'designer: opposee')).toBe('6');
		expect(expectedOf(...CROIX, 'marquer: face 2', 'designer: opposée')).toBe('4');
	});

	it('opposee sur les 11 patrons : chaque face a une seule opposée, et les paires se répondent', () => {
		for (let n = 1; n <= CUBE_NETS.length; n++) {
			for (let face = 1; face <= 6; face++) {
				const answer = expectedOf(
					'solide: cube',
					`forme: ${n}`,
					`marquer: face ${face}`,
					'designer: opposee'
				);
				expect(answer).toMatch(/^[1-6]$/);
				expect(answer).not.toBe(String(face));
				const back = expectedOf(
					'solide: cube',
					`forme: ${n}`,
					`marquer: face ${answer}`,
					'designer: opposee'
				);
				expect(back).toBe(String(face));
			}
		}
	});

	it('voisines : les 4 faces qui ont une arête commune avec la face marquée', () => {
		expect(expectedOf(...CROIX, 'marquer: face 3', 'designer: voisines')).toBe('1,2,4,6');
		// Plié, la face 1 touche les faces 2, 3, 4, 5 (pas la 6, son opposée)
		expect(expectedOf(...CROIX, 'marquer: face 1', 'designer: voisines')).toBe('2,3,4,5');
	});

	it('sommet A : les 3 faces qui se touchent en A, dont ABCD', () => {
		const answer = expectedOf(...CROIX, 'designer: sommet A');
		expect(answer.split(',')).toHaveLength(3);
		expect(answer.split(',')).toContain('1');
	});

	it('face EFGH : la face du dessus, ses sommets cachés ; ordre des lettres libre', () => {
		expect(expectedOf(...CROIX, 'designer: face EFGH')).toBe('6');
		expect(expectedOf(...CROIX, 'sommets: A B C D - - - -', 'designer: face GFEH')).toBe('6');
		expect(expectedOf(...CROIX, 'sommets: - - - - ? - - -', 'designer: face EFGH')).toBe('6');
	});

	it('un nom visé écrit sur le patron donnerait la réponse : refusé', () => {
		expect(messages(...CROIX, 'sommets: A B C D E F G H', 'designer: face EFGH')).toMatch(
			/E, F, G, H sont écrits sur le patron/
		);
		expect(messages(...CROIX, 'sommets: A B C D E - - -', 'designer: face EFGH')).toMatch(
			/E est écrit/
		);
		expect(messages(...CROIX, 'sommets: A B C D E F G H', 'designer: sommet A')).toMatch(
			/A est écrit sur le patron/
		);
		expect(
			expectedOf(...CROIX, 'sommets: - B C D E F G H', 'designer: sommet A').split(',')
		).toHaveLength(3);
	});

	it('pyramide : sommet A = la base et deux triangles ; prisme : opposee d’un triangle', () => {
		const pyramid = specOf('solide: pyramide carree 4 3', 'designer: sommet A');
		const net = patronNet(pyramid);
		const faces = pyramid.task?.kind === 'designer' ? pyramid.task.faces : [];
		expect(faces).toHaveLength(3);
		expect(faces.map((i) => net.faces[i].solidFace)).toContain(0);

		const prism = specOf(
			'solide: prisme triangle 3 2 5',
			'marquer: face devant',
			'designer: opposee'
		);
		const prismNet = patronNet(prism);
		const triangles = solideTopology('prisme-triangle')
			.faces.map((f, i) => (f.length === 3 ? i : -1))
			.filter((i) => i >= 0);
		const wanted = prism.task?.kind === 'designer' ? prism.task.faces : [];
		expect(wanted).toHaveLength(1);
		expect(triangles).toContain(prismNet.faces[wanted[0]].solidFace);
		expect(prism.marks[0].kind === 'face' && prism.marks[0].faces).not.toEqual(wanted);
	});

	it('erreurs au prof', () => {
		expect(messages('solide: pyramide carree 4 3', 'marquer: face 1', 'designer: opposee')).toMatch(
			/pas de face opposée/
		);
		expect(
			messages('solide: prisme triangle 3 2 5', 'marquer: face dessous', 'designer: opposee')
		).toMatch(/pas de face opposée/);
		expect(messages(...CROIX, 'designer: opposee')).toMatch(/marque exactement une face/);
		expect(messages(...CROIX, 'marquer: face 1, face 2', 'designer: voisines')).toMatch(
			/marque exactement une face/
		);
		expect(messages('solide: cube', 'forme: faux 1', 'designer: sommet A')).toMatch(/faux patron/);
		expect(messages('solide: cylindre 1 3', 'designer: sommet O')).toMatch(/cylindre/);
		expect(messages(...CROIX, 'designer: dessus')).toMatch(/non compris/);
		expect(messages(...CROIX, 'designer: sommet Z')).toMatch(/aucun sommet ne s’appelle Z/);
		expect(messages(...CROIX, 'designer: face ABCE')).toMatch(/n’est pas une face/);
		expect(messages(...CROIX, 'designer: sommet A', 'completer: 5')).toMatch(
			/ne vont pas ensemble/
		);
		expect(messages(...CROIX, 'case: 1')).toMatch(/case: sans objet/);
	});
});

describe('designer: — réponses et jugement', () => {
	it('écriture des faces touchées', () => {
		expect(facesAnswer([3, 1])).toBe('2,4');
		expect(facesAnswer([])).toBe('');
		expect(readFacesAnswer('4, 2')).toEqual([1, 3]);
		expect(readFacesAnswer('')).toEqual([]);
		expect(readFacesAnswer('a')).toBeNull();
		expect(readFacesAnswer('0')).toBeNull();
	});

	it('juste si mêmes faces, dans n’importe quel ordre', () => {
		expect(isDesignerCorrect('6', '6')).toBe(true);
		expect(isDesignerCorrect('6,4,2,1', '1,2,4,6')).toBe(true);
		expect(isDesignerCorrect('1,2,4', '1,2,4,6')).toBe(false);
		expect(isDesignerCorrect('1,2,4,6,3', '1,2,4,6')).toBe(false);
		expect(isDesignerCorrect('', '6')).toBe(false);
		expect(isPatronAnswerCorrect('6', '6')).toBe(true);
	});

	it('phrases de la correction', () => {
		expect(designerMistakes('', { kind: 'opposee' })).toEqual([NOTHING_TOUCHED]);
		expect(designerMistakes('3', { kind: 'opposee' })).toEqual([
			'Ce n’est pas la face opposée à la face grise.'
		]);
		expect(designerMistakes('3', { kind: 'sommet', name: 'A' })).toEqual([
			'Ce ne sont pas les faces qui se touchent en A.'
		]);
		expect(designerMistakes('3', { kind: 'face', name: 'EFGH' })).toEqual([
			'Ce n’est pas la face EFGH.'
		]);
	});
});

describe('completer: — analyse et quadrillage', () => {
	it('la croix sans sa face 5 : boîte des faces DONNÉES agrandie d’une case (aucun vide d’un seul côté)', () => {
		const node = parse(...CROIX, 'completer: 5', 'case: 0');
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(0);
		expect(node.spec?.task).toEqual({ kind: 'completer', removed: [4] });
		expect(expectedOf(...CROIX, 'completer: 5')).toBe('00000/00100/01112/00100/00000');
	});

	it('deux faces retirées : agrandi de deux cases', () => {
		const answer = expectedOf(...CROIX, 'completer: 2, 5');
		const rows = answer.split('/');
		// Faces données : 3 rangées × 2 colonnes, plus 2 cases de chaque côté
		expect(rows).toHaveLength(3 + 4);
		expect(rows[0]).toHaveLength(2 + 4);
		expect(rows[3]).toBe('021120');
	});

	it('le cadre suit tourner: (le patron tel qu’il est dessiné)', () => {
		const spec = specOf(...CROIX, 'tourner: 90', 'completer: 5');
		const frame = completerFrame(spec, [4]);
		// Tournée, la croix sans un bout : 3 × 3 de faces données, plus une case autour
		expect(frame).toHaveLength(3 + 2);
		expect(frame[0]).toHaveLength(3 + 2);
		expect(frame.flat().filter((c) => c === 2)).toHaveLength(1);
		expect(frame.flat().filter((c) => c === 1)).toHaveLength(5);
	});

	it('erreurs au prof', () => {
		expect(messages(...CROIX, 'completer: 4')).toMatch(/doivent se toucher/);
		expect(messages(...CROIX, 'completer: 7')).toMatch(/de 1 à 6/);
		expect(messages(...CROIX, 'completer: 1 2 5 6')).toMatch(/de 1 à 3 cases/);
		expect(messages(...CROIX, 'completer: 5 5')).toMatch(/deux fois/);
		expect(messages('solide: pave 4 2 3', 'completer: 5')).toMatch(/cube/);
		expect(messages('solide: cube', 'forme: faux 2', 'completer: 5')).toMatch(
			/vrai patron du cube/
		);
		expect(messages('solide: prisme triangle 3 2 5', 'completer: 1')).toMatch(/cube/);
		expect(messages(...CROIX, 'sommets: A B C D E F G H', 'completer: 5')).toMatch(/sommets:/);
		expect(messages(...CROIX, 'faces: numeros', 'completer: 5')).toMatch(/faces:/);
		expect(messages(...CROIX, 'marquer: face 1', 'completer: 5')).toMatch(/marquer:/);
		expect(messages('solide: cube 2', 'forme: 1', 'cotes: cm', 'completer: 5')).toMatch(/cotes:/);
		expect(messages(...CROIX, 'faces: non', 'completer: 5')).toBe('');
	});
});

describe('completer: — réponses et jugement', () => {
	const EXPECTED = '00000/00100/01112/00100/00000';

	it('la pose du prof est juste', () => {
		expect(isCompleterCorrect('00000/00100/01112/00100/00000', EXPECTED)).toBe(true);
		expect(isPatronAnswerCorrect('00000/00100/01112/00100/00000', EXPECTED)).toBe(true);
	});

	it('une autre pose qui se plie est juste (à gauche de la bande)', () => {
		expect(isCompleterCorrect('00000/00100/21110/00100/00000', EXPECTED)).toBe(true);
		expect(completerHasOtherSolutions(EXPECTED)).toBe(true);
	});

	it('une pose qui ne se plie pas est fausse, raison dite', () => {
		const square = '00000/02100/01110/00100/00000';
		expect(isCompleterCorrect(square, EXPECTED)).toBe(false);
		expect(completerMistakes(square, EXPECTED)).toEqual([NOT_FOLDING]);
	});

	it('rien posé, pas assez de faces', () => {
		expect(isCompleterCorrect('', EXPECTED)).toBe(false);
		expect(completerMistakes('', EXPECTED)).toEqual([NOTHING_PLACED]);
		const two = expectedOf(...CROIX, 'completer: 2, 5');
		const one = two.replace('021120', '001120');
		expect(isCompleterCorrect(one, two)).toBe(false);
		expect(completerMistakes(one, two)).toEqual(['Il manque encore une face.']);
	});

	it('une face donnée déplacée ou un cadre d’une autre taille : faux', () => {
		expect(isCompleterCorrect('00000/00000/01112/00100/00000', EXPECTED)).toBe(false);
		expect(isCompleterCorrect('0010/0111/0010', EXPECTED)).toBe(false);
	});

	it('un bout de la croix retiré : le cadre est le même, quel que soit le bout', () => {
		const top = expectedOf(...CROIX, 'completer: 1');
		const bottom = expectedOf(...CROIX, 'completer: 6');
		const shape = (a: string) => a.replace(/2/g, '0');
		expect(shape(top).split('/')).toHaveLength(shape(bottom).split('/').length);
		expect(shape(top)).toBe(shape(bottom).split('/').reverse().join('/'));
	});

	it('emplacements : les cases vides qui touchent une face', () => {
		const frame = readCompleterAnswer('00000/00100/01110/00100/00000')!;
		const spots = completerSpots(frame);
		expect(spots).toContainEqual([2, 0]);
		expect(spots).toContainEqual([2, 4]);
		expect(spots).toContainEqual([0, 2]);
		expect(spots).not.toContainEqual([0, 0]);
		expect(spots).not.toContainEqual([2, 2]);
	});

	it('la croix sans un bout : exactement quatre poses justes, les quatre bouts', () => {
		const given = readCompleterAnswer(EXPECTED)!.map((row) =>
			row.map((cell) => (cell === 1 ? 1 : 0))
		) as (0 | 1 | 2)[][];
		const good = completerSpots(given).filter(([r, c]) => {
			const next = given.map((row) => [...row]);
			next[r][c] = 2;
			return isCompleterCorrect(completerAnswer(next), EXPECTED);
		});
		expect(good).toEqual([
			[0, 2],
			[2, 0],
			[2, 4],
			[4, 2]
		]);
		expect(cubeCellsFold(gridOf(CUBE_NETS[10]))).toBe(true);
	});

	it('pliage : des cases qui ne se touchent pas ne se plient pas (sans planter)', () => {
		expect(cubeCellsFold(gridOf(['XXXX.X', '.X....']))).toBe(false);
		expect(completerAnswer([[0, 1, 0]])).toBe('');
	});
});
