// Ébauche (TDD)
import { Figure } from '$lib/geometry-core/graph/figure';
import type { Atelier } from './atelier.svelte';
export class AtelierFigure {
	figure = new Figure();
	sliderOf(_name: string): string | undefined {
		return undefined;
	}
}
export function syncFigure(
	_atelier: Atelier,
	_target: AtelierFigure
): 'unchanged' | 'moved' | 'rebuilt' {
	return 'unchanged';
}
