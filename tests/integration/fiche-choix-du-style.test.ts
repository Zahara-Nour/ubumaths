/**
 * Le style d'une fiche : choix, enregistrement, gabarits du prof (lot 3b)
 * ======================================================================
 *
 * ADR 0028, décisions de David (docs/wip/generateur-pdf-fiches-progress.md) :
 *   - D9 : la fiche désigne un style ; le prof lit les styles de Chiphre et
 *     les siens, jamais ceux d'un autre ;
 *   - D10 : choisir un style écrit `style_id` (et `template_id` pour un style
 *     de Chiphre, qui porte le même identifiant) ; dupliquer recopie le style ;
 *     un gabarit créé sur la page « Gabarits » crée son style (même
 *     identifiant, même nom), le renommer le renomme, le supprimer le supprime.
 *
 * Les routes sont appelées avec le client du prof CONNECTÉ : la RLS et les
 * triggers de 3a s'appliquent comme en production. La RLS échoue en silence :
 * chaque écriture est relue en superutilisateur (`pg`).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { BUILT_IN_STYLES, DEFAULT_STYLE_ID } from '../../src/lib/typst/templates/styles';
import { DEFAULT_TEMPLATE_IDS } from '../../src/lib/typst/templates/default-templates';
import {
	listWorksheetStyles,
	loadStyleTemplate
} from '../../src/lib/server/worksheets/worksheet-styles';

import { POST as createWorksheet } from '../../src/routes/api/worksheets/+server';
import {
	GET as getWorksheet,
	PUT as updateWorksheet
} from '../../src/routes/api/worksheets/[id]/+server';
import { POST as duplicateWorksheet } from '../../src/routes/api/worksheets/[id]/duplicate/+server';
import { POST as createTemplate } from '../../src/routes/api/worksheets/templates/+server';
import {
	PUT as updateTemplate,
	DELETE as deleteTemplate
} from '../../src/routes/api/worksheets/templates/[id]/+server';
import { actions as listActions } from '../../src/routes/(protected)/dashboard/teacher/contenu/worksheets/templates/+page.server';
import { actions as editActions } from '../../src/routes/(protected)/dashboard/teacher/contenu/worksheets/templates/[id]/+page.server';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

/** Préfixe unique à ce run : fiches, gabarits et styles créés le portent. */
const RUN = `itest-choix-style-${Date.now().toString(36)}`;
const TYPST = '#set page(paper: "a4")\n{{exercises}}';
const STANDARD = DEFAULT_TEMPLATE_IDS.standard;

// ============================================================================
// VARIABLES
// ============================================================================

let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let teacherId: string;
let adminId: string;
let adminStyleId: string;
let locals: App.Locals;

// ============================================================================
// FONCTIONS
// ============================================================================

async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

function buildLocals(client: SupabaseClient, userId: string): App.Locals {
	const user = { id: userId } as User;
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function jsonRequest(body: unknown): Request {
	return new Request('http://localhost/api', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** Le statut d'une route, qu'elle réponde ou qu'elle lève `error()`. */
async function statusOf(call: () => unknown): Promise<number> {
	try {
		return ((await call()) as Response).status;
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return status;
		throw e;
	}
}

/** Insère un style en superutilisateur (hors RLS) et rend son identifiant. */
async function seedStyle(ownerId: string, suffix: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheet_styles (owner_id, name) values ($1, $2) returning id`,
		[ownerId, `${RUN} ${suffix}`]
	);
	return rows[0].id;
}

/** Insère la fiche d'un style, en superutilisateur. */
async function seedStyleTemplate(styleId: string, ownerId: string, content: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`insert into public.worksheet_templates (name, template_content, created_by, style_id, form)
		 values ($1, $2, $3, $4, 'worksheet')`,
		[`${RUN} gabarit`, content, ownerId, styleId]
	);
}

/** Une fiche brouillon du prof, en superutilisateur. */
async function seedWorksheet(suffix: string, styleId: string | null = null): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheets (title, type, status, created_by, style_id)
		 values ($1, 'worksheet', 'draft', $2, $3) returning id`,
		[`${RUN} ${suffix}`, teacherId, styleId]
	);
	return rows[0].id;
}

async function worksheetInDb(
	id: string
): Promise<{ style_id: string | null; template_id: string | null }> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select style_id, template_id from public.worksheets where id = $1',
		[id]
	);
	return rows[0];
}

