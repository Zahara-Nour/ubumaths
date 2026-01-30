/**
 * Differentiability Analysis Step Descriptions
 *
 * French pedagogical descriptions for non-differentiability types, sources,
 * and analysis steps.
 *
 * @module mathAST/analysis/differentiability-steps
 */

import type {
	NonDifferentiabilityType,
	NonDifferentiabilitySource,
	DifferentiabilityRule,
	NonDifferentiablePoint,
	BoundaryBehavior,
	DerivativeLimit
} from './differentiability-types';
import type { MathNode } from '../types';
import { toCustom } from '../custom-generator';

// =============================================================================
// Non-Differentiability Type Descriptions
// =============================================================================

/**
 * French descriptions for non-differentiability types.
 */
export const NON_DIFFERENTIABILITY_TYPE_DESCRIPTIONS: Readonly<
	Record<NonDifferentiabilityType, string>
> = {
	angular: 'Point anguleux (dérivées à gauche et à droite différentes)',
	cusp: 'Point de rebroussement (dérivées infinies de même signe)',
	vertical_tangent: 'Tangente verticale (dérivées infinies de signes opposés)',
	discontinuity: 'Point de discontinuité (fonction non continue)',
	boundary: 'Borne du domaine (dérivée unilatérale uniquement)'
};

/**
 * Get a pedagogical description for a non-differentiability type.
 */
export function getNonDifferentiabilityTypeDescription(type: NonDifferentiabilityType): string {
	return NON_DIFFERENTIABILITY_TYPE_DESCRIPTIONS[type];
}

// =============================================================================
// Non-Differentiability Source Descriptions
// =============================================================================

/**
 * French descriptions for non-differentiability sources.
 */
export const NON_DIFFERENTIABILITY_SOURCE_DESCRIPTIONS: Readonly<
	Record<NonDifferentiabilitySource, string>
> = {
	// Inherited from DiscontinuitySource
	division: 'Division par zéro',
	sqrt: 'Racine carrée',
	ln: 'Logarithme népérien',
	log: 'Logarithme',
	tan: 'Tangente',
	cot: 'Cotangente',
	sec: 'Sécante',
	csc: 'Cosécante',
	abs: 'Valeur absolue',
	sign: 'Fonction signe',
	floor: 'Partie entière',
	ceil: 'Fonction plafond',
	piecewise: 'Fonction définie par morceaux',
	other: 'Autre source',
	// Differentiability-specific sources
	abs_composed: 'Valeur absolue composée |f(x)|',
	fractional_power_cusp: 'Puissance fractionnaire (rebroussement)',
	fractional_power_vertical: 'Puissance fractionnaire (tangente verticale)',
	sqrt_boundary: 'Borne de la racine carrée',
	ln_boundary: 'Borne du logarithme',
	power_boundary: 'Borne de la puissance'
};

/**
 * Get a pedagogical description for a non-differentiability source.
 */
export function getNonDifferentiabilitySourceDescription(
	source: NonDifferentiabilitySource
): string {
	return NON_DIFFERENTIABILITY_SOURCE_DESCRIPTIONS[source];
}

// =============================================================================
// Differentiability Rule Descriptions
// =============================================================================

/**
 * French descriptions for differentiability analysis rules/steps.
 */
export const DIFFERENTIABILITY_RULE_DESCRIPTIONS: Readonly<Record<DifferentiabilityRule, string>> =
	{
		'domain-computation': 'Calcul du domaine de définition',
		'continuity-analysis': 'Analyse de la continuité',
		'candidate-extraction': 'Identification des points candidats',
		'derivative-limit-evaluation': 'Évaluation des limites des dérivées',
		classification: 'Classification du type de non-dérivabilité',
		'boundary-analysis': 'Analyse des bornes du domaine',
		'periodic-detection': 'Détection du motif périodique'
	};

/**
 * Get a pedagogical description for a differentiability rule.
 */
export function getDifferentiabilityRuleDescription(rule: DifferentiabilityRule): string {
	return DIFFERENTIABILITY_RULE_DESCRIPTIONS[rule];
}

// =============================================================================
// Full Non-Differentiable Point Descriptions
// =============================================================================

