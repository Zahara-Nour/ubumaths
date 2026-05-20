/**
 * Migration script: convert existing JSON constructions to DSL format.
 *
 * The old JSON format uses { type: "action", action: { kind: "moveTo", ... } }
 * and { type: "create", object: { kind: "point", ... } } steps.
 *
 * This script converts them to geometry DSL with @ directives.
 *
 * Usage: npx tsx scripts/migrate-constructions-to-dsl.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

import 'dotenv/config';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'https://aqtijumsgfufoztohdua.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
	console.error('SUPABASE_SERVICE_ROLE_KEY is required in .env');
	process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

interface OldStep {
	type?: string;
	action?: {
		kind: string;
		target?: string;
		x?: number;
		y?: number;
		to?: { x: number; y: number };
		from?: { x: number; y: number };
		duration?: number;
		createObject?: { id: string; style?: Record<string, unknown> };
		angle?: number;
		toward?: string;
		radius?: number;
		sweep?: number;
		startAngle?: number;
	};
	object?: {
		kind: string;
		id: string;
		x?: number;
		y?: number;
		content?: string;
		label?: string;
		points?: string;
		point1?: string;
		point2?: string;
		startPoint?: string;
		endPoint?: string;
		from?: { x: number; y: number };
		to?: { x: number; y: number };
		through?: { x: number; y: number };
		style?: Record<string, unknown>;
		fontSize?: number;
		p1?: string;
		p2?: string;
		vertex?: string;
		arcCount?: number;
	};
	pause?: number;
}

interface Construction {
	id: string;
	title: string;
	format: string;
	script: {
		version: number;
		title?: string;
		description?: string;
		canvas?: { width: number; height: number };
		steps: OldStep[];
	};
}

/** Convert pixel coords to math coords (y-flip, scale to units). */
function toMath(px: number, py: number, canvasW: number, canvasH: number, ppu: number) {
	return {
		x: Math.round(((px - canvasW / 2) / ppu) * 100) / 100,
		y: Math.round(((canvasH / 2 - py) / ppu) * 100) / 100
	};
}

