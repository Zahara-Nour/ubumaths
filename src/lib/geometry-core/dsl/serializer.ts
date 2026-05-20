/**
 * DSL Serializer — converts a Figure back into DSL script text.
 *
 * Elements are serialized in topological order (parents before children).
 * Names come from element labels or are auto-generated.
 */

import type { Figure } from '../graph/figure';
import type { GeoElement } from '../types/elements';
import type { GeoValue, ScalarParam } from '../types/geo-value';
import { isScalarRef } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import type { SymbolTable } from './symbol-table';
import type { DslProgram, DslStatement, DslExpr, DslDirective } from './types';
import type { AngleMode } from './apply-angle-mode';

export interface SerializeOptions {
	/**
	 * Active angle mode at the time of serialization. When `'rad'`, the
	 * serialized output starts with `unite_angle("radians")` so a re-interpret
	 * preserves trig semantics. When `'deg'` or omitted, no prefix is emitted
	 * (the DSL default is degrees).
	 */
	readonly angleMode?: AngleMode;
}

export function serialize(
	figure: Figure,
	symbols?: SymbolTable,
	options?: SerializeOptions
): string {
	const elements = figure.getAllElements();
	const idToName = buildNameMap(elements, symbols);
	const lines: string[] = [];

	// Collect scalar IDs that are internally created by mesure() sugar —
	// these are referenced by auto-positioned text elements and should not be serialized separately.
	const internalScalarIds = new Set<string>();
	for (const el of elements) {
		if (el.type === 'text' && el.autoPosition && el.scalarRefs) {
			for (const ref of el.scalarRefs) internalScalarIds.add(ref);
		}
	}

	// Pair tangentParametric (line) and tangentVector (vector) emitted by the
	// builtin `(d, v) = tangente(c, t0)`. The line is the canonical emitter; the
	// vector is skipped at iteration time and re-fetched during line serialization.
	const tangentGroupVectorByGroupId = new Map<string, string>();
	for (const el of elements) {
		if (el.type === 'tangentVector') {
			tangentGroupVectorByGroupId.set(el.tangentGroupId, el.id);
		}
	}

	// Preserve the active angle mode so a re-interpret of the output behaves
	// identically. Default `'deg'` is omitted to keep round-trip output minimal
	// for the common case.
	if (options?.angleMode === 'rad') {
		lines.push('unite_angle("radians")');
	}

	for (const el of elements) {
		// Skip invisible elements, except transformation objects, named scalars, and sliders
		if (!el.visible && !isTransformationType(el.type) && !isScalarLikeType(el.type)) continue;
		// Skip expression/coordinate scalars (they are implicitly recreated by DSL)
		if (el.type === 'scalar' && (el.scalarKind === 'expression' || el.scalarKind === 'coordinate'))
			continue;
		// Skip scalars that are internally managed by auto-positioned text (mesure() sugar)
		if (el.type === 'scalar' && internalScalarIds.has(el.id)) continue;
		// Skip tangentVector — emitted as part of the paired tangentParametric line.
		if (el.type === 'tangentVector') continue;
		const line = serializeElement(el, figure, idToName, tangentGroupVectorByGroupId);
		if (line) lines.push(line);
	}

	return lines.join('\n');
}

function buildNameMap(elements: readonly GeoElement[], symbols?: SymbolTable): Map<string, string> {
	const map = new Map<string, string>();

	// First pass: use symbol table names if available
	if (symbols) {
		for (const [name, entry] of symbols.allEntries()) {
			if (entry.figureId) {
				map.set(entry.figureId, name);
			}
			// Handle indexed entries (P[0], P[1], ...)
			if (entry.type === 'liste' && entry.list) {
				for (let i = 0; i < entry.list.length; i++) {
					const item = entry.list[i];
					if (item?.figureId) {
						map.set(item.figureId, `${name}[${i}]`);
					}
				}
			}
		}
	}

	// Second pass: use labels for elements without a symbol name
	for (const el of elements) {
		if (!map.has(el.id) && el.label) {
			map.set(el.id, el.label);
		}
	}

	// Third pass: generate names for remaining elements
	const counters: Record<string, number> = {};
	for (const el of elements) {
		if (!map.has(el.id)) {
			const prefix = typePrefix(el.type);
			counters[prefix] = (counters[prefix] ?? 0) + 1;
			map.set(el.id, `_${prefix}${counters[prefix]}`);
		}
	}

	return map;
}

