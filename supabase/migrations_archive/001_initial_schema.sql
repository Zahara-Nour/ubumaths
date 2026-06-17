-- Enable UUID extension (using gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- Create enum for difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create enum for exercise types
CREATE TYPE exercise_type AS ENUM ('multiple_choice', 'free_response', 'true_false', 'fill_blank');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Topics table (e.g., Algebra, Geometry, Calculus)
CREATE TABLE topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subtopics table (e.g., Linear Equations, Quadratic Functions)
CREATE TABLE subtopics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercises table
CREATE TABLE exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    question TEXT NOT NULL, -- Can include LaTeX/MathML
    type exercise_type NOT NULL,
    difficulty difficulty_level NOT NULL DEFAULT 'medium',
    points INTEGER NOT NULL DEFAULT 10,
    time_limit_seconds INTEGER, -- Optional time limit
    hints JSONB DEFAULT '[]'::jsonb, -- Array of hint texts
    explanation TEXT, -- Solution explanation
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercise options table (for multiple choice, true/false)
CREATE TABLE exercise_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercise answers table (for free response)
CREATE TABLE exercise_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
    answer_text TEXT NOT NULL, -- Accepted answer (can be LaTeX)
    is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary/preferred answer
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student attempts table
CREATE TABLE student_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER,
    hints_used INTEGER NOT NULL DEFAULT 0,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student progress table (aggregate stats per subtopic)
CREATE TABLE student_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE NOT NULL,
    exercises_completed INTEGER NOT NULL DEFAULT 0,
    exercises_correct INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    mastery_level NUMERIC(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, subtopic_id)
);

-- Classes/Groups table (for teachers to organize students)
CREATE TABLE classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    join_code TEXT UNIQUE NOT NULL, -- Simple code for students to join
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Class members (students in classes)
CREATE TABLE class_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- Assignments table
CREATE TABLE assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignment exercises (exercises included in an assignment)
CREATE TABLE assignment_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    points_override INTEGER, -- Optional: override exercise points for this assignment
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assignment_id, exercise_id)
);

-- Assignment submissions
CREATE TABLE assignment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    max_points INTEGER NOT NULL DEFAULT 0,
    completion_percentage NUMERIC(5,2) DEFAULT 0.00,
    submitted_at TIMESTAMPTZ,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- Indexes for better query performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_exercises_subtopic ON exercises(subtopic_id);
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_student_attempts_student ON student_attempts(student_id);
CREATE INDEX idx_student_attempts_exercise ON student_attempts(exercise_id);
CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_student_progress_subtopic ON student_progress(subtopic_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_class_members_class ON class_members(class_id);
CREATE INDEX idx_class_members_student ON class_members(student_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles in their classes" ON profiles
    FOR SELECT USING (
        role = 'student' AND EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON c.id = cm.class_id
            WHERE c.teacher_id = auth.uid() AND cm.student_id = profiles.id
        )
    );

-- Topics and Subtopics (public read)
CREATE POLICY "Anyone can view topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Teachers can manage topics" ON topics FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);

CREATE POLICY "Anyone can view subtopics" ON subtopics FOR SELECT USING (true);
CREATE POLICY "Teachers can manage subtopics" ON subtopics FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);

-- Exercises policies
CREATE POLICY "Anyone can view published exercises" ON exercises
    FOR SELECT USING (is_published = true);

CREATE POLICY "Teachers can view their own exercises" ON exercises
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Teachers can create exercises" ON exercises
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers can update their own exercises" ON exercises
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete their own exercises" ON exercises
    FOR DELETE USING (created_by = auth.uid());

-- Exercise options policies
CREATE POLICY "Users can view options for published exercises" ON exercise_options
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM exercises WHERE id = exercise_options.exercise_id AND is_published = true)
    );

CREATE POLICY "Teachers can manage options for their exercises" ON exercise_options
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exercises WHERE id = exercise_options.exercise_id AND created_by = auth.uid())
    );

-- Exercise answers policies (similar to options)
CREATE POLICY "Users can view answers for published exercises" ON exercise_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM exercises WHERE id = exercise_answers.exercise_id AND is_published = true)
    );

