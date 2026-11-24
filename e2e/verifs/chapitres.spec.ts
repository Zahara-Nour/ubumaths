import { expect, test, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql } from './helpers/carnet';

/**
 * Modèles de chapitre et chapitres liés — base LOCALE
 * ===================================================
 *
 * Reprend les lignes #1390/#1392 (plan du modèle, « Retirer du modèle », PDF ouverts
 * par un élève), #1394 (masquer un document ou une section, « Invisible des élèves »)
 * et #1387 (« Ajouter un objectif ») de `docs/wip/verifications-manuelles.md`.
 *
 * Les données de la prod (« Le modèle quadratique… », classes 1SPE) n'existent pas en
 * local : le décor est fait ICI, par l'interface (modèle « Verifs modèle 1390 »), dans
 * la classe locale « 1SPE 1 » dont `eleve01` est membre. Tout ce qui porte le préfixe
 * « Verifs » est retiré avant et après.
 *
 * Les tests se suivent (mode serial) : chacun reprend le décor du précédent.
 */

const TEACHER = { email: 'teacher@local.test', password: 'local-teacher' };
const STUDENT = { email: 'eleve01@local.test', password: 'local-eleve' };
const CLASS_NAME = '1SPE 1';
const CLASS_ID = 'c700e4dc-a61c-4904-848a-9c408ab324ad';
const TEMPLATE_TITLE = 'Verifs modèle 1390';
const TEMPLATE_RENAMED = 'Verifs modèle 1390 (renommé)';
const DOC_A = 'Verifs document A';
const DOC_B = 'Verifs document B';
const CHAPTER_TITLE = 'Verifs chapitre lié';
const OBJECTIVE_TEMPLATE = 'Verifs objectif du modèle';
const OBJECTIVE_CHAPTER = 'Verifs objectif du chapitre';
const SHOTS = '.captures/verifs/chapitres';

/** Un PDF d'une page, valide, pour le téléversement. */
const PDF = Buffer.from(
	'%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
		'3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
		'trailer<</Root 1 0 R/Size 4>>\n%%EOF\n'
);

let templateId = '';
let chapterId = '';

async function cleanup(): Promise<void> {
	await sql(`delete from class_chapters where title like 'Verifs%'`);
	await sql(`delete from chapter_templates where title like 'Verifs%'`);
}

/** Ouvre une page et la laisse s'hydrater (un clic juste après un `goto` serait perdu). */
async function open(page: Page, address: string): Promise<void> {
	await page.goto(address);
	await page.waitForLoadState('networkidle');
}

/** Une ligne du plan : l'élément porte son titre. */
function planRow(page: Page, label: string) {
	return page.locator('div.rounded-md.border', { hasText: label }).filter({
		has: page.locator('span', { hasText: label })
	});
}

/** Ajoute un document PDF à la première section du plan. */
async function addPdf(page: Page, title: string): Promise<void> {
	await page.getByRole('button', { name: 'Ajouter', exact: true }).first().click();
	await page.getByRole('menuitem', { name: 'Document' }).click();
	await page.locator('#file-input').setInputFiles({
		name: `${title}.pdf`,
		mimeType: 'application/pdf',
		buffer: PDF
	});
	await page.locator('#upload-title').fill(title);
	await page.getByRole('button', { name: 'Envoyer' }).click();
	await expect(planRow(page, title)).toBeVisible({ timeout: 15_000 });
}

test.describe.configure({ mode: 'serial' });

// Base locale seulement : contre la prod (`VERIFS_URL`), les comptes `local-*` n'existent pas
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

test.beforeAll(async () => {
	assertLocalServerEnv();
	await cleanup();
});

test.afterAll(async () => {
	await cleanup();
});

