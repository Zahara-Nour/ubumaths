# Daily Summaries System Architecture

**Status**: Production (2025-11-13)
**Audience**: Developers
**Last Updated**: 2025-11-13

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Data Flow](#data-flow)
5. [Multi-Timezone Handling](#multi-timezone-handling)
6. [Week Configuration Logic](#week-configuration-logic)
7. [RPC Functions and Security](#rpc-functions-and-security)
8. [Performance Considerations](#performance-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Error Handling](#error-handling)

---

## Overview

The Daily Summaries System is a comprehensive automated solution for generating daily activity summaries and weekly behavioral rewards for students. It operates across multiple timezones and school calendars, providing personalized notifications to students about their progress.

### Key Features

- **Daily Summaries**: Aggregate student activity (gidouilles, bonus, warnings, VIP cards) for days with lessons
- **Weekly Rewards**: Award 1 gidouille to students with zero warnings on the last day of the school week
- **Multi-Timezone**: Supports 80+ IANA timezones with proper DST handling
- **Flexible Calendars**: Configurable week structures (Mon-Fri, Sun-Thu, custom)
- **Audit Trail**: Complete history of all summaries and rewards
- **Graceful Degradation**: Class-level errors don't stop processing of other classes

### Technology Stack

- **Runtime**: Vercel Edge Functions (Node.js)
- **Scheduler**: Vercel Cron (daily at 01:00 UTC)
- **Database**: Supabase (PostgreSQL 15+)
- **Language**: TypeScript (strict mode)
- **Date Handling**: `date-fns` + `date-fns-tz` for timezone calculations
- **Validation**: Zod schemas for all API inputs

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Vercel Cron                            │
│                    (Daily 01:00 UTC)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            /api/cron/daily-summaries-and-rewards            │
│                  (Service Role Client)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Daily Summaries    │          │  Weekly Rewards     │
│  Processing         │          │  Processing         │
└──────┬──────────────┘          └──────┬──────────────┘
       │                                │
       ▼                                ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Aggregate History  │          │  Check Warnings     │
│  Tables (6 tables)  │          │  in Week Range      │
└──────┬──────────────┘          └──────┬──────────────┘
       │                                │
       ▼                                ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Create Summary     │          │  Award Gidouilles   │
│  Cache + Notif      │          │  Log + Notify       │
└─────────────────────┘          └─────────────────────┘
```

### Component Breakdown

#### 1. Cron Endpoint (`/api/cron/daily-summaries-and-rewards`)

**Location**: `src/routes/api/cron/daily-summaries-and-rewards/+server.ts`

**Responsibilities**:

- Authenticate requests (CRON_SECRET)
- Create service role client (bypasses RLS)
- Fetch all active classes with school data
- Orchestrate daily summary and weekly reward processing
- Track job execution in `job_runs` table
- Return structured results (success/partial/failure)

**Key Code**:

```typescript
const cronHandler: RequestHandler = async ({ request }) => {
	// 1. Verify CRON authentication
	verifyCronAuth(request);

	// 2. Create service role client
	const serviceClient = createServiceRoleClient();

	// 3. Fetch all active classes
	const { data: classes } = await serviceClient
		.from('classes')
		.select('id, name, teacher_id, school_id, created_at, updated_at, schools(timezone, timetable)')
		.eq('status', 'active');

	// 4. Process each class (daily summaries + weekly rewards)
	for (const classData of classes) {
		// Extract timezone and week_config
		const timezone = classData.schools?.timezone || 'Europe/Paris';
		const weekConfig = classData.schools?.timetable?.week_config || DEFAULT_WEEK_CONFIG;

		// Calculate "yesterday" in school's timezone
		const yesterday = getYesterdayInTimezone(timezone);

		// Check if class had lessons yesterday
		const hadClass = await checkClassSchedule(serviceClient, classData.id, yesterday);

		if (hadClass) {
			// Generate daily summaries
			await generateDailySummary(serviceClient, classData, yesterday, timezone);
		}

		// Check if today is weekly rewards day
		const currentDayOfWeek = getCurrentDayOfWeekInTimezone(timezone);
		if (isWeeklyRewardsDay(weekConfig, currentDayOfWeek)) {
			// Generate weekly rewards
			await generateWeeklyRewards(serviceClient, classData, weekConfig, timezone);
		}
	}
};
```

#### 2. Server Helpers (`src/lib/server/summaries/`)

**Structure**:

```
src/lib/server/summaries/
├── index.ts                 # Public API exports
├── types.ts                 # TypeScript type definitions
├── database-types.ts        # Database-specific types (until migrations applied)
├── timezone-utils.ts        # Timezone calculation utilities
├── daily.ts                 # Daily summary generation
├── weekly.ts                # Weekly reward processing
└── notifications.ts         # Notification creation and formatting
```

**Key Modules**:

##### `timezone-utils.ts`

```typescript
// Get yesterday's date in a specific timezone
export function getYesterdayInTimezone(timezone: string): Date;

// Get current day of week (0-6) in timezone
export function getCurrentDayOfWeekInTimezone(timezone: string): number;

// Get week range (start/end) for rewards calculation
export function getWeekRangeInTimezone(
	timezone: string,
	weekConfig: WeekConfig
): { start: Date; end: Date };

// Get day boundaries (start of day 00:00, end of day 23:59:59.999)
export function getDayBoundariesInTimezone(
	date: Date,
	timezone: string
): { start: Date; end: Date };
```

##### `daily.ts`

```typescript
// Check if class had lessons on a specific date
export async function checkClassSchedule(
	supabase: DbClient,
	classId: string,
	date: Date
): Promise<boolean>;

// Aggregate all changes for a student on a specific day
export async function aggregateDailyChanges(
	supabase: DbClient,
	studentId: string,
	classId: string,
	date: Date,
	timezone: string
): Promise<DailyChanges>;

// Generate daily summaries for all students in a class
export async function generateDailySummary(
	supabase: DbClient,
	classData: ClassWithSchool,
	date: Date,
	timezone: string
): Promise<number>; // Returns count of summaries generated
```

##### `weekly.ts`

```typescript
// Check if student has zero warnings in a week
export async function checkNoWarningsInWeek(
	supabase: DbClient,
	studentId: string,
	classId: string,
	weekStart: Date,
	weekEnd: Date
): Promise<boolean>;

// Generate weekly rewards for eligible students
export async function generateWeeklyRewards(
	supabase: DbClient,
	classData: ClassWithSchool,
	weekConfig: WeekConfig,
	timezone: string
): Promise<number>; // Returns count of rewards awarded
```

##### `notifications.ts`

```typescript
// Create notification for daily summary
export async function createDailySummaryNotification(
	supabase: DbClient,
	studentId: string,
	changes: DailyChanges,
	date: Date
): Promise<void>;

// Create notification for weekly reward
export async function createWeeklyRewardNotification(
	supabase: DbClient,
	studentId: string,
	gidouilles: number,
	weekStart: Date,
	weekEnd: Date
): Promise<void>;

// Format daily summary for display
export function formatDailySummary(changes: DailyChanges, date: Date): string;

// Format weekly reward for display
export function formatWeeklyReward(gidouilles: number, weekStart: Date, weekEnd: Date): string;
```

#### 3. Admin Configuration Endpoint

**Location**: `src/routes/api/admin/schools/[schoolId]/config/+server.ts`

**Responsibilities**:

- GET: Fetch current school configuration (timezone + week_config)
- PUT: Update school configuration with validation
- Admin-only authorization
- Zod schema validation

**Key Code**:

```typescript
// PUT /api/admin/schools/[schoolId]/config
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { user, profile, supabase } = locals;

	// Authentication check
	if (!user) throw error(401, 'Unauthorized');

	// Authorization check - admin only
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = updateSchoolConfigSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { timezone, week_config } = validation.data;

	// Update school
	const { data: updatedSchool } = await supabase
		.from('schools')
		.update({
			timezone,
			timetable: { ...currentTimetable, week_config }
		})
		.eq('id', schoolId)
		.select('id, name, timezone, timetable')
		.single();

	return json({ success: true, school: updatedSchool });
};
```

#### 4. Admin UI Components

**Location**: `src/lib/components/admin/`

**Components**:

- `SchoolConfigModal.svelte`: Main modal for school configuration
- `WeekConfigEditor.svelte`: Visual editor for week structure with presets

**Key Features**:

- Timezone search and selection (80+ timezones)
- Week configuration presets (Western, Israeli, Middle East)
- Visual day-of-week selector
- Real-time validation
- Optimistic UI updates

---

## Database Schema

### Core Tables

#### 1. `schools` (extended)

```sql
ALTER TABLE schools
ADD COLUMN timezone TEXT DEFAULT 'Europe/Paris' NOT NULL;

-- timetable JSONB structure:
{
  "periods": [...],  -- Existing periods array
  "week_config": {
    "first_day": 0,              -- 0=Sunday, 1=Monday, etc.
    "last_day": 6,               -- Last day of school week
    "school_days": [0,1,2,3,4],  -- Array of school days
    "weekend_days": [5,6]        -- Array of weekend days
  }
}
```

**Indexes**:

- `idx_schools_timezone`: Index on timezone column

**Constraints**:

- `chk_schools_timezone_not_empty`: Ensures timezone is non-empty string

#### 2. `daily_summaries`

```sql
CREATE TABLE public.daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    gidouilles_gained INTEGER DEFAULT 0,
    gidouilles_lost INTEGER DEFAULT 0,
    bonus_gained INTEGER DEFAULT 0,
    bonus_used INTEGER DEFAULT 0,
    warnings_issued INTEGER DEFAULT 0,
    warnings_removed INTEGER DEFAULT 0,
    vip_cards_gained INTEGER DEFAULT 0,
    vip_cards_used INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:

- `idx_daily_summaries_unique`: Unique index on (student_id, class_id, summary_date)
- `idx_daily_summaries_date`: Index on summary_date DESC
- `idx_daily_summaries_sent`: Index on sent_at
- `idx_daily_summaries_student`: Index on (student_id, summary_date DESC)
- `idx_daily_summaries_class`: Index on (class_id, summary_date DESC)
- `idx_daily_summaries_pending`: Partial index WHERE sent_at IS NULL

**RLS Policies**:

- Admins can view all summaries
- Students can view their own summaries
- Teachers can view summaries for their students
- System (service_role) can insert and update summaries

#### 3. `weekly_rewards`

```sql
CREATE TABLE public.weekly_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    gidouilles_awarded INTEGER DEFAULT 1,
    reason TEXT DEFAULT 'no_warnings',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:

- `idx_weekly_rewards_student`: Index on (student_id, week_start DESC)
- `idx_weekly_rewards_class`: Index on (class_id, week_start DESC)
- `idx_weekly_rewards_week`: Index on (week_start, week_end)
- `idx_weekly_rewards_unique`: Unique index on (student_id, class_id, week_start)

**RLS Policies**:

- Admins can view all rewards
- Students can view their own rewards
- Teachers can view rewards for their students
- System (service_role) can insert rewards

### History Tables (existing)

These tables are queried for aggregation:

#### 4. `gidouilles_history`

```sql
CREATE TABLE public.gidouilles_history (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 5. `bonus_history`

```sql
CREATE TABLE public.bonus_history (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 6. `student_warnings`

```sql
CREATE TABLE public.student_warnings (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,
    type TEXT NOT NULL, -- 'C', 'M', 'R', 'T'
    reason TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    deleted_by UUID
);
```

#### 7. `vip_cards_activity`

```sql
CREATE TABLE public.vip_cards_activity (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    card_id UUID,
    action TEXT NOT NULL, -- 'gained', 'used'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Support Tables

#### 8. `class_schedules`

```sql
CREATE TABLE public.class_schedules (
    id UUID PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 9. `notifications`

```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'normal', 'important', 'urgent'
    target_mode TEXT DEFAULT 'dropdown', -- 'banner', 'dropdown', 'page'
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Data Flow

### Daily Summary Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Vercel Cron triggers at 01:00 UTC daily                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Authenticate with CRON_SECRET                                │
│    verifyCronAuth(request)                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Create Service Role Client                                   │
│    const serviceClient = createServiceRoleClient()              │
│    (Bypasses RLS, full database access)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Fetch All Active Classes                                     │
│    SELECT * FROM classes                                        │
│    WHERE status = 'active'                                      │
│    JOIN schools (timezone, timetable)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. FOR EACH CLASS: Process Daily Summary                       │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5a. Extract Configuration                             │  │
│    │     timezone = schools.timezone || 'Europe/Paris'     │  │
│    │     weekConfig = schools.timetable.week_config        │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5b. Calculate "Yesterday" in School Timezone          │  │
│    │     getYesterdayInTimezone(timezone)                  │  │
│    │     - zonedTimeToUtc() conversion                     │  │
│    │     - Handles DST transitions                         │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5c. Check Class Schedule                              │  │
│    │     SELECT * FROM class_schedules                     │  │
│    │     WHERE class_id = ?                                │  │
│    │     AND day_of_week = ?                               │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     │                                           │
│         ┌───────────┴───────────┐                               │
│         ▼ YES                   ▼ NO                            │
│    ┌─────────────┐      ┌──────────────────┐                   │
│    │ Continue    │      │ Skip this class  │                   │
│    └──────┬──────┘      └──────────────────┘                   │
│           │                                                     │
│           ▼                                                     │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5d. Fetch All Active Students in Class                │  │
│    │     SELECT student_id FROM class_members               │  │
│    │     WHERE class_id = ? AND status = 'active'          │  │
│    │     AND is_test = false                                │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5e. FOR EACH STUDENT: Aggregate Activity              │  │
│    │     ┌──────────────────────────────────────────────┐  │  │
│    │     │ Query gidouilles_history                     │  │  │
│    │     │ WHERE date = yesterday                       │  │  │
│    │     │ SUM gains (delta > 0), losses (delta < 0)   │  │  │
│    │     └──────────────────────────────────────────────┘  │  │
│    │     ┌──────────────────────────────────────────────┐  │  │
│    │     │ Query bonus_history                          │  │  │
│    │     │ WHERE date = yesterday                       │  │  │
│    │     │ SUM gains (delta > 0), used (delta < 0)     │  │  │
│    │     └──────────────────────────────────────────────┘  │  │
│    │     ┌──────────────────────────────────────────────┐  │  │
│    │     │ Query student_warnings                       │  │  │
│    │     │ WHERE date = yesterday                       │  │  │
│    │     │ COUNT issued, removed (deleted_at NOT NULL)  │  │  │
│    │     └──────────────────────────────────────────────┘  │  │
│    │     ┌──────────────────────────────────────────────┐  │  │
│    │     │ Query vip_cards_activity                     │  │  │
│    │     │ WHERE date = yesterday                       │  │  │
│    │     │ COUNT gained, used                           │  │  │
│    │     └──────────────────────────────────────────────┘  │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5f. Create daily_summaries Record                     │  │
│    │     INSERT INTO daily_summaries (...)                 │  │
│    │     ON CONFLICT (student_id, class_id, date)          │  │
│    │     DO UPDATE SET ...                                 │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5g. Create Notification (if any changes)              │  │
│    │     IF hasAnyChanges(aggregated):                     │  │
│    │       INSERT INTO notifications (                     │  │
│    │         user_id, title, message,                      │  │
│    │         priority='normal', target_mode='dropdown'     │  │
│    │       )                                                │  │
│    └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Return Results                                               │
│    {                                                            │
│      success: true/false,                                       │
│      classesProcessed: N,                                       │
│      dailySummaries: {                                          │
│        generated: X,                                            │
│        classesProcessed: Y,                                     │
│        errors: [...]                                            │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Weekly Rewards Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Same initial steps as Daily Summary (steps 1-4)             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. FOR EACH CLASS: Process Weekly Rewards                      │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5a. Extract Configuration                             │  │
│    │     timezone = schools.timezone || 'Europe/Paris'     │  │
│    │     weekConfig = schools.timetable.week_config        │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5b. Get Current Day of Week in Timezone               │  │
│    │     getCurrentDayOfWeekInTimezone(timezone)           │  │
│    │     Returns 0-6 (Sunday-Saturday)                     │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5c. Check if Today is Weekly Rewards Day              │  │
│    │     isWeeklyRewardsDay(weekConfig, currentDayOfWeek)  │  │
│    │     Compares with weekConfig.last_day                 │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     │                                           │
│         ┌───────────┴───────────┐                               │
│         ▼ YES                   ▼ NO                            │
│    ┌─────────────┐      ┌──────────────────┐                   │
│    │ Continue    │      │ Skip this class  │                   │
│    └──────┬──────┘      └──────────────────┘                   │
│           │                                                     │
│           ▼                                                     │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5d. Calculate Previous Week Range                     │  │
│    │     getWeekRangeInTimezone(timezone, weekConfig)      │  │
│    │     Returns { start: Date, end: Date }                │  │
│    │     Example: Sun Oct 1 - Sat Oct 7                    │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5e. Fetch All Active Students in Class                │  │
│    │     SELECT student_id FROM class_members               │  │
│    │     WHERE class_id = ? AND status = 'active'          │  │
│    │     AND is_test = false                                │  │
│    └────────────────┬───────────────────────────────────────┘  │
│                     ▼                                           │
│    ┌────────────────────────────────────────────────────────┐  │
│    │ 5f. FOR EACH STUDENT: Check Eligibility               │  │
│    │     ┌──────────────────────────────────────────────┐  │  │
│    │     │ Query student_warnings                       │  │  │
│    │     │ WHERE student_id = ?                         │  │  │
│    │     │ AND class_id = ?                             │  │  │
│    │     │ AND created_at BETWEEN weekStart AND weekEnd │  │  │
│    │     │ AND deleted_at IS NULL                       │  │  │
│    │     └──────────────┬───────────────────────────────┘  │  │
│    │                    │                                   │  │
│    │        ┌───────────┴───────────┐                       │  │
│    │        ▼ 0 warnings            ▼ ≥1 warning           │  │
│    │   ┌─────────────┐      ┌──────────────────┐           │  │
│    │   │ ELIGIBLE    │      │ NOT ELIGIBLE     │           │  │
│    │   └──────┬──────┘      └──────────────────┘           │  │
│    │          │                                             │  │
│    │          ▼                                             │  │
│    │   ┌────────────────────────────────────────────────┐  │  │
│    │   │ Award 1 Gidouille                              │  │  │
│    │   │ 1. INSERT weekly_rewards record                │  │  │
│    │   │ 2. INSERT gidouilles_history (+1)              │  │  │
│    │   │ 3. UPDATE profiles SET gidouilles += 1         │  │  │
│    │   │ 4. INSERT notification                         │  │  │
│    │   │                                                 │  │  │
│    │   │ ON CONFLICT (student_id, class_id, week_start) │  │  │
│    │   │ DO NOTHING (idempotent)                        │  │  │
│    │   └────────────────────────────────────────────────┘  │  │
│    └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Return Results                                               │
│    {                                                            │
│      success: true/false,                                       │
│      classesProcessed: N,                                       │
│      weeklyRewards: {                                           │
│        awarded: X,                                              │
│        classesProcessed: Y,                                     │
│        errors: [...]                                            │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Timezone Handling

### Problem Statement

Schools operate in different timezones worldwide:

- Europe/Paris (UTC+1/+2 with DST)
- Asia/Jerusalem (UTC+2/+3 with DST)
- America/New_York (UTC-5/-4 with DST)
- And 80+ more timezones

When the cron runs at 01:00 UTC:

- In Paris (UTC+1): It's 02:00 AM local → "yesterday" is the previous day
- In New York (UTC-5): It's 20:00 (8 PM) the previous day → "yesterday" is still the current day
- In Tokyo (UTC+9): It's 10:00 AM local → "yesterday" is the previous day

### Solution: Per-School Timezone Calculation

#### 1. Store Timezone in Database

```sql
ALTER TABLE schools
ADD COLUMN timezone TEXT DEFAULT 'Europe/Paris' NOT NULL;
```

#### 2. Calculate "Yesterday" Per Timezone

```typescript
export function getYesterdayInTimezone(timezone: string): Date {
	// Get current date-time in the specified timezone
	const nowInTz = utcToZonedTime(new Date(), timezone);

	// Subtract 1 day
	const yesterdayInTz = subDays(nowInTz, 1);

	// Set to start of day (00:00:00.000)
	const startOfYesterdayInTz = startOfDay(yesterdayInTz);

	// Convert back to UTC Date object
	return zonedTimeToUtc(startOfYesterdayInTz, timezone);
}
```

**Example**:

- Cron runs: 2025-11-13 01:00 UTC
- School timezone: Asia/Jerusalem (UTC+2)
- `nowInTz` = 2025-11-13 03:00 Jerusalem time
- `yesterdayInTz` = 2025-11-12 03:00 Jerusalem time
- `startOfYesterdayInTz` = 2025-11-12 00:00 Jerusalem time
- Return: 2025-11-11 22:00 UTC (which is 2025-11-12 00:00 Jerusalem)

#### 3. Get Day Boundaries in Timezone

```typescript
export function getDayBoundariesInTimezone(
	date: Date,
	timezone: string
): { start: Date; end: Date } {
	// Convert UTC date to timezone
	const dateInTz = utcToZonedTime(date, timezone);

	// Get start and end of day in timezone
	const startInTz = startOfDay(dateInTz);
	const endInTz = endOfDay(dateInTz);

	// Convert back to UTC
	return {
		start: zonedTimeToUtc(startInTz, timezone),
		end: zonedTimeToUtc(endInTz, timezone)
	};
}
```

**Usage in queries**:

```typescript
const { start, end } = getDayBoundariesInTimezone(yesterday, timezone);

const { data } = await supabase
	.from('gidouilles_history')
	.select('delta')
	.eq('student_id', studentId)
	.gte('created_at', start.toISOString())
	.lte('created_at', end.toISOString());
```

#### 4. Handle DST Transitions

The `date-fns-tz` library automatically handles DST:

- Spring forward: 02:00 → 03:00 (1 hour lost)
- Fall back: 02:00 → 01:00 (1 hour gained)

**Example (Europe/Paris DST spring forward)**:

- Date: 2025-03-30 (DST transition)
- `startOfDay(2025-03-30 in Europe/Paris)` = 2025-03-30 00:00 CET (UTC+1)
- `endOfDay(2025-03-30 in Europe/Paris)` = 2025-03-30 23:59 CEST (UTC+2)
- The library handles the 02:00 → 03:00 jump transparently

### Testing Multi-Timezone

```typescript
// Test: getYesterdayInTimezone
describe('getYesterdayInTimezone', () => {
	beforeEach(() => {
		// Mock current time: 2025-11-13 01:00 UTC
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-11-13T01:00:00Z'));
	});

	it('returns correct yesterday for Europe/Paris', () => {
		const yesterday = getYesterdayInTimezone('Europe/Paris');
		// Expected: 2025-11-12 00:00 Paris = 2025-11-11 23:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-11T23:00:00.000Z');
	});

	it('returns correct yesterday for Asia/Jerusalem', () => {
		const yesterday = getYesterdayInTimezone('Asia/Jerusalem');
		// Expected: 2025-11-12 00:00 Jerusalem = 2025-11-11 22:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-11T22:00:00.000Z');
	});

	it('returns correct yesterday for America/New_York', () => {
		const yesterday = getYesterdayInTimezone('America/New_York');
		// Expected: 2025-11-12 00:00 NY = 2025-11-12 05:00 UTC
		expect(yesterday.toISOString()).toBe('2025-11-12T05:00:00.000Z');
	});
});
```

---

## Week Configuration Logic

### Problem Statement

Different schools have different week structures:

- **Western**: Monday-Friday school, Saturday-Sunday weekend
- **Israeli**: Sunday-Thursday school, Friday-Saturday weekend
- **Middle East**: Sunday-Thursday school, Friday-Saturday weekend
- **Custom**: Any combination of 7 days

Weekly rewards must be distributed on the **last day of the school week**.

### Solution: Configurable Week Structure

#### 1. Week Config Schema

```typescript
export interface WeekConfig {
	first_day: number; // 0-6 (0=Sunday, 6=Saturday)
	last_day: number; // 0-6 (last day of school week)
	school_days: number[]; // Array of school days (0-6)
	weekend_days: number[]; // Array of weekend days (0-6)
}

// Default: Israeli school week
export const DEFAULT_WEEK_CONFIG: WeekConfig = {
	first_day: 0, // Sunday
	last_day: 6, // Saturday
	school_days: [0, 1, 2, 3, 4], // Sun-Thu
	weekend_days: [5, 6] // Fri-Sat
};
```

#### 2. Store in Database

```sql
-- timetable JSONB column in schools table
UPDATE schools
SET timetable = jsonb_set(
  COALESCE(timetable, '{"periods": []}'::jsonb),
  '{week_config}',
  '{
    "first_day": 0,
    "last_day": 6,
    "school_days": [0, 1, 2, 3, 4],
    "weekend_days": [5, 6]
  }'::jsonb
);
```

#### 3. Check if Today is Rewards Day

```typescript
export function isWeeklyRewardsDay(weekConfig: WeekConfig, currentDayOfWeek: number): boolean {
	return currentDayOfWeek === weekConfig.last_day;
}
```

**Example**:

- Week config: `{ last_day: 6 }` (Saturday)
- Current day: 6 (Saturday in Israel timezone)
- Result: `true` → Process weekly rewards

#### 4. Calculate Week Range

```typescript
export function getWeekRangeInTimezone(
	timezone: string,
	weekConfig: WeekConfig
): { start: Date; end: Date } {
	// Get current date in timezone
	const nowInTz = utcToZonedTime(new Date(), timezone);
	const currentDayOfWeek = getDay(nowInTz);

	// Calculate days since first_day
	let daysSinceFirstDay = currentDayOfWeek - weekConfig.first_day;
	if (daysSinceFirstDay < 0) {
		daysSinceFirstDay += 7;
	}

	// Start of current week = first_day
	const weekStartInTz = startOfDay(subDays(nowInTz, daysSinceFirstDay));

	// End of current week = last_day
	const daysUntilLastDay = weekConfig.last_day - weekConfig.first_day;
	const weekEndInTz = endOfDay(addDays(weekStartInTz, daysUntilLastDay));

	return {
		start: zonedTimeToUtc(weekStartInTz, timezone),
		end: zonedTimeToUtc(weekEndInTz, timezone)
	};
}
```

**Example (Israeli week, run on Sunday morning)**:

- Current date: 2025-11-16 03:00 Jerusalem (Sunday)
- Week config: `{ first_day: 0, last_day: 6, school_days: [0,1,2,3,4] }`
- `currentDayOfWeek` = 0 (Sunday)
- `daysSinceFirstDay` = 0
- `weekStartInTz` = 2025-11-16 00:00 Jerusalem (Sunday)
- `weekEndInTz` = 2025-11-22 23:59:59 Jerusalem (Saturday)
- **Previous week**: Subtract 7 days → 2025-11-09 to 2025-11-15
- Result: `{ start: 2025-11-08T22:00Z, end: 2025-11-15T21:59:59Z }`

#### 5. Preset Configurations

```typescript
export const WEEK_PRESETS = {
	western: {
		first_day: 1, // Monday
		last_day: 0, // Sunday
		school_days: [1, 2, 3, 4, 5], // Mon-Fri
		weekend_days: [6, 0] // Sat-Sun
	},
	israeli: {
		first_day: 0, // Sunday
		last_day: 6, // Saturday
		school_days: [0, 1, 2, 3, 4], // Sun-Thu
		weekend_days: [5, 6] // Fri-Sat
	},
	middle_east: {
		first_day: 0, // Sunday
		last_day: 6, // Saturday
		school_days: [0, 1, 2, 3, 4], // Sun-Thu
		weekend_days: [5, 6] // Fri-Sat
	}
};
```

### Edge Cases

#### Wrapping Weeks (Sunday-Saturday)

```typescript
// Week: Sunday (0) to Saturday (6)
// Current day: Saturday (6)
// Previous week: Sunday (0) of previous calendar week to Saturday (6)
```

#### Split Weeks (Friday-Thursday)

```typescript
// Week: Friday (5) to Thursday (4)
// Current day: Thursday (4)
// Previous week: Friday (5) of two weeks ago to Thursday (4) of last week
```

---

## RPC Functions and Security

### SECURITY DEFINER Functions

PostgreSQL RPC functions use `SECURITY DEFINER` to run with elevated privileges:

```sql
CREATE OR REPLACE FUNCTION public.compute_daily_summary(...)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as function owner, not caller
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- CRITICAL: Manual authorization check
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (...))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission';
    END IF;

    -- ... function logic ...
END;
$$;
```

### Why SECURITY DEFINER?

1. **Bypass RLS**: Service role client needs to read/write across all schools
2. **Complex Joins**: Aggregating across multiple tables with RLS would be slow
3. **System Operations**: Cron jobs run as service_role, not a user

### Security Model

**Defense in Depth**:

1. **API Level**: CRON_SECRET authentication before any processing
2. **Client Level**: Service role client (full access)
3. **Function Level**: Manual authorization checks in RPC functions
4. **RLS Level**: Policies on all tables (defense if RPC bypassed)

**Authorization Checks**:

```typescript
// RPC functions check caller role
if (auth.uid() IS NOT NULL) {
  // If called by authenticated user (not service_role)
  // Check permissions
  if (v_caller_role !== 'admin' && !isTeacherOfClass) {
    RAISE EXCEPTION 'Unauthorized';
  }
}
// If auth.uid() IS NULL → service_role → allowed
```

### RPC Functions

#### 1. `compute_daily_summary()`

```sql
CREATE OR REPLACE FUNCTION public.compute_daily_summary(
    p_student_id UUID,
    p_class_id UUID,
    p_summary_date DATE
)
RETURNS UUID
```

**Purpose**: Aggregate activity from history tables and create/update daily_summaries record

**Returns**: UUID of created/updated summary

**Security**: Admin, teacher of class, or service_role

#### 2. `award_weekly_reward()`

```sql
CREATE OR REPLACE FUNCTION public.award_weekly_reward(
    p_student_id UUID,
    p_class_id UUID,
    p_week_start DATE,
    p_week_end DATE,
    p_gidouilles INTEGER DEFAULT 1,
    p_reason TEXT DEFAULT 'no_warnings'
)
RETURNS UUID
```

**Purpose**: Award weekly reward if student has no warnings in the specified week

**Returns**: UUID of created reward, or NULL if ineligible

**Security**: Admin, teacher of class, or service_role

**Atomicity**:

```sql
INSERT INTO public.weekly_rewards (...)
SELECT ...
WHERE NOT EXISTS (
    SELECT 1 FROM public.student_warnings
    WHERE student_id = p_student_id
    AND DATE(created_at) BETWEEN p_week_start AND p_week_end
    AND deleted_at IS NULL
)
ON CONFLICT (student_id, class_id, week_start) DO NOTHING
RETURNING id INTO v_reward_id;

-- Only update gidouilles if INSERT succeeded
IF v_reward_id IS NOT NULL THEN
    PERFORM public.update_student_gidouilles(...);
END IF;
```

#### 3. `update_student_gidouilles()`

```sql
CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER,
    p_reason TEXT,
    p_created_by UUID
)
RETURNS VOID
```

**Purpose**: Update student gidouilles and log in history table

**Atomicity**:

```sql
BEGIN
    -- 1. Insert history record
    INSERT INTO public.gidouilles_history (...) VALUES (...);

    -- 2. Update profiles
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id;
COMMIT;
```

---

## Performance Considerations

### Database Indexes

All frequently queried columns are indexed:

**History Tables**:

```sql
-- gidouilles_history
CREATE INDEX idx_gidouilles_history_student_class_date
ON gidouilles_history(student_id, class_id, created_at DESC);

-- bonus_history
CREATE INDEX idx_bonus_history_student_class_date
ON bonus_history(student_id, class_id, created_at DESC);

-- student_warnings
CREATE INDEX idx_student_warnings_student_class_date
ON student_warnings(student_id, class_id, created_at DESC);

-- vip_cards_activity
CREATE INDEX idx_vip_cards_activity_student_date
ON vip_cards_activity(student_id, created_at DESC);
```

**Summary Tables**:

```sql
-- daily_summaries
CREATE UNIQUE INDEX idx_daily_summaries_unique
ON daily_summaries(student_id, class_id, summary_date);

CREATE INDEX idx_daily_summaries_date
ON daily_summaries(summary_date DESC);

CREATE INDEX idx_daily_summaries_pending
ON daily_summaries(summary_date, sent_at)
WHERE sent_at IS NULL;

-- weekly_rewards
CREATE UNIQUE INDEX idx_weekly_rewards_unique
ON weekly_rewards(student_id, class_id, week_start);
```

### Query Optimization

**Aggregation Query**:

```sql
-- Optimized with indexes
SELECT
    COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) as gained,
    COALESCE(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END), 0) as lost
FROM public.gidouilles_history
WHERE student_id = $1
AND class_id = $2
AND created_at >= $3  -- Start of day in UTC
AND created_at <= $4; -- End of day in UTC

-- Uses: idx_gidouilles_history_student_class_date
-- Explain: Index Scan, ~1ms for 100 records
```

### Batch Processing

**Current**: Loop over students sequentially

```typescript
for (const member of members) {
  await aggregateDailyChanges(supabase, member.student_id, ...);
  await createNotification(...);
}
```

**Future Optimization** (if needed):

```typescript
// Batch aggregate with SQL
const summaries = await supabase.rpc('batch_aggregate_daily_summaries', {
  p_class_id: classId,
  p_date: date
});

// Batch insert notifications
await supabase.from('notifications').insert(summaries.map(...));
```

### Expected Performance

**Per Class**:

- 30 students average
- 4 history tables queried per student
- 4 × 30 = 120 queries + 30 inserts
- With indexes: ~1-2 seconds per class

**Total**:

- 45 classes × 1.5s = 67.5 seconds
- Add 20% overhead: ~81 seconds
- Well within 120s (2 minute) Vercel timeout

**Bottlenecks**:

- Database connection latency (50-100ms per query)
- Network roundtrips to Supabase

**Mitigation**:

- Connection pooling (Supabase handles this)
- Batching (future optimization)
- Indexes on all query columns

---

## Testing Strategy

### Unit Tests (130 comprehensive tests)

**Test Structure**:

```
src/lib/server/summaries/
├── timezone-utils.test.ts       # 25 tests
├── daily.test.ts                # 35 tests
├── weekly.test.ts               # 30 tests
├── notifications.test.ts        # 20 tests
└── integration.test.ts          # 20 tests
```

**Key Test Categories**:

#### 1. Timezone Utilities (25 tests)

```typescript
describe('getYesterdayInTimezone', () => {
	it('returns correct yesterday for multiple timezones');
	it('handles DST spring forward');
	it('handles DST fall back');
	it('handles non-DST timezones');
});

describe('getDayBoundariesInTimezone', () => {
	it('returns correct UTC boundaries for Paris timezone');
	it('handles midnight edge case');
	it('handles 23:59:59 edge case');
});

describe('getWeekRangeInTimezone', () => {
	it('calculates correct week range for Israeli calendar');
	it('calculates correct week range for Western calendar');
	it('handles week wrapping (Sun-Sat)');
});
```

#### 2. Daily Summary Logic (35 tests)

```typescript
describe('checkClassSchedule', () => {
	it('returns true when class is scheduled');
	it('returns false when class is not scheduled');
	it('handles multiple periods same day');
});

describe('aggregateDailyChanges', () => {
	it('aggregates gidouilles correctly');
	it('aggregates bonus correctly');
	it('counts warnings correctly');
	it('counts VIP cards correctly');
	it('handles no activity (all zeros)');
	it('handles mixed positive and negative deltas');
});

describe('generateDailySummary', () => {
	it('creates daily_summaries record');
	it('creates notification for student');
	it('skips notification if no changes');
	it('handles multiple students');
	it('uses ON CONFLICT to prevent duplicates');
});
```

#### 3. Weekly Reward Logic (30 tests)

```typescript
describe('checkNoWarningsInWeek', () => {
	it('returns true when no warnings');
	it('returns false when warnings exist');
	it('ignores soft-deleted warnings');
	it('respects week boundaries');
});

describe('generateWeeklyRewards', () => {
	it('awards gidouille to eligible student');
	it('skips students with warnings');
	it('creates weekly_rewards record');
	it('updates profiles.gidouilles');
	it('creates notification');
	it('is idempotent (ON CONFLICT DO NOTHING)');
	it('handles class with no eligible students');
});
```

#### 4. Notification Formatting (20 tests)

```typescript
describe('formatDailySummary', () => {
	it('formats gains and losses correctly');
	it('formats date in French locale');
	it('handles all zeros');
	it('handles only gains');
	it('handles only losses');
});

describe('createDailySummaryNotification', () => {
	it('creates notification with correct structure');
	it('sets priority to normal');
	it('sets target_mode to dropdown');
	it('includes formatted message');
});
```

#### 5. Integration Tests (20 tests)

```typescript
describe('Full Daily Summary Flow', () => {
	it('processes class with lessons yesterday');
	it('skips class without lessons yesterday');
	it('handles multiple classes in different timezones');
	it('continues processing after class failure');
});

describe('Full Weekly Rewards Flow', () => {
	it('processes rewards on last day of week');
	it('skips rewards on other days');
	it('handles mixed eligible/ineligible students');
	it('respects timezone when checking day of week');
});
```

### Database Trigger Tests

**Gidouilles/Bonus RPC Tests**:

```typescript
describe('update_student_gidouilles', () => {
	it('updates profiles.gidouilles correctly');
	it('creates gidouilles_history record');
	it('handles negative deltas (never below 0)');
	it('is atomic (rollback on error)');
});
```

### Manual Testing

**Test Scenarios**:

1. **Manual Trigger**: POST to `/api/cron/daily-summaries-and-rewards` with CRON_SECRET
2. **Timezone Verification**: Create classes in different timezones, verify "yesterday" calculation
3. **Week Config Verification**: Test Israeli, Western, and custom week configs
4. **Notification Verification**: Check that students receive notifications
5. **Error Recovery**: Simulate database errors, verify graceful degradation

---

## Error Handling

### Error Handling Strategy

**Philosophy**: Graceful degradation with detailed logging

#### 1. Class-Level Isolation

```typescript
for (const classData of classes) {
  try {
    // Process class
    await generateDailySummary(...);
    await generateWeeklyRewards(...);
  } catch (err) {
    // Log error but continue with next class
    console.error(`[Cron] Error processing class ${classData.id}:`, err);
    results.dailySummaries.errors.push(`Class ${classData.id}: ${err.message}`);
    results.success = false;
  }
}
```

**Rationale**: One failing class shouldn't stop processing of all other classes

#### 2. Student-Level Resilience

```typescript
for (const member of members) {
  try {
    const changes = await aggregateDailyChanges(...);
    await createDailySummaryRecord(...);
    await createNotification(...);
  } catch (err) {
    // Log error, continue with next student
    console.error(`[Daily] Error for student ${member.student_id}:`, err);
  }
}
```

#### 3. Partial Success Responses

```typescript
// 207 Multi-Status if some operations failed
return json(
	{
		success: false,
		classesProcessed: 45,
		dailySummaries: {
			generated: 310,
			classesProcessed: 37,
			errors: ['Class abc123: Database timeout', 'Class def456: Student not found']
		}
	},
	{ status: 207 }
);
```

#### 4. Job Run Tracking

```sql
-- Start job
SELECT public.start_job_run('daily_summaries_and_rewards', '{}');

-- Complete job (success/partial/failed)
SELECT public.complete_job_run(
  p_run_id := '...',
  p_status := 'partial_failure',
  p_metadata := '{
    "classes_processed": 45,
    "daily_summaries": 310,
    "weekly_rewards": 82,
    "errors": 2
  }'::jsonb
);
```

**Benefits**:

- Audit trail of all cron executions
- Monitor success rate over time
- Debug failures with metadata

### Common Errors and Solutions

#### Error: Authentication Failed

```
401 Unauthorized: Invalid or missing cron token
```

**Cause**: CRON_SECRET not set or incorrect

**Solution**:

1. Verify `CRON_SECRET` in Vercel environment variables
2. Update Authorization header with correct token
3. Re-deploy if environment variable changed

#### Error: Database Connection Timeout

```
Class abc123: Failed to fetch class members: Connection timeout
```

**Cause**: Temporary Supabase outage or network issue

**Solution**:

1. Check Supabase status page
2. Retry cron job manually after 5 minutes
3. If persistent, contact Supabase support

#### Error: Invalid Timezone

```
Class abc123: Invalid timezone: Europe/Invalid
```

**Cause**: School configured with non-IANA timezone

**Solution**:

1. Check school configuration: `SELECT timezone FROM schools WHERE id = 'abc123'`
2. Update to valid IANA timezone: `UPDATE schools SET timezone = 'Europe/Paris' WHERE id = 'abc123'`
3. Verify timezone in list: Check `src/lib/utils/timezones.ts`

#### Error: No Class Schedule

```
Class abc123 had no lessons yesterday, skipping daily summary
```

**Cause**: No entries in `class_schedules` table

**Solution**:

1. This is **expected behavior** if no lessons
2. If class should have had lessons: Add schedule entry in admin UI
3. Verify day_of_week matches expected day (0=Sunday, 6=Saturday)

### Monitoring and Alerts

**Metrics to Monitor**:

- Success rate (should be > 95%)
- Execution time (should be < 3 minutes)
- Classes processed vs total active classes
- Summaries generated vs expected
- Rewards awarded vs expected

**Alert Conditions**:

- Success rate < 90% for 3 consecutive days
- Execution time > 5 minutes
- Zero summaries generated (when classes exist)
- Authentication failures

**Tools**:

- Vercel Logs (real-time monitoring)
- `job_runs` table (historical data)
- Error Monitoring system (error tracking)
- Supabase Dashboard (database metrics)

---

## Appendices

### Appendix A: File Locations

**Backend**:

- Cron endpoint: `src/routes/api/cron/daily-summaries-and-rewards/+server.ts`
- Admin config endpoint: `src/routes/api/admin/schools/[schoolId]/config/+server.ts`
- Server helpers: `src/lib/server/summaries/`
- Timezone utils: `src/lib/utils/timezones.ts`
- Week config utils: `src/lib/utils/week-config.ts`
- Validation schemas: `src/lib/server/validation/school-config.ts`

**Frontend**:

- School config modal: `src/lib/components/admin/SchoolConfigModal.svelte`
- Week config editor: `src/lib/components/admin/WeekConfigEditor.svelte`

**Database**:

- Migrations: `supabase/migrations/20251113*.sql` (6 files)
- Types: `src/lib/types/database.ts`

**Tests**:

- Unit tests: `src/lib/server/summaries/*.test.ts` (5 files)
- API tests: `src/routes/api/admin/schools/[schoolId]/config/config.test.ts`
- Integration tests: `src/lib/server/summaries/integration.test.ts`

**Documentation**:

- User guide: `docs/features/daily-summaries-weekly-rewards.md`
- Admin guide: `docs/guides/school-configuration.md`
- API reference: `docs/api/cron-endpoints.md`
- This document: `docs/architecture/daily-summaries-system.md`
- Migration guide: `docs/guides/daily-summaries-migration.md`

### Appendix B: Dependencies

**Production**:

- `date-fns`: ^3.0.0 (date manipulation)
- `date-fns-tz`: ^3.0.0 (timezone conversions)
- `zod`: ^3.22.0 (schema validation)
- `@supabase/supabase-js`: ^2.38.0 (database client)

**Development**:

- `vitest`: ^1.0.0 (unit testing)
- `@vitest/ui`: ^1.0.0 (test UI)

### Appendix C: Migration Checklist

See [Migration Guide](../guides/daily-summaries-migration.md) for complete deployment instructions.

**Quick Checklist**:

- [ ] Apply 6 database migrations
- [ ] Update `src/lib/types/database.ts`
- [ ] Set `CRON_SECRET` environment variable
- [ ] Configure Vercel cron in `vercel.json`
- [ ] Deploy to Vercel
- [ ] Configure school timezones and week configs
- [ ] Test with manual trigger
- [ ] Monitor first automated run

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
**Maintained By**: UbuMaths Development Team
