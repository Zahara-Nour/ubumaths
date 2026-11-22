/**
 * Base locale remplie, chantier `seed-complet`, PR 3 — jeux et récompenses des élèves fictifs.
 *
 * Fonction pure et déterministe (graine fixe), comme `suivi.ts` : elle ne touche ni réseau ni
 * base, `index.ts` insère ce qu'elle rend. Tests : scripts/__tests__/db-seed-jeux.test.ts.
 * Phase 0 validée par David le 2026-11-22 (docs/wip/seed-complet-progress.md § 9).
 *
 * Ce qu'elle invente : parties de démineur (et ce qui en découle : récompense du jour, meilleur
 * gain de la semaine, succès du démineur, Gidouilles), un tournoi en cours, scores de 2048 et de
 * Mathémo, succès débloqués, Palotins, cartes VIP (dont une demande d'activation en attente).
 *
 * Mêmes règles que l'appli, recopiées et testées :
 * - points d'une partie gagnée : `calculate_minesweeper_points` ;
 * - gain théorique et récompense du jour : `complete_minesweeper_game` et `record_game_reward`
 *   (1 Gidouille à la première victoire du jour, par jeu) ; temps de référence du cycle de
 *   l'élève (`get_minesweeper_reference_time`, lus par `index.ts`), sinon ceux de repli de la
 *   fonction ; jour et semaine comptés à Paris, du lundi au dimanche (l'école copiée) ;
 * - succès de 2048 et de Mathémo : seuils des routes `api/games/{2048,mathemo}/scores` ;
 * - niveau d'un Palotin : table d'expérience de `add_buddy_xp`.
 *
 * Cas toujours présents : l'élève « étoile » (le premier de la première classe) a le plus de
 * parties, de succès et de cartes, et une demande d'activation de carte attend le prof ; l'élève
 * « absent » (le dernier de la première classe) et l'élève hors classe n'ont rien ; trois élèves
 * n'ont pas encore choisi de Palotin.
 *
 * Pas de récompense du jour pour 2048 ni Mathémo : la base n'en garde qu'une ligne de totaux par
 * élève, sans partie à laquelle la rattacher.
 *
 * Jamais écrit ici : le journal des récompenses (`reward_events`, rempli par les déclencheurs de
 * `gidouilles_activity`, `student_achievements` et `vip_cards_activity`), le score d'une partie de
 * tournoi (calculé en base par `calculate_tournament_score`, cf. `index.ts`), les Mathoux
 * (`./mathoux.ts`, la vraie règle de l'appli sur les points acquis).
 */

/** Début de tous les identifiants inventés ici : le seed les retrouve pour les effacer. */
export const PREFIXE_JEUX = '5eed5c02';

export interface ContexteJeux {
	prof: string;
	/** Classes actives, les plus remplies d'abord (comme `suivi.ts`). */
	classes: { id: string; eleves: string[] }[];
	horsClasse: string;
	maintenant: Date;
	graine: number;
	/**
	 * Temps de référence du démineur (s) par élève, ceux de son cycle. Un élève absent prend les
	 * temps de repli, comme la fonction quand son cycle est inconnu.
	 */
	references?: Record<string, Record<Difficulte, number>>;
	/** Succès actifs (`achievements`). */
	succes: { id: string; nom: string; gidouilles: number; points: number }[];
	/** Succès du démineur existants (`minesweeper_achievements.id`). */
	succesDemineur: string[];
	/** Tenues de Palotin débloquées par niveau (`buddy_skins`, `unlock_method = 'level'`). */
	tenues: { id: string; palotin: string; niveau: number }[];
	/** Cartes VIP activées (`vip_card_templates`) ; `activable` : la carte a une action. */
	cartes: { id: string; utilisations: number | null; activable: boolean }[];
	/** Élèves qui ont une amitié acceptée (succès « premier ami »). */
	avecAmis: string[];
	/** Élèves qui ont répondu à au moins une question (succès « première réponse »). */
	avecReponses: string[];
}

type Lignes = Record<string, unknown>[];
export type Difficulte = 'beginner' | 'intermediate' | 'expert';

const JOUR = 86_400_000;
const SECONDE = 1000;
const HEURE = 3_600_000;
const JOURS_DE_JEU = 28;

