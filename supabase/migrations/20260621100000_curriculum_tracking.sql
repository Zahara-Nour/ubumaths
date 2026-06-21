-- Curriculum tracking — Phase 1 (schema + RLS)
-- ============================================================================
-- Feature: a teacher-owned curriculum referential, DISTINCT from the evaluation
-- referential (skills/objectives). Three levels: Thème → Item → Point.
-- Coverage is fed from the cahier de texte (class_journal_entries): each entry
-- marks the curriculum points worked on (auto, derived from tagged activities,
-- or manual). Coverage of a point for a class = count of entries touching it.
--
-- Mono-teacher model: NO teacher_id column; ownership is role-based via
-- public.is_teacher_or_admin() (same pattern as class_chapters / journal).
-- Students have NO access in V1 (out of scope).
--
-- Spec: docs/wip/suivi-programme-progress.md (§4 data model).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. curriculum_themes  (level 1, per grade) — e.g. "Calcul"
-- ---------------------------------------------------------------------------
create table if not exists public.curriculum_themes (
	id uuid primary key default gen_random_uuid(),
	grade text not null,
	name text not null,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- canonical grade codes (mirrors assessments_valid_grade)
	constraint curriculum_themes_valid_grade check (
		grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_STMG', 'T_STMG'
		])
	),
	constraint curriculum_themes_name_not_blank check (char_length(btrim(name)) > 0),
	constraint curriculum_themes_grade_name_unique unique (grade, name)
);

comment on table public.curriculum_themes is
	'Curriculum referential level 1 (Thème), per grade. Teacher-owned, distinct from the evaluation referential (skill_themes).';

-- ---------------------------------------------------------------------------
-- 2. curriculum_items  (level 2) — e.g. "Fractions"
-- ---------------------------------------------------------------------------
create table if not exists public.curriculum_items (
	id uuid primary key default gen_random_uuid(),
	theme_id uuid not null references public.curriculum_themes(id) on delete cascade,
	name text not null,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint curriculum_items_name_not_blank check (char_length(btrim(name)) > 0),
	constraint curriculum_items_theme_name_unique unique (theme_id, name)
);

comment on table public.curriculum_items is
	'Curriculum referential level 2 (Item), under a Thème. e.g. "Fractions".';

-- ---------------------------------------------------------------------------
-- 3. curriculum_points  (level 3, tracking grain) — e.g. "Additionner deux fractions"
-- ---------------------------------------------------------------------------
create table if not exists public.curriculum_points (
	id uuid primary key default gen_random_uuid(),
	item_id uuid not null references public.curriculum_items(id) on delete cascade,
	name text not null,
	display_order integer not null default 0,
	-- optional: a point can be a "connaissance" or a "savoir_faire" (neutral by default)
	kind text,
	-- soft-archive instead of hard delete when a point already has coverage history
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint curriculum_points_name_not_blank check (char_length(btrim(name)) > 0),
	constraint curriculum_points_valid_kind check (kind is null or kind = any (array['connaissance', 'savoir_faire'])),
	constraint curriculum_points_item_name_unique unique (item_id, name)
);

comment on table public.curriculum_points is
	'Curriculum referential level 3 (Point) — the tracking grain. e.g. "Additionner deux fractions". kind is optional (connaissance | savoir_faire).';

