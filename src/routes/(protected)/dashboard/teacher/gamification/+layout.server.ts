import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	await requireRole(locals, 'teacher');

	// Le badge « demandes VIP en attente » interrogeait `vip_activation_requests`,
	// table qu'AUCUNE migration n'a jamais créée — la requête échouait donc
	// silencieusement et le compteur valait 0 en permanence. La plomberie du
	// badge reste en place (cf. dashboard-nav.ts et ses tests) : le jour où la
	// table existera, il suffira de rebrancher la requête ici.
	return {
		pendingVipRequestsCount: 0
	};
};
