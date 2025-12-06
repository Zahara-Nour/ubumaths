/**
 * InstrumenPoche XML to UbuMaths JSON Converter
 *
 * Converts InstrumenPoche XML construction scripts to UbuMaths ConstructionScript format.
 * This module is browser/server compatible - no Node.js-specific APIs.
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

import type { ConstructionScript, Step, ObjectDef, ActionDef, LineStyle } from './types';

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
	script?: ConstructionScript;
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

interface ConversionContext {
	objectIdCounter: number;
	pointMap: Map<string, string>; // Maps IEP id to UbuMaths id
	pointPositions: Map<string, Position>; // Tracks point positions by IEP id
	instrumentPositions: Map<string, Position>; // Tracks instrument positions (ruler, compass, etc.)
	instrumentRotations: Map<string, number>; // Tracks instrument rotations (compass, ruler, etc.)
	currentPosition: { x: number; y: number };
	compassRadius: number; // Current compass opening radius
	createdObjects: Set<string>;
	steps: Step[];
	warnings: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate angle in degrees from point 'from' to point 'to'
 * Returns angle in degrees (0 = right, 90 = down in screen coordinates)
 */
function calculateAngleToTarget(from: Position, to: Position): number {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	// atan2 returns radians, convert to degrees
	// In InstrumenPoche, angles are typically measured with 0 = horizontal right
	return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Get position of a point by its IEP id
 * Returns undefined if the point position is unknown
 */
function getPointPosition(ctx: ConversionContext, iepId: string): Position | undefined {
	return ctx.pointPositions.get(iepId);
}

/**
 * Get position of an instrument (ruler, compass, etc.)
 * Returns undefined if the instrument position is unknown
 */
function getInstrumentPosition(ctx: ConversionContext, instrument: string): Position | undefined {
	return ctx.instrumentPositions.get(instrument);
}

/**
 * Update the position of a point
 */
function setPointPosition(ctx: ConversionContext, iepId: string, pos: Position): void {
	ctx.pointPositions.set(iepId, { x: pos.x, y: pos.y });
}

/**
 * Update the position of an instrument
 */
function setInstrumentPosition(ctx: ConversionContext, instrument: string, pos: Position): void {
	ctx.instrumentPositions.set(instrument, { x: pos.x, y: pos.y });
}

/**
 * Get rotation of an instrument (compass, ruler, etc.)
 * Returns 0 if the instrument rotation is unknown
 */
function getInstrumentRotation(ctx: ConversionContext, instrument: string): number {
	return ctx.instrumentRotations.get(instrument) ?? 0;
}

/**
 * Update the rotation of an instrument
 */
function setInstrumentRotation(ctx: ConversionContext, instrument: string, angle: number): void {
	ctx.instrumentRotations.set(instrument, angle);
}

/**
 * Normalize angle delta to the shortest path [-180, 180]
 * This ensures rotations take the most direct route
 */
function normalizeAngleDelta(delta: number): number {
	// Normalize to [-360, 360] first
	let normalized = delta % 360;
	// Then adjust to [-180, 180]
	if (normalized > 180) normalized -= 360;
	if (normalized < -180) normalized += 360;
	return normalized;
}

// =============================================================================
// Color Conversion
// =============================================================================

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

	// Handle tempo as pause
	if (attrs.tempo && parseInt(attrs.tempo) > 0) {
		const pauseDuration = parseInt(attrs.tempo) * 50; // IEP tempo units to ms
		if (pauseDuration > 0 && pauseDuration < 30000) {
			ctx.steps.push({
				type: 'pause',
				duration: pauseDuration
			});
		}
	}
}

