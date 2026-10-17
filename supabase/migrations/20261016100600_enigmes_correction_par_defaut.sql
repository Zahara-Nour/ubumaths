-- Énigmes : `riddles.correction` prend '' par défaut — préparation de l'étape B.
--
-- Contexte : la réponse attendue et la correction vivent désormais dans
-- `riddle_solutions` (20261016100500). À l'étape B, le code n'écrit plus
-- `riddles.answer` ni `riddles.correction`, pour rester valable quand ces colonnes
-- seront supprimées (étape C). `riddles.correction` est NOT NULL sans défaut : une
-- création d'énigme qui ne la nomme pas serait refusée. Ce défaut le permet.
--
-- Qui gagne / perd quel accès : personne. Aucune donnée modifiée.
--
-- Rollback :
--   ALTER TABLE public.riddles ALTER COLUMN correction DROP DEFAULT;

ALTER TABLE public.riddles ALTER COLUMN correction SET DEFAULT '';