async function styleInDb(
	id: string
): Promise<{ name: string; description: string | null; owner_id: string | null } | undefined> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select name, description, owner_id from public.worksheet_styles where id = $1',
		[id]
	);
	return rows[0];
}

async function templateInDb(
	id: string
): Promise<{ style_id: string | null; form: string } | undefined> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select style_id, form from public.worksheet_templates where id = $1',
		[id]
	);
	return rows[0];
}

async function put(id: string, body: unknown): Promise<Response> {
	return await updateWorksheet({ locals, params: { id }, request: jsonRequest(body) } as never);
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	const admin = await TestData.profile().withRole('admin').create();
	teacherId = teacher.id;
	adminId = admin.id;
	teacherClient = await signedIn(teacher.email);
	adminClient = await signedIn(admin.email);
	locals = buildLocals(teacherClient, teacherId);
	adminStyleId = await seedStyle(adminId, 'de l’admin');
});

afterAll(async () => {
	const pg = await getPostgresClient();
	await pg
		.query('delete from public.worksheets where title like $1', [`${RUN}%`])
		.catch(() => undefined);
	await pg
		.query('delete from public.worksheet_templates where name like $1', [`${RUN}%`])
		.catch(() => undefined);
	await pg
		.query('delete from public.worksheet_styles where name like $1', [`${RUN}%`])
		.catch(() => undefined);
	await cleanupAllTestData();
});

describe('les styles proposés au prof', () => {
	it('les 12 styles de Chiphre, dans l’ordre du code, puis les siens ; pas ceux de l’admin', async () => {
		const ownId = await seedStyle(teacherId, 'du prof');
		const styles = await listWorksheetStyles(teacherClient as never, teacherId);
		const ids = styles.map((s) => s.id);

		expect(ids.slice(0, BUILT_IN_STYLES.length)).toEqual(BUILT_IN_STYLES.map((s) => s.id));
		expect(ids).toContain(ownId);
		expect(ids).not.toContain(adminStyleId);
	});

	it('un style ne dit plus rien des points : le type de la fiche décide (ADR 0030)', async () => {
		const ownId = await seedStyle(teacherId, 'à points');
		const styles = await listWorksheetStyles(teacherClient as never, teacherId);
		const own = styles.find((s) => s.id === ownId);

		expect(own).toBeDefined();
		expect(own).not.toHaveProperty('showsPoints');
		expect(styles.find((s) => s.id === DEFAULT_STYLE_ID)).not.toHaveProperty('showsPoints');
	});
});

describe('l’admin sur la fiche du prof', () => {
	it('le menu propose les styles de l’auteur de la fiche, celui qu’elle porte compris', async () => {
		const ownId = await seedStyle(teacherId, 'vu par l’admin');
		const styles = await listWorksheetStyles(adminClient as never, teacherId);
		expect(styles.map((s) => s.id)).toContain(ownId);
		expect(styles.map((s) => s.id)).not.toContain(adminStyleId);
	});

	it('dupliquer la fiche du prof garde son style', async () => {
		const ownId = await seedStyle(teacherId, 'dupliqué par l’admin');
		const id = await seedWorksheet('dupliquée par l’admin', ownId);
		const response = await duplicateWorksheet({
			locals: buildLocals(adminClient, adminId),
			params: { id }
		} as never);
		const { worksheet } = await response.json();
		expect((await worksheetInDb(worksheet.id)).style_id).toBe(ownId);
	});
});

