-- Migration: Create python_files and python_file_assignments tables
-- This enables saving Python Playground files with teacher assignment functionality

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

-- Table 1: python_files - stores user Python code files
create table if not exists python_files (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    code text not null,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    is_public boolean default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Table 2: python_file_assignments - tracks file assignments to classes
create table if not exists python_file_assignments (
    id uuid primary key default gen_random_uuid(),
    file_id uuid not null references python_files(id) on delete cascade,
    class_id uuid not null references classes(id) on delete cascade,
    assigned_by uuid not null references public.profiles(id) on delete cascade,
    instructions text,
    due_date timestamptz,
    assigned_at timestamptz not null default now(),
    unique(file_id, class_id)
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

comment on table python_files is 'Stores Python code files from the Python Playground feature';
comment on column python_files.id is 'Unique identifier for the file';
comment on column python_files.title is 'Title of the Python file';
comment on column python_files.description is 'Optional description of the file';
comment on column python_files.code is 'Python source code content';
comment on column python_files.owner_id is 'Reference to the user who created this file';
comment on column python_files.is_public is 'Whether this file is visible to all authenticated users';
comment on column python_files.created_at is 'Timestamp when the file was created';
comment on column python_files.updated_at is 'Timestamp when the file was last updated';

comment on table python_file_assignments is 'Tracks Python file assignments to classes by teachers';
comment on column python_file_assignments.id is 'Unique identifier for the assignment';
comment on column python_file_assignments.file_id is 'Reference to the assigned Python file';
comment on column python_file_assignments.class_id is 'Reference to the class receiving the assignment';
comment on column python_file_assignments.assigned_by is 'Reference to the teacher who made the assignment';
comment on column python_file_assignments.instructions is 'Optional instructions for students';
comment on column python_file_assignments.due_date is 'Optional due date for the assignment';
comment on column python_file_assignments.assigned_at is 'Timestamp when the assignment was created';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for python_files
create index if not exists idx_python_files_owner_id on python_files(owner_id);
create index if not exists idx_python_files_created_at on python_files(created_at desc);
create index if not exists idx_python_files_is_public on python_files(is_public) where is_public = true;

-- Indexes for python_file_assignments
create index if not exists idx_python_file_assignments_file_id on python_file_assignments(file_id);
create index if not exists idx_python_file_assignments_class_id on python_file_assignments(class_id);
create index if not exists idx_python_file_assignments_assigned_by on python_file_assignments(assigned_by);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Function to check if a user is a teacher of a specific student
create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from classes c
        join class_members cm on c.id = cm.class_id
        where c.teacher_id = auth.uid()
        and cm.student_id = p_student_id
    );
exception
    when others then
        return false;
end;
$$;

-- Function to check if a user is a student in a specific class
create or replace function public.is_student_in_class(p_class_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from class_members
        where class_id = p_class_id
        and student_id = auth.uid()
    );
exception
    when others then
        return false;
end;
$$;

-- Function to check if a user is the teacher of a specific class
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from classes
        where id = p_class_id
        and teacher_id = auth.uid()
    );
exception
    when others then
        return false;
end;
$$;

