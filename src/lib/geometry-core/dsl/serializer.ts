/**
 * DSL Serializer — converts a Figure back into DSL script text.
 *
 * Elements are serialized in topological order (parents before children).
 * Names come from element labels or are auto-generated.
 */

import type { Figure } from '../graph/figure';
import type { GeoElement } from '../types/elements';
import type { GeoValue } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import type { SymbolTable } from './symbol-table';
import type { DslProgram, DslStatement, DslExpr, DslDirective } from './types';

export function serialize(figure: Figure, symbols?: SymbolTable): string {
	const elements = figure.getAllElements();
	const idToName = buildNameMap(elements, symbols);
	const lines: string[] = [];

	for (const el of elements) {
		if (!el.visible) continue;
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

function typePrefix(type: string): string {
	switch (type) {
		case 'freePoint':
		case 'midpoint':
		case 'intersectionLL':
		case 'reflectedPoint':
		case 'rotatedPoint':
		case 'translatedPoint':
		case 'dilatedPoint':
		case 'reflectedOverLine':
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
		case 'measure':
			return 'mes';
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

function serializeElement(
	el: GeoElement,
	figure: Figure,
	idToName: Map<string, string>
): string | null {
	const n = name(idToName, el.id);

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

		case 'reflectedPoint':
			return `${n} = symetrie(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)})`;

		case 'rotatedPoint': {
			const angleDeg = fmtNum((geoToNumber(el.angle) * 180) / Math.PI);
			return `${n} = rotation(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)}, angle=${angleDeg})`;
		}

		case 'translatedPoint':
			return `${n} = translation(${name(idToName, el.sourceId)}, vecteur=(${name(idToName, el.vectorStartId)}, ${name(idToName, el.vectorEndId)}))`;

		case 'dilatedPoint': {
			const factor = fmtGeoValue(el.factor);
			return `${n} = homothetie(${name(idToName, el.sourceId)}, centre=${name(idToName, el.centerId)}, rapport=${factor})`;
		}

		case 'reflectedOverLine':
			return `${n} = symetrie(${name(idToName, el.sourceId)}, axe=(${name(idToName, el.linePoint1Id)}, ${name(idToName, el.linePoint2Id)}))`;

		case 'segment':
			return `${n.startsWith('_') ? '' : n + ' = '}segment(${name(idToName, el.startId)}, ${name(idToName, el.endId)})`;

		case 'line':
			return `${n.startsWith('_') ? '' : n + ' = '}droite(${name(idToName, el.point1Id)}, ${name(idToName, el.point2Id)})`;

		case 'ray':
			return `${n.startsWith('_') ? '' : n + ' = '}demidroite(${name(idToName, el.originId)}, ${name(idToName, el.throughId)})`;

		case 'circleByRadius': {
			const radius = fmtGeoValue(el.radius);
			return `${n.startsWith('_') ? '' : n + ' = '}cercle(${name(idToName, el.centerId)}, rayon=${radius})`;
		}

		case 'circleByPoint':
			return `${n.startsWith('_') ? '' : n + ' = '}cercle(${name(idToName, el.centerId)}, passant=${name(idToName, el.edgePointId)})`;

		case 'arcByAngles': {
			const radius = fmtGeoValue(el.radius);
			const startDeg = fmtNum((geoToNumber(el.startAngle) * 180) / Math.PI);
			const endDeg = fmtNum((geoToNumber(el.endAngle) * 180) / Math.PI);
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

		case 'measure': {
			const targets = el.targetIds.map((id) => name(idToName, id)).join(', ');
			return `mesure(${targets})`;
		}

		case 'polygon': {
			const verts = el.dependsOn.map((id) => name(idToName, id)).join(', ');
			return `# polygone(${verts})`;
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
