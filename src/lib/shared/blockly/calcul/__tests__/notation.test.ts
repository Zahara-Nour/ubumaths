import { describe, expect, it } from 'vitest';

import { executerCalcul } from '../interpreteur';
import { etatVersTexteCalcul, texteVersEtatCalcul } from '../notation';
import { LONGUEUR_MAX_PROGRAMME } from '../../tortue/notation';

// =============================================================================
// Aides
// =============================================================================

/** Affichages du texte, rejoué par l'interpréteur sur un nombre. */
function sortie(texte: string, nombre: number): number[] {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) throw new Error(lu.message);
	const r = executerCalcul(lu.etat, nombre);
	if (!r.ok) throw new Error(r.erreur.type);
	return r.affichages;
}

/** Texte → blocs → texte. */
function aller_retour(texte: string): string {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) throw new Error(lu.message);
	const ecrit = etatVersTexteCalcul(lu.etat);
	if (!ecrit.ok) throw new Error(ecrit.message);
	return ecrit.texte;
}

function message(texte: string): string {
	const lu = texteVersEtatCalcul(texte);
	if (lu.ok) throw new Error('lisible');
	return lu.message;
}

// =============================================================================
// Tests
// =============================================================================

describe('texteVersEtatCalcul', () => {
	it('une expression affichée', () => {
		expect(sortie('afficher (nombre + 2) × 4', 3)).toEqual([20]);
	});

	it('priorités : × et ÷ avant + et −, de gauche à droite', () => {
		expect(sortie('afficher 2 + 3 × 4', 0)).toEqual([14]);
		expect(sortie('afficher 10 − 4 − 3', 0)).toEqual([3]);
		expect(sortie('afficher 24 ÷ 4 ÷ 2', 0)).toEqual([3]);
		expect(sortie('afficher 10 − (4 − 3)', 0)).toEqual([9]);
	});

	it('étape par étape : résultat = … et mettre résultat à …', () => {
		const texte = 'résultat = nombre + 2 ; mettre résultat à résultat × 4 ; afficher résultat';
		expect(sortie(texte, 1)).toEqual([12]);
	});

	it('répéter n [ … ]', () => {
		expect(
			sortie('résultat = nombre ; répéter 3 [ résultat = résultat × 2 ] ; afficher résultat', 5)
		).toEqual([40]);
	});

	it('lecture souple : accents, majuscules, * / : -, virgule, retours à la ligne', () => {
		expect(sortie('Resultat = Nombre * 2\r\nafficher resultat / 4', 3)).toEqual([1.5]);
		expect(sortie('afficher nombre : 2 - 0,5', 3)).toEqual([1]);
		expect(sortie('afficher nombre choisi + 1', 3)).toEqual([4]);
	});

	it('nombre négatif, tiré ou écrit', () => {
		expect(sortie('afficher nombre + -3', 5)).toEqual([2]);
		expect(sortie('afficher nombre × (−3)', 5)).toEqual([-15]);
		expect(sortie('afficher -2 × nombre', 5)).toEqual([-10]);
	});

	it('texte vide : programme vide', () => {
		const lu = texteVersEtatCalcul('  ');
		expect(lu).toMatchObject({ ok: true, etat: { blocks: { blocks: [] } } });
	});

	it('refus expliqués', () => {
		expect(message('afficher')).toMatch(/afficher/);
		expect(message('afficher nombre +')).toMatch(/calcul/i);
		expect(message('afficher (nombre + 2')).toMatch(/parenthèse/i);
		expect(message('afficher nombre + 2)')).toMatch(/parenthèse/i);
		expect(message('afficher -(nombre)')).toMatch(/−/);
		expect(message('x = 3')).toMatch(/inconnue/i);
		expect(message('avancer 3')).toMatch(/inconnue/i);
		expect(message('répéter 2,5 [ afficher 1 ]')).toMatch(/entier/);
		expect(message('répéter 2 afficher 1')).toMatch(/crochets/);
		expect(message('répéter 2 [ afficher 1')).toMatch(/refermé/);
		expect(message('afficher 1 ]')).toMatch(/\]/);
		expect(message('afficher 2 3')).toMatch(/2 3|calcul/i);
	});

	it('programme trop long refusé', () => {
		const long = 'afficher 1 ; '.repeat(Math.ceil(LONGUEUR_MAX_PROGRAMME / 12));
		expect(message(long)).toMatch(/trop long/i);
	});
});

describe('etatVersTexteCalcul', () => {
	it('écriture canonique', () => {
		expect(aller_retour('afficher (nombre+2)*4')).toBe('afficher (nombre + 2) × 4');
		expect(aller_retour('mettre résultat à nombre / 2 ; afficher resultat')).toBe(
			'résultat = nombre ÷ 2 ; afficher résultat'
		);
		expect(aller_retour('afficher 0.5 + nombre')).toBe('afficher 0,5 + nombre');
		expect(aller_retour('répéter 2 [ afficher 1 ] ; répéter 3 [ ]')).toBe(
			'répéter 2 [ afficher 1 ] ; répéter 3 [ ]'
		);
	});

	it('parenthèses gardées là où l’arbre l’exige, seulement là', () => {
		expect(aller_retour('afficher 2 + 3 × 4')).toBe('afficher 2 + 3 × 4');
		expect(aller_retour('afficher (2 + 3) × 4')).toBe('afficher (2 + 3) × 4');
		expect(aller_retour('afficher 10 − (4 − 3)')).toBe('afficher 10 − (4 − 3)');
		expect(aller_retour('afficher (10 − 4) − 3')).toBe('afficher 10 − 4 − 3');
		expect(aller_retour('afficher 2 × (3 × 4)')).toBe('afficher 2 × (3 × 4)');
		expect(aller_retour('afficher nombre + -3')).toBe('afficher nombre + (−3)');
		expect(aller_retour('afficher -3')).toBe('afficher −3');
	});

	it('l’aller-retour garde le calcul', () => {
		for (const texte of [
			'afficher (nombre + 2) × 4 − 3',
			'résultat = nombre ; répéter 4 [ résultat = résultat × 2 − 1 ; afficher résultat ]',
			'afficher nombre ÷ (2 ÷ 4)',
			'afficher nombre − (−1)'
		]) {
			for (const n of [-3, 0, 2, 0.5])
				expect(sortie(aller_retour(texte), n)).toEqual(sortie(texte, n));
		}
	});

	it('bloc inconnu ou désactivé', () => {
		const etat = {
			blocks: {
				languageVersion: 0,
				blocks: [
					{
						type: 'calcul_afficher',
						enabled: false,
						inputs: { VALEUR: { shadow: { type: 'math_number', fields: { NUM: 1 } } } },
						next: { block: { type: 'calcul_afficher' } }
					}
				]
			}
		};
		expect(etatVersTexteCalcul(etat)).toEqual({ ok: true, texte: 'afficher 0' });
		expect(etatVersTexteCalcul({ blocks: { blocks: [{ type: 'tortue_avancer' }] } })).toMatchObject(
			{
				ok: false
			}
		);
	});
});