function isTransformationType(type: string): boolean {
	return (
		type === 'rotation' ||
		type === 'reflection' ||
		type === 'reflectionOverLine' ||
		type === 'translation' ||
		type === 'homothety' ||
		type === 'projection' ||
		type === 'affinity' ||
		type === 'inversion' ||
		type === 'composition'
	);
}

function typePrefix(type: string): string {
	switch (type) {
		case 'freePoint':
		case 'midpoint':
		case 'intersectionLL':
		case 'intersectionLC':
		case 'intersectionCC':
		case 'intersectionLQ':
		case 'intersectionQQ':
		case 'intersectionParametric':
		case 'intersectionParametricLine':
		case 'intersectionParametricCircle':
		case 'intersectionParametricFunction':
		case 'intersectionParametricSegment':
		case 'intersectionParametricRay':
		case 'reflectedPoint':
		case 'rotatedPoint':
		case 'translatedPoint':
		case 'dilatedPoint':
		case 'reflectedOverLine':
		case 'projectedPoint':
		case 'affinityPoint':
		case 'invertedPoint':
			return 'pt';
		case 'segment':
			return 'seg';
		case 'line':
			return 'd';
		case 'ray':
			return 'r';
		case 'circleByRadius':
		case 'circleByPoint':
			return 'c';
		case 'arcByAngles':
		case 'arcByPoints':
			return 'arc';
		case 'polygon':
			return 'poly';
		case 'angle':
			return 'ang';
		case 'segmentMark':
			return 'sm';
		case 'text':
			return 'txt';
		case 'mathText':
			return 'mtxt';
		case 'richText':
			return 'rtxt';
		case 'image':
			return 'img';
		case 'function':
		case 'quadraticCurve':
		case 'implicitCurve':
		case 'parametricCurve':
			return 'f';
		case 'pointOnCurve':
		case 'pointOnQuadraticCurve':
		case 'pointOnSegment':
		case 'pointOnLine':
		case 'pointOnCircle':
		case 'pointOnArc':
		case 'pointOnParametricCurve':
			return 'pt';
		case 'locus':
			return 'L';
		case 'trace':
			return 'T';
		case 'tangentLine':
		case 'tangentToQuadratic':
		case 'tangentParametric':
			return 'tg';
		case 'tangentVector':
			return 'v';
		case 'osculatingCircle':
			return 'oc';
		case 'conicPolar':
			return 'pol';
		case 'vectorByPoints':
		case 'freeVector':
		case 'vectorSum':
		case 'vectorScaled':
		case 'vectorNegate':
			return 'v';
		case 'rotation':
		case 'reflection':
		case 'reflectionOverLine':
		case 'translation':
		case 'homothety':
		case 'projection':
		case 'affinity':
		case 'inversion':
		case 'composition':
			return 't';
		default:
			return 'el';
	}
}

function name(idToName: Map<string, string>, id: string): string {
	return idToName.get(id) ?? id;
}

function fmtNum(n: number): string {
	const r = Math.round(n * 10000) / 10000;
	return String(r);
}

function fmtGeoValue(v: GeoValue): string {
	return fmtNum(geoToNumber(v));
}

/** Format a ScalarParam: scalar refs become names, GeoValues become numbers. */
function fmtScalarParam(param: ScalarParam, idToName: Map<string, string>): string {
	if (isScalarRef(param)) return name(idToName, param.scalarRef);
	return fmtGeoValue(param);
}

/** Format a ScalarParam that stores radians, converting back to degrees for DSL. */
function fmtScalarParamDeg(param: ScalarParam, idToName: Map<string, string>): string {
	if (isScalarRef(param)) return name(idToName, param.scalarRef);
	return fmtNum((geoToNumber(param) * 180) / Math.PI);
}

/**
 * Format a ScalarParam, resolving coordinate scalars to `A.x`/`A.y` syntax.
 */
function fmtPointScalarParam(
	param: ScalarParam,
	idToName: Map<string, string>,
	figure: Figure
): string {
	if (isScalarRef(param)) {
		const el = figure.getElementById(param.scalarRef);
		if (el && el.type === 'scalar' && el.scalarKind === 'coordinate') {
			const pointName = name(idToName, el.targetIds[0]);
			return `${pointName}.${el.coordinateAxis}`;
		}
		return name(idToName, param.scalarRef);
	}
	return fmtGeoValue(param);
}

function isScalarLikeType(type: string): boolean {
	return type === 'scalar' || type === 'slider';
}

