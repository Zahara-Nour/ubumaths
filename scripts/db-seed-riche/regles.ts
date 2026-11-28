/**
 * Base locale remplie — les règles (sans réseau ni base, donc testables).
 *
 * Décision de David du 2026-10-10 : contenu copié depuis la prod, élèves
 * générés. Inventaire et raisons : docs/archive/wip/base-locale-inventaire.md.
 * Classement de TOUTES les tables en trois familles (2026-11-21, chantier
 * `seed-complet`) : docs/wip/seed-complet-progress.md § 3.
 * Tests : scripts/__tests__/db-seed-riche.test.ts.
 *
 * Une table du schéma est dans UNE des trois listes ci-dessous, et une seule :
 * - COPIE   : du contenu (auteur prof, admin ou personne), copié depuis la prod ;
 * - INVENTE : ce qui touche un élève, jamais copié, inventé pour les élèves fictifs ;
 * - JAMAIS  : ni copié ni inventé, laissé vide (traces, secrets, liens vers l'extérieur).
 * Le test échoue dès qu'une table nouvelle n'est dans aucune : on la classe avant de merger.
 */

/** Tables copiées depuis la prod : le contenu pédagogique, sans élève. */
export const COPIE: readonly string[] = [
	// Programme et arbre
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
	'question_template_reviews',
	'exercises',
	'exercise_versions',
	'exercise_classifications',
	'exercise_curriculum_points',
	'exercise_templates',
	'tags',
	'resource_tags',
	'source_types',
	// Dictionnaire
	'dictionary_entries',
	'dictionary_entry_versions',
	// Feuilles, séries, évaluations (le contenu, pas les passages)
	'worksheets',
	'worksheet_sections',
	'worksheet_exercises',
	'worksheet_templates',
	'worksheet_styles',
	'worksheet_classifications',
	'series',
	'evaluations',
	'evaluation_tasks',
	'evaluation_task_perimeter',
	'parody_evaluations',
	// Chapitres
	'chapter_templates',
	'chapter_template_instantiations',
	'class_chapters',
	'chapter_sections',
	'chapter_series',
	'chapter_worksheets',
	'chapter_exercises',
	'chapter_checklist_items',
	'coursework_categories',
	// Python, géométrie, tableaux, devinettes
	'python_exercises',
	'python_notebooks',
	'python_files',
	'constructions',
	'construction_demo_scripts',
	'geometry_figures',
	'whiteboard_templates',
	'riddles',
	// Copiée à part : le seed écrit en `replica`, le déclencheur de recopie ne tourne pas.
	'riddle_solutions',
	'riddle_of_the_day',
	// Jeux et boutique : le contenu et les réglages, pas les parties
	'game_challenges',
	'game_monsters',
	'game_achievements',
	'game_timeslots',
	'game_class_settings',
	'achievements',
	'minesweeper_achievements',
	'minesweeper_reference_times',
	'minesweeper_tournament_3bv_reference',
	'minesweeper_tournaments',
	'minesweeper_tournament_classes',
	'vip_card_templates',
	'vip_card_config',
	'buddy_skins',
	'avatar_catalog',
	// Calendrier, classes (noms seulement), réglages
	'schools',
	'school_years',
	'academic_periods',
	'school_holidays',
	'classes',
	'class_schedules',
	'class_carnet_settings',
	'app_config',
	'marketplace_config',
	'bug_reports_config',
	'achievement_stats_metadata',
	// Réglages personnels : seules les lignes du prof et de l'admin passent le filtre d'auteur.
	'user_preferences',
	'user_whiteboard_template_favorites',
	'exercise_favorites'
];

/**
 * Tables jamais copiées, dont le contenu est INVENTÉ pour les élèves fictifs :
 * comptes, activité, échanges, famille. Une table citée ici n'est pas forcément
 * déjà remplie : ce qui l'est se lit dans ./activite.ts (le reste arrive PR par PR,
 * docs/wip/seed-complet-progress.md § 5).
 */
