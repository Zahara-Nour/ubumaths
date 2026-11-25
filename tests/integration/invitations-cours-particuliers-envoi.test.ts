/**
 * Invitations de cours particulier : envoi, renvoi, annulation, purge (base locale)
 * =================================================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 2 : ce que le serveur écrit dans `private_lesson_invitations`, en service role, après la
 * garde `requireAdmin` de la page admin (`#lib/server/private-lessons/invitations.ts`).
 * Le courriel est remplacé par un faux expéditeur : on lit le jeton qu'il reçoit.
 *
 *  - envoi accepté : `email_sent_at` posé, `sent_count` = 1, le lien du courriel s'ouvre ;
 *  - envoi refusé par Brevo : ligne gardée, `email_sent_at` null, `sent_count` = 0 ;
 *  - « Renvoyer » : nouveau lien, l'ancien ne s'ouvre plus ; compté si le courriel part ;
 *    refusé après utilisation, annulation, réservation récente, ou 5 courriels ;
 *  - « Annuler » : le lien ne s'ouvre plus ; une seconde annulation est refusée ;
 *  - purge (décision 8) : finie depuis plus de 30 jours → effacée ; en cours, ou finie
 *    depuis moins de 30 jours → gardée ;
 *  - l'école de cours particuliers et son année scolaire.
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import {
	cancelInvitation,
	createInvitation,
	getPrivateLessonsSchool,
	listOpenInvitations,
	purgeEndedInvitations,
	resendInvitation,
	type InvitationEmailSender
} from '#lib/server/private-lessons/invitations.ts';
import type { PrivateLessonInvitationEmailData } from '#lib/email-templates/private-lesson-invitation.ts';

// Types

interface SentEmail {
	to: string;
	data: PrivateLessonInvitationEmailData;
}

// Constantes

const TABLE = 'private_lesson_invitations';
const PARENT_EMAIL = 'parent.lina@example.test';
const JOUR = 86_400_000;
const service = createServiceRoleClient();

// Variables

let ecole: { id: string; name: string };
let adminId: string;
let envoyes: SentEmail[] = [];

// Functions

const expediteurOk: InvitationEmailSender = async (to, data) => {
	envoyes.push({ to, data });
	return { success: true, messageId: 'faux' };
};

const expediteurRefuse: InvitationEmailSender = async (to, data) => {
	envoyes.push({ to, data });
	return { success: false, error: 'Envoi refusé par Brevo (statut 400)' };
};

function dernierJeton(): string {
	const dernier = envoyes.at(-1);
	if (!dernier) throw new Error('aucun courriel envoyé');
	return dernier.data.token;
}

async function lireParLien(jeton: string): Promise<{ firstname: string } | null> {
	const { data, error } = await service.rpc('get_private_lesson_invitation', { p_token: jeton });
	if (error) throw new Error(`get_private_lesson_invitation : ${error.message}`);
	return data as { firstname: string } | null;
}

async function inviter(sender: InvitationEmailSender = expediteurOk, firstname = 'Lina') {
	const outcome = await createInvitation(service, sender, {
		school: ecole,
		firstname,
		parentEmail: PARENT_EMAIL,
		grade: '6',
		createdBy: adminId
	});
	if (!outcome.ok) throw new Error(`invitation refusée : ${outcome.reason}`);
	return outcome;
}

async function ligne(id: string) {
	const { data, error } = await service
		.from(TABLE)
		.select('id, email_sent_at, sent_count, cancelled_at, created_by, expires_at, token_hash')
		.eq('id', id)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

/** Invitation écrite à la main (dates du passé) pour la purge. */
async function inviterALaMain(champs: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(TABLE)
		.insert({
			school_id: ecole.id,
			firstname: 'Purge',
			parent_email: PARENT_EMAIL,
			grade: '5',
			token_hash: crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'),
			expires_at: new Date(Date.now() + 7 * JOUR).toISOString(),
			...champs
		})
		.select('id')
		.single();
	if (error) throw new Error(`${TABLE} : ${error.message}`);
	return (data as { id: string }).id;
}

function ilYA(jours: number): string {
	return new Date(Date.now() - jours * JOUR).toISOString();
}

// Tests

