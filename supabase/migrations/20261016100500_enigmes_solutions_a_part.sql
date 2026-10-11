-- Réponse attendue et correction des énigmes rangées à part — étape A sur 3.
--
-- Constat (audit de #1149, mesuré en prod le 2026-10-12) : `riddles.answer` et
-- `riddles.correction` sont lisibles par l'élève, par une requête directe, pour l'énigme
-- du jour ou une énigme qui lui est assignée (policy « Students can view assigned riddles
-- and riddle of the day » + droit de colonne `authenticated`). #1149 ne les retire que des
-- données des pages.
--
-- Question d'accès (tranchée par David, 2026-10-12) : réponse et correction réservées au
-- prof (auteur de l'énigme) et à l'admin. L'élève ne les lit pas, même après réussite.
--
-- Plan :
--   A (ici, additive) : table `riddle_solutions`, recopie des énigmes existantes, et
--     déclencheur qui la tient à jour tant que le code écrit encore dans `riddles`.
--   B (code) : pages prof et route de soumission lisent et écrivent `riddle_solutions`
--     (le serveur, par le client service, pour ce dont l'élève a besoin).
--   C (destructive, APRÈS le deploy:prod de B, sur décision de David) : suppression de
--     `riddles.answer`, `riddles.correction` et du déclencheur.
--
-- Qui gagne quoi : personne. La table ne s'ouvre qu'à ceux qui lisent déjà ces colonnes
-- (auteur de l'énigme, admin). Qui perd quoi : rien à cette étape.
--
-- Rollback :
--   DROP TRIGGER IF EXISTS trigger_sync_riddle_solution ON public.riddles;
--   DROP FUNCTION IF EXISTS public.sync_riddle_solution();
--   DROP TABLE IF EXISTS public.riddle_solutions;
--   (sans perte : `riddles.answer` et `riddles.correction` restent la source jusqu'à C)

CREATE TABLE public.riddle_solutions (
  riddle_id uuid PRIMARY KEY REFERENCES public.riddles(id) ON DELETE CASCADE,
  answer jsonb,
  correction text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.riddle_solutions IS
  'Réponse attendue et correction d''une énigme : auteur de l''énigme et admin seulement (2026-10-12).';

ALTER TABLE public.riddle_solutions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.riddle_solutions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.riddle_solutions TO authenticated;
GRANT ALL ON public.riddle_solutions TO service_role;

CREATE POLICY "Admins manage riddle solutions"
  ON public.riddle_solutions FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Teachers manage solutions of own riddles"
  ON public.riddle_solutions FOR ALL TO authenticated
  USING (public.teacher_owns_riddle(riddle_id))
  WITH CHECK (public.teacher_owns_riddle(riddle_id));

INSERT INTO public.riddle_solutions (riddle_id, answer, correction)
SELECT id, answer, correction FROM public.riddles
ON CONFLICT (riddle_id) DO NOTHING;

-- Transition (jusqu'à l'étape C) : toute écriture de `riddles.answer` / `correction`
-- est recopiée. SECURITY INVOKER : l'auteur (policy) et l'admin y ont droit, le client
-- service passe outre la RLS ; un élève ne peut pas écrire dans `riddles`.
CREATE FUNCTION public.sync_riddle_solution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.riddle_solutions (riddle_id, answer, correction, updated_at)
  VALUES (NEW.id, NEW.answer, NEW.correction, now())
  ON CONFLICT (riddle_id) DO UPDATE
    SET answer = EXCLUDED.answer,
        correction = EXCLUDED.correction,
        updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_riddle_solution() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trigger_sync_riddle_solution
  AFTER INSERT OR UPDATE OF answer, correction ON public.riddles
  FOR EACH ROW EXECUTE FUNCTION public.sync_riddle_solution();