-- ---------------------------------------------------------------------------
-- 4. exercise_curriculum_points  (tagging: a system exercise covers points)
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_curriculum_points (
	exercise_id uuid not null references public.exercises(id) on delete cascade,
	point_id uuid not null references public.curriculum_points(id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (exercise_id, point_id)
);

comment on table public.exercise_curriculum_points is
	'Tags a system exercise with the curriculum points it covers. Referencing the exercise in a journal entry derives auto coverage for these points.';

-- ---------------------------------------------------------------------------
-- 5. journal_entry_activities  (the 3 activity kinds attached to an entry)
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entry_activities (
	id uuid primary key default gen_random_uuid(),
	entry_id uuid not null references public.class_journal_entries(id) on delete cascade,
	-- 'exercise' (system exercise) | 'textbook' (manual reference) | 'course' (point de cours)
	kind text not null,
	exercise_id uuid references public.exercises(id) on delete set null,
	chapter_id uuid references public.class_chapters(id) on delete set null,
	-- free-form textbook reference: { manuel?, page?, numero?, label }
	textbook_ref jsonb,
	label text,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	constraint journal_entry_activities_valid_kind check (kind = any (array['exercise', 'textbook', 'course'])),
	-- each kind requires its own reference present
	constraint journal_entry_activities_kind_shape check (
		(kind = 'exercise' and exercise_id is not null)
		or (kind = 'course' and (chapter_id is not null or label is not null))
		or (kind = 'textbook' and textbook_ref is not null)
	)
);

comment on table public.journal_entry_activities is
	'Activities attached to a cahier de texte entry: system exercise, textbook reference, or course point.';

-- ---------------------------------------------------------------------------
-- 6. journal_entry_points  (coverage signal: which points an entry worked on)
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entry_points (
	id uuid primary key default gen_random_uuid(),
	entry_id uuid not null references public.class_journal_entries(id) on delete cascade,
	point_id uuid not null references public.curriculum_points(id) on delete cascade,
	-- 'auto' (materialized from a tagged activity) | 'manual' (checked by the teacher)
	source text not null default 'manual',
	created_at timestamptz not null default now(),
	constraint journal_entry_points_valid_source check (source = any (array['auto', 'manual'])),
	-- one point counts at most once per entry (manual + auto dedup)
	constraint journal_entry_points_entry_point_unique unique (entry_id, point_id)
);

comment on table public.journal_entry_points is
	'Coverage signal: a curriculum point worked on in a journal entry. Coverage of a point for a class = count of entries (in the school year) that touch it.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_curriculum_themes_grade on public.curriculum_themes (grade, display_order);
create index if not exists idx_curriculum_items_theme on public.curriculum_items (theme_id, display_order);
create index if not exists idx_curriculum_points_item on public.curriculum_points (item_id, display_order);
create index if not exists idx_exercise_curriculum_points_point on public.exercise_curriculum_points (point_id);
create index if not exists idx_journal_entry_activities_entry on public.journal_entry_activities (entry_id, display_order);
create index if not exists idx_journal_entry_activities_exercise on public.journal_entry_activities (exercise_id) where exercise_id is not null;
create index if not exists idx_journal_entry_points_entry on public.journal_entry_points (entry_id);
create index if not exists idx_journal_entry_points_point on public.journal_entry_points (point_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse existing helper)
-- ---------------------------------------------------------------------------
create trigger update_curriculum_themes_updated_at before update on public.curriculum_themes
	for each row execute function public.update_updated_at_column();
create trigger update_curriculum_items_updated_at before update on public.curriculum_items
	for each row execute function public.update_updated_at_column();
create trigger update_curriculum_points_updated_at before update on public.curriculum_points
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security — mono-teacher: teacher/admin manage everything.
-- Students have no access in V1.
-- ---------------------------------------------------------------------------
alter table public.curriculum_themes enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.curriculum_points enable row level security;
alter table public.exercise_curriculum_points enable row level security;
alter table public.journal_entry_activities enable row level security;
alter table public.journal_entry_points enable row level security;

create policy "Teachers manage curriculum themes" on public.curriculum_themes
	for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Teachers manage curriculum items" on public.curriculum_items
	for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Teachers manage curriculum points" on public.curriculum_points
	for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Teachers manage exercise curriculum tags" on public.exercise_curriculum_points
	for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Teachers manage journal entry activities" on public.journal_entry_activities
	for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Teachers manage journal entry points" on public.journal_entry_points
	for all using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());

-- ---------------------------------------------------------------------------
-- Grants (RLS still gates real access; anon has no policy → denied)
-- ---------------------------------------------------------------------------
grant all on table public.curriculum_themes to anon, authenticated, service_role;
grant all on table public.curriculum_items to anon, authenticated, service_role;
grant all on table public.curriculum_points to anon, authenticated, service_role;
grant all on table public.exercise_curriculum_points to anon, authenticated, service_role;
grant all on table public.journal_entry_activities to anon, authenticated, service_role;
grant all on table public.journal_entry_points to anon, authenticated, service_role;
