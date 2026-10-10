/**
 * Génère la liste des tables de la base, rangées par domaine
 * ==========================================================
 *
 * Source : src/lib/types/database.ts, lui-même généré depuis la PRODUCTION par
 * `pnpm db:types`. Sortie : docs/systeme/base-de-donnees-tables.md. La doc ne
 * peut donc pas se périmer : `pnpm db:types` la régénère.
 *
 * Le texte qui explique (à quoi sert un domaine, qui lit quoi, les pièges) vit
 * à la main dans docs/systeme/base-de-donnees.md.
 *
 * Chaque table doit avoir un domaine (`DOMAINS`) : le test
 * scripts/__tests__/generate-db-doc.test.ts rougit sinon.
 *
 * Usage : pnpm db:doc
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ============================================================================
// TYPES
// ============================================================================

export interface Column {
	name: string;
	type: string;
	nullable: boolean;
}

export interface ForeignKey {
	columns: string[];
	table: string;
	referencedColumns: string[];
}

export interface Table {
	name: string;
	columns: Column[];
	foreignKeys: ForeignKey[];
}

export interface SchemaModel {
	tables: Table[];
	views: string[];
	functions: string[];
}

interface Domain {
	title: string;
	/** Préfixes (`srs_`) ou noms exacts. */
	match: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const OUTPUT = 'docs/systeme/base-de-donnees-tables.md';

/** L'ordre compte : la première règle qui correspond l'emporte. */
export const DOMAINS: Domain[] = [
	{
		title: 'Établissement et personnes',
		match: [
			'schools',
			'school_',
			'academic_periods',
			'classes',
			'class_members',
			'class_schedules',
			'profiles',
			'pending_students',
			'user_preferences',
			'user_presence',
			'user_restrictions',
			'user_folders',
			'friendships',
			'student_warnings',
			'parental_consents',
			'terms_acceptances',
			'account_deletion_audit',
			'welcome_emails_sent'
		]
	},
	{
		title: 'Programme et suivi par compétences',
		match: [
			'curriculum_',
			'grade_predecessors',
			'observables',
			'math_competence',
			'student_point_state',
			'student_observable_state',
			'student_competence_level',
			'skill_attempts',
			'classification_nodes',
			'tags',
			'resource_tags',
			'source_types'
		]
	},
	{
		title: 'Questions et exercices',
		match: [
			'question_',
			'exercise_',
			'exercises',
			'template_',
			'user_favorite_templates',
			'student_exercise_mastery',
			'series',
			'migration_'
		]
	},
	{
		title: 'Chapitres et cahier de texte',
		match: [
			'chapter_',
			'class_chapters',
			'class_journal_',
			'journal_entry_',
			'student_checklist_progress'
		]
	},
	{ title: 'Fiches', match: ['worksheet'] },
	{
		title: 'Évaluations',
		match: ['evaluation', 'parody_evaluations', 'test_answers', 'test_sessions']
	},
	{ title: 'Révisions (SRS)', match: ['srs_'] },
	{ title: 'Python', match: ['python_'] },
	{
		title: 'Messagerie, notifications, modération',
		match: ['message', 'private_messages', 'conversation', 'moderation_logs', 'notification']
	},
	{ title: 'Marché (échanges entre élèves)', match: ['marketplace_'] },
	{
		title: 'Jeux, défis et récompenses',
		match: [
			'game_',
			'minesweeper_',
			'mathemo_scores',
			'riddle',
			'achievement',
			'student_achievements',
			'gidouilles_activity',
			'vip_',
			'bonus_history',
			'daily_game_rewards',
			'weekly_',
			'reward_events',
			'buddy_skins',
			'student_buddies'
		]
	},
	{
		title: 'Google Classroom',
		match: [
			'google_',
			'class_google_classroom_links',
			'coursework_',
			'shared_coursework',
			'shared_materials'
		]
	},
	{
		title: 'Outils du professeur (kanban, tableau blanc, tableur, constructions)',
		match: [
			'kanban_',
			'whiteboard_',
			'user_whiteboard_template_favorites',
			'spreadsheets',
			'construction'
		]
	},
	{ title: 'Tuteur et recherche documentaire (RAG)', match: ['tutor_', 'rag_'] },
	{
		title: 'Exploitation (journaux, configuration, cache)',
		match: [
			'app_config',
			'audit_logs',
			'background_job_runs',
			'bug_reports',
			'error_',
			'rate_limits',
			'server_cache',
			'orphaned_documents',
			'daily_summaries'
		]
	}
];

// ============================================================================
// FONCTIONS
// ============================================================================

/** Le domaine d'une table, ou null si aucune règle ne la couvre. */
export function domainOf(table: string): string | null {
	for (const domain of DOMAINS) {
		const hit = domain.match.some((m) =>
			m.endsWith('_') ? table.startsWith(m) : table === m || table.startsWith(m)
		);
		if (hit) return domain.title;
	}
	return null;
}

