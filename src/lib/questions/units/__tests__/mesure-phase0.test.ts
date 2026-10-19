/**
 * Mesure de phase 0 (chantier correction-cases-unite) : verdict actuel de
 * `validateQuantityAnswer` et verdict de la route `tidy` sur les mêmes saisies.
 * Sonde temporaire : imprime un tableau, n'asserte rien.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateQuantityAnswer } from '../validator';
import { normalizeStudentQuantity } from '../student-input';
import { readCompositeDuration } from '../composite-duration';
import { parseLatex } from '$lib/mathAST/parser';
import { valueIn } from '$lib/mathAST/eval/evaluate-with-modifiers';
import type { PrecisionType } from '$lib/questions/types';

interface Case {
	user: string;
	expected: string;
	unit: string;
	precision?: PrecisionType;
	required?: string;
	note: string;
}

const dec = (digits: number): PrecisionType => ({ type: 'decimal', digits }) as PrecisionType;
const sig = (digits: number): PrecisionType => ({ type: 'significant', digits }) as PrecisionType;
const tolAbs = (t: number): PrecisionType =>
	({ type: 'tolerance', tolerance: t, mode: 'absolute' }) as PrecisionType;
const tolRel = (t: number): PrecisionType =>
	({ type: 'tolerance', tolerance: t, mode: 'relative' }) as PrecisionType;

const CASES: Case[] = [
	// Nominaux
	{
		user: '5\\operatorname{\\mathrm{km}}',
		expected: '5\\unit{km}',
		unit: 'km',
		note: 'même unité'
	},
	{
		user: '5000\\operatorname{\\mathrm{m}}',
		expected: '5\\unit{km}',
		unit: 'km',
		note: 'conversion'
	},
	{ user: '5000m', expected: '5\\unit{km}', unit: 'km', note: 'collé' },
	{ user: '5000 m', expected: '5\\unit{km}', unit: 'km', note: 'espace' },
	{
		user: '2{,}5\\operatorname{\\mathrm{km}}',
		expected: '2.5\\unit{km}',
		unit: 'km',
		note: 'virgule'
	},
	{ user: '2.5km', expected: '2.5\\unit{km}', unit: 'km', note: 'point' },
	{ user: '12\\,500\\,\\mathrm{m}', expected: '12.5\\unit{km}', unit: 'km', note: 'groupement' },
	{
		user: '5\\operatorname{\\mathrm{km}}',
		expected: '5000\\unit{m}',
		unit: 'm',
		required: 'm',
		note: 'unité imposée violée'
	},
	{ user: '5000m', expected: '5000\\unit{m}', unit: 'm', required: 'm', note: 'unité imposée ok' },
	// Unités composées
	{
		user: '\\frac{90\\operatorname{\\mathrm{km}}}{h}',
		expected: '25\\unit{m/s}',
		unit: 'm/s',
		note: 'km/h→m/s'
	},
	{ user: '90km/h', expected: '25\\unit{m/s}', unit: 'm/s', note: 'km/h barre' },
	{ user: '25m.s^{-1}', expected: '90\\unit{km/h}', unit: 'km/h', note: 'm.s^-1' },
	{ user: '25m\\cdot s^{-1}', expected: '90\\unit{km/h}', unit: 'km/h', note: 'm·s^-1' },
	{ user: '3m^2', expected: '30000\\unit{cm^2}', unit: 'cm^2', note: 'aire' },
	{ user: '1L', expected: '1000\\unit{cm^3}', unit: 'cm^3', note: 'L↔cm³' },
	{ user: '1dm^3', expected: '1\\unit{L}', unit: 'L', note: 'dm³↔L' },
	// Durées
	{ user: '2h15\\min', expected: '135\\unit{min}', unit: 'min', note: 'durée composée' },
	{
		user: '2\\operatorname{\\mathrm{h}}\\,15\\,\\min',
		expected: '135\\unit{min}',
		unit: 'min',
		note: 'composée espacée'
	},
	{ user: '2{,}25h', expected: '135\\unit{min}', unit: 'min', note: 'h décimale' },
	{ user: '2{,}5h15\\min', expected: '165\\unit{min}', unit: 'min', note: 'décimale dedans' },
	{
		user: '2h15\\min',
		expected: '135\\unit{min}',
		unit: 'min',
		required: 'min',
		note: 'composée + imposée'
	},
	{ user: '1h75\\min', expected: '135\\unit{min}', unit: 'min', note: 'min > 59' },
	{ user: '2h15kg', expected: '135\\unit{min}', unit: 'min', note: 'terme étranger' },
	// Températures
	{ user: '20\\degree C', expected: '293.15\\unit{K}', unit: 'K', note: '°C→K' },
	{ user: '293{,}15K', expected: '20\\unit{°C}', unit: '°C', note: 'K→°C' },
	{ user: '68\\degree F', expected: '20\\unit{°C}', unit: '°C', note: '°F→°C' },
	{
		user: '298{,}5K',
		expected: '25.34\\unit{°C}',
		unit: '°C',
		precision: dec(1),
		note: 'K arrondi, °C attendu'
	},
	{
		user: '25{,}3\\degree C',
		expected: '25.34\\unit{°C}',
		unit: '°C',
		precision: dec(1),
		note: '°C arrondi'
	},
	// Arrondis / précision
	{
		user: '3{,}14m',
		expected: '3.14159\\unit{m}',
		unit: 'm',
		precision: dec(2),
		note: 'arrondi ok'
	},
	{
		user: '3{,}1416m',
		expected: '3.14159\\unit{m}',
		unit: 'm',
		precision: dec(2),
		note: 'trop précis'
	},
	{
		user: '3{,}15m',
		expected: '3.14159\\unit{m}',
		unit: 'm',
		precision: dec(2),
		note: 'mal arrondi'
	},
	{
		user: '314cm',
		expected: '3.14159\\unit{m}',
		unit: 'm',
		precision: dec(2),
		note: 'arrondi autre unité'
	},
	{
		user: '3141{,}59mm',
		expected: '3.14159\\unit{m}',
		unit: 'm',
		precision: dec(2),
		note: 'autre unité trop précise'
	},
	{ user: '3{,}1m', expected: '3.14159\\unit{m}', unit: 'm', precision: sig(2), note: '2 c.s.' },
	{
		user: '10{,}3m',
		expected: '10\\unit{m}',
		unit: 'm',
		precision: tolAbs(0.5),
		note: 'tolérance abs'
	},
	{
		user: '10{,}6m',
		expected: '10\\unit{m}',
		unit: 'm',
		precision: tolAbs(0.5),
		note: 'hors tolérance'
	},
	{
		user: '1030cm',
		expected: '10\\unit{m}',
		unit: 'm',
		precision: tolAbs(0.5),
		note: 'tolérance + conversion'
	},
	{
		user: '10{,}4m',
		expected: '10\\unit{m}',
		unit: 'm',
		precision: tolRel(0.05),
		note: 'tolérance rel'
	},
	{ user: '20{,}001\\degree C', expected: '20\\unit{°C}', unit: '°C', note: 'pas de tolérance' },
	// Notation scientifique, fractions, expressions
	{ user: '3\\cdot10^{8}m', expected: '300000\\unit{km}', unit: 'km', note: 'scientifique' },
	{ user: '3\\times10^8m', expected: '300000\\unit{km}', unit: 'km', note: 'scientifique ×' },
	{ user: '\\frac{3}{2}m', expected: '1.5\\unit{m}', unit: 'm', note: 'fraction' },
	{ user: '-\\frac{3}{2}m', expected: '-1.5\\unit{m}', unit: 'm', note: 'fraction négative' },
	{ user: '1{,}5\\cdot10^{-3}km', expected: '1.5\\unit{m}', unit: 'm', note: 'sci. décimale' },
	{ user: '0{,}1+0{,}2m', expected: '0.3\\unit{m}', unit: 'm', note: 'calcul dans la tête' },
	{ user: '\\frac{1}{3}m', expected: '0.333333\\unit{m}', unit: 'm', note: 'fraction ≈' },
	// Erreurs
	{ user: '5', expected: '5\\unit{km}', unit: 'km', note: 'unité oubliée' },
	{ user: '5kg', expected: '5\\unit{km}', unit: 'km', note: 'mauvaise grandeur' },
	{ user: '5xyz', expected: '5\\unit{km}', unit: 'km', note: 'unité inconnue' },
	{ user: '5m s', expected: '5\\unit{m.s}', unit: 'm.s', note: 'espace dans unité' },
	{ user: '5ms', expected: '0.005\\unit{s}', unit: 's', note: 'ms = milliseconde' },
	{ user: '0m', expected: '0\\unit{m}', unit: 'm', note: 'zéro' },
	{ user: '0{,}0000000005m', expected: '0\\unit{m}', unit: 'm', note: 'presque zéro' },
	{ user: '1000000000{,}5m', expected: '1000000000\\unit{m}', unit: 'm', note: 'grand nombre' },
	// Valeur attendue non décimale
	{
		user: '2{,}83m',
		expected: '2\\sqrt{2}\\unit{m}',
		unit: 'm',
		precision: dec(2),
		note: 'attendu 2√2'
	},
	{ user: '2m', expected: '2\\sqrt{2}\\unit{m}', unit: 'm', note: 'attendu 2√2, élève 2' },
	{ user: '3{,}14m', expected: '\\pi\\unit{m}', unit: 'm', precision: dec(2), note: 'attendu π' },
	{ user: '15m', expected: '5\\times3\\unit{m}', unit: 'm', note: 'attendu 5×3 (CE)' },
	{ user: '15m', expected: '5\\cdot 3\\unit{m}', unit: 'm', note: 'attendu 5·3 (CE)' },
	{ user: '15m', expected: '15[m]', unit: 'm', note: 'attendu maison' },
	{ user: '\\sqrt{2}m', expected: '\\sqrt{2}\\unit{m}', unit: 'm', note: 'élève √2' },
	{ user: '2\\pi m', expected: '2\\pi\\unit{m}', unit: 'm', note: 'élève 2π' },
	{ user: '-5m', expected: '-5\\unit{m}', unit: 'm', note: 'négatif' },
	{ user: '+5m', expected: '5\\unit{m}', unit: 'm', note: 'plus' },
	{ user: '5m', expected: '-5\\unit{m}', unit: 'm', note: 'signe oublié' },
	{
		user: '5\\operatorname{\\mathrm{m}}^2',
		expected: '5\\unit{m^2}',
		unit: 'm^2',
		note: 'm^2 hors opname'
	},
	{ user: '5m²', expected: '5\\unit{m^2}', unit: 'm^2', note: 'm² unicode' },
	{ user: '5km^2', expected: '5000000\\unit{m^2}', unit: 'm^2', note: 'km²' },
	{ user: '2{,}5\\cdot10^3g', expected: '2.5\\unit{kg}', unit: 'kg', note: 'sci g→kg' },
	{ user: '1{,}2t', expected: '1200\\unit{kg}', unit: 'kg', note: 'tonne' },
	{ user: '3ha', expected: '30000\\unit{m^2}', unit: 'm^2', note: 'hectare' },
	{ user: '1{,}5h', expected: '90\\unit{min}', unit: 'min', note: 'h décimale' },
	{ user: '1h30', expected: '90\\unit{min}', unit: 'min', note: '1h30 sans min' },
	{ user: '90\\min', expected: '1.5\\unit{h}', unit: 'h', note: 'min→h' },
	{ user: '1j', expected: '24\\unit{h}', unit: 'h', note: 'jour' },
	{ user: '0{,}1m', expected: '0.1\\unit{m}', unit: 'm', precision: tolRel(0), note: 'tol rel 0' },
	// Monnaie, angles
	{ user: '5\\euro', expected: '5\\unit{€}', unit: '€', note: 'euro' },
	{ user: '30\\degree', expected: '30\\unit{°}', unit: '°', note: 'angle' },
	{ user: '30^{\\circ}', expected: '30\\unit{°}', unit: '°', note: 'angle ^circ' }
];

/** Verdict de la route `tidy` : valeur de l'élève exprimée dans l'unité attendue, en rationnels */
function tidyVerdict(c: Case): string {
	try {
		const duration = readCompositeDuration(c.user);
		const normalized =
			duration?.kind === 'duration' ? duration.latex : normalizeStudentQuantity(c.user);
		const latex = normalized.replace(/\\unit\{/, '~\\unit{').replace(/,/g, '.');
		const userAst = parseLatex(latex);
		const expectedAst = parseLatex(c.expected.replace(/\\unit\{/, '~\\unit{'));
		const u = valueIn(userAst, c.unit);
		const e = valueIn(expectedAst, c.unit);
		if (u === null || e === null) return `nul (u=${u === null}, e=${e === null})`;
		const uf = Number(u.n) / Number(u.d);
		const ef = Number(e.n) / Number(e.d);
		return `${u.n * e.d === e.n * u.d ? 'ÉGAL' : 'diff'} ${uf} vs ${ef}`;
	} catch (err) {
		return `ERREUR ${(err as Error).message.slice(0, 60)}`;
	}
}

describe('mesure phase 0', () => {
	it('imprime', () => {
		const rows = CASES.map((c) => {
			const r = validateQuantityAnswer(c.user, c.expected, c.precision, c.required);
			const actuel =
				`${r.isCorrect ? 'JUSTE' : 'faux'} ${r.errorType ?? ''} ${r.feedback ?? ''}`.trim();
			return `| ${c.note} | \`${c.user}\` | \`${c.expected}\` ${c.precision ? JSON.stringify(c.precision) : ''}${c.required ? ` imposée ${c.required}` : ''} | ${actuel} | ${tidyVerdict(c)} |`;
		});
		expect(rows.length).toBeGreaterThan(0);
		writeFileSync(
			process.env.MESURE_OUT ?? '/dev/null',
			['| cas | saisie | attendu | actuel | tidy |', ...rows].join('\n')
		);
	});
});

/** Valeur de l'attendu maison `4[dam]` en LaTeX lisible par parseLatex */
function houseToLatex(expected: string): { latex: string; unit: string } {
	const m = /^\(?\+?(-?\d+(?:\.\d+)?)\[([^[\]]+)\]\)?$/.exec(expected.trim());
	if (!m) throw new Error(expected);
	return { latex: `${m[1]}~\\unit{${m[2]}}`, unit: m[2] };
}

describe('mesure phase 0 — route tidy sur l oracle', () => {
	it('compare', () => {
		const oracle = JSON.parse(
			readFileSync('tests/fixtures/correction-cases-unite/oracle.json', 'utf8')
		) as {
			modele: string;
			attendu: string;
			famille: string;
			saisie: string;
			juste: boolean;
			message: string | null;
		}[];
		const diffs: string[] = [];
		let compared = 0;
		for (const e of oracle) {
			const { latex, unit } = houseToLatex(e.attendu);
			const verdict = tidyVerdict({
				user: e.saisie,
				expected: latex.replace('~', ''),
				unit,
				note: ''
			});
			if (!verdict.startsWith('ÉGAL') && !verdict.startsWith('diff')) {
				// tidy ne lit pas : seulement noté si l'actuel juge sur la valeur
				if (e.juste)
					diffs.push(`${e.modele} ${e.famille} ${e.saisie} actuel=JUSTE tidy=${verdict}`);
				continue;
			}
			compared++;
			const tidyJuste = verdict.startsWith('ÉGAL');
			const unitFault = e.message !== null && !e.message.startsWith('Les blancs');
			if (!unitFault && tidyJuste !== e.juste) {
				diffs.push(`${e.modele} ${e.famille} ${e.saisie} actuel=${e.juste} tidy=${verdict}`);
			}
		}
		expect(oracle.length).toBeGreaterThan(0);
		writeFileSync(
			process.env.MESURE_OUT ?? '/dev/null',
			[`comparées : ${compared}`, ...diffs].join('\n')
		);
	});
});
