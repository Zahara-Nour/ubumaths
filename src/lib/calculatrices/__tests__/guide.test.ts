/**
 * Guides calculatrices : ce que montre le guide d'un modèle à un niveau (phase 0 validée
 * par David le 2026-10-12, docs/wip/guides-calculatrices-progress.md).
 *
 * Le modèle de test est fabriqué ici : ces tests portent sur la logique, pas sur le
 * contenu NumWorks (vérifié par integrite.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { buildGuide, isModelAvailable, parseStep } from '../guide';
import type { CalculatorModel, Pitfall, TaskSequence } from '../types';

const SOURCE = [{ kind: 'doc', url: 'https://exemple.test/manuel' }] as const;

function sequence(taskId: string, extra: Partial<TaskSequence> = {}): TaskSequence {
	return {
		taskId,
		steps: ['Appuie sur [[exe]]'],
		sources: SOURCE,
		verifiedOnDevice: true,
		...extra
	};
}

function pitfall(id: string, grade: Pitfall['grade'], verifiedOnDevice = true): Pitfall {
	return { id, grade, title: id, explanation: '…', sources: SOURCE, verifiedOnDevice };
}

function model(sequences: TaskSequence[], pitfalls: Pitfall[] = []): CalculatorModel {
	return {
		slug: 'essai',
		name: 'Essai',
		family: 'lycee',
		grades: ['6', '5', '2', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP'],
		keys: { exe: 'EXE', shift: 'shift' },
		sequences,
		pitfalls
	};
}

const ids = (entries: { task: { id: string } }[]) => entries.map((entry) => entry.task.id);

describe('buildGuide : tâches du niveau et rappels', () => {
	it('montre d’abord les tâches du niveau, puis les niveaux hérités du plus proche au plus lointain', () => {
		const guide = buildGuide(
			model([sequence('clear-input'), sequence('pi'), sequence('exam-mode'), sequence('settings')]),
			'2',
			{ includeUnverified: false }
		);
		expect(ids(guide.own)).toEqual(['exam-mode', 'settings']);
		expect(guide.recalls.map((recall) => recall.grade)).toEqual(['5', '6']);
		expect(ids(guide.recalls[0].entries)).toEqual(['pi']);
		expect(ids(guide.recalls[1].entries)).toEqual(['clear-input']);
	});

	it('range les tâches dans l’ordre de la liste commune, pas dans celui du fichier du modèle', () => {
		const guide = buildGuide(model([sequence('percentage'), sequence('clear-input')]), '6', {
			includeUnverified: false
		});
		expect(ids(guide.own)).toEqual(['clear-input', 'percentage']);
	});

	it('maths complémentaires héritent de la 1re spécialité, PAS de la Tle spécialité', () => {
		const guide = buildGuide(model([sequence('natural-log'), sequence('sequences')]), 'T_COMP', {
			includeUnverified: false
		});
		const recallGrades = guide.recalls.map((recall) => recall.grade);
		expect(recallGrades).toContain('1_SPE');
		expect(recallGrades).not.toContain('T_SPE');
	});

	it('maths expertes reprennent la Tle spécialité, suivie en même temps', () => {
		const guide = buildGuide(model([sequence('binomial'), sequence('matrices')]), 'T_EXP', {
			includeUnverified: false
		});
		expect(ids(guide.own)).toEqual(['matrices']);
		expect(guide.recalls.map((recall) => recall.grade)).toContain('T_SPE');
	});

	it('omet un niveau hérité sans aucune tâche à montrer', () => {
		const guide = buildGuide(model([sequence('clear-input')]), '2', { includeUnverified: false });
		expect(guide.recalls.map((recall) => recall.grade)).toEqual(['6']);
	});
});

describe('buildGuide : séquences non relues sur machine (phase 0, point 8)', () => {
	const unverified = model([
		sequence('clear-input', { verifiedOnDevice: false }),
		sequence('percentage')
	]);

	it('les masque en production', () => {
		const guide = buildGuide(unverified, '6', { includeUnverified: false });
		expect(ids(guide.own)).toEqual(['percentage']);
	});

	it('les montre en local, marquées comme non relues', () => {
		const guide = buildGuide(unverified, '6', { includeUnverified: true });
		expect(ids(guide.own)).toEqual(['clear-input', 'percentage']);
		expect(guide.own[0].sequence.verifiedOnDevice).toBe(false);
	});

	it('un modèle sans aucune séquence relue est « bientôt » en production', () => {
		const onlyUnverified = model([sequence('clear-input', { verifiedOnDevice: false })]);
		expect(isModelAvailable(onlyUnverified, { includeUnverified: false })).toBe(false);
		expect(isModelAvailable(onlyUnverified, { includeUnverified: true })).toBe(true);
	});
});

describe('buildGuide : cas limites', () => {
	it('une tâche sans fonction dédiée reste dans le guide, avec son contournement (point 7)', () => {
		const guide = buildGuide(
			model([
				sequence('euclidean-division', { noDedicatedFunction: true, steps: ['Divise, puis…'] })
			]),
			'6',
			{ includeUnverified: false }
		);
		expect(guide.own[0].sequence.noDedicatedFunction).toBe(true);
		expect(guide.own[0].sequence.steps).toEqual(['Divise, puis…']);
	});

	it('garde la version du système à partir de laquelle la séquence marche (point 9)', () => {
		const guide = buildGuide(
			model([sequence('exponential-law', { sinceVersion: '26' })]),
			'T_COMP',
			{
				includeUnverified: false
			}
		);
		expect(guide.own[0].sequence.sinceVersion).toBe('26');
	});

	it('refuse un niveau pour lequel le modèle n’a pas de guide', () => {
		expect(() =>
			buildGuide(model([sequence('clear-input')]), 'T_TECHNO', { includeUnverified: false })
		).toThrow(/pas de guide/);
	});
});

describe('buildGuide : pièges', () => {
	it('montre les pièges du niveau et des niveaux hérités, pas ceux des niveaux suivants', () => {
		const guide = buildGuide(
			model([sequence('clear-input')], [pitfall('ecran-6e', '6'), pitfall('radians', '1_SPE')]),
			'2',
			{ includeUnverified: false }
		);
		expect(guide.pitfalls.map((item) => item.id)).toEqual(['ecran-6e']);
	});

	it('masque en production un piège non relu sur machine', () => {
		const guide = buildGuide(
			model([sequence('clear-input')], [pitfall('non-relu', '6', false)]),
			'6',
			{
				includeUnverified: false
			}
		);
		expect(guide.pitfalls).toEqual([]);
	});
});

describe('parseStep : les touches dessinées', () => {
	const keys = { shift: 'shift', del: '⌫' };

	it('découpe le texte et les touches `[[id]]`', () => {
		expect(parseStep('Appuie sur [[shift]] puis [[del]].', keys)).toEqual([
			{ kind: 'text', text: 'Appuie sur ' },
			{ kind: 'key', id: 'shift', label: 'shift' },
			{ kind: 'text', text: ' puis ' },
			{ kind: 'key', id: 'del', label: '⌫' },
			{ kind: 'text', text: '.' }
		]);
	});

	it('laisse les crochets simples tels quels (intervalles, listes Python)', () => {
		expect(parseStep('Tape [1, 2] sur ]0 ; 1]', keys)).toEqual([
			{ kind: 'text', text: 'Tape [1, 2] sur ]0 ; 1]' }
		]);
	});

	it('refuse une touche que le modèle ne déclare pas', () => {
		expect(() => parseStep('Appuie sur [[menu]]', keys)).toThrow(/touche inconnue « menu »/);
	});
});
