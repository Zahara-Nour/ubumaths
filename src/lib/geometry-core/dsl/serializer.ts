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

export function serialize(figure: Figure, symbols?: SymbolTable): string {
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

	for (const el of elements) {
		// Skip invisible elements, except transformation objects, named scalars, and sliders
		if (!el.visible && !isTransformationType(el.type) && !isScalarLikeType(el.type)) continue;
		// Skip expression scalars (they are implicitly recreated by DSL arithmetic)
		if (el.type === 'scalar' && el.scalarKind === 'expression') continue;
		// Skip scalars that are internally managed by auto-positioned text (mesure() sugar)
		if (el.type === 'scalar' && internalScalarIds.has(el.id)) continue;
		const line = serializeElement(el, figure, idToName);
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
		case 'angleMark':
			return 'am';
		case 'segmentMark':
			return 'sm';
		case 'text':
			return 'txt';
		case 'mathText':
			return 'mtxt';
		case 'richText':
			return 'rtxt';
		case 'function':
		case 'quadraticCurve':
		case 'implicitCurve':
			return 'f';
		case 'pointOnCurve':
		case 'pointOnQuadraticCurve':
		case 'pointOnSegment':
		case 'pointOnLine':
		case 'pointOnCircle':
		case 'pointOnArc':
			return 'pt';
		case 'locus':
			return 'L';
		case 'trace':
			return 'T';
		case 'tangentLine':
		case 'tangentToQuadratic':
			return 'tg';
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

function isScalarLikeType(type: string): boolean {
	return type === 'scalar' || type === 'slider';
}

function serializeElement(
	el: GeoElement,
	figure: Figure,
	idToName: Map<string, string>
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

		case 'angleMark': {
			if (el.rightAngle) {
				return `angle_droit(${name(idToName, el.p1Id)}, ${name(idToName, el.vertexId)}, ${name(idToName, el.p2Id)})`;
			}
			const arcsPart = el.arcCount > 1 ? `, arcs=${el.arcCount}` : '';
			return `marque_angle(${name(idToName, el.p1Id)}, ${name(idToName, el.vertexId)}, ${name(idToName, el.p2Id)}${arcsPart})`;
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

		case 'polygon': {
			const verts = el.dependsOn.map((id) => name(idToName, id)).join(', ');
			return `# polygone(${verts})`;
		}

		case 'function':
		case 'quadraticCurve':
		case 'implicitCurve':
			return `${n.startsWith('_') ? '' : n + ' = '}courbe("${el.equation}")`;

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

		case 'locus':
			return `${n} = lieu(${name(idToName, el.tracerId)}, ${name(idToName, el.driverId)})`;

		case 'trace':
			return `${n} = trace(${name(idToName, el.trackedPointId)})`;

		case 'tangentLine':
			if (el.pointOnCurveId) {
				return `${n} = tangente(${name(idToName, el.functionId)}, ${name(idToName, el.pointOnCurveId)})`;
			}
			return `${n} = tangente(${name(idToName, el.functionId)}, ${fmtGeoValue(el.x0!)})`;

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
				case 'angle':
					return `${n} = angle(${name(idToName, el.targetIds[0])}, ${name(idToName, el.targetIds[1])}, ${name(idToName, el.targetIds[2])})`;
				case 'polar_angle':
					return `${n} = angle(${name(idToName, el.targetIds[0])}, ${name(idToName, el.targetIds[1])})`;
				case 'norme':
					return `${n} = norme(${name(idToName, el.targetIds[0])})`;
				case 'area': {
					const targets = el.targetIds.map((id) => name(idToName, id)).join(', ');
					return `${n} = aire(${targets})`;
				}
				default:
					// expression scalars are skipped by the filter above
					return null;
			}
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
