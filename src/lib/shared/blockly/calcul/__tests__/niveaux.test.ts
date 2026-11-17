import { describe, expect, it } from 'vitest';

import {
	branchesNonParcourues,
	executerCalcul,
	niveauDuBloc,
	type NiveauCalcul
} from '../interpreteur';
import { dependDuNombre, jugerProgrammeCalcul } from '../jugement';
import { conditionsDuProgramme, etatVersTexteCalcul, texteVersEtatCalcul } from '../notation';

// Piste 4e / 3e (phase 0 validée le 2026-11-16) : variables, conditions, reste, répétitions
// calculées, « répéter jusqu'à », niveaux de blocs.

// =============================================================================
// Aides
// =============================================================================

function etat(texte: string) {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) throw new Error(lu.message);
	return lu.etat;
}

/** Affichages du texte, rejoué par l'interpréteur sur un nombre, au niveau donné. */
function sortie(texte: string, nombre: number, niveau: NiveauCalcul = '3e'): number[] {
	const r = executerCalcul(etat(texte), nombre, niveau);
	if (!r.ok) throw new Error(r.erreur.type);
	return r.affichages;
}

function erreur(texte: string, nombre: number, niveau: NiveauCalcul = '3e') {
	const r = executerCalcul(etat(texte), nombre, niveau);
	if (r.ok) throw new Error('pas d’erreur');
	return r.erreur;
}

function allerRetour(texte: string): string {
	const ecrit = etatVersTexteCalcul(etat(texte));
	if (!ecrit.ok) throw new Error(ecrit.message);
	return ecrit.texte;
}

function message(texte: string): string {
	const lu = texteVersEtatCalcul(texte);
	if (lu.ok) throw new Error('lisible');
	return lu.message;
}

const NOMINAL = 'mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]';

// =============================================================================
// Interpréteur
// =============================================================================

describe('variables (4e)', () => {
	it('nominal de la phase 0 : 7 → 4, 3 → 6', () => {
		expect(sortie(NOMINAL, 7, '4e')).toEqual([4]);
		expect(sortie(NOMINAL, 3, '4e')).toEqual([6]);
	});

	it('une variable jamais mise vaut 0', () => {
		expect(sortie('afficher y + 1', 5, '4e')).toEqual([1]);
	});

	it('ajouter … à une variable', () => {
		expect(sortie('mettre c à 0 ; répéter 3 [ ajouter nombre à c ] ; afficher c', 2, '4e')).toEqual(
			[6]
		);
	});

	it('nom lu sans majuscules ni accents : Côté et cote sont la même variable', () => {
		expect(sortie('mettre Côté à 2 ; afficher cote × 3', 0, '4e')).toEqual([6]);
	});

	it('plusieurs variables', () => {
		expect(sortie('mettre a à nombre ; mettre b à a + 1 ; afficher a × b', 3, '4e')).toEqual([12]);
	});
});

describe('répéter un nombre de fois calculé (4e)', () => {
	it('arrondi à l’entier le plus proche : 2,6 → 3 tours, 2,4 → 2', () => {
		expect(sortie('répéter nombre [ afficher 1 ]', 2.6, '4e')).toEqual([1, 1, 1]);
		expect(sortie('répéter nombre [ afficher 1 ]', 2.4, '4e')).toEqual([1, 1]);
	});

	it('négatif → aucun tour', () => {
		expect(sortie('répéter nombre [ afficher 1 ] ; afficher 0', -2, '4e')).toEqual([0]);
	});

	it('refusé en 5e (bloc inconnu du niveau)', () => {
		expect(erreur('répéter nombre [ afficher 1 ]', 2, '5e')).toEqual({
			type: 'bloc-inconnu',
			typeBloc: 'controls_repeat_ext'
		});
	});
});

