-- Énigmes, étape C : réponse attendue et correction ne vivent plus que dans riddle_solutions
-- =======================================================================================
--
-- ⛔ DESTRUCTIVE. Accord de David du 2026-10-12, après présentation de la réconciliation et
-- de l'inventaire des usages.
--
-- Étape A (#1163, 20261016100500) : table riddle_solutions (RLS : auteur et admin) +
-- déclencheur de recopie. Étape B (#1172) : le code ne lit ni n'écrit plus riddles.answer /
-- riddles.correction ; en prod depuis v0.25.0. Tant que ces colonnes existent, un élève lit,
-- par une requête directe, la réponse et la correction de l'énigme du jour ou d'une énigme
-- assignée.
--
-- Perdu : rien. Mesuré en prod le 2026-10-12 : 2 énigmes, 2 solutions, réponse et
-- correction identiques, aucune solution orpheline. La garde ci-dessous refait cette
-- vérification au moment de l'application et annule tout si elle échoue.
-- Usages : aucun dans src (requêtes à colonnes nommées, RIDDLE_COLUMNS), aucune vue, policy
-- ni fonction de la base qui les lise.
--
-- Accès : l'élève ne peut plus demander answer ni correction à riddles (colonne inconnue).
--
-- Tests : tests/integration/enigmes-solutions-a-part.test.ts
--
-- Rollback (recrée les colonnes et les remplit depuis riddle_solutions). ⚠️ Le rejouer
-- rend de nouveau réponse et correction lisibles par l'élève (énigme du jour, énigme
-- assignée) : c'est la faille que cette migration ferme.
--
--   alter table public.riddles add column answer jsonb;
--   alter table public.riddles add column correction text not null default '';
--   update public.riddles r set answer = s.answer, correction = s.correction
--     from public.riddle_solutions s where s.riddle_id = r.id;
--   puis recréer sync_riddle_solution() et trigger_sync_riddle_solution tels que dans
--   20261016100500_enigmes_solutions_a_part.sql.

do $$
declare
  v_ecarts integer;
begin
  select count(*) into v_ecarts
  from public.riddles r
  left join public.riddle_solutions s on s.riddle_id = r.id
  where s.riddle_id is null
     or r.answer is distinct from s.answer
     or coalesce(r.correction, '') is distinct from s.correction;

  if v_ecarts > 0 then
    raise exception 'Étape C annulée : % énigme(s) sans solution identique dans riddle_solutions', v_ecarts;
  end if;
end;
$$;

drop trigger trigger_sync_riddle_solution on public.riddles;
drop function public.sync_riddle_solution();

alter table public.riddles drop column answer;
alter table public.riddles drop column correction;