test('#1390 #1392 modèle : plan dans l’éditeur, Modifier le titre, Retirer du modèle', async ({
	page
}) => {
	await login(page, TEACHER.email, TEACHER.password);

	await open(page, '/dashboard/teacher/contenu/templates/new');
	await page.locator('#title').fill(TEMPLATE_TITLE);
	await page.getByRole('button', { name: /Créer/ }).click();
	await page.waitForURL(/\/contenu\/templates\/[0-9a-f-]{36}$/);
	templateId = /templates\/([0-9a-f-]{36})$/.exec(page.url())![1];
	await page.waitForLoadState('networkidle');

	// Le plan du modèle : l'éditeur du chapitre, avec ses sections
	await expect(page.getByRole('heading', { name: 'Plan du modèle' })).toBeVisible();
	const sections = await sql<{ n: string }>(
		`select count(*)::text as n from chapter_sections where template_id = $1`,
		[templateId]
	);
	expect(sections[0].n).toBe('6');

	await addPdf(page, DOC_A);
	await addPdf(page, DOC_B);

	// Un objectif, ajouté au modèle
	await page.getByRole('button', { name: 'Ajouter', exact: true }).first().click();
	await page.getByRole('menuitem', { name: 'Objectif' }).click();
	await page.locator('#checklist-content').fill(OBJECTIVE_TEMPLATE);
	await page.getByRole('button', { name: 'Ajouter', exact: true }).last().click();
	await expect(planRow(page, OBJECTIVE_TEMPLATE)).toBeVisible({ timeout: 15_000 });
	await page.screenshot({ path: `${SHOTS}/modele-plan.png`, fullPage: true });

	// « Modifier » le titre
	await page.getByRole('button', { name: 'Modifier', exact: true }).click();
	await page.locator('#template-edit-title').fill(TEMPLATE_RENAMED);
	await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByRole('heading', { name: TEMPLATE_RENAMED })).toBeVisible();

	// « Retirer du modèle » sur le document B
	await page.getByRole('button', { name: `Retirer ${DOC_B} du modèle` }).click();
	await expect(planRow(page, DOC_B)).toHaveCount(0, { timeout: 15_000 });
	await expect(planRow(page, DOC_A)).toBeVisible();

	// Le document B est remis pour la suite du décor (le test suivant en veut deux)
	await addPdf(page, DOC_B);

	// Ouvrir un PDF du modèle : le fichier est servi à son propriétaire
	const docs = await sql<{ id: string }>(
		`select id from chapter_documents where template_id = $1 and title = $2 and retired_at is null`,
		[templateId, DOC_A]
	);
	const response = await page.request.get(`/api/documents/${docs[0].id}`);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('application/pdf');
});

