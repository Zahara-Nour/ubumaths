# Database Schema Documentation

This document describes the database schema for the UbuMaths educational math application.

## Overview

The database is designed to support a complete math learning platform with:
- **User Management**: Students, teachers, and admins
- **School Management**: Multi-school support with school profiles
- **Classroom Management**: Classes and class memberships

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    ↓
profiles (user_role: student/teacher/admin) ← pending_students (pre-populated)
    ↓
    ├─→ schools (school_id FK)
    │       ├─ name, city, country (unique)
    │       └─ address, logo_url, is_active
    │
    └─→ classes (teacher_id, school_id FK) → class_members (students)
```

## Tables

### Core User Tables

#### `schools`
Educational institutions where students and teachers belong.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | School ID |
| name | TEXT | School name |
| city | TEXT | City location |
| country | TEXT | Country location |
| address | TEXT | Optional full address |
| logo_url | TEXT | Optional school logo |
| is_active | BOOLEAN | Whether school is active |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Unique Constraint**: (name, city, country) combination must be unique.

**RLS Policies**:
- Anyone can view schools (needed for registration/selection)
- Only admins can insert, update, or delete schools

#### `profiles`
Extends Supabase's `auth.users` with application-specific data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users(id) |
| email | TEXT | User's email |
| full_name | TEXT | User's full name (deprecated) |
| firstname | TEXT | User's first name |
| lastname | TEXT | User's last name |
| role | user_role | 'student', 'teacher', or 'admin' |
| school_id | UUID (FK) | References schools(id) |
| avatar_url | TEXT | URL to user's avatar image |
| class_ids | UUID[] | Array of class IDs user belongs to/teaches |
| grade | TEXT | Student's grade level (e.g., "6ème", "5ème", "4ème", "3ème") |
| gender | TEXT | User's gender ('boy' or 'girl') for avatar fallback purposes |
| gidouilles | INTEGER | Student currency/points for rewards system (default: 0) |
| vip_cards | JSONB | JSON object storing student VIP cards and their properties |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Note on Student-Teacher Relationship**:
Students don't have a single `teacher_id` because they have different teachers for each class. To find a student's teacher for a specific class, query: `class_members` → `classes.teacher_id`.

**Automatic Creation**: A trigger automatically creates a profile when a user signs up.

**RLS Policies**:
- Users can view and update their own profile (limited fields)
- Admins can view and update all profiles (including role, school, classes)
- Profile creation allowed (for signup trigger)

### Classroom Management Tables

#### `classes`
Teacher-created groups of students within a school.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Class ID |
| teacher_id | UUID (FK) | Teacher who owns class |
| school_id | UUID (FK) | School this class belongs to |
| name | TEXT | Class name |
| description | TEXT | Class description |
| join_code | TEXT (UNIQUE) | 6-character code for students to join |
| is_active | BOOLEAN | Whether class is active |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

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

#### `pending_students`
Pre-populated student data before first authentication.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Pending student ID |
| email | TEXT (UNIQUE) | Student's email (must match Google account) |
| firstname | TEXT | Student's first name |
| lastname | TEXT | Student's last name |
| grade | TEXT | Student's grade level (e.g., "6ème", "5ème") |
| school_id | UUID (FK) | References schools(id) |
| gender | TEXT | 'boy' or 'girl' for avatar fallback |
| is_activated | BOOLEAN | True when student has logged in (default: false) |
| activated_at | TIMESTAMPTZ | When student first authenticated |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Purpose**: Allows admins to pre-populate students before they log in with Google for the first time. When a student authenticates, the `handle_new_user()` trigger checks this table and creates their profile with pre-populated data.

**Workflow**:
1. **Teachers create classes** - Each class gets a unique `join_code` (e.g., MATH6A)
2. **Admin imports students** via CSV at `/dashboard/admin/import-students` with class codes
3. **System validates** class codes against existing classes (rejects invalid codes)
4. Students stored in `pending_students` with `class_ids` array (resolved from codes)
5. **Student logs in with Google** - Trigger checks for matching email
6. Profile created with pre-populated data + **auto-enrolled in classes**
7. Student marked as activated, immediately has access to all assigned classes

**Important**: Class codes in import MUST match existing `join_code` values from the `classes` table. Admins cannot invent arbitrary codes.

**RLS Policies**:
- Only admins can view, insert, update, or delete pending students

## Row Level Security (RLS)

All tables have RLS enabled with the following access patterns:

### Students can:
- View their own profile
- View all schools (for selection during registration)
- View classes they're members of
- View their own class memberships
- Join classes (insert into class_members)
- Leave classes (delete from class_members)

### Teachers can:
- View all schools (for selection during registration)
- Create and manage their own classes (where teacher_id = auth.uid())
- View, add, and remove students from their classes
- Update their own classes

### Admins can:
- View and modify all user profiles (using security definer functions)
- Full CRUD operations on schools table
- Change user roles (student/teacher/admin)
- Modify school assignments
- Add/remove users from classes via class_ids array
- Update avatar URLs and personal information
- Search users by email, firstname, or lastname
- Full CRUD operations on pending_students table (pre-populate students)

### RLS Implementation Notes

To avoid infinite recursion between tables, we use **SECURITY DEFINER functions**:

#### Helper Functions:
- `is_admin()` - Checks if user is admin without triggering RLS
- `is_teacher_or_admin()` - Checks if user is teacher or admin
- `is_student()` - Checks if user is student
- `is_class_teacher(class_id)` - Checks if user is teacher of specific class
- `can_view_student_profile(student_id)` - Checks teacher-student relationship

These functions use `SECURITY DEFINER` to bypass RLS when checking roles/permissions, preventing circular policy checks between `profiles`, `classes`, and `class_members` tables.

## Key Functions & Triggers

### Authentication & Profile Management

#### `handle_new_user()`
**Trigger**: After user signup in `auth.users`
**Action**: Automatically creates a profile. If user's email exists in `pending_students`, creates profile with pre-populated data (firstname, lastname, school, grade, gender) and marks the pending student as activated. Otherwise, creates a default profile with role='student'.

### Class Management

#### `generate_join_code()`
**Usage**: Called when creating a class
**Returns**: Random 6-character uppercase code (guaranteed unique)

### RLS Helper Functions (SECURITY DEFINER)

#### `is_admin()`
**Returns**: Boolean - true if current user is admin
**Purpose**: Bypasses RLS to check user role without recursion

#### `is_teacher_or_admin()`
**Returns**: Boolean - true if current user is teacher or admin
**Purpose**: Bypasses RLS to check user role without recursion

#### `is_student()`
**Returns**: Boolean - true if current user is student
**Purpose**: Bypasses RLS to check user role without recursion

#### `is_class_teacher(class_id UUID)`
**Returns**: Boolean - true if current user is teacher of specified class
**Purpose**: Bypasses RLS to check class ownership without recursion

#### `can_view_student_profile(student_id UUID)`
**Returns**: Boolean - true if current user (teacher) has student in their class
**Purpose**: Bypasses RLS to check teacher-student relationship without recursion

### Gidouilles Management (Rewards System)

#### `update_student_gidouilles(student_id UUID, delta INTEGER)`
**Returns**: INTEGER - New gidouilles count after update
**Purpose**: Securely updates a single student's gidouilles (reward points)
**Security**:
- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
- Enforces minimum of 0 gidouilles (cannot go negative)
**Usage**:
```sql
-- Add 5 gidouilles to a student
SELECT update_student_gidouilles('student-uuid', 5);