/**
 * Generate a complete French description for a non-differentiable point.
 *
 * @param point - The non-differentiable point to describe
 * @param variable - The variable name (default: 'x')
 * @returns A pedagogical description in French
 */
export function describeNonDifferentiablePoint(
	point: NonDifferentiablePoint,
	variable: string = 'x'
): string {
	const pointStr = formatNode(point.point);
	const typeDesc = NON_DIFFERENTIABILITY_TYPE_DESCRIPTIONS[point.type];
	const sourceDesc = NON_DIFFERENTIABILITY_SOURCE_DESCRIPTIONS[point.source];

	let description = `${typeDesc} en ${variable} = ${pointStr}`;

	// Add source information
	description += ` (cause : ${sourceDesc.toLowerCase()})`;

	// Add derivative information based on type
	if (point.type === 'angular') {
		const leftStr = formatDerivativeLimit(point.leftDerivative);
		const rightStr = formatDerivativeLimit(point.rightDerivative);
		description += `.\nDérivée à gauche : ${leftStr}, dérivée à droite : ${rightStr}`;
	} else if (point.type === 'cusp') {
		description += '.\nLes dérivées unilatérales tendent vers +∞ des deux côtés';
	} else if (point.type === 'vertical_tangent') {
		const leftStr = formatDerivativeLimit(point.leftDerivative);
		const rightStr = formatDerivativeLimit(point.rightDerivative);
		description += `.\nDérivée à gauche : ${leftStr}, dérivée à droite : ${rightStr}`;
	} else if (point.type === 'discontinuity') {
		description += '.\nLa fonction est discontinue donc non dérivable';
	} else if (point.type === 'boundary') {
		const side = point.leftDerivative !== 'undefined' ? 'gauche' : 'droite';
		const derivStr = formatDerivativeLimit(
			point.leftDerivative !== 'undefined' ? point.leftDerivative : point.rightDerivative
		);
		description += `.\nSeule la dérivée à ${side} existe : ${derivStr}`;
	}

	// Add continuity information
	if (point.isContinuous && point.type !== 'discontinuity') {
		description += '.\nLa fonction reste continue en ce point';
	}

	// Add periodic information
	if (point.periodic) {
		description += `.\n${point.periodic.description}`;
	}

	return description;
}

/**
 * Generate a short description for a non-differentiable point (one line).
 */
export function describeNonDifferentiablePointShort(
	point: NonDifferentiablePoint,
	variable: string = 'x'
): string {
	const pointStr = formatNode(point.point);
	const typeLabel = getShortTypeLabel(point.type);

	return `${variable} = ${pointStr} : ${typeLabel}`;
}

/**
 * Get a short label for a non-differentiability type.
 */
function getShortTypeLabel(type: NonDifferentiabilityType): string {
	switch (type) {
		case 'angular':
			return 'point anguleux';
		case 'cusp':
			return 'rebroussement';
		case 'vertical_tangent':
			return 'tangente verticale';
		case 'discontinuity':
			return 'discontinuité';
		case 'boundary':
			return 'borne du domaine';
	}
}

// =============================================================================
// Boundary Behavior Descriptions
// =============================================================================

/**
 * Generate a description for boundary behavior.
 *
 * @param boundary - The boundary behavior to describe
 * @param variable - The variable name (default: 'x')
 * @returns French description of the boundary behavior
 */
export function describeBoundary(boundary: BoundaryBehavior, variable: string = 'x'): string {
	const pointStr = formatNode(boundary.point);
	const sideStr = boundary.side === 'left' ? 'gauche' : 'droite';
	const limitStr = formatDerivativeLimit(boundary.derivativeLimit);

	return `En ${variable} = ${pointStr} (borne du domaine), la dérivée à ${sideStr} vaut ${limitStr}`;
}

// =============================================================================
// Periodic Pattern Descriptions
// =============================================================================

/**
 * Generate a description for a periodic non-differentiability pattern.
 *
 * @param basePoint - The base point (e.g., 0 for |sin(x)|)
 * @param period - The period (e.g., pi)
 * @param source - The source function
 * @returns French description of the periodic pattern
 */
