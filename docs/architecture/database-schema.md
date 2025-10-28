# Database Schema Documentation

This document describes the database schema for the UbuMaths educational math application.

## Overview

The database is designed to support a complete math learning platform with:

- **User Management**: Students, teachers, and admins
- **School Management**: Multi-school support with school profiles
- **Classroom Management**: Classes and class memberships
- **Friend System**: Mutual friendships with request/accept workflow
- **Real-Time Presence**: WebSocket-based online/offline status
- **Error Monitoring**: Comprehensive error logging and tracking system (NEW)

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

### Academic Calendar Tables

> 🆕 2025-10-28

The academic calendar system manages school years, teaching periods (trimesters/semesters), and vacation schedules. See [Academic Periods Feature Documentation](../features/academic-periods/README.md) for complete details.

#### `school_years`

Academic year definitions (e.g., "2024-2025") with one active year per school.

| Column     | Type        | Description                                 |
| ---------- | ----------- | ------------------------------------------- |
| id         | UUID (PK)   | School year ID                              |
| school_id  | UUID (FK)   | References schools(id)                      |
| name       | TEXT        | Year name (format: "YYYY-YYYY")             |
| start_date | DATE        | Academic year start date                    |
| end_date   | DATE        | Academic year end date                      |
| is_active  | BOOLEAN     | Active year flag (only one per school)      |
| metadata   | JSONB       | Extensible metadata (region, custom fields) |
| created_at | TIMESTAMPTZ | Creation time                               |
| updated_at | TIMESTAMPTZ | Last update time                            |

**Constraints**:

- `UNIQUE (school_id, name)` - Unique year name per school
- `CHECK (end_date > start_date)` - Valid date range
- `UNIQUE NULLS NOT DISTINCT (school_id, CASE WHEN is_active THEN TRUE END)` - Only one active year per school

**Indexes**:

- `idx_school_years_school` ON (school_id)
- `idx_school_years_active` ON (school_id, is_active) WHERE is_active = true

**RLS Policies**:

- Admins: Full CRUD access for their school
- Teachers: Read-only access for their school

**Migration**: `20251028120000_create_school_years.sql`

---

#### `academic_periods`

Teaching periods (trimesters, semesters, quarters) within school years.