function serializeElement(
	el: GeoElement,
	figure: Figure,
	idToName: Map<string, string>,
	tangentGroupVectorByGroupId?: ReadonlyMap<string, string>
): string | null {
	const n = name(idToName, el.id);

	// Check if this element was created by transforme() — emit transforme(r, source) form
	const origin = figure.getTransformeOrigin(el.id);
	if (origin) {
		return `${n} = transforme(${name(idToName, origin.transformId)}, ${name(idToName, origin.sourceId)})`;
	}

	switch (el.type) {
		case 'freePoint': {
			const x = fmtGeoValue(el.position.x);
			const y = fmtGeoValue(el.position.y);
			return `${n} = point(${x}, ${y})`;
		}

		case 'computedPoint': {
			const x = fmtPointScalarParam(el.xParam, idToName, figure);
			const y = fmtPointScalarParam(el.yParam, idToName, figure);
			return `${n} = point(${x}, ${y})`;
		}

		case 'midpoint':
			return `${n} = milieu(${name(idToName, el.point1Id)}, ${name(idToName, el.point2Id)})`;

		case 'intersectionLL':
			return `${n} = intersection(${name(idToName, el.line1Id)}, ${name(idToName, el.line2Id)})`;

		case 'intersectionLC':
			return `${n} = intersection(${name(idToName, el.lineId)}, ${name(idToName, el.circleId)}, ${el.index + 1})`;

		case 'intersectionCC':
			return `${n} = intersection(${name(idToName, el.circle1Id)}, ${name(idToName, el.circle2Id)}, ${el.index + 1})`;

		case 'intersectionLQ':
			return `${n} = intersection(${name(idToName, el.lineId)}, ${name(idToName, el.curveId)}, ${el.index + 1})`;

		case 'intersectionQQ':
			return `${n} = intersection(${name(idToName, el.curve1Id)}, ${name(idToName, el.curve2Id)}, ${el.index + 1})`;

		case 'intersectionLF':
			return `${n} = intersection(${name(idToName, el.lineId)}, ${name(idToName, el.functionId)}, ${el.index + 1})`;

		case 'intersectionFF':
			return `${n} = intersection(${name(idToName, el.function1Id)}, ${name(idToName, el.function2Id)}, ${el.index + 1})`;

		case 'intersectionParametric': {
			const c1 = name(idToName, el.curve1Id);
			const c2 = name(idToName, el.curve2Id);
			// k=1 is the default — emit `intersection(c1, c2)` for cleanliness.
			if (el.k === 1) return `${n} = intersection(${c1}, ${c2})`;
			return `${n} = intersection(${c1}, ${c2}, ${el.k})`;
		}

		case 'intersectionParametricLine': {
			const c = name(idToName, el.curveId);
			const d = name(idToName, el.lineId);
			// Canonical order: parametric curve first.
			if (el.k === 1) return `${n} = intersection(${c}, ${d})`;
			return `${n} = intersection(${c}, ${d}, ${el.k})`;
		}

		case 'intersectionParametricCircle': {
			const c = name(idToName, el.curveId);
			const circ = name(idToName, el.circleId);
			if (el.k === 1) return `${n} = intersection(${c}, ${circ})`;
			return `${n} = intersection(${c}, ${circ}, ${el.k})`;
		}

		case 'intersectionParametricFunction': {
			const c = name(idToName, el.curveId);
			const f = name(idToName, el.functionId);
			if (el.k === 1) return `${n} = intersection(${c}, ${f})`;
			return `${n} = intersection(${c}, ${f}, ${el.k})`;
		}

		case 'intersectionParametricSegment': {
			const c = name(idToName, el.curveId);
			const s = name(idToName, el.segmentId);
			// Canonical order: parametric curve first.
			if (el.k === 1) return `${n} = intersection(${c}, ${s})`;
			return `${n} = intersection(${c}, ${s}, ${el.k})`;
		}

		case 'intersectionParametricRay': {
			const c = name(idToName, el.curveId);
			const r = name(idToName, el.rayId);
			// Canonical order: parametric curve first.
			if (el.k === 1) return `${n} = intersection(${c}, ${r})`;
			return `${n} = intersection(${c}, ${r}, ${el.k})`;
		}

		case 'reflectedPoint':
			return `${n} = symetrie(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)})`;

		case 'rotatedPoint': {
			const angleDeg = fmtScalarParamDeg(el.angle, idToName);
			return `${n} = rotation(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)}, angle=${angleDeg})`;
		}

		case 'translatedPoint':
			// If constructed via a vector element, serialize as vecteur=vectorName
			if (el.vectorId)
				return `${n} = translation(${name(idToName, el.sourceId)}, vecteur=${name(idToName, el.vectorId)})`;
			return `${n} = translation(${name(idToName, el.sourceId)}, vecteur=(${name(idToName, el.vectorStartId)}, ${name(idToName, el.vectorEndId)}))`;

		case 'dilatedPoint': {
			const factor = fmtScalarParam(el.factor, idToName);
			return `${n} = homothetie(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)}, rapport=${factor})`;
		}

		case 'reflectedOverLine':
			return `${n} = symetrie(${name(idToName, el.sourceId)}, axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}))`;

		case 'projectedPoint':
			return `${n} = projection(${name(idToName, el.sourceId)}, axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}))`;

		case 'affinityPoint': {
			const affPtFactor = fmtGeoValue(el.factor);
			return `${n} = affinite(${name(idToName, el.sourceId)}, axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}), rapport=${affPtFactor})`;
		}

		case 'invertedPoint': {
			const invPtRadius = fmtGeoValue(el.radius);
			return `${n} = inversion(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)}, rayon=${invPtRadius})`;
		}

		case 'segment':
			return `${n.startsWith('_') ? '' : n + ' = '}segment(${name(idToName, el.startId)}, ${name(idToName, el.endId)})`;

		case 'line':
			return `${n.startsWith('_') ? '' : n + ' = '}droite(${name(idToName, el.point1Id)}, ${name(idToName, el.point2Id)})`;

		case 'ray':
			return `${n.startsWith('_') ? '' : n + ' = '}demidroite(${name(idToName, el.originId)}, ${name(idToName, el.throughId)})`;

		case 'vectorByPoints':
			return `${n.startsWith('_') ? '' : n + ' = '}vecteur(${name(idToName, el.startId)}, ${name(idToName, el.endId)})`;

		case 'freeVector': {
			const prefix = n.startsWith('_') ? '' : n + ' = ';
			const base = `vecteur(${fmtGeoValue(el.dx)}, ${fmtGeoValue(el.dy)}`;
			// Serialize anchor position when non-default (not at origin)
			const ax = geoToNumber(el.anchorX);
			const ay = geoToNumber(el.anchorY);
			if (Math.abs(ax) > 1e-12 || Math.abs(ay) > 1e-12) {
				return `${prefix}${base}, ancre=(${fmtNum(ax)}, ${fmtNum(ay)}))`;
			}
			return `${prefix}${base})`;
		}

		case 'vectorSum':
			return `${n} = ${name(idToName, el.vector1Id)} ${el.negate ? '-' : '+'} ${name(idToName, el.vector2Id)}`;

		case 'vectorScaled':
			return `${n} = ${fmtGeoValue(el.factor)} * ${name(idToName, el.vectorId)}`;

		case 'vectorNegate':
			return `${n} = -${name(idToName, el.vectorId)}`;

		case 'circleByRadius': {
			const radius = fmtScalarParam(el.radius, idToName);
			return `${n.startsWith('_') ? '' : n + ' = '}cercle(${name(idToName, el.centerId)}, rayon=${radius})`;
		}

		case 'circleByPoint':
			return `${n.startsWith('_') ? '' : n + ' = '}cercle(${name(idToName, el.centerId)}, passant=${name(idToName, el.edgePointId)})`;

		case 'arcByAngles': {
			const radius = fmtScalarParam(el.radius, idToName);
			const startDeg = fmtScalarParamDeg(el.startAngle, idToName);
			const endDeg = fmtScalarParamDeg(el.endAngle, idToName);
			return `${n.startsWith('_') ? '' : n + ' = '}arc(${name(idToName, el.centerId)}, rayon=${radius}, debut=${startDeg}, fin=${endDeg})`;
		}

		case 'arcByPoints':
			return `${n.startsWith('_') ? '' : n + ' = '}arc(${name(idToName, el.startId)}, ${name(idToName, el.centerId)}, ${name(idToName, el.endId)})`;

		case 'angle': {
			const head = `${n.startsWith('_') ? '' : n + ' = '}angle(${name(idToName, el.p1Id)}, ${name(idToName, el.vertexId)}, ${name(idToName, el.p2Id)}`;
			const extras: string[] = [];
			if (el.marque && el.marque !== 'arc') extras.push(`marque="${el.marque}"`);
			if (el.orientation && el.orientation !== 'auto')
				extras.push(`orientation="${el.orientation}"`);
			if (el.kind && el.kind !== 'saillant') extras.push(`kind="${el.kind}"`);
			if (el.showLabel && el.showLabel !== 'aucun') extras.push(`showLabel="${el.showLabel}"`);
			if (el.unite && el.unite !== 'rad') extras.push(`unite="${el.unite}"`);
			if (el.arcRadiusPx !== undefined) extras.push(`arcRadiusPx=${el.arcRadiusPx}`);
			const extraStr = extras.length > 0 ? ', ' + extras.join(', ') : '';
			return `${head}${extraStr})`;
		}

		case 'segmentMark': {
			const ticksPart = el.markCount > 1 ? `, traits=${el.markCount}` : '';
			return `marque_segment(${name(idToName, el.startId)}, ${name(idToName, el.endId)}${ticksPart})`;
		}

		case 'text': {
			if (el.autoPosition && el.autoTargetIds) {
				// Auto-positioned text (created by mesure()) — serialize as mesure()
				const targets = el.autoTargetIds.map((id) => name(idToName, id)).join(', ');
				return `mesure(${targets})`;
			}
			if (el.anchorId) {
				const anchor = name(idToName, el.anchorId);
				const offset = el.anchorOffset
					? `, dx=${el.anchorOffset.dx}, dy=${el.anchorOffset.dy}`
					: '';
				return `texte(${anchor}, "${el.template}"${offset})`;
			}
			if (el.position) {
				return `texte(${el.position.x}, ${el.position.y}, "${el.template}")`;
			}
			return `texte(0, 0, "${el.template}")`;
		}

		case 'mathText': {
			if (el.anchorId) {
				const anchor = name(idToName, el.anchorId);
				const offset = el.anchorOffset
					? `, dx=${el.anchorOffset.dx}, dy=${el.anchorOffset.dy}`
					: '';
				return `mtexte(${anchor}, "${el.template}"${offset})`;
			}
			if (el.position) {
				return `mtexte(${el.position.x}, ${el.position.y}, "${el.template}")`;
			}
			return `mtexte(0, 0, "${el.template}")`;
		}

		case 'richText': {
			if (el.anchorId) {
				const anchor = name(idToName, el.anchorId);
				const offset = el.anchorOffset
					? `, dx=${el.anchorOffset.dx}, dy=${el.anchorOffset.dy}`
					: '';
				return `rtexte(${anchor}, "${el.template}"${offset})`;
			}
			if (el.position) {
				return `rtexte(${el.position.x}, ${el.position.y}, "${el.template}")`;
			}
			return `rtexte(0, 0, "${el.template}")`;
		}

		case 'image': {
			const heightPart = el.height !== undefined ? `, hauteur=${fmtNum(el.height)}` : '';
			const layerPart = el.layer === 'fond' ? `, couche="fond"` : '';
			const rotPart = el.rotation ? `, rotation=${fmtNum(el.rotation)}` : '';
			const flipPart = el.flipped ? `, miroir="vrai"` : '';
			const visualPart = `${rotPart}${flipPart}`;
			if (el.point1Id && el.point2Id) {
				const p1 = name(idToName, el.point1Id);
				const p2 = name(idToName, el.point2Id);
				return `image("${el.url}", ${p1}, ${p2}${layerPart}${visualPart})`;
			}
			if (el.anchorId) {
				const anchor = name(idToName, el.anchorId);
				const offset = el.anchorOffset
					? `, dx=${fmtNum(el.anchorOffset.dx)}, dy=${fmtNum(el.anchorOffset.dy)}`
					: '';
				return `image("${el.url}", ${anchor}, largeur=${fmtNum(el.width)}${heightPart}${offset}${layerPart}${visualPart})`;
			}
			if (el.position) {
				return `image("${el.url}", ${fmtNum(el.position.x)}, ${fmtNum(el.position.y)}, largeur=${fmtNum(el.width)}${heightPart}${layerPart}${visualPart})`;
			}
			return `image("${el.url}", 0, 0, largeur=${fmtNum(el.width)}${heightPart}${layerPart}${visualPart})`;
		}

		case 'polygon': {
			const verts = el.dependsOn.map((id) => name(idToName, id)).join(', ');
			return `# polygone(${verts})`;
		}

		case 'function':
		case 'quadraticCurve':
		case 'implicitCurve':
			return `${n.startsWith('_') ? '' : n + ' = '}courbe("${el.equation}")`;

		case 'parametricCurve': {
			const tMinStr = fmtScalarParam(el.tMin, idToName);
			const tMaxStr = fmtScalarParam(el.tMax, idToName);
			const prefix = n.startsWith('_') ? '' : n + ' = ';
			// Polar curves are serialized as a single `r = f(theta)` call with
			// theta_min/theta_max bounds — round-trips through the polar branch.
			if (el.polar === true && el.equationR !== undefined) {
				return `${prefix}courbe("r = ${el.equationR}", theta_min=${tMinStr}, theta_max=${tMaxStr})`;
			}
			const paramPart = el.parameter !== 't' ? `, param="${el.parameter}"` : '';
			return `${prefix}courbe("${el.equationX}", "${el.equationY}", t_min=${tMinStr}, t_max=${tMaxStr}${paramPart})`;
		}

		case 'pointOnCurve':
			return `${n} = point_sur(${name(idToName, el.functionId)}, ${fmtGeoValue(el.x0)})`;

		case 'pointOnQuadraticCurve': {
			// Reverse the degree→radian conversion done at creation time for circle/ellipse
			const curveEl = figure.getElementById(el.curveId);
			let tDisplay = el.t;
			if (curveEl && curveEl.type === 'quadraticCurve') {
				const ct = curveEl.conic.type;
				if (ct === 'circle' || ct === 'ellipse') {
					tDisplay = (el.t * 180) / Math.PI;
				}
			}
			return `${n} = point_sur(${name(idToName, el.curveId)}, ${fmtNum(tDisplay)})`;
		}

		case 'pointOnSegment':
			return `${n} = point_sur(${name(idToName, el.segmentId)}, ${fmtNum(el.t)})`;

		case 'pointOnLine':
			return `${n} = point_sur(${name(idToName, el.lineId)}, ${fmtNum(el.t)})`;

		case 'pointOnCircle': {
			// Reverse radians → degrees for display (same convention as conics)
			const angleDeg = (el.theta * 180) / Math.PI;
			return `${n} = point_sur(${name(idToName, el.circleId)}, ${fmtNum(angleDeg)})`;
		}

		case 'pointOnArc':
			return `${n} = point_sur(${name(idToName, el.arcId)}, ${fmtNum(el.t)})`;

		case 'pointOnParametricCurve': {
			const tStr = fmtScalarParam(el.t, idToName);
			return `${n} = point_sur(${name(idToName, el.parametricCurveId)}, ${tStr})`;
		}

		case 'locus':
			return `${n} = lieu(${name(idToName, el.tracerId)}, ${name(idToName, el.driverId)})`;

		case 'trace':
			return `${n} = trace(${name(idToName, el.trackedPointId)})`;

		case 'tangentLine':
			if (el.pointOnCurveId) {
				return `${n} = tangente(${name(idToName, el.functionId)}, ${name(idToName, el.pointOnCurveId)})`;
			}
			return `${n} = tangente(${name(idToName, el.functionId)}, ${fmtGeoValue(el.x0!)})`;

		case 'tangentParametric': {
			// Emit `(d, v) = tangente(c, t0)` — the companion vector name is looked
			// up via the shared tangentGroupId. If for some reason the vector is
			// missing (corrupted figure / direct construction), fall back to a
			// single-name form using the line name only.
			const vectorId = tangentGroupVectorByGroupId?.get(el.tangentGroupId);
			const lineName = n;
			const vectorName = vectorId ? name(idToName, vectorId) : `${n}_v`;
			const curveName = name(idToName, el.parametricCurveId);
			const tStr = fmtScalarParam(el.t, idToName);
			return `(${lineName}, ${vectorName}) = tangente(${curveName}, ${tStr})`;
		}

		case 'tangentVector':
			// Normally never serialized directly — emitted via the paired tangentParametric.
			return null;

		case 'tangentToQuadratic': {
			if (el.pointOnCurveId) {
				return `${n} = tangente(${name(idToName, el.curveId)}, ${name(idToName, el.pointOnCurveId)})`;
			}
			// Reverse degree→radian for display
			const tqCurveEl = figure.getElementById(el.curveId);
			let tqDisplay = el.t!;
			if (tqCurveEl && tqCurveEl.type === 'quadraticCurve') {
				const ct = tqCurveEl.conic.type;
				if (ct === 'circle' || ct === 'ellipse') {
					tqDisplay = (el.t! * 180) / Math.PI;
				}
			}
			return `${n} = tangente(${name(idToName, el.curveId)}, ${fmtNum(tqDisplay)})`;
		}

		case 'conicPolar':
			return `${n} = polaire(${name(idToName, el.pointId)}, ${name(idToName, el.curveId)})`;

		// Transformation objects
		case 'rotation': {
			const angleDeg = fmtScalarParamDeg(el.angle, idToName);
			return `${n} = rotation(angle=${angleDeg}, centre=${name(idToName, el.centerId)})`;
		}

		case 'reflection':
			return `${n} = symetrie(centre=${name(idToName, el.centerId)})`;

		case 'reflectionOverLine':
			return `${n} = symetrie(axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}))`;

		case 'translation':
			if (el.vectorId) return `${n} = translation(vecteur=${name(idToName, el.vectorId)})`;
			return `${n} = translation(vecteur=(${name(idToName, el.vectorStartId)}, ${name(idToName, el.vectorEndId)}))`;

		case 'homothety': {
			const factor = fmtScalarParam(el.factor, idToName);
			return `${n} = homothetie(rapport=${factor}, centre=${name(idToName, el.centerId)})`;
		}

		case 'projection':
			return `${n} = projection(axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}))`;

		case 'affinity': {
			const affFactor = fmtGeoValue(el.factor);
			return `${n} = affinite(axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}), rapport=${affFactor})`;
		}

		case 'inversion': {
			const invRadius = fmtGeoValue(el.radius);
			return `${n} = inversion(centre=${name(idToName, el.centerId)}, rayon=${invRadius})`;
		}

		case 'composition': {
			if (el.sourceBuiltin?.name === 'similitude') {
				const angleDeg = fmtScalarParamDeg(el.sourceBuiltin.params.angle, idToName);
				const rapport = fmtScalarParam(el.sourceBuiltin.params.rapport, idToName);
				const centerName = name(idToName, el.sourceBuiltin.params.centerId);
				return `${n} = similitude(angle=${angleDeg}, rapport=${rapport}, centre=${centerName})`;
			}
			const args = el.transformationIds.map((id) => name(idToName, id)).join(', ');
			return `${n} = compose(${args})`;
		}

		case 'scalar': {
			switch (el.scalarKind) {
				case 'distance':
				case 'distance_point_line':
					return `${n} = distance(${name(idToName, el.targetIds[0])}, ${name(idToName, el.targetIds[1])})`;
				case 'polar_angle':
					return `${n} = angle_polaire(${name(idToName, el.targetIds[0])}, ${name(idToName, el.targetIds[1])})`;
				case 'angle_measure': {
					const suffix = el.unite === 'deg' ? ', unite="deg"' : '';
					// B5 — if this scalar was derived from a named GeoAngle (i.e. user wrote
					// `α = angle(A, V, B); m = mesure(α)`), emit `mesure(α)` to preserve the
					// explicit link on roundtrip. Hidden angles (created by `mesure(A, V, B)`
					// direct via `createHiddenAngleFor`) have an auto-generated name starting
					// with `_` and fall back to the 3-points form.
					const ownerAngle = figure.findAngleByMeasureScalarId(el.id);
					if (ownerAngle) {
						const angleName = idToName.get(ownerAngle.id);
						if (angleName && !angleName.startsWith('_')) {
							return `${n} = mesure(${angleName}${suffix})`;
						}
					}
					const aN = name(idToName, el.targetIds[0]);
					const vN = name(idToName, el.targetIds[1]);
					const bN = name(idToName, el.targetIds[2]);
					return `${n} = mesure(${aN}, ${vN}, ${bN}${suffix})`;
				}
				case 'vectors_angle_measure': {
					const u1 = name(idToName, el.targetIds[0]);
					const u2 = name(idToName, el.targetIds[1]);
					const suffix = el.unite === 'deg' ? ', unite="deg"' : '';
					return `${n} = mesure(${u1}, ${u2}${suffix})`;
				}
				case 'norme':
					return `${n} = norme(${name(idToName, el.targetIds[0])})`;
				case 'area': {
					const targets = el.targetIds.map((id) => name(idToName, id)).join(', ');
					return `${n} = aire(${targets})`;
				}
				case 'perimeter': {
					const targets = el.targetIds.map((id) => name(idToName, id)).join(', ');
					return `${n} = perimetre(${targets})`;
				}
				case 'slope':
					return `${n} = pente(${name(idToName, el.targetIds[0])})`;
				case 'radius':
					return `${n} = rayon(${name(idToName, el.targetIds[0])})`;
				case 'arcLength': {
					if (!el.curveId) return null;
					const curveName = name(idToName, el.curveId);
					if (el.tMin === undefined || el.tMax === undefined) {
						return `${n} = longueur(${curveName})`;
					}
					const t1 = fmtScalarParam(el.tMin, idToName);
					const t2 = fmtScalarParam(el.tMax, idToName);
					return `${n} = longueur(${curveName}, ${t1}, ${t2})`;
				}
				case 'curvature': {
					if (!el.curveId || el.t === undefined) return null;
					const curveName = name(idToName, el.curveId);
					const tStr = fmtScalarParam(el.t, idToName);
					return `${n} = courbure(${curveName}, ${tStr})`;
				}
				default:
					// expression scalars are skipped by the filter above
					return null;
			}
		}

		case 'osculatingCircle': {
			const curveName = name(idToName, el.curveId);
			const tStr = fmtScalarParam(el.t, idToName);
			return `${n} = cercle_osculateur(${curveName}, ${tStr})`;
		}

		case 'slider': {
			const parts = [
				`min=${fmtNum(el.min)}`,
				`max=${fmtNum(el.max)}`,
				`valeur=${fmtNum(el.value)}`
			];
			if (el.step !== undefined) parts.push(`pas=${fmtNum(el.step)}`);
			return `${n} = slider(${parts.join(', ')})`;
		}

		default:
			return null;
	}
}