-- Function to count user's Python files (for limit enforcement)
create or replace function public.count_user_python_files(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    file_count integer;
begin
    select count(*) into file_count
    from python_files
    where owner_id = p_user_id;
    return file_count;
exception
    when others then
        return 999; -- Return high number to prevent inserts on error
end;
$$;

-- Function to check if a file is assigned to the current user's class
create or replace function public.is_file_assigned_to_student(p_file_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from python_file_assignments pfa
        join class_members cm on pfa.class_id = cm.class_id
        where pfa.file_id = p_file_id
        and cm.student_id = auth.uid()
    );
exception
    when others then
        return false;
end;
$$;

-- Grant execute permissions on helper functions
grant execute on function public.is_teacher_of_student(uuid) to authenticated;
grant execute on function public.is_student_in_class(uuid) to authenticated;
grant execute on function public.is_teacher_of_class(uuid) to authenticated;
grant execute on function public.count_user_python_files(uuid) to authenticated;
grant execute on function public.is_file_assigned_to_student(uuid) to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY - python_files
-- ============================================================================

alter table python_files enable row level security;

-- SELECT policies for python_files

-- 1. Users can read their own files
create policy "Users can read own python files"
    on python_files
    for select
    using (auth.uid() = owner_id);

-- 2. Users can read public files
create policy "Users can read public python files"
    on python_files
    for select
    using (is_public = true);

-- 3. Teachers can read files from students in their classes
create policy "Teachers can read student python files"
    on python_files
    for select
    using (is_teacher_of_student(owner_id));

-- 4. Students can read files assigned to their class
create policy "Students can read assigned python files"
    on python_files
    for select
    using (is_file_assigned_to_student(id));

-- 5. Admins can read all files
create policy "Admins can read all python files"
    on python_files
    for select
    using (is_admin());

-- INSERT policy for python_files
create policy "Users can insert own python files"
    on python_files
    for insert
    with check (
        auth.uid() = owner_id
        and count_user_python_files(auth.uid()) < 50
    );

-- UPDATE policy for python_files
create policy "Users can update own python files"
    on python_files
    for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

-- DELETE policy for python_files
create policy "Users can delete own python files"
    on python_files
    for delete
    using (auth.uid() = owner_id);

-- ============================================================================
-- ROW LEVEL SECURITY - python_file_assignments
-- ============================================================================

alter table python_file_assignments enable row level security;

-- SELECT policies for python_file_assignments

-- 1. Teacher who assigned can view
create policy "Teachers can view own python file assignments"
    on python_file_assignments
    for select
    using (auth.uid() = assigned_by);

-- 2. Students in the class can view assignments for their class
create policy "Students can view class python file assignments"
    on python_file_assignments
    for select
    using (is_student_in_class(class_id));

-- 3. Admins can view all
create policy "Admins can view all python file assignments"
    on python_file_assignments
    for select
    using (is_admin());

-- INSERT policy for python_file_assignments
-- Teacher must own the file AND be the teacher of the class
create policy "Teachers can assign their files to their classes"
    on python_file_assignments
    for insert
    with check (
        auth.uid() = assigned_by
        and exists (
            select 1
            from python_files
            where id = file_id
            and owner_id = auth.uid()
        )
        and is_teacher_of_class(class_id)
    );

-- UPDATE policy for python_file_assignments
create policy "Teachers can update own python file assignments"
    on python_file_assignments
    for update
    using (auth.uid() = assigned_by)
    with check (auth.uid() = assigned_by);

-- DELETE policy for python_file_assignments
create policy "Teachers can delete own python file assignments"
    on python_file_assignments
    for delete
    using (auth.uid() = assigned_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp for python_files
create or replace function update_python_files_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at on python_files update
create trigger python_files_updated_at_trigger
    before update on python_files
    for each row
    execute function update_python_files_updated_at();

-- Function to enforce 50 file limit per user
create or replace function check_python_files_limit()
returns trigger as $$
begin
    if (select count(*) from python_files where owner_id = new.owner_id) >= 50 then
        raise exception 'User has reached the maximum limit of 50 Python files';
    end if;
    return new;
end;
$$ language plpgsql;

-- Trigger to enforce file limit before insert
create trigger python_files_limit_trigger
    before insert on python_files
    for each row
    execute function check_python_files_limit();

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================

grant select, insert, update, delete on python_files to authenticated;
grant select, insert, update, delete on python_file_assignments to authenticated;

-- ============================================================================
-- FUNCTION COMMENTS
-- ============================================================================

comment on function public.is_teacher_of_student(uuid) is 'Security definer function to check if current user is a teacher of the specified student';
comment on function public.is_student_in_class(uuid) is 'Security definer function to check if current user is a student in the specified class';
comment on function public.is_teacher_of_class(uuid) is 'Security definer function to check if current user is the teacher of the specified class';
comment on function public.count_user_python_files(uuid) is 'Security definer function to count Python files owned by a user';
comment on function public.is_file_assigned_to_student(uuid) is 'Security definer function to check if a file is assigned to current user via class membership';
comment on function update_python_files_updated_at() is 'Trigger function to auto-update updated_at timestamp';
comment on function check_python_files_limit() is 'Trigger function to enforce 50 file limit per user';
