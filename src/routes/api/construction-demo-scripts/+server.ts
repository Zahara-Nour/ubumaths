/**
 * API Route: /api/construction-demo-scripts
 * GET    - List user's demo scripts
 * POST   - Create or update (upsert by name) a demo script
 * DELETE - Delete a demo script by id
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';

const upsertSchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
	dsl_script: z.string().min(1, 'Le script est requis').max(100000, 'Script trop long')
});

const deleteSchema = z.object({
	id: z.string().uuid('ID invalide')
});

// GET — list all demo scripts for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);

	const { data, error: dbError } = await locals.supabase
		.from('construction_demo_scripts')
		.select('id, name, dsl_script, created_at, updated_at')
		.eq('author_id', user.id)
		.order('name');

	if (dbError) throw error(500, dbError.message);

	return json(data);
};

// POST — create or update a demo script (upsert by name)
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);

	const body = await request.json().catch(() => {
		throw error(400, 'JSON invalide');
	});

	const validation = upsertSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues.map((e) => e.message).join('; '));
	}

	const { name, dsl_script } = validation.data;

	const { data, error: dbError } = await locals.supabase
		.from('construction_demo_scripts')
		.upsert({ author_id: user.id, name, dsl_script }, { onConflict: 'author_id,name' })
		.select('id, name, dsl_script, created_at, updated_at')
		.single();

	if (dbError) throw error(500, dbError.message);

	return json(data, { status: 201 });
};

// DELETE — delete a demo script by id
export const DELETE: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);

	const validation = deleteSchema.safeParse({ id: url.searchParams.get('id') });
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { error: dbError } = await locals.supabase
		.from('construction_demo_scripts')
		.delete()
		.eq('id', validation.data.id)
		.eq('author_id', user.id);

	if (dbError) throw error(500, dbError.message);

	return json({ ok: true });
};
