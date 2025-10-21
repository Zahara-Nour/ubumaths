# Database Schema Documentation

This document describes the database schema for the UbuMaths educational math application.

## Overview

The database is designed to support a complete math learning platform with:

- **User Management**: Students, teachers, and admins
- **School Management**: Multi-school support with school profiles
- **Classroom Management**: Classes and class memberships
- **Friend System**: Mutual friendships with request/accept workflow
- **Real-Time Presence**: WebSocket-based online/offline status

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
    ├─→ classes (teacher_id, school_id FK) → class_members (students)
    │
    ├─→ friendships (requester_id, addressee_id FK) [mutual friend system]
    │       └─ status: pending/accepted/rejected
    │       └─ friendship_type: classmate/mentor
    │
    └─→ user_presence (user_id FK) [real-time online/offline status]
            └─ WebSocket heartbeat (60s interval)
```

## Tables

### Core User Tables

#### `schools`

Educational institutions where students and teachers belong.

| Column     | Type        | Description                                    |
| ---------- | ----------- | ---------------------------------------------- |
| id         | UUID (PK)   | School ID                                      |
| name       | TEXT        | School name                                    |
| city       | TEXT        | City location                                  |
| country    | TEXT        | Country location                               |
| address    | TEXT        | Optional full address                          |
| logo_url   | TEXT        | Optional school logo                           |
| is_active  | BOOLEAN     | Whether school is active                       |
| timetable  | JSONB       | School-level timetable configuration (periods) |
| created_at | TIMESTAMPTZ | Creation time                                  |
| updated_at | TIMESTAMPTZ | Last update time                               |

**Unique Constraint**: (name, city, country) combination must be unique.

**Timetable Structure**:

```json
{
	"periods": [
		{
			"number": 1,
			"name": "Period 1", // Optional custom name
			"start_time": "07:00:00",
			"end_time": "08:00:00"
		},
		{
			"number": 2,
			"start_time": "08:00:00",
			"end_time": "09:00:00"
		}
	]
}
```

The timetable defines standardized periods that teachers must use when creating class schedules. All periods are identical across all days of the week (Sunday-Thursday).

**RLS Policies**:

- Anyone can view schools (needed for registration/selection)
- Only admins can insert, update, or delete schools

#### `profiles`

Extends Supabase's `auth.users` with application-specific data.

| Column     | Type        | Description                                                                      |
| ---------- | ----------- | -------------------------------------------------------------------------------- |
| id         | UUID (PK)   | References auth.users(id)                                                        |
| email      | TEXT        | User's email                                                                     |
| full_name  | TEXT        | User's full name (deprecated)                                                    |
| firstname  | TEXT        | User's first name                                                                |
| lastname   | TEXT        | User's last name                                                                 |
| role       | user_role   | 'student', 'teacher', or 'admin'                                                 |
| school_id  | UUID (FK)   | References schools(id)                                                           |
| avatar_url | TEXT        | URL to user's avatar image                                                       |
| class_ids  | UUID[]      | Array of class IDs (automatically synced from `class_members` table via trigger) |
| grade      | TEXT        | Student's grade level (e.g., "6ème", "5ème", "4ème", "3ème")                     |
| gender     | TEXT        | User's gender ('boy' or 'girl') for avatar fallback purposes                     |
| gidouilles | INTEGER     | Student currency/points for rewards system (default: 0)                          |
| vip_cards  | JSONB       | JSON object storing student VIP cards and their properties                       |
| created_at | TIMESTAMPTZ | Account creation time                                                            |
| updated_at | TIMESTAMPTZ | Last update time                                                                 |

**Note on Student-Teacher Relationship**:
Students don't have a single `teacher_id` because they have different teachers for each class. To find a student's teacher for a specific class, query: `class_members` → `classes.teacher_id`.

**Note on class_ids Column**:
The `class_ids` array is maintained for backward compatibility but is NOT the source of truth. The `class_members` table is the authoritative source for class memberships. A trigger automatically syncs changes from `class_members` to `class_ids` to keep them in sync. Always use `class_members` table when querying or modifying class memberships.

**Automatic Creation**: A trigger automatically creates a profile when a user signs up.

**RLS Policies**:

- Users can view and update their own profile (limited fields)
- Admins can view and update all profiles (including role, school, classes)
- Profile creation allowed (for signup trigger)

### Classroom Management Tables

#### `classes`

Teacher-created groups of students within a school.

| Column      | Type          | Description                           |
| ----------- | ------------- | ------------------------------------- |
| id          | UUID (PK)     | Class ID                              |
| teacher_id  | UUID (FK)     | Teacher who owns class                |
| school_id   | UUID (FK)     | School this class belongs to          |
| name        | TEXT          | Class name                            |
| description | TEXT          | Class description                     |
| join_code   | TEXT (UNIQUE) | 6-character code for students to join |
| is_active   | BOOLEAN       | Whether class is active               |
| created_at  | TIMESTAMPTZ   | Creation time                         |
| updated_at  | TIMESTAMPTZ   | Last update time                      |

**Automatic Join Code**: A function generates unique 6-character codes.

#### `class_members`

Students enrolled in classes. **This is the source of truth for class memberships.**

| Column     | Type        | Description         |
| ---------- | ----------- | ------------------- |
| id         | UUID (PK)   | Membership ID       |
| class_id   | UUID (FK)   | Class               |
| student_id | UUID (FK)   | Student             |
| joined_at  | TIMESTAMPTZ | When student joined |

**Unique Constraint**: A student can only join each class once (student_id, class_id).

**Automatic Synchronization**: Changes to this table automatically update the `profiles.class_ids` array via trigger for backward compatibility. Always modify class memberships through this table, not the `class_ids` array.

#### `class_schedules`

Weekly recurring schedules for teacher's classes (Sunday-Thursday).

| Column        | Type        | Description                                                            |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| id            | UUID (PK)   | Schedule entry ID                                                      |
| class_id      | UUID (FK)   | References classes(id) ON DELETE CASCADE                               |
| teacher_id    | UUID (FK)   | References profiles(id) ON DELETE CASCADE                              |
| day_of_week   | INTEGER     | Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday    |
| start_time    | TIME        | Session start time (derived from period, e.g., 08:00:00)               |
| end_time      | TIME        | Session end time (derived from period, e.g., 09:00:00)                 |
| period_number | INTEGER     | Links to period number in school timetable (source of truth for times) |
| subject       | TEXT        | Optional subject/topic name                                            |
| room          | TEXT        | Optional room number or location                                       |
| notes         | TEXT        | Optional notes or description                                          |
| created_at    | TIMESTAMPTZ | Creation time                                                          |
| updated_at    | TIMESTAMPTZ | Last update time                                                       |

**Constraints**:

- `day_of_week` must be between 0-4 (Sunday-Thursday)
- `end_time` must be greater than `start_time`

**Important**: The `period_number` field links to the school's timetable configuration. When a teacher creates a schedule entry, they select a period from the school timetable, and the `start_time` and `end_time` are automatically populated from that period. This ensures consistency across all classes in the school.

**Indexes**:

- `idx_class_schedules_class_id` - Fast lookup by class
- `idx_class_schedules_teacher_id` - Fast lookup by teacher
- `idx_class_schedules_day` - Fast lookup by day of week
- `idx_class_schedules_period` - Fast lookup by period number
- `idx_class_schedules_composite` - Composite index on (class_id, day_of_week, start_time)

**RLS Policies**:

- Teachers can view, create, update, and delete schedules for their own classes
- Students can view schedules for classes they're enrolled in
- Admins can view and manage all schedules

**Usage**:
Teachers use this table to define their weekly class schedules. The schedule is displayed as a grid in the teacher dashboard at `/dashboard/teacher/classes`, showing Sunday through Thursday with time slots from 7:00 to 18:00.

#### `pending_students`

Pre-populated student data before first authentication.

| Column       | Type          | Description                                      |
| ------------ | ------------- | ------------------------------------------------ |
| id           | UUID (PK)     | Pending student ID                               |
| email        | TEXT (UNIQUE) | Student's email (must match Google account)      |
| firstname    | TEXT          | Student's first name                             |
| lastname     | TEXT          | Student's last name                              |
| grade        | TEXT          | Student's grade level (e.g., "6ème", "5ème")     |
| school_id    | UUID (FK)     | References schools(id)                           |
| gender       | TEXT          | 'boy' or 'girl' for avatar fallback              |
| is_activated | BOOLEAN       | True when student has logged in (default: false) |
| activated_at | TIMESTAMPTZ   | When student first authenticated                 |
| created_at   | TIMESTAMPTZ   | Creation time                                    |
| updated_at   | TIMESTAMPTZ   | Last update time                                 |

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

### Friend System Tables

#### `friendships`

Mutual friend relationships between users with request/accept workflow.

| Column          | Type        | Description                                                 |
| --------------- | ----------- | ----------------------------------------------------------- |
| id              | UUID (PK)   | Friendship ID                                               |
| requester_id    | UUID (FK)   | User who sent friend request                                |
| addressee_id    | UUID (FK)   | User who receives friend request                            |
| status          | TEXT        | 'pending', 'accepted', or 'rejected'                        |
| friendship_type | TEXT        | 'classmate' (student-student) or 'mentor' (teacher-student) |
| created_at      | TIMESTAMPTZ | When request was sent                                       |
| updated_at      | TIMESTAMPTZ | Last status change                                          |

**Unique Constraint**: (requester_id, addressee_id) - prevents duplicate friend requests
**Check Constraint**: requester_id ≠ addressee_id - prevents self-friendship

**Friendship Workflow**:

1. User A sends request to User B → status = 'pending'
2. User B accepts → status = 'accepted' (friends)
3. User B rejects → status = 'rejected'
4. Either user can unfriend → DELETE row

**Friendship Types**:

- `classmate`: Student-to-student friendships
- `mentor`: Teacher-to-student relationships

**RLS Policies**:

- Users can view friendships they're part of (requester or addressee)
- Users can create friend requests (as requester)
- Addressees can update status (accept/reject)
- Users can delete friendships they're part of (unfriend)
- Teachers can view and delete all student friendships (moderation)

#### `user_presence`

Real-time online/offline status tracked via WebSocket heartbeats.

| Column         | Type        | Description                       |
| -------------- | ----------- | --------------------------------- |
| user_id        | UUID (PK)   | References profiles(id)           |
| status         | TEXT        | 'online' or 'offline'             |
| last_heartbeat | TIMESTAMPTZ | Last WebSocket heartbeat received |
| updated_at     | TIMESTAMPTZ | Last status change                |

**WebSocket System**:

- **Heartbeat Interval**: 60 seconds (client sends heartbeat)
- **Timeout**: Users marked offline after 2 minutes without heartbeat
- **Presence Updates**: Friends notified in real-time via WebSocket
- **Privacy**: Only friends can see each other's presence status

**RLS Policies**:

- Users can view their own presence
- Users can view presence of accepted friends only
- Users can update their own presence (via WebSocket server)

**Helper Functions**:

- `upsert_user_presence(user_id, status)` - Update presence (used by WebSocket server)
- `cleanup_stale_presence()` - Mark offline users with old heartbeats
- `get_friend_ids(user_id)` - Get list of friend IDs (for presence broadcasting)

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

### VIP Cards Management (Rewards System)

VIP cards are special reward items that students can earn by spending 3 gidouilles. The cards are stored in a JSONB column on the profiles table, where each card instance has a unique ID, card type, earned timestamp, and optional used timestamp.

**VIP Card Data Structure**:

```json
{
	"uuid-1": { "cardId": "bonus", "earnedAt": "2025-10-13T...", "usedAt": null },
	"uuid-2": { "cardId": "captain", "earnedAt": "2025-10-13T...", "usedAt": "2025-10-14T..." }
}
```

#### `award_random_vip_card(student_id UUID)`

**Returns**: TEXT - The card ID that was awarded (e.g., "bonus", "captain")
**Purpose**: Awards a random VIP card to a student by deducting 3 gidouilles
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
- Ensures student has at least 3 gidouilles before awarding
  **Behavior**:
- Deducts 3 gidouilles from student's balance
- Randomly selects from 26 available VIP cards
- Creates new card instance with unique UUID
- Adds card to student's vip_cards JSONB column
  **Usage**:

```sql
-- Award random VIP card to a student
SELECT award_random_vip_card('student-uuid');
-- Returns: 'bonus' (or any other card ID)
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes
- Raises exception if student has less than 3 gidouilles

