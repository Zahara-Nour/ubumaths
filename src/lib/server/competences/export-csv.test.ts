/**
 * Tests for the pure competence-export modules:
 *  - niveau-format.ts  (formatNiveau)
 *  - socle-mapping.ts  (getSocleCodes / formatSocleCell)
 *  - export-csv.ts     (buildCompetencesCsv)
 *
 * Mirrors behaviours 1-9 of docs/wip/export-competences-study.md / plan Phase 0.
 */

import { describe, it, expect } from 'vitest';
import { formatNiveau } from '$lib/competences/niveau-format';
import { getSocleCodes, formatSocleCell } from './socle-mapping';
import { buildCompetencesCsv, type ExportCompetence, type ExportStudentRow } from './export-csv';

const BOM = '﻿';

const COMPETENCES: ExportCompetence[] = [
	{ code: 'chercher', name: 'Chercher' },
	{ code: 'calculer', name: 'Calculer' },
	{ code: 'raisonner', name: 'Raisonner' },
	{ code: 'communiquer', name: 'Communiquer' },
	{ code: 'modeliser', name: 'Modéliser' },
	{ code: 'representer', name: 'Représenter' }
];

function stripBom(csv: string): string {
	return csv.startsWith(BOM) ? csv.slice(BOM.length) : csv;
}

function lines(csv: string): string[] {
	return stripBom(csv).split('\r\n');
}

// ---------------------------------------------------------------------------
// niveau-format (behaviours 1-3)
// ---------------------------------------------------------------------------

describe('formatNiveau', () => {
	it('renders each level in numeric / label / short formats', () => {
		expect(formatNiveau('insuffisante', 'numeric')).toBe('1');
		expect(formatNiveau('insuffisante', 'label')).toBe('Maîtrise insuffisante');
		expect(formatNiveau('insuffisante', 'short')).toBe('MI');

		expect(formatNiveau('fragile', 'numeric')).toBe('2');
		expect(formatNiveau('fragile', 'short')).toBe('MF');

		expect(formatNiveau('satisfaisante', 'numeric')).toBe('3');
		expect(formatNiveau('satisfaisante', 'short')).toBe('MS');

		expect(formatNiveau('tres_bonne', 'numeric')).toBe('4');
		expect(formatNiveau('tres_bonne', 'label')).toBe('Très bonne maîtrise');
		expect(formatNiveau('tres_bonne', 'short')).toBe('TBM');
	});

	it('renders an absent level as empty string in every format', () => {
		expect(formatNiveau(null, 'numeric')).toBe('');
		expect(formatNiveau(undefined, 'label')).toBe('');
		expect(formatNiveau(null, 'short')).toBe('');
	});
});

// ---------------------------------------------------------------------------
// socle-mapping (behaviours 4-5)
// ---------------------------------------------------------------------------

describe('getSocleCodes', () => {
	it('maps each competence to its official BO 2015 cycle 4 socle domains', () => {
		// Domain 1 → D1.3 for maths; chercher/calculer/raisonner have no domain 1.
		expect(getSocleCodes('chercher')).toEqual(['D2', 'D4']);
		expect(getSocleCodes('calculer')).toEqual(['D4']);
		expect(getSocleCodes('raisonner')).toEqual(['D2', 'D3', 'D4']);
		expect(getSocleCodes('communiquer')).toEqual(['D1.3', 'D3']);
		expect(getSocleCodes('modeliser')).toEqual(['D1.3', 'D2', 'D4']);
		expect(getSocleCodes('representer')).toEqual(['D1.3', 'D5']);
	});

	it('returns an empty list for an unknown competence code', () => {
		expect(getSocleCodes('inconnu')).toEqual([]);
	});

	it('formats a socle cell as space-separated domains', () => {
		expect(formatSocleCell('chercher')).toBe('D2 D4');
		expect(formatSocleCell('modeliser')).toBe('D1.3 D2 D4');
		expect(formatSocleCell('calculer')).toBe('D4');
	});
});

// ---------------------------------------------------------------------------
// buildCompetencesCsv (behaviours 6-9)
// ---------------------------------------------------------------------------

const ROWS: ExportStudentRow[] = [
	{
		lastName: 'Martin',
		firstName: 'Hugo',
		className: '6e B',
		levels: { chercher: 'fragile', calculer: 'satisfaisante' }
	},
	{
		lastName: 'Dupont',
		firstName: 'Léa',
		className: '6e B',
		levels: {
			chercher: 'satisfaisante',
			calculer: 'tres_bonne',
			raisonner: 'satisfaisante',
			communiquer: 'fragile',
			modeliser: 'satisfaisante',
			representer: 'tres_bonne'
		}
	}
];

