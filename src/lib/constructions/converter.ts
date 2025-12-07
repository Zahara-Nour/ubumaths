/**
 * InstrumenPoche XML to UbuMaths JSON Converter
 *
 * Converts InstrumenPoche XML construction scripts to UbuMaths flat JSON format.
 * This module is browser/server compatible - no Node.js-specific APIs.
 *
 * New format examples:
 * - { "point": "A", "at": [100, 200], "label": "A" }
 * - { "move": "pencil", "to": [100, 200] }
 * - { "line": "seg1", "to": "B" }
 * - { "arc": "c1", "sweep": 360 }
 * - { "show": "ruler" }
 * - { "pause": 1000 }
 *
 * @module constructions/converter
 *
 * @example
 * ```typescript
 * import { convertInstrumenPoche } from '$lib/constructions/converter';
 *
 * const xmlContent = '<INSTRUMENPOCHE>...</INSTRUMENPOCHE>';
 * const result = await convertInstrumenPoche(xmlContent, {
 *   title: 'My Construction',
 *   description: 'A geometric construction'
 * });
 *
 * if (result.success) {
 *   console.log(result.script);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */

import {
	constructionScriptSchema,
	type ConstructionScriptInput,
	type StepInput,
	type CoordPair
} from './schemas';

// =============================================================================
// Cross-environment XML Parser (Browser + Node.js)
// =============================================================================

/**
 * Check if we're in a Node.js environment
 */
function isNodeEnvironment(): boolean {
	return (
		typeof window === 'undefined' && typeof process !== 'undefined' && !!process.versions?.node
	);
}

/**
 * Parse XML using xml2js (Node.js environment)
 */
async function parseWithXml2js(xmlContent: string): Promise<IepDocument | null> {
	const { parseStringPromise } = await import('xml2js');
	const doc = (await parseStringPromise(xmlContent)) as IepDocument;
	return doc.INSTRUMENPOCHE ? doc : null;
}

/**
 * Parse XML using native DOMParser (browser environment)
 */
function parseWithDOMParser(xmlContent: string): IepDocument | null {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlContent, 'text/xml');

	// Check for parsing errors
	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error(`XML parsing failed: ${parseError.textContent}`);
	}

	const root = doc.querySelector('INSTRUMENPOCHE') || doc.querySelector('instrumenpoche');
	if (!root) {
		return null;
	}

	// Extract root attributes
	const rootAttrs: IepDocument['INSTRUMENPOCHE']['$'] = {
		version: root.getAttribute('version') ?? undefined,
		auteur: root.getAttribute('auteur') ?? undefined,
		licence: root.getAttribute('licence') ?? undefined
	};

	// Extract viewBox
	const viewBoxElements = doc.querySelectorAll('viewBox');
	const viewBox: IepDocument['INSTRUMENPOCHE']['viewBox'] = [];
	viewBoxElements.forEach((vb: Element) => {
		viewBox.push({
			$: {
				width: vb.getAttribute('width') ?? undefined,
				height: vb.getAttribute('height') ?? undefined,
				commentaire: vb.getAttribute('commentaire') ?? undefined
			}
		});
	});

	// Extract actions
	const actionElements = doc.querySelectorAll('action');
	const actions: IepAction[] = [];
	actionElements.forEach((action: Element) => {
		const attrs: IepAction['$'] = {};
		// Copy all attributes
		for (const attr of action.attributes) {
			(attrs as Record<string, string>)[attr.name] = attr.value;
		}
		actions.push({ $: attrs });
	});

	return {
		INSTRUMENPOCHE: {
			$: rootAttrs,
			viewBox: viewBox.length > 0 ? viewBox : undefined,
			action: actions.length > 0 ? actions : undefined
		}
	};
}

/**
 * Parse XML string to IepDocument structure
 * - Node.js: Uses xml2js (robust, well-tested)
 * - Browser: Uses native DOMParser (no dependencies)
 */
async function parseXmlToIepDocument(xmlContent: string): Promise<IepDocument | null> {
	if (isNodeEnvironment()) {
		// Node.js: use xml2js for robust XML parsing
		return parseWithXml2js(xmlContent);
	} else {
		// Browser: use native DOMParser
		return parseWithDOMParser(xmlContent);
	}
}

// =============================================================================
// Public API Types
// =============================================================================

/**
 * Result of an InstrumenPoche XML conversion
 */
export interface ConversionResult {
	/** Whether the conversion was successful */
	success: boolean;
	/** The converted script (only present if success is true) */
	script?: ConstructionScriptInput;
	/** Non-critical warnings that occurred during conversion */
	warnings: string[];
	/** Critical errors that caused conversion to fail */
	errors: string[];
}

/**
 * Options for the conversion process
 */
export interface ConversionOptions {
	/** Override the title extracted from XML */
	title?: string;
	/** Override the description extracted from XML */
	description?: string;
}

// =============================================================================
// Internal Type Definitions for InstrumenPoche XML
// =============================================================================

interface IepAction {
	$: {
		// Common attributes
		id?: string;
		objet?: string;
		mouvement?: string;
		tempo?: string;
		vitesse?: string;

		// Position/coordinates
		abscisse?: string;
		ordonnee?: string;
		abscisses?: string;
		ordonnees?: string;

		// Styling
		couleur?: string;
		epaisseur?: string;
		opacite?: string;
		pointille?: string;
		style?: string;
		forme?: string;

		// Point specific
		type?: string;
		nom?: string;

		// Text specific
		texte?: string;
		taille?: string;
		police?: string;
		couleur_fond?: string;
		opacite_fond?: string;
		pris?: string;
		hauteur?: string;
		largeur?: string;

		// Compass/ruler specific
		ecart?: string;
		echelle?: string;
		angle?: string;
		sens?: string;
		debut?: string;
		fin?: string;
		cible?: string;

		// Image specific
		url?: string;

		// Angle
		ordonnee_sommet?: string;
		abscisse_sommet?: string;
		ordonnee_inter?: string;
		abscisse_inter?: string;

		// Length mark
		rayon?: string;
		idSeg?: string;
	};
}

