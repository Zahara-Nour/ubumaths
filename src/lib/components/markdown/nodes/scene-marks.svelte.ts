/**
 * Marquage au doigt — commun à ```collection et ```monnaie
 * ========================================================
 *
 * Toucher un objet le barre, comme au crayon sur papier : aide de comptage non
 * jugée, rien n'est enregistré (décision 2 de `docs/wip/collection-progress.md`,
 * reprise par la monnaie, décision 8 de `docs/wip/monnaie-progress.md`).
 *
 * Les marques valent pour UN contenu de bloc (`key`, le texte de sa spec) : un
 * autre bloc (question suivante) repart sans marque, sans effet de bord.
 *
 * @module components/markdown/nodes/scene-marks
 */

import { SvelteSet } from 'svelte/reactivity';
import type { ScenePoint } from '$lib/ubumark/utils/scene-commune';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Point touché, en coordonnées de la scène du `<svg>` qui reçoit le clic */
export function scenePointOf(event: MouseEvent): ScenePoint | null {
	const svg = event.currentTarget as SVGSVGElement;
	const matrix = svg.getScreenCTM();
	if (matrix === null) return null;
	return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
}

// ============================================================================
// MARQUES
// ============================================================================

/** Marques « ensemble:objet » d'un bloc dont `key()` dit le contenu */
export class SceneMarks {
	#marks = new SvelteSet<string>();
	#markedFor = $state('');
	#key: () => string;

	constructor(key: () => string) {
		this.#key = key;
	}

	/** Les marques appartiennent-elles au bloc affiché ? */
	#current(): boolean {
		return this.#markedFor === this.#key();
	}

	has(setIndex: number, itemIndex: number): boolean {
		return this.#current() && this.#marks.has(`${setIndex}:${itemIndex}`);
	}

	get size(): number {
		return this.#current() ? this.#marks.size : 0;
	}

	toggle(setIndex: number, itemIndex: number) {
		if (!this.#current()) {
			this.#marks.clear();
			this.#markedFor = this.#key();
		}
		const id = `${setIndex}:${itemIndex}`;
		if (this.#marks.has(id)) this.#marks.delete(id);
		else this.#marks.add(id);
	}

	clear() {
		this.#marks.clear();
	}
}