describe('enregistrer le style d’une fiche', () => {
	it('un style de Chiphre écrit `style_id` et `template_id` (même identifiant)', async () => {
		const id = await seedWorksheet('Chiphre');
		const response = await put(id, { style_id: STANDARD });

		expect(response.status).toBe(200);
		expect((await response.json()).worksheet.style_id).toBe(STANDARD);
		expect(await worksheetInDb(id)).toEqual({ style_id: STANDARD, template_id: STANDARD });
	});

	it('un style du prof écrit `style_id` et ne touche pas `template_id`', async () => {
		const ownId = await seedStyle(teacherId, 'choisi');
		const id = await seedWorksheet('style du prof');
		await put(id, { style_id: STANDARD });

		const response = await put(id, { style_id: ownId });
		expect(response.status).toBe(200);
		expect(await worksheetInDb(id)).toEqual({ style_id: ownId, template_id: STANDARD });
	});

	it('un identifiant mal formé est refusé (400)', async () => {
		const id = await seedWorksheet('mal formé');
		expect(await statusOf(() => put(id, { style_id: 'pas-un-uuid' }))).toBe(400);
		expect(await worksheetInDb(id)).toEqual({ style_id: null, template_id: null });
	});

	it('le style de l’admin est refusé (403), la fiche ne change pas', async () => {
		const id = await seedWorksheet('style interdit');
		expect(await statusOf(() => put(id, { style_id: adminStyleId }))).toBe(403);
		expect(await worksheetInDb(id)).toEqual({ style_id: null, template_id: null });
	});

	it('la lecture de la fiche rend son style', async () => {
		const id = await seedWorksheet('relue', STANDARD);
		const response = await getWorksheet({ locals, params: { id } } as never);
		expect((await response.json()).worksheet.style_id).toBe(STANDARD);
	});

	it('créer une fiche avec un style l’enregistre', async () => {
		const response = await createWorksheet({
			locals,
			request: jsonRequest({ title: `${RUN} créée`, style_id: STANDARD })
		} as never);
		expect(response.status).toBe(201);
		const { worksheet } = await response.json();

		expect(worksheet.style_id).toBe(STANDARD);
		expect(await worksheetInDb(worksheet.id)).toEqual({
			style_id: STANDARD,
			template_id: STANDARD
		});
	});

	it('dupliquer une fiche recopie son style', async () => {
		const ownId = await seedStyle(teacherId, 'à dupliquer');
		const id = await seedWorksheet('à dupliquer', ownId);
		const response = await duplicateWorksheet({ locals, params: { id } } as never);
		const { worksheet } = await response.json();

		// Titre « … (copie) » : il garde le préfixe du run, le nettoyage le trouve
		expect((await worksheetInDb(worksheet.id)).style_id).toBe(ownId);
	});
});

describe('le gabarit du style d’une fiche', () => {
	it('style du prof : sa fiche, lue avec le client du prof', async () => {
		const ownId = await seedStyle(teacherId, 'à gabarit');
		await seedStyleTemplate(ownId, teacherId, `${TYPST}\n// MARQUE-DU-PROF`);

		const template = await loadStyleTemplate(teacherClient as never, { style_id: ownId });
		expect(template?.template_content).toContain('MARQUE-DU-PROF');
	});

	it('style de Chiphre : rien à lire, le Typst vient du code', async () => {
		expect(await loadStyleTemplate(teacherClient as never, { style_id: STANDARD })).toBeNull();
		expect(await loadStyleTemplate(teacherClient as never, { template_id: STANDARD })).toBeNull();
	});

	it('style d’un autre (illisible) : rien, la fiche retombe sur le style par défaut', async () => {
		await seedStyleTemplate(adminStyleId, adminId, `${TYPST}\n// MARQUE-ADMIN`);
		expect(await loadStyleTemplate(teacherClient as never, { style_id: adminStyleId })).toBeNull();
	});

	it('fiche sans style : rien', async () => {
		expect(await loadStyleTemplate(teacherClient as never, {})).toBeNull();
	});
});

describe('l’API des gabarits : un gabarit et son style vont ensemble (D10)', () => {
	async function createdTemplate(name: string): Promise<string> {
		const response = await createTemplate({
			locals,
			request: jsonRequest({ name: `${RUN} ${name}`, template_content: TYPST })
		} as never);
		expect(response.status).toBe(201);
		return (await response.json()).template.id;
	}

	it('créer un gabarit crée son style : même identifiant, même nom, au prof', async () => {
		const id = await createdTemplate('neuf');

		expect(await styleInDb(id)).toEqual({
			name: `${RUN} neuf`,
			description: null,
			owner_id: teacherId
		});
		expect(await templateInDb(id)).toEqual({ style_id: id, form: 'worksheet' });
		const styles = await listWorksheetStyles(teacherClient as never, teacherId);
		expect(styles.map((s) => s.id)).toContain(id);
	});

	it('renommer le gabarit renomme son style', async () => {
		const id = await createdTemplate('à renommer');
		const response = await updateTemplate({
			locals,
			params: { id },
			request: jsonRequest({ name: `${RUN} renommé`, description: 'Pour les contrôles' })
		} as never);

		expect(response.status).toBe(200);
		expect(await styleInDb(id)).toMatchObject({
			name: `${RUN} renommé`,
			description: 'Pour les contrôles'
		});
	});

	it('supprimer le gabarit supprime son style', async () => {
		const id = await createdTemplate('à supprimer');
		// Le style existe : sinon la suite passerait à vide
		expect(await styleInDb(id)).toBeDefined();
		const response = await deleteTemplate({ locals, params: { id } } as never);

		expect(response.status).toBe(200);
		expect(await templateInDb(id)).toBeUndefined();
		expect(await styleInDb(id)).toBeUndefined();
	});

	it('un gabarit dont le style sert à une fiche ne se supprime pas (400)', async () => {
		const id = await createdTemplate('en usage');
		const worksheetId = await seedWorksheet('qui l’utilise', id);

		expect(await statusOf(() => deleteTemplate({ locals, params: { id } } as never))).toBe(400);
		expect(await styleInDb(id)).toBeDefined();
		expect((await worksheetInDb(worksheetId)).style_id).toBe(id);
	});
});