interface IepDocument {
	INSTRUMENPOCHE: {
		$: {
			version?: string;
			auteur?: string;
			licence?: string;
		};
		viewBox?: Array<{
			$: {
				width?: string;
				height?: string;
				commentaire?: string;
			};
		}>;
		action?: IepAction[];
	};
}

interface Position {
	x: number;
	y: number;
}

/** Line style type for internal conversion */
type LineStyle = 'solid' | 'dashed' | 'dotted';

interface ConversionContext {
	objectIdCounter: number;
	pointMap: Map<string, string>; // Maps IEP id to UbuMaths id
	pointPositions: Map<string, Position>; // Tracks point positions by IEP id
	currentPosition: { x: number; y: number }; // Current pencil position (for tracer without target)
	currentPointId?: string; // Current point ID the pencil is at (IEP id, e.g., "A", "B1")
	lastSegmentPoints?: { from: string; to: string }; // Last drawn segment point IDs (for mark ID)
	createdObjects: Set<string>;
	steps: StepInput[];
	warnings: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a coordinate pair tuple [x, y]
 */
function coordPair(x: number, y: number): CoordPair {
	return [x, y];
}

/**
 * Get position of a point by its IEP id
 * Returns undefined if the point position is unknown
 */
function getPointPosition(ctx: ConversionContext, iepId: string): Position | undefined {
	return ctx.pointPositions.get(iepId);
}

/**
 * Update the position of a point
 */
function setPointPosition(ctx: ConversionContext, iepId: string, pos: Position): void {
	ctx.pointPositions.set(iepId, { x: pos.x, y: pos.y });
}

// =============================================================================
// Style Conversion
// =============================================================================

/** Minimum line width (Zod schema requires >= 0.1) */
const MIN_LINE_WIDTH = 0.1;

/**
 * Parse line width from InstrumenPoche epaisseur attribute
 * Returns at least MIN_LINE_WIDTH to satisfy schema validation
 */
function parseLineWidth(epaisseur: string | undefined, defaultWidth: number = 1): number {
	if (!epaisseur) return defaultWidth;
	const parsed = parseFloat(epaisseur);
	if (isNaN(parsed) || parsed < MIN_LINE_WIDTH) return defaultWidth;
	return parsed;
}

/**
 * Convert InstrumenPoche color to CSS color
 */
function convertColor(iepColor: string | undefined): string {
	if (!iepColor) return '#000000';

	// Handle numeric "0" which means black in InstrumenPoche
	if (iepColor === '0') return '#000000';

	// Handle hex colors with 0x prefix
	if (iepColor.startsWith('0x')) {
		const hex = iepColor.slice(2).padStart(6, '0');
		return `#${hex}`;
	}

	// If it looks like a hex color already
	if (iepColor.startsWith('#')) return iepColor;

	// Handle named colors (French + English CSS colors)
	const colorMap: Record<string, string> = {
		// French colors
		noir: '#000000',
		blanc: '#FFFFFF',
		rouge: '#FF0000',
		bleu: '#0000FF',
		vert: '#00FF00',
		jaune: '#FFFF00',
		orange: '#FFA500',
		violet: '#8B00FF',
		rose: '#FF69B4',
		gris: '#808080',
		marron: '#8B4513',
		// CSS named colors
		black: '#000000',
		white: '#FFFFFF',
		red: '#FF0000',
		blue: '#0000FF',
		green: '#008000',
		yellow: '#FFFF00',
		grey: '#808080',
		gray: '#808080',
		purple: '#800080',
		pink: '#FFC0CB',
		brown: '#A52A2A',
		cyan: '#00FFFF',
		magenta: '#FF00FF',
		lime: '#00FF00',
		navy: '#000080',
		teal: '#008080',
		aqua: '#00FFFF',
		silver: '#C0C0C0',
		gold: '#FFD700',
		// Extended CSS colors commonly used
		forestgreen: '#228B22',
		darkgreen: '#006400',
		lightgreen: '#90EE90',
		darkred: '#8B0000',
		darkblue: '#00008B',
		lightblue: '#ADD8E6',
		goldenrod: '#DAA520',
		coral: '#FF7F50',
		crimson: '#DC143C',
		indigo: '#4B0082',
		khaki: '#F0E68C',
		lavender: '#E6E6FA',
		olive: '#808000',
		salmon: '#FA8072',
		sienna: '#A0522D',
		tan: '#D2B48C',
		turquoise: '#40E0D0',
		wheat: '#F5DEB3'
	};

	const lowerColor = iepColor.toLowerCase();
	if (colorMap[lowerColor]) return colorMap[lowerColor];

	// Unknown color - return black as fallback (safer than invalid color)
	return '#000000';
}

/**
 * Convert line style
 */
function convertLineStyle(pointille: string | undefined): LineStyle {
	if (!pointille) return 'solid';
	if (pointille === 'tiret') return 'dashed';
	if (pointille === 'point') return 'dotted';
	return 'solid';
}

// =============================================================================
// Object ID Generation
// =============================================================================

/**
 * Generate a valid UbuMaths object ID
 * IDs must start with a letter and contain only alphanumeric characters and underscores
 */
function generateObjectId(ctx: ConversionContext, prefix: string, iepId?: string): string {
	if (iepId) {
		// Clean up IEP id to be valid for UbuMaths
		let cleanId = iepId.replace(/[^a-zA-Z0-9_]/g, '_');

		// If ID starts with a number, prepend the prefix
		if (/^[0-9]/.test(cleanId)) {
			cleanId = `${prefix}_${cleanId}`;
		}

		if (/^[a-zA-Z]/.test(cleanId) && !ctx.createdObjects.has(cleanId)) {
			return cleanId;
		}
	}
	ctx.objectIdCounter++;
	return `${prefix}_${ctx.objectIdCounter}`;
}

// =============================================================================
// Action Conversion
// =============================================================================

/**
 * Convert IEP action to UbuMaths steps
 */
function convertAction(action: IepAction, ctx: ConversionContext): void {
	const attrs = action.$;
	const objet = attrs.objet;
	const mouvement = attrs.mouvement;

	if (!objet || !mouvement) return;

	switch (objet) {
		case 'point':
			convertPointAction(attrs, mouvement, ctx);
			break;
		case 'texte':
			convertTextAction(attrs, mouvement, ctx);
			break;
		case 'crayon':
			convertPencilAction(attrs, mouvement, ctx);
			break;
		case 'regle':
			convertRulerAction(attrs, mouvement, ctx);
			break;
		case 'compas':
			convertCompassAction(attrs, mouvement, ctx);
			break;
		case 'equerre':
			convertSetSquareAction(attrs, mouvement, ctx);
			break;
		case 'longueur':
			convertLengthMarkAction(attrs, mouvement, ctx);
			break;
		case 'angle_droit':
			convertRightAngleAction(attrs, mouvement, ctx);
			break;
		case 'trait':
			convertTraitAction(attrs, mouvement, ctx);
			break;
		case 'image':
			convertImageAction(attrs, mouvement, ctx);
			break;
		case 'marque':
			convertMarkAction(attrs, mouvement, ctx);
			break;
		default:
			ctx.warnings.push(`Unknown object type: ${objet}`);
	}

	// Handle tempo as pause (new format: { pause: duration })
	if (attrs.tempo && parseInt(attrs.tempo) > 0) {
		const pauseDuration = parseInt(attrs.tempo) * 50; // IEP tempo units to ms
		if (pauseDuration > 0 && pauseDuration < 30000) {
			ctx.steps.push({ pause: pauseDuration });
		}
	}
}

/**
 * Convert point-related actions
 * New format: { point: "A", at: [100, 200], label: "A" }
 */
function convertPointAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'creer': {
			const id = generateObjectId(ctx, 'P', attrs.id);
			const x = parseFloat(attrs.abscisse || '0');
			const y = parseFloat(attrs.ordonnee || '0');

			if (attrs.id) {
				ctx.pointMap.set(attrs.id, id);
				// Track point position for rotation calculations
				setPointPosition(ctx, attrs.id, { x, y });
			}

			// New format: { point: id, at: [x, y], style?: ..., color?: ... }
			// Labels are now separate steps (see 'nommer' case)
			const pointStep: StepInput = {
				point: id,
				at: coordPair(x, y),
				style: 'dot',
				radius: 4,
				color: convertColor(attrs.couleur)
			};

			ctx.createdObjects.add(id);
			ctx.steps.push(pointStep);
			break;
		}
		case 'nommer': {
			// Point naming - create a label step attached to the point
			if (!attrs.id || !attrs.nom) break;

			const offsetX = attrs.abscisse ? parseFloat(attrs.abscisse) : 10;
			const offsetY = attrs.ordonnee ? parseFloat(attrs.ordonnee) : -10;
			const labelId = `label_${attrs.id}`;

			// Emit a label step (attached to point, follows it if moved)
			// Note: offset uses numeric tuple [number, number], not CoordPair which allows expressions
			ctx.steps.push({
				label: labelId,
				offset: [offsetX, offsetY] as [number, number],
				color: convertColor(attrs.couleur),
				size: attrs.taille ? parseInt(attrs.taille) : 14
			});
			ctx.createdObjects.add(labelId);
			break;
		}
		case 'translation': {
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId && attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				const toPos = { x: newX, y: newY };
				// Update tracked position for the point
				if (attrs.id) {
					setPointPosition(ctx, attrs.id, toPos);
				}
				// Only emit duration if XML specifies vitesse, otherwise Engine calculates
				const step: StepInput = {
					move: pointId,
					to: coordPair(newX, newY)
				};
				if (attrs.vitesse) {
					(step as { duration?: number }).duration = Math.round(
						(1000 / parseFloat(attrs.vitesse)) * 100
					);
				}
				ctx.steps.push(step);
			}
			break;
		}
		case 'masquer': {
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId) {
				// New format: { hide: id }
				ctx.steps.push({ hide: pointId });
			}
			break;
		}
		case 'montrer': {
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId) {
				// New format: { show: id }
				ctx.steps.push({ show: pointId });
			}
			break;
		}
	}
}