/** Convert old JSON steps to DSL text. */
function convertJsonToDsl(title: string, steps: OldStep[], canvasW = 800, canvasH = 600): string {
	const ppu = 40; // pixels per unit — matches GeometryCanvas default
	const lines: string[] = [`# ${title}`];
	const pointNames = new Map<string, string>(); // object id → DSL name
	const labelTexts = new Set<string>(); // IDs that are labels (skip them)
	const pointPositions = new Map<string, { x: number; y: number }>(); // name → math coords
	let nameCounter = 0;

	// Pre-scan: extract point names from label text objects
	for (const step of steps) {
		if (step.type === 'create' && step.object?.kind === 'text') {
			const obj = step.object;
			const labelMatch = obj.id?.match(/^label_(\d+)_label$/);
			if (labelMatch && obj.content && /^[A-Za-z_]\w*'?$/.test(obj.content.trim())) {
				const pointId = `P_${labelMatch[1]}`;
				pointNames.set(pointId, obj.content.trim());
				labelTexts.add(obj.id!);
			}
		}
	}

	// Pre-scan: index point positions for deduplication
	for (const step of steps) {
		if (step.type === 'create' && step.object?.kind === 'point') {
			const obj = step.object;
			const name = getName(obj.id);
			const m = toMath(obj.x ?? 0, obj.y ?? 0, canvasW, canvasH, ppu);
			pointPositions.set(name, m);
		}
	}
	// Reset pointNames state (getName was called during pre-scan but we'll call it again)
	// Keep the label-derived names but clear auto-generated ones
	// Actually, getName already populated pointNames correctly. No reset needed.

	function getName(id: string | undefined): string {
		if (!id) return `P${++nameCounter}`;
		if (pointNames.has(id)) return pointNames.get(id)!;
		const name = /^[A-Za-z_]\w*$/.test(id) ? id : `P${++nameCounter}`;
		pointNames.set(id, name);
		return name;
	}

	/** Find an existing point within tolerance of given math coords, or create a new one. */
	function findOrCreatePoint(px: number, py: number): string {
		const m = toMath(px, py, canvasW, canvasH, ppu);
		const tolerance = 0.15; // ~6 pixels at ppu=40
		for (const [name, pos] of pointPositions) {
			if (Math.abs(pos.x - m.x) < tolerance && Math.abs(pos.y - m.y) < tolerance) {
				return name;
			}
		}
		// No match — create new point
		const name = `_p${nameCounter++}`;
		pointPositions.set(name, m);
		lines.push(`${name} = point(${m.x}, ${m.y})`);
		return name;
	}

	let lastWasPause = false;

	for (const step of steps) {
		// Direct pause step
		if (step.type === 'pause' && (step as unknown as { duration: number }).duration) {
			const dur = (step as unknown as { duration: number }).duration;
			if (dur >= 200 && !lastWasPause) {
				lines.push(`@pause(${dur})`);
				lastWasPause = true;
			}
			continue;
		}

		// Legacy pause
		if (step.pause) {
			if (step.pause >= 200 && !lastWasPause) {
				lines.push(`@pause(${step.pause})`);
				lastWasPause = true;
			}
			continue;
		}

		// Comment
		if (step.type === 'comment') {
			continue; // skip comments
		}

		if (step.type === 'create' && step.object) {
			const obj = step.object;

			// Skip label text objects (already extracted in pre-scan)
			if (obj.kind === 'text' && obj.id && labelTexts.has(obj.id)) {
				continue;
			}

			switch (obj.kind) {
				case 'point': {
					const name = getName(obj.id);
					// Check if already emitted via findOrCreatePoint
					if (!pointPositions.has(name) || !lines.some((l) => l.startsWith(`${name} = point`))) {
						const m = toMath(obj.x ?? 0, obj.y ?? 0, canvasW, canvasH, ppu);
						pointPositions.set(name, m);
						lines.push(`${name} = point(${m.x}, ${m.y})`);
					}
					lastWasPause = false;
					break;
				}
				case 'segment': {
					let start: string;
					let end: string;
					if (obj.from && obj.to) {
						start = findOrCreatePoint(obj.from.x, obj.from.y);
						end = findOrCreatePoint(obj.to.x, obj.to.y);
					} else {
						start = getName(obj.startPoint ?? obj.point1);
						end = getName(obj.endPoint ?? obj.point2);
					}
					lines.push(`segment(${start}, ${end})`);
					lastWasPause = false;
					break;
				}
				case 'ray': {
					let origin: string;
					let through: string;
					if (obj.from && obj.through) {
						origin = findOrCreatePoint(obj.from.x, obj.from.y);
						through = findOrCreatePoint(obj.through.x, obj.through.y);
					} else {
						origin = getName(obj.point1);
						through = getName(obj.point2);
					}
					lines.push(`demidroite(${origin}, ${through})`);
					lastWasPause = false;
					break;
				}
				case 'text': {
					const content = (obj.content ?? '')
						.replace(/£lt£/g, '<')
						.replace(/£gt£/g, '>')
						.replace(/£guillemet£/g, '"')
						.replace(/<[^>]*>/g, '') // strip HTML tags
						.trim();
					// Skip short single-char texts (likely point labels)
					// and empty/whitespace-only texts
					if (content && content.length > 2) {
						lines.push(`@instruction("${content.replace(/"/g, "'")}")`);
					}
					break;
				}
				case 'polygon': {
					// Skip polygons (background/decorative)
					lines.push(`# polygone (decoratif)`);
					break;
				}
				case 'angleMark': {
					if (obj.p1 && obj.vertex && obj.p2) {
						const p1 = getName(obj.p1);
						const v = getName(obj.vertex);
						const p2 = getName(obj.p2);
						const arcs = obj.arcCount && obj.arcCount > 1 ? `, marque="arcs${obj.arcCount}"` : '';
						lines.push(`angle(${p1}, ${v}, ${p2}${arcs})`);
					}
					break;
				}
				default:
					lines.push(`# objet non converti: ${obj.kind}`);
			}
			continue;
		}

		if (step.type === 'action' && step.action) {
			const act = step.action;
			switch (act.kind) {
				case 'moveTo':
					// Instrument movement — skip (auto-positioned)
					break;
				case 'drawLine': {
					// Pencil trace = visible segment
					if (act.from && act.to) {
						const p1 = findOrCreatePoint(act.from.x, act.from.y);
						const p2 = findOrCreatePoint(act.to.x, act.to.y);
						lines.push(`segment(${p1}, ${p2})`);
					}
					lastWasPause = false;
					break;
				}
				case 'drawArc': {
					// Compass arc
					const center = (act as unknown as { center?: { x: number; y: number } }).center;
					const radius = act.radius;
					const startAngle = (act as unknown as { startAngle?: number }).startAngle;
					const endAngle = (act as unknown as { endAngle?: number }).endAngle;
					if (center && radius) {
						const cp = findOrCreatePoint(center.x, center.y);
						const rMath = Math.round((radius / ppu) * 100) / 100;
						if (startAngle !== undefined && endAngle !== undefined) {
							// IEP angles are in degrees, but Y is flipped in math coords
							// In pixel coords (Y-down), angles go clockwise
							// In math coords (Y-up), we need to negate angles
							const sDeg = Math.round(-startAngle * 100) / 100;
							const eDeg = Math.round(-endAngle * 100) / 100;
							lines.push(`arc(${cp}, rayon=${rMath}, debut=${sDeg}, fin=${eDeg})`);
						} else {
							lines.push(`cercle(${cp}, rayon=${rMath})`);
						}
					}
					lastWasPause = false;
					break;
				}
				case 'show': {
					const target = act.target;
					if (target === 'ruler') lines.push(`@instrument("regle")`);
					else if (target === 'compass') lines.push(`@instrument("compas")`);
					else if (target === 'setSquare') lines.push(`@instrument("equerre")`);
					else if (target === 'pencil') lines.push(`@instrument("crayon")`);
					else if (target === 'protractor') lines.push(`@instrument("rapporteur")`);
					else if (target) lines.push(`@montrer("${target}")`);
					lastWasPause = false;
					break;
				}
				case 'hide': {
					const target = act.target;
					if (
						target === 'ruler' ||
						target === 'compass' ||
						target === 'setSquare' ||
						target === 'pencil' ||
						target === 'protractor'
					) {
						lines.push(`@cacher`);
					} else if (target) {
						lines.push(`@cacher("${target}")`);
					}
					break;
				}
				case 'rotate':
				case 'scale':
				case 'setCompass':
					// Instrument manipulation — skip (animation detail)
					break;
				case 'text': {
					// Text display
					const content = (act as unknown as { content?: string }).content;
					if (content) {
						const clean = content
							.replace(/<[^>]*>/g, '')
							.replace(/£lt£/g, '<')
							.replace(/£gt£/g, '>')
							.trim();
						if (clean) {
							lines.push(`@instruction("${clean.replace(/"/g, "'")}")`);
						}
					}
					break;
				}
				default:
					// Unknown action kind — comment out
					break;
			}
			continue;
		}

		// Step with direct keys (new flat format — shouldn't exist in old data but handle gracefully)
		if ('point' in step) {
			lines.push(`# step format plat non converti`);
		}
	}

	// Clean up: remove consecutive duplicate @cacher and empty lines
	const cleaned: string[] = [];
	for (const line of lines) {
		if (line === '@cacher' && cleaned.length > 0 && cleaned[cleaned.length - 1] === '@cacher') {
			continue;
		}
		cleaned.push(line);
	}

	return cleaned.join('\n');
}

