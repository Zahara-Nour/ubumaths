/**
 * Base locale remplie, chantier `seed-complet` (PR 4) — échanges et famille inventés
 * ==================================================================================
 *
 * `planEchanges` fabrique, pour les élèves fictifs, de quoi remplir les pages d'échanges et de
 * famille : messagerie, modération, tuteur, annonces, marché, consentements, carnet de liaison,
 * élèves en attente, cahier de texte, liens de partage, tableau de tâches, signalements de bug.
 * Gardé ici, sans base :
 * - le plan est reproductible (même graine → même base) ;
 * - chaque ligne respecte les contraintes de la base (celles qui feraient échouer l'insertion) ;
 * - les lignes d'une même table ont les mêmes colonnes (l'insertion prend celles de la première) ;
 * - les règles recopiées de l'appli tiennent (fil des messages, empreintes du carnet) ;
 * - une carte n'est engagée qu'une fois, et seulement par son propriétaire ;
 * - les cas utiles au test sont là ; l'absent et l'élève hors classe n'ont rien ;
 * - aucune adresse hors des domaines fictifs, aucun utilisateur hors des comptes locaux.
 */

import { describe, it, expect } from 'vitest';
import { COPIE, INVENTE, JAMAIS } from '../db-seed-riche/regles';
import {
	documentTexte,
	ECRITURE_ECHANGES,
	empreinte,
	NETTOYAGE_ECHANGES,
	joursDeClasse,
	planEchanges,
	PREFIXE_ECHANGES,
	uniformiser,
	type ContexteEchanges,
	type PlanEchanges
} from '../db-seed-riche/echanges';