/**
 * Convert text-related actions
 * New format: { text: "t1", at: [x, y], content: "Hello", color?: ..., size?: ... }
 */
function convertTextAction(attrs: IepAction['$'], mouvement: string, ctx: ConversionContext): void {
	switch (mouvement) {
		case 'creer': {
			// Text creation - just registers the position, actual text comes with 'ecrire'
			const id = generateObjectId(ctx, 'T', attrs.id);
			if (attrs.id) {
				ctx.pointMap.set(attrs.id, id);
			}
			// Store position for later use
			if (attrs.abscisse && attrs.ordonnee) {
				ctx.currentPosition = {
					x: parseFloat(attrs.abscisse),
					y: parseFloat(attrs.ordonnee)
				};
			}
			break;
		}
		case 'ecrire': {
			// Use mapped ID if exists, otherwise generate a valid one
			const id = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'T', attrs.id)
				: generateObjectId(ctx, 'T');

			// Clean up IEP text encoding
			// Note: We decode IEP special sequences but DON'T strip HTML tags
			// since that would remove intentional <> characters
			let text = attrs.texte || '';
			text = text
				.replace(/<br£gt£/g, '\n') // Handle line breaks first
				.replace(/£lt£/g, '<')
				.replace(/£gt£/g, '>')
				.replace(/£guillemet£/g, '"')
				.replace(/£i\(/g, '(')
				.replace(/\)/g, ')');
			// Note: Not stripping HTML tags as it would remove intentional < > chars

			// Skip empty text content
			if (!text.trim()) {
				break;
			}

			if (!ctx.createdObjects.has(id)) {
				// New format: { text: id, at: [x, y], content: ..., size?: ..., color?: ... }
				ctx.steps.push({
					text: id,
					at: coordPair(ctx.currentPosition.x, ctx.currentPosition.y),
					content: text,
					size: attrs.taille ? parseInt(attrs.taille) : 16,
					color: convertColor(attrs.couleur)
				});
				ctx.createdObjects.add(id);
			}
			break;
		}
		case 'masquer': {
			const id = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'T', attrs.id)
				: undefined;
			if (id) {
				// New format: { hide: id }
				ctx.steps.push({ hide: id });
			}
			break;
		}
		case 'translation': {
			const id = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'T', attrs.id)
				: undefined;
			if (id && attrs.abscisse && attrs.ordonnee) {
				const toPos = { x: parseFloat(attrs.abscisse), y: parseFloat(attrs.ordonnee) };
				// Only emit duration if XML specifies vitesse, otherwise Engine calculates
				const step: StepInput = {
					move: id,
					to: coordPair(toPos.x, toPos.y)
				};
				if (attrs.vitesse) {
					(step as { duration?: number }).duration = Math.round(
						(1000 / parseFloat(attrs.vitesse)) * 100
					);
				}
				ctx.steps.push(step);
			}
			break;
		}
	}
}

