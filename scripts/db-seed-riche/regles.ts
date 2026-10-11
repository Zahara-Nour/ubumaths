/**
 * Base locale remplie — les règles (sans réseau ni base, donc testables).
 *
 * Décision de David du 2026-10-10 : contenu copié depuis la prod, élèves
 * générés. Inventaire et raisons : docs/wip/base-locale-inventaire.md.
 * Tests : scripts/__tests__/db-seed-riche.test.ts.
 */

/** Tables copiées depuis la prod : le contenu pédagogique, sans élève. */
export const COPIE: readonly string[] = [
	// Programme et arbre
	'curriculum_themes',
	'curriculum_objectives',
	'curriculum_points',
	'curriculum_point_automatismes',
	'classification_nodes',
	'math_competences',
	'math_competence_subdimensions',
	'observables',
	'grade_predecessors',
	// Questions et exercices
	'question_templates',
	'question_template_points',
	'exercises',
	'exercise_classifications',
	'exercise_curriculum_points',
	'tags',
	'resource_tags',
	'source_types',
	// Feuilles, séries, évaluations (le contenu, pas les passages)
	'worksheets',
	'worksheet_sections',
	'worksheet_exercises',
	'worksheet_templates',
	'series',
	'evaluations',
	'evaluation_tasks',
	'evaluation_task_perimeter',
	'parody_evaluations',
	// Chapitres
	'chapter_templates',
	'chapter_template_versions',
	'class_chapters',
	'chapter_sections',
	'chapter_series',
	'chapter_worksheets',
	'chapter_exercises',
	'chapter_checklist_items',
	// Python, géométrie, tableaux, devinettes
	'python_exercises',
	'python_notebooks',
	'python_files',
	'constructions',
	'construction_demo_scripts',
	'whiteboard_templates',
	'riddles',
	// Jeux : le contenu, pas les parties
	'game_challenges',
	'achievements',
	'minesweeper_achievements',
	'minesweeper_reference_times',
	'minesweeper_tournament_3bv_reference',
	'vip_card_templates',
	'vip_card_config',
	'buddy_skins',
	// Calendrier, classes (noms seulement), réglages
	'schools',
	'school_years',
	'academic_periods',
	'school_holidays',
	'classes',
	'class_schedules',
	'app_config',
	'marketplace_config',
	'bug_reports_config',
	'achievement_stats_metadata'
];

/**
 * Tables qui ne doivent JAMAIS figurer dans COPIE (garde du test) : élèves,
 * activité, échanges, contenu créé par des élèves, cahier de texte, traces.
 */
export const JAMAIS: readonly string[] = [
	'profiles',
	'class_members',
	'pending_students',
	'parental_consents',
	'terms_acceptances',
	'welcome_emails_sent',
	'srs_decks',
	'srs_cards',
	'srs_card_stats',
	'srs_review_sessions',
	'game_spells',
	'game_players',
	'spreadsheets',
	'messages',
	'conversations',
	'conversation_participants',
	'private_messages',
	'tutor_conversations',
	'tutor_messages',
	'friendships',
	'notifications',
	'class_journal_entries',
	'journal_entry_activities',
	'journal_entry_homework',
	'journal_entry_points',
	'audit_logs',
	'error_logs',
	'bug_reports',
	'reward_events',
	'gidouilles_activity',
	'student_warnings',
	'evaluation_assignments',
	'evaluation_attempt_questions',
	'worksheet_assignments',
	'worksheet_assignment_students',
	'minesweeper_games',
	'marketplace_trades',
	'google_integrations',
	// Liens vers les fichiers de prod (Drive, stockage) : inutilisables en local,
	// et la contrainte valid_upload_fields interdit de les vider.
	'chapter_documents'
];

/** Refuse tout ce qui n'est pas « source distante → cible locale ». */
export function verifierCibles(c: { source: string; cible: string; pg: string }): void {
	const local = (url: string) => {
		try {
			return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
		} catch {
			return false;
		}
	};
	if (local(c.source)) {
		throw new Error(`La source (${c.source}) est locale : le .env de prod est mal rempli.`);
	}
	if (!local(c.cible)) {
		throw new Error(`La cible (${c.cible}) n'est pas locale : refus d'écrire.`);
	}
	if (c.pg.includes('?')) {
		throw new Error('URL Postgres refusée : un paramètre de requête peut remplacer l’hôte.');
	}
	if (!local(c.pg)) {
		throw new Error('La connexion Postgres cible n’est pas locale : refus d’écrire.');
	}
}

