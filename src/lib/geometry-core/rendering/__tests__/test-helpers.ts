import type { Figure } from '../../graph/figure';

/**
 * Helper that creates a scalar + auto-positioned text (like mesure() in DSL).
 * Used in tests that previously called the now-removed createMeasure().
 */
export function createMesureText(
	figure: Figure,
	type: 'distance' | 'angle' | 'area',
	targetIds: string[]
): string {
	let scalarId: string;
	let autoPosition: 'midpoint' | 'bisector' | 'centroid';

	if (type === 'distance') {
		scalarId = figure.createScalarDistance(targetIds[0], targetIds[1]);
		autoPosition = 'midpoint';
	} else if (type === 'angle') {
		scalarId = figure.createScalarAngleMeasure(targetIds[0], targetIds[1], targetIds[2]);
		autoPosition = 'bisector';
	} else {
		scalarId = figure.createScalarArea(targetIds);
		autoPosition = 'centroid';
	}

	const format = type === 'angle' ? ':deg' : ':.2f';
	return figure.createText(`{${scalarId}${format}}`, [scalarId], {
		autoPosition,
		autoTargetIds: targetIds
	});
}