// ─── Program serializer (AST → text, preserves directives) ───

export function serializeProgram(program: DslProgram): string {
	return program.statements.map(serializeStatement).join('\n');
}

function serializeStatement(stmt: DslStatement): string {
	switch (stmt.kind) {
		case 'directive':
			return serializeDirective(stmt);
		case 'assignment':
			return `${stmt.name} = ${serializeExpr(stmt.value)}`;
		case 'exprStatement':
			return serializeExpr(stmt.expr);
		case 'macroDef': {
			const params = stmt.params
				.map((p) => (p.defaultValue ? `${p.name}=${serializeExpr(p.defaultValue)}` : p.name))
				.join(', ');
			const body = stmt.body
				.map(serializeStatement)
				.map((l) => `    ${l}`)
				.join('\n');
			return `macro ${stmt.name}(${params}):\n${body}`;
		}
		case 'forRange': {
			const body = stmt.body
				.map(serializeStatement)
				.map((l) => `    ${l}`)
				.join('\n');
			return `pour ${stmt.variable} de ${serializeExpr(stmt.from)} a ${serializeExpr(stmt.to)}:\n${body}`;
		}
		case 'forIn': {
			const body = stmt.body
				.map(serializeStatement)
				.map((l) => `    ${l}`)
				.join('\n');
			return `pour ${stmt.variable} dans ${serializeExpr(stmt.iterable)}:\n${body}`;
		}
		case 'if': {
			const body = stmt.body
				.map(serializeStatement)
				.map((l) => `    ${l}`)
				.join('\n');
			let result = `si ${serializeExpr(stmt.condition)}:\n${body}`;
			if (stmt.elseBody) {
				const elseBody = stmt.elseBody
					.map(serializeStatement)
					.map((l) => `    ${l}`)
					.join('\n');
				result += `\nsinon:\n${elseBody}`;
			}
			return result;
		}
		case 'return':
			return `retourne ${serializeExpr(stmt.value)}`;
		case 'indexedAssignment':
			return `${stmt.name}[${serializeExpr(stmt.index)}] = ${serializeExpr(stmt.value)}`;
		case 'destructuring':
			return `(${stmt.names.join(', ')}) = ${serializeExpr(stmt.value)}`;
	}
}

