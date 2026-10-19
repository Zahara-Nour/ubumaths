import { describe, expect, it } from 'vitest';
import { HistoryStack } from '../history-stack';

describe('HistoryStack — la pile Annuler / Rétablir (lot 5)', () => {
	it('annule puis rétablit une étape', () => {
		const stack = new HistoryStack();
		const id = stack.push({ label: 'définir f', before: 'a', after: 'b' });

		expect(stack.undoLabel).toBe('définir f');
		expect(stack.topId).toBe(id);
		expect(stack.undo()?.before).toBe('a');
		expect(stack.undoLabel).toBeNull();
		expect(stack.redoLabel).toBe('définir f');
		expect(stack.redo()?.after).toBe('b');
		expect(stack.redoLabel).toBeNull();
	});

	it('rien à annuler ni à rétablir : null', () => {
		const stack = new HistoryStack();
		expect(stack.undo()).toBeNull();
		expect(stack.redo()).toBeNull();
	});

	it('une nouvelle étape après des annulations oublie ce qui restait à rétablir', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'un', before: 'a', after: 'b' });
		stack.push({ label: 'deux', before: 'b', after: 'c' });
		stack.undo();
		stack.push({ label: 'trois', before: 'b', after: 'd' });

		expect(stack.redoLabel).toBeNull();
		expect(stack.undoLabel).toBe('trois');
		expect(stack.undo()?.label).toBe('trois');
		expect(stack.undo()?.label).toBe('un');
	});

	it('une étape qui ne change rien n’est pas gardée', () => {
		const stack = new HistoryStack();
		expect(stack.push({ label: 'rien', before: 'a', after: 'a' })).toBeNull();
		expect(stack.undoLabel).toBeNull();
	});

	it('au-delà de 100 étapes, la plus ancienne est oubliée', () => {
		const stack = new HistoryStack();
		for (let i = 0; i < 105; i++) stack.push({ label: `e${i}`, before: `${i}`, after: `${i + 1}` });

		let undone = 0;
		let last = '';
		for (let step = stack.undo(); step !== null; step = stack.undo()) {
			undone++;
			last = step.label;
		}
		expect(undone).toBe(100);
		expect(last).toBe('e5');
	});

	it('au-delà de la taille totale, les plus anciennes sont oubliées, la dernière jamais', () => {
		const stack = new HistoryStack({ maxSteps: 100, maxChars: 30 });
		stack.push({ label: 'a', before: 'x'.repeat(10), after: 'y'.repeat(10) });
		stack.push({ label: 'b', before: 'y'.repeat(10), after: 'z'.repeat(10) });
		expect(stack.undo()?.label).toBe('b');
		expect(stack.undo()).toBeNull();

		const big = new HistoryStack({ maxSteps: 100, maxChars: 5 });
		big.push({ label: 'énorme', before: 'x'.repeat(10), after: 'y'.repeat(10) });
		expect(big.undoLabel).toBe('énorme');
	});

	it('vider oublie tout', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'un', before: 'a', after: 'b' });
		stack.undo();
		stack.push({ label: 'deux', before: 'a', after: 'c' });
		stack.clear();
		expect(stack.undoLabel).toBeNull();
		expect(stack.redoLabel).toBeNull();
		expect(stack.topId).toBeNull();
	});
});

describe('HistoryStack — un geste continu (curseur, champ) est UNE étape (lot 5, PR 2)', () => {
	it('les écritures d’un même geste ouvert se fondent en une étape', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'supprimer k', before: 'a', after: 'b' });
		let state = 'b';
		for (let i = 1; i <= 150; i++) {
			const next = `t${i}`;
			stack.push({ label: 'tangente de f', before: state, after: next }, 'tangente:f');
			state = next;
		}

		expect(stack.size).toBe(2);
		expect(stack.undo()?.before).toBe('b');
		expect(stack.undo()?.label).toBe('supprimer k');
	});

	it('une fois le geste fermé, le geste suivant fait une nouvelle étape', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'curseur a', before: 'a', after: 'b' }, 'curseur:a');
		stack.seal();
		stack.push({ label: 'curseur a', before: 'b', after: 'c' }, 'curseur:a');

		expect(stack.size).toBe(2);
	});

	it('un autre geste entre deux écritures ferme le premier', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'curseur a', before: 'a', after: 'b' }, 'curseur:a');
		stack.push({ label: 'couleur de f', before: 'b', after: 'c' });
		stack.push({ label: 'curseur a', before: 'c', after: 'd' }, 'curseur:a');

		expect(stack.size).toBe(3);
	});

	it('une écriture qui ne part pas de l’état laissé par le geste ne s’y fond pas', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'curseur a', before: 'a', after: 'b' }, 'curseur:a');
		stack.push({ label: 'curseur a', before: 'x', after: 'y' }, 'curseur:a');

		expect(stack.size).toBe(2);
	});

	it('un geste revenu à son point de départ ne laisse aucune étape', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'curseur a', before: 'a', after: 'b' }, 'curseur:a');
		stack.push({ label: 'curseur a', before: 'b', after: 'a' }, 'curseur:a');

		expect(stack.size).toBe(0);
	});

	it('annuler ferme le geste : une nouvelle écriture ne se fond pas dans une étape plus ancienne', () => {
		const stack = new HistoryStack();
		stack.push({ label: 'curseur a', before: 'a', after: 'b' }, 'curseur:a');
		stack.push({ label: 'curseur b', before: 'b', after: 'c' }, 'curseur:b');
		stack.undo();
		stack.push({ label: 'curseur a', before: 'b', after: 'd' }, 'curseur:a');

		expect(stack.size).toBe(2);
	});
});