const PROF = '11111111-1111-4111-8111-111111111111';
const ADMIN = '33333333-3333-4333-8333-333333333333';
const eleve = (n: number) => `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const HORS_CLASSE = eleve(31);
const ABSENT = eleve(6);
const CONVERSATION = '5eed5c00-0000-4000-8000-00000000c0c0';

function contexte(): ContexteEchanges {
	const classes = ['classe-a', 'classe-b', 'classe-c'].map((id, i) => ({
		id,
		// Six élèves par classe, comme la base locale (30 élèves, 5 classes).
		eleves: Array.from({ length: 6 }, (_, k) => eleve(i * 6 + k + 1)),
		ecole: 'ecole-1',
		niveau: '5'
	}));
	const premiere = classes[0].eleves;
	return {
		prof: PROF,
		admin: ADMIN,
		classes,
		horsClasse: HORS_CLASSE,
		maintenant: new Date('2026-11-22T10:00:00Z'),
		graine: 7,
		discussion: {
			conversation: CONVERSATION,
			messages: [PROF, premiere[0], premiere[1], premiere[2], PROF, premiere[3]].map(
				(auteur, i) => ({
					id: `5eed5c00-0000-4000-8000-0000000000m${i}`,
					auteur,
					date: new Date(Date.parse('2026-11-13T10:00:00Z') + i * 86_400_000).toISOString()
				})
			)
		},
		mains: classes
			.flatMap((k) => k.eleves)
			.filter((e) => e !== ABSENT)
			.map((e, i) => ({
				eleve: e,
				cartes: Array.from({ length: (i % 3) + 1 }, (_, n) => ({
					instance: `carte-${e.slice(-2)}-${n}`,
					modele: `modele-${(i + n) % 4}`
				}))
			})),
		amis: [
			[premiere[0], premiere[1]],
			[premiere[2], premiere[0]]
		],
		// L'élève hors classe y est aussi, comme dans la base locale : le plan l'écarte.
		soumisAuConsentement: [
			eleve(2),
			eleve(5),
			eleve(8),
			eleve(9),
			eleve(14),
			eleve(15),
			HORS_CLASSE
		],
		points: {
			'classe-a': ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
			'classe-b': ['p8'],
			'classe-c': []
		},
		exercices: ['ex-1', 'ex-2', 'ex-3']
	};
}

const plan = planEchanges(contexte());
const parties = ECRITURE_ECHANGES.map((e) => e.partie);
const toutes = (p: PlanEchanges) => parties.flatMap((k) => p[k]);
const longueur = (v: unknown) => (typeof v === 'string' ? [...v].length : -1);

describe('planEchanges — reproductible et complet', () => {
	it('même graine, même plan', () => {
		expect(planEchanges(contexte())).toEqual(plan);
	});

	it('chaque partie écrite a des lignes', () => {
		for (const partie of parties) expect(plan[partie].length, partie).toBeGreaterThan(0);
	});

	it('les jetons des liens de partage viennent du tirage donné', () => {
		const avec = () => {
			let n = 0;
			const tirage = () => `jeton-de-partage-${String(++n).padStart(4, '0')}`;
			return planEchanges({ ...contexte(), jetonDePartage: tirage });
		};
		const p = avec();
		const liens = [...p.liensCours, ...p.liensCahier, ...p.liensExercice];
		expect(liens.length).toBeGreaterThan(0);
		for (const l of liens) expect(String(l.token)).toMatch(/^jeton-de-partage-\d{4}$/);
		expect(avec()).toEqual(p);
	});

	it('tous les identifiants inventés portent le préfixe', () => {
		for (const partie of parties) {
			for (const l of plan[partie]) {
				if ('id' in l) expect(String(l.id), partie).toMatch(new RegExp(`^${PREFIXE_ECHANGES}-`));
			}
		}
	});

	it('les lignes d’une même table ont les mêmes colonnes', () => {
		for (const partie of parties) {
			const premieres = Object.keys(plan[partie][0]).sort();
			for (const l of plan[partie]) expect(Object.keys(l).sort(), partie).toEqual(premieres);
		}
	});

	it('uniformiser complète une colonne absente par son défaut, sinon par rien', () => {
		const lignes: Record<string, unknown>[] = [{ a: 1 }, { b: 2 }];
		uniformiser(lignes, { b: 0 });
		expect(lignes).toEqual([
			{ a: 1, b: 0 },
			{ b: 2, a: null }
		]);
	});
});

describe('planEchanges — personne d’autre que les comptes locaux', () => {
	const autorises = new Set([PROF, ADMIN, ...contexte().classes.flatMap((k) => k.eleves)]);
	const colonnesUtilisateur = [
		'sender_id',
		'recipient_id',
		'author_id',
		'user_id',
		'reported_by',
		'reviewed_by',
		'restricted_by',
		'moderator_id',
		'student_id',
		'created_by',
		'creator_id',
		'proposer_id',
		'initiator_id',
		'partner_id',
		'last_offer_by',
		'owner_id',
		'resolved_by',
		'stopped_by',
		'updated_by'
	];

	it('chaque colonne d’utilisateur désigne un compte local', () => {
		for (const l of toutes(plan)) {
			for (const col of colonnesUtilisateur) {
				if (l[col] != null) expect(autorises.has(String(l[col])), `${col} ${l[col]}`).toBe(true);
			}
		}
	});

	it('l’élève absent et l’élève hors classe n’ont rien', () => {
		const texte = JSON.stringify(toutes(plan));
		expect(texte).not.toContain(HORS_CLASSE);
		// L'absent reçoit seulement le message envoyé à toute sa classe.
		const sansBoite = parties.filter((p) => p !== 'boites').flatMap((p) => plan[p]);
		expect(JSON.stringify(sansBoite)).not.toContain(ABSENT);
		const sesBoites = plan.boites.filter((b) => b.recipient_id === ABSENT);
		expect(sesBoites).toHaveLength(1);
		const message = plan.messagesPrives.find((m) => m.id === sesBoites[0].message_id);
		expect(message).toMatchObject({ is_group_message: true, class_id: 'classe-a' });
	});

	it('aucune adresse hors des domaines fictifs', () => {
		const adresses = JSON.stringify(toutes(plan)).match(/[\w.+-]+@[\w.-]+/g) ?? [];
		expect(adresses.length).toBeGreaterThan(0);
		for (const a of adresses) expect(a).toMatch(/@(example|local)\.test$/);
	});
});

describe('planEchanges — messagerie du prof', () => {
	const messages = plan.messagesPrives;
	const parId = new Map(messages.map((m) => [m.id, m]));

	it('un message sans parent est sa propre racine, une réponse reprend celle du parent', () => {
		for (const m of messages) {
			if (m.parent_message_id === null) expect(m.thread_root_id).toBe(m.id);
			else expect(m.thread_root_id).toBe(parId.get(m.parent_message_id)?.thread_root_id);
		}
		expect(messages.some((m) => m.parent_message_id !== null)).toBe(true);
	});

	it('une ligne de boîte par destinataire, jamais pour l’expéditeur', () => {
		for (const m of messages) {
			const boites = plan.boites.filter((b) => b.message_id === m.id);
			expect(boites.length).toBe(m.recipient_count);
			for (const b of boites) expect(b.recipient_id).not.toBe(m.sender_id);
		}
	});

	it('objet de 1 à 200 caractères', () => {
		for (const m of messages) {
			expect(longueur(m.subject)).toBeGreaterThan(0);
			expect(longueur(m.subject)).toBeLessThanOrEqual(200);
		}
	});

	it('document de l’éditeur : un paragraphe, et son texte brut', () => {
		expect(documentTexte('Bonjour')).toEqual({
			content: {
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bonjour' }] }]
			},
			plain_text: 'Bonjour'
		});
	});

	it('un message à la classe, un archivé, un non lu chez le prof, un brouillon', () => {
		expect(messages.filter((m) => m.is_group_message && m.class_id === 'classe-a')).toHaveLength(1);
		expect(plan.boites.some((b) => b.status === 'archived')).toBe(true);
		expect(plan.boites.some((b) => b.recipient_id === PROF && b.read_at === null)).toBe(true);
		expect(plan.brouillons[0].author_id).toBe(PROF);
	});

	it('chaque message est lu après son envoi', () => {
		for (const b of plan.boites) {
			const m = parId.get(b.message_id);
			if (b.read_at) expect(String(b.read_at) > String(m?.sent_at)).toBe(true);
		}
	});
});

describe('planEchanges — discussion de classe', () => {
	it('réactions et signalements viennent après leur message, et avant maintenant', () => {
		const date = new Map(contexte().discussion?.messages.map((m) => [m.id, m.date]));
		const maintenant = contexte().maintenant.toISOString();
		for (const x of [...plan.reactions, ...plan.signalementsMessages]) {
			expect(String(x.created_at) > String(date.get(String(x.message_id)))).toBe(true);
			expect(String(x.created_at) < maintenant).toBe(true);
		}
	});

	it('personne ne réagit à son propre message', () => {
		const auteur = new Map(contexte().discussion?.messages.map((m) => [m.id, m.auteur]));
		for (const r of plan.reactions) expect(r.user_id).not.toBe(auteur.get(String(r.message_id)));
	});

	it('un signalement en attente, un traité par le prof, jamais par son auteur', () => {
		const auteur = new Map(contexte().discussion?.messages.map((m) => [m.id, m.auteur]));
		expect(plan.signalementsMessages.map((s) => s.status).sort()).toEqual(['actioned', 'pending']);
		for (const s of plan.signalementsMessages) {
			expect(s.reported_by).not.toBe(auteur.get(String(s.message_id)));
		}
	});

	it('restrictions : une finie, une en cours, dans la discussion ; une trace par geste', () => {
		const maintenant = contexte().maintenant.toISOString();
		const [finie, enCours] = [...plan.restrictions].sort((a, b) =>
			String(a.expires_at).localeCompare(String(b.expires_at))
		);
		expect(String(finie.expires_at) < maintenant).toBe(true);
		expect(String(enCours.expires_at) > maintenant).toBe(true);
		for (const r of plan.restrictions) {
			expect(r.scope_type).toBe('conversation');
			expect(r.scope_id).toBe(CONVERSATION);
			expect(longueur(r.reason)).toBeGreaterThanOrEqual(5);
		}
		expect(plan.moderation.map((m) => m.action).sort()).toEqual([
			'mute_user',
			'review_report',
			'timeout_user'
		]);
	});
});

describe('planEchanges — tuteur et annonces', () => {
	it('chaque conversation alterne élève et tuteur, avec un niveau d’aide pour le tuteur', () => {
		for (const conv of plan.tuteurConversations) {
			const messages = plan.tuteurMessages.filter((m) => m.conversation_id === conv.id);
			expect(messages.length).toBeGreaterThan(0);
			messages.forEach((m, i) => expect(m.role).toBe(i % 2 === 0 ? 'user' : 'assistant'));
			const niveaux = messages
				.filter((m) => m.role === 'assistant')
				.map((m) => Number(m.help_level));
			expect(conv.max_help_level_reached).toBe(Math.max(...niveaux));
			// Compté par le déclencheur des messages.
			expect(conv.message_count).toBe(0);
		}
	});

	it('annonces du prof à ses classes, lues seulement par leurs élèves', () => {
		const classes = contexte().classes;
		for (const n of plan.notifications) {
			expect(n.created_by).toBe(PROF);
			expect(n.is_system).toBe(false);
			expect(['info', 'alert', 'announcement', 'reminder']).toContain(n.type);
			expect(['normal', 'important', 'urgent']).toContain(n.priority);
			const classe = classes.find((k) => k.id === (n.target_class_ids as string[])[0]);
			for (const l of plan.lecturesNotifications.filter((x) => x.notification_id === n.id)) {
				expect(classe?.eleves).toContain(l.user_id);
			}
		}
	});
});

describe('planEchanges — marché', () => {
	const proprietaire = new Map(
		contexte().mains.flatMap((m) => m.cartes.map((k) => [k.instance, m.eleve] as const))
	);

	it('ouvert pour chaque classe active', () => {
		expect(plan.marcheReglages.map((m) => m.class_id)).toEqual([
			'classe-a',
			'classe-b',
			'classe-c'
		]);
		for (const m of plan.marcheReglages) expect(m.enabled_for_class).toBe(true);
	});

	it('contraintes des annonces : au moins un objet, dates de l’état', () => {
		for (const a of plan.annonces) {
			const objets =
				(a.offered_card_ids as string[]).length +
				(a.wanted_card_template_ids as string[]).length +
				Number(a.offered_gidouilles) +
				Number(a.wanted_gidouilles);
			expect(objets).toBeGreaterThan(0);
			expect(['sell', 'buy']).toContain(a.listing_type);
			for (const k of a.offered_card_ids as string[])
				expect(proprietaire.get(k)).toBe(a.creator_id);
		}
		expect(new Set(plan.annonces.map((a) => a.status))).toEqual(new Set(['active', 'expired']));
	});

	it('propositions : en attente, jamais sur sa propre annonce', () => {
		for (const p of plan.propositions) {
			const annonce = plan.annonces.find((a) => a.id === p.listing_id);
			expect(p.proposer_id).not.toBe(annonce?.creator_id);
			expect(Number(p.offered_gidouilles)).toBeGreaterThan(0);
			// Comme l'appli : une proposition naît en attente ; l'acceptation passe par la fonction.
			expect(p.status).toBe('pending');
		}
	});

	it('une vente conclue par classe, acceptée ensuite au nom du vendeur de l’annonce', () => {
		expect(plan.propositionsAAccepter).toHaveLength(contexte().classes.length);
		for (const { proposition, vendeur } of plan.propositionsAAccepter) {
			const p = plan.propositions.find((x) => x.id === proposition);
			const annonce = plan.annonces.find((a) => a.id === p?.listing_id);
			expect(annonce).toMatchObject({
				status: 'active',
				listing_type: 'sell',
				creator_id: vendeur
			});
		}
		// Aucun échange de marché écrit à la main : la fonction le crée et le conclut.
		expect(plan.echanges.filter((e) => e.trade_type === 'marketplace')).toEqual([]);
	});

	it('échanges : contraintes de la table, un à conclure tout validé et confirmé', () => {
		for (const e of plan.echanges) {
			expect(e.initiator_id).not.toBe(e.partner_id);
			expect(e.trade_type).toBe('friend');
			expect([e.listing_id ?? null, e.proposal_id ?? null]).toEqual([null, null]);
			if (e.status === 'cancelled') expect(e.cancelled_at).not.toBeNull();
			const valide = e.validated_by_initiator === true && e.validated_by_partner === true;
			if (e.validated_at !== null) expect(valide && e.confirmation_started_at !== null).toBe(true);
			const offre = e.current_offer as {
				from_initiator: { cards: string[] };
				from_partner: { cards: string[] };
			};
			for (const k of offre.from_initiator.cards) expect(proprietaire.get(k)).toBe(e.initiator_id);
			for (const k of offre.from_partner.cards) expect(proprietaire.get(k)).toBe(e.partner_id);
		}
		expect(plan.echangesAConclure).toHaveLength(1);
		const aConclure = plan.echanges.find((e) => e.id === plan.echangesAConclure[0].echange);
		expect(aConclure).toMatchObject({
			status: 'negotiating',
			trade_type: 'friend',
			validated_by_initiator: true,
			validated_by_partner: true,
			confirmed_by_initiator: true,
			confirmed_by_partner: true,
			initiator_id: plan.echangesAConclure[0].initiateur
		});
	});

	it('une paire d’amis sans carte libre est sautée : la suivante conclut', () => {
		const c = contexte();
		const [a, b] = c.amis[0];
		c.mains = c.mains.map((m) => (m.eleve === b ? { ...m, cartes: [] } : m));
		const p = planEchanges(c);
		expect(p.echangesAConclure).toHaveLength(1);
		expect(p.echangesAConclure[0].initiateur).toBe(c.amis[1][0]);
		expect(JSON.stringify(p.echanges.filter((e) => e.trade_type === 'friend'))).not.toContain(b);
		expect(p.echangesAConclure[0].initiateur).not.toBe(a);
		// Comme dans la base locale : la seule paire possible ouvre aussi l'échange en cours.
		const enCours = p.echanges.filter((e) => e.id !== p.echangesAConclure[0].echange);
		expect(enCours).toHaveLength(1);
		expect(enCours[0]).toMatchObject({ status: 'negotiating', validated_by_initiator: false });
	});

	it('une carte n’est engagée qu’une fois : annonce active, échange en cours ou à conclure', () => {
		const engagees: string[] = [];
		for (const a of plan.annonces.filter((x) => x.status !== 'expired')) {
			engagees.push(...(a.offered_card_ids as string[]));
		}
		for (const e of plan.echanges.filter((x) => x.status === 'negotiating')) {
			const offre = e.current_offer as {
				from_initiator: { cards: string[] };
				from_partner: { cards: string[] };
			};
			if (e.trade_type === 'friend')
				engagees.push(...offre.from_initiator.cards, ...offre.from_partner.cards);
		}
		expect(new Set(engagees).size).toBe(engagees.length);
	});

	it('chaque carte d’une annonce active ou d’un échange en cours est bloquée à son nom', () => {
		const bloquees = new Map(plan.cartesBloquees.map((b) => [b.card_instance_id, b]));
		for (const a of plan.annonces.filter((x) => x.status === 'active')) {
			for (const k of a.offered_card_ids as string[]) {
				expect(bloquees.get(k)).toMatchObject({
					locked_for: 'listing',
					locked_entity_id: a.id,
					student_id: a.creator_id
				});
			}
		}
		// L'échange entre amis qui négocie encore bloque les deux cartes ; celui à conclure n'en
		// bloque aucune (`execute_trade` les déplace aussitôt).
		const aConclure = new Set(plan.echangesAConclure.map((x) => x.echange));
		const enCours = plan.echanges.filter(
			(x) => x.status === 'negotiating' && !aConclure.has(String(x.id))
		);
		expect(enCours).toHaveLength(1);
		for (const e of plan.echanges) {
			const offre = e.current_offer as {
				from_initiator: { cards: string[] };
				from_partner: { cards: string[] };
			};
			for (const k of [...offre.from_initiator.cards, ...offre.from_partner.cards]) {
				if (aConclure.has(String(e.id))) expect(bloquees.has(k)).toBe(false);
				else expect(bloquees.get(k)).toMatchObject({ locked_for: 'trade', locked_entity_id: e.id });
			}
		}
	});

	it('messages des échanges : de 1 à 1 000 caractères, par un des deux élèves', () => {
		for (const m of plan.discussionsEchange) {
			const e = plan.echanges.find((x) => x.id === m.trade_id);
			expect([e?.initiator_id, e?.partner_id]).toContain(m.sender_id);
			expect(longueur(m.message)).toBeGreaterThan(0);
			expect(longueur(m.message)).toBeLessThanOrEqual(1000);
		}
	});
});

describe('planEchanges — famille', () => {
	it('consentements : en attente, accordés (par la fonction), échus', () => {
		const etats = plan.consentements.map((x) => x.status);
		expect(etats.filter((e) => e === 'pending').length).toBe(4);
		expect(etats.filter((e) => e === 'expired').length).toBe(2);
		const enAttente = new Set(
			plan.consentements.filter((x) => x.status === 'pending').map((x) => x.consent_token)
		);
		expect(plan.consentementsAccordes).toHaveLength(2);
		for (const a of plan.consentementsAccordes) {
			expect(enAttente.has(a.jeton)).toBe(true);
			expect(a.ip).toMatch(/^192\.0\.2\.\d+$/);
		}
		const maintenant = contexte().maintenant.toISOString();
		for (const x of plan.consentements) {
			if (x.status === 'expired') expect(String(x.expires_at) < maintenant).toBe(true);
			else expect(String(x.expires_at) > maintenant).toBe(true);
			expect(Number(x.email_count)).toBeLessThanOrEqual(5);
		}
	});

	it('carnet : activé sur la première classe, adresse absente seulement d’un refus', () => {
		expect(plan.carnetReglages).toEqual([
			expect.objectContaining({ class_id: 'classe-a', enabled: true })
		]);
		const premiere = contexte().classes[0].eleves;
		for (const p of plan.parents) {
			expect(premiere).toContain(p.student_id);
			expect(p.email === null).toBe(p.status === 'refused');
			expect(String(p.email_hash)).toMatch(/^[0-9a-f]{64}$/);
			if (p.confirm_token_hash !== null)
				expect(String(p.confirm_token_hash)).toMatch(/^[0-9a-f]{64}$/);
		}
		// Comme l'appli : l'auteur d'un contact est celui qui a saisi l'adresse.
		for (const p of plan.parents) {
			expect(p.created_by).toBe(p.source === 'student' ? p.student_id : PROF);
		}
		expect(new Set(plan.parents.map((p) => p.source))).toEqual(new Set(['teacher', 'student']));
		expect(new Set(plan.parents.map((p) => p.status))).toEqual(
			new Set(['confirmed', 'pending', 'refused'])
		);
	});

	it('carnet : un lien par parent confirmé, des envois de chaque sorte', () => {
		const confirmes = plan.parents.filter((p) => p.status === 'confirmed').map((p) => p.id);
		expect(plan.liensParents.map((l) => l.contact_id).sort()).toEqual([...confirmes].sort());
		expect(new Set(plan.envoisParents.map((e) => e.kind))).toEqual(
			new Set(['confirmation', 'link', 'exception', 'quarterly'])
		);
		for (const e of plan.envoisParents) {
			if (e.access_token_hash !== null) expect(['exception', 'quarterly']).toContain(e.kind);
			// Non nul en base : vide par défaut.
			expect(Array.isArray(e.reasons)).toBe(true);
			for (const r of e.reasons as string[]) {
				expect(['evaluation_missed', 'reviews_overdue', 'inactivity']).toContain(r);
			}
		}
		expect(plan.retraitsCarnet).toHaveLength(1);
	});

	it('élèves en attente : adresse unique et fictive, pas encore activés', () => {
		expect(plan.enAttente).toHaveLength(3);
		for (const e of plan.enAttente) {
			expect(e.is_activated).toBe(false);
			expect(e.class_ids).toEqual(['classe-a']);
		}
	});
});

describe('planEchanges — cahier de texte, liens, tâches, signalements', () => {
	it('séances un jour de classe, passées ; devoirs non vides, après leur séance', () => {
		const maintenant = contexte().maintenant.toISOString().slice(0, 10);
		for (const s of plan.seances) {
			expect(String(s.entry_date) < maintenant).toBe(true);
			expect([0, 6]).not.toContain(new Date(`${s.entry_date}T12:00:00Z`).getUTCDay());
		}
		for (const d of plan.devoirs) {
			const s = plan.seances.find((x) => x.id === d.entry_id);
			expect(String(d.content).trim()).not.toBe('');
			expect(String(d.due_date) > String(s?.entry_date)).toBe(true);
		}
		expect(plan.devoirs.some((d) => String(d.due_date) > maintenant)).toBe(true);
	});

	it('activités de séance de la bonne forme ; points pris dans ceux de la classe', () => {
		for (const a of plan.activitesSeances) {
			if (a.kind === 'exercise') expect(a.exercise_id).not.toBeNull();
			else expect(a).toMatchObject({ kind: 'course', label: expect.any(String) });
		}
		const points = contexte().points;
		for (const p of plan.pointsSeances) {
			const s = plan.seances.find((x) => x.id === p.entry_id);
			expect(points[String(s?.class_id)]).toContain(p.point_id);
		}
	});

	it('liens de partage : de 16 à 64 caractères, uniques, un lien d’exercice échu', () => {
		const liens = [...plan.liensCours, ...plan.liensCahier, ...plan.liensExercice];
		for (const l of liens) {
			expect(longueur(l.token)).toBeGreaterThanOrEqual(16);
			expect(longueur(l.token)).toBeLessThanOrEqual(64);
		}
		expect(new Set(liens.map((l) => l.token)).size).toBe(liens.length);
		const maintenant = contexte().maintenant.toISOString();
		expect(plan.liensExercice.some((l) => String(l.expires_at) < maintenant)).toBe(true);
	});

	it('tâches : trois colonnes, chaque carte dans une colonne du tableau, étiquettes ≤ 30', () => {
		expect(plan.colonnes).toHaveLength(3);
		const colonnes = new Set(plan.colonnes.map((k) => k.id));
		for (const k of plan.cartesTaches) expect(colonnes.has(k.column_id)).toBe(true);
		for (const e of plan.etiquettes) expect(longueur(e.name)).toBeLessThanOrEqual(30);
	});

	it('signalements de bug : contraintes de la table, sans capture, traités par l’admin', () => {
		for (const b of plan.bugs) {
			expect(longueur(b.title)).toBeGreaterThanOrEqual(5);
			expect(longueur(b.title)).toBeLessThanOrEqual(200);
			expect(longueur(b.description)).toBeGreaterThanOrEqual(20);
			expect(['bug', 'content', 'ux', 'feature', 'other']).toContain(b.category);
			expect(['low', 'medium', 'high', 'critical']).toContain(b.severity);
			expect(b).not.toHaveProperty('screenshot_url');
			expect(b).not.toHaveProperty('screenshot_path');
			if (b.resolved_at !== null) expect(b.resolved_by).toBe(ADMIN);
		}
		expect(plan.bugs.some((b) => b.user_id === PROF)).toBe(true);
	});
});

describe('règles recopiées', () => {
	it('empreinte = sha256 en hexadécimal', () => {
		expect(empreinte('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});

	it('jours de classe : sans samedi ni dimanche, du plus ancien au plus récent', () => {
		const jours = joursDeClasse(Date.parse('2026-11-23T10:00:00Z'), 4, 1);
		expect(jours.map((ms) => new Date(ms).toISOString().slice(0, 10))).toEqual([
			'2026-11-17',
			'2026-11-18',
			'2026-11-19',
			'2026-11-20'
		]);
	});
});

describe('ECRITURE_ECHANGES — où va le plan', () => {
	it('chaque table est inventée ; les réglages copiés sont complétés à part', () => {
		for (const { table } of ECRITURE_ECHANGES) expect(INVENTE, table).toContain(table);
		expect(COPIE).toContain('marketplace_config');
		expect(COPIE).toContain('class_carnet_settings');
	});

	it('une table avant celles qui la désignent', () => {
		const rang = (table: string) => ECRITURE_ECHANGES.findIndex((e) => e.table === table);
		const avant: [string, string][] = [
			['private_messages', 'message_inbox'],
			['private_messages', 'message_drafts'],
			['tutor_conversations', 'tutor_messages'],
			['notifications', 'notification_reads'],
			['marketplace_listings', 'marketplace_proposals'],
			['marketplace_proposals', 'marketplace_trades'],
			['marketplace_trades', 'marketplace_locked_cards'],
			['marketplace_trades', 'marketplace_chat_messages'],
			['parent_contacts', 'parent_carnet_links'],
			['parent_contacts', 'parent_notifications'],
			['class_journal_entries', 'journal_entry_homework'],
			['class_journal_entries', 'journal_entry_points'],
			['class_journal_entries', 'journal_entry_activities'],
			['kanban_boards', 'kanban_columns'],
			['kanban_columns', 'kanban_cards'],
			['kanban_tags', 'kanban_card_tags'],
			['kanban_cards', 'kanban_card_tags']
		];
		for (const [parent, enfant] of avant) expect(rang(parent), enfant).toBeLessThan(rang(enfant));
	});

	it('chaque table écrite est effacée au passage suivant, par préfixe ou avec son parent', () => {
		// Tables filles et la table parente dont la suppression les emporte (clés en cascade).
		const cascade: Record<string, string> = {
			message_inbox: 'private_messages',
			tutor_messages: 'tutor_conversations',
			notification_reads: 'notifications',
			marketplace_proposals: 'marketplace_listings',
			marketplace_chat_messages: 'marketplace_trades',
			parent_carnet_links: 'parent_contacts',
			journal_entry_homework: 'class_journal_entries',
			journal_entry_points: 'class_journal_entries',
			journal_entry_activities: 'class_journal_entries',
			kanban_columns: 'kanban_boards',
			kanban_tags: 'kanban_boards',
			kanban_cards: 'kanban_columns',
			kanban_card_tags: 'kanban_cards',
			// Clé primaire = l'élève : effacée par élève fictif (`index.ts`).
			student_carnet_opt_outs: 'élèves fictifs'
		};
		const efface = (table: string): boolean =>
			NETTOYAGE_ECHANGES.includes(table) ||
			(table in cascade && (cascade[table] === 'élèves fictifs' || efface(cascade[table])));
		for (const { table } of ECRITURE_ECHANGES) expect(efface(table), table).toBe(true);
	});

	it('aucune partie du plan ne met deux fois la même clé unique', () => {
		for (const { partie, unique } of ECRITURE_ECHANGES) {
			if (!unique) continue;
			const cles = plan[partie].map((l) => unique.map((col) => String(l[col])).join('|'));
			expect(new Set(cles).size, partie).toBe(cles.length);
		}
	});

	it('la boîte de réception est remplie ; les tables sans lecteur restent vides', () => {
		expect(INVENTE).toContain('message_inbox');
		for (const table of [
			'terms_acceptances',
			'marketplace_listing_views',
			'message_moderation_logs',
			'marketplace_trade_offers',
			'parent_exception_episodes',
			'kanban_card_assignees'
		]) {
			expect(JAMAIS, table).toContain(table);
		}
	});
});
