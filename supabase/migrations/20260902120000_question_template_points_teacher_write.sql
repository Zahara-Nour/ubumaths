-- ============================================================================
-- Tagging des questions au programme — ouvrir l'écriture au professeur
-- ============================================================================
-- `question_template_points` est le pivot de toute la chaîne d'acquisition :
-- une tentative n'a pas de clé étrangère vers un point, elle s'y relie par le
-- template tagué. Sans une ligne ici, aucun point ne peut jamais se valider.
--
-- Or la table est en LECTURE SEULE pour le professeur depuis sa création : seul
-- l'admin pouvait écrire. Aucune UI n'existait non plus, ce qui explique qu'on
-- ne s'en soit pas aperçu — la table est vide en prod, et toute la mécanique de
-- lecture (acquisition, badges SRS, statistiques de classe, anti-fraude, deck
-- Programme) tourne à vide depuis le début.
--
-- On aligne sur la jonction jumelle `exercise_curriculum_points`, dont la
-- politique est `is_teacher_or_admin()` depuis le refactor mono-professeur.
-- ============================================================================

create policy "Teachers manage question template tags"
	on public.question_template_points
	for all to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- Les trois autres jonctions du référentiel portent un `created_at` ; celle-ci
-- ne l'avait pas. Utile pour savoir quand un tagging a été posé, et pour
-- ordonner un jour la liste des questions d'un point.
alter table public.question_template_points
	add column created_at timestamptz not null default now();

comment on table public.question_template_points is
	'Quelles questions valident quel point de programme. Pivot de l''acquisition : une tentative se relie au point par le template tagué, il n''y a pas de lien direct.';