CREATE POLICY "Teachers can manage answers for their exercises" ON exercise_answers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exercises WHERE id = exercise_answers.exercise_id AND created_by = auth.uid())
    );

-- Student attempts policies
CREATE POLICY "Students can view their own attempts" ON student_attempts
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create their own attempts" ON student_attempts
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts from their students" ON student_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON c.id = cm.class_id
            WHERE c.teacher_id = auth.uid() AND cm.student_id = student_attempts.student_id
        )
    );

-- Student progress policies
CREATE POLICY "Students can view their own progress" ON student_progress
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress" ON student_progress
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view progress of their students" ON student_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON c.id = cm.class_id
            WHERE c.teacher_id = auth.uid() AND cm.student_id = student_progress.student_id
        )
    );

-- Classes policies
CREATE POLICY "Teachers can view their own classes" ON classes
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Students can view classes they are members of" ON classes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM class_members WHERE class_id = classes.id AND student_id = auth.uid())
    );

CREATE POLICY "Teachers can create classes" ON classes
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers can update their own classes" ON classes
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own classes" ON classes
    FOR DELETE USING (teacher_id = auth.uid());

-- Class members policies
CREATE POLICY "Users can view members of their classes" ON class_members
    FOR SELECT USING (
        student_id = auth.uid() OR EXISTS (
            SELECT 1 FROM classes WHERE id = class_members.class_id AND teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can join classes" ON class_members
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can manage members in their classes" ON class_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM classes WHERE id = class_members.class_id AND teacher_id = auth.uid())
    );

-- Assignments policies
CREATE POLICY "Students can view assignments for their classes" ON assignments
    FOR SELECT USING (
        is_published = true AND EXISTS (
            SELECT 1 FROM class_members WHERE class_id = assignments.class_id AND student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view assignments for their classes" ON assignments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Teachers can create assignments for their classes" ON assignments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Teachers can update assignments for their classes" ON assignments
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Teachers can delete assignments for their classes" ON assignments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND teacher_id = auth.uid())
    );

-- Assignment exercises policies
CREATE POLICY "Students can view exercises in published assignments" ON assignment_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN class_members cm ON a.class_id = cm.class_id
            WHERE a.id = assignment_exercises.assignment_id
            AND a.is_published = true
            AND cm.student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage assignment exercises" ON assignment_exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = assignment_exercises.assignment_id AND c.teacher_id = auth.uid()
        )
    );

-- Assignment submissions policies
CREATE POLICY "Students can view their own submissions" ON assignment_submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can manage their own submissions" ON assignment_submissions
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions for their class assignments" ON assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = assignment_submissions.assignment_id AND c.teacher_id = auth.uid()
        )
    );

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON subtopics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON student_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'student');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate unique join code for classes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM classes WHERE join_code = code) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to update student progress after attempt
CREATE OR REPLACE FUNCTION update_student_progress_after_attempt()
RETURNS TRIGGER AS $$
DECLARE
    v_subtopic_id UUID;
BEGIN
    -- Get the subtopic_id from the exercise
    SELECT subtopic_id INTO v_subtopic_id
    FROM exercises
    WHERE id = NEW.exercise_id;

    -- Insert or update student progress
    INSERT INTO student_progress (student_id, subtopic_id, exercises_completed, exercises_correct, total_points, last_practiced_at)
    VALUES (
        NEW.student_id,
        v_subtopic_id,
        1,
        CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        NEW.points_earned,
        NOW()
    )
    ON CONFLICT (student_id, subtopic_id)
    DO UPDATE SET
        exercises_completed = student_progress.exercises_completed + 1,
        exercises_correct = student_progress.exercises_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        total_points = student_progress.total_points + NEW.points_earned,
        last_practiced_at = NOW(),
        mastery_level = LEAST(1.00, (student_progress.exercises_correct::NUMERIC + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END) / NULLIF(student_progress.exercises_completed + 1, 0));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update progress after student attempt
CREATE TRIGGER after_student_attempt
    AFTER INSERT ON student_attempts
    FOR EACH ROW EXECUTE FUNCTION update_student_progress_after_attempt();
