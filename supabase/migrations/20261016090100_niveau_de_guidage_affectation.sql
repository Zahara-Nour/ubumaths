-- =============================================================================
-- Niveau de guidage d'une affectation de fiche (ADR 0023)
-- =============================================================================
--
-- Le prof choisit, à l'affectation, la version des exercices de la fiche :
-- guidée, intermédiaire ou autonome. Guidé par défaut (ce que montrait déjà le
-- corrigé du prof). Jamais tiré au hasard : le code choisit la version de
-- chaque exercice d'après ce niveau.
--
-- ADDITIVE : une colonne avec défaut, aucune donnée perdue ; les 11 affectations
-- existantes valent « guidé ».
--
-- ACCÈS (question tranchée par David, ADR 0023, Q4 = a) : aucune nouvelle
-- règle. La colonne suit la ligne : l'élève visé lit le niveau de SA propre
-- affectation (il le déduit déjà de son sujet) ; il ne lit pas les affectations
-- des autres groupes (policy « Students can view their assignments »).
-- Tests : tests/integration/worksheet-assignment-guidance-level.test.ts.
--
-- RETOUR ARRIÈRE :
--   alter table public.worksheet_assignments drop column guidance_level;
-- =============================================================================

alter table public.worksheet_assignments
	add column guidance_level text not null default 'guided'
	constraint worksheet_assignments_guidance_level_check
		check (guidance_level in ('guided', 'intermediate', 'autonomous'));

comment on column public.worksheet_assignments.guidance_level is
	'Niveau de guidage des exercices de la fiche pour cette affectation : guided (défaut), intermediate, autonomous (ADR 0023).';