/**
 * Convert pencil/crayon actions
 * New format:
 * - { move: "pencil", to: [x, y] }
 * - { line: "seg1", to: [x, y] } (from is implicit - current pencil position)
 * - { show: "pencil" }, { hide: "pencil" }
 */
function convertPencilAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'translation': {
			// Move pencil position
			// Priority: cible (declarative) > coordinates (absolute)
			// When cible is present, emit declarative reference - engine resolves position
			if (attrs.cible) {
				// Move pencil to target point (declarative)
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);

				// Update internal position tracking from coordinates if available
				if (attrs.abscisse && attrs.ordonnee) {
					ctx.currentPosition = { x: parseFloat(attrs.abscisse), y: parseFloat(attrs.ordonnee) };
				} else {
					const targetPos = getPointPosition(ctx, attrs.cible);
					if (targetPos) {
						ctx.currentPosition = { x: targetPos.x, y: targetPos.y };
					}
				}

				// Track current point ID for segment marks
				ctx.currentPointId = attrs.cible;

				// Emit declarative step - engine calculates actual position
				const step: StepInput = {
					move: 'pencil',
					to: targetId
				};
				if (attrs.vitesse) {
					(step as { duration?: number }).duration = Math.max(
						100,
						Math.round((1000 / parseFloat(attrs.vitesse)) * 100)
					);
				}
				ctx.steps.push(step);
			} else if (attrs.abscisse && attrs.ordonnee) {
				// Fallback: absolute coordinates when no target point
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				ctx.currentPosition = { x: newX, y: newY };
				// Clear current point ID - we're at coordinates, not a named point
				ctx.currentPointId = undefined;

				const step: StepInput = {
					move: 'pencil',
					to: coordPair(newX, newY)
				};
				if (attrs.vitesse) {
					(step as { duration?: number }).duration = Math.max(
						100,
						Math.round((1000 / parseFloat(attrs.vitesse)) * 100)
					);
				}
				ctx.steps.push(step);
			}
			break;
		}
		case 'tracer': {
			// Draw a line from current position to target
			// New format: { line: "seg1", to: [x, y] } - no 'from' needed, pencil is already positioned
			const id = generateObjectId(ctx, 'seg', attrs.id);
			// Register mapping so hide/show actions can find this object later
			if (attrs.id) {
				ctx.pointMap.set(attrs.id, id);
			}
			const endX = attrs.abscisse ? parseFloat(attrs.abscisse) : ctx.currentPosition.x;
			const endY = attrs.ordonnee ? parseFloat(attrs.ordonnee) : ctx.currentPosition.y;

			// Handle polygon shapes - these need special treatment
			// For now, emit a warning as polygons aren't directly supported in new format
			if (attrs.forme === 'polygone' && attrs.abscisses && attrs.ordonnees) {
				ctx.warnings.push(`Polygon ${id}: polygons are not yet supported in new format`);
				// Skip polygon handling for now
			} else if (attrs.forme === 'libre' && attrs.abscisses && attrs.ordonnees) {
				// Free-form drawing - emit warning
				ctx.warnings.push(`Free-form drawing ${id}: not yet supported in new format`);
			} else if (attrs.forme === 'demidroite') {
				// Half-line (ray) - emit warning
				ctx.warnings.push(`Ray ${id}: rays are not yet supported in new format`);
			} else if (attrs.cible) {
				// Draw to a target point
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				const isVector = attrs.style === 'vecteur';

				// New format: { line: id, to: targetId, arrow?: ..., color?: ..., width?: ..., style?: ... }
				const lineStep: StepInput = {
					line: id,
					to: targetId,
					...(isVector && { arrow: 'end' as const }),
					color: convertColor(attrs.couleur),
					width: parseLineWidth(attrs.epaisseur, 1),
					style: convertLineStyle(attrs.pointille)
				};
				ctx.createdObjects.add(id);
				ctx.steps.push(lineStep);

				// Track segment point IDs for mark ID generation
				if (ctx.currentPointId) {
					ctx.lastSegmentPoints = {
						from: ctx.currentPointId,
						to: attrs.cible
					};
				} else {
					// No source point ID - can't generate mark ID
					ctx.lastSegmentPoints = undefined;
				}

				// Update current position and point ID
				const targetPos = getPointPosition(ctx, attrs.cible);
				if (targetPos) {
					ctx.currentPosition = { x: targetPos.x, y: targetPos.y };
				}
				ctx.currentPointId = attrs.cible;
			} else {
				// Simple segment to coordinates
				const isVector = attrs.style === 'vecteur';

				// No point IDs for coordinate-based segments - can't generate mark ID
				ctx.lastSegmentPoints = undefined;

				// New format: { line: id, to: [x, y], arrow?: ..., color?: ..., width?: ..., style?: ... }
				const lineStep: StepInput = {
					line: id,
					to: coordPair(endX, endY),
					...(isVector && { arrow: 'end' as const }),
					color: convertColor(attrs.couleur),
					width: parseLineWidth(attrs.epaisseur, 1),
					style: convertLineStyle(attrs.pointille)
				};
				ctx.createdObjects.add(id);
				ctx.steps.push(lineStep);

				// Update current position, clear point ID
				ctx.currentPosition = { x: endX, y: endY };
				ctx.currentPointId = undefined;
			}
			break;
		}
		case 'montrer': {
			// CRITICAL: Update position if provided - this sets the starting point for tracer
			if (attrs.abscisse !== undefined && attrs.ordonnee !== undefined) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				ctx.currentPosition = { x: newX, y: newY };
				// Move pencil to position first (duration 0 = instant)
				ctx.steps.push({
					move: 'pencil',
					to: coordPair(newX, newY),
					duration: 0
				});
			}
			// New format: { show: "pencil" }
			ctx.steps.push({ show: 'pencil' });
			break;
		}
		case 'masquer': {
			// New format: { hide: "pencil" }
			ctx.steps.push({ hide: 'pencil' });
			break;
		}
		case 'rotation': {
			// Pencil rotation
			if (attrs.angle) {
				const targetAngle = parseFloat(attrs.angle);
				ctx.steps.push({
					rotate: 'pencil',
					to: targetAngle
				});
			} else if (attrs.cible) {
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				ctx.steps.push({
					rotate: 'pencil',
					toward: targetId
				});
			}
			break;
		}
	}
}