/** Grille de chaque difficulté (contraintes de `minesweeper_games`). */
export const GRILLES: Record<Difficulte, { mines: number; cases: number }> = {
	beginner: { mines: 10, cases: 81 },
	intermediate: { mines: 40, cases: 256 },
	expert: { mines: 99, cases: 480 }
};

/** `calculate_minesweeper_points` : points de base et temps de référence (s). */
const POINTS: Record<Difficulte, { base: number; reference: number }> = {
	beginner: { base: 50, reference: 120 },
	intermediate: { base: 200, reference: 600 },
	expert: { base: 500, reference: 1200 }
};

/** `complete_minesweeper_game` : gain de base et temps de référence de repli (s). */
const GAIN: Record<Difficulte, { base: number; reference: number }> = {
	beginner: { base: 1, reference: 180 },
	intermediate: { base: 3, reference: 600 },
	expert: { base: 6, reference: 1200 }
};
const PENALITES_INDICE = [0, 0.1, 0.22, 0.35];

/** Seuils du succès « éclair » (`minesweeper_achievements.lightning_speed`). */
const ECLAIR: Record<Difficulte, number> = { beginner: 60, intermediate: 180, expert: 300 };

/** `add_buddy_xp` : expérience minimale de chaque niveau, du niveau 1 au niveau 20. */
export const PALIERS_XP = [
	0, 30, 70, 120, 180, 260, 360, 480, 620, 780, 960, 1160, 1400, 1680, 2000, 2400, 2900, 3500, 4200,
	5000
];
const PALOTINS = ['giron', 'pile', 'cotice'] as const;

const DEVINETTE_ID = `${PREFIXE_JEUX}-0000-4000-8000-00000000d001`;

/**
 * Une devinette PUBLIÉE au nom du prof local : la prod n'en a qu'une, en brouillon (tranché le
 * 2026-11-22). Validation à la main (`answer` nul) : les réponses inventées par `suivi.ts`
 * attendent le prof ou ont été jugées par lui.
 */
export function devinetteInventee(prof: string, numero: number) {
	return {
		devinette: {
			id: DEVINETTE_ID,
			riddle_number: numero,
			title: 'Les trois chats de la chatterie',
			genre: 'Logique',
			difficulty: 2,
			statement:
				'Trois chats se partagent 18 croquettes. Le premier en mange deux fois plus que le deuxième, et le troisième autant que les deux autres réunis. Combien de croquettes mange chaque chat ?',
			image_url: null,
			created_by: prof,
			status: 'published'
		},
		solution: {
			riddle_id: DEVINETTE_ID,
			answer: null,
			correction:
				'Si le deuxième mange $x$ croquettes, le premier en mange $2x$ et le troisième $3x$ : $6x = 18$, donc $x = 3$. Les chats mangent 6, 3 et 9 croquettes.'
		}
	};
}

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

/** Date du jour à Paris (AAAA-MM-JJ) : l'école compte ses jours dans son fuseau. */
export function jourParis(ms: number): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(ms));
}

/** Lundi et dimanche de la semaine d'un jour (`calculate_week_boundaries`, premier jour = lundi). */
export function semaine(jour: string): { debut: string; fin: string } {
	const d = new Date(`${jour}T00:00:00Z`);
	const decalage = (d.getUTCDay() + 6) % 7;
	const debut = new Date(d.getTime() - decalage * JOUR);
	const fin = new Date(debut.getTime() + 6 * JOUR);
	return { debut: debut.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) };
}

/**
 * Arrondi au centième comme `ROUND(x, 2)` sur un `numeric` Postgres (décimal exact, demi vers le
 * haut) : en flottant, 0,7 × 0,65 vaut 0,45499999… et s'arrondirait à 0,45 au lieu de 0,46. On
 * retire d'abord le bruit du flottant (dix décimales).
 */
function centiemes(x: number): number {
	return Math.round(Number(x.toFixed(10)) * 100) / 100;
}

/** Points d'une partie gagnée (`calculate_minesweeper_points`). */
export function pointsDemineur(p: {
	difficulte: Difficulte;
	secondes: number;
	indices: number;
	serie: number;
	premiereVictoireDuJour: boolean;
}): number {
	const { base, reference } = POINTS[p.difficulte];
	const vitesse = Math.max(0, 1 - p.secondes / reference);
	const indices = 0.9 ** p.indices;
	const serie = 1 + Math.min(0.25, p.serie * 0.05);
	return Math.floor(base * (1 + vitesse) * indices * serie) + (p.premiereVictoireDuJour ? 20 : 0);
}

