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
-- Seed — Programme de suivi 1ʳᵉ spécialité mathématiques (grade '${GRADE}')
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-1re-spe-seed.ts — ne pas éditer à la
-- main : corriger docs/wip/referentiel/1re-spe-programme.md puis relancer.
--
-- Source : « Programme de spécialité de mathématiques de la classe de première
-- de la voie générale » (programme en vigueur, avec la partie transversale
-- « Automatismes » ; ce n'est PAS l'arrêté du 17 janvier 2019).
--
--   ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points
--   kind        : ${points.filter((p) => p.kind === 'connaissance').length} connaissance · ${points.filter((p) => p.kind === 'savoir_faire').length} savoir_faire · ${points.filter((p) => p.kind === 'demonstration').length} demonstration
--   exigence    : ${points.filter((p) => p.exigence === 'attendu').length} attendu · ${points.filter((p) => p.exigence === 'approfondissement').length} approfondissement
--   regime_acquisition : ${points.filter((p) => p.regime === 'fluence').length} fluence · ${points.filter((p) => p.regime === 'diversite').length} diversite
--
-- \`rang\` reste NULL partout : le programme ne propose aucune échelle de
-- difficulté. Les objectifs s'affichent en liste avec un compteur n/m ; une
-- échelle 1-4 peut être ajoutée plus tard depuis la page Programme.
--
-- SYNCHRONISATION, pas simple ajout. Le rejeu du seed après correction du
-- markdown met à jour ce qui vient du programme et archive ce qui en a disparu,
-- en s'appuyant sur le \`code\` (stable) et non sur le libellé.
--
-- Partage de responsabilité, délibéré :
--   · le markdown fait foi pour  objectif · libellé · kind · exigence · ordre
--     (c'est le texte du BO)
--   · l'application fait foi pour  regime_acquisition · rang · archived_at
--     (ce sont les choix pédagogiques du prof)
-- Le seed ne touche JAMAIS à la seconde colonne.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
insert into public.curriculum_themes (grade, name, display_order) values
${themes.map((t) => `\t('${GRADE}', ${q(t.name)}, ${t.ord})`).join(',\n')}
on conflict (grade, name) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
insert into public.curriculum_objectives (theme_id, name, display_order)
select t.id, v.objective_name, v.ord
from (values
${objectives.map((o) => `\t(${q(o.theme)}, ${q(o.name)}, ${o.ord})`).join(',\n')}
) as v(theme_name, objective_name, ord)
join public.curriculum_themes t on t.grade = '${GRADE}' and t.name = v.theme_name
on conflict (theme_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
insert into public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
select o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
from (values
${points
	.map(
		(p) =>
			`\t(${q(p.code)}, ${q(p.theme)}, ${q(p.objective)}, ${q(p.name)}, ${p.ord}, ${q(p.kind)}, ${q(p.exigence)})`
	)
	.join(',\n')}
) as v(code, theme_name, objective_name, point_name, ord, kind, exigence)
join public.curriculum_themes t on t.grade = '${GRADE}' and t.name = v.theme_name
join public.curriculum_objectives o on o.theme_id = t.id and o.name = v.objective_name
on conflict (code) do update set
	objective_id  = excluded.objective_id,
	name          = excluded.name,
	display_order = excluded.display_order,
	kind          = excluded.kind,
	exigence      = excluded.exigence,
	updated_at    = now();
-- \`regime_acquisition\`, \`rang\` et \`archived_at\` sont volontairement absents :
-- ce sont les choix du prof, pas le texte du programme.

-- ---------------------------------------------------------------------------
-- 4. Points disparus du markdown → archivés (jamais supprimés)
-- ---------------------------------------------------------------------------
-- Supprimer effacerait la couverture du cahier de texte et l'acquisition des
-- élèves. On archive : le point sort des vues, l'historique reste.
update public.curriculum_points
set archived_at = now()
where code like '${GRADE.replace('_', '')}-%'
  and archived_at is null
  and code not in (${points.map((pt) => q(pt.code)).join(', ')});
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
