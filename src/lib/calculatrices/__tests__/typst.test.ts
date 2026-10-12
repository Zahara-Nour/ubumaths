/**
 * Guides calculatrices : la fiche PDF (Typst) contient exactement les tâches de la page,
 * dans le même ordre (phase 0, point 6), et le texte des élèves n'y devient jamais du
 * code Typst.
 */
import { describe, expect, it } from 'vitest';
import { buildGuide } from '../guide';
import { generateGuideTypst } from '../typst';
import type { CalculatorModel, TaskSequence } from '../types';

const SOURCE = [{ kind: 'doc', url: 'https://exemple.test' }] as const;

function sequence(taskId: string, steps: string[] = ['Appuie sur [[exe]]']): TaskSequence {
	return { taskId, steps, sources: SOURCE, verifiedOnDevice: true };
}

const MODEL: CalculatorModel = {
	slug: 'essai',
	name: 'Essai',
	family: 'lycee',
	grades: ['6', '5', '2'],
	keys: { exe: 'EXE', shift: 'shift' },
	sequences: [
		sequence('clear-input'),
		sequence('pi'),
		sequence('exam-mode'),
		sequence('python-basics', ['Tape `print(7 // 2)` puis [[exe]] : affiche 3 #python']),
		sequence('settings', ['Écris [1, 2] et $x$ * 2 @ <b> ~ "oui" -- \\n'])
	],
	pitfalls: [
		{
			id: 'degres',
			grade: '6',
			title: 'Degrés ou radians',
			explanation: '= 3 selon la machine ; - pas une liste',
			sources: SOURCE,
			verifiedOnDevice: true
		}
	]
};

function render() {
	const guide = buildGuide(MODEL, '2', { includeUnverified: false });
	return { guide, typst: generateGuideTypst({ guide, model: MODEL, gradeLabel: 'Seconde' }) };
}

describe('generateGuideTypst', () => {
	it('reprend les tâches de la page, dans le même ordre (point 6)', () => {
		const { guide, typst } = render();
		const pageOrder = [
			...guide.own.map((entry) => entry.task.title),
			...guide.recalls.flatMap((recall) => recall.entries.map((entry) => entry.task.title))
		];
		const positions = pageOrder.map((title) => typst.indexOf(title));
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	it('met les pièges à la fin', () => {
		const { typst } = render();
		expect(typst.lastIndexOf('Degrés ou radians')).toBeGreaterThan(typst.indexOf('Effacer'));
	});

	it('dessine les touches dans une boîte', () => {
		const { typst } = render();
		expect(typst).toContain('#calc-key("EXE")');
	});

	it('écrit tout texte en chaîne Typst : aucun caractère n’y devient du balisage', () => {
		const { typst } = render();
		expect(typst).toContain('#"Écris [1, 2] et $x$ * 2 @ <b> ~ \\"oui\\" -- \\\\n"');
		expect(typst).toContain('#"Tape `print(7 // 2)` puis "');
		// En tête de texte, `=` et `-` restent dans la chaîne : ni titre ni liste
		expect(typst).toContain('#"= 3 selon la machine ; - pas une liste"');
	});
});
