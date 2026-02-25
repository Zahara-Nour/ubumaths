/**
 * API Endpoint: Batch Reject VIP Card Activations
 * =================================================
 *
 * Rejects multiple VIP card activation requests in a single HTTP call.
 * Loops through each request server-side, calling reject_vip_card RPC.
 *
 * POST /api/vip-cards/reject-batch
 *
 * @param requests - Array of { instanceId, studentId } to reject
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

const batchRejectSchema = z.object({
	requests: z
		.array(
			z.object({
				instanceId: z.string().uuid('Invalid instance ID format'),
				studentId: z.string().uuid('Invalid student ID format')
			})
		)
		.min(1, 'At least one request required')
		.max(100, 'Maximum 100 requests per batch')
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can reject VIP card activations');
	}

	const body = await request.json();
	const validation = batchRejectSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { requests } = validation.data;
	const results = { success: 0, failed: 0, errors: [] as string[] };

	// Verify teacher-student relationship for all unique students
	const uniqueStudentIds = [...new Set(requests.map((r) => r.studentId))];
	const accessChecks = await Promise.all(
		uniqueStudentIds.map(async (studentId) => ({
			studentId,
			hasAccess: await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase)
		}))
	);
	const deniedStudents = new Set(accessChecks.filter((c) => !c.hasAccess).map((c) => c.studentId));

	if (deniedStudents.size > 0) {
		for (const req of requests) {
			if (deniedStudents.has(req.studentId)) {
				results.failed++;
				results.errors.push(`${req.instanceId}: Student is not in your classes`);
			}
		}
	}

	const authorizedRequests = requests.filter((r) => !deniedStudents.has(r.studentId));

	const rpcResults = await Promise.all(
		authorizedRequests.map((req) =>
			supabase
				.rpc('reject_vip_card', {
					p_student_id: req.studentId,
					p_instance_id: req.instanceId
				})
				.then(({ data, error: rpcError }) => ({ instanceId: req.instanceId, data, rpcError }))
		)
	);

	for (const { instanceId, data, rpcError } of rpcResults) {
		if (rpcError) {
			results.failed++;
			results.errors.push(`${instanceId}: ${rpcError.message}`);
			continue;
		}

		const rpcResult = data as { success: boolean; error?: string };
		if (rpcResult.success) {
			results.success++;
		} else {
			results.failed++;
			results.errors.push(`${instanceId}: ${rpcResult.error}`);
		}
	}

	return json({
		success: results.failed === 0,
		rejected: results.success,
		failed: results.failed,
		errors: results.errors.length > 0 ? results.errors : undefined
	});
};
