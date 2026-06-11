/**
 * Pure CSV builder for the competence export (Chantier 1 MVP).
 *
 * Produces a UTF-8 (BOM) CSV string from already-loaded class data. Two
 * dispositions (cf. docs/wip/export-competences-study.md §2.2):
 *  - `large`  : 1 row per student, one column per competence (values 1-4) —
 *               default, matches the Pronote clipboard-paste model.
 *  - `longue` : 1 row per (student × competence) — for archival / Excel pivot,
 *               supports optional `socle_code` / `task_count` /
 *               `derniere_observation` columns.
 *
 * This module is intentionally free of any database access so it can be unit
 * tested in isolation. The endpoint maps the class grid to `ExportStudentRow[]`.
 */

import type { MathCompetenceLevel } from '$lib/types/skills';
import { formatNiveau, type NiveauFormat } from '$lib/competences/niveau-format';
import { formatSocleCell } from './socle-mapping';

export type Disposition = 'large' | 'longue';

/** A competence column, in display order. */
export interface ExportCompetence {
	/** `math_competences.code` — e.g. `chercher`. */
	code: string;
	/** Display name — e.g. `Chercher`. */
	name: string;
}

/** One student's competence data, keyed by competence code. */
export interface ExportStudentRow {
	lastName: string;
	firstName: string;
	className: string;
	/** code → level (or null/absent if not evaluated). */
	levels: Record<string, MathCompetenceLevel | null | undefined>;
	/** code → task_count (optional, longue disposition). */
	taskCounts?: Record<string, number | null | undefined>;
	/** code → last observation ISO date (optional, longue disposition). */
	lastObservations?: Record<string, string | null | undefined>;
}

export interface CompetencesExportOptions {
	disposition: Disposition;
	niveauFormat: NiveauFormat;
	/** Competences in display order (drives the column / row order). */
	competences: ExportCompetence[];
	/** longue only — add a `socle_code` column. */
	includeSocle?: boolean;
	/** longue only — add a `task_count` column. */
	includeTaskCount?: boolean;
	/** longue only — add a `derniere_observation` column. */
	includeLastObservation?: boolean;
}

const DELIMITER = ';';
const EOL = '\r\n';
const BOM = '﻿';

/** Fields needing quotes: the delimiter, a quote, CR or LF (RFC 4180 §2.6). */
const NEEDS_QUOTING = new RegExp(`[${DELIMITER}"\r\n]`);

/** Escape a single CSV field per RFC 4180 (delimiter `;`). */
function escapeCsvField(value: string): string {
	if (NEEDS_QUOTING.test(value)) {
		return '"' + value.replace(/"/g, '""') + '"';
	}
	return value;
}

function toRow(fields: string[]): string {
	return fields.map(escapeCsvField).join(DELIMITER);
}

/** Sort students by "Nom Prénom" using French collation. */
function sortStudents(rows: ExportStudentRow[]): ExportStudentRow[] {
	return [...rows].sort((a, b) =>
		`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')
	);
}

function isoToDate(iso: string | null | undefined): string {
	if (!iso) return '';
	return iso.slice(0, 10);
}

function buildLarge(rows: ExportStudentRow[], options: CompetencesExportOptions): string[] {
	const { competences, niveauFormat } = options;
	const header = ['nom', 'prenom', 'classe', ...competences.map((c) => c.name)];
	const lines = [toRow(header)];
	for (const r of rows) {
		const cells = [
			r.lastName,
			r.firstName,
			r.className,
			...competences.map((c) => formatNiveau(r.levels[c.code], niveauFormat))
		];
		lines.push(toRow(cells));
	}
	return lines;
}

function buildLongue(rows: ExportStudentRow[], options: CompetencesExportOptions): string[] {
	const { competences, niveauFormat, includeSocle, includeTaskCount, includeLastObservation } =
		options;

	const header = ['nom', 'prenom', 'classe', 'competence_code', 'competence_nom', 'niveau'];
	if (includeSocle) header.push('socle_code');
	if (includeTaskCount) header.push('task_count');
	if (includeLastObservation) header.push('derniere_observation');

	const lines = [toRow(header)];
	for (const r of rows) {
		for (const c of competences) {
			const cells = [
				r.lastName,
				r.firstName,
				r.className,
				c.code,
				c.name,
				formatNiveau(r.levels[c.code], niveauFormat)
			];
			if (includeSocle) cells.push(formatSocleCell(c.code));
			if (includeTaskCount) {
				const tc = r.taskCounts?.[c.code];
				cells.push(tc == null ? '' : String(tc));
			}
			if (includeLastObservation) cells.push(isoToDate(r.lastObservations?.[c.code]));
			lines.push(toRow(cells));
		}
	}
	return lines;
}

/**
 * Build the export CSV string (BOM + CRLF lines). Students are sorted by
 * "Nom Prénom" (French collation); competences keep the order given in
 * `options.competences` (expected to be `display_order`).
 */
export function buildCompetencesCsv(
	rows: ExportStudentRow[],
	options: CompetencesExportOptions
): string {
	const sorted = sortStudents(rows);
	const lines =
		options.disposition === 'large' ? buildLarge(sorted, options) : buildLongue(sorted, options);
	return BOM + lines.join(EOL);
}
