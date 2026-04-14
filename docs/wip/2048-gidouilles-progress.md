# 2048 Gidouilles - Document de progression

## Etat actuel : TERMINE (phases 1-5)

## Decisions prises

- Daily cap passe de global a **par jeu** (1g/jour par game_type)
- Score min 2048 : **1000 points** pour etre eligible
- Interpolation lineaire entre breakpoints : 1000→0.5g, 5000→1.5g, 10000→3.0g, 20000→5.0g, 50000+→8.0g
- Pas de multiplicateur temps ni penalite hints (contrairement au demineur)
- Weekly bonus reste global (meilleur theorique tous jeux confondus)
- Milestones via game_achievements : 2048(5g), 4096(10g), 10 parties(2g), 50 parties(5g), score 50k(3g)
- UUID genere par soumission comme game_id pour record_game_reward

## Fichiers modifies/crees

### Phase 1 - Migration SQL

- `supabase/migrations/20260414120000_add_2048_gidouilles_per_game_daily_cap.sql`
  - CHECK constraints mis a jour pour inclure '2048'
  - `record_game_reward()` : accepte '2048' + daily cap per game_type
  - Index partiel mis a jour avec game_type
  - `award_weekly_best_bonuses()` : notification generique "Jeux" au lieu de "Demineur"
  - 5 achievements 2048 inseres dans game_achievements

### Phase 2 - Calcul reward + tests

- `src/lib/server/games/reward-2048.ts` - Fonction d'interpolation lineaire (6 tests OK)
- `src/lib/server/games/reward-2048.test.ts` - Tests unitaires
- `src/lib/server/validation/games.ts` - Schemas Zod : reward2048Schema, milestone2048Schema, submit2048ScoreWithRewardResponseSchema

### Phase 3 - Endpoint API

- `src/routes/api/games/2048/scores/+server.ts`
  - POST handler enrichi : calcul reward theorique, appel record_game_reward RPC, milestones check
  - Utilise calculate2048TheoreticalReward() pour le score theorique
  - Recupere school_id via class_members + classes join
  - Genere UUID par soumission comme game_id
  - Check et award milestones via game_achievements + student_achievements
  - Credit gidouilles milestones via update_student_gidouilles RPC
  - Reponse enrichie : reward (nullable) + milestones array

### Phase 4 - Frontend

- `src/routes/(public)/games/2048/Game2048.svelte`
  - Ajout state rewardData et unlockedMilestones
  - saveScoreToServer() capture reward + milestones de la reponse API
  - Game Over Dialog : affiche gidouille gagnee, valeur theorique, meilleur semaine
  - Victory Dialog : affiche milestones debloques
  - Score < 1000 : message informatif
  - Reset des donnees dans startNewGame()
  - Svelte autofixer : keys ajoutees aux each milestones

### Phase 5 - Fixes code review

- Migration : utilise `achievements` (universal) au lieu de `game_achievements` (legacy)
- Migration : ajoute '2048' au CHECK constraint `achievements.context`
- API : milestones deplacees hors du guard `theoreticalReward > 0` (games_played fonctionne pour score < 1000)
- API : type cast propre pour school_id (MembershipWithClass)
- API : race-safe milestone insert avec `.select('id')` check
- Frontend : supprime milestones dead code dans Victory dialog (server save pas encore fait)

## Etat : TERMINE
