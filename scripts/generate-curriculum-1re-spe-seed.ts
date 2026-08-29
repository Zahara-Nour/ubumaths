#!/usr/bin/env tsx
/**
 * Génère `supabase/migrations/<ts>_seed_curriculum_1re_spe.sql` depuis
 * `docs/wip/referentiel/1re-spe-programme.md`.
 *
 * Le markdown est la SOURCE DE VÉRITÉ : on ne retranscrit pas 170 points à la
 * main. Rejouer le script après une correction du markdown régénère le seed à
 * l'identique (même convention que `generate-competence-seeds.ts` pour la 6ᵉ).
 *
 * Usage : pnpm tsx scripts/generate-curriculum-1re-spe-seed.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs/wip/referentiel/1re-spe-programme.md');
const OUT = join(ROOT, 'supabase/migrations/20260830090000_seed_curriculum_1re_spe.sql');
const GRADE = '1_SPE';

type Kind = 'connaissance' | 'savoir_faire' | 'demonstration';
type Point = {
	code: string;
	theme: string;
	objective: string;
	name: string;
	ord: number;
	kind: Kind;
	regime: 'fluence' | 'diversite';
	exigence: 'attendu' | 'approfondissement';
};

const TAGS: Record<string, { kind: Kind; exigence: Point['exigence'] }> = {
	C: { kind: 'connaissance', exigence: 'attendu' },
	SF: { kind: 'savoir_faire', exigence: 'attendu' },
	D: { kind: 'demonstration', exigence: 'attendu' },
	'SF+': { kind: 'savoir_faire', exigence: 'approfondissement' }
};

/** Le corps utile commence au premier thème et s'arrête au récapitulatif. */
function body(md: string): string[] {
	const lines = md.split('\n');
	const start = lines.findIndex((l) => l.startsWith('## 1. '));
	const end = lines.findIndex((l) => l.startsWith('## Récapitulatif'));
	if (start === -1 || end === -1) throw new Error('bornes du corps introuvables');
	return lines.slice(start, end);
}

function parse(md: string) {
	const themes: { name: string; ord: number }[] = [];
	const objectives: { theme: string; name: string; ord: number }[] = [];
	const points: Point[] = [];

	let theme = '';
	let objective = '';
	let objOrdInTheme = 0;
	let pointOrdInObjective = 0;
	// La partie « Automatismes » du BO : provenance + enjeu d'examen. Ces points
	// se mesurent par la fluence ; le tag permet de les retrouver à travers les
	// programmes des différentes années, indépendamment du thème qui les porte.
	let isAutomatismes = false;

	for (const line of body(md)) {
		const mTheme = /^## \d+\.\s+(.+)$/.exec(line);
		if (mTheme) {
			theme = mTheme[1].trim();
			themes.push({ name: theme, ord: themes.length + 1 });
			objOrdInTheme = 0;
			isAutomatismes = theme === 'Automatismes';
			continue;
		}

		const mObj = /^### \d+\.\d+\s+(.+)$/.exec(line);
		if (mObj) {
			objective = mObj[1].trim();
			objOrdInTheme += 1;
			objectives.push({ theme, name: objective, ord: objOrdInTheme });
			pointOrdInObjective = 0;
			continue;
		}

		// `- [SF] \`1SPE-047\` libellé…` — le code, s'il est déjà là, fait foi.
		const mPoint = /^- \[(C|SF\+|SF|D)\]\s+(?:`([A-Z0-9_]+-\d+)`\s+)?(.+)$/.exec(line);
		if (mPoint) {
			if (!theme || !objective) throw new Error(`point hors objectif : ${line}`);
			const tag = TAGS[mPoint[1]];
			pointOrdInObjective += 1;
			points.push({
				code: mPoint[2] ?? '',
				theme,
				objective,
				name: mPoint[3].trim(),
				ord: pointOrdInObjective,
				kind: tag.kind,
				regime: isAutomatismes ? 'fluence' : 'diversite',
				exigence: tag.exigence
			});
		}
	}

	return { themes, objectives, points };
}

/** Dollar-quoting comme le seed 6ᵉ : les libellés contiennent apostrophes et accents. */
const q = (s: string) => {
	if (s.includes('$$')) throw new Error(`libellé contenant $$ : ${s}`);
	return `$$${s}$$`;
};

const md = readFileSync(SRC, 'utf8');
const { themes, objectives, points } = parse(md);

/**
 * Attribue un code aux points qui n'en ont pas et RÉÉCRIT le markdown.
 *
 * Les codes existants ne bougent jamais : c'est toute leur raison d'être. Un
 * nouveau point prend le numéro suivant le plus haut déjà attribué — jamais un
 * trou laissé par un point supprimé, pour qu'un code ne soit jamais réutilisé
 * pour désigner autre chose.
 */