async function main() {
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

	console.log(`Mode: ${dryRun ? 'DRY RUN (pas de modifications)' : 'MIGRATION'}`);
	console.log('');

	// Fetch all constructions that have a JSON script
	const { data, error } = await supabase
		.from('constructions')
		.select('id, title, format, script')
		.not('script', 'is', null)
		.order('created_at');

	if (error) {
		console.error('Erreur:', error.message);
		process.exit(1);
	}

	if (!data || data.length === 0) {
		console.log('Aucune construction JSON a migrer.');
		return;
	}

	console.log(`${data.length} constructions JSON trouvees.\n`);

	let successCount = 0;
	let errorCount = 0;

	for (const row of data as Construction[]) {
		console.log(`--- ${row.title} (${row.id.slice(0, 8)}...) ---`);

		try {
			const canvas = row.script.canvas;
			const dsl = convertJsonToDsl(
				row.title,
				row.script.steps ?? [],
				canvas?.width ?? 800,
				canvas?.height ?? 600
			);
			const lineCount = dsl.split('\n').length;
			const nonCommentLines = dsl.split('\n').filter((l) => !l.startsWith('#') && l.trim()).length;

			console.log(`  ${lineCount} lignes DSL (${nonCommentLines} instructions)`);

			// Show first 5 lines
			const preview = dsl.split('\n').slice(0, 5).join('\n');
			console.log(`  Preview:\n    ${preview.replace(/\n/g, '\n    ')}`);

			if (!dryRun) {
				const { error: updateError } = await supabase
					.from('constructions')
					.update({
						format: 'dsl',
						dsl_script: dsl
					})
					.eq('id', row.id);

				if (updateError) {
					console.error(`  ERREUR: ${updateError.message}`);
					errorCount++;
					continue;
				}
				console.log('  ✓ Migre');
			} else {
				console.log('  (dry run — pas de modification)');
			}

			successCount++;
		} catch (err) {
			console.error(`  ERREUR: ${(err as Error).message}`);
			errorCount++;
		}

		console.log('');
	}

	console.log(`\nResultat: ${successCount} succes, ${errorCount} erreurs`);
}

main().catch(console.error);
