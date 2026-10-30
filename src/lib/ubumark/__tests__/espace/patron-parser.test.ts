/**
 * Bloc ```patron : analyse du texte — chantier `solides`, § 9
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { EspaceNode, PatronSpec } from '$lib/ubumark/types/espace';

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'patron');
const spec = (...lines: string[]) => read(...lines).spec as PatronSpec | null;
const errors = (...lines: string[]) => read(...lines).errors;

describe('```patron — solide: et forme:', () => {
	it('cube sans dimension : la croix par défaut', () => {
		const s = spec('solide: cube');
		expect(s?.solid).toBe('cube');
		expect(s?.dims).toEqual([1]);
		expect(s?.dimsWritten).toBe(false);
		expect(s?.cells?.flat().filter(Boolean)).toHaveLength(6);
	});

	it('les solides et leurs dimensions (mots de ```solide)', () => {
		expect(spec('solide: pave 4 2,5 3')?.dims).toEqual([4, 2.5, 3]);
		expect(spec('solide: prisme triangle 3 2 5')?.solid).toBe('prisme-triangle');
		expect(spec('solide: pyramide carree 4 3')?.solid).toBe('pyramide-carree');
		expect(spec('solide: cylindre 1 3')?.cells).toBeNull();
	});

	it('cône, boule, solide inconnu, dimensions fausses : erreur', () => {
		expect(errors('solide: cone 2 3')[0]).toMatch(/le cône n’a pas de patron/);
		expect(errors('solide: boule 2')[0]).toMatch(/la boule n’a pas de patron/);
		expect(errors('solide: sphere 3')[0]).toMatch(/solide « sphere » inconnu/);
		expect(errors('solide: pave 4 2')[0]).toMatch(/3 dimensions \(solide: pave/);
		expect(errors('solide: cube 0')[0]).toMatch(/nombre positif/);
		expect(errors('forme: 3')[0]).toMatch(/il manque le solide/);
	});

	it('forme: 1 à 11, faux 1 à 8 ; hors catalogue : erreur', () => {
		expect(spec('solide: cube', 'forme: 11')?.faux).toBe(false);
		expect(spec('solide: pave 4 2 3', 'forme: faux 8')?.faux).toBe(true);
		expect(errors('solide: cube', 'forme: 12')[0]).toMatch(
			/1 à 11, faux 1 à faux 8, ou une grille/
		);
		expect(errors('solide: cube', 'forme: faux 9')[0]).toMatch(/faux patrons de 1 à 8/);
		expect(errors('solide: prisme triangle 3 2 5', 'forme: faux 1')[0]).toMatch(
			/seulement pour un cube ou un pavé/
		);
		expect(errors('solide: pyramide carree 4 3', 'forme: 2')[0]).toMatch(/formes possibles : 1\)/);
		expect(spec('solide: prisme triangle 3 2 5', 'forme: 2')?.layout).toBe(2);
	});
});

describe('```patron — grille', () => {
	it('une grille vraie, en retrait sous forme:', () => {
		const s = spec('solide: cube', 'forme:', '  . X . .', '  X X X X', '  . . X .');
		expect(s?.cells).toEqual([
			[false, true, false, false],
			[true, true, true, true],
			[false, false, true, false]
		]);
	});

	it('sans espaces, rangées courtes complétées, bords vides retirés', () => {
		const s = spec('solide: cube', 'forme:', '  ....', '  .X', '  XXXX', '  .X');
		expect(s?.cells).toHaveLength(3);
	});

	it('grille fausse sans faux: → erreur, raison dite ; avec faux: oui → dessinée', () => {
		expect(errors('solide: cube', 'forme:', '  XXX', '  XXX')[0]).toMatch(
			/ne se plie pas en cube : les cases \d et \d se recouvrent/
		);
		expect(spec('solide: cube', 'forme:', '  XXX', '  XXX', 'faux: oui')?.faux).toBe(true);
	});

	it('grille vraie avec faux: oui → erreur', () => {
		expect(errors('solide: cube', 'forme:', '  .X..', '  XXXX', '  .X..', 'faux: oui')[0]).toMatch(
			/est un vrai patron du cube/
		);
	});

	it('5 cases sans faux: → erreur ; avec faux: oui → dessinée', () => {
		expect(errors('solide: cube', 'forme:', '  XXXXX')[0]).toMatch(/5 cases : un cube a 6 faces/);
		expect(errors('solide: cube', 'forme:', '  XXXXX', 'faux: oui')).toEqual([]);
	});

	it('grille non reliée, trop grande, caractère inconnu, pavé : erreur', () => {
		expect(errors('solide: cube', 'forme:', '  XX.X', 'faux: oui')[0]).toMatch(/se toucher/);
		expect(errors('solide: cube', 'forme:', '  XXXXXXX', 'faux: oui')[0]).toMatch(
			/au plus 6 rangées et 6 colonnes/
		);
		expect(errors('solide: cube', 'forme:', '  XXXXXX', '  XXXXX.', 'faux: oui')[0]).toMatch(
			/11 cases : au plus 10/
		);
		expect(errors('solide: cube', 'forme:', '  XOX')[0]).toMatch(
			/« O » : une grille s’écrit avec X/
		);
		expect(errors('solide: pave 4 2 3', 'forme:', '  XXX')[0]).toMatch(
			/une grille ne dessine que le patron d’un cube/
		);
		expect(errors('solide: cube', 'faux: oui')[0]).toMatch(/forme: faux 3/);
	});
});

describe('```patron — réglages', () => {
	it('tourner:, retourner:, dessous:, faces:', () => {
		const s = spec('solide: cube', 'tourner: 90', 'retourner: oui', 'dessous: 3', 'faces: numeros');
		expect([s?.turn, s?.mirror, s?.bottom, s?.numbers]).toEqual([90, true, 2, true]);
		expect(errors('solide: cube', 'tourner: 45')[0]).toMatch(/0, 90, 180, 270/);
		expect(errors('solide: cube', 'dessous: 7')[0]).toMatch(/de 1 à 6/);
		expect(errors('solide: cylindre 1 3', 'dessous: 1')[0]).toMatch(/cube ou un pavé/);
		expect(errors('solide: cube', 'faces: oui')[0]).toMatch(/numeros ou non/);
	});

	it('sommets: les noms du solide, - sans nom, ? une fois', () => {
		expect(spec('solide: cube', 'sommets: A B C D E ? G -')?.names).toEqual([
			'A',
			'B',
			'C',
			'D',
			'E',
			'?',
			'G',
			null
		]);
		expect(errors('solide: pave 4 2 3', 'sommets: A B C D E F G')[0]).toMatch(
			/un pavé a 8 sommets : 8 noms attendus/
		);
		expect(errors('solide: cube', 'sommets: A B C D E ? ? H')[0]).toMatch(
			/un seul sommet à trouver/
		);
		expect(errors('solide: cube', 'sommets: A A C D E F G H')[0]).toMatch(/deux fois/);
		expect(spec('solide: cylindre 1 3', "sommets: O O'")?.names).toEqual(['O', "O'"]);
	});

	it('marquer: face N, face <place>, sommet X', () => {
		const s = spec(
			'solide: cube',
			'sommets: A B C D E F G H',
			'marquer: face 3, face dessous, sommet G'
		);
		// La place est lue par son numéro : une fois pliée, c'est souvent la question
		expect(s?.marks.map((m) => m.label)).toEqual(['face 3', 'face 1', 'sommet G']);
		expect(errors('solide: cube', 'marquer: face 7')[0]).toMatch(/numérotées de 1 à 6/);
		expect(errors('solide: cube', 'marquer: sommet A')[0]).toMatch(/nomme les sommets/);
		expect(errors('solide: cube', 'sommets: A B C D E F G H', 'marquer: sommet Z')[0]).toMatch(
			/aucun sommet ne s’appelle Z/
		);
		expect(errors('solide: pyramide carree 4 3', 'marquer: face dessus')[0]).toMatch(
			/n’a pas de face du dessus/
		);
		expect(errors('solide: cylindre 1 3', 'marquer: face devant')[0]).toMatch(/par son numéro/);
		expect(errors('solide: cube', 'marquer: arete AB')[0]).toMatch(/non compris/);
	});

	it('cotes: cube sans dimension → erreur ; unité inconnue → erreur', () => {
		expect(errors('solide: cube', 'cotes: cm')[0]).toMatch(/écris le côté du cube/);
		expect(spec('solide: cube 3', 'cotes: cm')?.cotes).toEqual({ unit: 'cm' });
		expect(errors('solide: cube 3', 'cotes: km')[0]).toMatch(/cm, mm, m, oui, non/);
	});

	it('clé inconnue, clé répétée, ligne non comprise', () => {
		expect(errors('solide: cube', 'vue: face')[0]).toMatch(/clé « vue » inconnue/);
		expect(errors('solide: cube', 'solide: cube')[0]).toMatch(/déjà donnée ligne 1/);
		expect(errors('solide: cube', 'XXX')[0]).toMatch(/non comprise/);
	});
});

describe('```patron dans un document', () => {
	it('un nœud espace de genre patron, en liste aussi (bloc en retrait sous le texte)', () => {
		const doc = parseMarkdown(
			'```patron\nsolide: cube\n```\n\n- Ce patron :\n  ```patron\n  solide: cube\n  forme: 4\n  ```\n'
		);
		const found: EspaceNode[] = [];
		const walk = (n: unknown) => {
			if (Array.isArray(n)) n.forEach(walk);
			else if (n && typeof n === 'object') {
				if ((n as { type?: string }).type === 'espace') found.push(n as EspaceNode);
				Object.values(n).forEach(walk);
			}
		};
		walk(doc);
		expect(found.map((n) => [n.genre, n.errors])).toEqual([
			['patron', []],
			['patron', []]
		]);
	});

	it('une grille en retrait dans le document', () => {
		const doc = parseMarkdown('```patron\nsolide: cube\nforme:\n  XXX..\n  ..XXX\n```\n');
		expect(JSON.stringify(doc)).toContain('"genre":"patron"');
		expect(JSON.stringify(doc)).toContain('"errors":[]');
	});
});

describe('```patron — un faux patron ne donne pas la réponse', () => {
	it('sommets: refusé (deux sommets au même coin s’écriraient « F/A »)', () => {
		expect(errors('solide: cube', 'forme: faux 2', 'sommets: A B C D E F G H')[0]).toMatch(
			/ses coins ne se nomment pas/
		);
	});

	it('marquer: face <place> refusé, face N permis', () => {
		expect(errors('solide: cube', 'forme: faux 2', 'marquer: face dessus')[0]).toMatch(
			/désigne la face par son numéro/
		);
		expect(errors('solide: cube', 'forme: faux 2', 'marquer: face 2')).toEqual([]);
	});

	it('faux: non accepté sur une forme du catalogue (sans effet)', () => {
		expect(spec('solide: cube', 'forme: 3', 'faux: non')?.faux).toBe(false);
	});
});
