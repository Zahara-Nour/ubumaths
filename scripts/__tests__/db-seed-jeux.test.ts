/**
 * Base locale remplie, chantier `seed-complet` (PR 3) — jeux et récompenses inventés
 * ==================================================================================
 *
 * `planJeux` fabrique, pour les élèves fictifs, de quoi remplir les pages de jeux et de
 * récompenses : démineur (parties, récompenses, succès, tournoi), 2048, Mathémo, succès,
 * Palotins, cartes VIP. `memoireMathoux` écrit la mémoire des Mathoux avec la vraie règle de
 * l'appli. Gardé ici, sans base :
 * - le plan est reproductible (même graine → même base) ;
 * - chaque ligne respecte les contraintes de la base (celles qui feraient échouer l'insertion) ;
 * - les règles de l'appli sont recopiées fidèlement (points, gain, récompense du jour, seuils
 *   des succès, niveau du Palotin) ;
 * - les nombres racontent la même histoire d'une table à l'autre (Gidouilles = récompenses et
 *   succès, cartes en main = mouvements de cartes) ;
 * - les cas utiles au test sont toujours là : l'étoile, l'absent, l'élève hors classe, la carte
 *   qui attend le prof, les élèves sans Palotin ;
 * - rien n'est inventé hors des élèves fictifs et du prof local.
 */

import { describe, it, expect } from 'vitest';
import { COPIE, INVENTE, JAMAIS } from '../db-seed-riche/regles';
import {
	devinetteInventee,
	ECRITURE_JEUX,
	gainTheorique,
	GRILLES,
	jourParis,
	niveauPalotin,
	planJeux,
	pointsDemineur,
	PREFIXE_JEUX,
	semaine,
	type ContexteJeux
} from '../db-seed-riche/jeux';
import { memoireMathoux } from '../db-seed-riche/mathoux';