export type Ligne = Record<string, unknown>;

/**
 * Garde une ligne seulement si chaque colonne d'utilisateur vaut null ou un
 * compte du personnel (prof, admin), et remplace alors cet identifiant de
 * prod par celui du compte local. Une seule colonne qui désigne quelqu'un
 * d'autre — un élève — écarte la ligne entière.
 */
export function filtrerLignes(
	lignes: readonly Ligne[],
	colonnesUtilisateur: readonly string[],
	correspondance: ReadonlyMap<string, string>
): { gardees: Ligne[]; ecartees: number } {
	const gardees: Ligne[] = [];
	let ecartees = 0;
	for (const ligne of lignes) {
		const copie: Ligne = { ...ligne };
		let garder = true;
		for (const col of colonnesUtilisateur) {
			const v = copie[col];
			if (v === null || v === undefined) continue;
			const local = correspondance.get(String(v));
			if (local === undefined) {
				garder = false;
				break;
			}
			copie[col] = local;
		}
		if (garder) gardees.push(copie);
		else ecartees++;
	}
	return { gardees, ecartees };
}

/** Valeur prête pour `pg` : le JSON est sérialisé (pg prendrait un tableau JS pour un tableau Postgres). */
export function valeurPg(valeur: unknown, type: string): unknown {
	if (valeur === null || valeur === undefined) return null;
	if (type === 'json' || type === 'jsonb') return JSON.stringify(valeur);
	return valeur;
}

/**
 * Champs à neutraliser même dans une table de contenu : un code d'inscription
 * de classe ouvre une vraie classe de prod, un identifiant Google Classroom
 * désigne un vrai cours. En local, des valeurs fictives.
 */
export function neutraliser(table: string, ligne: Ligne, rang: number): Ligne {
	switch (table) {
		case 'classes':
			return {
				...ligne,
				join_code: `LOCAL${String(rang + 1).padStart(3, '0')}`,
				registration_open: false,
				google_classroom_course_id: null,
				// Texte libre du prof (peut nommer un élève) et configuration du tuteur.
				description: null,
				tutor_config: null
			};
		case 'class_schedules':
			return { ...ligne, notes: null };
		default:
			return ligne;
	}
}

/**
 * Remplace, partout dans la ligne (colonnes, JSON imbriqué, texte), les
 * identifiants du personnel de prod par ceux des comptes locaux. Couvre les
 * colonnes sans clé étrangère (`app_config.updated_by`) et les instantanés JSON.
 */
export function remplacerIds<T>(valeur: T, correspondance: ReadonlyMap<string, string>): T {
	if (typeof valeur === 'string') {
		let v: string = valeur;
		for (const [prod, local] of correspondance) v = v.split(prod).join(local);
		return v as T;
	}
	if (Array.isArray(valeur)) return valeur.map((x) => remplacerIds(x, correspondance)) as T;
	if (valeur !== null && typeof valeur === 'object') {
		return Object.fromEntries(
			Object.entries(valeur).map(([k, x]) => [k, remplacerIds(x, correspondance)])
		) as T;
	}
	return valeur;
}

// Le domaine commence par une lettre et finit par une extension alphabétique :
// `dragon@0.5x.webp` (image haute densité) n'est pas une adresse.
const EMAIL = /[\w.+-]+@[A-Za-z][\w-]*(?:\.[A-Za-z][\w-]*)*\.[A-Za-z]{2,}\b/;

/**
 * Dernière garde avant l'écriture : une ligne qui contient encore un
 * identifiant d'utilisateur de la prod, une adresse e-mail ou le nom complet
 * d'un élève fait ÉCHOUER le script. Le message ne révèle jamais la donnée.
 */
export function detecterFuite(
	ligne: Ligne,
	interdits: { ids: readonly string[]; noms: readonly string[] }
): string | null {
	const texte = JSON.stringify(ligne);
	if (interdits.ids.some((id) => texte.includes(id))) {
		return 'un identifiant d’utilisateur de la prod';
	}
	if (EMAIL.test(texte)) return 'une adresse e-mail';
	const bas = texte.toLowerCase();
	if (interdits.noms.some((n) => n.trim().includes(' ') && bas.includes(n.toLowerCase()))) {
		return 'le nom complet d’un utilisateur';
	}
	return null;
}
