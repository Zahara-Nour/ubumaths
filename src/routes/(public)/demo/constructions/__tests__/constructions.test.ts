/**
 * Les 3 constructions de la vitrine `/demo/constructions` (choix validé par David le
 * 2026-10-25, docs/wip/demo-debug-progress.md, phase 8) : chacune se joue jusqu'au
 * bout sans erreur et sans point indéfini, pour qu'une évolution du moteur ne casse
 * pas la vitrine en silence.
 */
import { describe, expect, it } from 'vitest';
import { ConstructionExecutor } from '$lib/constructions-v2/core/executor';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { DEMO_CONSTRUCTIONS } from '../constructions';

describe('DEMO_CONSTRUCTIONS', () => {
	it('garde les 3 constructions validées, dans l’ordre', () => {
		expect(DEMO_CONSTRUCTIONS.map((c) => c.title)).toEqual([
			'Un parallélogramme par ses diagonales',
			'Partager un segment en trois',
			'Le symétrique d’un point, au compas'
		]);
	});

	it.each(DEMO_CONSTRUCTIONS.map((c) => [c.title, c.dsl]))(
		'%s : se joue jusqu’au bout, tous les points définis',
		(_title, dsl) => {
			const exec = new ConstructionExecutor();
			exec.load(dsl);
			expect(exec.loadError?.message ?? null).toBeNull();
			let steps = 0;
			while (exec.step()) steps++;
			expect(steps).toBeGreaterThan(5);

			for (const el of exec.figure.getAllElements()) {
				const p = exec.figure.getPosition(el.id);
				if (!p) continue;
				expect(Number.isFinite(geoToNumber(p.x)), el.label ?? el.id).toBe(true);
				expect(Number.isFinite(geoToNumber(p.y)), el.label ?? el.id).toBe(true);
			}
		}
	);
});
