import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';

/**
 * SvelteKit 3 (#2825) — « un créneau enregistre et affiche son message »
 * =======================================================================
 *
 * La clause de `docs/wip/verifications-manuelles.md` disait « un formulaire (créneau du cahier de
 * texte) ». Le cahier de texte n'a pas de formulaire de créneau : c'est le créneau de l'EMPLOI DU
 * TEMPS d'une classe (page « Classes » du prof, `ClassScheduleGrid` + `ScheduleEntryModal`), envoyé
 * par `submitAction` (`src/lib/utils/form-action.ts`, l'utilitaire que le passage à SvelteKit 3 a
 * touché). Les créneaux alimentent ensuite le cahier de texte.
 *
 * ⚠️ JAMAIS JOUÉ jusqu'au bout (2026-11-24) : le prof de la base locale n'a pas d'école à emploi du
 * temps, le test se saute en le disant. La clause reste à David, en prod.
 *
 * Base LOCALE seulement. Le test ajoute UN créneau à une case vide puis le supprime ; ce qu'il a
 * ajouté est retiré même s'il échoue, et au passage suivant après un arrêt brutal (fichier de
 * reprise : les identifiants des créneaux d'avant).
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// Constantes

const LOCK = 'verifs9-creneau';
const RESUME_DIR = '.captures/verifs/reprise';
const RESUME_FILE = `${RESUME_DIR}/creneau-paquet9.json`;
const ADD_TITLE = 'Cliquez pour ajouter un créneau Maths';

// Functions

/** Tous les créneaux de la base locale (le prof local n'ajoute que dans ses classes) */
async function scheduleIds(): Promise<string[]> {
	const rows = await sql<{ id: string }>(`select id from class_schedules`);
	return rows.map((row) => row.id);
}

/** Retire les créneaux apparus depuis la photo (ceux du test), jamais ceux d'avant */
async function removeAdded(before: string[]): Promise<void> {
	const added = (await scheduleIds()).filter((id) => !before.includes(id));
	if (added.length > 0)
		await sql(`delete from class_schedules where id = any($1::uuid[])`, [added]);
}

// Tests

test.beforeAll(async () => {
	test.setTimeout(test.info().timeout + LOCK_WAIT_MAX_MS);
	assertLocalServerEnv();
	await acquireLock(LOCK);
	// Passage précédent interrompu : ses créneaux sont retirés
	if (existsSync(RESUME_FILE)) {
		await removeAdded(JSON.parse(readFileSync(RESUME_FILE, 'utf8')) as string[]);
		rmSync(RESUME_FILE);
	}
});

test.afterAll(() => {
	releaseLock(LOCK);
});

test('#2825 — emploi du temps d’une classe : ajouter un créneau l’enregistre et affiche « Créneau "Maths" ajouté » ; le supprimer affiche « Créneau supprimé avec succès »', async ({
	page
}) => {
	const before = await scheduleIds();
	mkdirSync(RESUME_DIR, { recursive: true });
	writeFileSync(RESUME_FILE, JSON.stringify(before));
	try {
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/dashboard/teacher/classes');
		await page.waitForLoadState('networkidle');

		// ⚠️ Le prof local n'a pas d'école à emploi du temps (2026-11-24) : la page le dit, et aucune
		// grille n'a de case. Le test est alors SAUTÉ en le disant (jamais vert sans avoir joué) : il
		// se jouera dès que la base locale donnera des périodes à l'école du prof
		// (`docs/wip/outils-manquants.md`).
		const noTimetable = page.getByText("Aucun emploi du temps n'est configuré pour votre école");
		test.skip(
			await noTimetable.isVisible(),
			'le prof local n’a pas d’emploi du temps : créneau non jouable en local, reste à David en prod'
		);

		// Une case vide de la première grille affichée
		const emptyCell = page.locator(`td[title="${ADD_TITLE}"]`).locator('visible=true').first();
		await emptyCell.scrollIntoViewIfNeeded();
		await emptyCell.click();
		await expect(page.getByText('Créneau "Maths" ajouté')).toBeVisible();

		// Enregistré pour de bon : une ligne de plus en base, une seule
		await expect.poll(async () => (await scheduleIds()).length).toBe(before.length + 1);
		const [addedId] = (await scheduleIds()).filter((id) => !before.includes(id));
		const [added] = await sql<{ subject: string | null; start: string; end: string }>(
			`select subject, to_char(start_time, 'HH24:MI') as start, to_char(end_time, 'HH24:MI') as end
			   from class_schedules where id = $1`,
			[addedId]
		);
		expect(added.subject).toBe('Maths');

		// Rechargée, la page montre le créneau (il vient de la base, plus de l'affichage optimiste)
		await page.reload();
		await page.waitForLoadState('networkidle');
		const entryCell = page
			.locator('td.cursor-pointer', { hasText: 'Maths' })
			.filter({ hasText: `${added.start.replace(':', 'h')}` })
			.or(page.locator('td.cursor-pointer', { hasText: added.start }))
			.locator('visible=true');
		await expect(entryCell.first()).toBeVisible();

		// Suppression par la fenêtre du créneau (la page demande confirmation au navigateur)
		const countBefore = await page.locator(`td[title="${ADD_TITLE}"]`).count();
		page.once('dialog', (dialog) => void dialog.accept());
		// Le créneau ajouté est celui qui libère une case : on ouvre chaque créneau jusqu'au bon
		const idsNow = await scheduleIds();
		expect(idsNow).toContain(addedId);
		await sql(`update class_schedules set notes = 'Verifs9 créneau' where id = $1`, [addedId]);
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page
			.locator('td', { hasText: 'Verifs9 créneau' })
			.locator('visible=true')
			.first()
			.click();
		await page.getByRole('button', { name: 'Supprimer' }).click();
		await expect(page.getByText('Créneau supprimé avec succès')).toBeVisible();
		await expect.poll(async () => (await scheduleIds()).includes(addedId)).toBe(false);
		await expect
			.poll(async () => page.locator(`td[title="${ADD_TITLE}"]`).count())
			.toBe(countBefore + 1);
	} finally {
		await removeAdded(before);
		rmSync(RESUME_FILE, { force: true });
	}
});
