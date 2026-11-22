/**
 * `pnpm db:seed-riche` — remplir la base LOCALE : contenu de la prod, élèves fictifs.
 *
 * Décision de David du 2026-10-10. Inventaire : docs/archive/wip/base-locale-inventaire.md.
 * Règles (testées) : ./regles.ts.
 *
 * 1. Lit la prod (URL et clé de .env) en LECTURE SEULE : des `select`, rien d'autre.
 * 2. Écrit dans le Postgres local (127.0.0.1:54322), déclencheurs suspendus
 *    (session_replication_role = replica) : ni notification, ni garde métier
 *    déclenchés par le chargement.
 * 3. Une ligne dont un utilisateur n'est ni le prof ni l'admin n'est jamais
 *    copiée ; le prof et l'admin de prod deviennent les comptes locaux de
 *    supabase/seed/dev_accounts.sql. Aucun identifiant de la prod n'arrive en local.
 * 4. Crée 30 élèves fictifs (eleveNN@local.test / local-eleve) répartis dans
 *    les classes copiées, plus un élève hors classe.
 * 5. Génère leur activité (./activite.ts), déclencheurs ACTIFS : l'historique
 *    des récompenses se remplit comme si l'app avait tout fait.
 *
 * 6. Met d'abord la base à jour de ses migrations (../db-a-jour), puis la marque
 *    « contenu de la prod » : `pnpm db:a-jour` sait alors qu'une migration de
 *    contenu déjà faite en prod n'a rien à faire ici.
 *
 * `--verifier-prod` : dit seulement si la prod répond, sans rien ouvrir ni écrire en local.
 *
 * Après `pnpm db:reset` (base repartie de zéro) ou pour rafraîchir le contenu,
 * sous le verrou Supabase : `pnpm db:seed-riche`.
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import {
	COPIE,
	detecterFuite,
	filtrerLignes,
	neutraliser,
	remplacerIds,
	requeteOrphelins,
	valeurPg,
	verifierCibles,
	type Ligne,
	type LienEnBase
} from './regles';
import { planActivite } from './activite';
import { ECRITURE_SUIVI, planSuivi, PREFIXE_SUIVI } from './suivi';
import { creerMoteur } from './moteur';
import type { QuestionTemplateRow } from '#lib/types/question-template.ts';
import { marquerContenuDeProd, mettreAJour } from '../db-a-jour/appliquer';

const PROF_LOCAL = '11111111-1111-4111-8111-111111111111';
const ADMIN_LOCAL = '33333333-3333-4333-8333-333333333333';
const NB_ELEVES = 30;
const PAGE = 1000;
const LOT = 300;
/** Motif des identifiants des élèves fictifs (dans un `like`). */
const FICTIFS = `'5eed0000-0000-4000-8000-0000000000%'`;

interface Colonne {
	nom: string;
	type: string;
	insérable: boolean;
}

async function colonnesLocales(db: pg.Client, table: string): Promise<Colonne[]> {
	const r = await db.query(
		`select column_name, data_type, is_generated, identity_generation
		   from information_schema.columns
		  where table_schema = 'public' and table_name = $1
		  order by ordinal_position`,
		[table]
	);
	return r.rows.map((c) => ({
		nom: c.column_name,
		type: c.data_type === 'ARRAY' ? 'ARRAY' : c.data_type,
		insérable: c.is_generated !== 'ALWAYS'
	}));
}

/** Colonnes de la table qui désignent un utilisateur (clé étrangère vers auth.users ou profiles). */
async function colonnesUtilisateur(db: pg.Client, table: string): Promise<string[]> {
	const r = await db.query(
		`select a.attname
		   from pg_constraint c
		   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
		  where c.contype = 'f'
		    and c.conrelid = ('public.' || quote_ident($1))::regclass
		    and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)`,
		[table]
	);
	return r.rows.map((x) => x.attname as string);
}

async function clePrimaire(db: pg.Client, table: string): Promise<string[]> {
	const r = await db.query(
		`select a.attname
		   from pg_index i
		   join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
		  where i.indrelid = ('public.' || quote_ident($1))::regclass and i.indisprimary`,
		[table]
	);
	return r.rows.map((x) => x.attname as string);
}

