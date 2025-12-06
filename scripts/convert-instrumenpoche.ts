/**
 * InstrumenPoche XML to UbuMaths JSON Converter
 *
 * Converts InstrumenPoche XML construction scripts to UbuMaths ConstructionScript format.
 *
 * Usage:
 *   npx tsx scripts/convert-instrumenpoche.ts [--output json|sql|both]
 *
 * Input: extern/instrumenpoche-main/devServer/fixtures/*.xml
 * Output: Generated JSON files or SQL INSERT statements
 *
 * @author Claude Code
 * @date 2025-12-06
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parseStringPromise } from 'xml2js';
import type {
	ConstructionScript,
	Step,
	ObjectDef,
	ActionDef
} from '../src/lib/constructions/types';

// =============================================================================
// Configuration
// =============================================================================

const FIXTURES_DIR = path.join(process.cwd(), 'extern/instrumenpoche-main/devServer/fixtures');
const OUTPUT_DIR = path.join(process.cwd(), 'scripts/output/constructions');
const MIGRATION_DIR = path.join(process.cwd(), 'supabase/migrations');

/**
 * Descriptive titles for each construction example
 * Extracted from the XML content and comments
 */
const CONSTRUCTION_TITLES: Record<string, { title: string; description: string }> = {
	'0': {
		title: 'Calcul mental : Ajouter 19',
		description:
			'Animation explicative pour le calcul mental. Technique: ajouter 20 puis soustraire 1.'
	},
	'1': {
		title: "Partage d'un segment en 3 parts egales",
		description:
			'Construction geometrique avec regle et compas pour diviser un segment [AB] en trois parties egales.'
	},
	'2': {
		title: 'Calcul mental : Soustraire 99',
		description:
			'Animation explicative pour le calcul mental. Technique: soustraire 100 puis ajouter 1.'
	},
	'3': {
		title: "Axes de symetrie et construction d'un carre",
		description:
			"Construction d'un carre a partir de ses diagonales, avec mise en evidence des axes de symetrie."
	},
	'4': {
		title: 'Exemple MathJax/LaTeX',
		description: "Demonstration de l'affichage de formules mathematiques avec MathJax."
	},
	'5': {
		title: 'Exercice de reperage de points',
		description: 'Exercice interactif pour relier des points dans un repere.'
	},
	'6': {
		title: "Construction d'un parallelogramme",
		description:
			"Construction d'un parallelogramme a partir de ses diagonales avec regle et compas."
	},
	'7': {
		title: 'Symetrie centrale au compas',
		description:
			"Construction du symetrique d'un point par rapport a un centre avec la methode des deux arcs."
	},
	'8': {
		title: 'Segment avec marque',
		description: "Construction simple d'un segment avec une marque de codage."
	}
};

// =============================================================================
// Type Definitions for InstrumenPoche XML
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

