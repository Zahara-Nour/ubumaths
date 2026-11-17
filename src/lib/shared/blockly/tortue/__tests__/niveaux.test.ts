import { describe, expect, it } from 'vitest';

import { executerTortue, messageErreurTortue, type NiveauTortue } from '../interpreteur';
import { depassementDeBlocs, jugerProgrammeTortue, lireProgrammeTortue } from '../jugement';
import {
	etatVersTexteTortue,
	messageNiveauTortue,
	nombreDeBlocsTortue,
	texteVersEtatTortue
} from '../niveaux';
import { texteVersEtat } from '../notation';
import { texteVersEtatCalcul } from '../../calcul/notation';

// Tortue avec variables, 4e / 3e (chantier `tortue-variables`, phase 0 validée le 2026-11-16) :
// variables, calculs dans les entrées, « répéter » calculé (4e) ; « si », conditions,
// « répéter jusqu'à » (3e).

// =============================================================================
// Aides
// =============================================================================

const SPIRALE =
	'mettre côté à 1 ; répéter 4 [ avancer côté ; tourner à gauche 90 ; ajouter 1 à côté ]';

const HEXAGONE = 'mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]';

function etat(texte: string, niveau: NiveauTortue = '3e') {
	const lu = texteVersEtatTortue(texte, niveau);
	if (!lu.ok) throw new Error(lu.message);
	return lu.etat;
}

function trace(texte: string, niveau: NiveauTortue = '3e') {
	const r = executerTortue(etat(texte, niveau), niveau);
	if (!r.ok) throw new Error(r.erreur.type);
	return r;
}

function erreur(texte: string, niveau: NiveauTortue = '3e') {
	const r = executerTortue(etat(texte, niveau), niveau);
	if (r.ok) throw new Error('pas d’erreur');
	return r.erreur;
}

function allerRetour(texte: string, niveau: NiveauTortue = '3e'): string {
	const ecrit = etatVersTexteTortue(etat(texte, niveau), niveau);
	if (!ecrit.ok) throw new Error(ecrit.message);
	return ecrit.texte;
}

// =============================================================================
// Interpréteur
// =============================================================================

describe('executerTortue avec niveau — nominal', () => {
	it('spirale : côtés 1, 2, 3, 4', () => {
		const { segments } = trace(SPIRALE, '4e');
		expect(segments).toEqual([
			{ de: { x: 0, y: 0 }, a: { x: 1, y: 0 } },
			{ de: { x: 1, y: 0 }, a: { x: 1, y: 2 } },
			{ de: { x: 1, y: 2 }, a: { x: -2, y: 2 } },
			{ de: { x: -2, y: 2 }, a: { x: -2, y: -2 } }
		]);
	});

	it('hexagone : n tours, angle 360 ÷ n, la tortue revient au départ', () => {
		const { segments, tortue } = trace(HEXAGONE, '4e');
		expect(segments).toHaveLength(6);
		expect(tortue.x).toBeCloseTo(0);
		expect(tortue.y).toBeCloseTo(0);
		expect(tortue.cap).toBeCloseTo(0);
	});

	it('calcul dans « avancer » : avancer côté × 2', () => {
		const { segments } = trace('mettre côté à 1,5 ; avancer côté × 2', '4e');
		expect(segments).toEqual([{ de: { x: 0, y: 0 }, a: { x: 3, y: 0 } }]);
	});

	it('variable jamais mise : vaut 0 (la tortue ne bouge pas)', () => {
		expect(trace('avancer longueur', '4e').segments).toEqual([]);
	});

	it('distance négative : la tortue recule', () => {
		const { segments } = trace('mettre d à 0 − 2 ; avancer d', '4e');
		expect(segments).toEqual([{ de: { x: 0, y: 0 }, a: { x: -2, y: 0 } }]);
	});

	it('angle non entier admis', () => {
		const { tortue } = trace('mettre n à 8 ; tourner à gauche 360 ÷ n ÷ 2', '4e');
		expect(tortue.cap).toBeCloseTo(22.5);
	});

	it('répéter un nombre calculé entier : ce nombre de tours', () => {
		expect(trace('mettre n à 6 ÷ 2 ; répéter n [ avancer 1 ]', '4e').tortue.x).toBe(3);
		expect(trace('mettre n à 0 ; répéter n [ avancer 1 ]', '4e').segments).toEqual([]);
	});

	it('3e : si / sinon choisit la branche', () => {
		const texte =
			'mettre i à 0 ; répéter 4 [ si i < 2 alors [ avancer 1 ] sinon [ avancer 2 ] ; ajouter 1 à i ]';
		expect(trace(texte).tortue.x).toBe(6);
	});

	it('3e : répéter jusqu’à, et ET / OU / NON', () => {
		expect(
			trace('mettre c à 0 ; répéter jusqu’à c ≥ 3 [ avancer 1 ; ajouter 1 à c ]').tortue.x
		).toBe(3);
		expect(trace('si non (1 > 2) et (1 = 1 ou 2 = 3) alors [ avancer 1 ]').tortue.x).toBe(1);
	});

	it('« si » vide ne fait rien ; « jusqu’à » déjà vrai : aucun tour', () => {
		expect(trace('si 1 = 1 alors [ ] ; avancer 1').tortue.x).toBe(1);
		expect(trace('répéter jusqu’à 1 = 1 [ avancer 1 ]').segments).toEqual([]);
	});

	it('les étapes de l’animation suivent les instructions tortue, pas les variables', () => {
		const { etapes } = trace(
			'mettre a à 2 ; avancer a ; ajouter 1 à a ; tourner à gauche 90',
			'4e'
		);
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toMatchObject({ tortue: { x: 2, y: 0 }, segments: 1 });
	});
});