async function lireProd(
	prod: ReturnType<typeof createClient>,
	table: string,
	ordre: string[]
): Promise<Ligne[]> {
	const lignes: Ligne[] = [];
	for (let debut = 0; ; debut += PAGE) {
		let q = prod.from(table).select('*');
		for (const col of ordre) q = q.order(col);
		const { data, error } = await q.range(debut, debut + PAGE - 1);
		if (error) throw new Error(`lecture prod de ${table} : ${error.message}`);
		lignes.push(...((data ?? []) as Ligne[]));
		if (!data || data.length < PAGE) return lignes;
	}
}

async function inserer(db: pg.Client, table: string, colonnes: Colonne[], lignes: Ligne[]) {
	if (lignes.length === 0) return;
	const presentes = colonnes.filter((c) => c.insérable && c.nom in lignes[0]);
	const noms = presentes.map((c) => `"${c.nom}"`).join(', ');
	for (let i = 0; i < lignes.length; i += LOT) {
		const lot = lignes.slice(i, i + LOT);
		const valeurs: unknown[] = [];
		const tuples = lot.map((ligne) => {
			const places = presentes.map((c) => {
				valeurs.push(valeurPg(ligne[c.nom], c.type));
				return `$${valeurs.length}`;
			});
			return `(${places.join(', ')})`;
		});
		await db.query(
			`insert into public."${table}" (${noms}) overriding system value values ${tuples.join(', ')}`,
			valeurs
		);
	}
}

/**
 * Liens (clés étrangères) des tables copiées, lus dans la base : après la copie, chacun doit
 * mener quelque part. Rend les liens rompus, avec le nombre de lignes orphelines.
 */
async function liensRompus(db: pg.Client, tables: readonly string[]) {
	const r = await db.query(
		`select t.relname as "table",
		        array(select a.attname::text from unnest(c.conkey) with ordinality k(num, rang)
		                join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.num
		               order by k.rang) as colonnes,
		        nc.nspname as "schemaCible", tc.relname as cible,
		        array(select a.attname::text from unnest(c.confkey) with ordinality k(num, rang)
		                join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.num
		               order by k.rang) as "colonnesCible"
		   from pg_constraint c
		   join pg_class t on t.oid = c.conrelid
		   join pg_namespace n on n.oid = t.relnamespace
		   join pg_class tc on tc.oid = c.confrelid
		   join pg_namespace nc on nc.oid = tc.relnamespace
		  where c.contype = 'f' and n.nspname = 'public' and t.relname = any($1::text[])
		  order by t.relname, c.conname`,
		[tables]
	);
	const liens = r.rows as LienEnBase[];
	const rompus: string[] = [];
	for (const lien of liens) {
		const n = (await db.query(requeteOrphelins(lien))).rows[0].n as number;
		if (n > 0) {
			rompus.push(
				`${lien.table}.${lien.colonnes.join('+')} → ${lien.cible} : ${n} ligne(s) orpheline(s)`
			);
		}
	}
	return { verifies: liens.length, rompus };
}

