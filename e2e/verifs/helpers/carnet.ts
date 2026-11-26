import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import pg from 'pg';
import { readCaptureIndex, type CapturedEmail } from '../../../src/lib/server/email/capture-index';

/**
 * Le décor du carnet de liaison, sur la base LOCALE seulement
 * ===========================================================
 *
 * Les vérifications du carnet (`carnet.spec.ts`) écrivent dans la base : une
 * classe du prof local remise à zéro (carnet désactivé, aucune adresse de
 * parent), trois élèves fictifs renommés, un consentement accordé, une année
 * scolaire en cours. Rien ne part chez Brevo : le serveur de dev capture les
 * courriels dans `.captures/courriels/` (`src/lib/server/email/capture.ts`),
 * que les tests relisent ici.
 *
 * Garde : jamais contre la prod (`VERIFS_URL`), et la base visée est le
 * Postgres local (127.0.0.1:54322), rien d'autre.
 */

// Types

export interface CarnetStudent {
	id: string;
	email: string;
	firstname: string;
	lastname: string;
}

export interface CarnetDecor {
	classId: string;
	/** A : consentement accordé, puis inactif depuis 30 jours (courriel d'exception) */
	a: CarnetStudent;
	/** B : adresse ajoutée par le prof */
	b: CarnetStudent;
	/** C : adresse ajoutée par l'élève */
	c: CarnetStudent;
	/** Adresses de parents fictives, propres à ce passage */
	parents: { a: string; b: string; c: string };
}

// Constantes

const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
/** Les courriels capturés par le serveur de dev du worktree (cwd de Playwright). */
const CAPTURE_DIR = resolve(process.env.EMAIL_CAPTURE_DIR || '.captures/courriels');
const STUDENT_PASSWORD = 'local-eleve';
export const TEACHER = { email: 'teacher@local.test', password: 'local-teacher' };
export const ADMIN = { email: 'admin@local.test', password: 'local-admin' };
/** Prénoms et noms inventés : le nom ne doit jamais paraître dans un courriel. */
const NAMES = [
	{ firstname: 'Anouk', lastname: 'Fictivea' },
	{ firstname: 'Basile', lastname: 'Fictiveb' },
	{ firstname: 'Capucine', lastname: 'Fictivec' }
];
/** Largeur d'un téléphone pour les captures d'écran. */
export const PHONE = { width: 390, height: 844 };
export const SHOTS_DIR = resolve('.captures/verifs/carnet');

// Functions

/** Les vérifications du carnet n'ont de sens que sur la base locale. */
export function carnetSkipReason(): string | null {
	if (process.env.VERIFS_URL) return 'carnet : base locale seulement (VERIFS_URL posé)';
	return null;
}

/**
 * Le serveur de dev de ce dossier vise-t-il la base locale ? Sans `.env.local`,
 * il viserait la prod (`.env`) : on refuse avant d'écrire quoi que ce soit.
 */
