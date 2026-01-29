/**
 * Continuity Analysis Step Descriptions
 *
 * French pedagogical descriptions for discontinuity types, sources,
 * and analysis steps.
 *
 * @module mathAST/analysis/continuity-steps
 */

import type {
	DiscontinuityType,
	DiscontinuitySource,
	ContinuityRule,
	Discontinuity
} from './continuity-types';
import type { MathNode } from '../types';
import { toCustom } from '../custom-generator';

// =============================================================================
// Discontinuity Type Descriptions
// =============================================================================

/**
 * French descriptions for discontinuity types.
 */
export const DISCONTINUITY_TYPE_DESCRIPTIONS: Readonly<Record<DiscontinuityType, string>> = {
	removable: 'Discontinuité par trou (prolongeable par continuité)',
	jump: 'Discontinuité de première espèce (saut)',
	infinite: 'Discontinuité infinie (asymptote verticale)',
	essential: 'Discontinuité essentielle (limite inexistante)'
};

/**
 * Get a pedagogical description for a discontinuity type.
 */
export function getDiscontinuityTypeDescription(type: DiscontinuityType): string {
	return DISCONTINUITY_TYPE_DESCRIPTIONS[type];
}

// =============================================================================
// Discontinuity Source Descriptions
// =============================================================================

/**
 * French descriptions for discontinuity sources.
 */
export const DISCONTINUITY_SOURCE_DESCRIPTIONS: Readonly<Record<DiscontinuitySource, string>> = {
	division: 'Division par zéro',
	sqrt: 'Borne du domaine de la racine carrée',
	ln: 'Borne du domaine du logarithme népérien',
	log: 'Borne du domaine du logarithme',
	tan: 'Tangente non définie',
	cot: 'Cotangente non définie',
	sec: 'Sécante non définie',
	csc: 'Cosécante non définie',
	abs: 'Point anguleux de la valeur absolue',
	sign: 'Saut de la fonction signe',
	floor: 'Saut de la fonction partie entière',
	ceil: 'Saut de la fonction plafond',
	piecewise: 'Jonction de morceaux',
	other: 'Autre source'
};

/**
 * Get a pedagogical description for a discontinuity source.
 */
export function getDiscontinuitySourceDescription(source: DiscontinuitySource): string {
	return DISCONTINUITY_SOURCE_DESCRIPTIONS[source];
}

// =============================================================================
// Continuity Rule Descriptions
// =============================================================================

/**
 * French descriptions for continuity analysis rules/steps.
 */
export const CONTINUITY_RULE_DESCRIPTIONS: Readonly<Record<ContinuityRule, string>> = {
	'domain-computation': 'Calcul du domaine de définition',
	'candidate-extraction': 'Identification des points candidats à une discontinuité',
	'limit-evaluation': 'Évaluation des limites unilatérales',
	'discontinuity-classification': 'Classification du type de discontinuité',
	'continuity-check': 'Vérification de la continuité au point',
	'periodic-detection': 'Détection du motif périodique'
};

/**
 * Get a pedagogical description for a continuity rule.
 */
export function getContinuityRuleDescription(rule: ContinuityRule): string {
	return CONTINUITY_RULE_DESCRIPTIONS[rule];
}

// =============================================================================
// Full Discontinuity Descriptions
// =============================================================================

/**
 * Generate a complete French description for a discontinuity.
 *
 * @param disc - The discontinuity to describe
 * @param variable - The variable name (default: 'x')
 * @returns A pedagogical description in French
 */
export function describeDiscontinuity(disc: Discontinuity, variable: string = 'x'): string {
	const pointStr = formatNode(disc.point);
	const typeDesc = DISCONTINUITY_TYPE_DESCRIPTIONS[disc.type];
	const sourceDesc = DISCONTINUITY_SOURCE_DESCRIPTIONS[disc.source];

	let description = `${typeDesc} en ${variable} = ${pointStr}`;

	// Add source information
	description += ` (cause : ${sourceDesc.toLowerCase()})`;

	// Add limit information based on type
	if (disc.type === 'jump' && disc.leftLimit && disc.rightLimit) {
		const leftStr = formatNode(disc.leftLimit);
		const rightStr = formatNode(disc.rightLimit);
		description += `.\nLimite à gauche : ${leftStr}, limite à droite : ${rightStr}`;
	} else if (disc.type === 'infinite') {
		if (disc.leftLimit) {
			description += `.\nLimite à gauche : ${formatNode(disc.leftLimit)}`;
		}
		if (disc.rightLimit) {
			description += disc.leftLimit ? ', ' : '.\n';
			description += `limite à droite : ${formatNode(disc.rightLimit)}`;
		}
	} else if (disc.type === 'removable' && disc.leftLimit) {
		const limitStr = formatNode(disc.leftLimit);
		description += `.\nLa limite existe et vaut ${limitStr}`;
		if (disc.functionValue === null) {
			description += `, mais la fonction n'est pas définie en ce point`;
		} else {
			description += `, mais f(${pointStr}) = ${formatNode(disc.functionValue)}`;
		}
	}

	// Add periodic information
	if (disc.periodic) {
		description += `.\n${disc.periodic.description}`;
	}

	return description;
}