/** Le texte d'une section (`Tables: {` … `}`) au niveau de `public`. */
function section(source: string, name: string): string {
	const start = source.indexOf(`\n    ${name}: {`);
	if (start === -1) return '';
	const end = source.indexOf('\n    }', start + 1);
	return source.slice(start, end);
}

/** Noms d'entrée d'une section (indentation 6), surcharges `nom:\n | {…}` comprises. */
function entryNames(text: string): string[] {
	return [...text.matchAll(/^ {6}([a-z_0-9]+):/gm)].map((m) => m[1]);
}

/** Lit database.ts (format de `supabase gen types`). */
export function parseDatabaseTypes(source: string): SchemaModel {
	const tablesText = section(source, 'Tables');
	const tableNames = new Set(entryNames(tablesText));
	const tables: Table[] = [];
	const starts = [...tablesText.matchAll(/^ {6}([a-z_0-9]+): \{$/gm)];
	starts.forEach((m, i) => {
		const body = tablesText.slice(m.index, starts[i + 1]?.index ?? tablesText.length);
		const row = body.match(/ {8}Row: \{\n([\s\S]*?)\n {8}\}/)?.[1] ?? '';
		const columns = [...row.matchAll(/^ {10}([a-z_0-9]+): (.+)$/gm)].map(([, name, raw]) => {
			const nullable = raw.endsWith(' | null');
			return { name, type: raw.replace(/ \| null$/, ''), nullable };
		});
		const foreignKeys = [
			...body.matchAll(
				/columns: \[([^\]]*)\][\s\S]*?referencedRelation: "([a-z_0-9]+)"\s*referencedColumns: \[([^\]]*)\]/g
			)
		]
			// Supabase déclare aussi la clé à travers chaque vue qui expose la table : bruit.
			.filter(([, , table]) => tableNames.has(table))
			.map(([, cols, table, refs]) => ({
				columns: [...cols.matchAll(/"([^"]+)"/g)].map((c) => c[1]),
				table,
				referencedColumns: [...refs.matchAll(/"([^"]+)"/g)].map((c) => c[1])
			}));
		tables.push({ name: m[1], columns, foreignKeys });
	});
	return {
		tables,
		views: entryNames(section(source, 'Views')),
		functions: entryNames(section(source, 'Functions'))
	};
}

function renderTable(table: Table): string {
	const columns = table.columns.map((c) => `\`${c.name}${c.nullable ? '?' : ''}\``).join(' · ');
	const fks = table.foreignKeys.map((fk) => `\`${fk.columns.join(', ')}\` → \`${fk.table}\``);
	const lines = [`### \`${table.name}\``, '', columns];
	if (fks.length > 0) lines.push('', `Liens : ${fks.join(' · ')}`);
	return lines.join('\n');
}

/** Markdown de la doc générée. */
export function renderSchemaDoc(model: SchemaModel): string {
	const out: string[] = [
		'# Base de données — tables par domaine (généré)',
		'',
		'> ⚠️ **Fichier généré** par `scripts/generate-db-doc.ts` depuis `src/lib/types/database.ts`',
		'> (`pnpm db:types` régénère les deux, depuis la **production**). Ne pas éditer à la main :',
		'> le texte explicatif vit dans [base-de-donnees.md](base-de-donnees.md).',
		'',
		`${model.tables.length} tables · ${model.views.length} vues · ${model.functions.length} fonctions. Colonne suivie de \`?\` : peut être nulle.`,
		''
	];
	for (const domain of DOMAINS) {
		const tables = model.tables.filter((t) => domainOf(t.name) === domain.title);
		if (tables.length === 0) continue;
		out.push(`## ${domain.title} (${tables.length})`, '');
		for (const table of tables) out.push(renderTable(table), '');
	}
	const orphans = model.tables.filter((t) => domainOf(t.name) === null);
	if (orphans.length > 0) {
		out.push(`## ⚠️ Sans domaine (${orphans.length})`, '');
		for (const table of orphans) out.push(renderTable(table), '');
	}
	out.push(
		`## Vues (${model.views.length})`,
		'',
		model.views.map((v) => `\`${v}\``).join(' · '),
		''
	);
	out.push(
		`## Fonctions (${model.functions.length})`,
		'',
		model.functions.map((f) => `\`${f}\``).join(' · '),
		''
	);
	return out.join('\n');
}

function main(): void {
	const root = resolve(import.meta.dirname, '..');
	const model = parseDatabaseTypes(
		readFileSync(resolve(root, 'src/lib/types/database.ts'), 'utf-8')
	);
	writeFileSync(resolve(root, OUTPUT), renderSchemaDoc(model));
	const orphans = model.tables.filter((t) => domainOf(t.name) === null).map((t) => t.name);
	console.log(
		`📄 ${OUTPUT} : ${model.tables.length} tables, ${model.views.length} vues, ${model.functions.length} fonctions.`
	);
	if (orphans.length > 0)
		console.log(`⚠️  Sans domaine (à classer dans DOMAINS) : ${orphans.join(', ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