describe('executerTortue avec niveau — blocs admis', () => {
	it('sans niveau : une variable est un bloc inconnu (rien ne change)', () => {
		expect(executerTortue(etat('mettre n à 3 ; avancer n', '4e'))).toMatchObject({
			ok: false,
			erreur: { type: 'bloc-inconnu', typeBloc: 'variables_set' }
		});
	});

	it('4e : « si » et « répéter jusqu’à » refusés', () => {
		expect(erreur('si 1 = 1 alors [ avancer 1 ]', '4e')).toEqual({
			type: 'bloc-inconnu',
			typeBloc: 'calcul_si'
		});
		expect(erreur('répéter jusqu’à 1 = 1 [ avancer 1 ]', '4e')).toMatchObject({
			type: 'bloc-inconnu'
		});
	});

	it('jamais les blocs propres au programme de calcul (afficher, nombre choisi, reste)', () => {
		// La notation de la tortue ne les écrit plus : états posés à la main (blocs d'un autre espace)
		const avancer = (valeur: object) => ({
			blocks: {
				languageVersion: 0,
				blocks: [{ type: 'tortue_avancer', inputs: { VALEUR: { block: valeur } } }]
			}
		});
		const afficher = texteVersEtatCalcul('afficher 3');
		if (!afficher.ok) throw new Error(afficher.message);
		const enErreur = (e: unknown) => executerTortue(e, '3e');
		expect(enErreur(afficher.etat)).toMatchObject({ ok: false, erreur: { type: 'bloc-inconnu' } });
		expect(enErreur(avancer({ type: 'calcul_nombre_choisi' }))).toMatchObject({
			ok: false,
			erreur: { type: 'bloc-inconnu' }
		});
		expect(
			enErreur(
				avancer({
					type: 'math_modulo',
					inputs: {
						DIVIDEND: { shadow: { type: 'math_number', fields: { NUM: 7 } } },
						DIVISOR: { shadow: { type: 'math_number', fields: { NUM: 2 } } }
					}
				})
			)
		).toMatchObject({ ok: false, erreur: { type: 'bloc-inconnu' } });
	});

	it('les programmes de base marchent aux deux niveaux', () => {
		const carre = 'répéter 4 [ avancer 3 ; tourner à droite 90 ]';
		expect(trace(carre, '4e').segments).toHaveLength(4);
		expect(trace(carre, '3e').segments).toHaveLength(4);
	});
});

describe('executerTortue avec niveau — erreurs', () => {
	it('division par 0 : arrêt avec message', () => {
		const e = erreur('mettre n à 0 ; tourner à gauche 360 ÷ n', '4e');
		expect(e).toEqual({ type: 'division-par-zero' });
		expect(messageErreurTortue(e)).toMatch(/diviser par 0/);
	});

	it('nombre trop grand : arrêt « trop loin »', () => {
		expect(erreur('mettre d à 1 ; répéter 2000 [ mettre d à d × 10 ] ; avancer d', '4e')).toEqual({
			type: 'trop-loin'
		});
	});

	it('boucle sans fin : « trop long »', () => {
		expect(erreur('répéter jusqu’à 1 = 2 [ avancer 0 ]')).toEqual({ type: 'trop-long' });
	});

	it('trop de variables, nom réservé', () => {
		const texte = Array.from({ length: 21 }, (_, i) => `mettre v${i} à 1`).join(' ; ');
		const lu = texteVersEtatTortue(texte, '4e');
		expect(lu.ok).toBe(false);
		const etatReserve = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'variables_set',
						fields: { VAR: { id: 'a' } },
						inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } } }
					}
				]
			},
			variables: [{ name: 'si', id: 'a' }]
		};
		const r = executerTortue(etatReserve, '4e');
		expect(r).toMatchObject({ ok: false, erreur: { type: 'nom-de-variable', nom: 'si' } });
		if (!r.ok) expect(messageErreurTortue(r.erreur)).toMatch(/mot du programme/);
	});
});