#### `use_vip_card(student_id UUID, card_id TEXT)`

**Returns**: BOOLEAN - TRUE if card was successfully used, FALSE if no unused card found
**Purpose**: Marks a VIP card instance as used (consumed) by setting the usedAt timestamp
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
  **Behavior**:
- Finds the oldest unused instance of the specified card
- Sets usedAt timestamp to current time
- Returns FALSE if no unused instance exists
  **Usage**:

```sql
-- Use a bonus card for a student
SELECT use_vip_card('student-uuid', 'bonus');
-- Returns: true (if card was found and used)
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes

#### `remove_student_vip_card(student_id UUID, card_id TEXT)`

**Returns**: BOOLEAN - TRUE if card was successfully removed, FALSE if no card found
**Purpose**: Removes one instance of a VIP card from a student's collection (no gidouilles refund)
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
  **Behavior**:
- Finds the oldest unused instance of the specified card
- Completely removes it from the vip_cards JSONB object
- No gidouilles refund (card is simply deleted)
- Returns FALSE if no unused instance exists
  **Usage**:

```sql
-- Remove a captain card from a student
SELECT remove_student_vip_card('student-uuid', 'captain');
-- Returns: true (if card was found and removed)
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes

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
const { data, error } = await supabase.from('classes').insert({
	teacher_id: session.user.id,
	school_id: 'school-uuid',
	name: 'Algebra 1 - Period 3',
	description: 'Morning algebra class',
	join_code: await supabase.rpc('generate_join_code')
});
```

### Student Joining a Class

```typescript
const { data, error } = await supabase.from('class_members').insert({
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
	.select(
		`
    *,
    class_members!inner(*)
  `
	)
	.eq('class_members.student_id', session.user.id);

// Get students in your class (as teacher)
const { data: students } = await supabase
	.from('profiles')
	.select(
		`
    *,
    class_members!inner(*)
  `
	)
	.eq('class_members.class_id', 'your-class-id')
	.eq('role', 'student');
```

## Navadra Game System

The Navadra game system provides a math-learning RPG experience where students solve math challenges in combat scenarios.

### Game Tables Overview

```
game_players (user progress & stats)
    ↓
game_spell_decks (active spell loadout)
    ↓
game_spells (owned spells)
    ↓
game_challenges (math problems) → game_challenge_attempts (student answers)
    ↓
game_combats (battle sessions) → game_monsters (enemies)
```

### `game_players`

Player progression and statistics.

| Column        | Type        | Description                                               |
| ------------- | ----------- | --------------------------------------------------------- |
| id            | UUID (PK)   | Player ID                                                 |
| user_id       | UUID (FK)   | References profiles(id)                                   |
| level         | INTEGER     | Player level (1-100)                                      |
| xp            | INTEGER     | Total experience points                                   |
| prestige      | INTEGER     | Prestige points (for leaderboards)                        |
| pyrs          | JSONB       | Elemental currency (fire, water, earth, air, light, dark) |
| max_endurance | INTEGER     | Maximum HP in combat                                      |
| created_at    | TIMESTAMPTZ | Account creation                                          |
| updated_at    | TIMESTAMPTZ | Last update                                               |

**RLS**: Users can view and update their own game_players record.

### `game_spells`

Spells (math abilities) owned by players.

| Column     | Type        | Description                                    |
| ---------- | ----------- | ---------------------------------------------- |
| id         | UUID (PK)   | Spell ID                                       |
| user_id    | UUID (FK)   | References profiles(id)                        |
| spell_num  | INTEGER     | Spell slot number (1-10)                       |
| name       | TEXT        | Spell name                                     |
| element    | TEXT        | Element type (fire/water/earth/air/light/dark) |
| attack     | INTEGER     | Base damage value                              |
| cost       | INTEGER     | Pyr cost to cast                               |
| image_url  | TEXT        | Spell icon/image                               |
| created_at | TIMESTAMPTZ | Creation time                                  |
| updated_at | TIMESTAMPTZ | Last update                                    |

**Unique Constraint**: (user_id, spell_num) - each player has 10 spell slots.

**RLS**: Users can view and manage their own spells.

### `game_spell_decks`

Active spell loadouts for combat.

| Column     | Type        | Description                     |
| ---------- | ----------- | ------------------------------- |
| id         | UUID (PK)   | Deck ID                         |
| user_id    | UUID (FK)   | References profiles(id)         |
| name       | TEXT        | Deck name                       |
| spell_ids  | UUID[]      | Array of spell IDs (max 10)     |
| is_active  | BOOLEAN     | Whether this is the active deck |
| created_at | TIMESTAMPTZ | Creation time                   |
| updated_at | TIMESTAMPTZ | Last update                     |

**RLS**: Users can view and manage their own decks.

### `game_challenges`

Math challenge definitions (problems to solve during combat).

| Column     | Type        | Description                                                      |
| ---------- | ----------- | ---------------------------------------------------------------- |
| id         | UUID (PK)   | Challenge ID                                                     |
| name       | TEXT        | Challenge name/description                                       |
| element    | TEXT        | Required element (fire/water/earth/air/light/dark)               |
| difficulty | INTEGER     | Difficulty level (1-10)                                          |
| question   | TEXT        | Question template (supports {variable} placeholders)             |
| variables  | JSONB       | Variable definitions and ranges                                  |
| answer     | JSONB       | Answer definition (can be value, expression, or multiple choice) |
| is_active  | BOOLEAN     | Whether challenge is available                                   |
| created_at | TIMESTAMPTZ | Creation time                                                    |
| updated_at | TIMESTAMPTZ | Last update                                                      |

**Variable System**:
Variables are defined in JSONB format:

```json
{
	"x": { "type": "number", "value": "randomInt(1, 10)" },
	"y": { "type": "number", "value": "randomInt(1, 10)" }
}
```

**Answer Types**:

- Simple value: `["x + y"]`
- Multiple choice: `[{"choice": "A", "determined": true}, {"choice": "B", "determined": false}]`
- Conditional: `[{"if": "x > y", "choice": "{x}"}, {"if": "x <= y", "choice": "{y}"}]`

**Known Limitations**:

- Array values with expression strings are not automatically evaluated
- MathJS array indexing doesn't work with JavaScript arrays
- Variables with complex conditions may fail to evaluate
- Custom function return types may have compatibility issues

Simple challenges work well. Complex challenges with nested dependencies and conditions may require manual testing.

**RLS**: Public read access. Admin-only write access.

### `game_challenge_attempts`

Student answers to challenges (for analytics and progress tracking).

| Column             | Type        | Description                                                     |
| ------------------ | ----------- | --------------------------------------------------------------- |
| id                 | UUID (PK)   | Attempt ID                                                      |
| user_id            | UUID (FK)   | References profiles(id)                                         |
| challenge_id       | UUID (FK)   | References game_challenges(id)                                  |
| combat_id          | UUID (FK)   | References game_combats(id) (optional)                          |
| success            | BOOLEAN     | Whether answer was correct                                      |
| time_taken         | INTEGER     | Time in milliseconds                                            |
| answer_given       | JSONB       | Student's answer                                                |
| correct_answer     | JSONB       | The correct answer (for review)                                 |
| challenge_instance | JSONB       | Specific variable values used (deprecated - not stored anymore) |
| created_at         | TIMESTAMPTZ | Attempt timestamp                                               |

**RLS**: Users can insert their own attempts and view their own history.

### `game_monsters`

Monster/enemy definitions for combat.

| Column        | Type        | Description                                  |
| ------------- | ----------- | -------------------------------------------- |
| id            | UUID (PK)   | Monster ID                                   |
| name          | TEXT        | Monster name                                 |
| element       | TEXT        | Monster element (affects damage calculation) |
| max_endurance | INTEGER     | Monster's maximum HP                         |
| attack        | INTEGER     | Monster's attack power                       |
| image_url     | TEXT        | Monster sprite/image                         |
| loot_xp       | INTEGER     | XP reward for defeating                      |
| loot_prestige | INTEGER     | Prestige reward                              |
| loot_pyrs     | JSONB       | Pyr rewards by element                       |
| is_active     | BOOLEAN     | Whether monster can appear in combat         |
| created_at    | TIMESTAMPTZ | Creation time                                |

**RLS**: Public read access. Admin-only write access.

### `game_combats`

Active and completed combat sessions.

| Column                      | Type        | Description                                         |
| --------------------------- | ----------- | --------------------------------------------------- |
| id                          | UUID (PK)   | Combat ID                                           |
| organizer_id                | UUID (FK)   | References profiles(id) - player who started combat |
| monster_id                  | UUID (FK)   | References game_monsters(id)                        |
| status                      | TEXT        | 'active', 'completed', or 'abandoned'               |
| outcome                     | TEXT        | 'victory', 'defeat', or NULL (if active)            |
| monster_endurance_remaining | INTEGER     | Monster's current HP                                |
| current_round               | INTEGER     | Current combat round                                |
| current_turn                | INTEGER     | Current turn number                                 |
| combat_flow                 | JSONB       | Array of turn history (actions, damage, etc.)       |
| xp_gained                   | INTEGER     | XP earned (if victory)                              |
| prestige_gained             | INTEGER     | Prestige earned (if victory)                        |
| pyrs_gained                 | JSONB       | Pyrs earned (if victory)                            |
| started_at                  | TIMESTAMPTZ | Combat start time                                   |
| completed_at                | TIMESTAMPTZ | Combat end time                                     |
| created_at                  | TIMESTAMPTZ | Creation time                                       |
| updated_at                  | TIMESTAMPTZ | Last update                                         |

**Combat Flow Format**:

```json
[
	{
		"round": 1,
		"turn": 1,
		"player_id": "user-uuid",
		"action": "spell",
		"spell_num": 1,
		"challenge_result": {
			"challenge_id": "challenge-uuid",
			"success": true,
			"time_taken": 5000
		},
		"damage_dealt": 25,
		"timestamp": "2025-10-17T12:00:00Z"
	}
]
```

**RLS**: Users can view and manage their own combats.

### Game Mechanics

#### Element System

- **Elements**: Fire, Water, Earth, Air, Light, Dark
- **Element Matching**: Spells must match challenge element to be castable
- **Damage Calculation**: Based on spell attack, player level, and element effectiveness

#### Combat Flow

1. Player selects a spell from their active deck
2. A challenge matching the spell's element is randomly selected
3. Player solves the math problem
4. **If correct**: Spell damage is dealt to monster
5. **If incorrect**: No damage dealt
6. Combat continues until monster HP reaches 0 (victory) or player gives up

#### Answer Validation

- Client generates challenge instance with random variables
- Client evaluates correct answer using same random seed
- Server validates the answer using client-provided correct answer
- Results are recorded in `game_challenge_attempts` and `game_combats.combat_flow`

**Important**: The server trusts the client-provided correct answer since the challenge variables are randomly generated client-side. This is acceptable for an educational app but should not be used for competitive/ranked modes.

#### Progression System

- **XP**: Gained from defeating monsters, levels up player
- **Prestige**: Leaderboard currency, gained from fast/efficient combat
- **Pyrs**: Elemental currency for buying/upgrading spells
- **Levels**: Increase max endurance and spell effectiveness

### Debug Features

#### Debug Monster (Development Tool)

A special debug action is available at `/dashboard/navadra/combat` for quick testing:

**Action**: `?/spawnDebugMonster`

Creates a very weak monster with:

- **Level**: 1
- **HP**: 1 (dies in one hit!)
- **Element**: Fire
- **Category**: Common
- **Name**: "🐛 [MonsterName] DEBUG"

**Purpose**: Allows rapid testing of victory conditions, reward calculations, and post-combat flows without spending time on multiple challenges.

**Implementation**: See `src/routes/(protected)/dashboard/navadra/combat/+page.server.ts` line 44

#### Victory Panel Response Format

When a combat ends in victory, the server returns rewards in a **nested PostgreSQL array format**:

```javascript
// Server response structure
[
	{ success: 1, damageDealt: 2, victory: 1, rewards: 3 }, // Index 0: Column mappings
	true, // Index 1: success boolean
	26, // Index 2: damageDealt value
	{ xp: 4, prestige: 5, pyrs: 6, element: 7 }, // Index 3: Nested rewards mapping
	50, // Index 4: XP value
	12, // Index 5: Prestige value
	5, // Index 6: Pyrs value
	'fire' // Index 7: Element value
];
```

**Important**: The `rewards` field at index 3 is itself a mapping object that points to the actual reward values at indices 4-7. The client must decode this nested structure to extract the correct reward values.

**Implementation**: See `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.svelte` lines 148-165 for the parsing logic.

### Example Queries

```typescript
// Start a new combat
const { data: combat } = await supabase
	.from('game_combats')
	.insert({
		organizer_id: session.user.id,
		monster_id: 'selected-monster-uuid',
		status: 'active',
		monster_endurance_remaining: monsterMaxHP,
		current_round: 1,
		current_turn: 1,
		combat_flow: []
	})
	.select('*, monster:game_monsters(*)')
	.single();

// Record challenge attempt and update combat
const formData = new FormData();
formData.append('challenge_id', challengeId);
formData.append('answer', JSON.stringify(studentAnswer));
formData.append('correct_answer', JSON.stringify(correctAnswer));
formData.append('time_taken', String(milliseconds));
formData.append('spell_num', String(spellSlotNumber));

const result = await fetch('?/submitAnswer', {
	method: 'POST',
	body: formData,
	headers: { 'x-sveltekit-action': 'true' }
});

// Get player's combat history
const { data: combats } = await supabase
	.from('game_combats')
	.select('*, monster:game_monsters(*)')
	.eq('organizer_id', session.user.id)
	.order('created_at', { ascending: false });
```

---

## Question Bank System

### `question_templates`

Stores mathematical question templates with variable support, multiple variations, and categorization.

| Column               | Type        | Description                                                       |
| -------------------- | ----------- | ----------------------------------------------------------------- |
| id                   | UUID (PK)   | Template ID                                                       |
| title                | TEXT        | Template title (supports LaTeX, required)                         |
| description          | TEXT        | Optional description for documentation and student context        |
| type                 | TEXT        | Question type (see types below)                                   |
| variations           | JSONB       | Array of question variations (statement, variables, answer, etc.) |
| exercise_instruction | TEXT        | Optional exercise-level instruction shared across all variations  |
| grades               | TEXT[]      | Applicable grade levels (CP, CE1, 6, 5, etc.)                     |
| theme                | TEXT        | Broad subject area (e.g., "Algèbre", "Géométrie")                 |
| domain               | TEXT        | Specific topic (e.g., "Équations", "Triangles")                   |
| subdomain            | TEXT        | Optional sub-topic (e.g., "Linéaires", "Quadratiques")            |
| level                | INTEGER     | Difficulty level (positive integer, no max)                       |
| status               | TEXT        | Template status: 'draft' or 'published'                           |
| delay                | INTEGER     | Time limit in seconds (optional)                                  |
| precision            | JSONB       | Precision specification for numerical questions                   |
| transform_type       | TEXT        | Type of algebraic transformation (for algebraic_transform type)   |
| multiple_answers     | BOOLEAN     | Allow multiple correct answers (for multiple_choice type)         |
| created_at           | TIMESTAMPTZ | Creation time                                                     |
| updated_at           | TIMESTAMPTZ | Last update time                                                  |
| created_by           | UUID (FK)   | References profiles(id)                                           |

#### Question Types

- `numerical_exact`: Exact numerical answer (fractions, integers)
- `numerical_decimal`: Decimal answer with precision
- `numerical_rounded`: Rounded answer with rounding rules
- `algebraic_transform`: Algebraic expression transformation
- `fill_in_blanks`: Fill-in-the-blank questions
- `multiple_choice`: Multiple choice questions (QCM)

#### Status Field

Templates have two statuses:

- **`draft`**: Work-in-progress templates
  - Can be incomplete (missing required fields)
  - No validation enforced
  - Can have duplicate categories
  - Not affected by filters in the questions list
- **`published`**: Active, complete templates
  - Full validation enforced
  - Must have unique category (theme + domain + subdomain + level)
  - Affected by all filters in the questions list
  - Used for generating question instances

#### Category Uniqueness

Published templates must have a **unique category combination**:

- **Category** = `theme` + `domain` + `subdomain` + `level`
- Enforced via partial unique index:
  ```sql
  CREATE UNIQUE INDEX idx_question_templates_unique_category
  ON question_templates(theme, domain, COALESCE(subdomain, ''), level)
  WHERE status = 'published';
  ```
- Draft templates are excluded from this constraint
- Auto-adjustment: If creating a published template with duplicate category, level is automatically adjusted to max+1

#### Variations Structure

Each template contains one or more variations (stored as JSONB array):

```json
{
	"variations": [
		{
			"statement": [
				{ "type": "text", "content": "Calculer {a} + {b}" },
				{ "type": "image", "url": "https://..." }
			],
			"variables": [
				{
					"name": "a",
					"type": "random",
					"min": 1,
					"max": 10,
					"exclude": [5]
				},
				{
					"name": "b",
					"type": "random",
					"min": 1,
					"max": 10
				},
				{
					"name": "result",
					"type": "eval",
					"expression": "{a} + {b}"
				}
			],
			"answer": "{result}",
			"correction": [{ "type": "text", "content": "La somme est {result}" }],
			"blanks": [], // For fill_in_blanks type
			"choices": [] // For multiple_choice type
		}
	]
}
```

#### Indexes

- `idx_question_templates_type`: Filter by question type
- `idx_question_templates_title`: Regular index for sorting/filtering by title
- `idx_question_templates_title_search`: GIN index for full-text search on title (French config)
- `idx_question_templates_grades`: GIN index for grade filtering
- `idx_question_templates_created_by`: Filter by creator
- `idx_question_templates_created_at`: Sort by creation date
- `idx_question_templates_status`: Filter by status
- `idx_question_templates_theme`: Filter by theme
- `idx_question_templates_domain`: Filter by domain
- `idx_question_templates_subdomain`: Filter by subdomain (partial)
- `idx_question_templates_level`: Filter by level
- `idx_question_templates_categories`: Composite (theme, domain, level)
- `idx_question_templates_unique_category`: Unique constraint for published templates

#### RLS Policies

- Teachers and admins can view all templates
- Only admins can create, update, or delete templates

#### Client-Side Cache

A category cache system prevents duplicate API calls:

- **Store**: `src/lib/stores/questionCategories.svelte.ts`
- **API**: `GET /api/questions/categories/all`
- **Cache Duration**: 5 minutes
- **Usage**: Real-time duplicate detection in question forms

#### Workflow: Draft → Published

1. **Create Draft** (status = 'draft'):
   - No validation enforced
   - Can be incomplete
   - Saved with "Enregistrer brouillon" button

2. **Publish** (status = 'published'):
   - Full validation enforced (required fields, circular dependencies)
   - Category uniqueness check
   - If duplicate category detected:
     - Show confirmation dialog with suggested level (max + 1)
     - Auto-adjust level on confirmation
   - Saved with "Publier" button

3. **Edit Published**:
   - Full validation maintained
   - Cannot change category to an existing one
   - Server returns 400 error if duplicate detected

#### Admin Interface

The questions list (`/dashboard/admin/questions`) has two tabs:

- **Brouillons**: All draft templates
  - Sorted by modification date (descending)
  - Always visible
  - Not affected by filters
  - Badge: Orange "Brouillon"

- **Publiés**: Published templates
  - Filterable by: type, grades, theme, domain, subdomain, level range
  - Sortable by: type, creation date
  - Paginated (50 per page)
  - Badge: Green "Publié"

#### Example Queries

```typescript
// Fetch all published templates with filters
const { data: templates } = await supabase
	.from('question_templates')
	.select('*')
	.eq('status', 'published')
	.eq('theme', 'Algèbre')
	.eq('domain', 'Équations')
	.gte('level', 1)
	.lte('level', 5)
	.overlaps('grades', ['6', '5'])
	.order('created_at', { ascending: false });

// Fetch all drafts (sorted by modification date)
const { data: drafts } = await supabase
	.from('question_templates')
	.select('*')
	.eq('status', 'draft')
	.order('updated_at', { ascending: false });

// Check category uniqueness (published only)
const { data: existing } = await supabase
	.from('question_templates')
	.select('id')
	.eq('status', 'published')
	.eq('theme', 'Algèbre')
	.eq('domain', 'Équations')
	.is('subdomain', null)
	.eq('level', 3)
	.single();

// Get next available level in category
const { data: maxLevel } = await supabase
	.from('question_templates')
	.select('level')
	.eq('status', 'published')
	.eq('theme', 'Algèbre')
	.eq('domain', 'Équations')
	.is('subdomain', null)
	.order('level', { ascending: false })
	.limit(1)
	.single();
```

#### Related Documentation

See **[CLAUDE_FEATURES_QUESTION_BANK.md](CLAUDE_FEATURES_QUESTION_BANK.md)** for detailed documentation on:

- Variable resolution system
- Question types and validation
- Instance generation
- Answer checking
