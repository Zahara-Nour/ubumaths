/**
 * Lecture des activités choisies avant enregistrement d'une séance.
 *
 * Le champ vient d'un formulaire, donc de l'extérieur : ces tests verrouillent
 * surtout ce qui NE doit PAS passer, et le fait qu'une saisie douteuse n'emporte
 * pas la séance avec elle.
 */

import { describe, it, expect } from 'vitest';
import { parsePendingActivities } from '../journal-activities';

const EXERCISE = '11111111-1111-4111-8111-111111111111';
const QUESTION = '22222222-2222-4222-8222-222222222222';
const ASSESSMENT = '33333333-3333-4333-8333-333333333333';

const json = (v: unknown) => JSON.stringify(v);

describe('parsePendingActivities', () => {
	it('range chaque référence dans la colonne de son type', () => {
		const rows = parsePendingActivities(
			json([
				{ kind: 'exercise', id: EXERCISE },
				{ kind: 'question', id: QUESTION },
				{ kind: 'assessment', id: ASSESSMENT }
			])
		);
		expect(rows).toEqual([
			{ kind: 'exercise', exercise_id: EXERCISE },
			{ kind: 'question', question_template_id: QUESTION },
			{ kind: 'assessment', assessment_id: ASSESSMENT }
		]);
	});

	it('écarte les doublons du même type', () => {
		const rows = parsePendingActivities(
			json([
				{ kind: 'question', id: QUESTION },
				{ kind: 'question', id: QUESTION }
			])
		);
		expect(rows).toHaveLength(1);
	});

	// Le même identifiant sous deux types reste deux activités distinctes : rien
	// n'interdit qu'un exercice et une évaluation partagent un UUID.
	it('ne confond pas deux types portant le même identifiant', () => {
		const rows = parsePendingActivities(
			json([
				{ kind: 'exercise', id: EXERCISE },
				{ kind: 'question', id: EXERCISE }
			])
		);
		expect(rows).toHaveLength(2);
	});

	it('ignore les entrées mal formées sans perdre les bonnes', () => {
		const rows = parsePendingActivities(
			json([
				{ kind: 'question', id: QUESTION },
				{ kind: 'course', id: EXERCISE }, // type non rattachable
				{ kind: 'exercise', id: 'pas-un-uuid' },
				{ kind: 'exercise' }, // référence absente
				null,
				'texte',
				{ kind: 'exercise', id: EXERCISE }
			])
		);
		expect(rows).toEqual([
			{ kind: 'question', question_template_id: QUESTION },
			{ kind: 'exercise', exercise_id: EXERCISE }
		]);
	});

	it('rend une liste vide sur tout ce qui n’est pas un tableau JSON', () => {
		for (const raw of [
			'',
			'   ',
			'null',
			'{}',
			'"texte"',
			'[',
			'pas du json',
			null,
			undefined,
			42
		]) {
			expect(parsePendingActivities(raw)).toEqual([]);
		}
	});

	it('plafonne à 100 activités', () => {
		const many = Array.from({ length: 250 }, (_, i) => ({
			kind: 'exercise' as const,
			id: `1111111${(i % 10).toString()}-1111-4111-8111-${i.toString().padStart(12, '0')}`
		}));
		expect(parsePendingActivities(json(many))).toHaveLength(100);
	});
});