export function describePeriodicNonDifferentiability(
	basePoint: MathNode,
	period: MathNode,
	source: NonDifferentiabilitySource
): string {
	const baseStr = formatNode(basePoint);
	const periodStr = formatNode(period);

	const sourceName = getSourceFunctionName(source);

	return `La fonction ${sourceName} présente des points de non-dérivabilité en ${baseStr} + k·${periodStr} pour tout k ∈ ℤ`;
}

/**
 * Get the function name for a non-differentiability source.
 */
function getSourceFunctionName(source: NonDifferentiabilitySource): string {
	switch (source) {
		case 'abs':
		case 'abs_composed':
			return 'valeur absolue';
		case 'sqrt':
		case 'sqrt_boundary':
			return 'racine carrée';
		case 'ln':
		case 'ln_boundary':
			return 'logarithme';
		case 'fractional_power_cusp':
		case 'fractional_power_vertical':
		case 'power_boundary':
			return 'puissance';
		default:
			return source;
	}
}

// =============================================================================
// Summary Descriptions
// =============================================================================

/**
 * Generate a summary of differentiability analysis results.
 */
export function summarizeDifferentiabilityResult(
	nonDifferentiablePoints: readonly NonDifferentiablePoint[],
	isDifferentiableOnDomain: boolean,
	_variable: string = 'x'
): string {
	if (nonDifferentiablePoints.length === 0) {
		return 'La fonction est dérivable sur tout son domaine de définition.';
	}

	const count = nonDifferentiablePoints.length;
	const plural = count > 1 ? 's' : '';

	let summary = `${count} point${plural} de non-dérivabilité détecté${plural}`;

	// Group by type
	const byType = groupByType(nonDifferentiablePoints);
	const typeDescriptions: string[] = [];

	if (byType.angular > 0) {
		typeDescriptions.push(`${byType.angular} point${byType.angular > 1 ? 's' : ''} anguleux`);
	}
	if (byType.cusp > 0) {
		typeDescriptions.push(`${byType.cusp} rebroussement${byType.cusp > 1 ? 's' : ''}`);
	}
	if (byType.vertical_tangent > 0) {
		typeDescriptions.push(
			`${byType.vertical_tangent} tangente${byType.vertical_tangent > 1 ? 's' : ''} verticale${byType.vertical_tangent > 1 ? 's' : ''}`
		);
	}
	if (byType.discontinuity > 0) {
		typeDescriptions.push(
			`${byType.discontinuity} discontinuité${byType.discontinuity > 1 ? 's' : ''}`
		);
	}
	if (byType.boundary > 0) {
		typeDescriptions.push(`${byType.boundary} borne${byType.boundary > 1 ? 's' : ''} du domaine`);
	}

	if (typeDescriptions.length > 0) {
		summary += ` : ${typeDescriptions.join(', ')}`;
	}

	summary += '.';

	if (isDifferentiableOnDomain) {
		summary += '\nLa fonction reste dérivable sur son domaine de définition.';
	} else {
		summary += `\nLa fonction présente des points de non-dérivabilité à l'intérieur de son domaine.`;
	}

	return summary;
}

/**
 * Group non-differentiable points by type.
 */
function groupByType(
	points: readonly NonDifferentiablePoint[]
): Record<NonDifferentiabilityType, number> {
	const result: Record<NonDifferentiabilityType, number> = {
		angular: 0,
		cusp: 0,
		vertical_tangent: 0,
		discontinuity: 0,
		boundary: 0
	};

	for (const point of points) {
		result[point.type]++;
	}

	return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a MathNode to a string for display.
 */
function formatNode(node: MathNode): string {
	try {
		return toCustom(node);
	} catch {
		// Fallback for nodes that can't be formatted
		if (node.type === 'number') {
			return node.value;
		}
		if (node.type === 'symbol' && node.symbol === 'infinity') {
			return '∞';
		}
		if (node.type === 'infinity') {
			return node.sign === 'positive' ? '+∞' : '-∞';
		}
		return '?';
	}
}

/**
 * Format a derivative limit for display.
 */
function formatDerivativeLimit(limit: DerivativeLimit): string {
	if (limit === 'infinite') {
		return '+∞';
	}
	if (limit === '-infinite') {
		return '-∞';
	}
	if (limit === 'undefined') {
		return "n'existe pas";
	}
	return formatNode(limit);
}