async function creerEleves(db: pg.Client): Promise<number> {
	// Les classes de l'année en cours seulement : une classe archivée n'a plus de page de suivi,
	// y ranger des élèves les rendrait invisibles. À défaut (aucune classe active), toutes.
	const toutes = (
		await db.query(
			`select id, school_id, is_active from public.classes where join_code like 'LOCAL%' order by name`
		)
	).rows as { id: string; school_id: string | null; is_active: boolean }[];
	const classes = toutes.some((c) => c.is_active) ? toutes.filter((c) => c.is_active) : toutes;
	// Un passage précédent a pu ranger les élèves autrement : on repart de zéro.
	await db.query(`delete from public.class_members where student_id::text like ${FICTIFS}`);
	for (let n = 1; n <= NB_ELEVES + 1; n++) {
		const nn = String(n).padStart(2, '0');
		const id = `5eed0000-0000-4000-8000-0000000000${nn}`;
		const email = `eleve${nn}@local.test`;
		const nom = n > NB_ELEVES ? `Élève hors classe` : `Élève ${nn}`;
		await db.query(
			`insert into auth.users (
				instance_id, id, aud, role, email, encrypted_password,
				email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
				confirmation_token, recovery_token, email_change_token_new, email_change,
				email_change_token_current, phone_change, phone_change_token, reauthentication_token
			) values (
				'00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
				$2, extensions.crypt('local-eleve', extensions.gen_salt('bf')),
				now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
				jsonb_build_object('full_name', $3::text, 'email_verified', true),
				'', '', '', '', '', '', '', ''
			) on conflict (id) do nothing`,
			[id, email, nom]
		);
		await db.query(
			`insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
			 values ($1::text, $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), 'email', now(), now(), now())
			 on conflict (provider, provider_id) do nothing`,
			[id, email]
		);
		const classe = n <= NB_ELEVES && classes.length > 0 ? classes[(n - 1) % classes.length] : null;
		await db.query(
			// status explicite : le trigger crée un compte sans code « en attente » (B7).
			// Prénom et nom : sans eux, les listes du prof affichent « Élève sans nom ». L'école est
			// celle de la classe (classements et échanges s'arrêtent à l'école).
			`insert into public.profiles (id, email, role, full_name, status, firstname, lastname, school_id)
			 values ($1, $2, 'student', $3, 'approved', $4, $5, $6)
			 on conflict (id) do update set status = 'approved', firstname = excluded.firstname,
			   lastname = excluded.lastname, school_id = excluded.school_id`,
			[id, email, nom, 'Élève', n > NB_ELEVES ? 'hors classe' : nn, classe?.school_id ?? null]
		);
		if (classe) {
			await db.query(
				`insert into public.class_members (class_id, student_id) values ($1, $2) on conflict do nothing`,
				[classe.id, id]
			);
		}
	}
	return classes.length;
}

/**
 * Insertion simple, déclencheurs actifs (contrairement au contenu). Un objet ou un tableau part en
 * JSON, sauf les colonnes de `tableaux` : ce sont des tableaux Postgres (`text[]`, `boolean[]`).
 */
async function ajouter(
	db: pg.Client,
	table: string,
	lignes: Record<string, unknown>[],
	tableaux: readonly string[] = []
) {
	for (let i = 0; i < lignes.length; i += LOT) {
		const lot = lignes.slice(i, i + LOT);
		const cols = Object.keys(lot[0]);
		const valeurs: unknown[] = [];
		const tuples = lot.map((l) => {
			const places = cols.map((c) => {
				const v = l[c];
				valeurs.push(
					v !== null && typeof v === 'object' && !tableaux.includes(c) ? JSON.stringify(v) : v
				);
				return `$${valeurs.length}`;
			});
			return `(${places.join(', ')})`;
		});
		await db.query(
			`insert into public."${table}" (${cols.map((c) => `"${c}"`).join(', ')}) values ${tuples.join(', ')}`,
			valeurs
		);
	}
}