/**
 * Convert ruler actions
 * New format:
 * - { move: "ruler", to: [x, y] }
 * - { rotate: "ruler", to: angle } or { rotate: "ruler", toward: "A" }
 * - { show: "ruler" }, { hide: "ruler" }
 */
function convertRulerAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'montrer': {
			// CRITICAL: Update position if provided
			if (attrs.abscisse !== undefined && attrs.ordonnee !== undefined) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Move ruler to position first (duration 0 = instant)
				ctx.steps.push({
					move: 'ruler',
					to: coordPair(newX, newY),
					duration: 0
				});
			}
			// New format: { show: "ruler" }
			ctx.steps.push({ show: 'ruler' });
			break;
		}
		case 'masquer': {
			// New format: { hide: "ruler" }
			ctx.steps.push({ hide: 'ruler' });
			break;
		}
		case 'translation': {
			if (attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Engine calculates duration based on position tracking
				ctx.steps.push({
					move: 'ruler',
					to: coordPair(newX, newY)
				});
			} else if (attrs.cible) {
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				// Engine calculates duration based on position tracking
				ctx.steps.push({
					move: 'ruler',
					to: targetId
				});
			}
			break;
		}
		case 'rotation': {
			if (attrs.angle) {
				// attrs.angle is an ABSOLUTE angle in InstrumenPoche
				// New format uses absolute angles: { rotate: "ruler", to: angle }
				const targetAngle = parseFloat(attrs.angle);
				// Engine calculates duration based on angle tracking
				ctx.steps.push({
					rotate: 'ruler',
					to: targetAngle
				});
			} else if (attrs.cible) {
				// Rotate towards a target point
				// New format: { rotate: "ruler", toward: "A" }
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);

				// Engine calculates duration based on angle tracking
				ctx.steps.push({
					rotate: 'ruler',
					toward: targetId
				});
			}
			break;
		}
		case 'zoom': {
			// Scale the ruler - not directly supported in new format
			// Emit a warning
			if (attrs.echelle) {
				ctx.warnings.push(`Ruler zoom/scale not supported in new format (scale: ${attrs.echelle})`);
			}
			break;
		}
		case 'vide':
		case 'graduations': {
			// These are ruler display modes - skip (no comment in new format)
			// Just track for warnings if needed
			break;
		}
	}
}

