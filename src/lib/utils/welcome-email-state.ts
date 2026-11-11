// État du bouton « Email de bienvenue » d'un élève, dans la liste des classes du prof.
// Un enfant inscrit par son parent a une adresse fictive : on ne lui écrit jamais,
// le contact passe par le parent (page des consentements).

import { childLoginIdOf } from '$lib/utils/child-account';

export type WelcomeEmailState =
	| { kind: 'parent-link'; loginId: string }
	| { kind: 'sent'; sentAt: string }
	| { kind: 'send' }
	| { kind: 'no-email' };

export function welcomeEmailState(student: {
	email: string | null;
	welcomeEmailSentAt: string | null;
}): WelcomeEmailState {
	const loginId = childLoginIdOf(student.email);
	if (loginId) return { kind: 'parent-link', loginId };
	if (student.welcomeEmailSentAt) return { kind: 'sent', sentAt: student.welcomeEmailSentAt };
	if (student.email) return { kind: 'send' };
	return { kind: 'no-email' };
}
