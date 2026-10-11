/**
 * Base locale remplie, lot 2 — plan d'activité des élèves fictifs.
 *
 * Fonction pure et déterministe (graine fixe) : elle ne touche ni réseau ni
 * base, `index.ts` insère ce qu'elle rend. Tests :
 * scripts/__tests__/db-seed-activite.test.ts.
 *
 * Cas toujours présents, pour tester l'app : un élève qui a tout maîtrisé, un
 * élève qui n'a rien fait, l'élève hors classe sans aucune activité, une
 * demande d'amitié en attente. L'évaluation est seulement ASSIGNÉE : une copie
 * notée exigerait de reproduire le tirage des questions ; on la passe en local.
 */

export interface Contexte {
	prof: string;
	classes: { id: string; eleves: string[] }[];
	horsClasse: string;
	feuilles: { id: string; exercices: string[] }[];
	evaluation: string | null;
	periode: string | null;
	maintenant: Date;
	graine: number;
}

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function aleatoire(graine: number): () => number {
	let a = graine >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const JOUR = 86_400_000;
const RAISONS = [
	'Participation',
	'Exercice réussi',
	'Entraide',
	'Devoir rendu',
	'Oubli de matériel'
];
const ECHANGES: [qui: 'prof' | 'eleve', texte: string][] = [
	['prof', 'Bonjour à tous ! La feuille sur les fonctions est en ligne.'],
	['eleve', 'Merci ! Pour l’exercice 3, on doit justifier ?'],
	['prof', 'Oui, une phrase suffit.'],
	['eleve', 'Je n’arrive pas à la question 2b…'],
	['eleve', 'Regarde le tableau de valeurs, ça aide.'],
	['prof', 'Bonne idée. Pensez à relire la correction après.'],
	['eleve', 'C’est pour quand, le contrôle ?'],
	['prof', 'Jeudi. Révisez les automatismes !']
];

export function planActivite(c: Contexte) {
	const r = aleatoire(c.graine);
	const uuid = () =>
		'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(r() * 16).toString(16));
	const quand = (joursAvant: number) =>
		new Date(c.maintenant.getTime() - joursAvant * JOUR).toISOString();
	const choisir = <T>(liste: readonly T[]) => liste[Math.floor(r() * liste.length)];

	// --- Feuilles assignées et progression ----------------------------------
	const feuilles = c.feuilles.filter((f) => f.exercices.length > 0).slice(0, 3);
	const assignations = feuilles.map((f, i) => ({
		id: uuid(),
		worksheet_id: f.id,
		status: 'active',
		correction_release_mode: 'immediate',
		individualized: false,
		assigned_at: quand(3 * (i + 1)),
		created_by: c.prof
	}));
	const assignationsClasses = assignations.map((a, i) => ({
		id: uuid(),
		assignment_id: a.id,
		class_id: c.classes[i % c.classes.length].id
	}));

	const premiere = c.classes[0]?.eleves ?? [];
	const etoile = premiere[0];
	const absent = premiere.at(-1);
	const maitriseParCle = new Map<
		string,
		{ id: string; student_id: string; exercise_id: string; status: string }
	>();
	assignations.forEach((a, i) => {
		const classe = c.classes[i % c.classes.length];
		const exercices = feuilles[i].exercices;
		for (const eleveId of classe.eleves) {
			for (const ex of exercices) {
				const tirage = r();
				const status =
					eleveId === etoile
						? 'mastered'
						: eleveId === absent
							? 'not_worked'
							: tirage < 0.5
								? 'mastered'
								: tirage < 0.8
									? 'needs_review'
									: 'not_worked';
				maitriseParCle.set(`${eleveId}|${ex}`, {
					id: uuid(),
					student_id: eleveId,
					exercise_id: ex,
					status
				});
			}
		}
	});
	const maitrise = [...maitriseParCle.values()];

	// --- Gidouilles, bonus, avertissements ------------------------------------
	const gidouilles = c.classes.flatMap((k) =>
		k.eleves.flatMap((eleveId) =>
			Array.from({ length: 3 + Math.floor(r() * 4) }, () => {
				const raison = choisir(RAISONS);
				const delta = (1 + Math.floor(r() * 5)) * (raison === 'Oubli de matériel' ? -1 : 1);
				return {
					id: uuid(),
					student_id: eleveId,
					class_id: k.id,
					delta,
					reason: raison,
					created_by: c.prof,
					created_at: quand(Math.floor(r() * 30))
				};
			})
		)
	);
	const bonus = c.classes
		.filter((k) => k.eleves.length > 0)
		.map((k) => ({
			id: uuid(),
			student_id: choisir(k.eleves),
			class_id: k.id,
			delta: 1 + Math.floor(r() * 2),
			reason: 'Bonus de participation',
			created_by: c.prof,
			created_at: quand(Math.floor(r() * 20))
		}));
	const periode = c.periode;
	const avertissements =
		periode === null
			? []
			: c.classes.slice(0, 3).flatMap((k) =>
					k.eleves.length === 0
						? []
						: [
								{
									id: uuid(),
									student_id: choisir(k.eleves),
									class_id: k.id,
									academic_period_id: periode,
									warning_type: choisir(['C', 'M', 'R', 'T'] as const),
									created_by: c.prof,
									created_at: quand(Math.floor(r() * 15))
								}
							]
				);

	// --- Discussion de la première classe -------------------------------------
	const conversations: {
		id: string;
		name: string;
		is_group: boolean;
		class_id: string;
		created_by: string;
		created_at: string;
		last_message_id: string | null;
		last_message_preview: string | null;
		last_message_at: string | null;
	}[] = [];
	const participants: { id: string; conversation_id: string; user_id: string }[] = [];
	const messages: {
		id: string;
		conversation_id: string;
		sender_id: string;
		content: { type: 'doc'; content: unknown[] };
		plain_text: string;
		created_at: string;
	}[] = [];
	if (c.classes[0] && premiere.length > 0) {
		const conv = {
			id: uuid(),
			name: 'Discussion de classe',
			is_group: true,
			class_id: c.classes[0].id,
			created_by: c.prof,
			created_at: quand(10),
			last_message_id: null as string | null,
			last_message_preview: null as string | null,
			last_message_at: null as string | null
		};
		for (const user of [c.prof, ...premiere]) {
			participants.push({ id: uuid(), conversation_id: conv.id, user_id: user });
		}
		ECHANGES.forEach(([qui, texte], i) => {
			messages.push({
				id: uuid(),
				conversation_id: conv.id,
				sender_id: qui === 'prof' ? c.prof : premiere[i % premiere.length],
				content: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: texte }] }]
				},
				plain_text: texte,
				created_at: quand(9 - i)
			});
		});
		const dernier = messages.at(-1);
		conv.last_message_id = dernier?.id ?? null;
		conv.last_message_preview = dernier?.plain_text ?? null;
		conv.last_message_at = dernier?.created_at ?? null;
		conversations.push(conv);
	}

	// --- Amitiés --------------------------------------------------------------
	const amities: {
		id: string;
		requester_id: string;
		addressee_id: string;
		status: string;
		friendship_type: string;
	}[] = [];
	if (premiere.length >= 3) {
		const paire = (a: string, b: string, status: string) =>
			amities.push({
				id: uuid(),
				requester_id: a,
				addressee_id: b,
				status,
				friendship_type: 'friend'
			});
		paire(premiere[0], premiere[1], 'accepted');
		paire(premiere[2], premiere[0], 'accepted');
		paire(premiere.at(-1) as string, premiere[1], 'pending');
	}

	// --- Évaluation assignée ----------------------------------------------------
	const evaluationsAssignees =
		c.evaluation && c.classes[0]
			? [
					{
						id: uuid(),
						evaluation_id: c.evaluation,
						class_id: c.classes[0].id,
						assigned_by: c.prof,
						assigned_at: quand(2)
					}
				]
			: [];

	return {
		assignations,
		assignationsClasses,
		maitrise,
		gidouilles,
		bonus,
		avertissements,
		conversations,
		participants,
		messages,
		amities,
		evaluationsAssignees
	};
}

export type PlanActivite = ReturnType<typeof planActivite>;