/**
 * Gain théorique d'une partie gagnée (`complete_minesweeper_game`) ; sans temps de référence, celui
 * de repli de la fonction.
 */
export function gainTheorique(
	difficulte: Difficulte,
	secondes: number,
	indices: number,
	reference: number = GAIN[difficulte].reference
): number {
	const { base } = GAIN[difficulte];
	const multiplicateur = centiemes(Math.max(0.7, 1.3 - 0.3 * (secondes / reference)));
	const penalite = Math.min(0.5, PENALITES_INDICE[Math.min(indices, 3)]);
	const brut = base * multiplicateur * (1 - penalite);
	return centiemes(Math.min(8, Math.max(0.3, brut)));
}

/** Niveau d'un Palotin pour une expérience donnée (`add_buddy_xp`). */
export function niveauPalotin(xp: number): number {
	let niveau = 1;
	for (let i = 0; i < PALIERS_XP.length; i++) if (xp >= PALIERS_XP[i]) niveau = i + 1;
	return niveau;
}

export function planJeux(c: ContexteJeux) {
	const r = aleatoire(c.graine);
	const uuid = () =>
		`${PREFIXE_JEUX}-xxxx-4xxx-8xxx-xxxxxxxxxxxx`.replace(/x/g, () =>
			Math.floor(r() * 16).toString(16)
		);
	const entier = (min: number, max: number) => min + Math.floor(r() * (max - min + 1));
	const choisir = <T>(liste: readonly T[]) => liste[Math.floor(r() * liste.length)];
	const iso = (ms: number) => new Date(ms).toISOString();
	const t0 = c.maintenant.getTime();

	const premiere = c.classes[0]?.eleves ?? [];
	const etoile = premiere[0];
	const absent = premiere.length > 1 ? premiere.at(-1) : undefined;
	const classeDe = new Map<string, string>();
	for (const k of c.classes) for (const e of k.eleves) classeDe.set(e, k.id);
	const joueurs = c.classes.flatMap((k) => k.eleves).filter((e) => e !== absent);

	const gidouilles: Lignes = [];
	const crediter = (eleve: string, delta: number, raison: string, quand: number) =>
		gidouilles.push({
			id: uuid(),
			student_id: eleve,
			class_id: classeDe.get(eleve) ?? null,
			delta,
			reason: raison,
			created_by: null,
			created_at: iso(quand)
		});

	// --- Démineur ---------------------------------------------------------------------------------
	const parties: Lignes = [];
	const recompensesJour: Lignes = [];
	const meilleursSemaine = new Map<string, Record<string, unknown>>();
	const succesDemineur: Lignes = [];
	const succesDemineurConnus = new Set(c.succesDemineur);

	for (const eleve of joueurs) {
		const estEtoile = eleve === etoile;
		const nb = estEtoile ? 40 : entier(10, 30);
		// Débuts de partie, du plus ancien au plus récent : la série et la première victoire du jour
		// se lisent dans l'ordre où l'élève a joué. Une heure différente pour chacune, au moins une heure
		// avant maintenant : une partie dure moins d'une heure, deux parties ne se chevauchent donc
		// jamais et l'ordre des débuts est celui des fins.
		const heures = new Set<number>();
		while (heures.size < nb) heures.add(entier(1, JOURS_DE_JEU * 24 - 1));
		const debuts = [...heures].map((h) => t0 - h * HEURE).sort((a, b) => a - b);
		let serie = 0;
		const joursGagnes = new Set<string>();
		const joursGagnesUtc = new Set<string>();
		const debloques = new Set<string>();

		for (const debut of debuts) {
			const tirage = r();
			const difficulte: Difficulte = estEtoile
				? tirage < 0.4
					? 'beginner'
					: tirage < 0.8
						? 'intermediate'
						: 'expert'
				: tirage < 0.65
					? 'beginner'
					: tirage < 0.92
						? 'intermediate'
						: 'expert';
			const { mines, cases } = GRILLES[difficulte];
			const chance = { beginner: 0.7, intermediate: 0.5, expert: 0.3 }[difficulte];
			const gagnee = r() < chance + (estEtoile ? 0.2 : 0);
			const plage = {
				beginner: [35, 240],
				intermediate: [160, 900],
				expert: [420, 1800]
			}[difficulte];
			const secondes = gagnee ? entier(plage[0], plage[1]) : entier(8, plage[1]);
			const indices = r() < 0.15 ? entier(1, 3) : 0;
			const drapeaux = gagnee && r() < 0.2 ? 0 : entier(0, mines);
			const fin = debut + secondes * SECONDE;
			const id = uuid();
			let points = 0;
			let recompense = 0;
			if (gagnee) {
				const jour = jourParis(fin);
				const jourUtc = iso(fin).slice(0, 10);
				const premiereDuJour = !joursGagnes.has(jour);
				points = pointsDemineur({
					difficulte,
					secondes,
					indices,
					serie,
					premiereVictoireDuJour: !joursGagnesUtc.has(jourUtc)
				});
				joursGagnes.add(jour);
				joursGagnesUtc.add(jourUtc);
				const theorique = gainTheorique(
					difficulte,
					secondes,
					indices,
					c.references?.[eleve]?.[difficulte]
				);
				recompense = premiereDuJour ? 1 : 0;
				const { debut: lundi, fin: dimanche } = semaine(jour);
				recompensesJour.push({
					id: uuid(),
					student_id: eleve,
					game_date: jour,
					game_type: 'minesweeper',
					game_id: id,
					theoretical_reward: theorique,
					actual_reward: recompense,
					is_first_win_of_day: premiereDuJour,
					week_start: lundi,
					created_at: iso(fin)
				});
				const cle = `${eleve}|${lundi}`;
				const meilleur = meilleursSemaine.get(cle);
				if (!meilleur || theorique > (meilleur.best_theoretical_reward as number)) {
					meilleursSemaine.set(cle, {
						id: (meilleur?.id as string) ?? uuid(),
						student_id: eleve,
						week_start: lundi,
						week_end: dimanche,
						best_theoretical_reward: theorique,
						best_reward_game_type: 'minesweeper',
						best_reward_game_id: id,
						created_at: (meilleur?.created_at as string) ?? iso(fin),
						updated_at: iso(fin)
					});
				}
				if (premiereDuJour) crediter(eleve, 1, 'daily_game_reward:minesweeper', fin);

				// Succès du démineur que cette partie débloque (une fois par difficulté, sauf le premier).
				const gagnes: [id: string, difficulte: Difficulte | null][] = [
					['first_victory', null],
					['perfectionist', difficulte]
				];
				if (secondes < ECLAIR[difficulte]) gagnes.push(['lightning_speed', difficulte]);
				if (drapeaux === 0) gagnes.push(['no_flags', difficulte]);
				for (const [succes, niveau] of gagnes) {
					const cleSucces = `${succes}|${niveau ?? ''}`;
					if (!succesDemineurConnus.has(succes) || debloques.has(cleSucces)) continue;
					debloques.add(cleSucces);
					succesDemineur.push({
						id: uuid(),
						student_id: eleve,
						achievement_id: succes,
						difficulty: niveau,
						unlocked_at: iso(fin),
						game_id: id
					});
				}
				serie = Math.min(serie + 1, 10);
			} else {
				serie = 0;
			}
			parties.push({
				id,
				student_id: eleve,
				difficulty: difficulte,
				status: gagnee ? 'won' : 'lost',
				grid_state: {},
				time_seconds: secondes,
				mines_count: mines,
				flags_used: drapeaux,
				// Une partie gagnée a ouvert toutes les cases sans mine ; une perdue, une partie d'entre elles.
				cells_revealed: gagnee ? cases - mines : entier(1, cases - mines - 1),
				gidouilles_awarded: recompense,
				points_earned: points,
				hints_used: indices,
				created_at: iso(debut),
				started_at: iso(debut),
				completed_at: iso(fin)
			});
		}
	}

	// --- Tournoi en cours, pour les deux premières classes -------------------------------------------
	const tournoiId = `${PREFIXE_JEUX}-0000-4000-8000-00000000a001`;
	const classesTournoi = c.classes.slice(0, 2);
	const tournois: Lignes =
		classesTournoi.length > 0
			? [
					{
						id: tournoiId,
						creator_id: c.prof,
						creator_role: 'teacher',
						scope: 'classes',
						name: 'Tournoi de démineur de novembre',
						description: 'Trois meilleures parties en débutant. Le podium gagne des Gidouilles.',
						difficulty: 'beginner',
						start_date: iso(t0 - 10 * JOUR),
						end_date: iso(t0 + 5 * JOUR),
						top_x_games: 3,
						podium_places: 3,
						status: 'active',
						created_at: iso(t0 - 12 * JOUR),
						updated_at: iso(t0 - 12 * JOUR)
					}
				]
			: [];
	const tournoiClasses: Lignes = classesTournoi.map((k) => ({
		tournament_id: tournoiId,
		class_id: k.id
	}));
	const partiesTournoi: Lignes = [];
	for (const k of classesTournoi) {
		for (const eleve of k.eleves.filter((e) => e !== absent)) {
			const nb = eleve === etoile ? 6 : entier(1, 5);
			for (let n = 1; n <= nb; n++) {
				const debut = t0 - (10 - n) * JOUR + entier(0, 6 * 60) * 60 * SECONDE;
				const gagnee = r() < (eleve === etoile ? 0.9 : 0.65);
				const secondes = gagnee ? entier(30, 200) : entier(8, 120);
				partiesTournoi.push({
					id: uuid(),
					tournament_id: tournoiId,
					student_id: eleve,
					game_number: n,
					seed: `tournament-${tournoiId}-game-${n}`,
					status: gagnee ? 'won' : 'lost',
					time_seconds: secondes,
					grid_state: null,
					started_at: iso(debut),
					completed_at: iso(debut + secondes * SECONDE),
					// Difficulté de la grille (3BV) d'une grille débutant ; le score se calcule en base.
					grid_3bv: gagnee ? entier(12, 40) : null,
					score: null
				});
			}
		}
	}

	// --- 2048 et Mathémo : deux élèves sur trois y ont joué -----------------------------------------
	const scores2048: Lignes = [];
	const scoresMathemo: Lignes = [];
	const stats2048 = new Map<
		string,
		{ joue: number; meilleur: number; a2048: boolean; a4096: boolean }
	>();
	const statsMathemo = new Map<
		string,
		{ joue: number; gagne: number; mot: number; premierCoup: number }
	>();
	for (const [i, eleve] of joueurs.entries()) {
		if (eleve === etoile || i % 3 !== 2) {
			const joue = eleve === etoile ? 64 : entier(3, 45);
			const meilleur = eleve === etoile ? 61_480 : Math.round((800 + r() ** 2 * 40_000) / 4) * 4;
			const tuiles2048 = meilleur >= 20_000 ? entier(1, 3) : 0;
			const tuiles4096 = meilleur >= 50_000 ? 1 : 0;
			const quand = iso(t0 - entier(0, JOURS_DE_JEU) * JOUR);
			scores2048.push({
				id: uuid(),
				user_id: eleve,
				best_score: meilleur,
				games_played: joue,
				tiles_2048_reached: tuiles2048,
				tiles_4096_reached: tuiles4096,
				created_at: iso(t0 - JOURS_DE_JEU * JOUR),
				updated_at: quand
			});
			stats2048.set(eleve, {
				joue,
				meilleur,
				a2048: tuiles2048 > 0,
				a4096: tuiles4096 > 0
			});
		}
		if (eleve === etoile || i % 3 !== 1) {
			const joue = eleve === etoile ? 52 : entier(2, 40);
			const gagne = Math.min(joue, Math.round(joue * (0.4 + r() * 0.5)));
			const mot = eleve === etoile ? 10 : entier(4, 9);
			const premierCoup = gagne > 3 && r() < 0.5 ? entier(1, 2) : 0;
			scoresMathemo.push({
				id: uuid(),
				user_id: eleve,
				games_played: joue,
				games_won: gagne,
				best_word_length: mot,
				first_try_count: premierCoup,
				total_score: gagne * entier(10, 30),
				created_at: iso(t0 - JOURS_DE_JEU * JOUR),
				updated_at: iso(t0 - entier(0, JOURS_DE_JEU) * JOUR)
			});
			statsMathemo.set(eleve, { joue, gagne, mot, premierCoup });
		}
	}

	// --- Succès : les seuils de l'appli, sur l'activité inventée -------------------------------------
	const succesParId = new Map(c.succes.map((s) => [s.id, s]));
	const succes: Lignes = [];
	const amis = new Set(c.avecAmis);
	const reponses = new Set(c.avecReponses);
	for (const eleve of joueurs) {
		const s2048 = stats2048.get(eleve);
		const sMathemo = statsMathemo.get(eleve);
		const gagnes: [id: string, ok: boolean][] = [
			['2048_first_2048', !!s2048?.a2048],
			['2048_first_4096', !!s2048?.a4096],
			['2048_10_games', (s2048?.joue ?? 0) >= 10],
			['2048_50_games', (s2048?.joue ?? 0) >= 50],
			['2048_score_50k', (s2048?.meilleur ?? 0) >= 50_000],
			['mathemo_first_win', (sMathemo?.gagne ?? 0) >= 1],
			['mathemo_10_games', (sMathemo?.joue ?? 0) >= 10],
			['mathemo_50_games', (sMathemo?.joue ?? 0) >= 50],
			['mathemo_long_word', (sMathemo?.mot ?? 0) >= 10],
			['mathemo_first_try', (sMathemo?.premierCoup ?? 0) >= 1],
			['social_first_friend', amis.has(eleve)],
			['questions_first_answer', reponses.has(eleve)],
			['questions_streak_10', eleve === etoile && reponses.has(eleve)]
		];
		for (const [id, ok] of gagnes) {
			const s = succesParId.get(id);
			if (!ok || !s) continue;
			const quand = t0 - entier(0, JOURS_DE_JEU - 1) * JOUR - entier(1, 600) * 60 * SECONDE;
			succes.push({
				id: uuid(),
				student_id: eleve,
				achievement_id: id,
				context_data: {},
				unlocked_at: iso(quand),
				points_awarded: s.points,
				gidouilles_awarded: s.gidouilles
			});
			// Même libellé que l'appli (`creditAchievementGidouilles`).
			if (s.gidouilles > 0) crediter(eleve, s.gidouilles, `Succès : ${s.nom}`, quand);
		}
	}

	// --- Palotins : tous les joueurs sauf trois ------------------------------------------------------
	const sansPalotin = new Set(joueurs.filter((e) => e !== etoile).slice(-3));
	const palotins: Lignes = [];
	for (const eleve of joueurs) {
		if (sansPalotin.has(eleve)) continue;
		const type = choisir(PALOTINS);
		const xp = eleve === etoile ? 2_150 : Math.floor(r() ** 1.5 * 1_800);
		const niveau = niveauPalotin(xp);
		const tenues = c.tenues.filter((t) => t.palotin === type && t.niveau <= niveau);
		const serie = entier(0, 6);
		palotins.push({
			student_id: eleve,
			palotin_type: type,
			xp,
			level: niveau,
			current_streak: serie,
			longest_streak: serie + entier(0, 8),
			last_activity_date: jourParis(t0 - entier(0, 3) * JOUR),
			xp_earned_today: 0,
			last_xp_date: jourParis(t0 - entier(1, 3) * JOUR),
			change_count: r() < 0.2 ? 1 : 0,
			equipped_skin_id: tenues.length > 0 && r() < 0.6 ? choisir(tenues).id : null,
			created_at: iso(t0 - entier(20, 60) * JOUR)
		});
	}

	// --- Cartes VIP : offertes par le prof, quelques-unes utilisées ----------------------------------
	const cartesActivite: Lignes = [];
	const cartesProfils: {
		student_id: string;
		vip_cards: Record<string, Record<string, unknown>>;
	}[] = [];
	const activables = c.cartes.filter((k) => k.activable);
	if (c.cartes.length > 0) {
		for (const eleve of joueurs) {
			const nb = eleve === etoile ? 4 : entier(1, 3);
			const main: Record<string, Record<string, unknown>> = {};
			for (let n = 0; n < nb; n++) {
				// L'étoile a toujours une carte activable : sa demande d'activation attend le prof.
				const demande = eleve === etoile && n === 0 && activables.length > 0;
				const carte = demande ? choisir(activables) : choisir(c.cartes);
				const instance = uuid();
				const gagneeLe = t0 - entier(3, JOURS_DE_JEU) * JOUR - entier(0, 600) * 60 * SECONDE;
				const donnees: Record<string, unknown> = {
					cardId: carte.id,
					earnedAt: iso(gagneeLe),
					usedAt: null,
					acquiredFrom: 'teacher_award',
					usesRemaining: carte.utilisations
				};
				cartesActivite.push({
					id: uuid(),
					student_id: eleve,
					card_instance_id: instance,
					card_template_id: carte.id,
					action: 'gained',
					metadata: { acquired_from: 'teacher_award', awarded_by: c.prof },
					created_at: iso(gagneeLe)
				});
				if (demande) {
					const demandeeLe = t0 - entier(1, 2) * JOUR;
					donnees.activationRequestedAt = iso(demandeeLe);
					donnees.activationRequestedBy = eleve;
					cartesActivite.push({
						id: uuid(),
						student_id: eleve,
						card_instance_id: instance,
						card_template_id: carte.id,
						action: 'requested',
						metadata: {},
						created_at: iso(demandeeLe)
					});
				} else if (r() < 0.25) {
					const utiliseeLe = gagneeLe + entier(1, 2) * JOUR;
					donnees.usedAt = iso(utiliseeLe);
					donnees.usesRemaining = 0;
					cartesActivite.push({
						id: uuid(),
						student_id: eleve,
						card_instance_id: instance,
						card_template_id: carte.id,
						action: 'used',
						metadata: { usesRemaining: 0 },
						created_at: iso(utiliseeLe)
					});
				}
				main[instance] = donnees;
			}
			cartesProfils.push({ student_id: eleve, vip_cards: main });
		}
	}

	return {
		parties,
		recompensesJour,
		meilleursSemaine: [...meilleursSemaine.values()],
		succesDemineur,
		tournois,
		tournoiClasses,
		partiesTournoi,
		scores2048,
		scoresMathemo,
		succes,
		palotins,
		cartesActivite,
		gidouilles,
		/** Cartes en main de chaque élève (`profiles.vip_cards`), écrites par mise à jour du profil. */
		cartesProfils
	};
}