describe('invitations de cours particulier : écritures du serveur (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const { data, error } = await service
			.from('schools')
			.insert({ name: 'Cours particuliers envoi test', city: 'Testville', country: 'France' })
			.select('id, name')
			.single();
		if (error) throw new Error(`schools : ${error.message}`);
		ecole = data as { id: string; name: string };
		adminId = (await TestData.profile().withRole('admin').create()).id;
	});

	afterAll(async () => {
		// Les invitations et les années partent avec leur école (on delete cascade).
		await service.from('schools').delete().eq('id', ecole.id);
		await cleanupAllTestData();
	});

	describe("l'école de cours particuliers", () => {
		it('aucune école réglée : null', async () => {
			expect(await getPrivateLessonsSchool(service)).toBeNull();
		});

		it('réglée, sans année scolaire : rendue, sans année ; avec une année commencée : avec', async () => {
			const { error } = await service
				.from('schools')
				.update({ is_private_lessons: true })
				.eq('id', ecole.id)
				.select('id');
			expect(error).toBeNull();

			expect(await getPrivateLessonsSchool(service)).toEqual({
				id: ecole.id,
				name: ecole.name,
				hasSchoolYear: false
			});

			const debut = new Date(Date.now() - 30 * JOUR).toISOString().slice(0, 10);
			const fin = new Date(Date.now() + 300 * JOUR).toISOString().slice(0, 10);
			const { data: annee, error: eAnnee } = await service
				.from('school_years')
				.insert({ school_id: ecole.id, name: 'Année test', start_date: debut, end_date: fin })
				.select('id');
			expect(eAnnee).toBeNull();
			expect(annee).toHaveLength(1);

			expect(await getPrivateLessonsSchool(service)).toEqual({
				id: ecole.id,
				name: ecole.name,
				hasSchoolYear: true
			});
		});
	});

	describe('envoyer', () => {
		it('courriel accepté : envoi noté, lien du courriel ouvert, auteur posé', async () => {
			envoyes = [];
			const outcome = await inviter();

			expect(outcome.emailSent).toBe(true);
			expect(envoyes).toHaveLength(1);
			expect(envoyes[0].to).toBe(PARENT_EMAIL);
			expect(envoyes[0].data.childFirstname).toBe('Lina');
			expect(envoyes[0].data.schoolName).toBe(ecole.name);

			const l = await ligne(outcome.invitation.id);
			expect(l?.sent_count).toBe(1);
			expect(l?.email_sent_at).not.toBeNull();
			expect(l?.created_by).toBe(adminId);
			// Le jeton en clair n'est pas en base : seulement son empreinte.
			expect(l?.token_hash).not.toBe(dernierJeton());
			expect(l?.token_hash).toMatch(/^[0-9a-f]{64}$/);
			// 7 jours, à la minute près.
			const echeance = new Date(l!.expires_at).getTime();
			expect(Math.abs(echeance - (Date.now() + 7 * JOUR))).toBeLessThan(60_000);

			expect(await lireParLien(dernierJeton())).toMatchObject({ firstname: 'Lina' });
		});

		it('courriel refusé : ligne gardée, ni envoi noté ni compté', async () => {
			envoyes = [];
			const outcome = await inviter(expediteurRefuse, 'Noé');

			expect(outcome.emailSent).toBe(false);
			const l = await ligne(outcome.invitation.id);
			expect(l?.sent_count).toBe(0);
			expect(l?.email_sent_at).toBeNull();
		});

		it("la liste rend les invitations ouvertes, sans l'empreinte du lien", async () => {
			const liste = await listOpenInvitations(service, ecole.id);
			expect(liste.map((i) => i.firstname).sort()).toEqual(['Lina', 'Noé']);
			for (const i of liste) expect(i).not.toHaveProperty('token_hash');
		});
	});

	describe('renvoyer', () => {
		it("nouveau lien : l'ancien ne s'ouvre plus, le nouveau oui ; envoi compté", async () => {
			envoyes = [];
			const { invitation } = await inviter();
			const ancien = dernierJeton();

			const outcome = await resendInvitation(service, expediteurOk, {
				id: invitation.id,
				school: ecole
			});
			expect(outcome).toMatchObject({ ok: true, emailSent: true });
			const nouveau = dernierJeton();
			expect(nouveau).not.toBe(ancien);

			expect(await lireParLien(ancien)).toBeNull();
			expect(await lireParLien(nouveau)).toMatchObject({ firstname: 'Lina' });
			expect((await ligne(invitation.id))?.sent_count).toBe(2);
		});

		it('courriel refusé au renvoi : nouveau lien posé, mais ni « envoyée » ni compté', async () => {
			envoyes = [];
			const { invitation } = await inviter();

			const outcome = await resendInvitation(service, expediteurRefuse, {
				id: invitation.id,
				school: ecole
			});
			expect(outcome).toMatchObject({ ok: true, emailSent: false });
			const l = await ligne(invitation.id);
			expect(l?.email_sent_at).toBeNull();
			expect(l?.sent_count).toBe(1);
		});

		it('une invitation expirée se renvoie : nouvelle échéance à 7 jours', async () => {
			const id = await inviterALaMain({ expires_at: ilYA(3), sent_count: 1 });
			const outcome = await resendInvitation(service, expediteurOk, { id, school: ecole });
			expect(outcome).toMatchObject({ ok: true, emailSent: true });
			const l = await ligne(id);
			expect(new Date(l!.expires_at).getTime()).toBeGreaterThan(Date.now() + 6 * JOUR);
		});

		it('refusé : utilisée, annulée, réservée il y a moins de 5 min, 5 courriels, autre école', async () => {
			const utilisee = await inviterALaMain({ used_at: new Date().toISOString() });
			const annulee = await inviterALaMain({ cancelled_at: new Date().toISOString() });
			const reservee = await inviterALaMain({ claimed_at: ilYA(1 / (24 * 60)) });
			const plafond = await inviterALaMain({ sent_count: 5 });
			const autre = { id: crypto.randomUUID(), name: 'Autre' };

			envoyes = [];
			const r = (id: string, school = ecole) =>
				resendInvitation(service, expediteurOk, { id, school });
			expect(await r(utilisee)).toEqual({ ok: false, reason: 'ended' });
			expect(await r(annulee)).toEqual({ ok: false, reason: 'ended' });
			expect(await r(reservee)).toEqual({ ok: false, reason: 'in_use' });
			expect(await r(plafond)).toEqual({ ok: false, reason: 'cap' });
			expect(await r(plafond, autre)).toEqual({ ok: false, reason: 'not_found' });
			expect(envoyes).toHaveLength(0);
		});

		it('une réservation périmée (plus de 5 min) ne bloque pas le renvoi', async () => {
			const id = await inviterALaMain({ claimed_at: ilYA(1 / 24) });
			expect(await resendInvitation(service, expediteurOk, { id, school: ecole })).toMatchObject({
				ok: true
			});
		});
	});

	describe('annuler', () => {
		it("le lien ne s'ouvre plus ; l'invitation quitte la liste ; une seconde annulation est refusée", async () => {
			envoyes = [];
			const { invitation } = await inviter(expediteurOk, 'Sacha');
			const jeton = dernierJeton();

			expect(await cancelInvitation(service, { id: invitation.id, schoolId: ecole.id })).toEqual({
				ok: true
			});
			expect((await ligne(invitation.id))?.cancelled_at).not.toBeNull();
			expect(await lireParLien(jeton)).toBeNull();
			const liste = await listOpenInvitations(service, ecole.id);
			expect(liste.map((i) => i.id)).not.toContain(invitation.id);

			expect(await cancelInvitation(service, { id: invitation.id, schoolId: ecole.id })).toEqual({
				ok: false,
				reason: 'ended'
			});
		});

		it("inconnue, ou d'une autre école : introuvable", async () => {
			const { invitation } = await inviter();
			expect(
				await cancelInvitation(service, { id: crypto.randomUUID(), schoolId: ecole.id })
			).toEqual({ ok: false, reason: 'not_found' });
			expect(
				await cancelInvitation(service, { id: invitation.id, schoolId: crypto.randomUUID() })
			).toEqual({ ok: false, reason: 'not_found' });
			expect((await ligne(invitation.id))?.cancelled_at).toBeNull();
		});
	});

	describe('purge à 30 jours (décision 8)', () => {
		it('efface les finies depuis plus de 30 jours, garde les autres', async () => {
			await service.from(TABLE).delete().eq('school_id', ecole.id).select('id');

			const effacees = [
				await inviterALaMain({ used_at: ilYA(31), expires_at: ilYA(35) }),
				await inviterALaMain({ cancelled_at: ilYA(31) }),
				await inviterALaMain({ expires_at: ilYA(31) })
			];
			const gardees = [
				await inviterALaMain({ used_at: ilYA(29), expires_at: ilYA(35) }),
				await inviterALaMain({ cancelled_at: ilYA(29), expires_at: ilYA(40) }),
				await inviterALaMain({ expires_at: ilYA(29) }),
				await inviterALaMain({})
			];

			const rapport = await purgeEndedInvitations(service);
			expect(rapport).toEqual({ used: 1, cancelled: 1, expired: 1 });

			const { data, error } = await service.from(TABLE).select('id').eq('school_id', ecole.id);
			expect(error).toBeNull();
			const restantes = (data ?? []).map((r) => r.id).sort();
			expect(restantes).toEqual([...gardees].sort());
			for (const id of effacees) expect(restantes).not.toContain(id);
		});
	});
});
