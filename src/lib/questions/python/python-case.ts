/**
 * Modèles à case « programme Python » (outil 49) : jamais corrigés par le serveur
 * ==============================================================================
 *
 * Une case Python se juge dans le navigateur (Pyodide) : le serveur ne sait pas faire tourner
 * Python. Un modèle qui en porte une n'entre donc ni dans une évaluation notée (corrigée par
 * le serveur, ADR 0015), ni dans un jeu corrigé par le serveur (Q1 de David, 2026-11-28).
 * Le modèle entier est écarté, même si une seule de ses variations a le bloc.
 *
 * @module questions/python/python-case
 */

import { hasPythonAEcrire } from '#lib/ubumark/parser/python-a-ecrire-parser.ts';

/** Forme lue d'un modèle : seulement ses énoncés (base ou objet typé) */
interface TemplateStatements {
	shared?: unknown;
	variations?: unknown;
}

function statementOf(value: unknown): string {
	if (value === null || typeof value !== 'object' || !('statement' in value)) return '';
	return typeof value.statement === 'string' ? value.statement : '';
}

/** Le modèle a-t-il une case Python, dans son tronc commun ou l'une de ses variations ? */
export function hasPythonCase(template: TemplateStatements): boolean {
	const variations = Array.isArray(template.variations) ? template.variations : [];
	return [template.shared, ...variations].some((part) => hasPythonAEcrire(statementOf(part)));
}

/** Retire les modèles à case Python (évaluation notée, jeux corrigés par le serveur) */
export function excludePythonCases<T extends TemplateStatements>(templates: T[]): T[] {
	return templates.filter((template) => !hasPythonCase(template));
}
