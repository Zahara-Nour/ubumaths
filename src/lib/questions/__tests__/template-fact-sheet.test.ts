/**
 * Fiche du modèle — réglages de validation en mots, chemin dans l'arbre
 * ======================================================================
 *
 * La fiche ne montre que les réglages qui s'écartent du défaut (`warn`, sauf `form` : `strict`,
 * ADR 0013), avec les mots de l'éditeur ; jamais une clé JSON.
 */
import { describe, expect, it } from 'vitest';
import {
	describeValidationSettings,
	lowestGradeLabel,
	nodePath
} from '$lib/questions/template-fact-sheet';

describe('describeValidationSettings', () => {
	it('modèle exemple : seulement « Espaces dès 4 chiffres »', () => {
		expect(describeValidationSettings({ constraints: { spacesFromFourDigits: true } })).toEqual([
			'Espaces dès 4 chiffres (7 900, numération)'
		]);
	});

	it('modes en mots de l’éditeur, dans l’ordre de l’éditeur', () => {
		expect(
			describeValidationSettings({
				constraints: { zeros: 'off', brackets: 'strict', form: 'warn' }
			})
		).toEqual([
			'Parenthèses : strict',
			'Zéros inutiles : désactivé',
			'Forme générale : avertissement'
		]);
	});

	it('un réglage égal au défaut ne s’affiche pas (warn partout, strict pour form)', () => {
		expect(describeValidationSettings({ constraints: { spaces: 'warn', form: 'strict' } })).toEqual(
			[]
		);
	});

	it('options hors contraintes : ordre des trous libre, choix non mélangés', () => {
		expect(
			describeValidationSettings({
				orderIndependent: true,
				shuffleChoices: false,
				constraints: { allowBracketsInFirstNegativeTerm: true }
			})
		).toEqual([
			'Parenthèses autorisées sur un premier terme négatif',
			'Trous dans n’importe quel ordre',
			'Choix non mélangés'
		]);
	});

	it('aucune option, options illisibles ou valeur inconnue : rien, et jamais une clé', () => {
		expect(describeValidationSettings(null)).toEqual([]);
		expect(describeValidationSettings('x')).toEqual([]);
		expect(
			describeValidationSettings({ constraints: { spaces: 'bizarre', inconnu: 'off' } })
		).toEqual([]);
	});
});

describe('nodePath', () => {
	const NODES = [
		{ id: 'b', name: 'Nombres et calculs', parent_id: null, archived_at: null },
		{ id: 'n', name: 'Entiers : addition et soustraction', parent_id: 'b', archived_at: null },
		{ id: 's', name: 'complément', parent_id: 'n', archived_at: '2026-10-01T00:00:00Z' }
	];

	it('de la branche au nœud du modèle, archivé signalé', () => {
		expect(nodePath('s', NODES)).toEqual([
			{ name: 'Nombres et calculs', archived: false },
			{ name: 'Entiers : addition et soustraction', archived: false },
			{ name: 'complément', archived: true }
		]);
	});

	it('nœud absent des lectures : erreur, pas un chemin tronqué', () => {
		expect(() => nodePath('inconnu', NODES)).toThrow(/introuvable/);
	});
});

describe('lowestGradeLabel', () => {
	it('la classe la plus basse du modèle, en clair', () => {
		expect(lowestGradeLabel(['CM1'])).toBe('CM1');
		expect(lowestGradeLabel(['4', '3'])).toBe('4ème');
		expect(lowestGradeLabel([])).toBeNull();
	});
});
