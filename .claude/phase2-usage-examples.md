# Phase 2: Usage Examples

Quick reference for using the summaries helper functions.

---

## Basic Usage Pattern (Phase 3 Cron Job)

```typescript
import { createClient } from '@supabase/supabase-js';
import {
	getYesterdayInTimezone,
	getCurrentDayOfWeekInTimezone,
	generateDailySummary,
	generateWeeklyRewards,
	isWeeklyRewardsDay
} from '$lib/server/summaries';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 1. Get all schools with their timezones and week configs
const { data: schools } = await supabase
	.from('schools')
	.select('id, name, timezone, week_config');

for (const school of schools) {
	const timezone = school.timezone || 'Europe/Paris';
	const weekConfig = school.week_config || DEFAULT_WEEK_CONFIG;

	// Get yesterday in school's timezone
	const yesterday = getYesterdayInTimezone(timezone);

	// Get all classes for this school
	const { data: classes } = await supabase
		.from('classes')
		.select('id, name, school_id')
		.eq('school_id', school.id);

	// Generate daily summaries for each class
	for (const classData of classes) {
		const summariesCount = await generateDailySummary(
			supabase,
			classData,
			yesterday,
			timezone
		);
		console.log(`Generated ${summariesCount} daily summaries for ${classData.name}`);
	}

	// Check if today is weekly rewards day
	const currentDay = getCurrentDayOfWeekInTimezone(timezone);
	if (isWeeklyRewardsDay(weekConfig, currentDay)) {
		// Generate weekly rewards for each class
		for (const classData of classes) {
			const rewardsCount = await generateWeeklyRewards(
				supabase,
				classData,
				weekConfig,
				timezone
			);
			console.log(`Awarded ${rewardsCount} weekly rewards for ${classData.name}`);
		}
	}
}
```

---

## Timezone Utilities

### Get Yesterday in School's Timezone

```typescript
import { getYesterdayInTimezone } from '$lib/server/summaries';

// For a school in Paris (Europe/Paris timezone)
const yesterday = getYesterdayInTimezone('Europe/Paris');
// If now is 2025-11-13 02:00 UTC
// Returns: 2025-11-12 00:00:00 UTC (which is 2025-11-12 01:00 Paris time)

// For a school in Qatar (Asia/Qatar timezone)
const yesterday = getYesterdayInTimezone('Asia/Qatar');
```

### Get Current Day of Week

```typescript
import { getCurrentDayOfWeekInTimezone } from '$lib/server/summaries';

const dayOfWeek = getCurrentDayOfWeekInTimezone('Europe/Paris');
// Returns: 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday)
// Calculated in the school's local time, not UTC
```

### Get Previous Week Range

```typescript
import { getWeekRangeInTimezone } from '$lib/server/summaries';

const weekConfig = {
	first_day: 0, // Sunday
	last_day: 6,  // Saturday
	school_days: [0, 1, 2, 3, 4],
	weekend_days: [5, 6]
};

const { start, end } = getWeekRangeInTimezone('Europe/Paris', weekConfig);
// If today is Sunday 2025-11-16
// Returns: {
//   start: Sun Nov 9 00:00 UTC,
//   end: Sat Nov 15 23:59:59 UTC
// }
```

### Format Date for Display

```typescript
import { formatDateForDisplay } from '$lib/server/summaries';

const date = new Date('2025-11-13');
const formatted = formatDateForDisplay(date); // French by default
// Returns: "13 novembre 2025"

const formatted = formatDateForDisplay(date, 'en-US');
// Returns: "November 13, 2025"
```

---

## Daily Summaries

### Check Class Schedule

```typescript
import { checkClassSchedule } from '$lib/server/summaries';

const hasClass = await checkClassSchedule(
	supabase,
	'class-uuid',
	new Date('2025-11-13')
);
// Returns: true if class_schedules has entry for this day of week
```

### Aggregate Daily Changes

```typescript
import { aggregateDailyChanges } from '$lib/server/summaries';

const changes = await aggregateDailyChanges(
	supabase,
	'student-uuid',
	'class-uuid',
	new Date('2025-11-12'),
	'Europe/Paris'
);

// Returns:
// {
//   gidouilles_gained: 15,
//   gidouilles_lost: 3,
//   bonus_gained: 5,
//   bonus_used: 2,
//   warnings_issued: 1,
//   warnings_removed: 0,
//   vip_cards_gained: 2,
//   vip_cards_used: 1,
//   vip_cards_removed: 0
// }
```

### Generate Daily Summary for Class

```typescript
import { generateDailySummary } from '$lib/server/summaries';

const classData = {
	id: 'class-uuid',
	name: 'Mathématiques',
	school_id: 'school-uuid',
	created_at: '...',
	updated_at: '...'
};

const yesterday = new Date('2025-11-12');
const count = await generateDailySummary(
	supabase,
	classData,
	yesterday,
	'Europe/Paris'
);

console.log(`Sent ${count} daily summaries`);
// Automatically:
// - Processes all students in class
// - Skips students with no changes
// - Inserts into daily_summaries table
// - Creates notifications
```

---

## Weekly Rewards

### Check No Warnings in Week

```typescript
import { checkNoWarningsInWeek } from '$lib/server/summaries';

const weekStart = new Date('2025-11-09');
const weekEnd = new Date('2025-11-15');

const noWarnings = await checkNoWarningsInWeek(
	supabase,
	'student-uuid',
	'class-uuid',
	weekStart,
	weekEnd
);
// Returns: true if student has zero active warnings in this week
```