-- Remove 2 gidouilles from a student
SELECT update_student_gidouilles('student-uuid', -2);
```
**Errors**:
- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes
- Raises exception if operation would result in negative gidouilles

#### `update_class_gidouilles(class_id UUID, delta INTEGER)`
**Returns**: INTEGER - Number of students updated
**Purpose**: Updates gidouilles for ALL students in a class at once
**Security**:
- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is the teacher who owns the class
- Only updates students where new value would be >= 0
**Usage**:
```sql
-- Add 10 gidouilles to all students in class
SELECT update_class_gidouilles('class-uuid', 10);

-- Remove 5 gidouilles from all students in class
SELECT update_class_gidouilles('class-uuid', -5);
```
**Behavior**:
- If delta is negative and would cause some students to go below 0, those students are SKIPPED
- Returns count of students actually updated (may be less than total class size if some are skipped)
**Errors**:
- Raises exception if caller is not a teacher
- Raises exception if caller doesn't own the class

### Triggers

#### `update_updated_at_column()`
**Trigger**: Before update on tables with `updated_at`
**Action**: Sets `updated_at = NOW()`

## Indexes

Performance indexes are created for:
- Foreign key relationships
- Common query patterns (teacher→classes, school→classes, etc.)
- RLS policy checks
- Array searches on class_ids (GIN index)
- School-based filtering (`idx_profiles_school_id`)
- Role and school composite queries (`idx_profiles_role_school`)
- Class membership lookups (`idx_class_members_composite`)
- JSONB vip_cards queries (`idx_profiles_vip_cards`)
- Pending student email lookups (`idx_pending_students_email` - partial index for non-activated only)
- Pending student school filtering (`idx_pending_students_school`)

### Query Performance Notes

**Getting all students in a class** (efficient):
```sql
SELECT p.* FROM profiles p
JOIN class_members cm ON p.id = cm.student_id
WHERE cm.class_id = 'class-uuid';
-- Uses idx_class_members_class + idx_profiles_pkey
```

**Getting all classes for a student** (efficient):
```sql
SELECT c.* FROM classes c
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.student_id = 'student-uuid';
-- Uses idx_class_members_student + idx_classes_pkey
```

**Getting student's teacher for a specific class** (efficient):
```sql
SELECT p.* FROM profiles p
JOIN classes c ON p.id = c.teacher_id
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.student_id = 'student-uuid' AND cm.class_id = 'class-uuid';
-- Uses idx_class_members_composite
```

**Admin dashboard: all students in a school** (efficient):
```sql
SELECT * FROM profiles
WHERE role = 'student' AND school_id = 'school-uuid';
-- Uses idx_profiles_role_school
```

## Test Data

The database includes seeded test data for **Lycée Franco-Qatari Voltaire**:

### Teachers (5 total)
- D. Lejolly (existing) - 2nde Maths (MATH2E)
- Prof. Jean Baguette - 6ème Maths (MATH6A)
- Mme. Claire Croissant - 5ème Maths (MATH5B)
- M. Pierre Fromage - 4ème Maths (MATH4C)
- Prof. Marie Escargot - 3ème Maths (MATH3D)

### Classes (5 total)
Each class has a unique join code (e.g., MATH6A, MATH5B, etc.)

### Students (25 total - 5 per class)
All students have:
- Realistic French names
- Email format: `firstname.lastname@voltairedoha.com`
- Appropriate grade level (6ème, 5ème, 4ème, 3ème, 2nde)
- Initial values: `gidouilles = 0`, `vip_cards = {}`

**Note**: These test users cannot authenticate via Google OAuth (dummy passwords). They serve as development/testing data for the UI.

## Usage Examples

### Creating a Class with Join Code

```typescript
const { data, error } = await supabase
  .from('classes')
  .insert({
    teacher_id: session.user.id,
    school_id: 'school-uuid',
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

### Querying Classes with RLS

```typescript
// As a teacher - get your classes
const { data: myClasses } = await supabase
  .from('classes')
  .select('*')
  .eq('teacher_id', session.user.id);

// As a student - get classes you're enrolled in
const { data: enrolledClasses } = await supabase
  .from('classes')
  .select(`
    *,
    class_members!inner(*)
  `)
  .eq('class_members.student_id', session.user.id);

// Get students in your class (as teacher)
const { data: students } = await supabase
  .from('profiles')
  .select(`
    *,
    class_members!inner(*)
  `)
  .eq('class_members.class_id', 'your-class-id')
  .eq('role', 'student');
```