const PROF = '11111111-1111-4111-8111-111111111111';
const eleve = (n: number) => `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const HORS_CLASSE = eleve(31);
const ETOILE = eleve(1);
const ABSENT = eleve(6);

function contexte(): ContexteJeux {
	return {
		prof: PROF,
		classes: ['classe-a', 'classe-b', 'classe-c'].map((id, i) => ({
			id,
			eleves: [1, 2, 3, 4, 5, 6].map((k) => eleve(i * 6 + k))
		})),
		horsClasse: HORS_CLASSE,
		maintenant: new Date('2026-11-22T10:00:00Z'),
		graine: 7,
		succes: [
			['2048_10_games', '2048 : 10 parties', 2],
			['2048_50_games', '2048 : 50 parties', 5],
			['2048_first_2048', 'Première tuile 2048', 5],
			['2048_first_4096', 'Première tuile 4096', 10],
			['2048_score_50k', '50 000 points', 3],
			['mathemo_first_win', 'Premier mot trouvé', 2],
			['mathemo_10_games', 'Mathémo : 10 parties', 2],
			['mathemo_50_games', 'Mathémo : 50 parties', 5],
			['mathemo_long_word', 'Mot long', 3],
			['mathemo_first_try', 'Du premier coup', 5],
			['social_first_friend', 'Premier ami', 5],
			['questions_first_answer', 'Première réponse', 2],
			['questions_streak_10', 'Série de 10', 10]
		].map(([id, nom, gidouilles]) => ({
			id: id as string,
			nom: nom as string,
			gidouilles: gidouilles as number,
			points: 10
		})),
		succesDemineur: ['first_victory', 'lightning_speed', 'no_flags', 'perfectionist'],
		tenues: [
			{ id: 'tenue-giron-3', palotin: 'giron', niveau: 3 },
			{ id: 'tenue-pile-5', palotin: 'pile', niveau: 5 },
			{ id: 'tenue-cotice-10', palotin: 'cotice', niveau: 10 }
		],
		cartes: [
			{ id: 'carte-action', utilisations: 1, activable: true },
			{ id: 'carte-simple', utilisations: null, activable: false }
		],
		avecAmis: [eleve(1), eleve(2)],
		avecReponses: [eleve(1), eleve(2), eleve(3), eleve(7)]
	};
}

const plan = planJeux(contexte());
const fictif = (id: unknown) => typeof id === 'string' && id.startsWith('5eed0000-');
const tous = (l: Record<string, unknown>[], col: string) => l.map((x) => x[col] as string);

describe('règles de l’appli recopiées', () => {
	it('points d’une partie gagnée (calculate_minesweeper_points)', () => {
		// 50 × (1 + (1 − 60/120)) × 1 × 1 = 75, + 20 de première victoire du jour
		expect(
			pointsDemineur({
				difficulte: 'beginner',
				secondes: 60,
				indices: 0,
				serie: 0,
				premiereVictoireDuJour: true
			})
		).toBe(95);
		// Plus lent que la référence : pas de bonus de vitesse ; deux indices : × 0,81 ; série de
		// 10 plafonnée à +25 %
		expect(
			pointsDemineur({
				difficulte: 'intermediate',
				secondes: 900,
				indices: 2,
				serie: 10,
				premiereVictoireDuJour: false
			})
		).toBe(Math.floor(200 * 1 * 0.81 * 1.25));
	});

	it('gain théorique (complete_minesweeper_game)', () => {
		// 1 × (1,3 − 0,3 × 90/180) = 1,15
		expect(gainTheorique('beginner', 90, 0)).toBe(1.15);
		// Très lent : multiplicateur plancher 0,7 ; 6 × 0,7 = 4,2
		expect(gainTheorique('expert', 5000, 0)).toBe(4.2);
		// Le pire cas d'un débutant reste au-dessus du plancher 0,30 : 1 × 0,7 × (1 − 0,35) = 0,455
		expect(gainTheorique('beginner', 3000, 3)).toBe(0.46);
		// Temps de référence du cycle : 100 s en terminale au lieu de 180 s de repli
		expect(gainTheorique('beginner', 100, 0, 100)).toBe(1);
		expect(gainTheorique('beginner', 100, 0)).toBe(1.13);
		// Un indice : −10 %
		expect(gainTheorique('intermediate', 600, 1)).toBe(Math.round(3 * 1 * 0.9 * 100) / 100);
	});

	it('niveau d’un Palotin (table de add_buddy_xp)', () => {
		expect(niveauPalotin(0)).toBe(1);
		expect(niveauPalotin(29)).toBe(1);
		expect(niveauPalotin(30)).toBe(2);
		expect(niveauPalotin(5000)).toBe(20);
		expect(niveauPalotin(99_999)).toBe(20);
	});

	it('semaine du lundi au dimanche, jour compté à Paris', () => {
		expect(semaine('2026-11-22')).toEqual({ debut: '2026-11-16', fin: '2026-11-22' });
		expect(semaine('2026-11-23')).toEqual({ debut: '2026-11-23', fin: '2026-11-29' });
		// 23 h 30 UTC le 22 novembre = 0 h 30 le 23 à Paris
		expect(jourParis(Date.parse('2026-11-22T23:30:00Z'))).toBe('2026-11-23');
	});
});

describe('planJeux — reproductible et borné aux élèves fictifs', () => {
	it('même graine, même plan', () => {
		expect(planJeux(contexte())).toEqual(plan);
	});

	it('tout identifiant inventé commence par le préfixe du lot', () => {
		for (const { partie } of ECRITURE_JEUX) {
			for (const l of plan[partie]) {
				if ('id' in l) expect(String(l.id).startsWith(`${PREFIXE_JEUX}-`), partie).toBe(true);
			}
		}
	});

	it('chaque ligne d’élève désigne un élève fictif, jamais l’absent ni l’élève hors classe', () => {
		for (const { partie } of ECRITURE_JEUX) {
			for (const l of plan[partie]) {
				const qui = l.student_id ?? l.user_id;
				if (qui === undefined) continue;
				expect(fictif(qui), partie).toBe(true);
				expect([ABSENT, HORS_CLASSE], partie).not.toContain(qui);
			}
		}
	});

	it('le seul auteur non élève est le prof local', () => {
		expect(tous(plan.tournois, 'creator_id')).toEqual([PROF]);
		for (const k of plan.cartesActivite.filter((x) => x.action === 'gained')) {
			expect((k.metadata as { awarded_by: string }).awarded_by).toBe(PROF);
		}
	});
});

describe('démineur', () => {
	it('chaque partie respecte les contraintes de minesweeper_games', () => {
		expect(plan.parties.length).toBeGreaterThan(100);
		for (const p of plan.parties) {
			const grille = GRILLES[p.difficulty as keyof typeof GRILLES];
			expect(p.mines_count).toBe(grille.mines);
			expect(['won', 'lost']).toContain(p.status);
			expect(p.completed_at).not.toBeNull();
			expect(p.time_seconds as number).toBeGreaterThan(0);
			expect(p.time_seconds as number).toBeLessThanOrEqual(3600);
			expect(p.cells_revealed as number).toBeLessThanOrEqual(grille.cases);
			expect(p.flags_used as number).toBeLessThanOrEqual(grille.mines * 2);
			expect(p.hints_used as number).toBeLessThanOrEqual(3);
			expect(p.gidouilles_awarded as number).toBeLessThanOrEqual(10);
			expect(Date.parse(p.completed_at as string)).toBeLessThanOrEqual(
				Date.parse('2026-11-22T10:00:00Z')
			);
			if (p.status === 'lost') expect(p.points_earned).toBe(0);
			else expect(p.cells_revealed).toBe(grille.cases - grille.mines);
		}
	});

	it('l’étoile a le plus de parties, et des victoires dans les trois difficultés', () => {
		const parEleve = new Map<string, number>();
		for (const p of plan.parties)
			parEleve.set(p.student_id as string, (parEleve.get(p.student_id as string) ?? 0) + 1);
		expect(Math.max(...parEleve.values())).toBe(parEleve.get(ETOILE));
		const gagnees = plan.parties.filter((p) => p.student_id === ETOILE && p.status === 'won');
		expect(new Set(gagnees.map((p) => p.difficulty))).toEqual(
			new Set(['beginner', 'intermediate', 'expert'])
		);
	});

	it('deux parties d’un même élève ne se chevauchent jamais', () => {
		const parEleve = new Map<string, { debut: number; fin: number }[]>();
		for (const p of plan.parties) {
			const liste = parEleve.get(p.student_id as string) ?? [];
			liste.push({
				debut: Date.parse(p.started_at as string),
				fin: Date.parse(p.completed_at as string)
			});
			parEleve.set(p.student_id as string, liste);
		}
		for (const liste of parEleve.values()) {
			liste.sort((a, b) => a.debut - b.debut);
			for (let i = 1; i < liste.length; i++) {
				expect(liste[i].debut).toBeGreaterThanOrEqual(liste[i - 1].fin);
			}
		}
	});

	it('rejouées dans l’ordre, les parties gagnées ont les points et les gains de l’appli', () => {
		const references = { beginner: 100, intermediate: 360, expert: 780 };
		const avecCycle = planJeux({ ...contexte(), references: { [ETOILE]: references } });
		const parties = avecCycle.parties
			.filter((p) => p.student_id === ETOILE)
			.sort((a, b) => Date.parse(a.completed_at as string) - Date.parse(b.completed_at as string));
		let serie = 0;
		const joursUtc = new Set<string>();
		for (const p of parties) {
			if (p.status === 'lost') {
				serie = 0;
				continue;
			}
			const jour = (p.completed_at as string).slice(0, 10);
			expect(p.points_earned).toBe(
				pointsDemineur({
					difficulte: p.difficulty as 'beginner',
					secondes: p.time_seconds as number,
					indices: p.hints_used as number,
					serie,
					premiereVictoireDuJour: !joursUtc.has(jour)
				})
			);
			joursUtc.add(jour);
			serie = Math.min(serie + 1, 10);
			const recompense = avecCycle.recompensesJour.find((k) => k.game_id === p.id);
			expect(recompense?.theoretical_reward).toBe(
				gainTheorique(
					p.difficulty as 'beginner',
					p.time_seconds as number,
					p.hints_used as number,
					references[p.difficulty as 'beginner']
				)
			);
		}
	});

	it('une récompense par partie gagnée, 1 Gidouille à la première victoire du jour seulement', () => {
		const gagnees = plan.parties.filter((p) => p.status === 'won');
		expect(plan.recompensesJour).toHaveLength(gagnees.length);
		const premieres = new Set<string>();
		for (const k of plan.recompensesJour) {
			const partie = gagnees.find((p) => p.id === k.game_id);
			expect(partie).toBeDefined();
			expect(k.actual_reward).toBe(partie?.gidouilles_awarded);
			const cle = `${k.student_id}|${k.game_date}`;
			expect(k.is_first_win_of_day).toBe(!premieres.has(cle));
			expect(k.actual_reward).toBe(k.is_first_win_of_day ? 1 : 0);
			premieres.add(cle);
			expect(k.week_start).toBe(semaine(k.game_date as string).debut);
		}
	});

	it('le meilleur gain de la semaine est bien le plus grand gain de la semaine', () => {
		for (const m of plan.meilleursSemaine) {
			const gains = plan.recompensesJour
				.filter((k) => k.student_id === m.student_id && k.week_start === m.week_start)
				.map((k) => k.theoretical_reward as number);
			expect(m.best_theoretical_reward).toBe(Math.max(...gains));
			expect(m.week_end).toBe(semaine(m.week_start as string).fin);
		}
	});

	it('succès du démineur : une fois par difficulté, sur une partie gagnée qui le mérite', () => {
		expect(plan.succesDemineur.length).toBeGreaterThan(0);
		for (const s of plan.succesDemineur) {
			const partie = plan.parties.find((p) => p.id === s.game_id);
			expect(partie?.status).toBe('won');
			expect(partie?.student_id).toBe(s.student_id);
			if (s.achievement_id === 'first_victory') expect(s.difficulty).toBeNull();
			else expect(s.difficulty).toBe(partie?.difficulty);
			if (s.achievement_id === 'no_flags') expect(partie?.flags_used).toBe(0);
		}
	});

	it('un tournoi en cours pour les deux premières classes, parties numérotées', () => {
		expect(plan.tournois).toHaveLength(1);
		const t = plan.tournois[0];
		expect(t.status).toBe('active');
		expect(Date.parse(t.start_date as string)).toBeLessThan(Date.parse('2026-11-22T10:00:00Z'));
		expect(Date.parse(t.end_date as string)).toBeGreaterThan(Date.parse('2026-11-22T10:00:00Z'));
		expect(tous(plan.tournoiClasses, 'class_id')).toEqual(['classe-a', 'classe-b']);
		for (const p of plan.partiesTournoi) {
			expect(p.seed).toMatch(/^tournament-[a-f0-9-]+-game-[0-9]+$/);
			expect(p.grid_3bv === null).toBe(p.status !== 'won');
			expect(Date.parse(p.started_at as string)).toBeGreaterThanOrEqual(
				Date.parse(t.start_date as string)
			);
		}
		const eleves = new Set(tous(plan.partiesTournoi, 'student_id'));
		expect(eleves.has(eleve(7))).toBe(true);
		expect(eleves.has(eleve(13))).toBe(false);
	});
});

describe('succès, 2048, Mathémo', () => {
	it('chaque succès débloqué suit le seuil de l’appli', () => {
		for (const s of plan.succes) {
			const qui = s.student_id;
			const s2048 = plan.scores2048.find((x) => x.user_id === qui);
			const sMathemo = plan.scoresMathemo.find((x) => x.user_id === qui);
			const id = s.achievement_id as string;
			if (id === '2048_10_games') expect(s2048?.games_played as number).toBeGreaterThanOrEqual(10);
			if (id === '2048_50_games') expect(s2048?.games_played as number).toBeGreaterThanOrEqual(50);
			if (id === '2048_score_50k')
				expect(s2048?.best_score as number).toBeGreaterThanOrEqual(50_000);
			if (id === '2048_first_2048') expect(s2048?.tiles_2048_reached as number).toBeGreaterThan(0);
			if (id === 'mathemo_long_word')
				expect(sMathemo?.best_word_length as number).toBeGreaterThanOrEqual(10);
			if (id === 'mathemo_first_win') expect(sMathemo?.games_won as number).toBeGreaterThan(0);
			if (id === 'social_first_friend') expect([eleve(1), eleve(2)]).toContain(qui);
		}
	});

	it('à l’inverse, un élève qui passe un seuil a son succès', () => {
		for (const x of plan.scores2048.filter((k) => (k.games_played as number) >= 10)) {
			expect(
				plan.succes.some((s) => s.student_id === x.user_id && s.achievement_id === '2048_10_games')
			).toBe(true);
		}
	});

	it('l’étoile a le plus de succès', () => {
		const parEleve = new Map<string, number>();
		for (const s of plan.succes)
			parEleve.set(s.student_id as string, (parEleve.get(s.student_id as string) ?? 0) + 1);
		expect(Math.max(...parEleve.values())).toBe(parEleve.get(ETOILE));
	});

	it('scores : contraintes de la base, parties gagnées ≤ parties jouées', () => {
		for (const x of plan.scoresMathemo) {
			expect(x.games_won as number).toBeLessThanOrEqual(x.games_played as number);
			expect(x.first_try_count as number).toBeLessThanOrEqual(x.games_won as number);
		}
		expect(plan.scores2048.length).toBeGreaterThan(5);
		expect(plan.scoresMathemo.length).toBeGreaterThan(5);
	});
});

describe('Gidouilles : le journal dit la même chose que les récompenses', () => {
	it('une ligne par première victoire du jour et par succès qui rapporte', () => {
		const jour = plan.gidouilles.filter((g) => g.reason === 'daily_game_reward:minesweeper');
		expect(jour).toHaveLength(plan.recompensesJour.filter((k) => k.actual_reward === 1).length);
		const succes = plan.gidouilles.filter((g) => String(g.reason).startsWith('Succès : '));
		const rapportent = plan.succes.filter((s) => (s.gidouilles_awarded as number) > 0);
		expect(succes).toHaveLength(rapportent.length);
		expect(succes.reduce((t, g) => t + (g.delta as number), 0)).toBe(
			rapportent.reduce((t, s) => t + (s.gidouilles_awarded as number), 0)
		);
	});

	it('chaque ligne porte la classe de l’élève', () => {
		const ctx = contexte();
		for (const g of plan.gidouilles) {
			const classe = ctx.classes.find((k) => k.eleves.includes(g.student_id as string));
			expect(g.class_id).toBe(classe?.id);
		}
	});
});

describe('Palotins et cartes VIP', () => {
	it('trois joueurs sans Palotin, jamais l’étoile ; niveau d’après l’expérience', () => {
		const joueurs = contexte()
			.classes.flatMap((k) => k.eleves)
			.filter((e) => e !== ABSENT);
		expect(plan.palotins).toHaveLength(joueurs.length - 3);
		expect(tous(plan.palotins, 'student_id')).toContain(ETOILE);
		for (const p of plan.palotins) {
			expect(p.level).toBe(niveauPalotin(p.xp as number));
			expect(p.longest_streak as number).toBeGreaterThanOrEqual(p.current_streak as number);
			if (p.equipped_skin_id) {
				const tenue = contexte().tenues.find((t) => t.id === p.equipped_skin_id);
				expect(tenue?.palotin).toBe(p.palotin_type);
				expect(tenue?.niveau as number).toBeLessThanOrEqual(p.level as number);
			}
		}
	});

	it('cartes en main = cartes gagnées ; usage et demande d’activation d’accord', () => {
		for (const { student_id, vip_cards } of plan.cartesProfils) {
			const gagnees = plan.cartesActivite.filter(
				(k) => k.student_id === student_id && k.action === 'gained'
			);
			expect(Object.keys(vip_cards).sort()).toEqual(tous(gagnees, 'card_instance_id').sort());
			for (const [instance, carte] of Object.entries(vip_cards)) {
				const utilisee = plan.cartesActivite.some(
					(k) => k.card_instance_id === instance && k.action === 'used'
				);
				expect(carte.usedAt !== null).toBe(utilisee);
				const demandee = plan.cartesActivite.some(
					(k) => k.card_instance_id === instance && k.action === 'requested'
				);
				expect('activationRequestedAt' in carte).toBe(demandee);
			}
		}
	});

	it('une seule demande d’activation, celle de l’étoile, sur une carte activable', () => {
		const demandes = plan.cartesActivite.filter((k) => k.action === 'requested');
		expect(demandes).toHaveLength(1);
		expect(demandes[0].student_id).toBe(ETOILE);
		expect(demandes[0].card_template_id).toBe('carte-action');
	});

	it('sans carte au catalogue, aucune carte', () => {
		const vide = planJeux({ ...contexte(), cartes: [] });
		expect(vide.cartesActivite).toEqual([]);
		expect(vide.cartesProfils).toEqual([]);
	});
});

describe('cas limites', () => {
	it('aucune classe : rien d’inventé, pas de tournoi', () => {
		const vide = planJeux({ ...contexte(), classes: [] });
		for (const { partie } of ECRITURE_JEUX) expect(vide[partie], partie).toEqual([]);
	});

	it('une classe d’un seul élève : il est l’étoile et joue', () => {
		const seul = planJeux({ ...contexte(), classes: [{ id: 'k', eleves: [ETOILE] }] });
		expect(seul.parties.length).toBe(40);
		expect(seul.palotins).toHaveLength(1);
	});
});

describe('devinette inventée', () => {
	it('publiée, au nom du prof local, validée à la main', () => {
		const { devinette, solution } = devinetteInventee(PROF, 2);
		expect(devinette.status).toBe('published');
		expect(devinette.created_by).toBe(PROF);
		expect([1, 2, 3]).toContain(devinette.difficulty);
		expect(devinette.id.startsWith(`${PREFIXE_JEUX}-`)).toBe(true);
		expect(solution.riddle_id).toBe(devinette.id);
		expect(solution.answer).toBeNull();
	});
});

describe('memoireMathoux — la règle de l’appli sur les points acquis', () => {
	const noeuds = [
		{ id: 'b1', kind: 'branch' as const, parentId: null, name: 'Nombres', position: 1 },
		{ id: 'n1', kind: 'notion' as const, parentId: 'b1', name: 'Fractions', position: 1 },
		{ id: 'n2', kind: 'notion' as const, parentId: 'b1', name: 'Décimaux', position: 2 }
	];
	const points = ['p1', 'p2', 'p3'].map((id) => ({
		id,
		nodeId: id === 'p3' ? 'n2' : 'n1',
		grade: '6E',
		regime: 'diversite'
	}));
	const etat = (point_id: string, is_acquired: boolean, total_successes: number) => ({
		point_id,
		is_acquired,
		total_successes,
		distinct_template_successes: is_acquired ? 2 : total_successes > 0 ? 1 : 0,
		last_success_at: total_successes > 0 ? '2026-11-20T10:00:00Z' : null
	});

	it('notion entièrement acquise → grand matou ; jamais réussie → aucune ligne', () => {
		const lignes = memoireMathoux({
			eleve: ETOILE,
			points,
			noeuds,
			etats: [etat('p1', true, 3), etat('p2', true, 2), etat('p3', false, 0)],
			maintenant: new Date('2026-11-22T10:00:00Z')
		});
		expect(lignes).toHaveLength(1);
		expect(lignes[0]).toMatchObject({
			student_id: ETOILE,
			notion_id: 'n1',
			best_stage: 'grand_matou',
			asleep: false
		});
	});

	it('une réussite sans acquisition → chaton', () => {
		const lignes = memoireMathoux({
			eleve: ETOILE,
			points,
			noeuds,
			etats: [etat('p3', false, 1)],
			maintenant: new Date('2026-11-22T10:00:00Z')
		});
		expect(lignes.map((l) => [l.notion_id, l.best_stage])).toEqual([['n2', 'chaton']]);
	});

	it('aucun point travaillable : aucune ligne', () => {
		expect(
			memoireMathoux({ eleve: ETOILE, points: [], noeuds, etats: [], maintenant: new Date() })
		).toEqual([]);
	});
});

describe('ECRITURE_JEUX — où va le plan', () => {
	it('chaque table est inventée, sauf le tournoi, contenu du prof copié et complété', () => {
		const tournoi = ['minesweeper_tournaments', 'minesweeper_tournament_classes'];
		for (const { table } of ECRITURE_JEUX) {
			if (tournoi.includes(table)) expect(COPIE, table).toContain(table);
			else expect(INVENTE, table).toContain(table);
		}
	});

	it('une table avant celles qui la désignent', () => {
		const rang = (table: string) => ECRITURE_JEUX.findIndex((e) => e.table === table);
		expect(rang('minesweeper_games')).toBeLessThan(rang('daily_game_rewards'));
		expect(rang('minesweeper_games')).toBeLessThan(rang('minesweeper_student_achievements'));
		expect(rang('minesweeper_tournaments')).toBeLessThan(rang('minesweeper_tournament_games'));
	});

	it('aucune partie du plan ne met deux fois la même clé unique', () => {
		for (const { partie, unique } of ECRITURE_JEUX) {
			if (!unique) continue;
			const cles = plan[partie].map((l) => unique.map((col) => String(l[col])).join('|'));
			expect(new Set(cles).size, partie).toBe(cles.length);
		}
	});

	it('les tables sans lecteur ou calculées restent vides', () => {
		for (const table of [
			'achievement_events',
			'achievement_progress',
			'daily_summaries',
			'weekly_rewards',
			'game_leaderboards',
			'game_player_achievements',
			'game_challenge_attempts'
		]) {
			expect(JAMAIS, table).toContain(table);
		}
	});
});