/**
 * Convert compass actions
 * New format:
 * - { move: "compass", to: [x, y] }
 * - { rotate: "compass", to: angle } or { rotate: "compass", toward: "A" }
 * - { spread: "compass", radius: 100 } or { spread: "compass", to: "A" }
 * - { arc: "c1", sweep: 360 }
 * - { raise: "compass" }, { lower: "compass" }
 * - { show: "compass" }, { hide: "compass" }
 */
function convertCompassAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'montrer': {
			// CRITICAL: Update position if provided
			if (attrs.abscisse !== undefined && attrs.ordonnee !== undefined) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Move compass to position first (duration 0 = instant)
				ctx.steps.push({
					move: 'compass',
					to: coordPair(newX, newY),
					duration: 0
				});
			}
			// New format: { show: "compass" }
			ctx.steps.push({ show: 'compass' });
			break;
		}
		case 'masquer': {
			// New format: { hide: "compass" }
			ctx.steps.push({ hide: 'compass' });
			break;
		}
		case 'translation': {
			if (attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Engine calculates duration based on position tracking
				ctx.steps.push({
					move: 'compass',
					to: coordPair(newX, newY)
				});
			} else if (attrs.cible) {
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				// Engine calculates duration based on position tracking
				ctx.steps.push({
					move: 'compass',
					to: targetId
				});
			}
			break;
		}
		case 'rotation': {
			if (attrs.angle) {
				// attrs.angle is an ABSOLUTE angle in InstrumenPoche
				// New format uses absolute angles: { rotate: "compass", to: angle }
				const targetAngle = parseFloat(attrs.angle);
				// Engine calculates duration based on angle tracking
				ctx.steps.push({
					rotate: 'compass',
					to: targetAngle
				});
			} else if (attrs.cible) {
				// Rotate towards a target point
				// New format: { rotate: "compass", toward: "A" }
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);

				// Engine calculates duration based on angle tracking
				ctx.steps.push({
					rotate: 'compass',
					toward: targetId
				});
			}
			break;
		}
		case 'ecarter': {
			// Set compass opening
			// New format: { spread: "compass", radius: ... } or { spread: "compass", to: "A" }
			// Engine calculates duration
			if (attrs.ecart) {
				const radius = parseFloat(attrs.ecart);
				ctx.steps.push({
					spread: 'compass',
					radius: radius
				});
			} else if (attrs.cible) {
				// Open to match distance to target point
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);

				// New format: { spread: "compass", to: "A" }
				ctx.steps.push({
					spread: 'compass',
					to: targetId
				});
			}
			break;
		}
		case 'lever': {
			// Compass raised - New format: { raise: "compass" }
			ctx.steps.push({ raise: 'compass' });
			break;
		}
		case 'coucher': {
			// Compass lowered - New format: { lower: "compass" }
			ctx.steps.push({ lower: 'compass' });
			break;
		}
		case 'tracer': {
			// Draw arc with compass
			// New format: { arc: id, sweep: degrees, color?: ..., width?: ... }
			const id = generateObjectId(ctx, 'arc', attrs.id);
			// Register mapping so hide/show actions can find this object later
			if (attrs.id) {
				ctx.pointMap.set(attrs.id, id);
			}
			const rawStartAngle = attrs.debut ? parseFloat(attrs.debut) : 0;
			const rawEndAngle = attrs.fin ? parseFloat(attrs.fin) : 360;

			// Calculate the arc sweep (preserves direction: positive = counter-clockwise, negative = clockwise)
			const arcSweep = rawEndAngle - rawStartAngle;

			// Normalize start angle to [0, 360) range
			let normalizedStart = rawStartAngle % 360;
			if (normalizedStart < 0) normalizedStart += 360;

			// Always rotate compass to start angle first (Engine handles if already there)
			ctx.steps.push({
				rotate: 'compass',
				to: normalizedStart
			});

			// Create the arc step with sweep angle
			// New format: { arc: id, sweep: degrees }
			ctx.steps.push({
				arc: id,
				sweep: arcSweep,
				color: convertColor(attrs.couleur),
				width: parseLineWidth(attrs.epaisseur, 1)
			});
			ctx.createdObjects.add(id);
			break;
		}
		case 'retourner': {
			// Flip compass - not supported in new format, skip silently
			break;
		}
	}
}

/**
 * Convert set square (equerre) actions
 * New format:
 * - { move: "setSquare", to: [x, y] }
 * - { show: "setSquare" }, { hide: "setSquare" }
 */
function convertSetSquareAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'montrer': {
			// New format: { show: "setSquare" }
			ctx.steps.push({ show: 'setSquare' });
			break;
		}
		case 'masquer': {
			// New format: { hide: "setSquare" }
			ctx.steps.push({ hide: 'setSquare' });
			break;
		}
		case 'translation': {
			if (attrs.abscisse && attrs.ordonnee) {
				const x = parseFloat(attrs.abscisse);
				const y = parseFloat(attrs.ordonnee);
				// Engine calculates duration based on position tracking
				ctx.steps.push({
					move: 'setSquare',
					to: coordPair(x, y)
				});
			}
			break;
		}
	}
}

/**
 * Convert length mark actions
 * New format: { mark: "m1", at: [x, y], shape: "//" }
 */
/**
 * Parse forme attribute to determine mark shape
 * InstrumenPoche uses:
 * - Backslashes/Slashes/Pipes: \, \\, \\\, /, //, ///, |, ||, ||| → /, //, ///
 * - X or x = X (cross)
 * - O or o = o (circle)
 */