export const INVENTE: readonly string[] = [
	// Comptes
	'profiles',
	'class_members',
	// Fiches et exercices assignés
	'worksheet_assignments',
	'worksheet_assignment_classes',
	'worksheet_assignment_students',
	'worksheet_assignment_exercise_settings',
	'worksheet_error_reports',
	'exercise_assignments',
	'exercise_completions',
	'student_exercise_mastery',
	'student_print_settings',
	// Évaluations et suivi
	'evaluation_assignments',
	'evaluation_attempt_questions',
	'test_sessions',
	'test_answers',
	'skill_attempts',
	'student_point_state',
	'student_observable_state',
	'student_competence_level',
	'student_checklist_progress',
	'student_last_visits',
	'student_warnings',
	// Récompenses et succès
	'gidouilles_activity',
	'bonus_history',
	'reward_events',
	'student_achievements',
	'daily_game_rewards',
	'weekly_best_rewards',
	'vip_cards_activity',
	// Boutique, Mathoux, Palotins
	'student_avatars',
	'student_mathoux',
	'student_mathou_decorations',
	'student_beasts',
	'student_buddies',
	// Jeux
	'game_players',
	'game_spells',
	'game_spell_decks',
	'game_combats',
	'student_combat_moves',
	'game_2048_scores',
	'mathemo_scores',
	'minesweeper_games',
	'minesweeper_player_stats',
	'minesweeper_student_achievements',
	'minesweeper_tournament_games',
	// Révisions (les sections suivent les paquets, qui appartiennent aux élèves)
	'srs_decks',
	'srs_deck_sections',
	'srs_cards',
	'srs_card_stats',
	'srs_review_sessions',
	'srs_deck_assignments',
	// Devinettes et Python
	'riddle_assignments',
	'riddle_attempts',
	'python_exercise_assignments',
	'python_exercise_submissions',
	'python_exercise_mastery',
	'python_file_assignments',
	'python_notebook_assignments',
	'python_notebook_checkpoint_runs',
	// Échanges et modération
	'conversations',
	'conversation_participants',
	'messages',
	'private_messages',
	// Boîte de réception : remplie par la fonction d'envoi, pas calculée.
	'message_inbox',
	'message_reactions',
	'message_reports',
	'message_drafts',
	'friendships',
	'notifications',
	'notification_reads',
	'tutor_conversations',
	'tutor_messages',
	'user_restrictions',
	'moderation_logs',
	// Marché
	'marketplace_listings',
	'marketplace_proposals',
	'marketplace_trades',
	'marketplace_locked_cards',
	'marketplace_chat_messages',
	// Famille et inscription
	'parental_consents',
	'parent_contacts',
	'parent_carnet_links',
	'parent_notifications',
	'student_carnet_opt_outs',
	'pending_students',
	// Cahier de texte : jamais copié (2026-10-10), inventé (2026-11-21)
	'class_journal_entries',
	'journal_entry_activities',
	'journal_entry_homework',
	'journal_entry_points',
	// Liens de partage : de faux liens pour ouvrir les pages publiques
	'class_course_share_tokens',
	'class_journal_share_tokens',
	'exercise_share_tokens',
	// Tableau de tâches du prof et signalements de bug : inventés (tranché le 2026-11-21)
	'kanban_boards',
	'kanban_columns',
	'kanban_cards',
	'kanban_card_tags',
	'kanban_tags',
	'bug_reports'
];

/** Tables ni copiées ni inventées : elles restent vides en local. */
export const JAMAIS: readonly string[] = [
	// Traces et compteurs techniques
	'audit_logs',
	'error_logs',
	'error_occurrences',
	'background_job_runs',
	'rate_limits',
	'server_cache',
	'account_deletion_audit',
	'achievement_migrations',
	'migration_images',
	'orphaned_documents',
	'web_vital_samples',
	'whiteboard_export_counters',
	'minesweeper_reference_times_history',
	'welcome_emails_sent',
	// Calculées ou éphémères
	'message_search_index',
	'user_presence',
	'minesweeper_multiplayer_queue',
	'minesweeper_multiplayer_matches',
	'minesweeper_multiplayer_game_state',
	'srs_anti_fraud_flags',
	'short_links',
	// Clôtures d'année : la ligne garde les identifiants des inscriptions d'élèves, sans clé
	// étrangère, donc invisibles pour le filtre d'auteur comme pour la garde de fuite.
	'school_year_closures',
	// Dossiers de messagerie : un nom libre (souvent un prénom), et aucun code ne les lit.
	'user_folders',
	// Corpus de l'assistant : il peut contenir des documents importés par le prof.
	'rag_documents',
	'rag_chunks',
	// Secrets et liens vers l'extérieur (Google, Drive, stockage de prod) : inutilisables
	// en local, et la contrainte valid_upload_fields interdit de vider chapter_documents.
	'google_integrations',
	'google_classroom_courses',
	'google_classroom_topics',
	'google_classroom_coursework',
	'google_classroom_materials',
	'google_classroom_material_attachments',
	'chapter_documents',
	'chapter_decks',
	'coursework_materials',
	'shared_materials',
	'shared_coursework',
	'shared_coursework_students',
	'message_attachments',
	'message_attachments_v2',
	// Échanges et famille (PR 4 du chantier seed-complet, 2026-11-22) : aucune page ne les lit
	// (acceptation des conditions, vues d'annonces, journal de modération des messages, offres
	// d'un ancien circuit d'échange : 0 ligne en prod pour 158 échanges), ou l'envoi des courriels
	// du carnet les tient seul (épisodes d'exception).
	'terms_acceptances',
	'marketplace_listing_views',
	'message_moderation_logs',
	'marketplace_trade_offers',
	'parent_exception_episodes',
	// Tableau de tâches : personne d'autre que le prof n'y est assigné.
	'kanban_card_assignees',
	// Jeux et récompenses (PR 3 du chantier seed-complet, 2026-11-22) : aucune page ne les lit
	// (file d'événements, résumés et récompenses hebdomadaires des tâches planifiées, classements
	// et succès de Navadra jamais branchés, tentatives de défi écrites seulement), ou la base les
	// calcule (progression des succès).
	'achievement_events',
	'achievement_progress',
	'daily_summaries',
	'weekly_rewards',
	'game_leaderboards',
	'game_player_achievements',
	'game_challenge_attempts',
	// Sans lecteur ni écrivain dans l'appli (ADR 0023 : la copie d'une fiche se recalcule à chaque
	// ouverture), suppression prévue : rien à inventer.
	'worksheet_instances',
	// Invitations de cours particulier (2026-11-24) : adresses de parents réelles et liens ;
	// pas encore de page qui les lit, à inventer avec la PR 2 si l'essai local en a besoin.
	'private_lesson_invitations'
];