describe('buildCompetencesCsv — disposition large', () => {
	it('produces one row per student with one column per competence (behaviour 6)', () => {
		const csv = buildCompetencesCsv(ROWS, {
			disposition: 'large',
			niveauFormat: 'numeric',
			competences: COMPETENCES
		});
		const rows = lines(csv);
		expect(rows[0]).toBe(
			'nom;prenom;classe;Chercher;Calculer;Raisonner;Communiquer;Modéliser;Représenter'
		);
		// Dupont sorts before Martin (behaviour 9)
		expect(rows[1]).toBe('Dupont;Léa;6e B;3;4;3;2;3;4');
		// Martin: only chercher + calculer evaluated → empty cells elsewhere
		expect(rows[2]).toBe('Martin;Hugo;6e B;2;3;;;;');
		expect(rows).toHaveLength(3);
	});

	it('respects the chosen niveau format', () => {
		const csv = buildCompetencesCsv([ROWS[0]], {
			disposition: 'large',
			niveauFormat: 'short',
			competences: COMPETENCES
		});
		expect(lines(csv)[1]).toBe('Martin;Hugo;6e B;MF;MS;;;;');
	});
});

describe('buildCompetencesCsv — disposition longue', () => {
	it('produces one row per (student × competence) with optional columns (behaviour 7)', () => {
		const csv = buildCompetencesCsv(
			[
				{
					lastName: 'Dupont',
					firstName: 'Léa',
					className: '6e B',
					levels: { chercher: 'satisfaisante', calculer: null },
					taskCounts: { chercher: 5, calculer: 0 },
					lastObservations: { chercher: '2026-06-10T08:30:00Z' }
				}
			],
			{
				disposition: 'longue',
				niveauFormat: 'numeric',
				competences: [COMPETENCES[0], COMPETENCES[1]],
				includeSocle: true,
				includeTaskCount: true,
				includeLastObservation: true
			}
		);
		const rows = lines(csv);
		expect(rows[0]).toBe(
			'nom;prenom;classe;competence_code;competence_nom;niveau;socle_code;task_count;derniere_observation'
		);
		expect(rows[1]).toBe('Dupont;Léa;6e B;chercher;Chercher;3;D2 D4;5;2026-06-10');
		expect(rows[2]).toBe('Dupont;Léa;6e B;calculer;Calculer;;D4;0;');
		expect(rows).toHaveLength(3);
	});

	it('omits optional columns when not requested', () => {
		const csv = buildCompetencesCsv([ROWS[0]], {
			disposition: 'longue',
			niveauFormat: 'numeric',
			competences: [COMPETENCES[0]]
		});
		const rows = lines(csv);
		expect(rows[0]).toBe('nom;prenom;classe;competence_code;competence_nom;niveau');
		expect(rows[1]).toBe('Martin;Hugo;6e B;chercher;Chercher;2');
	});
});

describe('buildCompetencesCsv — encoding & escaping (behaviour 8)', () => {
	it('prefixes a UTF-8 BOM', () => {
		const csv = buildCompetencesCsv([], {
			disposition: 'large',
			niveauFormat: 'numeric',
			competences: COMPETENCES
		});
		expect(csv.startsWith(BOM)).toBe(true);
	});

	it('uses CRLF line endings', () => {
		const csv = buildCompetencesCsv([ROWS[0]], {
			disposition: 'large',
			niveauFormat: 'numeric',
			competences: [COMPETENCES[0]]
		});
		expect(stripBom(csv)).toBe('nom;prenom;classe;Chercher\r\nMartin;Hugo;6e B;2');
	});

	it('escapes fields containing the delimiter or quotes (RFC 4180)', () => {
		const csv = buildCompetencesCsv(
			[
				{
					lastName: 'De; la "Tour"',
					firstName: 'Anne',
					className: '6e B',
					levels: { chercher: 'fragile' }
				}
			],
			{ disposition: 'large', niveauFormat: 'numeric', competences: [COMPETENCES[0]] }
		);
		expect(lines(csv)[1]).toBe('"De; la ""Tour""";Anne;6e B;2');
	});

	it('quotes fields containing a newline', () => {
		const csv = buildCompetencesCsv(
			[
				{
					lastName: 'Durand\nbis',
					firstName: 'Tom',
					className: '6e B',
					levels: { chercher: 'fragile' }
				}
			],
			{ disposition: 'large', niveauFormat: 'numeric', competences: [COMPETENCES[0]] }
		);
		expect(stripBom(csv).split('\r\n')[1]).toBe('"Durand\nbis";Tom;6e B;2');
	});
});