| Column         | Type        | Description                                               |
| -------------- | ----------- | --------------------------------------------------------- |
| id             | UUID (PK)   | Period ID                                                 |
| school_year_id | UUID (FK)   | References school_years(id)                               |
| type           | TEXT        | Period type: 'trimester', 'semester', 'quarter', 'custom' |
| name           | TEXT        | Period name (e.g., "Trimestre 1")                         |
| start_date     | DATE        | Period start date                                         |
| end_date       | DATE        | Period end date                                           |
| period_order   | INTEGER     | Sequential order (1-10)                                   |
| color          | TEXT        | Hex color for UI (#RRGGBB, default: #3b82f6)              |
| metadata       | JSONB       | Extensible metadata                                       |
| created_at     | TIMESTAMPTZ | Creation time                                             |
| updated_at     | TIMESTAMPTZ | Last update time                                          |

**Constraints**:

- `CHECK (end_date > start_date)` - Valid date range
- `UNIQUE (school_year_id, period_order)` - Unique order per year
- `CHECK (type IN ('trimester', 'semester', 'quarter', 'custom'))` - Valid period type
- `CHECK (period_order > 0)` - Positive order

**Indexes**:

- `idx_academic_periods_year` ON (school_year_id)
- `idx_academic_periods_order` ON (school_year_id, period_order)

**RLS Policies**:

- Admins: Full CRUD access for their school's years
- Teachers: Read-only access for their school's years

**Migration**: `20251028120100_create_academic_periods.sql`

---

#### `school_holidays`

School vacation periods within academic years.

| Column         | Type        | Description                             |
| -------------- | ----------- | --------------------------------------- |
| id             | UUID (PK)   | Holiday ID                              |
| school_year_id | UUID (FK)   | References school_years(id)             |
| name           | TEXT        | Holiday name (e.g., "Vacances de Noël") |
| start_date     | DATE        | Holiday start date                      |
| end_date       | DATE        | Holiday end date                        |
| created_at     | TIMESTAMPTZ | Creation time                           |
| updated_at     | TIMESTAMPTZ | Last update time                        |

**Constraints**:

- `CHECK (end_date > start_date)` - Valid date range

**Indexes**:

- `idx_school_holidays_year` ON (school_year_id)
- `idx_school_holidays_dates` ON (start_date, end_date)

**RLS Policies**:

- Admins: Full CRUD access for their school's years
- Teachers: Read-only access for their school's years

**Migration**: `20251028120200_create_school_holidays.sql`

---

#### `assessments` (Extended)

**Added Column** (2025-10-28):

| Column             | Type                | Description                     |
| ------------------ | ------------------- | ------------------------------- |
| academic_period_id | UUID (FK, nullable) | References academic_periods(id) |

**Purpose**: Links assessments to academic periods for report card generation and statistics. Auto-assigned by trigger based on assessment creation date.

**Index**:

- `idx_assessments_period` ON (academic_period_id)

**Trigger**: `auto_assign_assessment_period` - Automatically links new assessments to matching period based on created_at date and active school year.

**Migration**: `20251028120300_link_assessments_to_periods.sql`

**Related Documentation**: See [Assessment System](../features/assessments/) for full details.

---

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

### Error Monitoring Tables

#### `error_logs`

Comprehensive error logging for application monitoring and debugging.

| Column           | Type        | Description                                      |
| ---------------- | ----------- | ------------------------------------------------ |
| id               | UUID (PK)   | Error log ID                                     |
| error_type       | TEXT        | 'client_js', 'server_api', 'server_load', etc.   |
| severity         | TEXT        | 'info', 'warning', 'error', 'critical'           |
| message          | TEXT        | Error message (max 1000 chars)                   |
| stack_trace      | TEXT        | Full stack trace (sanitized, max 5000 chars)     |
| error_name       | TEXT        | Error constructor name (TypeError, etc.)         |
| url              | TEXT        | Page URL or API endpoint                         |
| file_path        | TEXT        | File where error occurred                        |
| line_number      | INTEGER     | Line number in file                              |
| column_number    | INTEGER     | Column number in file                            |
| user_id          | UUID (FK)   | References profiles(id)                          |
| user_role        | TEXT        | 'student', 'teacher', 'admin'                    |
| session_id       | TEXT        | Session identifier                               |
| request_method   | TEXT        | HTTP method (GET, POST, etc.)                    |
| status_code      | INTEGER     | HTTP status code                                 |
| request_headers  | JSONB       | Sanitized request headers                        |
| request_body     | JSONB       | Sanitized request body                           |
| response_time    | INTEGER     | Response time in milliseconds                    |
| user_agent       | TEXT        | Browser user agent string                        |
| browser_name     | TEXT        | Browser name (Chrome, Firefox, etc.)             |
| browser_version  | TEXT        | Browser version                                  |
| os_name          | TEXT        | Operating system (Windows, macOS, etc.)          |
| device_type      | TEXT        | 'mobile', 'tablet', 'desktop'                    |
| viewport_width   | INTEGER     | Browser viewport width                           |
| viewport_height  | INTEGER     | Browser viewport height                          |
| context          | JSONB       | Additional error-specific data (sanitized)       |
| tags             | TEXT[]      | Tags for categorization                          |
| resolved         | BOOLEAN     | Whether error has been resolved (default: false) |
| resolved_by      | UUID (FK)   | Admin who resolved the error                     |
| resolved_at      | TIMESTAMPTZ | When error was resolved                          |
| resolution_notes | TEXT        | Notes about how error was fixed                  |
| error_signature  | TEXT        | SHA-256 hash for deduplication (auto-generated)  |
| created_at       | TIMESTAMPTZ | When error occurred                              |

**Key Features**:

- **Automatic Sanitization**: Passwords, tokens, API keys, emails removed from contexts
- **Privacy Protection**: Student data protected, PII redacted
- **Error Deduplication**: Automatic signature generation via trigger
- **Admin-Only Access**: RLS enforced for viewing/resolving
- **Service Role Insert**: Error logging bypasses RLS using service role key

**Indexes**:

- `idx_error_logs_created_at` - Time-based queries (DESC)
- `idx_error_logs_user_id` - User-specific errors (partial, WHERE user_id IS NOT NULL)
- `idx_error_logs_type_severity` - Filtering by type and severity
- `idx_error_logs_unresolved` - Active errors dashboard (partial, WHERE resolved = FALSE)
- `idx_error_logs_resolved` - Resolved errors (partial, WHERE resolved = TRUE)
- `idx_error_logs_signature` - Deduplication lookups (partial, WHERE error_signature IS NOT NULL)
- `idx_error_logs_url` - URL-based filtering
- `idx_error_logs_session` - Session tracking (partial, WHERE session_id IS NOT NULL)

**Triggers**:

- `trigger_set_error_signature` - Auto-generates error signature before insert
- `trigger_update_error_occurrence` - Updates occurrence tracking after insert

**RLS Policies**:

- Admins: Full SELECT, INSERT, UPDATE, DELETE access
- Service Role: INSERT access (for error logging from any context)
- Students/Teachers: No access

#### `error_occurrences`

Tracks frequency and patterns of duplicate errors for efficient monitoring.

| Column            | Type        | Description                             |
| ----------------- | ----------- | --------------------------------------- |
| id                | UUID (PK)   | Occurrence record ID                    |
| error_signature   | TEXT UNIQUE | Unique error hash (from error_logs)     |
| error_type        | TEXT        | Error type (denormalized for filtering) |
| severity          | TEXT        | Severity level (denormalized)           |
| message           | TEXT        | Error message (denormalized)            |
| url               | TEXT        | URL where error occurred (denormalized) |
| file_path         | TEXT        | File path (denormalized)                |
| line_number       | INTEGER     | Line number (denormalized)              |
| first_seen        | TIMESTAMPTZ | When error first occurred               |
| last_seen         | TIMESTAMPTZ | Most recent occurrence                  |
| occurrence_count  | INTEGER     | Number of times error occurred          |
| last_error_log_id | UUID (FK)   | Most recent error_logs entry            |
| is_resolved       | BOOLEAN     | Whether all instances are resolved      |
| created_at        | TIMESTAMPTZ | Record creation time                    |
| updated_at        | TIMESTAMPTZ | Last update time                        |

**Key Features**:

- **Automatic Updates**: Incremented via trigger on error_logs insert
- **Deduplication**: Groups identical errors by signature
- **Performance**: Reduces dashboard query load
- **Resolution Tracking**: Bulk resolution by signature

**Indexes**:

- `idx_error_occurrences_signature` - Primary lookup
- `idx_error_occurrences_last_seen` - Recent errors (DESC)
- `idx_error_occurrences_count` - Most frequent errors (DESC)
- `idx_error_occurrences_unresolved` - Active occurrences (partial, WHERE is_resolved = FALSE)
- `idx_error_occurrences_type_severity` - Filtering

**Triggers**:

- `trigger_error_occurrences_updated_at` - Auto-updates updated_at timestamp

**RLS Policies**:

- Admins: Full SELECT access
- Service Role: Full access (for automatic updates)
- Students/Teachers: No access

**Helper Functions**:

- `generate_error_signature(type, message, file, line)` - Creates SHA-256 hash
- `upsert_error_occurrence(signature, log_id, ...)` - Creates/updates occurrence record
- `cleanup_old_errors(days_old)` - Removes resolved errors older than N days
- `get_error_stats(hours)` - Returns error statistics for dashboard
- `resolve_error(error_log_id, resolved_by, notes)` - Marks error as resolved
- `resolve_error_by_signature(signature, resolved_by, notes)` - Bulk resolves by signature

**Usage**:

Error monitoring is fully automatic:

- Client-side errors captured via `hooks.client.ts`
- Server-side errors captured via `hooks.server.ts`
- Manual capture: `captureError()`, `captureValidationError()`, `capturePerformance()`
- Admin dashboard: `/dashboard/admin/errors`
- Critical errors trigger automatic notifications to admins

**Documentation**: See `ERROR_MONITORING_SYSTEM.md` and `ERROR_MONITORING_QUICK_START.md`

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

---

## Notification System

### Notification System Tables

The notification system allows teachers and admins to send targeted notifications to users, and automatically generates system notifications for important events (new assignments, rewards, etc.).

#### `notifications`

Stores all notification data with intelligent targeting system.

| Column            | Type        | Description                                                  |
| ----------------- | ----------- | ------------------------------------------------------------ |
| id                | UUID (PK)   | Notification ID                                              |
| created_at        | TIMESTAMPTZ | Creation timestamp                                           |
| created_by        | UUID (FK)   | References profiles(id), null for system notifications       |
| title             | TEXT        | Notification title                                           |
| message           | TEXT        | Rich text HTML content                                       |
| type              | TEXT        | 'info', 'alert', 'announcement', or 'reminder'               |
| priority          | TEXT        | 'normal', 'important', or 'urgent' (affects display order)   |
| action_label      | TEXT        | Optional action button label (e.g., "Voir le devoir")        |
| action_url        | TEXT        | Optional action URL (e.g., "/dashboard/student/devoirs/123") |
| target_type       | TEXT        | 'all', 'role', 'classes', or 'users'                         |
| target_roles      | TEXT[]      | Target roles if target_type='role' (e.g., ['student'])       |
| target_class_ids  | UUID[]      | Target class IDs if target_type='classes'                    |
| target_user_ids   | UUID[]      | Target user IDs if target_type='users'                       |
| expires_at        | TIMESTAMPTZ | Expiration date (default: 30 days from creation)             |
| deleted_at        | TIMESTAMPTZ | Soft delete timestamp (by creator or admin)                  |
| is_system         | BOOLEAN     | True if created automatically by the system                  |
| system_event_type | TEXT        | Event type for system notifications (see below)              |

**System Event Types**:

- `assignment_created`: New assignment posted
- `resource_added`: New resource shared
- `reward_earned`: Gidouilles or VIP card earned
- `badge_unlocked`: New badge unlocked
- `maintenance_scheduled`: System maintenance announcement
- `feature_released`: New feature announcement

**Targeting Logic**:

- `target_type='all'`: All users receive the notification
- `target_type='role'`: Users with roles in `target_roles` array
- `target_type='classes'`: Students in classes from `target_class_ids` array
- `target_type='users'`: Specific users from `target_user_ids` array

**Indexes**:

```sql
CREATE INDEX idx_notifications_active ON notifications(created_at DESC)
  WHERE deleted_at IS NULL AND expires_at > now();

CREATE INDEX idx_notifications_created_by ON notifications(created_by)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_target_type ON notifications(target_type)
  WHERE deleted_at IS NULL AND expires_at > now();
```

**RLS Policies**:

1. **View Notifications**: Users can view notifications that target them
   - All users if `target_type='all'`
   - Users with matching role if `target_type='role'`
   - Students in target classes if `target_type='classes'`
   - Directly targeted users if `target_type='users'`
   - Creators can always see their own notifications

2. **Create Notifications**:
   - Teachers: Can target their own classes or students
   - Admins: Can create any notification

3. **Delete (soft delete)**:
   - Users: Can delete their own notifications
   - Admins: Can delete any notification

#### `notification_reads`

Tracks which users have read which notifications.

| Column          | Type        | Description                           |
| --------------- | ----------- | ------------------------------------- |
| id              | UUID (PK)   | Read record ID                        |
| notification_id | UUID (FK)   | References notifications(id)          |
| user_id         | UUID (FK)   | References profiles(id)               |
| read_at         | TIMESTAMPTZ | When the notification was marked read |
| created_at      | TIMESTAMPTZ | Record creation timestamp             |

**Unique Constraint**: (notification_id, user_id) - prevents duplicate reads

**Indexes**:

```sql
CREATE INDEX idx_notification_reads_user ON notification_reads(user_id, notification_id);
CREATE INDEX idx_notification_reads_notification ON notification_reads(notification_id);
```

**RLS Policies**:

1. **View**: Users can view their own read status
2. **Insert**: Users can mark notifications as read (for themselves only)
3. **Stats**: Creators and admins can view read statistics for their notifications

#### Notification Lifecycle

1. **Creation**:
   - Manual: Teacher/admin creates via UI
   - Automatic: System event triggers notification

2. **Delivery**:
   - Notifications are not sent to individual users
   - Each user's unread notifications are computed on-demand via queries

3. **Reading**:
   - User marks notification as read
   - Insert into `notification_reads` table
   - Notification disappears from unread list

4. **Expiration**:
   - Default: 30 days from creation
   - Expired notifications are filtered from queries
   - Cleanup job can hard-delete expired notifications

5. **Deletion**:
   - Soft delete: `deleted_at` timestamp set
   - Deleted notifications are filtered from all queries
   - Hard delete: Optional cleanup after expiration

#### Notification Priority Display

In the banner carousel and dropdown, notifications are sorted by:

1. Priority (urgent → important → normal)
2. Creation date (newest first)

#### Example Queries

**Get unread notifications for current user**:

```typescript
const { data: notifications } = await supabase
	.from('notifications')
	.select(
		`
		*,
		creator:profiles!created_by(firstname, lastname)
	`
	)
	.is('deleted_at', null)
	.gt('expires_at', new Date().toISOString())
	.or(
		`target_type.eq.all,` +
			`and(target_type.eq.role,target_roles.cs.{${userRole}}),` +
			`and(target_type.eq.classes,target_class_ids.cs.{${userClassIds.join(',')}}),` +
			`and(target_type.eq.users,target_user_ids.cs.{${userId}})`
	)
	.not(
		'id',
		'in',
		`(
		SELECT notification_id FROM notification_reads WHERE user_id = '${userId}'
	)`
	)
	.order('priority', { ascending: false }) // urgent first
	.order('created_at', { ascending: false });
```

**Mark notification as read**:

```typescript
await supabase.from('notification_reads').insert({
	notification_id: notificationId,
	user_id: userId
});
```

**Get read statistics for a notification**:

```typescript
// Total potential recipients (example for class-targeted notification)
const { count: totalCount } = await supabase
	.from('class_members')
	.select('*', { count: 'exact', head: true })
	.in('class_id', targetClassIds);

// Read count
const { count: readCount } = await supabase
	.from('notification_reads')
	.select('*', { count: 'exact', head: true })
	.eq('notification_id', notificationId);

// Display: "Lu par 18/24"
```

**Create system notification**:

```typescript
await supabase.from('notifications').insert({
	title: 'Nouveau devoir assigné',
	message: `<p>Le professeur ${teacherName} a assigné un nouveau devoir : <strong>${assignmentTitle}</strong></p>`,
	type: 'info',
	priority: 'normal',
	action_label: 'Voir le devoir',
	action_url: `/dashboard/student/devoirs/${assignmentId}`,
	target_type: 'classes',
	target_class_ids: [classId],
	is_system: true,
	system_event_type: 'assignment_created'
});
```

#### UI Components

The notification system includes:

1. **NotificationBanner**: Sticky carousel at top of dashboard showing urgent/unread notifications
2. **NotificationBadge**: Sidebar icon with unread count badge
3. **NotificationDropdown**: Popover showing recent unread notifications
4. **NotificationList**: Full page showing all unread notifications
5. **NotificationForm**: Creation interface for teachers/admins
6. **NotificationManagement**: Page showing sent notifications with read statistics

#### Automatic Notifications

The system automatically creates notifications for:

| Event                 | Trigger                   | Target             | Priority  |
| --------------------- | ------------------------- | ------------------ | --------- |
| Assignment created    | Assignment form action    | Class students     | Normal    |
| Resource added        | Resource upload           | Class students     | Normal    |
| Reward earned         | Gidouilles/VIP card award | Individual student | Normal    |
| Badge unlocked        | Badge achievement         | Individual student | Normal    |
| Maintenance scheduled | Admin manual              | All users          | Important |
| Feature released      | Admin manual              | All or role-based  | Normal    |

## Assessment System

The assessment system allows teachers to create graded evaluations based on the question cart categories, assign them to classes or individual students, track attempts, and view results.

### Assessment System Tables

#### `assessments`

Teacher-created assessments/evaluations with configurable settings.

| Column      | Type        | Description                                                 |
| ----------- | ----------- | ----------------------------------------------------------- |
| id          | UUID (PK)   | Assessment ID                                               |
| title       | TEXT        | Assessment title                                            |
| grade       | TEXT        | Grade level (e.g., '6ème', '5ème', '4ème', '3ème')          |
| description | TEXT        | Optional description of the assessment                      |
| created_by  | UUID (FK)   | Teacher who created the assessment → profiles(id)           |
| categories  | JSONB       | Array of CartItem objects (same structure as question cart) |
| settings    | JSONB       | Assessment settings (see below)                             |
| status      | TEXT        | 'draft', 'published', or 'archived'                         |
| created_at  | TIMESTAMPTZ | Creation timestamp                                          |
| updated_at  | TIMESTAMPTZ | Last update timestamp (auto-updated via trigger)            |

**Settings Structure (JSONB)**:

```json
{
  "max_attempts": null | number,      // null = unlimited attempts
  "time_limit": null | number,        // Total time limit in seconds, null = no limit
  "deadline": null | string,          // ISO timestamp, null = no deadline
  "shuffle_questions": boolean        // Whether to randomize question order
}
```

**Categories Structure (JSONB)**: Same as question cart `CartItem[]`

```typescript
interface CartItem {
	category: {
		theme: string;
		domain: string;
		subdomain: string | null;
		level: string;
	};
	quantity: number; // Number of questions
	delay: number; // Time per question (seconds)
}
```

#### `assessment_assignments`

Tracks which assessments are assigned to which classes or students.

| Column        | Type        | Description                                               |
| ------------- | ----------- | --------------------------------------------------------- |
| id            | UUID (PK)   | Assignment ID                                             |
| assessment_id | UUID (FK)   | Assessment reference → assessments(id)                    |
| class_id      | UUID (FK)   | Class assignment → classes(id) (null if student-specific) |
| student_id    | UUID (FK)   | Student assignment → profiles(id) (null if class-wide)    |
| assigned_by   | UUID (FK)   | Teacher who made the assignment → profiles(id)            |
| assigned_at   | TIMESTAMPTZ | Assignment timestamp                                      |

**Constraint**: Must target either a class OR a student, not both or neither:

```sql
CHECK (
  (class_id IS NOT NULL AND student_id IS NULL) OR
  (class_id IS NULL AND student_id IS NOT NULL)
)
```

#### `test_sessions` (modified)

Modified to support assessment assignments. Added column:

| Column        | Type      | Description                                               |
| ------------- | --------- | --------------------------------------------------------- |
| assignment_id | UUID (FK) | Reference to assessment assignment (null = free practice) |

All other columns remain unchanged from the existing test sessions table.

#### `assessment_results` (view)

Aggregated view for teacher dashboard showing best attempt per student for each assignment.

| Column            | Type        | Description                                             |
| ----------------- | ----------- | ------------------------------------------------------- |
| assignment_id     | UUID        | Assignment ID                                           |
| assessment_id     | UUID        | Assessment ID                                           |
| assessment_title  | TEXT        | Assessment title                                        |
| assessment_grade  | TEXT        | Assessment grade level                                  |
| class_id          | UUID        | Class ID (if assigned to class)                         |
| student_id        | UUID        | Student ID                                              |
| student_user_id   | UUID        | Student's user ID                                       |
| student_firstname | TEXT        | Student first name                                      |
| student_lastname  | TEXT        | Student last name                                       |
| class_name        | TEXT        | Class name (if assigned to class)                       |
| best_score        | NUMERIC     | Highest score among all attempts (0-10 scale)           |
| attempts_count    | INTEGER     | Number of attempts made                                 |
| last_attempt_at   | TIMESTAMPTZ | Timestamp of most recent attempt                        |
| status            | TEXT        | 'not_started', 'in_progress', 'completed', or 'expired' |
| total_questions   | INTEGER     | Total number of questions                               |

### Assessment Workflow

#### 1. Creation (Teacher)

1. Teacher adds questions to cart from Automaths (/automaths)
2. Teacher navigates to "Create Assessment" (/dashboard/teacher/assessments/new)
3. Three-step wizard:
   - Step 1: Review selected question categories from cart
   - Step 2: Configure assessment (title, grade, settings)
   - Step 3: Review and publish (or save as draft)
4. Assessment created with status='draft' or 'published'

#### 2. Assignment (Teacher)

1. Only **published** assessments can be assigned
2. Teacher navigates to assessment detail and clicks "Assign"
3. Teacher selects classes or individual students
4. System creates assessment_assignments records
5. Students in assigned classes can now see the assessment

#### 3. Taking Assessment (Student)

1. Student sees assigned assessment on dashboard (/dashboard/student/assessments)
2. Student clicks "Commencer" (Start)
3. System validates:
   - Deadline not passed
   - Max attempts not exceeded
   - Assessment is published
4. Student is redirected to test page: `/automaths/test?assignment={assignmentId}&mode=interactive`
5. Test page loads assessment categories and generates questions
6. Student completes test in interactive mode
7. Results saved to test_sessions with assignment_id link

#### 4. Viewing Results

**Teachers** (/dashboard/teacher/assessments/{id}/results):

- Overall statistics (completion rate, average score, etc.)
- Student-by-student results table
- Can see all attempts for each student

**Students** (/dashboard/student/assessments/{id}/results):

- Personal statistics (best score, average, attempts)
- History of all attempts with scores and timestamps
- Cannot see other students' results

### Status Logic

**Assessment Status** (stored in `assessments.status`):

- `draft`: Being created, not yet published, cannot be assigned
- `published`: Active and can be assigned to students
- `archived`: No longer active, hidden from default views

**Student Assignment Status** (derived in views/queries):

- `not_started`: Student has never attempted (attempts_count = 0, deadline not passed)
- `in_progress`: Student started but hasn't completed any attempt (attempts_count > 0, no completed_at)
- `completed`: Student completed at least one attempt (has completed_at)
- `expired`: Deadline passed without any attempts (attempts_count = 0, deadline passed)

### Indexes

Performance indexes for efficient queries:

```sql
-- Assessments
CREATE INDEX idx_assessments_created_by ON assessments(created_by);
CREATE INDEX idx_assessments_grade ON assessments(grade);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);

-- Assignments
CREATE INDEX idx_assessment_assignments_assessment_id ON assessment_assignments(assessment_id);
CREATE INDEX idx_assessment_assignments_class_id ON assessment_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_assessment_assignments_student_id ON assessment_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_assessment_assignments_assigned_by ON assessment_assignments(assigned_by);

-- Test sessions (for assignment lookup)
CREATE INDEX idx_test_sessions_assignment_id ON test_sessions(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_test_sessions_assignment_user ON test_sessions(assignment_id, user_id) WHERE assignment_id IS NOT NULL;
```

### RLS Policies

#### Assessments

**Teachers**:

- Can view their own assessments: `created_by = auth.uid()`
- Can create assessments: `role = 'teacher' AND created_by = auth.uid()`
- Can update/delete their own assessments

**Students**:

- Can view published assessments that are assigned to them (directly or via class)

**Admins**:

- Full access to all assessments

#### Assessment Assignments

**Teachers**:

- Can view assignments for their assessments
- Can create assignments for their own assessments and their own classes/students
- Can delete assignments for their assessments

**Students**:

- Can view their own assignments (direct or via class membership)

**Admins**:

- Full access to all assignments

### Server-Side Functions

Core functions in `src/lib/server/assessments.ts`:

**CRUD Operations**:

- `createAssessment(supabase, data, userId)` - Create new assessment
- `getAssessment(supabase, assessmentId)` - Get single assessment
- `getTeacherAssessments(supabase, teacherId, status?)` - Get teacher's assessments
- `updateAssessment(supabase, assessmentId, data, userId)` - Update assessment
- `publishAssessment(supabase, assessmentId, userId)` - Publish draft
- `archiveAssessment(supabase, assessmentId, userId)` - Archive assessment

**Assignment Management**:

- `assignAssessment(supabase, data, teacherId)` - Assign to classes/students
- `getAssessmentAssignments(supabase, assessmentId)` - Get all assignments
- `removeAssignment(supabase, assignmentId, teacherId)` - Remove assignment
- `getStudentAssignments(supabase, studentId)` - Get student's assigned assessments

**Attempt Validation**:

- `validateAttempt(supabase, assignmentId, studentId)` - Check if student can start attempt

**Results & Statistics**:

- `getAssessmentResults(supabase, assessmentId)` - Get all student results
- `getAssessmentStatistics(supabase, assessmentId)` - Get aggregated stats
- `getClassStatistics(supabase, assessmentId)` - Get per-class stats

### Example Queries

#### Get student's assigned assessments with attempt stats

```sql
SELECT
  aa.*,
  a.title,
  a.grade,
  a.settings,
  COUNT(ts.id) as attempts_count,
  MAX(ts.score) as best_score,
  MAX(ts.completed_at) as last_attempt_at
FROM assessment_assignments aa
JOIN assessments a ON a.id = aa.assessment_id
LEFT JOIN test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = :student_id
WHERE a.status = 'published'
  AND (
    aa.student_id = :student_id
    OR aa.class_id IN (
      SELECT class_id FROM class_members WHERE student_id = :student_id
    )
  )
GROUP BY aa.id, a.id;
```

#### Get teacher's assessment with assignment count

```sql
SELECT
  a.*,
  COUNT(DISTINCT aa.id) as assignments_count
FROM assessments a
LEFT JOIN assessment_assignments aa ON aa.assessment_id = a.id
WHERE a.created_by = :teacher_id
GROUP BY a.id
ORDER BY a.created_at DESC;
```

#### Get assessment completion statistics

```sql
SELECT
  COUNT(*) as total_assigned,
  COUNT(*) FILTER (WHERE attempts_count = 0) as not_started,
  COUNT(*) FILTER (WHERE attempts_count > 0 AND last_attempt_at IS NULL) as in_progress,
  COUNT(*) FILTER (WHERE last_attempt_at IS NOT NULL) as completed,
  AVG(best_score) FILTER (WHERE best_score IS NOT NULL) as average_score
FROM assessment_results
WHERE assessment_id = :assessment_id;
```

### Related Documentation

- **Migration**: `supabase/migrations/082_create_assessment_system.sql`
- **Types**: `src/lib/types/assessment.ts`
- **Server Functions**: `src/lib/server/assessments.ts`
- **API Routes**: `src/routes/api/assessments/`
- **Teacher Pages**: `src/routes/(protected)/dashboard/teacher/assessments/`
- **Student Pages**: `src/routes/(protected)/dashboard/student/assessments/`
- **Components**: `src/lib/components/assessments/`

---

## Riddles (Énigmes) System

Math riddles/enigmas with automatic and manual validation, riddle of the day, degressive rewards, and leaderboard system.

### Tables

#### `riddles`

Mathematical riddles/enigmas created by teachers.

| Column        | Type    | Description                                                     |
| ------------- | ------- | --------------------------------------------------------------- |
| id            | UUID    | Riddle ID                                                       |
| riddle_number | SERIAL  | Auto-incrementing display number (global, unique)               |
| title         | TEXT    | Riddle title                                                    |
| genre         | TEXT    | Free-form tag (e.g., "Logique", "Géométrie")                    |
| difficulty    | INTEGER | Difficulty level: 1 (Facile), 2 (Moyen), 3 (Difficile)          |
| statement     | TEXT    | Problem statement (HTML rich text)                              |
| correction    | TEXT    | Solution/explanation (HTML rich text, visible to teachers only) |
| image_url     | TEXT    | Optional image URL                                              |
| answer        | JSONB   | Optional automatic validation config (null = manual validation) |
| created_by    | UUID    | Teacher who created the riddle (FK → profiles)                  |
| status        | TEXT    | 'draft' or 'published'                                          |
| created_at    | TSTZ    | Creation timestamp                                              |
| updated_at    | TSTZ    | Last update timestamp                                           |

**Answer Structure** (JSONB):

```json
{
  "type": "numerical" | "text" | "qcm" | "math",
  "value": <expected answer(s)>,
  "options": {
    "tolerance": 0.01,          // For numerical
    "caseSensitive": false,     // For text
    "choices": ["A", "B", "C"], // For QCM
    "exactMatch": true          // For math
  }
}
```

**Validation Types**:

- `numerical`: Number with tolerance
- `text`: Text exact match (case insensitive by default)
- `qcm`: Multiple choice
- `math`: Mathematical expression

**Status**:

- `draft`: Not yet published, visible only to creator
- `published`: Active, can be assigned or used as riddle of the day

#### `riddle_assignments`

Specific assignments of riddles to classes or students.

| Column      | Type | Description                                        |
| ----------- | ---- | -------------------------------------------------- |
| id          | UUID | Assignment ID                                      |
| riddle_id   | UUID | Riddle being assigned (FK → riddles)               |
| class_id    | UUID | Class assignment (FK → classes, mutually exclusive |
| student_id  | UUID | Student assignment (FK → profiles, with class_id)  |
| assigned_by | UUID | Teacher who made assignment (FK → profiles)        |
| assigned_at | TSTZ | Assignment timestamp                               |

**Constraint**: Must have either `class_id` OR `student_id`, not both or neither.

**Note**: Riddle of the day is accessible to all students without explicit assignment.

#### `riddle_of_the_day`

Daily riddle accessible to all students (one per day for entire school).

| Column        | Type    | Description                                    |
| ------------- | ------- | ---------------------------------------------- |
| id            | UUID    | Record ID                                      |
| riddle_id     | UUID    | Riddle selected for the day (FK → riddles)     |
| date          | DATE    | Date (unique - only one riddle per day)        |
| auto_selected | BOOLEAN | true = automatic rotation, false = manual pick |
| selected_by   | UUID    | User who selected (FK → profiles, if manual)   |
| created_at    | TSTZ    | Creation timestamp                             |

**Selection Methods**:

- **Automatic**: Cron job selects random published riddle, avoiding recent ones
- **Manual**: Teacher/admin overrides with specific riddle

**Accessibility**: All students can access riddle of the day regardless of class assignments.

#### `riddle_attempts`

Student attempts at solving riddles with degressive rewards.

| Column             | Type    | Description                                            |
| ------------------ | ------- | ------------------------------------------------------ |
| id                 | UUID    | Attempt ID                                             |
| riddle_id          | UUID    | Riddle being attempted (FK → riddles)                  |
| student_id         | UUID    | Student making attempt (FK → profiles)                 |
| attempt_number     | INTEGER | Attempt sequence number (1, 2, 3, ...)                 |
| submitted_answer   | JSONB   | Student's answer (structure depends on riddle type)    |
| is_correct         | BOOLEAN | null = awaiting validation, true/false = validated     |
| validated_by       | UUID    | Teacher who validated (FK → profiles, if manual)       |
| validated_at       | TSTZ    | Validation timestamp                                   |
| gidouilles_awarded | INTEGER | Gidouilles earned (calculated with degressive formula) |
| created_at         | TSTZ    | Attempt timestamp                                      |

**Unique Constraint**: (riddle_id, student_id, attempt_number)

**Degressive Rewards Formula**:

```
gidouilles = difficulty × multiplier

Multiplier:
- 1st attempt: 3
- 2nd attempt: 2
- 3rd+ attempts: 1

Examples:
- Difficulty 1: 3 → 2 → 1 gidouilles
- Difficulty 2: 6 → 4 → 2 gidouilles
- Difficulty 3: 9 → 6 → 3 gidouilles
```

**Validation Flow**:

1. **With `answer` config**: Automatic validation → immediate `is_correct` + gidouilles
2. **Without `answer`**: Manual validation → `is_correct = NULL` → teacher validates via messaging

### Views

#### `riddle_stats`

Statistics per riddle for teacher dashboard.

| Column                   | Type    | Description                                  |
| ------------------------ | ------- | -------------------------------------------- |
| riddle_id                | UUID    | Riddle ID                                    |
| riddle_number            | INTEGER | Display number                               |
| title                    | TEXT    | Riddle title                                 |
| genre                    | TEXT    | Genre tag                                    |
| difficulty               | INTEGER | Difficulty level                             |
| created_by               | UUID    | Creator ID                                   |
| unique_students          | INTEGER | Number of students who attempted             |
| total_attempts           | INTEGER | Total attempts across all students           |
| avg_attempts_to_success  | DECIMAL | Average attempts needed for success          |
| successful_attempts      | INTEGER | Number of successful attempts                |
| success_rate_percent     | DECIMAL | Success rate (0-100%)                        |
| first_attempts           | INTEGER | Attempts made on 1st try                     |
| second_attempts          | INTEGER | Attempts made on 2nd try                     |
| third_plus_attempts      | INTEGER | Attempts made on 3rd+ try                    |
| pending_validations      | INTEGER | Awaiting manual validation                   |
| total_gidouilles_awarded | INTEGER | Total gidouilles distributed for this riddle |

#### `riddle_progress`

Student progress and leaderboard data.

| Column             | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| student_id         | UUID    | Student ID                               |
| firstname          | TEXT    | Student first name                       |
| lastname           | TEXT    | Student last name                        |
| avatar_url         | TEXT    | Student avatar                           |
| riddles_completed  | INTEGER | Number of riddles successfully solved    |
| total_attempts     | INTEGER | Total attempts across all riddles        |
| riddles_gidouilles | INTEGER | Total gidouilles earned from riddles     |
| last_success_at    | TSTZ    | Most recent successful attempt           |
| rank               | INTEGER | Global rank (by riddles_gidouilles DESC) |

**Used for**: Leaderboard display and student progress tracking.

#### `riddle_student_history`

Individual student riddle history.

| Column                  | Type    | Description                                 |
| ----------------------- | ------- | ------------------------------------------- |
| student_id              | UUID    | Student ID                                  |
| riddle_id               | UUID    | Riddle ID                                   |
| riddle_number           | INTEGER | Display number                              |
| riddle_title            | TEXT    | Riddle title                                |
| genre                   | TEXT    | Genre tag                                   |
| difficulty              | INTEGER | Difficulty level                            |
| first_attempt_number    | INTEGER | Number of first attempt                     |
| latest_attempt_number   | INTEGER | Number of latest attempt                    |
| total_attempts          | INTEGER | Total attempts for this riddle              |
| ever_succeeded          | BOOLEAN | Whether student ever succeeded              |
| first_success_at        | TSTZ    | Timestamp of first success                  |
| max_gidouilles_earned   | INTEGER | Maximum gidouilles earned in single attempt |
| total_gidouilles_earned | INTEGER | Total gidouilles earned for this riddle     |
| last_attempt_at         | TSTZ    | Most recent attempt timestamp               |

### Functions

#### `get_next_riddle_attempt_number(p_riddle_id, p_student_id)`

Returns the next attempt number for a student on a specific riddle.

**Returns**: INTEGER (1 for first attempt, 2 for second, etc.)

#### `calculate_riddle_gidouilles(p_difficulty, p_attempt_number)`

Calculates gidouilles reward using degressive formula.

**Parameters**:

- `p_difficulty`: 1, 2, or 3
- `p_attempt_number`: 1, 2, 3, ...

**Returns**: INTEGER (gidouilles amount)

**Formula**: `difficulty × multiplier` where multiplier = 3 for 1st, 2 for 2nd, 1 for 3rd+

#### `submit_riddle_attempt(p_riddle_id, p_student_id, p_submitted_answer, p_is_correct)`

Creates a new attempt record and awards gidouilles if correct.

**Parameters**:

- `p_riddle_id`: UUID
- `p_student_id`: UUID
- `p_submitted_answer`: JSONB
- `p_is_correct`: BOOLEAN or NULL (NULL for manual validation)

**Returns**: UUID (attempt_id)

**Side Effects**:

- Creates `riddle_attempts` record
- Updates `profiles.gidouilles` if correct

#### `validate_riddle_attempt(p_attempt_id, p_teacher_id, p_is_correct)`

Manual validation by teacher for riddles without automatic validation.

**Parameters**:

- `p_attempt_id`: UUID
- `p_teacher_id`: UUID
- `p_is_correct`: BOOLEAN

**Returns**: BOOLEAN (success)

**Side Effects**:

- Updates `riddle_attempts` (is_correct, validated_by, validated_at, gidouilles_awarded)
- Updates `profiles.gidouilles` if correct

#### `get_riddle_of_the_day(p_date)`

Gets the riddle of the day for a specific date.

**Parameters**:

- `p_date`: DATE (defaults to today)

**Returns**: UUID (riddle_id) or NULL

#### `set_riddle_of_the_day(p_riddle_id, p_date, p_selected_by)`

Sets or updates the riddle of the day (manual override).

**Parameters**:

- `p_riddle_id`: UUID
- `p_date`: DATE
- `p_selected_by`: UUID (teacher/admin)

**Returns**: UUID (riddle_of_the_day.id)

**Behavior**: Upserts record (updates if date already exists)

### RLS Policies

**Riddles**:

- Teachers: CRUD their own riddles
- Students: SELECT published riddles (assigned OR riddle of the day)
- Admins: Full access

**Riddle Assignments**:

- Teachers: CRUD assignments for their riddles and students
- Students: SELECT their own assignments
- Admins: Full access

**Riddle of the Day**:

- Everyone: SELECT
- Teachers/Admins: INSERT, UPDATE
- Admins: DELETE

**Riddle Attempts**:

- Students: INSERT their attempts, SELECT their attempts
- Teachers: SELECT attempts of their students, UPDATE for validation
- Admins: Full access

### Common Queries

#### Get today's riddle of the day with student's attempt

```sql
SELECT
  r.*,
  rotd.date,
  ra.id as attempt_id,
  ra.attempt_number,
  ra.is_correct,
  ra.gidouilles_awarded
FROM riddle_of_the_day rotd
JOIN riddles r ON r.id = rotd.riddle_id
LEFT JOIN riddle_attempts ra ON ra.riddle_id = r.id
  AND ra.student_id = :student_id
WHERE rotd.date = CURRENT_DATE
  AND r.status = 'published';
```

#### Get teacher's riddles with stats

```sql
SELECT
  r.*,
  rs.unique_students,
  rs.total_attempts,
  rs.success_rate_percent,
  rs.pending_validations
FROM riddles r
LEFT JOIN riddle_stats rs ON rs.riddle_id = r.id
WHERE r.created_by = :teacher_id
ORDER BY r.riddle_number DESC;
```

#### Get leaderboard (top 10 students)

```sql
SELECT
  student_id,
  firstname,
  lastname,
  avatar_url,
  riddles_completed,
  riddles_gidouilles,
  rank
FROM riddle_progress
WHERE riddles_completed > 0
ORDER BY rank ASC
LIMIT 10;
```

#### Get pending manual validations for teacher

```sql
SELECT
  ra.*,
  r.title as riddle_title,
  r.riddle_number,
  r.correction,
  p.firstname as student_firstname,
  p.lastname as student_lastname
FROM riddle_attempts ra
JOIN riddles r ON r.id = ra.riddle_id
JOIN profiles p ON p.id = ra.student_id
WHERE ra.is_correct IS NULL
  AND r.created_by = :teacher_id
ORDER BY ra.created_at ASC;
```

#### Get student's riddle history

```sql
SELECT *
FROM riddle_student_history
WHERE student_id = :student_id
ORDER BY last_attempt_at DESC;
```

### Related Documentation

- **Migration**: `supabase/migrations/099_create_riddles_system.sql`
- **Types**: `src/lib/types/riddle.ts`
- **Teacher Pages**: `src/routes/(protected)/dashboard/teacher/riddles/`
- **Student Pages**: `src/routes/(protected)/dashboard/student/riddles/` (to be implemented)
- **Components**: `src/lib/components/riddles/`
- **Features**:
  - Automatic and manual validation
  - Degressive rewards system
  - Riddle of the day
  - Statistics and leaderboard
  - Rich text and image support

---

## Exercise Bank System

Math exercise bank with rich markdown content, LaTeX formulas, and multiple export formats (web, LaTeX/PDF).

### Tables

#### `exercises`

Mathematical exercises with markdown-formatted statements and solutions.

| Column                 | Type        | Description                                                       |
| ---------------------- | ----------- | ----------------------------------------------------------------- |
| id                     | UUID        | Exercise ID (primary key)                                         |
| title                  | TEXT        | Exercise title (optional, for organization)                       |
| source                 | TEXT        | Source reference (e.g., book name, author)                        |
| difficulty             | INTEGER     | Difficulty level: 1 (easy), 2 (medium), 3 (hard)                  |
| tags                   | TEXT[]      | Tags for categorization (e.g., ['algèbre', 'équations'])          |
| statement_md           | TEXT        | Exercise statement in markdown with LaTeX ($...$ and $$...$$)     |
| solution_md            | TEXT        | Solution/correction in markdown with LaTeX                        |
| estimated_time_minutes | INTEGER     | Estimated completion time in minutes                              |
| grade_levels           | TEXT[]      | Applicable grade levels (e.g., ['3', '2', 'SPE_1'])               |
| topic                  | TEXT        | Topic category (e.g., 'Algèbre', 'Géométrie')                     |
| variables              | JSONB       | Parameterization variables (default: `[]`)                        |
| distribution_mode      | TEXT        | Instance distribution: `on_demand`, `per_student`, or `per_group` |
| is_public              | BOOLEAN     | Whether exercise is publicly shared (default: `false`)            |
| created_at             | TIMESTAMPTZ | Creation timestamp                                                |
| updated_at             | TIMESTAMPTZ | Last update timestamp                                             |
| created_by             | UUID        | Teacher who created the exercise (FK → profiles.id)               |

**Markdown Format**:

- **Inline math**: `$x^2 + 2x + 1$`
- **Block math**: `$$\int_0^\pi \sin(x) dx = 2$$`
- **Lists**: Ordered (1., a.) and unordered (-, \*, +) with nesting
- **Tables**: GitHub Flavored Markdown (GFM) syntax
- **Images**: `![Description](path/to/image.png)` (stored in Supabase Storage)
- **Text formatting**: `**bold**`, `*italic*`, `` `code` ``

**Example Content**:

```markdown
# Équations du premier degré

Résoudre les équations suivantes:

1. $2x + 3 = 7$
2. $\frac{x}{2} + \frac{x}{3} = 5$

| x   | f(x) |
| --- | ---- |
| 0   | 0    |
| 1   | 2    |
```

**Parameterization**:

Exercises can include variables to generate different instances:

- **Variables**: Defined in the `variables` JSONB array, each variable has a `name` and `expression`
- **Syntax**: Uses Markdown syntax (`{{}}`) for variable references, random values, and evaluations
  - Variable reference: `{{varName}}`
  - Random integer: `{{1-10}}` or `{{random:1-10}}`
  - Random decimal: `{{0.5-9.99:0.01}}`
  - Evaluation: `{{eval:a+b}}`
  - Exclusions: `{{1-10!{{a}}}}`
- **Distribution Modes**:
  - `on_demand`: Students can regenerate unlimited times (random each time)
  - `per_student`: Each student gets unique consistent values (deterministic seed)
  - `per_group`: All students in a group see the same values (shared seed)

**Example Parameterized Exercise**:

```json
{
	"variables": [
		{ "name": "a", "expression": "{{1-10}}" },
		{ "name": "b", "expression": "{{1-10}}" },
		{ "name": "sum", "expression": "{{eval:{{a}}+{{b}}}}" }
	],
	"statement_md": "Calculer : ${{a}} + {{b}}$",
	"solution_md": "La réponse est ${{sum}}$",
	"distribution_mode": "per_student"
}
```

When displayed to a student, variables are resolved to actual values:

- Student 1 might see: "Calculer : $7 + 3$" with solution "La réponse est $10$"
- Student 2 might see: "Calculer : $4 + 9$" with solution "La réponse est $13$"

See: `docs/features/exercises/parameterization-guide.md` for complete documentation.

### Storage

#### `exercise-images` Bucket

Public storage bucket for exercise images.

- **Path structure**: `{userId}/{exerciseId}/{filename}`
- **Access**: Public read, authenticated teachers can upload/update/delete their own images
- **Cleanup**: Images automatically cleaned up when exercise is deleted (trigger)

### Row Level Security

**Teachers can**:

- View all exercises (read)
- Create new exercises (insert)
- Update their own exercises (update)
- Delete their own exercises (delete)

**RLS Policies**:

```sql
-- Teachers can view all exercises
CREATE POLICY "Teachers can view all exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Teachers can create exercises
CREATE POLICY "Teachers can create exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
    AND created_by = auth.uid()
  );

-- Teachers can update/delete their own exercises
CREATE POLICY "Teachers can update own exercises"
  ON exercises FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own exercises"
  ON exercises FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_tags ON exercises USING gin(tags);
CREATE INDEX idx_exercises_grade_levels ON exercises USING gin(grade_levels);
CREATE INDEX idx_exercises_topic ON exercises(topic);
CREATE INDEX idx_exercises_created_at ON exercises(created_at DESC);

-- Parameterization indexes
CREATE INDEX idx_exercises_distribution_mode ON exercises(distribution_mode);
CREATE INDEX idx_exercises_is_public ON exercises(is_public);
CREATE INDEX idx_exercises_has_variables ON exercises((jsonb_array_length(variables) > 0));

-- Full-text search on title and source
CREATE INDEX idx_exercises_search ON exercises
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(source, '')));
```

### Triggers

**Auto-update `updated_at`**:

```sql
CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();
```

### Helper Functions

**Check if exercise has variables**:

```sql
CREATE OR REPLACE FUNCTION is_exercise_parameterized(exercise_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(jsonb_array_length(variables) > 0, false)
  FROM exercises
  WHERE id = exercise_id;
$$ LANGUAGE SQL STABLE;
```

Usage:

```sql
-- Find all parameterized exercises
SELECT * FROM exercises
WHERE is_exercise_parameterized(id);

-- Check if a specific exercise is parameterized
SELECT is_exercise_parameterized('uuid-here');
```

### Usage Examples

#### Create an exercise

```sql
INSERT INTO exercises (
  title,
  source,
  difficulty,
  tags,
  statement_md,
  solution_md,
  estimated_time_minutes,
  grade_levels,
  topic,
  created_by
)
VALUES (
  'Équations du premier degré',
  'Livre de mathématiques 3ème',
  2,
  ARRAY['algèbre', 'équations', '3ème'],
  '# Exercice\n\nRésoudre: $2x + 3 = 7$',
  '# Solution\n\n$$x = 2$$',
  10,
  ARRAY['3', '2'],
  'Algèbre',
  auth.uid()
);
```

#### Find exercises by tags

```sql
SELECT *
FROM exercises
WHERE tags @> ARRAY['algèbre', 'équations']
ORDER BY difficulty ASC, created_at DESC;
```

#### Search exercises

```sql
SELECT *
FROM exercises
WHERE to_tsvector('french', coalesce(title, '') || ' ' || coalesce(source, ''))
  @@ to_tsquery('french', 'pythagore')
ORDER BY created_at DESC;
```

#### Create a parameterized exercise

```sql
INSERT INTO exercises (
  title,
  statement_md,
  solution_md,
  variables,
  distribution_mode,
  difficulty,
  tags,
  grade_levels,
  created_by
)
VALUES (
  'Addition aléatoire',
  'Calculer : ${{a}} + {{b}}$',
  'La réponse est ${{sum}}$',
  '[
    {"name": "a", "expression": "{{1-10}}"},
    {"name": "b", "expression": "{{1-10}}"},
    {"name": "sum", "expression": "{{eval:{{a}}+{{b}}}}"}
  ]'::jsonb,
  'per_student',
  1,
  ARRAY['arithmétique', 'addition'],
  ARRAY['6', '5'],
  auth.uid()
);
```

#### Find parameterized exercises

```sql
-- All exercises with variables
SELECT *
FROM exercises
WHERE jsonb_array_length(variables) > 0;

-- Using the helper function
SELECT *
FROM exercises
WHERE is_exercise_parameterized(id);

-- Per-student distribution mode only
SELECT *
FROM exercises
WHERE distribution_mode = 'per_student'
  AND jsonb_array_length(variables) > 0;
```

### Related Documentation

- **Migrations**:
  - `supabase/migrations/20251026080000_create_exercises_table.sql` (initial table)
  - `supabase/migrations/20251026153000_add_exercise_parameterization.sql` (parameterization)
- **Types**: `src/lib/exercises/types.ts`
- **Instance Generator**: `src/lib/exercises/generator/instance-generator.ts`
- **Parser**: `src/lib/exercises/parser/`
- **Transpilers**: `src/lib/exercises/transpilers/`
- **Components**: `src/lib/components/exercises/`
- **Test Page**: `src/routes/(protected)/test-exercises/` (development)
- **Feature Documentation**:
  - `docs/features/exercises/README.md` (overview)
  - `docs/features/exercises/parameterization-guide.md` (parameterization)
- **Features**:
  - Rich markdown with LaTeX math support
  - GitHub Flavored Markdown (tables, lists)
  - Image upload to Supabase Storage
  - LaTeX/PDF export via transpiler
  - Full-text search in French
  - Tag-based filtering
  - Difficulty and grade level organization
  - **Parameterization with variables** (random values, evaluations)
  - **Three distribution modes** (on-demand, per-student, per-group)
  - **Deterministic seeding** for consistent student experiences
