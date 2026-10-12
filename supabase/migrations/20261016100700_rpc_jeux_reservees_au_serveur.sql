-- Étape 2 : trois fonctions réservées au serveur (client service)
-- =================================================================
--
-- Étape 1 (#1147, #1153, #1077) : garde explicite dans chaque fonction, et le code les
-- appelle par le client service. Ce code est en prod depuis v0.25.0 (2026-10-12). Il reste
-- à retirer aux comptes connectés le droit de les appeler : sinon un élève peut encore,
-- pour lui-même, soumettre une tentative d'énigme jugée juste, s'attribuer la gidouille du
-- jour d'un jeu, ou ajouter n'importe quel score à son total Mathémo.
--
-- Mesuré en prod le 2026-10-12 : droit EXECUTE à postgres, authenticated et service_role
-- seulement (ni anon ni PUBLIC). Appelants dans src : client service uniquement
-- (api/riddles/[id]/submit, api/games/2048/scores, api/games/mathemo/scores).
-- Appels imbriqués : complete_minesweeper_game et submit_riddle_attempt (SECURITY DEFINER,
-- propriétaire postgres) appellent record_game_reward avec les droits de leur propriétaire ;
-- ils ne sont pas touchés, et la garde de record_game_reward s'y applique toujours.
--
-- Accès : aucun gagné ; les comptes connectés perdent l'appel direct de ces trois fonctions.
-- Aucune donnée touchée.
--
-- Tests : tests/integration/recompenses-jeux-par-le-serveur.test.ts,
--         tests/integration/mathemo-stats-par-le-serveur.test.ts,
--         tests/integration/enigmes-tentatives-par-le-serveur.test.ts
--
-- Rollback :
--   grant execute on function public.submit_riddle_attempt(uuid, uuid, jsonb, boolean) to authenticated;
--   grant execute on function public.record_game_reward(uuid, text, uuid, numeric, uuid) to authenticated;
--   grant execute on function public.upsert_mathemo_score(uuid, integer, boolean, boolean, numeric) to authenticated;

revoke execute on function public.submit_riddle_attempt(uuid, uuid, jsonb, boolean) from authenticated;
revoke execute on function public.record_game_reward(uuid, text, uuid, numeric, uuid) from authenticated;
revoke execute on function public.upsert_mathemo_score(uuid, integer, boolean, boolean, numeric) from authenticated;