/**
 * Generate a short description for a discontinuity (one line).
 */
export function describeDiscontinuityShort(disc: Discontinuity, variable: string = 'x'): string {
	const pointStr = formatNode(disc.point);
	const typeLabel = getShortTypeLabel(disc.type);

	return `${variable} = ${pointStr} : ${typeLabel}`;
}

/**
 * Get a short label for a discontinuity type.
 */
function getShortTypeLabel(type: DiscontinuityType): string {
	switch (type) {
		case 'removable':
			return 'trou';
		case 'jump':
			return 'saut';
		case 'infinite':
			return 'asymptote verticale';
		case 'essential':
			return 'discontinuité essentielle';
	}
}

// =============================================================================
// Periodic Pattern Descriptions
// =============================================================================

/**
 * Generate a description for a periodic discontinuity pattern.
 *
 * @param basePoint - The base point (e.g., π/2)
 * @param period - The period (e.g., π)
 * @param source - The source function (e.g., 'tan')
 * @returns French description of the periodic pattern
 */
export function describePeriodicPattern(
	basePoint: MathNode,
	period: MathNode,
	source: DiscontinuitySource
): string {
	const baseStr = formatNode(basePoint);
	const periodStr = formatNode(period);

	const sourceName = getSourceFunctionName(source);

	return `La fonction ${sourceName} présente des discontinuités en ${baseStr} + k·${periodStr} pour tout k ∈ ℤ`;
}

/**
 * Get the function name for a discontinuity source.
 */
function getSourceFunctionName(source: DiscontinuitySource): string {
	switch (source) {
		case 'tan':
			return 'tangente';
		case 'cot':
			return 'cotangente';
		case 'sec':
			return 'sécante';
		case 'csc':
			return 'cosécante';
		case 'floor':
			return 'partie entière';
		case 'ceil':
			return 'plafond';
		case 'sign':
			return 'signe';
		default:
			return source;
	}
}

// =============================================================================
// Summary Descriptions
// =============================================================================

/**
 * Generate a summary of continuity analysis results.
 */
export function summarizeContinuityResult(
	discontinuities: readonly Discontinuity[],
	isContinuousOnDomain: boolean,
	_variable: string = 'x'
): string {
	if (discontinuities.length === 0) {
		return 'La fonction est continue sur tout son domaine de définition.';
	}

	const count = discontinuities.length;
	const plural = count > 1 ? 's' : '';

	let summary = `${count} discontinuité${plural} détectée${plural}`;

	// Group by type
	const byType = groupByType(discontinuities);
	const typeDescriptions: string[] = [];

	if (byType.infinite > 0) {
		typeDescriptions.push(
			`${byType.infinite} asymptote${byType.infinite > 1 ? 's' : ''} verticale${byType.infinite > 1 ? 's' : ''}`
		);
	}
	if (byType.jump > 0) {
		typeDescriptions.push(`${byType.jump} saut${byType.jump > 1 ? 's' : ''}`);
	}
	if (byType.removable > 0) {
		typeDescriptions.push(`${byType.removable} trou${byType.removable > 1 ? 's' : ''}`);
	}
	if (byType.essential > 0) {
		typeDescriptions.push(`${byType.essential} essentielle${byType.essential > 1 ? 's' : ''}`);
	}

	if (typeDescriptions.length > 0) {
		summary += ` : ${typeDescriptions.join(', ')}`;
	}

	summary += '.';

	if (isContinuousOnDomain) {
		summary += '\nLa fonction reste continue sur son domaine de définition.';
	} else {
		summary += `\nLa fonction présente des discontinuités à l'intérieur de son domaine.`;
	}

	return summary;
}

/**
 * Group discontinuities by type.
 */
function groupByType(discontinuities: readonly Discontinuity[]): Record<DiscontinuityType, number> {
	const result: Record<DiscontinuityType, number> = {
		removable: 0,
		jump: 0,
		infinite: 0,
		essential: 0
	};

	for (const disc of discontinuities) {
		result[disc.type]++;
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