async function genererActivite(db: pg.Client) {
	// Un passage précédent est effacé d'abord : relancer ne double rien.
	await db.query('begin');
	const nettoyage = [
		`delete from public.worksheet_assignments where created_by = '${PROF_LOCAL}'`,
		`delete from public.evaluation_assignments where assigned_by = '${PROF_LOCAL}'`,
		`delete from public.conversations where created_by = '${PROF_LOCAL}' and name = 'Discussion de classe'`
	];
	for (const t of [
		'student_exercise_mastery',
		'gidouilles_activity',
		'bonus_history',
		'student_warnings',
		'reward_events'
	]) {
		nettoyage.push(`delete from public.${t} where student_id::text like ${FICTIFS}`);
	}
	nettoyage.push(`delete from public.friendships where requester_id::text like ${FICTIFS}`);
	for (const q of nettoyage) await db.query(q);

	const classes = (
		await db.query(
			`select c.id, coalesce(array_agg(m.student_id order by m.student_id) filter (where m.student_id is not null), '{}') eleves
			   from public.classes c
			   left join public.class_members m on m.class_id = c.id and m.student_id::text like ${FICTIFS}
			  where c.join_code like 'LOCAL%'
			  -- Les classes les plus remplies d'abord : c'est dans les deux premières que se joue
			  -- l'essentiel de l'activité (élève étoile, élève absent, amitiés, évaluation).
			  group by c.id order by count(m.student_id) desc, c.id`
		)
	).rows as { id: string; eleves: string[] }[];
	const feuilles = (
		await db.query(
			`select w.id, coalesce(array_agg(e.exercise_id order by e.exercise_id) filter (where e.exercise_id is not null), '{}') exercices
			   from public.worksheets w left join public.worksheet_exercises e on e.worksheet_id = w.id
			  group by w.id order by w.id`
		)
	).rows as { id: string; exercices: string[] }[];
	const evaluation =
		(await db.query('select id from public.evaluations order by id limit 1')).rows[0]?.id ?? null;
	const periode =
		(
			await db.query(
				`select id from public.academic_periods order by (current_date between start_date and end_date) desc, start_date desc limit 1`
			)
		).rows[0]?.id ?? null;

	const plan = planActivite({
		prof: PROF_LOCAL,
		classes,
		horsClasse: `5eed0000-0000-4000-8000-0000000000${String(NB_ELEVES + 1).padStart(2, '0')}`,
		feuilles,
		evaluation,
		periode,
		maintenant: new Date(),
		graine: 20261010
	});

	await ajouter(db, 'worksheet_assignments', plan.assignations);
	await ajouter(db, 'worksheet_assignment_classes', plan.assignationsClasses);
	await ajouter(db, 'student_exercise_mastery', plan.maitrise);
	await ajouter(db, 'gidouilles_activity', plan.gidouilles);
	await ajouter(db, 'bonus_history', plan.bonus);
	await ajouter(db, 'student_warnings', plan.avertissements);
	// La conversation d'abord sans dernier message : le déclencheur des messages le renseigne.
	await ajouter(
		db,
		'conversations',
		plan.conversations.map(
			({ last_message_id: _a, last_message_preview: _b, last_message_at: _c, ...c }) => c
		)
	);
	await ajouter(db, 'conversation_participants', plan.participants);
	await ajouter(db, 'messages', plan.messages);
	await ajouter(db, 'friendships', plan.amities);
	await ajouter(db, 'evaluation_assignments', plan.evaluationsAssignees);

	// Compteurs dénormalisés que l'app tient à jour elle-même (update_student_gidouilles).
	await db.query(
		`update public.profiles p set
		   gidouilles = greatest(0, coalesce((select sum(delta) from public.gidouilles_activity g where g.student_id = p.id), 0)),
		   bonus = coalesce((select sum(delta) from public.bonus_history b where b.student_id = p.id), 0)
		 where p.id::text like ${FICTIFS}`
	);
	await db.query('commit');
	return { plan, classes };
}

/**
 * Suivi et travail scolaire (./suivi.ts), déclencheurs ACTIFS : l'état des points du programme et
 * la maîtrise Python se calculent seuls, comme si les élèves avaient vraiment travaillé.
 */