function parseFormeToShape(forme: string | undefined): '/' | '//' | '///' | 'X' | 'o' | undefined {
	if (!forme) return undefined;

	const trimmed = forme.trim();

	// Check for cross (X)
	if (trimmed.toLowerCase() === 'x') {
		return 'X';
	}

	// Check for circle (O)
	if (trimmed.toLowerCase() === 'o') {
		return 'o';
	}

	// Count tick-like symbols (backslashes, slashes, or pipes)
	const backslashCount = (trimmed.match(/\\/g) || []).length;
	const slashCount = (trimmed.match(/\//g) || []).length;
	const pipeCount = (trimmed.match(/\|/g) || []).length;
	const tickCount = Math.max(backslashCount, slashCount, pipeCount);

	if (tickCount >= 3) return '///';
	if (tickCount === 2) return '//';
	if (tickCount === 1) return '/';

	return undefined;
}

/**
 * Convert length mark actions (segment tick marks)
 * New format: { mark: "mark_AB", shape: "//" }
 * Mark ID encodes the segment endpoints for position/angle calculation by engine.
 */
function convertLengthMarkAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	if (mouvement === 'creer') {
		// Check if we have segment point IDs
		if (!ctx.lastSegmentPoints) {
			ctx.warnings.push(
				`Length mark: no segment point IDs available. Draw a segment between named points first.`
			);
			return;
		}

		// Generate mark ID from segment point IDs: mark_<from><to>
		const markId = `mark_${ctx.lastSegmentPoints.from}${ctx.lastSegmentPoints.to}`;

		// Register mapping so hide/show actions can find this object later
		if (attrs.id) {
			ctx.pointMap.set(attrs.id, markId);
		}

		// Parse forme to get shape (/, //, ///, X, o)
		const shape = parseFormeToShape(attrs.forme);

		// New format: { mark: "mark_AB", shape: "//" }
		// Position and angle are calculated by engine from point IDs
		ctx.steps.push({
			mark: markId,
			// Only add shape if not default (/)
			...(shape && shape !== '/' ? { shape } : {}),
			color: convertColor(attrs.couleur),
			width: parseLineWidth(attrs.epaisseur, 1)
		});
		ctx.createdObjects.add(markId);
	}
}

/**
 * Convert right angle mark actions
 * Right angle marks are not directly supported in new format - emit warning
 */
function convertRightAngleAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	if (mouvement === 'creer') {
		// Right angle marks require a vertex point and two adjacent segments
		// This is not yet supported in the new format
		ctx.warnings.push(
			`Right angle mark: not yet supported in new format. Vertex at (${attrs.abscisse_sommet ?? 0}, ${attrs.ordonnee_sommet ?? 0})`
		);
	}
}

/**
 * Convert trait (line/segment) actions
 * New format: { show: id }, { hide: id }
 */
function convertTraitAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	if (mouvement === 'masquer' && attrs.id) {
		// Use the mapped ID if available, otherwise use the original ID with a prefix
		const targetId = ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'obj', attrs.id);
		// New format: { hide: id }
		ctx.steps.push({ hide: targetId });
	} else if (mouvement === 'montrer' && attrs.id) {
		// Use the mapped ID if available, otherwise use the original ID with a prefix
		const targetId = ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'obj', attrs.id);
		// New format: { show: id }
		ctx.steps.push({ show: targetId });
	}
}

/**
 * Convert image actions
 * Images are not supported in new format - emit warning
 */
function convertImageAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	// Images are not supported in new format
	if (mouvement === 'chargement' && attrs.url) {
		ctx.warnings.push(`Image loading not supported: ${attrs.url}`);
	}
}

/**
 * Convert mark actions (segment marks)
 * New format: { mark: "mark_AB", shape: "/" }
 * Mark ID encodes the segment endpoints for position/angle calculation by engine.
 */
function convertMarkAction(attrs: IepAction['$'], mouvement: string, ctx: ConversionContext): void {
	if (mouvement === 'creer') {
		// Check if we have segment point IDs
		if (!ctx.lastSegmentPoints) {
			ctx.warnings.push(
				`Mark: no segment point IDs available. Draw a segment between named points first.`
			);
			return;
		}

		// Generate mark ID from segment point IDs: mark_<from><to>
		const markId = `mark_${ctx.lastSegmentPoints.from}${ctx.lastSegmentPoints.to}`;

		// Register mapping so hide/show actions can find this object later
		if (attrs.id) {
			ctx.pointMap.set(attrs.id, markId);
		}

		// New format: { mark: "mark_AB" }
		// Position and angle are calculated by engine from point IDs
		ctx.steps.push({
			mark: markId,
			length: attrs.rayon ? parseFloat(attrs.rayon) : 5,
			color: convertColor(attrs.couleur),
			width: parseLineWidth(attrs.epaisseur, 2)
		});
		ctx.createdObjects.add(markId);
	}
}

// =============================================================================
// Main Conversion Functions
// =============================================================================

/**
 * Convert a parsed InstrumenPoche XML document to UbuMaths flat format
 */