function assignMissingCodes(markdown: string): string {
	const used = points.map((pt) => pt.code).filter(Boolean);
	let next =
		used.reduce((max, c) => Math.max(max, Number.parseInt(c.split('-')[1] ?? '0', 10)), 0) + 1;

	const missing = points.filter((pt) => !pt.code);
	if (missing.length === 0) return markdown;

	const lines = markdown.split('\n');
	let cursor = 0;
	for (const pt of points) {
		// On retrouve la ligne du point dans l'ordre du document.
		while (cursor < lines.length) {
			const m = /^- \[(C|SF\+|SF|D)\]\s+(?:`([A-Z0-9_]+-\d+)`\s+)?(.+)$/.exec(lines[cursor]);
			if (m && m[3].trim() === pt.name) break;
			cursor++;
		}
		if (cursor >= lines.length) throw new Error(`ligne introuvable pour : ${pt.name}`);
		if (!pt.code) {
			pt.code = `${GRADE.replace('_', '')}-${String(next++).padStart(3, '0')}`;
			const m = /^(- \[(?:C|SF\+|SF|D)\]\s+)(.+)$/.exec(lines[cursor])!;
			lines[cursor] = `${m[1]}\`${pt.code}\` ${m[2]}`;
		}
		cursor++;
	}
	console.log(`  ${missing.length} code(s) attribué(s), markdown réécrit`);
	return lines.join('\n');
}

const updatedMd = assignMissingCodes(md);
if (updatedMd !== md) writeFileSync(SRC, updatedMd);

// Garde-fous : les contraintes UNIQUE de la base doivent tenir.
for (const [label, seen] of [
	['thème', new Set<string>()],
	['objectif', new Set<string>()],
	['point', new Set<string>()]
] as const) {
	const keys =
		label === 'thème'
			? themes.map((t) => t.name)
			: label === 'objectif'
				? objectives.map((o) => `${o.theme}//${o.name}`)
				: points.map((p) => `${p.theme}//${p.objective}//${p.name}`);
	for (const k of keys) {
		if (seen.has(k)) throw new Error(`doublon ${label} (viole l'UNIQUE) : ${k}`);
		seen.add(k);
	}
}

const sql = `-- ============================================================================
-- Amorçage — Programme de suivi 1ʳᵉ spécialité mathématiques (grade '${GRADE}')
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-1re-spe-seed.ts depuis
-- docs/wip/referentiel/1re-spe-programme.md — ne pas éditer à la main.
--
-- Source : « Programme de spécialité de mathématiques de la classe de première
-- de la voie générale » (programme en vigueur, avec la partie transversale
-- « Automatismes » ; ce n'est PAS l'arrêté du 17 janvier 2019).
--
--   ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points
--   kind        : ${points.filter((p) => p.kind === 'connaissance').length} connaissance · ${points.filter((p) => p.kind === 'savoir_faire').length} savoir_faire · ${points.filter((p) => p.kind === 'demonstration').length} demonstration
--   exigence    : ${points.filter((p) => p.exigence === 'attendu').length} attendu · ${points.filter((p) => p.exigence === 'approfondissement').length} approfondissement
--
-- AMORÇAGE, PAS SYNCHRONISATION.
--
-- Ce fichier remplit un niveau VIDE, une fois. Ensuite c'est la page Programme
-- qui fait foi : ajouts, renommages, déplacements, archivages s'y font, et le
-- markdown n'a plus voix au chapitre. Corriger le markdown après coup ne
-- produit donc plus rien sur une base déjà amorcée — la correction se fait
-- dans l'app.
--
-- D'où la garde ci-dessous : le rejeu (un \`db:reset\` en local, une migration
-- relancée) ne peut rien écraser, il ne fait rien du tout. C'est la différence
-- avec la version précédente, qui re-synchronisait depuis le markdown et
-- archivait ce qui en avait disparu — elle aurait défait le travail fait dans
-- l'app.
--
-- Le markdown garde un seul rôle : amorcer un niveau NEUF (2de, terminale…).
-- Y saisir 153 points à la main dans un formulaire serait une punition.
--
-- Ce que le seed ne renseigne pas, volontairement :
--   · \`regime_acquisition\` — au défaut ('diversite') ; c'est un choix de prof
--   · \`rang\` — NULL ; le programme ne propose aucune échelle de difficulté
-- ============================================================================

do $bootstrap$
BEGIN

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = '${GRADE}') THEN
	RAISE NOTICE 'Référentiel ${GRADE} déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
${themes.map((t) => `\t('${GRADE}', ${q(t.name)}, ${t.ord})`).join(',\n')};

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
${objectives.map((o) => `\t(${q(o.theme)}, ${q(o.name)}, ${o.ord})`).join(',\n')}
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = '${GRADE}' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- \`code\` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
${points
	.map(
		(p) =>
			`\t(${q(p.code)}, ${q(p.theme)}, ${q(p.objective)}, ${q(p.name)}, ${p.ord}, ${q(p.kind)}, ${q(p.exigence)})`
	)
	.join(',\n')}
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = '${GRADE}' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
`;

writeFileSync(OUT, sql);
console.log(
	`✓ ${OUT.replace(ROOT + '/', '')}\n` +
		`  ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points\n` +
		`  kind : C=${points.filter((p) => p.kind === 'connaissance').length} ` +
		`SF=${points.filter((p) => p.kind === 'savoir_faire').length} ` +
		`D=${points.filter((p) => p.kind === 'demonstration').length}\n` +
		`  approfondissement=${points.filter((p) => p.exigence === 'approfondissement').length} · ` +
		`fluence=${points.filter((p) => p.regime === 'fluence').length}`
);
