/**
 * Le bump de version, relu commit par commit
 * ==========================================
 *
 * Ce qui est gardé ici : **une fonctionnalité vaut un numéro mineur**, même en
 * 0.x. La v0.14.2 est sortie avec dix `feat:` dedans, annoncée comme un simple
 * correctif — standard-version force `preMajor` en dessous de 1.0.0 et
 * rétrograde chaque niveau d'un cran.
 *
 * Un mauvais numéro de version est un échec silencieux de plus : rien ne
 * rougit, et on ne s'en aperçoit qu'en relisant le CHANGELOG.
 */

import { describe, it, expect } from 'vitest';
import { decideBump } from '../release';

describe('decideBump', () => {
	it('rend un mineur dès qu’une fonctionnalité est livrée', () => {
		expect(decideBump(['feat: ajoute les paquets de chapitre'])).toBe('minor');
	});

	it('reconnaît la portée entre parenthèses', () => {
		expect(decideBump(['feat(marche): comble le nom des participants'])).toBe('minor');
	});

	it('rend un patch pour un correctif seul', () => {
		expect(decideBump(['fix(rls): ferme le kanban aux élèves archivés'])).toBe('patch');
	});

	it('rend un patch quand rien n’a été livré', () => {
		expect(decideBump([])).toBe('patch');
	});

	it('suffit d’une fonctionnalité au milieu des correctifs', () => {
		expect(
			decideBump(['fix: un correctif', 'chore: du ménage', 'feat: une nouveauté', 'fix: un autre'])
		).toBe('minor');
	});

	/**
	 * ⚠️ On reste en 0.x. Passer en 1.0.0 est une décision de produit, pas la
	 * conséquence d'un `!` dans un message de commit : `pnpm release:major`.
	 */
	it('une rupture reste MINEURE tant qu’on est en 0.x', () => {
		expect(
			decideBump(['chore(db)!: suppression de la colonne worksheet_assignments.class_id'])
		).toBe('minor');
	});

	it('reconnaît la rupture annoncée en pied de message', () => {
		const commit = [
			'refactor: déplace la propriété vers les rôles',
			'',
			'BREAKING CHANGE: teacher_id disparaît des tables de classe.'
		].join('\n');

		expect(decideBump([commit])).toBe('minor');
	});

	it('reconnaît aussi la forme avec trait d’union', () => {
		const commit = ['refactor: idem', '', 'BREAKING-CHANGE: idem.'].join('\n');
		expect(decideBump([commit])).toBe('minor');
	});

	/**
	 * ⚠️ Le type se lit en TÊTE du message, pas n'importe où dedans. Un
	 * correctif qui raconte la fonctionnalité qu'il répare reste un correctif.
	 */
	it('ne confond pas un type cité dans le corps avec le type du commit', () => {
		const commit = [
			'fix(cours): répare la publication par section',
			'',
			'Régression introduite par feat: bouton Ajouter par section.'
		].join('\n');

		expect(decideBump([commit])).toBe('patch');
	});

	it('ignore les commits de fusion', () => {
		expect(decideBump(['Merge pull request #303 from Zahara-Nour/feat/comblement'])).toBe('patch');
	});
});