describe('la page « Gabarits » (ses actions) : un gabarit et son style vont ensemble (D10)', () => {
	function formRequest(fields: Record<string, string>): Request {
		const body = new FormData();
		for (const [k, v] of Object.entries(fields)) body.set(k, v);
		return new Request('http://localhost/', { method: 'POST', body });
	}

	/** L'identifiant du gabarit vers lequel l'action redirige. */
	async function redirectedId(call: () => unknown): Promise<string> {
		try {
			await call();
		} catch (e) {
			const location = (e as { location?: string }).location;
			if (location) return location.split('/').pop() as string;
			throw e;
		}
		throw new Error('aucune redirection');
	}

	async function createdFromForm(name: string): Promise<string> {
		return redirectedId(() =>
			editActions.create({
				locals,
				params: { id: 'new' },
				request: formRequest({ name: `${RUN} ${name}`, description: '', template_content: TYPST })
			} as never)
		);
	}

	it('« Nouveau gabarit » crée son style', async () => {
		const id = await createdFromForm('formulaire');
		expect(await styleInDb(id)).toMatchObject({ name: `${RUN} formulaire`, owner_id: teacherId });
		expect(await templateInDb(id)).toEqual({ style_id: id, form: 'worksheet' });
	});

	it('« Partir d’un gabarit de Chiphre » crée son style', async () => {
		const id = await redirectedId(() =>
			listActions.createFromDefault({
				locals,
				request: formRequest({ template_id: STANDARD })
			} as never)
		);
		expect(await styleInDb(id)).toMatchObject({ name: 'Standard (copie)', owner_id: teacherId });
		expect(await templateInDb(id)).toEqual({ style_id: id, form: 'worksheet' });
		// Nom sans le préfixe du run : nettoyage à la main
		const pg = await getPostgresClient();
		await pg.query('delete from public.worksheet_styles where id = $1', [id]);
	});

	it('dupliquer un gabarit crée le style de la copie', async () => {
		const id = await createdFromForm('à copier');
		const result = (await listActions.duplicate({
			locals,
			request: formRequest({ template_id: id })
		} as never)) as { templateId: string };

		expect(result.templateId).not.toBe(id);
		expect(await styleInDb(result.templateId)).toMatchObject({ name: `${RUN} à copier (copie)` });
		expect(await templateInDb(result.templateId)).toEqual({
			style_id: result.templateId,
			form: 'worksheet'
		});
	});

	it('modifier le gabarit renomme son style', async () => {
		const id = await createdFromForm('avant');
		await editActions.update({
			locals,
			params: { id },
			request: formRequest({
				name: `${RUN} après`,
				description: 'Évaluations',
				template_content: TYPST
			})
		} as never);
		expect(await styleInDb(id)).toMatchObject({ name: `${RUN} après`, description: 'Évaluations' });
	});

	it('supprimer le gabarit supprime son style', async () => {
		const id = await createdFromForm('à jeter');
		expect(await styleInDb(id)).toBeDefined();
		await listActions.delete({ locals, request: formRequest({ template_id: id }) } as never);
		expect(await templateInDb(id)).toBeUndefined();
		expect(await styleInDb(id)).toBeUndefined();
	});

	it('un gabarit dont le style sert à une fiche reste', async () => {
		const id = await createdFromForm('gardé');
		await seedWorksheet('qui le garde', id);
		const result = (await listActions.delete({
			locals,
			request: formRequest({ template_id: id })
		} as never)) as { status?: number };
		expect(result.status).toBe(400);
		expect(await styleInDb(id)).toBeDefined();
	});
});