/**
 * Liens d'une table copiée vers une table qui ne l'est pas, tolérés parce que
 * `neutraliser` met la colonne à vide (« table.colonne »).
 */
export const LIENS_COUPES: readonly string[] = ['classes.google_classroom_course_id'];

export interface Lien {
	/** Une colonne, ou plusieurs pour un lien composé. */
	colonnes: string[];
	vers: string;
}

export interface Schema {
	/** Tables du schéma `public`, chacune avec ses liens (clés étrangères). */
	tables: Map<string, Lien[]>;
	/** Vues : `database.ts` les cite comme cibles de liens, en double de la vraie table. */
	vues: Set<string>;
}

/**
 * Lignes du bloc `<titre>: { … }` (deux tabulations) qui suit la ligne `debut`. Le format lu est
 * celui que `pnpm db:types` écrit : tabulations, points-virgules, guillemets simples.
 */
function bloc(lignes: string[], debut: number, titre: string): string[] {
	const ouverture = lignes.findIndex((l, i) => i > debut && l === `\t\t${titre}: {`);
	const fermeture = lignes.findIndex((l, i) => i > ouverture && l === '\t\t};');
	return ouverture >= 0 && fermeture >= 0 ? lignes.slice(ouverture + 1, fermeture) : [];
}

/** Tables, liens et vues du schéma `public`, lus dans le texte de `src/lib/types/database.ts`. */
export function lireSchema(texte: string): Schema {
	const lignes = texte.split('\n');
	const debutPublic = lignes.findIndex((l) => l === '\tpublic: {');
	const tables = new Map<string, Lien[]>();
	const vues = new Set<string>();
	if (debutPublic >= 0) {
		let liens: Lien[] = [];
		let colonnes: string[] = [];
		for (const ligne of bloc(lignes, debutPublic, 'Tables')) {
			const table = /^\t{3}(\w+): \{$/.exec(ligne);
			if (table) {
				liens = [];
				tables.set(table[1], liens);
				continue;
			}
			const cols = /^\t{6}columns: \[(.*)\];$/.exec(ligne);
			if (cols) colonnes = cols[1].split(',').map((c) => c.trim().replace(/'/g, ''));
			const vers = /^\t{6}referencedRelation: '(\w+)';$/.exec(ligne);
			if (vers) liens.push({ colonnes, vers: vers[1] });
		}
		for (const ligne of bloc(lignes, debutPublic, 'Views')) {
			const vue = /^\t{3}(\w+): \{$/.exec(ligne);
			if (vue) vues.add(vue[1]);
		}
	}
	if (tables.size === 0) {
		throw new Error('lireSchema : aucune table trouvée, le format de database.ts a changé.');
	}
	return { tables, vues };
}

export interface LienEnBase {
	table: string;
	colonnes: string[];
	schemaCible: string;
	cible: string;
	colonnesCible: string[];
}

/**
 * Requête qui compte les lignes de `table` dont le lien ne mène nulle part.
 * Le contenu est écrit déclencheurs suspendus : Postgres ne vérifie alors aucun lien, et une
 * ligne écartée par le filtre d'auteur peut laisser derrière elle une ligne qui la désignait.
 * Comme Postgres (MATCH SIMPLE), une ligne dont une colonne du lien est vide n'est pas vérifiée.
 */
export function requeteOrphelins(lien: LienEnBase): string {
	if (lien.colonnes.length === 0 || lien.colonnes.length !== lien.colonnesCible.length) {
		throw new Error(`${lien.table} : colonnes du lien et de sa cible en nombre différent`);
	}
	const remplies = lien.colonnes.map((c) => `e."${c}" is not null`).join(' and ');
	const egales = lien.colonnes
		.map((c, i) => `c."${lien.colonnesCible[i]}" = e."${c}"`)
		.join(' and ');
	return (
		`select count(*)::int n from public."${lien.table}" e where ${remplies} ` +
		`and not exists (select 1 from "${lien.schemaCible}"."${lien.cible}" c where ${egales})`
	);
}

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
		case 'minesweeper_tournaments':
			// Texte libre du prof, qui peut féliciter un élève par son prénom.
			return { ...ligne, description: null };
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