describe('conditions (4e)', () => {
	it('si … alors sans sinon', () => {
		const p = 'si nombre > 0 alors [ afficher nombre ] ; afficher 0';
		expect(sortie(p, 5, '4e')).toEqual([5, 0]);
		expect(sortie(p, -5, '4e')).toEqual([0]);
	});

	it('un « si » vide ne fait rien', () => {
		expect(sortie('si nombre > 0 alors [ ] ; afficher 1', 3, '4e')).toEqual([1]);
	});

	it('les six comparaisons', () => {
		const p = (op: string) => `si nombre ${op} 2 alors [ afficher 1 ] sinon [ afficher 0 ]`;
		const sur = (op: string) => [1, 2, 3].map((n) => sortie(p(op), n, '4e')[0]);
		expect(sur('=')).toEqual([0, 1, 0]);
		expect(sur('≠')).toEqual([1, 0, 1]);
		expect(sur('<')).toEqual([1, 0, 0]);
		expect(sur('≤')).toEqual([1, 1, 0]);
		expect(sur('>')).toEqual([0, 0, 1]);
		expect(sur('≥')).toEqual([0, 1, 1]);
	});

	it('égalité à la marge du jugement : 0,1 + 0,2 = 0,3, et n’est pas < 0,3', () => {
		expect(sortie('si 0,1 + 0,2 = 0,3 alors [ afficher 1 ] sinon [ afficher 0 ]', 0, '4e')).toEqual(
			[1]
		);
		expect(sortie('si 0,1 + 0,2 < 0,3 alors [ afficher 1 ] sinon [ afficher 0 ]', 0, '4e')).toEqual(
			[0]
		);
	});

	it('condition vide (écrite « faux ») : fausse', () => {
		expect(sortie('si faux alors [ afficher 1 ] sinon [ afficher 2 ]', 0, '4e')).toEqual([2]);
	});

	it('refusé en 5e', () => {
		expect(erreur(NOMINAL, 7, '5e')).toMatchObject({ type: 'bloc-inconnu' });
	});

	it('par défaut, l’interpréteur est au niveau 5e (appelants existants inchangés)', () => {
		const r = executerCalcul(etat(NOMINAL), 7);
		expect(r.ok).toBe(false);
	});
});

describe('reste de la division (4e)', () => {
	it('reste euclidien, jamais négatif', () => {
		expect(sortie('afficher reste de nombre par 3', 7, '4e')).toEqual([1]);
		expect(sortie('afficher reste de nombre par 3', -7, '4e')).toEqual([2]);
		expect(sortie('afficher reste de nombre par 2', 7.5, '4e')).toEqual([1.5]);
	});

	it('reste par 0 : erreur comme ÷ 0', () => {
		expect(erreur('afficher reste de nombre par 0', 7, '4e')).toEqual({
			type: 'division-par-zero'
		});
	});

	it('parité', () => {
		const p =
			'si reste de nombre par 2 = 0 alors [ afficher nombre ÷ 2 ] sinon [ afficher nombre × 3 ]';
		expect(sortie(p, 4, '4e')).toEqual([2]);
		expect(sortie(p, 5, '4e')).toEqual([15]);
	});
});

describe('conditions composées et boucle conditionnelle (3e)', () => {
	it('ET / OU / NON', () => {
		const p = 'si nombre > 0 et nombre < 10 alors [ afficher 1 ] sinon [ afficher 0 ]';
		expect([-1, 5, 12].map((n) => sortie(p, n)[0])).toEqual([0, 1, 0]);
		const q = 'si non (nombre = 0 ou nombre = 1) alors [ afficher 1 ] sinon [ afficher 0 ]';
		expect([0, 1, 2].map((n) => sortie(q, n)[0])).toEqual([0, 0, 1]);
	});

	it('ET refusé en 4e', () => {
		expect(erreur('si nombre > 0 et nombre < 10 alors [ afficher 1 ]', 5, '4e')).toMatchObject({
			type: 'bloc-inconnu',
			typeBloc: 'logic_operation'
		});
	});

	it('répéter jusqu’à', () => {
		const p = 'mettre n à 1 ; répéter jusqu’à n > nombre [ mettre n à n × 2 ] ; afficher n';
		expect(sortie(p, 10)).toEqual([16]);
	});

	it('condition déjà vraie : aucun tour', () => {
		expect(sortie('répéter jusqu’à nombre > 0 [ afficher 1 ] ; afficher 2', 5)).toEqual([2]);
	});

	it('boucle infinie : trop long', () => {
		expect(erreur('répéter jusqu’à nombre > nombre [ ]', 5)).toEqual({ type: 'trop-long' });
	});

	it('refusé en 4e', () => {
		expect(erreur('répéter jusqu’à nombre > 0 [ ]', 5, '4e')).toMatchObject({
			type: 'bloc-inconnu',
			typeBloc: 'calcul_repeter_jusqua'
		});
	});
});

describe('niveauDuBloc', () => {
	it('5e, 4e, 3e', () => {
		expect(niveauDuBloc('calcul_afficher')).toBe('5e');
		expect(niveauDuBloc('variables_set')).toBe('4e');
		expect(niveauDuBloc('calcul_si')).toBe('4e');
		expect(niveauDuBloc('math_modulo')).toBe('4e');
		expect(niveauDuBloc('logic_negate')).toBe('3e');
		expect(niveauDuBloc('calcul_repeter_jusqua')).toBe('3e');
		expect(niveauDuBloc('tortue_avancer')).toBeNull();
	});
});

