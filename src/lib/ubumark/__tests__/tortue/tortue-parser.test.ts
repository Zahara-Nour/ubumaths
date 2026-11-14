import { describe, expect, it } from 'vitest';

import { parseMarkdown } from '../../parser/markdown-parser';
import { figureText, parseTortueContent } from '../../parser/tortue-parser';
import { hasMaskedValue } from '../../utils/masked-value';

const CARRE = 'attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]';

describe('parseTortueContent', () => {
	it('attendu seul : réglages par défaut, figure non montrée', () => {
		const node = parseTortueContent(CARRE);
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			attendu: 'répéter 4 [ avancer 3 ; tourner à droite 90 ]',
			montrer: false,
			comparer: 'position',
			modele: null
		});
	});

	it('montrer: oui : la figure du programme, normalisée', () => {
		const node = parseTortueContent([CARRE, 'montrer: oui', 'comparer: forme'].join('\n'));
		expect(node.spec?.comparer).toBe('forme');
		expect(node.spec?.modele).toHaveLength(4);
	});

	it('case: lue', () => {
		expect(parseTortueContent(['case: 2', CARRE].join('\n')).caseIndex).toBe(2);
	});

	it('attendu absent, vide, illisible ou qui ne trace rien : erreur pour l’auteur', () => {
		expect(parseTortueContent('montrer: oui').errors[0].message).toMatch(
			/il manque la ligne attendu:/
		);
		expect(parseTortueContent('attendu:').errors[0].message).toMatch(/attendu: vide/);
		expect(parseTortueContent('attendu: sauter 3').errors[0].message).toMatch(
			/Ligne 1 : attendu: Instruction inconnue : « sauter 3 »/
		);
		expect(parseTortueContent('attendu: lever le stylo ; avancer 3').errors[0].message).toMatch(
			/ne trace rien/
		);
		expect(parseTortueContent('attendu: répéter 100000 [ avancer 1 ]').errors[0].message).toMatch(
			/arrêté/
		);
	});

	it('valeur ou clé inconnue, clé en double : erreur située', () => {
		expect(parseTortueContent([CARRE, 'montrer: peut-être'].join('\n')).errors[0].message).toMatch(
			/Ligne 2 : montrer « peut-être » : choisis oui ou non/
		);
		expect(parseTortueContent([CARRE, 'comparer: taille'].join('\n')).errors[0].message).toMatch(
			/choisis position ou forme/
		);
		expect(parseTortueContent([CARRE, 'couleur: rouge'].join('\n')).errors[0].message).toMatch(
			/clé « couleur » inconnue/
		);
		expect(parseTortueContent([CARRE, CARRE].join('\n')).errors[0].message).toMatch(/déjà donnée/);
	});

	it('figure: écrite par l’auteur : refusée', () => {
		expect(parseTortueContent([CARRE, 'figure: 0 0 3 0'].join('\n')).errors[0].message).toMatch(
			/réservée à l’énoncé envoyé pendant une évaluation/
		);
	});

	it('énoncé masqué : attendu: ?, la figure lue dans figure:', () => {
		const node = parseTortueContent(
			['attendu: ?', 'montrer: oui', 'figure: 0 0 3 0 ; 3 0 3 -3'].join('\n')
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.attendu).toBeNull();
		expect(node.spec?.modele).toHaveLength(2);
	});

	it('figure: illisible : erreur', () => {
		expect(parseTortueContent(['attendu: ?', 'figure: 0 0 3'].join('\n')).errors).toHaveLength(1);
	});

	it('figureText relu par figure:', () => {
		const modele = parseTortueContent([CARRE, 'montrer: oui'].join('\n')).spec!.modele!;
		const relu = parseTortueContent(
			['attendu: ?', 'montrer: oui', `figure: ${figureText(modele)}`].join('\n')
		);
		expect(relu.spec?.modele).toEqual(modele);
	});

	it('`attendu: ?` est une valeur masquée (refusée dans un modèle par le générateur)', () => {
		expect(hasMaskedValue('attendu: ?')).toBe(true);
		expect(hasMaskedValue(CARRE)).toBe(false);
	});
});

describe('parseMarkdown — bloc ```tortue', () => {
	it('nœud tortue au premier niveau', () => {
		const doc = parseMarkdown(['Trace un carré.', '', '```tortue', CARRE, '```'].join('\n'));
		expect(doc.children.map((c) => c.type)).toEqual(['paragraph', 'tortue']);
	});

	it('bloc non fermé : nœud en erreur, la suite n’est pas avalée', () => {
		const doc = parseMarkdown(['```tortue', CARRE, '', 'Fin.'].join('\n'));
		const tortue = doc.children.find((c) => c.type === 'tortue');
		expect(tortue && 'errors' in tortue && tortue.errors.at(-1)?.message).toMatch(/non fermé/);
		expect(doc.children.at(-1)?.type).toBe('paragraph');
	});
});
