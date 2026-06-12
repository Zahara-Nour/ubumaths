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
		// unite:'deg' so the scalar value is in degrees (90), matching the ':deg'
		// text format below. The figure default is now 'rad' (GeoAngle saga), so
		// without this the value would be π/2 and render as "1.6°".
		scalarId = figure.createScalarAngleMeasure(targetIds[0], targetIds[1], targetIds[2], {
			unite: 'deg'
		});
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