function serializeDirective(d: DslDirective): string {
	if (d.args.length === 0 && d.namedArgs.size === 0) {
		return `@${d.name}`;
	}
	const parts: string[] = d.args.map(serializeExpr);
	for (const [key, value] of d.namedArgs) {
		parts.push(`${key}=${serializeExpr(value)}`);
	}
	return `@${d.name}(${parts.join(', ')})`;
}

function serializeExpr(expr: DslExpr): string {
	switch (expr.kind) {
		case 'number':
			return fmtNum(expr.value);
		case 'string':
			return `"${expr.value}"`;
		case 'bool':
			return expr.value ? 'vrai' : 'faux';
		case 'identifier':
			return expr.name;
		case 'indexedAccess':
			return `${expr.name}[${serializeExpr(expr.index)}]`;
		case 'propertyAccess':
			return `${expr.object}.${expr.property}`;
		case 'binary':
			return `${serializeExpr(expr.left)} ${expr.op} ${serializeExpr(expr.right)}`;
		case 'unary': {
			const sep = expr.op === 'non' ? ' ' : '';
			return `${expr.op}${sep}${serializeExpr(expr.operand)}`;
		}
		case 'call': {
			const args = expr.args.map(serializeExpr);
			for (const [key, value] of expr.namedArgs) {
				args.push(`${key}=${serializeExpr(value)}`);
			}
			return `${expr.name}(${args.join(', ')})`;
		}
		case 'tuple':
			return `(${expr.elements.map(serializeExpr).join(', ')})`;
		case 'list':
			return `[${expr.elements.map(serializeExpr).join(', ')}]`;
	}
}