function convertDocument(
	doc: IepDocument,
	options?: ConversionOptions
): { script?: ConstructionScriptInput; warnings: string[]; validationError?: string } {
	const iep = doc.INSTRUMENPOCHE;
	const actions = iep.action || [];

	// Determine canvas size from viewBox or default
	let width = 800;
	let height = 600;
	if (iep.viewBox && iep.viewBox[0] && iep.viewBox[0].$) {
		width = parseInt(iep.viewBox[0].$.width || '800');
		height = parseInt(iep.viewBox[0].$.height || '600');
	}

	// Initialize conversion context
	const ctx: ConversionContext = {
		objectIdCounter: 0,
		pointMap: new Map(),
		pointPositions: new Map(),
		currentPosition: { x: 0, y: 0 },
		createdObjects: new Set(),
		steps: [],
		warnings: []
	};

	// Use provided options or extract from XML
	const title = options?.title || 'Imported Construction';
	let description = options?.description || '';

	// Get author from XML attributes
	const author = iep.$.auteur?.trim();
	if (author && !description) {
		description = `Auteur: ${author}`;
	} else if (author && description) {
		description = `${description} (Auteur: ${author})`;
	}

	// Convert each action
	for (const action of actions) {
		convertAction(action, ctx);
	}

	// New format: ConstructionScriptInput
	const scriptData = {
		version: 1,
		title,
		description: description || undefined,
		canvas: {
			width,
			height,
			backgroundColor: '#FFFFFF'
		},
		steps: ctx.steps
	};

	// CRITICAL: Validate the generated script before returning
	const validation = constructionScriptSchema.safeParse(scriptData);
	if (!validation.success) {
		const errorMessages = validation.error.issues
			.map((issue) => {
				const path = issue.path.join('.');
				// Try to extract the problematic value for better debugging
				let value = '';
				try {
					// Navigate to the problematic value using the path
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let current: any = scriptData;
					for (const key of issue.path) {
						current = current[key];
					}
					if (current !== undefined) {
						value = ` (value: ${JSON.stringify(current)})`;
					}
				} catch {
					// Ignore navigation errors
				}
				return `${path}: ${issue.message}${value}`;
			})
			.join('; ');
		return {
			script: undefined,
			warnings: ctx.warnings,
			validationError: `Generated script validation failed: ${errorMessages}`
		};
	}

	return { script: validation.data, warnings: ctx.warnings };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert an InstrumenPoche XML string to a UbuMaths ConstructionScript.
 *
 * This function parses the XML content and converts it to the UbuMaths format.
 * It handles all InstrumenPoche action types including points, segments, arcs,
 * compass operations, ruler operations, and text.
 *
 * @param xmlContent - The InstrumenPoche XML content as a string
 * @param options - Optional conversion options (title, description overrides)
 * @returns A promise resolving to the conversion result
 *
 * @example
 * ```typescript
 * const result = await convertInstrumenPoche(xmlString);
 * if (result.success) {
 *   // Use result.script
 *   console.log(`Converted ${result.script.steps.length} steps`);
 *   if (result.warnings.length > 0) {
 *     console.warn('Warnings:', result.warnings);
 *   }
 * } else {
 *   console.error('Conversion failed:', result.errors);
 * }
 * ```
 */
export async function convertInstrumenPoche(
	xmlContent: string,
	options?: ConversionOptions
): Promise<ConversionResult> {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Validate input
	if (!xmlContent || typeof xmlContent !== 'string') {
		return {
			success: false,
			warnings: [],
			errors: ['Invalid input: xmlContent must be a non-empty string']
		};
	}

	// Check for basic XML structure
	if (!xmlContent.includes('<INSTRUMENPOCHE') && !xmlContent.includes('<instrumenpoche')) {
		return {
			success: false,
			warnings: [],
			errors: ['Invalid XML: Missing INSTRUMENPOCHE root element']
		};
	}

	try {
		// Parse XML using cross-environment parser
		const doc = await parseXmlToIepDocument(xmlContent);

		// Validate document structure
		if (!doc || !doc.INSTRUMENPOCHE) {
			return {
				success: false,
				warnings: [],
				errors: ['Invalid XML structure: Missing INSTRUMENPOCHE element']
			};
		}

		// Convert document
		const result = convertDocument(doc, options);
		warnings.push(...result.warnings);

		// Check for validation errors from Zod validation
		if (result.validationError) {
			return {
				success: false,
				warnings,
				errors: [result.validationError]
			};
		}

		// Check for script presence (should always be present if no validation error)
		if (!result.script) {
			return {
				success: false,
				warnings,
				errors: ['Internal error: Script was not generated']
			};
		}

		// Validate result has steps
		if (!result.script.steps || result.script.steps.length === 0) {
			warnings.push('Warning: Converted script has no steps');
		}

		return {
			success: true,
			script: result.script,
			warnings,
			errors: []
		};
	} catch (err) {
		// Handle XML parsing errors
		const errorMessage = err instanceof Error ? err.message : String(err);
		errors.push(`XML parsing error: ${errorMessage}`);

		return {
			success: false,
			warnings,
			errors
		};
	}
}

/**
 * Synchronous version that validates XML structure without full conversion.
 * Useful for quick validation before attempting full conversion.
 *
 * @param xmlContent - The XML content to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateInstrumenPocheXml(xmlContent: string): {
	isValid: boolean;
	error?: string;
} {
	if (!xmlContent || typeof xmlContent !== 'string') {
		return { isValid: false, error: 'Invalid input: must be a non-empty string' };
	}

	if (!xmlContent.includes('<INSTRUMENPOCHE') && !xmlContent.includes('<instrumenpoche')) {
		return { isValid: false, error: 'Missing INSTRUMENPOCHE root element' };
	}

	// Check for basic well-formedness
	const openTags = (xmlContent.match(/<INSTRUMENPOCHE/gi) || []).length;
	const closeTags = (xmlContent.match(/<\/INSTRUMENPOCHE>/gi) || []).length;

	if (openTags !== closeTags) {
		return { isValid: false, error: 'Malformed XML: Unbalanced INSTRUMENPOCHE tags' };
	}

	return { isValid: true };
}
