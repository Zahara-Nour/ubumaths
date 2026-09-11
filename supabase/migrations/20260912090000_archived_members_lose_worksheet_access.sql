-- Archived class members lose access to that class's worksheets
-- =============================================================
--
-- `class_members.status` is either `active` or `archived`, the latter meaning
-- "left the class (keeps history)". A dozen access helpers in this schema check
-- it. The worksheet chain did not, so a student who had left a class kept
-- receiving its worksheets — while the teacher's progress page, which does
-- filter on `active`, no longer listed them. Nobody was in a position to notice.
--
-- WHO LOSES WHAT: a student whose membership is `archived` can no longer read
-- the worksheets, exercises, assignments, corrections or previews reaching them
-- through THAT class. Nothing else changes: an actively enrolled student is
-- unaffected, and so is a student named individually on the assignment —
-- naming someone does not go through a class, and that is exactly how an
-- out-of-class student is reached.
--
-- Preventive as of 2026-09-12: production holds 78 memberships, all `active`.
-- No one loses access today.
--
-- NOT TOUCHED HERE, on purpose:
--   - `classes / view_member_classes` lets an archived student still read the
--     NAME of their former class. Its reach goes far beyond worksheets (every
--     screen naming a class), so it needs its own access decision.
--   - `student_has_exercise_access(uuid, uuid)` — the standalone exercise path,
--     which has the same gap on `exercise_assignments`. Same question, other
--     surface.
--
-- ROLLBACK: re-run this file's four objects with the `cm.status = 'active'`
-- line removed from each.

-- 1. Policy on worksheet_assignments: "is this student in a targeted class?"
create or replace function public.is_in_assigned_class(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select exists (
		select 1
		from worksheet_assignment_classes wac
		join class_members cm on cm.class_id = wac.class_id
		join classes c on c.id = wac.class_id
		where wac.assignment_id = p_assignment_id
			and cm.student_id = auth.uid()
			and cm.status = 'active'
			and c.is_active = true
	);
$function$;

-- 2. Policies on worksheets and exercises. `student_has_exercise_access(uuid)`
--    delegates here, so the worksheet content follows automatically.
create or replace function public.student_has_worksheet_access(p_worksheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select exists (
		select 1
		from worksheet_assignments wa
		where wa.worksheet_id = p_worksheet_id
			and wa.status = 'active'
			and (wa.available_from is null or wa.available_from <= now())
			and (
				-- Through a class. The junction carries every class of the
				-- assignment, and the membership must still be active.
				exists (
					select 1
					from worksheet_assignment_classes wac
					join class_members cm on cm.class_id = wac.class_id
					join classes c on c.id = wac.class_id
					where wac.assignment_id = wa.id
						and cm.student_id = auth.uid()
						and cm.status = 'active'
						and c.is_active
				)
				-- By name. No class condition: this is precisely the
				-- out-of-class student's case.
				or exists (
					select 1
					from worksheet_assignment_students was
					where was.assignment_id = wa.id
						and was.student_id = auth.uid()
				)
			)
	);
$function$;

-- 3. Corrections and previews.
create or replace function public.can_access_assignment(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_user_id uuid;
begin
	v_user_id := auth.uid();

	return exists (
		select 1 from public.worksheet_assignments wa
		where wa.id = p_assignment_id
		and (
			-- The creator, always.
			wa.created_by = v_user_id
			or (
				wa.status = 'active'
				and (wa.available_from is null or wa.available_from <= now())
				and (
					exists (
						select 1 from public.worksheet_assignment_classes wac
						join public.class_members cm on cm.class_id = wac.class_id
						join public.classes c on c.id = wac.class_id
						where wac.assignment_id = wa.id
						and cm.student_id = v_user_id
						and cm.status = 'active'
						and c.is_active = true
					)
					or exists (
						select 1 from public.worksheet_assignment_students was
						where was.assignment_id = wa.id
						and was.student_id = v_user_id
					)
				)
			)
		)
	);
exception
	when others then
		return false;
end;
$function$;

-- 4. The junction row itself. It is what tells a student "this worksheet
--    reaches you through class A" — leaving it readable would keep naming a
--    class they have left, and is the source every reader now goes through.
drop policy if exists "Students can view their assignment classes"
	on public.worksheet_assignment_classes;

create policy "Students can view their assignment classes"
	on public.worksheet_assignment_classes
	for select
	using (
		exists (
			select 1
			from class_members cm
			join classes c on c.id = cm.class_id
			where cm.class_id = worksheet_assignment_classes.class_id
				and cm.student_id = auth.uid()
				and cm.status = 'active'
				and c.is_active = true
		)
	);
