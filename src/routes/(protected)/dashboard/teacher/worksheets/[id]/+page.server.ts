import type { PageServerLoad, Actions } from './$types';
import { redirect, fail, error } from '@sveltejs/kit';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid();

/**
 * Load worksheet details with sections and exercises
 */
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Validate worksheet ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de feuille invalide');
	}

	// Fetch worksheet details from API
	const response = await fetch(`/api/worksheets/${params.id}`);

	if (!response.ok) {
		if (response.status === 404) {
			throw error(404, 'Feuille non trouvee');
		}
		if (response.status === 403) {
			throw error(403, 'Acces refuse');
		}
		throw error(500, 'Erreur lors du chargement de la feuille');
	}

	const data = await response.json();

	return {
		worksheet: data.worksheet,
		user
	};
};

/**
 * Actions for worksheet status changes
 */
export const actions: Actions = {
	/**
	 * Publish a worksheet
	 */
	publish: async ({ params, locals, fetch }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifie' });
		}

		const response = await fetch(`/api/worksheets/${params.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'published' })
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
			return fail(response.status, { message: error.message || 'Erreur lors de la publication' });
		}

		return { success: true, message: 'Feuille publiee avec succes' };
	},

	/**
	 * Archive a worksheet
	 */
	archive: async ({ params, locals, fetch }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifie' });
		}

		const response = await fetch(`/api/worksheets/${params.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'archived' })
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
			return fail(response.status, { message: error.message || "Erreur lors de l'archivage" });
		}

		return { success: true, message: 'Feuille archivee avec succes' };
	},

	/**
	 * Unarchive (restore to draft)
	 */
	unarchive: async ({ params, locals, fetch }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifie' });
		}

		const response = await fetch(`/api/worksheets/${params.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'draft' })
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
			return fail(response.status, { message: error.message || 'Erreur lors de la restauration' });
		}

		return { success: true, message: 'Feuille restauree en brouillon' };
	}
};
