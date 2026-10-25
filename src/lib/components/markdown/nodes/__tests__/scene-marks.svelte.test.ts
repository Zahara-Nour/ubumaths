/**
 * Marquage au doigt — `SceneMarks`, commun à ```collection et ```monnaie
 *
 * Décision 2 de `docs/wip/collection-progress.md`, reprise par la monnaie
 * (décision 8 de `docs/archive/wip/monnaie-progress.md`) : un objet touché se barre, un
 * second toucher le libère ; les marques valent pour UN contenu de bloc.
 */

import { describe, expect, it } from 'vitest';
import { SceneMarks } from '../scene-marks.svelte';

describe('SceneMarks', () => {
	it('toucher marque, toucher encore libère ; ensembles distincts', () => {
		const marks = new SceneMarks(() => 'bloc');
		marks.toggle(0, 3);
		marks.toggle(1, 3);
		expect(marks.has(0, 3)).toBe(true);
		expect(marks.has(1, 3)).toBe(true);
		expect(marks.has(0, 4)).toBe(false);
		expect(marks.size).toBe(2);

		marks.toggle(0, 3);
		expect(marks.has(0, 3)).toBe(false);
		expect(marks.size).toBe(1);
	});

	it('un autre bloc repart sans marque, et le premier toucher y efface les anciennes', () => {
		let key = 'question 1';
		const marks = new SceneMarks(() => key);
		marks.toggle(0, 0);
		marks.toggle(0, 1);

		key = 'question 2';
		expect(marks.has(0, 0)).toBe(false);
		expect(marks.size).toBe(0);

		marks.toggle(0, 5);
		expect(marks.size).toBe(1);
		key = 'question 1';
		expect(marks.has(0, 0)).toBe(false);
	});

	it('effacer retire toutes les marques', () => {
		const marks = new SceneMarks(() => 'bloc');
		marks.toggle(0, 0);
		marks.toggle(0, 1);
		marks.clear();
		expect(marks.size).toBe(0);
		expect(marks.has(0, 0)).toBe(false);
	});
});