async function genererSuivi(
	db: pg.Client,
	activite: Awaited<ReturnType<typeof genererActivite>>,
	maintenant: Date
) {
	const ids = async (sql: string, params: unknown[] = []) =>
		(await db.query(sql, params)).rows.map((x) => x.id as string);

	// --- Ce que le contenu copié offre -----------------------------------------------------------
	const niveaux = new Map<string, string | null>(
		(await db.query('select id, grade from public.classes')).rows.map((k) => [k.id, k.grade])
	);
	const classes = [];
	for (const k of activite.classes) {
		// Modèles publiés, rangés à un point vivant du programme du niveau de la classe, hors cours :
		// ceux que l'appli met dans le paquet « Programme » et dans la grille du prof. Deux modèles
		// par point, pour les points qui en ont au moins deux : un point ne s'acquiert « par
		// diversité » qu'avec deux modèles différents réussis.
		const rangs = `select p.point_id, t.id, t.level,
			        row_number() over (partition by p.point_id order by t.level, t.id) rang,
			        count(*) over (partition by p.point_id) nb
			   from public.question_template_points p
			   join public.question_templates t on t.id = p.template_id
			   join public.curriculum_points cp on cp.id = p.point_id
			  where t.status = 'published' and t.type <> 'course_card'
			    and coalesce(t.options->>'courseQuestion', '') <> 'true'
			    and cp.grade = $1 and cp.archived_at is null`;
		const niveau = [niveaux.get(k.id) ?? null];
		const parPaires = await ids(
			`select id from (${rangs}) x where nb >= 2 and rang <= 2 order by point_id, rang limit 48`,
			niveau
		);
		const seuls = await ids(`select id from (${rangs}) x order by level, id limit 24`, niveau);
		const modeles = [...new Set(parPaires.length > 0 ? parPaires : seuls)].slice(0, 24);
		classes.push({ ...k, modeles });
	}
	const evaluationId = (activite.plan.evaluationsAssignees[0]?.evaluation_id as string) ?? null;
	const items: unknown[] | null = evaluationId
		? ((
				await db.query(
					`select s.items from public.evaluations e join public.series s on s.id = e.series_id where e.id = $1`,
					[evaluationId]
				)
			).rows[0]?.items ?? null)
		: null;
	const idsModeles = [
		...new Set([
			...classes.flatMap((k) => k.modeles),
			...(Array.isArray(items) ? items : []).flatMap((i) =>
				typeof (i as { templateId?: unknown })?.templateId === 'string'
					? [(i as { templateId: string }).templateId]
					: []
			)
		])
	];
	const lignesModeles = (
		await db.query('select * from public.question_templates where id = any($1::uuid[])', [
			idsModeles
		])
	).rows as QuestionTemplateRow[];
	const moteur = creerMoteur(lignesModeles, items ?? []);

	const assignations = [];
	for (const a of activite.plan.assignations) {
		assignations.push({
			id: a.id,
			classe:
				activite.plan.assignationsClasses.find((x) => x.assignment_id === a.id)?.class_id ?? '',
			exercicesDeFiche: await ids(
				`select id from public.worksheet_exercises where worksheet_id = $1 order by position, id`,
				[a.worksheet_id]
			)
		});
	}
	const carnets = (
		await db.query(
			`select n.id, coalesce(array(select c->>'id' from jsonb_array_elements(n.content->'cells') c
			                             where c->>'type' = 'checkpoint'), '{}') controles
			   from public.python_notebooks n where not n.is_template order by n.id`
		)
	).rows as { id: string; controles: string[] }[];
	const devinette = (
		await db.query(
			`select id, difficulty from public.riddles order by (status = 'published') desc, riddle_number, id limit 1`
		)
	).rows[0] as { id: string; difficulty: number } | undefined;
	const observables = (
		await db.query(
			`select o.id, o.observable_code code, s.math_competence_id competence
			   from public.observables o join public.math_competence_subdimensions s on s.id = o.subdimension_id
			  order by s.math_competence_id, o.observable_code`
		)
	).rows as { id: string; code: string; competence: string }[];

	const plan = planSuivi({
		prof: PROF_LOCAL,
		classes,
		horsClasse: `5eed0000-0000-4000-8000-0000000000${String(NB_ELEVES + 1).padStart(2, '0')}`,
		maintenant,
		graine: 20261122,
		evaluation: evaluationId && items ? { id: evaluationId, items } : null,
		tirer: moteur.tirer,
		corriger: moteur.corriger,
		attendues: moteur.attendues,
		assignations,
		exercices: await ids('select id from public.exercises order by id limit 4'),
		python: {
			exercices: await ids('select id from public.python_exercises order by title, id limit 4'),
			fichier: (await ids('select id from public.python_files order by id limit 1'))[0] ?? null,
			carnets
		},
		devinette: devinette ? { id: devinette.id, difficulte: devinette.difficulty } : null,
		observables
	});

	// --- Un passage précédent est effacé d'abord : relancer ne double rien ------------------------
	await db.query('begin');
	const invente = `id::text like '${PREFIXE_SUIVI}-%'`;
	const parEleve: [table: string, colonne: string][] = [
		// Les réponses et les questions tirées partent avec leur séance (suppression en cascade).
		['test_sessions', 'user_id'],
		['skill_attempts', 'student_id'],
		['student_point_state', 'student_id'],
		['student_observable_state', 'student_id'],
		['student_competence_level', 'student_id'],
		['student_last_visits', 'student_id'],
		['student_print_settings', 'student_id'],
		['srs_review_sessions', 'user_id'],
		['srs_card_stats', 'user_id'],
		// Cartes et sections partent avec leur paquet.
		['srs_decks', 'owner_id'],
		['python_exercise_submissions', 'student_id'],
		['python_exercise_mastery', 'student_id'],
		['python_notebook_checkpoint_runs', 'user_id'],
		['riddle_attempts', 'student_id'],
		['worksheet_error_reports', 'student_id'],
		['worksheet_assignment_students', 'student_id'],
		['exercise_completions', 'student_id']
	];
	for (const [table, colonne] of parEleve) {
		await db.query(`delete from public."${table}" where "${colonne}"::text like ${FICTIFS}`);
	}
	// Ce que le prof local assigne : comme pour les fiches, tout ce qu'il a assigné est remplacé.
	const parProf: [table: string, colonne: string][] = [
		['python_exercise_assignments', 'assigned_by'],
		['python_file_assignments', 'assigned_by'],
		['python_notebook_assignments', 'shared_by'],
		['riddle_assignments', 'assigned_by'],
		['exercise_assignments', 'assigned_by']
	];
	for (const [table, colonne] of parProf) {
		await db.query(`delete from public."${table}" where "${colonne}" = $1`, [PROF_LOCAL]);
	}
	// Les paquets que le prof a faits lui-même en local restent : seuls les inventés partent.
	for (const table of [
		'srs_deck_assignments',
		'srs_decks',
		'worksheet_assignment_exercise_settings'
	]) {
		await db.query(`delete from public."${table}" where ${invente}`);
	}
	// Notifications créées par le déclencheur des signalements, pour le prof local.
	await db.query(
		`delete from public.notifications
		  where is_system and system_event_type = 'error_reported' and target_user_ids = array[$1::uuid]`,
		[PROF_LOCAL]
	);

	// --- Écriture, dans l'ordre des liens ---------------------------------------------------------
	for (const { partie, table, tableaux } of ECRITURE_SUIVI) {
		await ajouter(db, table, plan[partie], tableaux);
	}

	// Gidouilles gagnées aux devinettes : la validation du prof les ajoute au compteur de l'élève.
	for (const t of plan.devinettesTentatives.filter((x) => x.gidouilles_awarded > 0)) {
		await db.query('update public.profiles set gidouilles = gidouilles + $1 where id = $2', [
			t.gidouilles_awarded,
			t.student_id
		]);
	}
	await db.query('commit');

	const calcules = (
		await db.query(
			`select (select count(*)::int from public.student_point_state where student_id::text like ${FICTIFS}) points,
			        (select count(*)::int from public.python_exercise_mastery where student_id::text like ${FICTIFS}) python`
		)
	).rows[0] as { points: number; python: number };
	return { plan, calcules };
}