/**
 * Convert point-related actions
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

			const pointDef: ObjectDef = {
				kind: 'point',
				id,
				x,
				y,
				style: {
					color: convertColor(attrs.couleur),
					lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 2
				},
				pointStyle: 'dot',
				radius: 4
			};

			ctx.createdObjects.add(id);
			ctx.steps.push({ type: 'create', object: pointDef });
			break;
		}
		case 'nommer': {
			// Point naming - we can update the label
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId && attrs.nom) {
				// Create a text label near the point
				// Use XML offset attributes if provided, otherwise default offset
				const offsetX = attrs.abscisse ? parseFloat(attrs.abscisse) : 10;
				const offsetY = attrs.ordonnee ? parseFloat(attrs.ordonnee) : -10;
				const labelId = generateObjectId(ctx, 'label', `${attrs.id}_label`);
				const textDef: ObjectDef = {
					kind: 'text',
					id: labelId,
					content: attrs.nom,
					x: `$${pointId}.x + ${offsetX}`,
					y: `$${pointId}.y + ${offsetY}`,
					fontSize: 14,
					style: {
						color: convertColor(attrs.couleur)
					}
				};
				ctx.createdObjects.add(labelId);
				ctx.steps.push({ type: 'create', object: textDef });
			}
			break;
		}
		case 'translation': {
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId && attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Update tracked position for the point
				if (attrs.id) {
					setPointPosition(ctx, attrs.id, { x: newX, y: newY });
				}
				const action: ActionDef = {
					kind: 'moveTo',
					target: pointId,
					x: newX,
					y: newY,
					duration: attrs.vitesse ? (1000 / parseFloat(attrs.vitesse)) * 100 : 500
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'masquer': {
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId) {
				const action: ActionDef = {
					kind: 'hide',
					target: pointId
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'montrer': {
			const pointId = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'P', attrs.id)
				: undefined;
			if (pointId) {
				const action: ActionDef = {
					kind: 'show',
					target: pointId
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
	}
}

/**
 * Convert text-related actions
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
			let text = attrs.texte || '';
			text = text
				.replace(/£lt£/g, '<')
				.replace(/£gt£/g, '>')
				.replace(/£guillemet£/g, '"')
				.replace(/£i\(/g, '(')
				.replace(/\)/g, ')')
				.replace(/<br£gt£/g, '\n')
				.replace(/<[^>]+>/g, ''); // Remove HTML tags for simplicity

			if (!ctx.createdObjects.has(id)) {
				const textDef: ObjectDef = {
					kind: 'text',
					id,
					content: text,
					x: ctx.currentPosition.x,
					y: ctx.currentPosition.y,
					fontSize: attrs.taille ? parseInt(attrs.taille) : 16,
					style: {
						color: convertColor(attrs.couleur)
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'create', object: textDef });
			}
			break;
		}
		case 'masquer': {
			const id = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'T', attrs.id)
				: undefined;
			if (id) {
				const action: ActionDef = { kind: 'hide', target: id };
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'translation': {
			const id = attrs.id
				? ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'T', attrs.id)
				: undefined;
			if (id && attrs.abscisse && attrs.ordonnee) {
				const action: ActionDef = {
					kind: 'moveTo',
					target: id,
					x: parseFloat(attrs.abscisse),
					y: parseFloat(attrs.ordonnee),
					duration: attrs.vitesse ? (1000 / parseFloat(attrs.vitesse)) * 100 : 500
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
	}
}

/**
 * Convert pencil/crayon actions
 */
function convertPencilAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'translation': {
			// Move pencil position
			if (attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				ctx.currentPosition = { x: newX, y: newY };

				// Also translate the pencil instrument
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'pencil',
					x: newX,
					y: newY,
					duration: attrs.vitesse ? Math.max(100, (1000 / parseFloat(attrs.vitesse)) * 100) : 200
				};
				ctx.steps.push({ type: 'action', action });
			} else if (attrs.cible) {
				// Move pencil to target point
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				const targetPos = getPointPosition(ctx, attrs.cible);
				if (targetPos) {
					ctx.currentPosition = { x: targetPos.x, y: targetPos.y };
				}
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'pencil',
					x: `$${targetId}.x`,
					y: `$${targetId}.y`,
					duration: attrs.vitesse ? Math.max(100, (1000 / parseFloat(attrs.vitesse)) * 100) : 200
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'tracer': {
			// Draw a line from current position to target
			const id = generateObjectId(ctx, 'seg', attrs.id);
			// Register mapping so hide/show actions can find this object later
			if (attrs.id) {
				ctx.pointMap.set(attrs.id, id);
			}
			const startX = ctx.currentPosition.x;
			const startY = ctx.currentPosition.y;
			const endX = attrs.abscisse ? parseFloat(attrs.abscisse) : startX;
			const endY = attrs.ordonnee ? parseFloat(attrs.ordonnee) : startY;

			// Handle polygon shapes
			if (attrs.forme === 'polygone' && attrs.abscisses && attrs.ordonnees) {
				let xCoords = attrs.abscisses.split(',').map((n) => parseFloat(n));
				let yCoords = attrs.ordonnees.split(',').map((n) => parseFloat(n));

				// SECURITY: Limit array size to prevent DoS
				const MAX_VERTICES = 100;
				if (xCoords.length > MAX_VERTICES) {
					ctx.warnings.push(
						`Polygon ${id} has too many vertices (${xCoords.length}), truncating to ${MAX_VERTICES}`
					);
					xCoords = xCoords.slice(0, MAX_VERTICES);
					yCoords = yCoords.slice(0, MAX_VERTICES);
				}

				const polygonDef: ObjectDef = {
					kind: 'polygon',
					id,
					vertices: xCoords.map((x, i) => ({ x, y: yCoords[i] })),
					filled: attrs.opacite ? parseFloat(attrs.opacite) > 0 : false,
					style: {
						color: convertColor(attrs.couleur),
						lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
						lineStyle: convertLineStyle(attrs.pointille),
						opacity: attrs.opacite ? parseFloat(attrs.opacite) / 100 : 1
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'create', object: polygonDef });
			} else if (attrs.forme === 'libre' && attrs.abscisses && attrs.ordonnees) {
				// Free-form drawing - convert to polygon (simplified)
				const xCoords = attrs.abscisses.split(',').map((n) => parseFloat(n));
				const yCoords = attrs.ordonnees.split(',').map((n) => parseFloat(n));

				// Create as a series of segments or simplify to first and last
				if (xCoords.length >= 2) {
					const segmentDef: ObjectDef = {
						kind: 'segment',
						id,
						from: { x: xCoords[0], y: yCoords[0] },
						to: { x: xCoords[xCoords.length - 1], y: yCoords[yCoords.length - 1] },
						style: {
							color: convertColor(attrs.couleur),
							lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
							lineStyle: convertLineStyle(attrs.pointille)
						}
					};
					ctx.createdObjects.add(id);
					ctx.steps.push({ type: 'create', object: segmentDef });
				}
			} else if (attrs.forme === 'demidroite') {
				// Half-line (ray)
				const rayDef: ObjectDef = {
					kind: 'ray',
					id,
					from: { x: startX, y: startY },
					through: { x: endX, y: endY },
					style: {
						color: convertColor(attrs.couleur),
						lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
						lineStyle: convertLineStyle(attrs.pointille)
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'create', object: rayDef });
			} else if (attrs.cible) {
				// Draw to a target point - use drawLine for synchronized animation
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				// For target points, we need the target position for duration calculation
				// Use a default duration since we don't have the target coords yet
				const PENCIL_SPEED = 300;
				const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
				const traceDuration = Math.max(100, Math.round((distance / PENCIL_SPEED) * 1000));

				const drawLineAction: ActionDef = {
					kind: 'drawLine',
					from: { x: startX, y: startY },
					to: targetId,
					duration: traceDuration,
					createObject: {
						id,
						style: {
							color: convertColor(attrs.couleur),
							lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
							lineStyle: convertLineStyle(attrs.pointille)
						}
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'action', action: drawLineAction });
			} else {
				// Simple segment - use drawLine for synchronized pencil + segment animation
				const PENCIL_SPEED = 300; // pixels per second
				const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
				const traceDuration = Math.max(100, Math.round((distance / PENCIL_SPEED) * 1000));

				const drawLineAction: ActionDef = {
					kind: 'drawLine',
					from: { x: startX, y: startY },
					to: { x: endX, y: endY },
					duration: traceDuration,
					createObject: {
						id,
						style: {
							color: convertColor(attrs.couleur),
							lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
							lineStyle: convertLineStyle(attrs.pointille)
						}
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'action', action: drawLineAction });
			}

			// Update current position and pencil tracking
			ctx.currentPosition = { x: endX, y: endY };
			setInstrumentPosition(ctx, 'pencil', { x: endX, y: endY });
			break;
		}
		case 'montrer': {
			// CRITICAL: Update position if provided - this sets the starting point for tracer
			if (attrs.abscisse !== undefined && attrs.ordonnee !== undefined) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				ctx.currentPosition = { x: newX, y: newY };
				setInstrumentPosition(ctx, 'pencil', { x: newX, y: newY });
				// Generate moveTo action to position the pencil
				const moveAction: ActionDef = {
					kind: 'moveTo',
					target: 'pencil',
					x: newX,
					y: newY,
					duration: 0 // Instant positioning
				};
				ctx.steps.push({ type: 'action', action: moveAction });
			}
			const action: ActionDef = { kind: 'show', target: 'pencil' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'masquer': {
			const action: ActionDef = { kind: 'hide', target: 'pencil' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
	}
}

/**
 * Convert ruler actions
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
				setInstrumentPosition(ctx, 'ruler', { x: newX, y: newY });
				// Generate moveTo action to position the ruler
				const moveAction: ActionDef = {
					kind: 'moveTo',
					target: 'ruler',
					x: newX,
					y: newY,
					duration: 0 // Instant positioning
				};
				ctx.steps.push({ type: 'action', action: moveAction });
			}
			const action: ActionDef = { kind: 'show', target: 'ruler' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'masquer': {
			const action: ActionDef = { kind: 'hide', target: 'ruler' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'translation': {
			if (attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Track ruler position for rotation calculations
				setInstrumentPosition(ctx, 'ruler', { x: newX, y: newY });
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'ruler',
					x: newX,
					y: newY,
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			} else if (attrs.cible) {
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				// Update ruler position to target point's position
				const targetPos = getPointPosition(ctx, attrs.cible);
				if (targetPos) {
					setInstrumentPosition(ctx, 'ruler', targetPos);
				}
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'ruler',
					x: `$${targetId}.x`,
					y: `$${targetId}.y`,
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'rotation': {
			if (attrs.angle) {
				// attrs.angle is an ABSOLUTE angle in InstrumenPoche, not a delta
				// We need to convert it to a delta for our engine
				const targetAngle = parseFloat(attrs.angle);
				const currentRotation = getInstrumentRotation(ctx, 'ruler');
				const deltaAngle = normalizeAngleDelta(targetAngle - currentRotation);
				const action: ActionDef = {
					kind: 'rotate',
					target: 'ruler',
					angle: deltaAngle,
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
				// Track the new rotation
				setInstrumentRotation(ctx, 'ruler', targetAngle);
			} else if (attrs.cible) {
				// Rotate towards a target point - calculate the absolute angle then delta
				const rulerPos = getInstrumentPosition(ctx, 'ruler');
				const targetPos = getPointPosition(ctx, attrs.cible);

				if (rulerPos && targetPos) {
					const targetAngle = calculateAngleToTarget(rulerPos, targetPos);
					const currentRotation = getInstrumentRotation(ctx, 'ruler');
					const deltaAngle = normalizeAngleDelta(targetAngle - currentRotation);
					const action: ActionDef = {
						kind: 'rotate',
						target: 'ruler',
						angle: deltaAngle,
						duration: 500
					};
					ctx.steps.push({ type: 'action', action });
					// Track the new rotation
					setInstrumentRotation(ctx, 'ruler', targetAngle);
				} else {
					// Cannot calculate angle - add warning with details
					const missing: string[] = [];
					if (!rulerPos) missing.push('ruler position');
					if (!targetPos) missing.push(`target point "${attrs.cible}" position`);
					ctx.warnings.push(
						`Ruler rotation towards "${attrs.cible}": cannot calculate angle (unknown: ${missing.join(', ')})`
					);
				}
			}
			break;
		}
		case 'zoom': {
			// Scale the ruler
			if (attrs.echelle) {
				const action: ActionDef = {
					kind: 'scale',
					target: 'ruler',
					factor: parseFloat(attrs.echelle) / 100,
					duration: 300
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'vide':
		case 'graduations': {
			// These are ruler display modes - note for documentation
			ctx.steps.push({
				type: 'comment',
				text: `Ruler mode: ${mouvement}`
			});
			break;
		}
	}
}

/**
 * Convert compass actions
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
				setInstrumentPosition(ctx, 'compass', { x: newX, y: newY });
				// Generate moveTo action to position the compass
				const moveAction: ActionDef = {
					kind: 'moveTo',
					target: 'compass',
					x: newX,
					y: newY,
					duration: 0 // Instant positioning
				};
				ctx.steps.push({ type: 'action', action: moveAction });
			}
			const action: ActionDef = { kind: 'show', target: 'compass' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'masquer': {
			const action: ActionDef = { kind: 'hide', target: 'compass' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'translation': {
			if (attrs.abscisse && attrs.ordonnee) {
				const newX = parseFloat(attrs.abscisse);
				const newY = parseFloat(attrs.ordonnee);
				// Track compass position for rotation calculations
				setInstrumentPosition(ctx, 'compass', { x: newX, y: newY });
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'compass',
					x: newX,
					y: newY,
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			} else if (attrs.cible) {
				const targetId = ctx.pointMap.get(attrs.cible) || generateObjectId(ctx, 'P', attrs.cible);
				// Update compass position to target point's position
				const targetPos = getPointPosition(ctx, attrs.cible);
				if (targetPos) {
					setInstrumentPosition(ctx, 'compass', targetPos);
				}
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'compass',
					x: `$${targetId}.x`,
					y: `$${targetId}.y`,
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'rotation': {
			if (attrs.angle) {
				// attrs.angle is a delta rotation in InstrumenPoche
				// Normalize to shortest path
				const deltaAngle = normalizeAngleDelta(parseFloat(attrs.angle));
				const action: ActionDef = {
					kind: 'rotate',
					target: 'compass',
					angle: deltaAngle,
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
				// Track the new rotation (use unnormalized to maintain accurate absolute position)
				const currentRotation = getInstrumentRotation(ctx, 'compass');
				setInstrumentRotation(ctx, 'compass', currentRotation + parseFloat(attrs.angle));
			} else if (attrs.cible) {
				// Rotate towards a target point - calculate the absolute angle then delta
				const compassPos = getInstrumentPosition(ctx, 'compass');
				const targetPos = getPointPosition(ctx, attrs.cible);

				if (compassPos && targetPos) {
					const targetAngle = calculateAngleToTarget(compassPos, targetPos);
					const currentRotation = getInstrumentRotation(ctx, 'compass');
					// Normalize delta to take the shortest path
					const deltaAngle = normalizeAngleDelta(targetAngle - currentRotation);
					const action: ActionDef = {
						kind: 'rotate',
						target: 'compass',
						angle: deltaAngle,
						duration: 500
					};
					ctx.steps.push({ type: 'action', action });
					// Track the new rotation (update to actual target angle)
					setInstrumentRotation(ctx, 'compass', currentRotation + deltaAngle);
				} else {
					// Cannot calculate angle - add warning with details
					const missing: string[] = [];
					if (!compassPos) missing.push('compass position');
					if (!targetPos) missing.push(`target point "${attrs.cible}" position`);
					ctx.warnings.push(
						`Compass rotation towards "${attrs.cible}": cannot calculate angle (unknown: ${missing.join(', ')})`
					);
				}
			}
			break;
		}
		case 'ecarter': {
			// Set compass opening
			if (attrs.ecart) {
				const radius = parseFloat(attrs.ecart);
				ctx.compassRadius = radius; // Store for arc creation
				const action: ActionDef = {
					kind: 'setCompass',
					radius: radius,
					duration: 300
				};
				ctx.steps.push({ type: 'action', action });
			} else if (attrs.cible) {
				// Open to match distance to target point
				const compassPos = getInstrumentPosition(ctx, 'compass');
				const targetPos = getPointPosition(ctx, attrs.cible);

				if (compassPos && targetPos) {
					// Calculate Euclidean distance from compass center to target
					const distance = Math.sqrt(
						(targetPos.x - compassPos.x) ** 2 + (targetPos.y - compassPos.y) ** 2
					);
					const radius = Math.round(distance * 100) / 100; // Round to 2 decimals
					ctx.compassRadius = radius; // Store for arc creation
					const action: ActionDef = {
						kind: 'setCompass',
						radius: radius,
						duration: 300
					};
					ctx.steps.push({ type: 'action', action });
				} else {
					// Cannot calculate distance - add detailed warning
					const missing: string[] = [];
					if (!compassPos) missing.push('compass position');
					if (!targetPos) missing.push(`target point "${attrs.cible}" position`);
					ctx.warnings.push(
						`Compass opening to "${attrs.cible}": cannot calculate radius (unknown: ${missing.join(', ')})`
					);
				}
			}
			break;
		}
		case 'lever':
		case 'coucher': {
			// Compass up/down - these are animation states
			ctx.steps.push({
				type: 'comment',
				text: `Compass ${mouvement === 'lever' ? 'raised' : 'lowered'}`
			});
			break;
		}
		case 'tracer': {
			// Draw arc with compass
			const id = generateObjectId(ctx, 'arc', attrs.id);
			// Register mapping so hide/show actions can find this object later
			if (attrs.id) {
				ctx.pointMap.set(attrs.id, id);
			}
			const startAngle = attrs.debut ? parseFloat(attrs.debut) : 0;
			const endAngle = attrs.fin ? parseFloat(attrs.fin) : 360;

			// CRITICAL: Use compass position, NOT ctx.currentPosition (which holds text positions)
			const compassPos = getInstrumentPosition(ctx, 'compass');
			const centerX = compassPos?.x ?? ctx.currentPosition.x;
			const centerY = compassPos?.y ?? ctx.currentPosition.y;

			// Get current compass rotation and calculate DELTA angles
			// UbuMaths engine interprets rotation as delta, not absolute
			const currentRotation = getInstrumentRotation(ctx, 'compass');
			// Normalize delta to start to take shortest path
			const deltaToStart = normalizeAngleDelta(startAngle - currentRotation);
			// Arc sweep delta - this should NOT be normalized as it defines the arc direction
			const deltaToEnd = endAngle - startAngle;

			// Calculate arc sweep and duration for compass rotation
			const arcSweep = Math.abs(endAngle - startAngle);
			const arcDuration = Math.max(500, Math.round((arcSweep / 360) * 2000)); // 2 seconds for full circle

			// First, rotate compass to start angle (using normalized delta for shortest path)
			if (Math.abs(deltaToStart) > 0.1) {
				const rotateToStartAction: ActionDef = {
					kind: 'rotate',
					target: 'compass',
					angle: deltaToStart,
					duration: 300
				};
				ctx.steps.push({ type: 'action', action: rotateToStartAction });
				setInstrumentRotation(ctx, 'compass', currentRotation + deltaToStart);
			}

			// Use drawArc action for synchronized compass + arc animation
			const drawArcAction: ActionDef = {
				kind: 'drawArc',
				center: { x: centerX, y: centerY },
				radius: ctx.compassRadius,
				startAngle,
				endAngle,
				duration: arcDuration,
				createObject: {
					id,
					style: {
						color: convertColor(attrs.couleur),
						lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1
					}
				}
			};
			ctx.createdObjects.add(id);
			ctx.steps.push({ type: 'action', action: drawArcAction });
			setInstrumentRotation(ctx, 'compass', currentRotation + deltaToStart + deltaToEnd);
			break;
		}
		case 'retourner': {
			// Flip compass
			ctx.steps.push({
				type: 'comment',
				text: 'Compass flipped'
			});
			break;
		}
	}
}

/**
 * Convert set square (equerre) actions
 */
function convertSetSquareAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	switch (mouvement) {
		case 'montrer': {
			const action: ActionDef = { kind: 'show', target: 'setSquare' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'masquer': {
			const action: ActionDef = { kind: 'hide', target: 'setSquare' };
			ctx.steps.push({ type: 'action', action });
			break;
		}
		case 'translation': {
			if (attrs.abscisse && attrs.ordonnee) {
				const action: ActionDef = {
					kind: 'moveTo',
					target: 'setSquare',
					x: parseFloat(attrs.abscisse),
					y: parseFloat(attrs.ordonnee),
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
	}
}

/**
 * Convert length mark actions
 */
function convertLengthMarkAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	if (mouvement === 'creer') {
		// Length marks are small tick marks on segments
		// Convert to a small segment or text
		const id = generateObjectId(ctx, 'mark', attrs.id);
		// Register mapping so hide/show actions can find this object later
		if (attrs.id) {
			ctx.pointMap.set(attrs.id, id);
		}
		const x = attrs.abscisse ? parseFloat(attrs.abscisse) : 0;
		const y = attrs.ordonnee ? parseFloat(attrs.ordonnee) : 0;

		// Create a small cross mark
		const markDef: ObjectDef = {
			kind: 'point',
			id,
			x,
			y,
			pointStyle: 'cross',
			radius: 5,
			style: {
				color: convertColor(attrs.couleur),
				lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1
			}
		};
		ctx.createdObjects.add(id);
		ctx.steps.push({ type: 'create', object: markDef });
	}
}

/**
 * Convert right angle mark actions
 */
function convertRightAngleAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	if (mouvement === 'creer') {
		const id = generateObjectId(ctx, 'rightAngle', attrs.id);
		// Register mapping so hide/show actions can find this object later
		if (attrs.id) {
			ctx.pointMap.set(attrs.id, id);
		}

		// Create an angle mark
		const angleDef: ObjectDef = {
			kind: 'angleMark',
			id,
			vertex: {
				x: attrs.abscisse_sommet ? parseFloat(attrs.abscisse_sommet) : 0,
				y: attrs.ordonnee_sommet ? parseFloat(attrs.ordonnee_sommet) : 0
			},
			point1: {
				x: attrs.abscisse_inter ? parseFloat(attrs.abscisse_inter) : 0,
				y: attrs.ordonnee_inter ? parseFloat(attrs.ordonnee_inter) : 0
			},
			point2: {
				x: attrs.abscisse_inter ? parseFloat(attrs.abscisse_inter) + 20 : 20,
				y: attrs.ordonnee_inter ? parseFloat(attrs.ordonnee_inter) : 0
			},
			rightAngle: true,
			radius: 15,
			style: {
				color: convertColor(attrs.couleur)
			}
		};
		ctx.createdObjects.add(id);
		ctx.steps.push({ type: 'create', object: angleDef });
	}
}

/**
 * Convert trait (line/segment) actions
 */
function convertTraitAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	if (mouvement === 'masquer' && attrs.id) {
		// Use the mapped ID if available, otherwise use the original ID with a prefix
		const targetId = ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'obj', attrs.id);
		const action: ActionDef = { kind: 'hide', target: targetId };
		ctx.steps.push({ type: 'action', action });
	} else if (mouvement === 'montrer' && attrs.id) {
		// Use the mapped ID if available, otherwise use the original ID with a prefix
		const targetId = ctx.pointMap.get(attrs.id) || generateObjectId(ctx, 'obj', attrs.id);
		const action: ActionDef = { kind: 'show', target: targetId };
		ctx.steps.push({ type: 'action', action });
	}
}

/**
 * Convert image actions
 */
function convertImageAction(
	attrs: IepAction['$'],
	mouvement: string,
	ctx: ConversionContext
): void {
	// Images are not directly supported in UbuMaths constructions
	// Add as a comment for reference
	if (mouvement === 'chargement' && attrs.url) {
		ctx.steps.push({
			type: 'comment',
			text: `Image: ${attrs.url}`
		});
		ctx.warnings.push(`Image loading not supported: ${attrs.url}`);
	}
}

/**
 * Convert mark actions (segment marks)
 */
function convertMarkAction(attrs: IepAction['$'], mouvement: string, ctx: ConversionContext): void {
	if (mouvement === 'creer') {
		const id = generateObjectId(ctx, 'mark', attrs.id);
		// Register mapping so hide/show actions can find this object later
		if (attrs.id) {
			ctx.pointMap.set(attrs.id, id);
		}
		const x = attrs.abscisse ? parseFloat(attrs.abscisse) : 0;
		const y = attrs.ordonnee ? parseFloat(attrs.ordonnee) : 0;

		const markDef: ObjectDef = {
			kind: 'point',
			id,
			x,
			y,
			pointStyle: 'cross',
			radius: attrs.rayon ? parseFloat(attrs.rayon) : 5,
			style: {
				color: convertColor(attrs.couleur),
				lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 2
			}
		};
		ctx.createdObjects.add(id);
		ctx.steps.push({ type: 'create', object: markDef });
	}
}

// =============================================================================
// Main Conversion Functions
// =============================================================================

/**
 * Convert a parsed InstrumenPoche XML document to UbuMaths format
 */
function convertDocument(
	doc: IepDocument,
	options?: ConversionOptions
): { script: ConstructionScript; warnings: string[] } {
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
		instrumentPositions: new Map(),
		instrumentRotations: new Map(),
		currentPosition: { x: 0, y: 0 },
		compassRadius: 100, // Default compass radius
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

	const script: ConstructionScript = {
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

	return { script, warnings: ctx.warnings };
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

		// Validate result
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