// =============================================================================
// Notation
// =============================================================================

describe('notation avec niveau', () => {
	it('aller-retour canonique', () => {
		expect(allerRetour(SPIRALE, '4e')).toBe(SPIRALE);
		expect(allerRetour(HEXAGONE, '4e')).toBe(HEXAGONE);
		expect(allerRetour('mettre a à 2 ; avancer a × 2 ; reculer 1 ; tourner à droite 45')).toBe(
			'mettre a à 2 ; avancer a × 2 ; reculer 1 ; tourner à droite 45'
		);
		expect(allerRetour('lever le stylo ; avancer 2 ; baisser le stylo')).toBe(
			'lever le stylo ; avancer 2 ; baisser le stylo'
		);
		expect(
			allerRetour(
				'si a > 1 alors [ avancer 1 ] sinon [ reculer 1 ] ; répéter jusqu’à a = 3 [ ajouter 1 à a ]'
			)
		).toBe(
			'si a > 1 alors [ avancer 1 ] sinon [ reculer 1 ] ; répéter jusqu’à a = 3 [ ajouter 1 à a ]'
		);
	});

	it('lecture souple : sans accents, majuscules, point décimal', () => {
		expect(allerRetour('Tourner a Gauche 360 / 8 ; avancer 2.5', '4e')).toBe(
			'tourner à gauche 360 ÷ 8 ; avancer 2,5'
		);
	});

	it('sans niveau : la notation de base, inchangée', () => {
		expect(texteVersEtatTortue('mettre n à 3', 'base')).toEqual(texteVersEtat('mettre n à 3'));
		expect(texteVersEtatTortue('avancer 3', 'base')).toEqual(texteVersEtat('avancer 3'));
	});

	it('instruction mal écrite : message', () => {
		const lu = texteVersEtatTortue('avancer', '4e');
		expect(lu.ok).toBe(false);
	});
});

describe('messageNiveauTortue (pour l’auteur)', () => {
	it('un bloc au-dessus du niveau : le niveau à demander', () => {
		expect(messageNiveauTortue(HEXAGONE, 'base')).toMatch(/niveau: 4e/);
		expect(messageNiveauTortue('si 1 = 1 alors [ avancer 1 ]', '4e')).toMatch(/niveau: 3e/);
	});

	it('dans le niveau : null', () => {
		expect(messageNiveauTortue(HEXAGONE, '4e')).toBeNull();
		expect(messageNiveauTortue('répéter 4 [ avancer 3 ]', 'base')).toBeNull();
	});
});

// =============================================================================
// Compte des blocs
// =============================================================================

describe('nombreDeBlocsTortue', () => {
	it('compte les instructions, pas les calculs dans les entrées', () => {
		// mettre, répéter, avancer, tourner
		expect(nombreDeBlocsTortue(HEXAGONE, '4e')).toBe(4);
		// mettre, répéter, avancer, tourner, ajouter
		expect(nombreDeBlocsTortue(SPIRALE, '4e')).toBe(5);
		// si, avancer, reculer
		expect(nombreDeBlocsTortue('si a > 1 alors [ avancer 1 ] sinon [ reculer a × 2 ]', '3e')).toBe(
			3
		);
	});

	it('sans niveau : le compte de base', () => {
		expect(nombreDeBlocsTortue('répéter 4 [ avancer 3 ; tourner à droite 90 ]', 'base')).toBe(3);
	});

	it('illisible : null', () => {
		expect(nombreDeBlocsTortue('avancer (', '4e')).toBeNull();
	});
});

// =============================================================================
// Jugement
// =============================================================================