export function assertLocalServerEnv(): void {
	let raw = '';
	try {
		raw = readFileSync(resolve('.env.local'), 'utf8');
	} catch {
		throw new Error(
			'.env.local absent : le serveur de dev viserait la base de prod. Rien n’est écrit.'
		);
	}
	const url = /^PUBLIC_SUPABASE_URL=(.*)$/m
		.exec(raw)?.[1]
		?.trim()
		.replace(/^["']|["']$/g, '');
	const host = url ? new URL(url).hostname : '';
	if (host !== '127.0.0.1' && host !== 'localhost') {
		throw new Error(
			'PUBLIC_SUPABASE_URL de .env.local n’est pas la base locale. Rien n’est écrit.'
		);
	}
}

async function withDb<T>(task: (db: pg.Client) => Promise<T>): Promise<T> {
	const db = new pg.Client({ connectionString: LOCAL_DB });
	await db.connect();
	try {
		return await task(db);
	} finally {
		await db.end();
	}
}

/** Une requête SQL sur la base locale. */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	values: unknown[] = []
): Promise<T[]> {
	return withDb(async (db) => (await db.query<T>(text, values)).rows);
}

/** La version que porte une ligne de fiche créée par le décor : la dernière de l'exercice. */
export const LATEST_VERSION_OF = (exerciseParam: string): string =>
	`(select id from exercise_versions where exercise_id = ${exerciseParam} order by number desc limit 1)`;

/**
 * Un exercice créé par le décor reçoit sa version 1 dans la même requête : depuis les versions
 * d'exercices (ADR 0044), le contenu se lit dans `exercise_versions` et une ligne de fiche exige
 * une version. `insert` est un `insert into exercises … returning id` ; la requête rend toujours `id`.
 */
export function withFirstVersion(insert: string): string {
	return `with e as (${insert}, variations, shared, generic_functions, created_by),
	 v as (insert into exercise_versions (exercise_id, number, variations, shared, generic_functions, created_by)
	       select id, 1, variations, shared, generic_functions, created_by from e)
	 select id from e`;
}

/**
 * Remet une classe du prof local à zéro et pose le décor. Le carnet de la classe
 * est DÉSACTIVÉ en sortie : le test du professeur l'active.
 */
export async function prepareCarnetDecor(): Promise<CarnetDecor> {
	const run = Date.now().toString(36);
	return withDb(async (db) => {
		// La première classe active, avec une école (année scolaire, vacances) et
		// trois élèves fictifs : toujours la même d'un passage à l'autre.
		const anchor = await db.query<{ class_id: string; school_id: string | null }>(
			`select c.id as class_id, c.school_id
			 from classes c
			 join class_members cm on cm.class_id = c.id and cm.status = 'active'
			 join profiles p on p.id = cm.student_id and p.email like 'eleve%@local.test'
			 where c.is_active and c.school_id is not null
			 group by c.id
			 having count(*) >= 3
			 order by c.id
			 limit 1`
		);
		if (anchor.rows.length === 0) {
			throw new Error('Aucune classe active à trois élèves fictifs : lancer pnpm db:seed-riche');
		}
		const { class_id: classId, school_id: schoolId } = anchor.rows[0] as {
			class_id: string;
			school_id: string;
		};

		const members = await db.query<{ id: string; email: string }>(
			`select p.id, p.email
			 from class_members cm join profiles p on p.id = cm.student_id
			 where cm.class_id = $1 and cm.status = 'active' and p.email like 'eleve%@local.test'
			 order by p.email
			 limit 3`,
			[classId]
		);
		if (members.rows.length < 3) throw new Error('Il faut trois élèves dans la classe');
		const ids = members.rows.map((m) => m.id);

		await db.query('begin');
		try {
			// Remise à zéro : le carnet de la classe et tout ce qui touche ses élèves.
			await db.query('delete from parent_notifications where student_id = any($1)', [ids]);
			await db.query('delete from parent_exception_episodes where student_id = any($1)', [ids]);
			await db.query(
				'delete from parent_carnet_links where contact_id in (select id from parent_contacts where student_id = any($1))',
				[ids]
			);
			await db.query('delete from parent_contacts where student_id = any($1)', [ids]);
			await db.query('delete from student_carnet_opt_outs where student_id = any($1)', [ids]);
			await db.query('delete from parental_consents where student_id = any($1)', [ids]);
			await db.query('delete from class_carnet_settings where class_id = $1', [classId]);
			// Limites de débit des passages précédents (ajout d'adresse, lien perdu, tâche).
			await db.query(
				`delete from rate_limits where key like 'carnet%' or key = 'cron_trigger:/api/cron/carnet-de-liaison'`
			);

			// Prénoms et noms inventés (le seed n'en donne pas).
			for (const [i, id] of ids.entries()) {
				await db.query('update profiles set firstname = $2, lastname = $3 where id = $1', [
					id,
					NAMES[i].firstname,
					NAMES[i].lastname
				]);
			}

			// Le prof local n'a qu'un `full_name` ; la page du prof signe les courriels
			// avec prénom + nom, comme le compte de la prod.
			await db.query(
				`update profiles set firstname = 'Prof', lastname = 'Local'
				 where email = $1 and coalesce(trim(firstname), '') = '' and coalesce(trim(lastname), '') = ''`,
				[TEACHER.email]
			);

			// A : consentement accordé (« Activer enverra 1 courriel »), arrivé il y a
			// 30 jours, sans travail depuis (alerte d'inactivité).
			const parents = {
				a: `parent-a-${run}@local.test`,
				b: `parent-b-${run}@local.test`,
				c: `parent-c-${run}@local.test`
			};
			await db.query(
				`insert into parental_consents (student_id, parent_email, status, consent_given_at)
				 values ($1, $2, 'granted', now())`,
				[ids[0], parents.a]
			);
			await db.query(
				`update class_members set joined_at = now() - interval '30 days'
				 where class_id = $1 and student_id = $2`,
				[classId, ids[0]]
			);
			await db.query(
				`delete from skill_attempts where student_id = $1 and created_at > now() - interval '40 days'`,
				[ids[0]]
			);

			// Une année scolaire active qui couvre aujourd'hui, sans vacances posées.
			const current = await db.query(
				`select 1 from school_years
				 where school_id = $1 and is_active and start_date <= current_date and end_date >= current_date`,
				[schoolId]
			);
			if (current.rows.length === 0) {
				await db.query('update school_years set is_active = false where school_id = $1', [
					schoolId
				]);
				await db.query(
					`insert into school_years (school_id, name, start_date, end_date, is_active)
					 values ($1, 'Année en cours (verifs)',
					   make_date(extract(year from current_date - interval '8 months')::int, 9, 1),
					   make_date(extract(year from current_date - interval '8 months')::int + 1, 6, 30),
					   true)
					 on conflict (school_id, name) do update set is_active = true`,
					[schoolId]
				);
			}
			await db.query('commit');

			const student = (i: number): CarnetStudent => ({
				id: ids[i],
				email: members.rows[i].email,
				...NAMES[i]
			});
			return { classId, a: student(0), b: student(1), c: student(2), parents };
		} catch (e) {
			await db.query('rollback');
			throw e;
		}
	});
}

/** Connexion par la page de connexion. */
export async function login(page: Page, email: string, password: string): Promise<void> {
	await page.goto('/auth/login');
	// Saisie avant l'hydratation = champs vidés ensuite : attendre la page prête.
	await page.waitForLoadState('networkidle');
	const emailField = page.locator('input[name="email"]');
	const passwordField = page.locator('input[type="password"]');
	await emailField.fill(email);
	await passwordField.fill(password);
	await expect(emailField).toHaveValue(email);
	await expect(passwordField).toHaveValue(password);
	await page.locator('button[type="submit"]').click();
	await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'));
}

export async function loginStudent(page: Page, student: CarnetStudent): Promise<void> {
	await login(page, student.email, STUDENT_PASSWORD);
}

/** Les courriels capturés vers `to`, dans l'ordre d'envoi. */
export async function emailsTo(to: string): Promise<CapturedEmail[]> {
	return (await readCaptureIndex(CAPTURE_DIR)).filter((e) => e.to === to);
}

/** Attend le `count`-ième courriel vers `to` (1 = le premier) et le rend. */
export async function waitForEmail(to: string, count = 1): Promise<CapturedEmail> {
	await expect
		.poll(async () => (await emailsTo(to)).length, {
			timeout: 20_000,
			message: `courriel n° ${count} vers ${to} absent de ${CAPTURE_DIR} : serveur lancé depuis un autre dossier, ou envoi réel (EMAIL_ENVOI_REEL) ?`
		})
		.toBeGreaterThanOrEqual(count);
	return (await emailsTo(to))[count - 1];
}

export async function emailHtml(email: CapturedEmail): Promise<string> {
	return readFile(join(CAPTURE_DIR, email.file), 'utf8');
}

export async function emailText(email: CapturedEmail): Promise<string> {
	return readFile(join(CAPTURE_DIR, email.file.replace(/\.html$/, '.txt')), 'utf8');
}

/**
 * Le lien d'un bouton du courriel, ramené au serveur local : les gabarits
 * écrivent l'adresse de la prod (`getSiteUrl`), on n'en garde que le chemin.
 */
export async function emailLink(email: CapturedEmail, label: string): Promise<string> {
	const html = await emailHtml(email);
	for (const match of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
		if (match[2].replace(/<[^>]+>/g, '').trim() === label) {
			const url = new URL(match[1].replace(/&amp;/g, '&'));
			return url.pathname + url.search + url.hash;
		}
	}
	throw new Error(`Lien « ${label} » absent du courriel « ${email.subject} »`);
}

/** Affiche le courriel tel qu'un téléphone le montre et le photographie. */
export async function shootEmail(page: Page, email: CapturedEmail, name: string): Promise<void> {
	await page.setViewportSize(PHONE);
	await page.setContent(await emailHtml(email));
	await page.screenshot({ path: join(SHOTS_DIR, `${name}.png`), fullPage: true });
}

/** Photographie la page courante à largeur téléphone, en clair puis en sombre. */
export async function shootPage(page: Page, name: string): Promise<void> {
	// La page défile dans un conteneur, pas le document : `fullPage` s'arrête à
	// l'écran. Une fenêtre à la hauteur du contenu montre tout.
	await page.setViewportSize(PHONE);
	const height = await page.evaluate(() =>
		Math.max(...[...document.querySelectorAll('*')].map((el) => el.scrollHeight))
	);
	await page.setViewportSize({
		width: PHONE.width,
		height: Math.min(Math.max(height + 200, PHONE.height), 4000)
	});
	for (const scheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: scheme });
		await page.screenshot({ path: join(SHOTS_DIR, `${name}-${scheme}.png`), fullPage: true });
	}
	await page.emulateMedia({ colorScheme: 'light' });
}