async function main() {
	const envProd = parse(readFileSync('.env'));
	const envLocal = parse(readFileSync('.env.local'));
	const source = envProd.PUBLIC_SUPABASE_URL;
	const cle = envProd.SUPABASE_SERVICE_ROLE_KEY;
	const cible = envLocal.PUBLIC_SUPABASE_URL;
	const pgUrl =
		process.env.SEED_RICHE_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
	verifierCibles({ source, cible, pg: pgUrl });
	if (!cle) throw new Error('SUPABASE_SERVICE_ROLE_KEY absente de .env');

	const prod = createClient(source, cle, { auth: { persistSession: false } });

	// `--verifier-prod` : la source répond-elle ? Rien n'est écrit, la base locale n'est même pas
	// ouverte. `pnpm db:neuf` le demande AVANT d'effacer la base de dev.
	if (process.argv.includes('--verifier-prod')) {
		// Délai maximum : cette vérification tourne sous le verrou Supabase, une lecture qui pend
		// bloquerait les `db:*` de toutes les sessions.
		const { error } = await prod
			.from('question_templates')
			.select('id')
			.limit(1)
			.abortSignal(AbortSignal.timeout(20_000));
		if (error) throw new Error(`la prod ne répond pas : ${error.message}`);
		console.log('✓ la prod répond.');
		return;
	}

	const db = new pg.Client({ connectionString: pgUrl });
	await db.connect();

	try {
		// Identifiants et noms restent en mémoire : ils servent aux gardes, jamais à un affichage.
		const utilisateurs: { id: string; role: string; full_name: string | null }[] = [];
		for (let debut = 0; ; debut += PAGE) {
			const { data, error } = await prod
				.from('profiles')
				.select('id, role, full_name')
				.order('id')
				.range(debut, debut + PAGE - 1);
			if (error) throw new Error(`lecture des profils : ${error.message}`);
			utilisateurs.push(...(data ?? []));
			if (!data || data.length < PAGE) break;
		}
		const correspondance = new Map<string, string>(
			utilisateurs
				.filter((u) => u.role === 'teacher' || u.role === 'admin')
				.map((u) => [u.id, u.role === 'teacher' ? PROF_LOCAL : ADMIN_LOCAL])
		);
		const interdits = {
			ids: utilisateurs.map((u) => u.id),
			noms: utilisateurs
				.filter((u) => u.role === 'student' && u.full_name)
				.map((u) => u.full_name as string)
		};

		// La cible ne doit contenir AUCUN compte de la prod : c'est la preuve que
		// ce n'est pas la prod (atteinte par un tunnel ou une URL trompeuse).
		const intrus = await db.query(
			'select count(*)::int n from auth.users where id = any($1::uuid[])',
			[interdits.ids]
		);
		if (intrus.rows[0].n > 0) {
			throw new Error(
				'La base cible contient des comptes de la prod : ce n’est pas la base locale. Rien n’est écrit.'
			);
		}
		console.log(`Personnel de prod : ${correspondance.size} compte(s) → comptes locaux.`);

		// Le contenu de la prod suppose le schéma de la prod : une base en retard de migrations
		// recevrait des lignes sans leurs colonnes. On la met à jour d'abord (fonction appelée
		// directement : le verrou Supabase est déjà tenu par cette commande). Toutes les migrations
		// du worktree courant sont jouées, celles de sa branche comprises : le seed est un geste voulu.
		const bilan = await mettreAJour(db, {
			dossier: 'supabase/migrations',
			dire: (ligne) => console.log(ligne)
		});
		if (bilan.arret) {
			throw new Error(
				`Base locale en retard, et sa mise à jour s'arrête sur ${bilan.arret.migration.fichier} (${bilan.arret.message}). Rien n’est copié : \`pnpm db:a-jour\` pour le détail.`
			);
		}

		// Les comptes locaux (prof, admin, élève de dev) doivent exister avant le contenu.
		await db.query(readFileSync('supabase/seed/dev_accounts.sql', 'utf8'));

		await db.query('begin');
		await db.query('set local session_replication_role = replica');
		let total = 0;
		for (const table of COPIE) {
			const colonnes = await colonnesLocales(db, table);
			if (colonnes.length === 0) {
				console.log(`  ⚠️  ${table} : absente en local, ignorée`);
				continue;
			}
			const cle = await clePrimaire(db, table);
			if (cle.length === 0)
				throw new Error(`${table} : pas de clé primaire, lecture paginée non fiable`);
			const brutes = await lireProd(prod, table, cle);
			const { gardees, ecartees } = filtrerLignes(
				brutes,
				await colonnesUtilisateur(db, table),
				correspondance
			);
			const lignes = gardees.map((l, i) => neutraliser(table, remplacerIds(l, correspondance), i));
			for (const ligne of lignes) {
				const fuite = detecterFuite(ligne, interdits);
				if (fuite) throw new Error(`${table} : une ligne contient ${fuite}. Rien n’est écrit.`);
			}
			await db.query(`delete from public."${table}"`);
			await inserer(db, table, colonnes, lignes);
			total += lignes.length;
			console.log(
				`  ${table.padEnd(38)} ${String(lignes.length).padStart(5)}${ecartees ? `  (${ecartees} écartée(s) : un élève)` : ''}`
			);
		}
		// Déclencheurs suspendus, donc liens non vérifiés par Postgres : on les vérifie ici, avant
		// de valider. Un lien rompu annule toute la copie (la base garde son contenu d'avant).
		const liens = await liensRompus(db, COPIE);
		if (liens.rompus.length > 0) {
			throw new Error(
				`Contenu incohérent après la copie, rien n’est écrit :\n  ${liens.rompus.join('\n  ')}`
			);
		}
		console.log(`  ${liens.verifies} liens vérifiés, aucune ligne orpheline.`);
		await db.query('commit');

		// Rejoué après la copie : la classe et la configuration de dev, effacées par
		// le remplacement des tables, reviennent (on conflict do nothing).
		await db.query(readFileSync('supabase/seed/dev_accounts.sql', 'utf8'));
		await marquerContenuDeProd(db);
		const nbClasses = await creerEleves(db);
		const activite = await genererActivite(db);
		const plan = activite.plan;
		const suivi = await genererSuivi(db, activite, new Date());
		console.log(`\n✅ ${total} lignes de contenu copiées.`);
		console.log(
			`✅ ${NB_ELEVES} élèves fictifs répartis dans ${nbClasses} classe(s), plus un hors classe : eleve01…eleve${NB_ELEVES + 1}@local.test / local-eleve`
		);
		console.log(
			`✅ Activité : ${plan.assignations.length} feuille(s) assignée(s), ${plan.maitrise.length} progressions, ${plan.gidouilles.length} mouvements de Gidouilles, ${plan.bonus.length} bonus, ${plan.avertissements.length} avertissement(s), ${plan.messages.length} messages, ${plan.amities.length} amitiés, ${plan.evaluationsAssignees.length} évaluation assignée.`
		);
		const s = suivi.plan;
		console.log(
			`✅ Suivi : ${s.seances.length} copie(s) d’évaluation (${s.reponses.length} réponses), ${s.traces.length} traces d’entraînement → ${suivi.calcules.points} états de points du programme, ${s.competences.length} niveaux de compétence.`
		);
		console.log(
			`✅ Révisions : ${s.paquets.length} paquets, ${s.cartes.length} cartes, ${s.fiches.length} fiches de mémorisation, ${s.seancesRevision.length} séances.`
		);
		console.log(
			`✅ Python : ${s.pythonAssignes.length} exercice(s) assigné(s), ${s.pythonSoumissions.length} soumissions → ${suivi.calcules.python} maîtrises, ${s.pythonControles.length} points de contrôle de carnet. Devinettes : ${s.devinettesTentatives.length} tentative(s).`
		);
		console.log(
			`✅ Fiches et exercices : ${s.fichesEleves.length} élève(s) nommé(s), ${s.signalements.length} signalement(s), ${s.exercicesAssignes.length} exercice(s) assigné(s), ${s.exercicesVus.length} vu(s).`
		);
		const etat = await db.query(
			`select (select count(*)::int from supabase_migrations.schema_migrations) migrations,
			        (select count(*)::int from public.question_templates) modeles,
			        (select count(*)::int from auth.users) comptes`
		);
		const { migrations, modeles, comptes } = etat.rows[0];
		console.log(
			`✅ Base locale : ${migrations} migrations, ${modeles} modèles de questions, ${comptes} comptes.`
		);
	} catch (e) {
		await db.query('rollback').catch(() => {});
		throw e;
	} finally {
		await db.end();
	}
}

main().catch((e) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