interface IepComment {
	$: {
		texteCommentaire?: string;
		texte?: string;
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
		commentaire?: IepComment[];
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
	currentPosition: { x: number; y: number };
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

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert InstrumenPoche color to CSS color
 */
function convertColor(iepColor: string | undefined): string {
	if (!iepColor) return '#000000';

	// Handle hex colors with 0x prefix
	if (iepColor.startsWith('0x')) {
		const hex = iepColor.slice(2).padStart(6, '0');
		return `#${hex}`;
	}

	// Handle named colors
	const colorMap: Record<string, string> = {
		noir: '#000000',
		blanc: '#FFFFFF',
		rouge: '#FF0000',
		bleu: '#0000FF',
		blue: '#0000FF',
		vert: '#00FF00',
		green: '#008000',
		jaune: '#FFFF00',
		orange: '#FFA500',
		violet: '#8B00FF',
		rose: '#FF69B4',
		gris: '#808080',
		grey: '#808080',
		marron: '#8B4513',
		forestgreen: '#228B22',
		darkgreen: '#006400',
		darkred: '#8B0000',
		goldenrod: '#DAA520'
	};

	const lowerColor = iepColor.toLowerCase();
	if (colorMap[lowerColor]) return colorMap[lowerColor];

	// If it looks like a hex color already
	if (iepColor.startsWith('#')) return iepColor;

	// Try CSS named color as-is
	return iepColor;
}

/**
 * Convert line style
 */
function convertLineStyle(pointille: string | undefined): 'solid' | 'dashed' | 'dotted' {
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
 */
function generateObjectId(ctx: ConversionContext, prefix: string, iepId?: string): string {
	if (iepId) {
		// Clean up IEP id to be valid for UbuMaths
		const cleanId = iepId.replace(/[^a-zA-Z0-9_]/g, '_');
		if (/^[a-zA-Z]/.test(cleanId) && !ctx.createdObjects.has(cleanId)) {
			return cleanId;
		}
	}
	ctx.objectIdCounter++;
	return `${prefix}${ctx.objectIdCounter}`;
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
			const pointId = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : undefined;
			if (pointId && attrs.nom) {
				// Create a text label near the point
				const labelId = generateObjectId(ctx, 'label', `${attrs.id}_label`);
				const textDef: ObjectDef = {
					kind: 'text',
					id: labelId,
					content: attrs.nom,
					x: `$${pointId}.x + 10`,
					y: `$${pointId}.y - 10`,
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
			const pointId = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : undefined;
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
			const pointId = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : undefined;
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
			const pointId = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : undefined;
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
			const id = attrs.id || generateObjectId(ctx, 'T');
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
			const id = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : generateObjectId(ctx, 'T');

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
			const id = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : undefined;
			if (id) {
				const action: ActionDef = { kind: 'hide', target: id };
				ctx.steps.push({ type: 'action', action });
			}
			break;
		}
		case 'translation': {
			const id = attrs.id ? ctx.pointMap.get(attrs.id) || attrs.id : undefined;
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
				const targetId = ctx.pointMap.get(attrs.cible) || attrs.cible;
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
			const startX = ctx.currentPosition.x;
			const startY = ctx.currentPosition.y;
			const endX = attrs.abscisse ? parseFloat(attrs.abscisse) : startX;
			const endY = attrs.ordonnee ? parseFloat(attrs.ordonnee) : startY;

			// Handle polygon shapes
			if (attrs.forme === 'polygone' && attrs.abscisses && attrs.ordonnees) {
				const xCoords = attrs.abscisses.split(',').map((n) => parseFloat(n));
				const yCoords = attrs.ordonnees.split(',').map((n) => parseFloat(n));

				const polygonDef: ObjectDef = {
					kind: 'polygon',
					id,
					vertices: xCoords.map((x, i) => ({ x, y: yCoords[i] })),
					filled: attrs.opacite && parseFloat(attrs.opacite) > 0,
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
				// Draw to a target point
				const targetId = ctx.pointMap.get(attrs.cible) || attrs.cible;
				const segmentDef: ObjectDef = {
					kind: 'segment',
					id,
					from: { x: startX, y: startY },
					to: targetId,
					style: {
						color: convertColor(attrs.couleur),
						lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
						lineStyle: convertLineStyle(attrs.pointille)
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'create', object: segmentDef });
			} else {
				// Simple segment
				const segmentDef: ObjectDef = {
					kind: 'segment',
					id,
					from: { x: startX, y: startY },
					to: { x: endX, y: endY },
					style: {
						color: convertColor(attrs.couleur),
						lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1,
						lineStyle: convertLineStyle(attrs.pointille)
					}
				};
				ctx.createdObjects.add(id);
				ctx.steps.push({ type: 'create', object: segmentDef });
			}

			// Update current position
			ctx.currentPosition = { x: endX, y: endY };
			break;
		}
		case 'montrer': {
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
				const targetId = ctx.pointMap.get(attrs.cible) || attrs.cible;
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
				const action: ActionDef = {
					kind: 'rotate',
					target: 'ruler',
					angle: parseFloat(attrs.angle),
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			} else if (attrs.cible) {
				// Rotate towards a target point - calculate the angle
				const rulerPos = getInstrumentPosition(ctx, 'ruler');
				const targetPos = getPointPosition(ctx, attrs.cible);

				if (rulerPos && targetPos) {
					const angle = calculateAngleToTarget(rulerPos, targetPos);
					const action: ActionDef = {
						kind: 'rotate',
						target: 'ruler',
						angle: angle,
						duration: 500
					};
					ctx.steps.push({ type: 'action', action });
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
				const targetId = ctx.pointMap.get(attrs.cible) || attrs.cible;
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
				const action: ActionDef = {
					kind: 'rotate',
					target: 'compass',
					angle: parseFloat(attrs.angle),
					duration: 500
				};
				ctx.steps.push({ type: 'action', action });
			} else if (attrs.cible) {
				// Rotate towards a target point - calculate the angle
				const compassPos = getInstrumentPosition(ctx, 'compass');
				const targetPos = getPointPosition(ctx, attrs.cible);

				if (compassPos && targetPos) {
					const angle = calculateAngleToTarget(compassPos, targetPos);
					const action: ActionDef = {
						kind: 'rotate',
						target: 'compass',
						angle: angle,
						duration: 500
					};
					ctx.steps.push({ type: 'action', action });
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
				const action: ActionDef = {
					kind: 'setCompass',
					radius: parseFloat(attrs.ecart),
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
					const action: ActionDef = {
						kind: 'setCompass',
						radius: Math.round(distance * 100) / 100, // Round to 2 decimals
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
			const startAngle = attrs.debut ? parseFloat(attrs.debut) : 0;
			const endAngle = attrs.fin ? parseFloat(attrs.fin) : 360;

			// We need to know compass position and radius from context
			// For now, create a placeholder arc
			const arcDef: ObjectDef = {
				kind: 'arc',
				id,
				center: { x: ctx.currentPosition.x, y: ctx.currentPosition.y },
				radius: 100, // Default, should come from compass state
				startAngle,
				endAngle,
				style: {
					color: convertColor(attrs.couleur),
					lineWidth: attrs.epaisseur ? parseFloat(attrs.epaisseur) : 1
				}
			};
			ctx.createdObjects.add(id);
			ctx.steps.push({ type: 'create', object: arcDef });
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
		const action: ActionDef = { kind: 'hide', target: attrs.id };
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
 * Convert a single InstrumenPoche XML document to UbuMaths format
 */
function convertDocument(doc: IepDocument, filename: string): ConstructionScript {
	const iep = doc.INSTRUMENPOCHE;
	const actions = iep.action || [];
	const _comments = iep.commentaire || []; // Reserved for future use

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
		currentPosition: { x: 0, y: 0 },
		createdObjects: new Set(),
		steps: [],
		warnings: []
	};

	// Use predefined titles if available, otherwise extract from XML
	const predefined = CONSTRUCTION_TITLES[filename];
	const title = predefined?.title || `Construction ${filename}`;
	let description = predefined?.description || '';

	// Get author from XML attributes
	const author = iep.$.auteur?.trim() || 'InstrumenPoche';
	if (author && author !== 'InstrumenPoche') {
		description = description ? `${description} (Auteur: ${author})` : `Auteur: ${author}`;
	}

	// Convert each action
	for (const action of actions) {
		convertAction(action, ctx);
	}

	// Log warnings
	if (ctx.warnings.length > 0) {
		console.log(`\nWarnings for ${filename}:`);
		ctx.warnings.forEach((w) => console.log(`  - ${w}`));
	}

	return {
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
}

/**
 * Parse an InstrumenPoche XML file
 */
async function parseXmlFile(filePath: string): Promise<IepDocument> {
	const content = fs.readFileSync(filePath, 'utf-8');
	return parseStringPromise(content) as Promise<IepDocument>;
}

/**
 * Generate SQL INSERT statement for a construction
 */
function generateSqlInsert(script: ConstructionScript, index: number): string {
	const title = script.title?.replace(/'/g, "''") || `Construction ${index}`;
	const description = script.description?.replace(/'/g, "''") || '';
	const jsonStr = JSON.stringify(script).replace(/'/g, "''");

	return `INSERT INTO constructions (title, description, script, is_public, author_id)
VALUES (
  '${title}',
  ${description ? `'${description}'` : 'NULL'},
  '${jsonStr}'::jsonb,
  true,
  NULL
);`;
}

/**
 * Main conversion process
 */
async function main() {
	const args = process.argv.slice(2);
	const outputMode = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'both';

	console.log('InstrumenPoche to UbuMaths Converter\n');
	console.log(`Input directory: ${FIXTURES_DIR}`);
	console.log(`Output mode: ${outputMode}\n`);

	// Check if fixtures directory exists
	if (!fs.existsSync(FIXTURES_DIR)) {
		console.error(`Error: Fixtures directory not found: ${FIXTURES_DIR}`);
		process.exit(1);
	}

	// Find all XML files
	const xmlFiles = await glob(`${FIXTURES_DIR}/*.xml`);
	xmlFiles.sort((a, b) => {
		const numA = parseInt(path.basename(a, '.xml'));
		const numB = parseInt(path.basename(b, '.xml'));
		return numA - numB;
	});

	console.log(`Found ${xmlFiles.length} XML files\n`);

	const constructions: ConstructionScript[] = [];
	const metadata: Array<{ filename: string; title: string; stepCount: number }> = [];

	// Convert each file
	for (const xmlFile of xmlFiles) {
		const filename = path.basename(xmlFile, '.xml');
		console.log(`Converting: ${filename}.xml`);

		try {
			const doc = await parseXmlFile(xmlFile);
			const script = convertDocument(doc, filename);
			constructions.push(script);
			metadata.push({
				filename,
				title: script.title || filename,
				stepCount: script.steps.length
			});
			console.log(`  -> ${script.steps.length} steps generated`);
		} catch (error) {
			console.error(`  Error converting ${filename}:`, error);
		}
	}

	// Output results
	if (outputMode === 'json' || outputMode === 'both') {
		// Create output directory
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		// Write individual JSON files
		for (let i = 0; i < constructions.length; i++) {
			const filename = metadata[i].filename;
			const outputPath = path.join(OUTPUT_DIR, `${filename}.json`);
			fs.writeFileSync(outputPath, JSON.stringify(constructions[i], null, 2));
			console.log(`\nWritten: ${outputPath}`);
		}
	}

	if (outputMode === 'sql' || outputMode === 'both') {
		// Generate migration SQL
		const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
		const migrationPath = path.join(MIGRATION_DIR, `${timestamp}_seed_instrumenpoche_examples.sql`);

		const sqlStatements = [
			'-- Migration: Seed InstrumenPoche construction examples',
			'-- Auto-generated by convert-instrumenpoche.ts',
			'-- Source: extern/instrumenpoche-main/devServer/fixtures/',
			'',
			'-- These are example constructions converted from InstrumenPoche XML format',
			'-- They demonstrate various geometric construction techniques',
			''
		];

		for (let i = 0; i < constructions.length; i++) {
			sqlStatements.push(`-- ${metadata[i].title} (${metadata[i].stepCount} steps)`);
			sqlStatements.push(generateSqlInsert(constructions[i], i));
			sqlStatements.push('');
		}

		fs.writeFileSync(migrationPath, sqlStatements.join('\n'));
		console.log(`\nMigration written: ${migrationPath}`);
	}

	// Print summary
	console.log('\n=== Conversion Summary ===');
	console.log(`Total files converted: ${constructions.length}`);
	console.log('\nConstructions:');
	for (const m of metadata) {
		console.log(`  ${m.filename}: "${m.title}" (${m.stepCount} steps)`);
	}
}

// Run the converter
main().catch(console.error);