test('#1394 chapitre lié : Modèle, Masquer un document, Masquer une section, Invisible des élèves', async ({
	page
}) => {
	await login(page, TEACHER.email, TEACHER.password);

	// Publier le modèle, puis créer le chapitre (invisible des élèves)
	await open(page, `/dashboard/teacher/contenu/templates/${templateId}`);
	await page.getByRole('button', { name: 'Publier', exact: true }).click();
	await expect(page.getByText('Publié', { exact: true }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Créer un chapitre' }).first().click();
	await page.getByRole('combobox', { name: /^Bataillon/ }).click();
	await page.getByRole('option', { name: new RegExp(`^${CLASS_NAME} `) }).click();
	await page.locator('#instantiate-title').fill(CHAPTER_TITLE);
	await page.getByRole('button', { name: 'Créer le chapitre' }).click();
	await page.waitForURL(new RegExp(`/dashboard/teacher/cours/${CLASS_ID}/[0-9a-f-]{36}$`));
	chapterId = /cours\/[0-9a-f-]{36}\/([0-9a-f-]{36})$/.exec(page.url())![1];
	await page.waitForLoadState('networkidle');

	// Un chapitre neuf ne publie rien : aucun document n'est visible des élèves
	const livePublished = await sql<{ n: string }>(
		`select count(*)::text as n from chapter_documents where chapter_id = $1 and published_at is not null`,
		[chapterId]
	);
	expect(livePublished[0].n).toBe('0');

	// Les éléments du modèle portent la marque « Modèle »
	await expect(planRow(page, DOC_A).getByText('Modèle', { exact: true })).toBeVisible();
	await expect(planRow(page, DOC_B).getByText('Modèle', { exact: true })).toBeVisible();

	// « Invisible des élèves » : une seule fois sur la page du chapitre
	await expect(page.getByText('Invisible des élèves')).toHaveCount(1);

	// Masquer un document : il quitte le plan, l'interrupteur le fait revenir barré
	await page.getByRole('button', { name: `Masquer ${DOC_A}` }).click();
	await expect(planRow(page, DOC_A)).toHaveCount(0, { timeout: 15_000 });
	await expect(page.getByText('Afficher ce qui est masqué (1)')).toBeVisible();
	await page.getByRole('switch', { name: /Afficher ce qui est masqué/ }).click();
	const hiddenRow = planRow(page, DOC_A);
	await expect(hiddenRow).toBeVisible();
	await expect(hiddenRow.getByText('Masqué', { exact: true })).toBeVisible();
	await expect(hiddenRow.locator('span.line-through')).toBeVisible();
	await page.screenshot({ path: `${SHOTS}/chapitre-masque.png`, fullPage: true });

	// Réafficher le document
	await page.getByRole('button', { name: `Réafficher ${DOC_A}` }).click();
	await expect(page.getByText(/Afficher ce qui est masqué/)).toHaveCount(0, { timeout: 15_000 });
	await expect(planRow(page, DOC_A)).toBeVisible();

	// Masquer une section (confirmation) : elle et son contenu disparaissent, rien n'est publié
	const sectionRows = await sql<{ id: string; title: string }>(
		`select s.id, s.title from chapter_sections s
		 where s.chapter_id = $1 and exists (select 1 from chapter_documents d where d.section_id = s.id)
		 limit 1`,
		[chapterId]
	);
	const sectionTitle = sectionRows[0].title;
	await page.getByRole('button', { name: `Masquer la section ${sectionTitle}` }).click();
	await expect(page.getByText(`Masquer la section « ${sectionTitle} » ?`)).toBeVisible();
	await page.getByRole('button', { name: 'Masquer la section', exact: true }).click();
	await expect(planRow(page, DOC_A)).toHaveCount(0, { timeout: 15_000 });
	await expect(planRow(page, DOC_B)).toHaveCount(0);
	const published = await sql<{ n: string }>(
		`select count(*)::text as n from chapter_documents where chapter_id = $1 and published_at is not null`,
		[chapterId]
	);
	expect(published[0].n).toBe('0');

	// La réafficher : son contenu revient, non publié
	await page.getByRole('switch', { name: /Afficher ce qui est masqué/ }).click();
	await page.getByRole('button', { name: `Réafficher la section ${sectionTitle}` }).click();
	await expect(planRow(page, DOC_A)).toBeVisible({ timeout: 15_000 });

	// « Invisible des élèves » une seule fois, sur la carte du chapitre : page de la classe,
	// puis liste des cours
	await open(page, `/dashboard/teacher/cours/${CLASS_ID}`);
	const classCard = page.locator('[data-slot="card"]', { hasText: CHAPTER_TITLE });
	await expect(classCard).toHaveCount(1);
	await expect(classCard.getByText('Invisible des élèves')).toHaveCount(1);
	await open(page, '/dashboard/teacher/cours');
	const listCard = page.locator('[data-slot="card"]', { hasText: CHAPTER_TITLE });
	await expect(listCard).toHaveCount(1);
	await expect(listCard.getByText('Invisible des élèves')).toHaveCount(1);
	await page.screenshot({ path: `${SHOTS}/liste-cours-invisible.png`, fullPage: true });
});

test('#1387 chapitre : Ajouter un objectif fait apparaître l’objectif', async ({ page }) => {
	await login(page, TEACHER.email, TEACHER.password);
	await open(page, `/dashboard/teacher/cours/${CLASS_ID}/${chapterId}`);

	await page.getByRole('button', { name: 'Ajouter', exact: true }).first().click();
	await page.getByRole('menuitem', { name: 'Objectif' }).click();
	await page.locator('#checklist-content').fill(OBJECTIVE_CHAPTER);
	await page.getByRole('button', { name: 'Ajouter', exact: true }).last().click();
	await expect(planRow(page, OBJECTIVE_CHAPTER)).toBeVisible({ timeout: 15_000 });
	const rows = await sql(
		`select 1 from chapter_checklist_items where chapter_id = $1 and content = $2`,
		[chapterId, OBJECTIVE_CHAPTER]
	);
	expect(rows).toHaveLength(1);
});

test('#1390 #1392 élève : ouvre le PDF d’un document publié du chapitre', async ({
	page,
	browser
}) => {
	// Le prof publie le document A et rend le chapitre visible
	await login(page, TEACHER.email, TEACHER.password);
	await open(page, `/dashboard/teacher/cours/${CLASS_ID}/${chapterId}`);
	await planRow(page, DOC_A).getByRole('button', { name: 'Publier', exact: true }).click();
	await expect(planRow(page, DOC_A).getByText('Visible par les élèves')).toBeVisible({
		timeout: 15_000
	});
	await sql(`update class_chapters set is_visible = true where id = $1`, [chapterId]);

	const docs = await sql<{ id: string; title: string; published_at: string | null }>(
		`select id, title, published_at from chapter_documents where chapter_id = $1 and retired_at is null`,
		[chapterId]
	);
	const docA = docs.find((d) => d.title === DOC_A)!;
	const docB = docs.find((d) => d.title === DOC_B)!;
	expect(docA.published_at).not.toBeNull();
	expect(docB.published_at).toBeNull();

	const baseURL = new URL(page.url()).origin;
	const context = await browser.newContext({ baseURL });
	const student = await context.newPage();
	await login(student, STUDENT.email, STUDENT.password);
	await open(student, `/dashboard/student/cours/${chapterId}`);
	await expect(student.getByText(DOC_A)).toBeVisible();
	await expect(student.getByText(DOC_B)).toHaveCount(0);
	await student.screenshot({ path: `${SHOTS}/eleve-chapitre.png`, fullPage: true });

	const ok = await student.request.get(`/api/documents/${docA.id}`);
	expect(ok.status()).toBe(200);
	expect(ok.headers()['content-type']).toContain('application/pdf');
	// Le document non publié reste fermé à l'élève
	const closed = await student.request.get(`/api/documents/${docB.id}`);
	expect([403, 404]).toContain(closed.status());
	await context.close();
});