describe('état Blockly mal formé', () => {
	const var_get = (id: string) => ({ type: 'variables_get', fields: { VAR: { id } } });
	const afficher = (valeur: Record<string, unknown>) => ({
		type: 'calcul_afficher',
		inputs: { VALEUR: { block: valeur } }
	});

	it('variable lue par son id, dans la liste des variables', () => {
		const e = {
			blocks: { languageVersion: 0, blocks: [afficher(var_get('v1'))] },
			variables: [{ name: 'x', id: 'v1' }]
		};
		expect(executerCalcul(e, 0, '4e')).toMatchObject({ ok: true, affichages: [0] });
	});

	it('id de variable inconnu : illisible', () => {
		const e = { blocks: { languageVersion: 0, blocks: [afficher(var_get('v9'))] }, variables: [] };
		expect(executerCalcul(e, 0, '4e')).toMatchObject({
			ok: false,
			erreur: { type: 'programme-illisible' }
		});
	});

	it('nom de variable réservé dans l’état : refusé', () => {
		const e = {
			blocks: { languageVersion: 0, blocks: [afficher(var_get('v1'))] },
			variables: [{ name: 'afficher', id: 'v1' }]
		};
		expect(executerCalcul(e, 0, '4e')).toMatchObject({
			ok: false,
			erreur: { type: 'nom-de-variable', nom: 'afficher' }
		});
	});

	it('une condition affichée comme un nombre : illisible', () => {
		const comparaison = {
			type: 'logic_compare',
			fields: { OP: 'EQ' },
			inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } } }
		};
		const e = { blocks: { languageVersion: 0, blocks: [afficher(comparaison)] } };
		expect(executerCalcul(e, 0, '4e')).toMatchObject({
			ok: false,
			erreur: { type: 'programme-illisible' }
		});
	});
});

// =============================================================================
// Notation
// =============================================================================

describe('notation 4e / 3e', () => {
	it.each([
		NOMINAL,
		'mettre c à 0 ; ajouter nombre à c ; afficher c',
		'si nombre > 0 alors [ afficher 1 ]',
		'si nombre > 0 alors [ ]',
		'si non (nombre > 3) alors [ afficher 1 ]',
		'si (nombre > 1 ou nombre < −1) et nombre ≠ 0 alors [ afficher 1 ]',
		'si nombre > 1 ou nombre < −1 et nombre ≠ 0 alors [ afficher 1 ]',
		'si (nombre + 1) × 2 ≥ 10 alors [ afficher 1 ]',
		'mettre n à 0 ; répéter jusqu’à n ≥ 100 [ ajouter 1 à n ] ; afficher n',
		'afficher reste de (nombre + 1) par 2',
		'afficher reste de nombre par 2 + 1',
		'répéter nombre [ afficher 1 ]',
		'répéter 2,6 [ afficher 1 ]',
		'répéter 4 [ afficher 1 ]',
		'si faux alors [ afficher 1 ] sinon [ afficher 2 ]'
	])('aller-retour canonique : %s', (texte) => {
		expect(allerRetour(texte)).toBe(texte);
	});

	it("lecture souple : <= >= != <> jusqu’à / jusqu'a, x = …", () => {
		expect(allerRetour('si nombre <= 1 alors [ afficher 1 ]')).toBe(
			'si nombre ≤ 1 alors [ afficher 1 ]'
		);
		expect(allerRetour('si nombre >= 1 alors [ ]')).toBe('si nombre ≥ 1 alors [ ]');
		expect(allerRetour('si nombre != 1 alors [ ]')).toBe('si nombre ≠ 1 alors [ ]');
		expect(allerRetour('si nombre <> 1 alors [ ]')).toBe('si nombre ≠ 1 alors [ ]');
		expect(allerRetour("REPETER JUSQU'A nombre > 1 [ ]")).toBe('répéter jusqu’à nombre > 1 [ ]');
		expect(allerRetour('x = nombre + 1 ; afficher x')).toBe('mettre x à nombre + 1 ; afficher x');
	});

	it('le nom garde sa première écriture', () => {
		expect(allerRetour('mettre Côté à 2 ; afficher cote')).toBe('mettre Côté à 2 ; afficher Côté');
	});

	it('la 5e reste écrite comme avant', () => {
		expect(allerRetour('mettre résultat à nombre + 2 ; afficher résultat × 4')).toBe(
			'mettre résultat à nombre + 2 ; afficher résultat × 4'
		);
	});

	it('noms refusés : mots du langage, résultat, trop long, caractères', () => {
		expect(message('mettre si à 3')).toMatch(/« si ».*nom de variable/);
		expect(message('mettre afficher à 3')).toMatch(/« afficher ».*nom de variable/);
		expect(message('mettre nombre à 3')).toMatch(/« nombre ».*nom de variable/);
		expect(message('ajouter 1 à et')).toMatch(/« et ».*nom de variable/);
		expect(message('mettre abcdefghijklmnopqrstu à 3')).toMatch(/20 caractères/);
		expect(message('mettre 2x à 3')).toMatch(/nom de variable/);
	});

	it('20 variables au plus', () => {
		const vingt = Array.from({ length: 20 }, (_, i) => `mettre v${i} à 1`).join(' ; ');
		expect(texteVersEtatCalcul(vingt).ok).toBe(true);
		expect(message(`${vingt} ; mettre w à 1`)).toMatch(/20 variables au plus/);
	});

	it('si sans crochets, condition manquante, alors manquant', () => {
		expect(message('si nombre > 0 alors afficher 1')).toMatch(/crochets/);
		expect(message('si alors [ ]')).toMatch(/condition/);
		expect(message('si nombre > 0 [ ]')).toMatch(/alors/);
		expect(message('si nombre alors [ ]')).toMatch(/comparaison/);
	});

	it('conditionsDuProgramme : les « si » dans l’ordre du programme', () => {
		expect(
			conditionsDuProgramme(
				'si nombre > 0 alors [ si nombre > 5 alors [ ] ] sinon [ ] ; si nombre = 0 alors [ ]'
			)
		).toEqual(['nombre > 0', 'nombre > 5', 'nombre = 0']);
	});
});

