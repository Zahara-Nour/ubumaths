/**
 * Fiche du modèle
 * ===============
 *
 * Ce que l'admin lit en tête de l'aperçu d'un modèle (et, en court, de l'éditeur) : statut,
 * classes, chemin dans l'arbre des notions, points du programme, réglages de validation.
 * Les lectures sont côté serveur (`$lib/server/template-fact-sheet`) ; ici, les types et la
 * mise en mots, partagés avec le composant.
 */

import { CONSTRAINT_IDS, CONSTRAINT_LABELS } from './constraint-constants';
import { DEFAULT_CONSTRAINT_MODE, DEFAULT_FORM_CONSTRAINT_MODE } from './types';
import { GRADES, isGradeCode } from '$lib/types/grades';

// Types

export interface FactSheetNode {
	name: string;
	archived: boolean;
}

export interface FactSheetPoint {
	/** Classe du programme, en clair (« 6ème »). */
	grade: string;
	code: string;
	name: string;
	archived: boolean;
}

export type FactSheetPoints =
	| { state: 'tagged'; points: FactSheetPoint[] }
	/** Aucun point posé ; `availableCount` points possibles, à partir de la classe `fromGrade`. */
	| { state: 'none'; availableCount: number; fromGrade: string | null }
	/** Modèle sans nœud : il faut le ranger avant de le relier à un point. */
	| { state: 'unranked' };

export interface TemplateFactSheet {
	title: string;
	statusLabel: string;
	published: boolean;
	typeLabel: string;
	courseQuestion: boolean;
	/** Classes du modèle, en clair. */
	grades: string[];
	/** De la branche au nœud du modèle ; `null` : modèle non rangé. */
	path: FactSheetNode[] | null;
	points: FactSheetPoints;
	/** Réglages qui s'écartent du défaut, en mots. */
	settings: string[];
}

/** Une lecture en échec rend un message : jamais une fiche « sans point » par défaut. */
export type TemplateFactSheetResult =
	{ ok: true; sheet: TemplateFactSheet } | { ok: false; message: string };

interface PathNode {
	id: string;
	name: string;
	parent_id: string | null;
	archived_at: string | null;
}

// Constantes

/** Mots de l'éditeur (`CONSTRAINT_MODE_OPTIONS`), en minuscules dans une phrase. */
const MODE_WORDS: Record<string, string> = {
	strict: 'strict',
	warn: 'avertissement',
	off: 'désactivé'
};

/** Profondeur de l'arbre : sous-notion → notion → branche. */
const MAX_PATH_LENGTH = 3;

// Functions

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Les réglages de validation d'un modèle (`question_templates.options`) qui s'écartent du
 * défaut, dans l'ordre et avec les mots de l'éditeur. Une valeur inconnue n'est pas montrée.
 */
export function describeValidationSettings(options: unknown): string[] {
	const opts = asRecord(options);
	const constraints = asRecord(opts.constraints);
	const settings: string[] = [];

	for (const id of CONSTRAINT_IDS) {
		const mode = constraints[id];
		if (typeof mode !== 'string' || !(mode in MODE_WORDS)) continue;
		const defaultMode = id === 'form' ? DEFAULT_FORM_CONSTRAINT_MODE : DEFAULT_CONSTRAINT_MODE;
		if (mode !== defaultMode) settings.push(`${CONSTRAINT_LABELS[id]} : ${MODE_WORDS[mode]}`);
	}
	if (constraints.allowBracketsInFirstNegativeTerm === true) {
		settings.push('Parenthèses autorisées sur un premier terme négatif');
	}
	if (constraints.spacesFromFourDigits === true) {
		settings.push('Espaces dès 4 chiffres (7 900, numération)');
	}
	if (opts.orderIndependent === true) settings.push('Trous dans n’importe quel ordre');
	if (opts.shuffleChoices === false) settings.push('Choix non mélangés');

	return settings;
}

/** Le chemin de la branche au nœud. Lève si un nœud manque : un chemin tronqué mentirait. */
export function nodePath(nodeId: string, nodes: readonly PathNode[]): FactSheetNode[] {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const path: FactSheetNode[] = [];
	let currentId: string | null = nodeId;
	while (currentId !== null && path.length < MAX_PATH_LENGTH) {
		const node = byId.get(currentId);
		if (!node) throw new Error(`Nœud de l'arbre introuvable : ${currentId}`);
		path.unshift({ name: node.name, archived: node.archived_at !== null });
		currentId = node.parent_id;
	}
	return path;
}

/** Une classe en clair : « 4ème » plutôt que « 4 ». */
export function gradeLabel(grade: string): string {
	return isGradeCode(grade) ? GRADES[grade].displayName : grade;
}

/** La plus basse des classes du modèle, en clair : d'elle partent les programmes proposés. */
export function lowestGradeLabel(grades: readonly string[]): string | null {
	const known = grades.filter(isGradeCode);
	if (known.length === 0) return null;
	const lowest = known.reduce((a, b) => (GRADES[b].schoolYear < GRADES[a].schoolYear ? b : a));
	return GRADES[lowest].displayName;
}