describe('jugerProgrammeTortue avec niveau', () => {
	it('même tracé par un autre chemin : juste', () => {
		const eleve =
			'avancer 3 ; tourner à gauche 60 ; avancer 3 ; tourner à gauche 60 ; avancer 3 ; tourner à gauche 60 ; avancer 3 ; tourner à gauche 60 ; avancer 3 ; tourner à gauche 60 ; avancer 3';
		expect(jugerProgrammeTortue(eleve, HEXAGONE, 'position', null, '4e')).toEqual({ juste: true });
	});

	it('variables refusées sans niveau : message de bloc inconnu', () => {
		expect(lireProgrammeTortue(HEXAGONE)).toMatchObject({ ok: false });
		expect(jugerProgrammeTortue(HEXAGONE, HEXAGONE, 'position')).toMatchObject({ juste: false });
	});

	it('bloc au-dessus du niveau : faux avec message', () => {
		const verdict = jugerProgrammeTortue(
			'si 1 = 1 alors [ avancer 3 ]',
			'avancer 3',
			'position',
			null,
			'4e'
		);
		expect(verdict.juste).toBe(false);
		expect(verdict.message).toBeDefined();
	});

	it('blocs: compte les instructions au niveau', () => {
		expect(depassementDeBlocs(HEXAGONE, 4, '4e')).toBeNull();
		expect(depassementDeBlocs(HEXAGONE, 3, '4e')).toMatch(/4 blocs/);
		expect(jugerProgrammeTortue(HEXAGONE, HEXAGONE, 'position', 3, '4e').juste).toBe(false);
	});
});

describe('notation de 4e / 3e : messages au vocabulaire de la tortue', () => {
	function message(texte: string): string {
		const lu = texteVersEtatTortue(texte, '3e');
		if (lu.ok) throw new Error(`« ${texte} » devait être refusé`);
		return lu.message;
	}

	it('« afficher » nommé : la tortue ne l’a pas', () => {
		expect(message('afficher 3')).toMatch(/« afficher » n’existe pas pour la tortue/);
	});

	it('« nombre », « résultat », « reste de » : refusés en le disant', () => {
		expect(message('avancer nombre')).toMatch(/« nombre » n’existe pas pour la tortue/);
		expect(message('avancer nombre choisi')).toMatch(/« nombre » n’existe pas pour la tortue/);
		expect(message('mettre résultat à 3')).toMatch(/« résultat » n’existe pas pour la tortue/);
		expect(message('avancer résultat')).toMatch(/« résultat » n’existe pas pour la tortue/);
		expect(message('ajouter 1 à résultat')).toMatch(/« résultat » n’existe pas pour la tortue/);
		expect(message('ajouter 1 à nombre')).toMatch(/« nombre » n’existe pas pour la tortue/);
		expect(message('avancer reste de 7 par 2')).toMatch(/« reste de » n’existe pas pour la tortue/);
	});

	it('exemples des messages : jamais « nombre » ni « afficher »', () => {
		for (const texte of [
			'si n > 1 [ avancer 1 ]',
			'si n alors [ avancer 1 ]',
			'répéter jusqu’à [ avancer 1 ]',
			'avancer 1e2',
			'sauter 2'
		]) {
			const lu = message(texte);
			expect(lu, texte).not.toMatch(/nombre >|afficher|« nombre »|« résultat »/);
		}
	});

	it('programmes de calcul : messages inchangés', () => {
		const lu = texteVersEtatCalcul('si n alors [ afficher 1 ]');
		expect(lu.ok).toBe(false);
		if (!lu.ok) expect(lu.message).toMatch(/ex\. nombre > 0/);
		expect(texteVersEtatCalcul('afficher nombre').ok).toBe(true);
	});
});

