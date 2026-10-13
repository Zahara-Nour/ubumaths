/**
 * API Route: /api/spreadsheets
 * GET - List user's spreadsheets with pagination
 * POST - Create new spreadsheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSpreadsheetUser } from '$lib/server/spreadsheet-access';
import {
	createSpreadsheetSchema,
	listSpreadsheetsSchema
} from '$lib/server/validation/spreadsheet';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/spreadsheets/+server');

/**
 * GET /api/spreadsheets
 * List all spreadsheets for the current user
 * Students and teachers can access their own spreadsheets
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireSpreadsheetUser(locals);

	// Validate query parameters
	const paramsValidation = listSpreadsheetsSchema.safeParse({
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit')
	});

	if (!paramsValidation.success) {
		throw error(400, paramsValidation.error.issues[0].message);
	}

	const { page, limit } = paramsValidation.data;
	const offset = (page - 1) * limit;

	// Fetch spreadsheets
	const {
		data,
		error: dbError,
		count
	} = await locals.supabase
		.from('spreadsheets')
		.select('id, name, description, created_at, updated_at', { count: 'exact' })
		.eq('user_id', user.id)
		.order('updated_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (dbError) {
		logger.error('Error fetching spreadsheets:', dbError);
		throw error(500, 'Erreur lors de la récupération des feuilles de calcul');
	}

	return json({
		spreadsheets: data ?? [],
		total: count ?? 0,
		page,
		limit,
		totalPages: Math.ceil((count ?? 0) / limit)
	});
};

/**
 * POST /api/spreadsheets
 * Create a new spreadsheet for the current user
 * Students and teachers can create spreadsheets
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireSpreadsheetUser(locals);

	// Parse and validate request body
	const body = await request.json();
	const validation = createSpreadsheetSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name, description, data } = validation.data;

	// Default data structure if not provided
	const defaultData = {
		version: 1,
		cells: {},
		metadata: { name, rows: 20, cols: 20 }
	};

	// Insert spreadsheet
	const { data: spreadsheet, error: dbError } = await locals.supabase
		.from('spreadsheets')
		.insert({
			user_id: user.id,
			name,
			description: description ?? null,
			data: data ?? defaultData
		})
		.select('id, name, description, created_at, updated_at')
		.single();

	if (dbError) {
		logger.error('Error creating spreadsheet:', dbError);
		throw error(500, 'Erreur lors de la création de la feuille de calcul');
	}

	return json({ spreadsheet }, { status: 201 });
};