export type PlanJeux = ReturnType<typeof planJeux>;

/**
 * Où va chaque partie du plan, dans l'ordre d'écriture (une table avant celles qui la désignent).
 * `cartesProfils` n'y est pas : c'est une mise à jour de `profiles`.
 */
export const ECRITURE_JEUX: readonly {
	partie: Exclude<keyof PlanJeux, 'cartesProfils'>;
	table: string;
	/** Colonnes d'une clé unique de la table (hors `id`) : le plan n'y met jamais deux fois la même. */
	unique?: readonly string[];
}[] = [
	{ partie: 'parties', table: 'minesweeper_games' },
	{
		partie: 'recompensesJour',
		table: 'daily_game_rewards',
		unique: ['student_id', 'game_type', 'game_id']
	},
	{
		partie: 'meilleursSemaine',
		table: 'weekly_best_rewards',
		unique: ['student_id', 'week_start', 'best_reward_game_type']
	},
	{
		partie: 'succesDemineur',
		table: 'minesweeper_student_achievements',
		unique: ['student_id', 'achievement_id', 'difficulty']
	},
	{ partie: 'tournois', table: 'minesweeper_tournaments' },
	{ partie: 'tournoiClasses', table: 'minesweeper_tournament_classes', unique: ['class_id'] },
	{
		partie: 'partiesTournoi',
		table: 'minesweeper_tournament_games',
		unique: ['tournament_id', 'student_id', 'game_number']
	},
	{ partie: 'scores2048', table: 'game_2048_scores', unique: ['user_id'] },
	{ partie: 'scoresMathemo', table: 'mathemo_scores', unique: ['user_id'] },
	{ partie: 'succes', table: 'student_achievements', unique: ['student_id', 'achievement_id'] },
	{ partie: 'palotins', table: 'student_buddies', unique: ['student_id'] },
	{ partie: 'cartesActivite', table: 'vip_cards_activity' },
	{ partie: 'gidouilles', table: 'gidouilles_activity' }
];