// Correctif `tortue-nombres` (phase 0 validée par David le 2026-11-17) : nombre de tours entier
// ≥ 0 à tous les niveaux, jamais arrondi en silence ; aucune écriture à exposant (`1e2`).
describe('nombre de tours : entier ≥ 0, jamais arrondi en silence', () => {
	function refusAlaLecture(texte: string, niveau: NiveauTortue): string {
		const lu = texteVersEtatTortue(texte, niveau);
		if (lu.ok) throw new Error(`« ${texte} » devait être refusé en ${niveau}`);
		return lu.message;
	}

	it('écrit non entier ou négatif : refusé à la lecture, en 4e comme en 3e', () => {
		for (const niveau of ['4e', '3e'] as const) {
			expect(refusAlaLecture('répéter 2,5 [ avancer 1 ]', niveau)).toBe(
				'« répéter 2,5 » : il faut un nombre entier de fois.'
			);
			expect(refusAlaLecture('répéter 2.5 [ avancer 1 ]', niveau)).toMatch(
				/« répéter 2.5 » : il faut un nombre entier de fois/
			);
			expect(refusAlaLecture('répéter -2 [ avancer 1 ]', niveau)).toBe(
				'« répéter − 2 » : il faut un nombre entier de fois.'
			);
			expect(refusAlaLecture('répéter − 2 [ avancer 1 ]', niveau)).toMatch(
				/il faut un nombre entier de fois/
			);
		}
	});

	it('écrit entier : inchangé, 0 compris', () => {
		expect(trace('répéter 3 [ avancer 1 ]', '4e').tortue.x).toBe(3);
		expect(trace('répéter 0 [ avancer 1 ]', '4e').segments).toEqual([]);
	});

	it('calculé non entier : arrêt, le message dit la valeur', () => {
		const e = erreur('mettre n à 2,5 ; répéter n [ avancer 1 ]', '4e');
		expect(e).toEqual({ type: 'tours-non-entier', valeur: 2.5 });
		expect(messageErreurTortue(e)).toBe(
			'Répéter : le nombre de fois vaut 2,5, il faut un nombre entier (0, 1, 2…).'
		);
		expect(erreur('répéter 5 ÷ 2 [ avancer 1 ]', '3e')).toEqual({
			type: 'tours-non-entier',
			valeur: 2.5
		});
	});

	it('calculé négatif : arrêt, signe moins typographique dans le message', () => {
		const e = erreur('mettre n à 0 − 3 ; répéter n [ avancer 1 ]', '4e');
		expect(e).toEqual({ type: 'tours-non-entier', valeur: -3 });
		expect(messageErreurTortue(e)).toMatch(/vaut −3,/);
	});

	it('calculé entier à l’arrondi du calcul près (0,1 × 30) : admis', () => {
		expect(trace('mettre n à 0,1 × 30 ; répéter n [ avancer 1 ]', '4e').tortue.x).toBe(3);
	});

	it('tracé partiel gardé jusqu’à la répétition fautive', () => {
		const r = executerTortue(
			etat('avancer 2 ; mettre n à 1,5 ; répéter n [ avancer 1 ]', '4e'),
			'4e'
		);
		expect(r.ok).toBe(false);
		expect(r.segments).toHaveLength(1);
	});

	it('jugement : la réponse fautive est refusée avec le message', () => {
		const lu = lireProgrammeTortue('mettre n à 2,5 ; répéter n [ avancer 1 ]', '4e');
		expect(lu).toEqual({
			ok: false,
			message: 'Répéter : le nombre de fois vaut 2,5, il faut un nombre entier (0, 1, 2…).'
		});
	});
});

describe('nombres sans exposant, à tous les niveaux', () => {
	it('« 1e2 » refusé, le message donne le nombre écrit en entier', () => {
		for (const niveau of ['4e', '3e'] as const) {
			const lu = texteVersEtatTortue('avancer 1e2', niveau);
			expect(lu).toEqual({ ok: false, message: '« 1e2 » : écrire le nombre en entier (100).' });
		}
		expect(texteVersEtat('avancer 1e2')).toEqual({
			ok: false,
			message: '« 1e2 » : écrire le nombre en entier (100).'
		});
		expect(texteVersEtat('avancer 2,5E1')).toEqual({
			ok: false,
			message: '« 2,5E1 » : écrire le nombre en entier (25).'
		});
		expect(texteVersEtat('répéter 1e1 [ avancer 1 ]')).toMatchObject({ ok: false });
	});

	it('exposant à signe (« 1e-2 ») : refusé sans « e » dans le nombre', () => {
		expect(texteVersEtat('avancer 1e-2')).toEqual({
			ok: false,
			message: '« 1e-2 » : écrire le nombre en entier (0,01).'
		});
		expect(texteVersEtatTortue('avancer 1e-2', '4e')).toEqual({
			ok: false,
			message: '« 1e-2 » : écrire le nombre en entier (0,01).'
		});
		expect(texteVersEtatTortue('avancer 1e−2', '4e')).toMatchObject({
			ok: false,
			message: '« 1e−2 » : écrire le nombre en entier (0,01).'
		});
	});

	it('exposant écrit en morceaux (« 1e − 2 ») : le message ne cite que ce qui est écrit', () => {
		const lu = texteVersEtatTortue('avancer 1e − 2', '4e');
		expect(lu.ok).toBe(false);
		if (!lu.ok) expect(lu.message).not.toMatch(/1e-2|0,01/);
	});

	it('nombre négatif : signe moins typographique dans le message', () => {
		expect(texteVersEtat('avancer -1e2')).toEqual({
			ok: false,
			message: '« -1e2 » : écrire le nombre en entier (−100).'
		});
	});
});