// =============================================================================
// Branches parcourues (contrôle du modèle)
// =============================================================================

describe('branchesNonParcourues', () => {
	const essais = [-3, 0, 1, 2, 5, 10, 0.5];

	it('toutes parcourues : null', () => {
		expect(branchesNonParcourues(etat(NOMINAL), essais, '4e')).toBeNull();
	});

	it('jamais vraie', () => {
		const p = 'si nombre > 100 alors [ afficher 1 ] sinon [ afficher 2 ]';
		expect(branchesNonParcourues(etat(p), essais, '4e')).toEqual({ index: 0, jamais: 'vrai' });
		expect(branchesNonParcourues(etat(p), [...essais, 200], '4e')).toBeNull();
	});

	it('jamais fausse, même sans sinon', () => {
		const p = 'afficher 1 ; si nombre > −100 alors [ afficher 2 ]';
		expect(branchesNonParcourues(etat(p), essais, '4e')).toEqual({ index: 0, jamais: 'faux' });
	});

	it('un « si » jamais atteint compte comme jamais vrai', () => {
		const p = 'si nombre > 0 alors [ si nombre < 0 alors [ afficher 1 ] ] ; afficher 2';
		expect(branchesNonParcourues(etat(p), essais, '4e')).toEqual({ index: 1, jamais: 'vrai' });
	});
});

// =============================================================================
// Jugement
// =============================================================================

describe('jugement au niveau du modèle', () => {
	const essais = [-3, 0, 1, 2, 5, 10, 0.5];

	it('même comportement, autres noms de variables : juste', () => {
		const eleve =
			'mettre d à nombre + nombre ; si d ≤ 10 alors [ afficher d ] sinon [ afficher d − 10 ]';
		expect(jugerProgrammeCalcul(eleve, NOMINAL, essais, '4e')).toEqual({ juste: true });
	});

	it('bloc de 3e dans une question de 4e : faux, avec message', () => {
		const eleve =
			'si nombre × 2 > 10 et 1 = 1 alors [ afficher nombre × 2 − 10 ] sinon [ afficher nombre × 2 ]';
		const verdict = jugerProgrammeCalcul(eleve, NOMINAL, essais, '4e');
		expect(verdict.juste).toBe(false);
		expect(verdict.message).toMatch(/pas pris en charge/);
	});

	it('dependDuNombre au niveau donné', () => {
		expect(dependDuNombre(NOMINAL, '4e')).toBe(true);
		expect(dependDuNombre('si faux alors [ ] ; afficher 3', '4e')).toBe(false);
	});
});
