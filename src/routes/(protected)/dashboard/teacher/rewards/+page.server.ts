import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Profile, Class } from '$lib/types/database';
import type { StudentVipCards } from '$lib/types/vip-card';

// Type pour les élèves avec leurs gidouilles
export interface StudentWithGidouilles extends Profile {
	gidouilles: number;
}

// Load function: Récupère les classes du professeur avec leurs élèves
export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	// Get user and profile from parent (protected) layout
	const { user, profile } = await parent();

	if (!user || !profile) {
		throw error(401, 'Unauthorized');
	}

	// Vérifier que l'utilisateur est professeur
	if (profile.role !== 'teacher') {
		throw error(403, 'Only teachers can access this page');
	}

	// Récupérer toutes les classes du professeur
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('*')
		.eq('teacher_id', user.id)
		.eq('is_active', true)
		.order('name');

	if (classesError) {
		console.error('Error loading classes:', classesError);
		throw error(500, 'Failed to load classes');
	}

	// Pour chaque classe, récupérer les élèves avec leurs gidouilles
	const classesWithStudents = await Promise.all(
		(classes || []).map(async (classItem) => {
			// D'abord, récupérer les IDs des élèves de cette classe
			const { data: memberIds } = await supabase
				.from('class_members')
				.select('student_id')
				.eq('class_id', classItem.id);

			const studentIds = memberIds?.map((m) => m.student_id) || [];

			// Si pas d'élèves, retourner la classe vide
			if (studentIds.length === 0) {
				return {
					...classItem,
					students: []
				};
			}

			// Ensuite, récupérer les profils des élèves (avec vip_cards)
			const { data: students, error: studentsError } = await supabase
				.from('profiles')
				.select(
					`
					id,
					firstname,
					lastname,
					full_name,
					avatar_url,
					gidouilles,
					vip_cards,
					role,
					gender
				`
				)
				.in('id', studentIds)
				.order('firstname');

			if (studentsError) {
				console.error(`Error loading students for class ${classItem.id}:`, studentsError);
				return {
					...classItem,
					students: []
				};
			}

			return {
				...classItem,
				students: students || []
			};
		})
	);

	return {
		classes: classesWithStudents as Array<
			Class & {
				students: Array<{
					id: string;
					firstname: string | null;
					lastname: string | null;
					full_name: string | null;
					avatar_url: string | null;
					gidouilles: number;
					vip_cards: StudentVipCards;
					role: string | null;
					gender: string | null;
				}>;
			}
		>
	};
};

// Actions: Gérer les modifications de gidouilles et cartes VIP
export const actions: Actions = {
	// Action pour obtenir une carte VIP aléatoire
	awardVipCard: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;

		if (!studentId) {
			return fail(400, { message: 'Invalid data' });
		}

		try {
			// Appeler la fonction RPC pour attribuer une carte VIP aléatoire
			const { data: cardId, error: rpcError } = await supabase.rpc('award_random_vip_card', {
				p_student_id: studentId
			});

			if (rpcError) {
				console.error('RPC Error:', rpcError);
				return fail(500, {
					message: rpcError.message || 'Failed to award VIP card'
				});
			}

			return {
				success: true,
				message: 'Carte VIP attribuée avec succès !',
				cardId: cardId
			};
		} catch (err) {
			console.error('Error awarding VIP card:', err);
			return fail(500, {
				message: 'An error occurred while awarding VIP card'
			});
		}
	},

	// Action pour utiliser une carte VIP
	useVipCard: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const cardId = formData.get('cardId') as string;

		if (!studentId || !cardId) {
			return fail(400, { message: 'Invalid data' });
		}

		try {
			// Appeler la fonction RPC pour utiliser une carte VIP
			const { data: success, error: rpcError } = await supabase.rpc('use_vip_card', {
				p_student_id: studentId,
				p_card_id: cardId
			});

			if (rpcError) {
				console.error('RPC Error:', rpcError);
				return fail(500, {
					message: rpcError.message || 'Failed to use VIP card'
				});
			}

			if (!success) {
				return fail(404, {
					message: 'No unused card found'
				});
			}

			return {
				success: true,
				message: 'Carte VIP utilisée avec succès'
			};
		} catch (err) {
			console.error('Error using VIP card:', err);
			return fail(500, {
				message: 'An error occurred while using VIP card'
			});
		}
	},

	// Action pour mettre à jour les gidouilles d'un élève
	updateStudent: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const delta = parseInt(formData.get('delta') as string, 10);

		if (!studentId || isNaN(delta)) {
			return fail(400, { message: 'Invalid data' });
		}

		try {
			// Appeler la fonction RPC sécurisée
			const { data, error: rpcError } = await supabase.rpc('update_student_gidouilles', {
				p_student_id: studentId,
				p_delta: delta
			});

			if (rpcError) {
				console.error('RPC Error:', rpcError);
				return fail(500, {
					message: rpcError.message || 'Failed to update gidouilles'
				});
			}

			return {
				success: true,
				message: `Gidouilles mises à jour avec succès`,
				newValue: data
			};
		} catch (err) {
			console.error('Error updating student gidouilles:', err);
			return fail(500, {
				message: 'An error occurred while updating gidouilles'
			});
		}
	},

	// Action pour mettre à jour les gidouilles de toute une classe
	updateClass: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const classId = formData.get('classId') as string;
		const delta = parseInt(formData.get('delta') as string, 10);

		if (!classId || isNaN(delta)) {
			return fail(400, { message: 'Invalid data' });
		}

		try {
			// Appeler la fonction RPC sécurisée
			const { data, error: rpcError } = await supabase.rpc('update_class_gidouilles', {
				p_class_id: classId,
				p_delta: delta
			});

			if (rpcError) {
				console.error('RPC Error:', rpcError);
				return fail(500, {
					message: rpcError.message || 'Failed to update class gidouilles'
				});
			}

			return {
				success: true,
				message: `${data} élève(s) mis à jour avec succès`,
				studentsUpdated: data
			};
		} catch (err) {
			console.error('Error updating class gidouilles:', err);
			return fail(500, {
				message: 'An error occurred while updating class gidouilles'
			});
		}
	},

	// Action pour retirer une carte VIP d'un élève
	removeVipCard: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const studentId = formData.get('studentId') as string;
		const cardId = formData.get('cardId') as string;

		if (!studentId || !cardId) {
			return fail(400, { message: 'Invalid data' });
		}

		try {
			// Appeler la fonction RPC pour retirer une carte VIP
			const { data: success, error: rpcError } = await supabase.rpc('remove_student_vip_card', {
				p_student_id: studentId,
				p_card_id: cardId
			});

			if (rpcError) {
				console.error('RPC Error:', rpcError);
				return fail(500, {
					message: rpcError.message || 'Failed to remove VIP card'
				});
			}

			if (!success) {
				return fail(404, {
					message: 'No card found to remove'
				});
			}

			return {
				success: true,
				message: 'Carte retirée avec succès'
			};
		} catch (err) {
			console.error('Error removing VIP card:', err);
			return fail(500, {
				message: 'An error occurred while removing VIP card'
			});
		}
	}
};