### Generate Weekly Rewards

```typescript
import { generateWeeklyRewards } from '$lib/server/summaries';

const weekConfig = {
	first_day: 0,
	last_day: 6,
	school_days: [0, 1, 2, 3, 4],
	weekend_days: [5, 6]
};

const count = await generateWeeklyRewards(
	supabase,
	classData,
	weekConfig,
	'Europe/Paris'
);

console.log(`Awarded ${count} weekly rewards`);
// Automatically:
// - Calculates previous week range
// - Checks each student for warnings
// - Awards 1 gidouille to eligible students
// - Inserts into weekly_rewards table
// - Creates notifications
```

### Check if Today is Rewards Day

```typescript
import { isWeeklyRewardsDay, getCurrentDayOfWeekInTimezone } from '$lib/server/summaries';

const currentDay = getCurrentDayOfWeekInTimezone('Europe/Paris');
const shouldRunRewards = isWeeklyRewardsDay(weekConfig, currentDay);

if (shouldRunRewards) {
	// Run weekly rewards processing
}
```

---

## Notifications

### Create Daily Summary Notification

```typescript
import { createDailySummaryNotification } from '$lib/server/summaries';

const changes = {
	gidouilles_gained: 15,
	gidouilles_lost: 3,
	bonus_gained: 5,
	bonus_used: 0,
	warnings_issued: 1,
	warnings_removed: 0,
	vip_cards_gained: 0,
	vip_cards_used: 0,
	vip_cards_removed: 0
};

await createDailySummaryNotification(
	supabase,
	'student-uuid',
	'Mathématiques',
	new Date('2025-11-12'),
	changes
);
// Creates notification in database with formatted message
```

### Create Weekly Reward Notification

```typescript
import { createWeeklyRewardNotification } from '$lib/server/summaries';

await createWeeklyRewardNotification(
	supabase,
	'student-uuid',
	'Mathématiques',
	new Date('2025-11-09'),
	new Date('2025-11-15')
);
// Creates notification in database with congratulations message
```

### Format Summary Messages

```typescript
import { formatDailySummary, formatWeeklyReward } from '$lib/server/summaries';

// Daily summary
const message = formatDailySummary('Mathématiques', new Date(), changes);
console.log(message);
// 📊 Bilan du 13 novembre - Mathématiques
//
// 🪙 Gidouilles : +15 gagnées, -3 perdues (Total : +12)
// ⚠️ Avertissements : 1 reçu
// ⭐ Bonus : +5 gagnés

// Weekly reward
const message = formatWeeklyReward(
	'Mathématiques',
	new Date('2025-11-09'),
	new Date('2025-11-15')
);
console.log(message);
// 🏆 Récompense hebdomadaire - Mathématiques
//
// Bravo ! Tu as reçu 1 gidouille pour avoir passé la semaine
// du 9 au 15 novembre sans avertissement.
//
// Continue comme ça ! 💪
```

---

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
	const count = await generateDailySummary(
		supabase,
		classData,
		yesterday,
		timezone
	);
	console.log(`Success: ${count} summaries sent`);
} catch (error) {
	console.error('Failed to generate summaries:', error);
	// Error is logged with [functionName] prefix for easy debugging
	// Individual student errors don't stop processing of other students
}
```

---

## Performance Tips

1. **Batch by School**: Process all classes for a school together to reuse timezone calculations

2. **Parallel Processing**: Process different schools in parallel if needed

3. **Early Exit**: Functions skip students with no changes to avoid unnecessary DB writes

4. **Indexed Queries**: All queries use indexed columns (student_id, class_id, created_at)

5. **Error Recovery**: Individual student failures don't stop batch processing

---

## Testing in Development

```typescript
// Test with a single class
import { generateDailySummary } from '$lib/server/summaries';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const testClass = {
	id: 'your-test-class-uuid',
	name: 'Test Class',
	school_id: 'your-test-school-uuid',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
};

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const count = await generateDailySummary(
	supabase,
	testClass,
	yesterday,
	'Europe/Paris'
);

console.log(`Generated ${count} summaries`);
```

---

## Common Patterns

### Process All Schools

```typescript
const { data: schools } = await supabase
	.from('schools')
	.select('id, name, timezone, week_config');

for (const school of schools) {
	try {
		await processDailySummariesForSchool(school);
		await processWeeklyRewardsForSchool(school);
	} catch (error) {
		console.error(`Failed for school ${school.name}:`, error);
		// Continue with next school
	}
}
```

### Get Analytics

```typescript
import { getNotificationsSummary } from '$lib/server/summaries';

const startDate = new Date('2025-11-01');
const endDate = new Date('2025-11-30');

const summary = await getNotificationsSummary(supabase, startDate, endDate);
// Returns: {
//   daily_summaries: 1250,
//   weekly_rewards: 180,
//   total: 1430
// }
```

---

## Type Imports

```typescript
import type {
	DailyChanges,
	ClassWithSchool,
	DailySummaryResult,
	WeeklyRewardResult
} from '$lib/server/summaries';

const changes: DailyChanges = {
	gidouilles_gained: 0,
	gidouilles_lost: 0,
	// ... other fields
};
```
