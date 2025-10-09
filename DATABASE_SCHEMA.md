# Database Schema Documentation

This document describes the database schema for the UbuMaths educational math application.

## Overview

The database is designed to support a complete math learning platform with:
- **User Management**: Students, teachers, and admins
- **Content Organization**: Topics, subtopics, and exercises
- **Progress Tracking**: Student attempts and progress metrics
- **Classroom Management**: Classes, assignments, and submissions

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    ↓
profiles (user_role: student/teacher/admin)
    ↓
    ├─→ exercises (created_by) → exercise_options
    │                         → exercise_answers
    │
    ├─→ classes (teacher_id) → class_members (students)
    │                       → assignments → assignment_exercises
    │                                    → assignment_submissions
    │
    └─→ student_attempts → student_progress
                        ↓
                    exercises
                        ↓
                    subtopics
                        ↓
                    topics
```

## Tables

### Core User Tables

#### `profiles`
Extends Supabase's `auth.users` with application-specific data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users(id) |
| email | TEXT | User's email |
| full_name | TEXT | User's full name |
| role | user_role | 'student', 'teacher', or 'admin' |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Automatic Creation**: A trigger automatically creates a profile when a user signs up.

### Content Organization Tables

#### `topics`
Top-level mathematical topics (e.g., Algebra, Geometry, Calculus).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Topic ID |
| name | TEXT | Topic name |
| description | TEXT | Topic description |
| icon | TEXT | Icon identifier |
| order_index | INTEGER | Display order |

#### `subtopics`
Specific areas within topics (e.g., Linear Equations, Quadratic Functions).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Subtopic ID |
| topic_id | UUID (FK) | Parent topic |
| name | TEXT | Subtopic name |
| description | TEXT | Subtopic description |
| order_index | INTEGER | Display order within topic |

### Exercise Tables

#### `exercises`
Individual math problems/questions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Exercise ID |
| subtopic_id | UUID (FK) | Related subtopic |
| created_by | UUID (FK) | Teacher who created it |
| title | TEXT | Exercise title |
| question | TEXT | Question text (supports LaTeX/MathML) |
| type | exercise_type | 'multiple_choice', 'free_response', 'true_false', 'fill_blank' |
| difficulty | difficulty_level | 'easy', 'medium', 'hard' |
| points | INTEGER | Points awarded for correct answer |
| time_limit_seconds | INTEGER | Optional time limit |
| hints | JSONB | Array of hint texts |
| explanation | TEXT | Solution explanation |
| is_published | BOOLEAN | Whether students can see it |

#### `exercise_options`
Answer choices for multiple choice and true/false exercises.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Option ID |
| exercise_id | UUID (FK) | Parent exercise |
| option_text | TEXT | Answer choice text |
| is_correct | BOOLEAN | Whether this is correct |
| order_index | INTEGER | Display order |

#### `exercise_answers`
Accepted answers for free response exercises.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Answer ID |
| exercise_id | UUID (FK) | Parent exercise |
| answer_text | TEXT | Accepted answer (LaTeX supported) |
| is_primary | BOOLEAN | Primary/preferred answer |

### Student Progress Tables

#### `student_attempts`
Individual student responses to exercises.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Attempt ID |
| student_id | UUID (FK) | Student who attempted |
| exercise_id | UUID (FK) | Exercise attempted |
| submitted_answer | TEXT | Student's answer |
| is_correct | BOOLEAN | Whether answer was correct |
| points_earned | INTEGER | Points awarded |
| time_spent_seconds | INTEGER | Time taken |
| hints_used | INTEGER | Number of hints used |
| attempt_number | INTEGER | Which attempt (1st, 2nd, etc.) |
| created_at | TIMESTAMPTZ | When attempted |

**Automatic Progress Update**: A trigger automatically updates `student_progress` after each attempt.

#### `student_progress`
Aggregate progress statistics per subtopic.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Progress ID |
| student_id | UUID (FK) | Student |
| subtopic_id | UUID (FK) | Subtopic |
| exercises_completed | INTEGER | Total exercises attempted |
| exercises_correct | INTEGER | Number answered correctly |
| total_points | INTEGER | Total points earned |
| last_practiced_at | TIMESTAMPTZ | Last practice time |
| mastery_level | NUMERIC(3,2) | 0.00 to 1.00 (percentage) |

**Unique Constraint**: One row per (student, subtopic) pair.

### Classroom Management Tables

#### `classes`
Teacher-created groups of students.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Class ID |
| teacher_id | UUID (FK) | Teacher who owns class |
| name | TEXT | Class name |
| description | TEXT | Class description |
| join_code | TEXT (UNIQUE) | 6-character code for students to join |
| is_active | BOOLEAN | Whether class is active |

**Automatic Join Code**: A function generates unique 6-character codes.

#### `class_members`
Students enrolled in classes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Membership ID |
| class_id | UUID (FK) | Class |
| student_id | UUID (FK) | Student |
| joined_at | TIMESTAMPTZ | When student joined |

**Unique Constraint**: A student can only join each class once.

#### `assignments`
Teacher-created exercise sets for classes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Assignment ID |
| class_id | UUID (FK) | Class it's assigned to |
| created_by | UUID (FK) | Teacher who created it |
| title | TEXT | Assignment title |
| description | TEXT | Assignment description |
| due_date | TIMESTAMPTZ | Due date (optional) |
| is_published | BOOLEAN | Whether students can see it |

#### `assignment_exercises`
Exercises included in an assignment.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Record ID |
| assignment_id | UUID (FK) | Assignment |
| exercise_id | UUID (FK) | Exercise |
| order_index | INTEGER | Display order |
| points_override | INTEGER | Optional custom points for this assignment |

#### `assignment_submissions`
Student progress on assignments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Submission ID |
| assignment_id | UUID (FK) | Assignment |
| student_id | UUID (FK) | Student |
| total_points | INTEGER | Points earned so far |
| max_points | INTEGER | Maximum possible points |
| completion_percentage | NUMERIC(5,2) | Percentage complete |
| submitted_at | TIMESTAMPTZ | When submitted (if complete) |
| is_complete | BOOLEAN | Whether finished |

## Row Level Security (RLS)

All tables have RLS enabled with the following access patterns:

### Students can:
- View their own profile
- View all published topics, subtopics, and exercises
- Create and view their own attempts and progress
- View classes they're members of
- View published assignments for their classes
- Manage their own assignment submissions

### Teachers can:
- View profiles of students in their classes
- Create and manage topics, subtopics, and exercises
- View all attempts and progress for their students
- Create and manage their own classes
- Add/remove students from their classes
- Create and manage assignments for their classes
- View submissions for their class assignments

### Admins can:
- Everything teachers can do (role check in policies)

## Key Functions & Triggers

### `handle_new_user()`
**Trigger**: After user signup in `auth.users`
**Action**: Automatically creates a profile with role='student'

### `generate_join_code()`
**Usage**: Called when creating a class
**Returns**: Random 6-character uppercase code (guaranteed unique)

### `update_student_progress_after_attempt()`
**Trigger**: After insert on `student_attempts`
**Action**:
- Finds the related subtopic
- Updates or creates a `student_progress` record
- Increments counters, adds points
- Calculates mastery level (exercises_correct / exercises_completed)

### `update_updated_at_column()`
**Trigger**: Before update on tables with `updated_at`
**Action**: Sets `updated_at = NOW()`

## Indexes

Performance indexes are created for:
- Foreign key relationships
- Common query patterns (student→attempts, teacher→classes, etc.)
- RLS policy checks

## Usage Examples

### Creating an Exercise (Teacher)

```typescript
const { data, error } = await supabase
  .from('exercises')
  .insert({
    subtopic_id: 'uuid-here',
    title: 'Solve for x',
    question: 'If $2x + 5 = 15$, what is $x$?',
    type: 'free_response',
    difficulty: 'easy',
    points: 10,
    is_published: true
  });
```

### Recording Student Attempt

```typescript
const { data, error } = await supabase
  .from('student_attempts')
  .insert({
    exercise_id: 'uuid-here',
    student_id: session.user.id,
    submitted_answer: '5',
    is_correct: true,
    points_earned: 10,
    time_spent_seconds: 45,
    hints_used: 0,
    attempt_number: 1
  });
// student_progress automatically updated by trigger!
```

### Creating a Class with Join Code

```typescript
const { data, error } = await supabase
  .from('classes')
  .insert({
    teacher_id: session.user.id,
    name: 'Algebra 1 - Period 3',
    description: 'Morning algebra class',
    join_code: await supabase.rpc('generate_join_code')
  });
```

### Student Joining a Class

```typescript
const { data, error } = await supabase
  .from('class_members')
  .insert({
    class_id: 'uuid-from-join-code-lookup',
    student_id: session.user.id
  });
```

## Next Steps

1. **Apply Migration**: Run the SQL in Supabase dashboard or via CLI
2. **Seed Data**: Add initial topics and subtopics
3. **Test RLS**: Verify policies work as expected
4. **Build UI**: Create components for exercises, progress tracking, etc.
