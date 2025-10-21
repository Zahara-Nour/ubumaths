# CLAUDE_FEATURES.md

> **📖 Core Project Guidelines**: See **[CLAUDE.md](CLAUDE.md)** for project structure, Svelte 5 best practices, and development workflows.

This file contains detailed documentation for specific features of the Ubumaths application.

---

## Holographic VIP Cards System

The project includes an advanced holographic card effect system for VIP rewards, inspired by Pokemon trading cards. The system provides interactive 3D effects that respond to mouse movement and device orientation.

### Overview

**Location:** `/vip-cards-demo` - Public showcase page
**Component:** `VipCardHolo.svelte` - Main holographic card component
**Original Source:** Adapted from [Pokemon Cards CSS](https://github.com/simeydotme/pokemon-cards-css)

### Architecture

#### Asset Files (`static/`)

```
static/
├── holo-assets/              # Holographic textures
│   ├── grain.webp           # Texture overlay
│   ├── glitter.png          # Sparkle effect
│   └── cosmos.png           # Galaxy background
├── images/vip-cards/         # 26 VIP card images
│   └── *.jpg                # Card front images
└── css/holo-cards/           # Effect CSS files
    ├── base.css             # Core 3D transforms
    ├── cards.css            # Shared variables
    ├── regular-holo.css     # Common rarity
    ├── cosmos-holo.css      # Rare rarity
    ├── rainbow-holo.css     # Epic rarity
    └── secret-rare.css      # Legendary rarity
```

#### Code Files (`src/lib/`)

```
src/lib/
├── components/
│   ├── VipCard.svelte       # Simple flip card (original)
│   └── VipCardHolo.svelte   # Holographic card (new)
├── stores/
│   └── holo-card.svelte.ts  # Active card & orientation stores
├── utils/
│   └── holo-math.ts         # Math helpers (round, clamp, adjust)
└── types/
    └── vip-card.ts          # VIP card types & data
```

### Rarity-Based Effects

The holographic effect changes based on card rarity:

| Rarity        | CSS File           | Effect Description                       | Count |
| ------------- | ------------------ | ---------------------------------------- | ----- |
| **Common**    | `regular-holo.css` | Vertical beam holographic pattern        | 9     |
| **Rare**      | `cosmos-holo.css`  | Galaxy background with rainbow gradients | 10    |
| **Epic**      | `rainbow-holo.css` | Intense glitter with pastel rainbow      | 5     |
| **Legendary** | `secret-rare.css`  | Shimmering gold with multiple layers     | 2     |

### Component Usage

#### Basic Usage

```svelte
<script>
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { VIP_CARDS } from '$lib/types/vip-card';

	const card = VIP_CARDS[0]; // Any VIP card
</script>

<VipCardHolo {card} />
```

#### With Count Badge

```svelte
<VipCardHolo {card} count={3} />
```

#### Showcase Mode (Auto-Rotation)

```svelte
<VipCardHolo {card} showcase={true} />
```

### Component Props

```typescript
interface Props {
	card: VipCard; // Required: VIP card data
	count?: number; // Optional: Display count badge (default: 1)
	showcase?: boolean; // Optional: Enable auto-rotation (default: false)
}
```

**Image Handling:** Card images automatically scale to fill the entire card area using `object-fit: cover`, maintaining the card's aspect ratio while cropping the image as needed. This ensures personal images of any dimension will properly fill the card without distortion.

### Interactive Features

All holographic cards support:

1. **Mouse Tracking** - 3D tilt follows cursor position
2. **Touch Support** - Works on mobile devices
3. **Click to Expand** - Full-screen card view with 360° spin animation
4. **Gyroscope Support** - Tilts with device orientation on mobile
5. **Spring Animations** - Smooth physics-based transitions

### Stores (Svelte 5 Runes)

#### Active Card Store

Tracks which card is currently expanded:

```typescript
import { activeCard } from '$lib/stores/holo-card.svelte';

// Set active card
activeCard.set(cardElement);

// Get active card
const current = activeCard.get();

// Clear active card
activeCard.clear();
```

#### Orientation Store

Tracks device gyroscope for mobile tilt effects:

```typescript
import { orientation, resetBaseOrientation } from '$lib/stores/holo-card.svelte';

// Get current orientation
const current = orientation.get();
// Returns: { absolute: {...}, relative: {...} }

// Reset base orientation
resetBaseOrientation();
```

### CSS Architecture

The holographic effects use CSS custom properties for dynamic positioning:

```css
/* Dynamic CSS variables set by component */
--pointer-x: 50%; /* Mouse X position */
--pointer-y: 50%; /* Mouse Y position */
--pointer-from-center: 0; /* Distance from center (0-1) */
--pointer-from-top: 0; /* Distance from top (0-1) */
--pointer-from-left: 0; /* Distance from left (0-1) */
--card-opacity: 0; /* Holographic effect opacity */
--rotate-x: 0deg; /* 3D rotation X */
--rotate-y: 0deg; /* 3D rotation Y */
--background-x: 50%; /* Background position X */
--background-y: 50%; /* Background position Y */
--card-scale: 1; /* Card scale factor */
--translate-x: 0px; /* Translation X */
--translate-y: 0px; /* Translation Y */
```

### Loading CSS Files

To use holographic cards, include CSS in your layout:

```svelte
<!-- +layout.svelte -->
<svelte:head>
	<link rel="stylesheet" href="/css/holo-cards/base.css" />
	<link rel="stylesheet" href="/css/holo-cards/cards.css" />
	<link rel="stylesheet" href="/css/holo-cards/regular-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/cosmos-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/rainbow-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/secret-rare.css" />
</svelte:head>
```

### Migration from Svelte 3 to Svelte 5

The holographic card component was migrated from the original Pokemon cards project (Svelte 3) to Svelte 5:

**Key Changes:**

- `export let` → `$props()`
- `$: reactive` → `$derived` and `$effect`
- Store subscriptions (`$store`) → `.get()` method
- Svelte 3 stores → Svelte 5 runes-based stores
- Fixed `$` prefix variable naming (reserved in Svelte 5)
- `<svelte:component this={Component} />` → `<Component />` (components are dynamic by default)

### Performance Considerations

**Hardware Acceleration:**

- All cards use `transform: translate3d()` for GPU acceleration
- Spring animations use `will-change` hints
- Transform-style preserved for 3D effects

**Optimization Tips:**

- Limit number of visible cards (use pagination/virtual scrolling for large lists)
- Disable showcase mode on low-end devices
- Consider using simple `VipCard` component for list views
- Use `VipCardHolo` only for detail/showcase views

### Demo Page

**Route:** `/demo/vip-cards-demo`
**Access:** Public (no authentication required)

The demo page showcases:

- All 26 VIP cards organized by rarity
- Interactive showcase card with auto-rotation
- Rarity legend explaining each effect
- Responsive grid layout
- Back-to-top navigation

### Integration Example

Replace existing VipCard with VipCardHolo in specific views:

```svelte
<!-- Before -->
<VipCard card={myCard} />

<!-- After (with holographic effect) -->
<VipCardHolo card={myCard} />
```

**When to use each:**

- **VipCard** - Simple lists, compact views, better performance
- **VipCardHolo** - Feature highlights, rewards showcase, detail views

### Troubleshooting

**Cards not displaying effects:**

- Ensure CSS files are loaded in layout
- Check browser DevTools for 404 errors on assets
- Verify `card.rarity` matches CSS selectors

**Poor performance:**

- Reduce number of visible cards
- Disable showcase mode
- Check for CSS `will-change` support
- Consider using IntersectionObserver to lazy-load effects

**Mobile gyroscope not working:**

- Request device orientation permission
- Test on HTTPS (required for sensors)
- Check browser compatibility

### Browser Compatibility

**Fully Supported:**

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Partial Support:**

- Older browsers may lack gyroscope or 3D transforms
- Fallback: Static card display without effects

---

## Teacher Students Cache System

The Teacher Students Cache System provides client-side caching of student data to improve performance and reduce redundant API calls across the teacher dashboard.

### Overview

**Location:** `src/lib/stores/teacherStudentsCache.svelte.ts`
**Type:** Svelte 5 rune-based store with progressive loading

The cache progressively populates as teachers access student data, providing instant responses for subsequent requests. It automatically invalidates when student data changes (imports, rewards, class membership).

### Architecture

**Cache Structure:**

```typescript
Map<
	classId,
	{
		students: CachedStudent[] | CachedStudentFull[];
		lastFetched: Date;
		isLoading: boolean;
		isFull: boolean; // Whether this cache has full data
	}
>;
```

**Two Data Levels:**

1. **Minimal** (for Wheel): `id, firstname, lastname, avatar_url`
2. **Full** (for Rewards): Includes `gidouilles, vip_cards, role, gender`

### Basic Usage

```typescript
import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';

// Get students (auto-fetches if not cached)
const students = await teacherStudentsCache.getStudents(classId);

// Get students with full data
const studentsWithRewards = await teacherStudentsCache.getStudents(classId, true);

// Check if class is cached
if (teacherStudentsCache.has(classId)) { ... }

// Get cached data synchronously (returns undefined if not cached)
const cached = teacherStudentsCache.getCached(classId);

// Preload students in background (fire-and-forget)
teacherStudentsCache.preload(classId, false);
```

### Cache Invalidation

**When to Invalidate:**

- After student imports (clear entire cache)
- After gidouilles/rewards changes (invalidate affected class)
- After VIP card awards (invalidate affected class)
- After class membership changes (invalidate affected class)

**How to Invalidate:**

```typescript
// Invalidate specific class
teacherStudentsCache.invalidate(classId);

// Invalidate multiple classes
teacherStudentsCache.invalidateMany([classId1, classId2]);

// Clear entire cache (e.g., after bulk import)
teacherStudentsCache.clear();
```

### API Endpoint Enhancement

**Endpoint:** `GET /api/classes/[classId]/students`

**Query Parameters:**

- `?full=true` - Returns full student data (gidouilles, vip_cards, etc.)
- `?full=false` or omitted - Returns minimal data (id, firstname, lastname, avatar_url)

**Example:**

```typescript
// Minimal data
fetch('/api/classes/abc123/students');

// Full data
fetch('/api/classes/abc123/students?full=true');
```

### Integration Points

**1. Teacher Dashboard** ([TeacherDashboard.svelte](<src/routes/(protected)/dashboard/TeacherDashboard.svelte>))

- Uses cache for Wheel of Fortune modal
- Preloads students when class is selected
- Instant modal opening on cache hit

**2. Rewards Page** ([teacher/rewards/+page.svelte](<src/routes/(protected)/dashboard/teacher/rewards/+page.svelte>))

- Invalidates cache after gidouilles updates
- Invalidates cache after VIP card awards
- Ensures fresh data after mutations

**3. Import Students** ([admin/import-students/+page.svelte](<src/routes/(protected)/dashboard/admin/import-students/+page.svelte>))

- Clears entire cache after successful import
- Ensures all teachers see new students

### Performance Benefits

**Before Cache:**

- Dashboard wheel modal: 200-500ms load time on every open
- Rewards page: Server-side load on every navigation
- Multiple API calls for same data across pages

**After Cache:**

- Dashboard wheel modal: 0ms on cache hit (instant)
- Preloading: Data ready before user clicks
- Single API call per class (until invalidation)
- Shared data across dashboard components

**Deduplication:**
If multiple components request the same class simultaneously, only one API call is made. Subsequent requests wait for the in-flight request to complete.

### Cache Statistics

**Debug Method:**

```typescript
const stats = teacherStudentsCache.getStats();
// Returns: { cachedClasses, loadingClasses, totalStudents }
```

**Memory Usage:**

- Minimal data: ~100 bytes per student
- Full data: ~300 bytes per student
- Typical class (25 students): ~2.5KB (minimal) or ~7.5KB (full)
- 10 classes cached: ~25-75KB total (negligible)

### Best Practices

**DO:**

- Use `getCached()` first for instant display, then fetch in background
- Preload selected class on dashboard mount
- Invalidate immediately after mutations
- Use minimal data when full data is not needed
- Clear cache on logout (handled automatically)

**DON'T:**

- Rely on stale cache after mutations
- Cache student passwords or sensitive auth data
- Manually implement caching - use this store
- Fetch same class multiple times in parallel

### Error Handling

**Cache Misses:**

- Automatically fetches from API
- Returns empty array on error
- Logs errors to console

**Network Errors:**

- Failed requests remove loading state
- Cache entry is deleted (will retry on next request)
- User sees error toast from calling component

**Race Conditions:**

- Deduplication prevents simultaneous fetches
- In-flight requests tracked per class
- Late requests wait for existing fetch

### Future Enhancements

Potential improvements:

- Time-based expiration (optional 5-minute TTL)
- IndexedDB persistence across sessions
- Optimistic updates for real-time feel
- WebSocket integration for live updates
- Cache warming (preload all teacher's classes on login)

### Testing

**Test Suite Location:**

- Unit tests: `src/lib/stores/teacherStudentsCache.test.ts`
- Integration tests: `src/lib/stores/teacherStudentsCache.integration.test.ts`
- Component tests: `src/routes/(protected)/dashboard/TeacherDashboard.svelte.spec.ts`
- E2E tests: `e2e/teacher-students-cache.spec.ts`
- Test fixtures: `src/lib/test-utils/cache-fixtures.ts`

**Coverage:**

- ✅ **100% code coverage** (55/55 unit tests passing)
- 10 test suites covering all methods and edge cases
- Comprehensive error scenario testing
- Race condition and timeout testing
- Deduplication and cache invalidation testing

**Run Tests:**

```bash
# All cache tests
pnpm test:unit teacherStudentsCache

# Watch mode
pnpm test:unit --watch teacherStudentsCache

# Coverage report
pnpm test:unit --coverage teacherStudentsCache
```

**Test Highlights:**

- Cache hit/miss scenarios
- Minimal vs full data handling
- Request deduplication (simultaneous requests)
- Loading states and timeouts
- Error handling (network, HTTP errors, malformed data)
- Preloading and background fetching
- Cache statistics and invalidation
- Edge cases (empty arrays, special characters, concurrent operations)

---

## Teacher Class Schedule System

The Teacher Class Schedule System allows teachers to manage weekly recurring schedules for their classes. It provides a visual calendar grid showing Sunday through Thursday with time slots from 7:00 to 18:00.

### Overview

**Location:** `/dashboard/teacher/classes`
**Access:** Teachers and admins only
**Database Table:** `class_schedules`

The system displays each class in a separate tab, with:

- **Stats card** showing student count (expandable for future metrics)
- **Weekly schedule grid** displaying all schedule entries
- **CRUD modal** for creating, editing, and deleting schedule entries

### Database Schema

**Table:** `class_schedules`

| Column      | Type    | Description                                            |
| ----------- | ------- | ------------------------------------------------------ |
| id          | UUID    | Primary key                                            |
| class_id    | UUID    | Foreign key to classes table                           |
| teacher_id  | UUID    | Foreign key to profiles table                          |
| day_of_week | INTEGER | 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday |
| start_time  | TIME    | Session start time (HH:MM:SS)                          |
| end_time    | TIME    | Session end time (HH:MM:SS)                            |
| subject     | TEXT    | Optional subject name                                  |
| room        | TEXT    | Optional room number                                   |
| notes       | TEXT    | Optional notes                                         |

**Constraints:**

- `day_of_week` must be 0-4 (Sunday-Thursday)
- `end_time` must be greater than `start_time`

**RLS Policies:**

- Teachers can manage schedules for their own classes
- Students can view schedules for classes they're enrolled in
- Admins can view and manage all schedules

### Components

#### 1. Main Page (`+page.svelte`)

**File:** `src/routes/(protected)/dashboard/teacher/classes/+page.svelte`

Displays all teacher's classes in tabs using Shadcn's Tabs component:

```svelte
<Tabs.Root value={classes[0]?.id}>
  <Tabs.List>
    {#each classes as class}
      <Tabs.Trigger value={class.id}>{class.name}</Tabs.Trigger>
    {/each}
  </Tabs.List>

  {#each classes as class}
    <Tabs.Content value={class.id}>
      <ClassStatsCard studentCount={class.student_count} />
      <ClassScheduleGrid schedules={class.schedules} />
    </Tabs.Content>
  {/each}
</Tabs.Root>
```

**Features:**

- Tab navigation between classes
- Stats card with student count
- Weekly schedule grid
- Modal for adding/editing schedule entries
- Toast notifications for success/error
- Auto-refresh after changes

#### 2. ClassStatsCard Component

**File:** `src/lib/components/ClassStatsCard.svelte`

**Props:**

- `studentCount: number` - Number of students in the class
- `onEditSchedule: () => void` - Callback when "Edit Schedule" button is clicked

**Displays:**

- Student count with icon
- "Modifier l'Emploi du Temps" button
- Expandable for future stats (assignments, pending reviews, etc.)

#### 3. ClassScheduleGrid Component

**File:** `src/lib/components/ClassScheduleGrid.svelte`

**Props:**

- `schedules: ClassSchedule[]` - Array of schedule entries
- `onCellClick?: (day, time, entry?) => void` - Callback when cell is clicked
- `readonly?: boolean` - Disable editing (default: false)

**Features:**

- Custom 5×12 grid (Sunday-Thursday × 7h-18h)
- Time slots displayed in 1-hour increments
- Schedule entries span multiple rows for multi-hour sessions
- Click empty cell to add new entry
- Click existing entry to edit
- Color-coded entries with subject and room displayed
- Empty state when no schedules exist

**Grid Structure:**

```
┌──────┬────────┬────────┬────────┬────────┬────────┐
│ Heure│ Dimanche│ Lundi │ Mardi │Mercredi│ Jeudi  │
├──────┼────────┼────────┼────────┼────────┼────────┤
│ 7h00 │        │  Math  │        │  Math  │        │
│      │        │ Rm 101 │        │ Rm 101 │        │
├──────┼────────┼────────┼────────┼────────┼────────┤
│ 8h00 │        │        │        │        │        │
├──────┼────────┼────────┼────────┼────────┼────────┤
│ ...  │  ...   │  ...   │  ...   │  ...   │  ...   │
└──────┴────────┴────────┴────────┴────────┴────────┘
```

#### 4. ScheduleEntryModal Component

**File:** `src/lib/components/ScheduleEntryModal.svelte`

**Props:**

- `open: boolean` - Whether modal is open (bindable)
- `mode: 'create' | 'edit' | 'view'` - Modal mode
- `entry?: ClassSchedule` - Existing entry (for edit/view modes)
- `defaultDay?: number` - Default day for new entries
- `defaultTime?: string` - Default start time for new entries
- `onClose: () => void` - Callback when modal closes
- `onSave: (data) => void` - Callback when form is submitted
- `onDelete?: () => void` - Callback for delete action (edit mode only)

**Form Fields:**

- Day of week (Select: Dimanche-Jeudi)
- Start time (Time input)
- End time (Time input)
- Subject (Text input, optional)
- Room (Text input, optional)
- Notes (Textarea, optional)

**Validation:**

- End time must be after start time
- Day of week must be 0-4

**Actions:**

- **Create mode**: Save button creates new entry
- **Edit mode**: Save button updates entry, Delete button removes it
- **View mode**: No actions, read-only display

### Server-Side Logic

**File:** `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts`

#### Load Function

Fetches teacher's classes with student counts and schedules:

```typescript
export const load: PageServerLoad = async ({ parent, locals }) => {
	const { profile } = await parent();

	// Fetch teacher's classes
	const { data: classes } = await supabase
		.from('classes')
		.select('*')
		.eq('teacher_id', profile.id)
		.eq('is_active', true);

	// For each class, fetch student count and schedules
	const classesWithData = await Promise.all(
		classes.map(async (cls) => {
			const { count } = await supabase
				.from('class_members')
				.select('*', { count: 'exact', head: true })
				.eq('class_id', cls.id);

			const { data: schedules } = await supabase
				.from('class_schedules')
				.select('*')
				.eq('class_id', cls.id)
				.order('day_of_week')
				.order('start_time');

			return { ...cls, student_count: count, schedules };
		})
	);

	return { classes: classesWithData };
};
```

#### Form Actions

**`createScheduleEntry`**

- Validates required fields and time range
- Verifies teacher owns the class
- Inserts new schedule entry
- Returns success message

**`updateScheduleEntry`**

- Validates fields and ownership
- Updates existing schedule entry
- Returns success message

**`deleteScheduleEntry`**

- Verifies teacher owns the schedule entry
- Deletes entry from database
- Returns success message

**Security:**
All actions verify that the teacher owns the class before allowing modifications.

### Utility Functions

**File:** `src/lib/utils/schedule.ts`

Provides helper functions for schedule management:

**Day Name Functions:**

- `getDayName(dayNum, short?)` - Get French day name (Dimanche, Lundi, etc.)
- `DAY_NAMES` - Full day names (0-4)
- `DAY_NAMES_SHORT` - Abbreviated day names (Dim, Lun, etc.)

**Time Functions:**

- `formatTime(time)` - Convert HH:MM:SS to HH:MM
- `formatTimeDisplay(time)` - Convert to display format (e.g., "8h00")
- `timeToMinutes(time)` - Convert time to minutes since midnight
- `minutesToTime(minutes)` - Convert minutes to time string
- `isValidTimeRange(start, end)` - Validate end > start
- `getDefaultStartTime()` - Default start time (08:00:00)
- `getDefaultEndTime(start?)` - Default end time (1 hour after start)

**Grid Functions:**

- `getTimeSlots(startHour, endHour, interval)` - Generate time slots array
- `findScheduleAtSlot(schedules, day, time)` - Find entry at grid position
- `calculateSlotSpan(schedule, interval)` - Calculate row span for entry
- `isScheduleStart(schedule, time)` - Check if entry starts at this slot

**Display Functions:**

- `formatScheduleDisplay(schedule)` - Format entry for grid display

### Usage Example

```typescript
// In +page.svelte
import ClassScheduleGrid from '$lib/components/ClassScheduleGrid.svelte';
import ScheduleEntryModal from '$lib/components/ScheduleEntryModal.svelte';

let modalOpen = $state(false);
let selectedEntry = $state<ClassSchedule | undefined>(undefined);

function handleCellClick(day: number, time: string, entry?: ClassSchedule) {
	if (entry) {
		// Edit existing entry
		selectedEntry = entry;
	} else {
		// Create new entry
		selectedEntry = undefined;
	}
	modalOpen = true;
}

async function handleSave(formData: ScheduleFormData) {
	const action = selectedEntry ? '?/updateScheduleEntry' : '?/createScheduleEntry';

	const data = new FormData();
	data.append('class_id', currentClassId);
	data.append('day_of_week', formData.day_of_week.toString());
	// ... append other fields

	const response = await fetch(action, {
		method: 'POST',
		body: data,
		headers: { 'x-sveltekit-action': 'true' }
	});

	if (response.ok) {
		await invalidateAll();
		toaster.success('Créneau créé avec succès');
	}
}
```

### Navigation

The schedule system is accessible via:

- **Sidebar:** "Classes" link (teachers only)
- **Teacher Dashboard:** "Voir Mes Classes" button
- **Direct URL:** `/dashboard/teacher/classes`

### Best Practices

**DO:**

- Use the utility functions from `schedule.ts` for consistency
- Validate time ranges before saving
- Show toast notifications for user feedback
- Refresh data after mutations using `invalidateAll()`
- Use semantic colors for schedule entries

**DON'T:**

- Modify schedule entries without verifying teacher ownership
- Allow overlapping time ranges for the same class/day
- Hard-code time slots or day names
- Skip validation on form submission

### Future Enhancements

Potential improvements for the schedule system:

- Drag-and-drop to move schedule entries
- Duplicate schedule from one class to another
- Export schedule to PDF or iCalendar format
- Conflict detection (same teacher, overlapping times across classes)
- Color-coding by subject
- Student view (read-only schedules for enrolled students)
- Recurring event exceptions (holidays, special events)
- Integration with assignment due dates

---

## Wheel of Fortune Component

The Wheel component is an interactive spinning wheel for randomly selecting students in a class. It features beautiful SVG-based graphics with customizable colors and animations.

### Overview

**Location:** `src/lib/components/Wheel.svelte`
**Demo Page:** `/dashboard/teacher/wheel` (teacher/admin only)
**Debug Page:** `/demo` (public access - includes wheel and other component demos)

The wheel uses the original design pattern with:

- Pink/blue alternating slices using `stroke-dasharray` technique
- Decorative yellow dots around the perimeter
- Blue-gray outer ring with drop shadow
- Yellow-stroked center circle
- Gradient pointer/marker at top
- Blur animation during spinning
- Confetti celebration on winner selection

### Component Props

```typescript
interface Props {
	// Required
	students: Student[]; // Array of students

	// Optional customization
	wheelRadius?: number; // Default: 18 (em units)
	primaryColor?: string; // Default: '#e7c9de' (pink)
	secondaryColor?: string; // Default: '#3a507e' (dark blue)
	accentColor?: string; // Default: '#788bb2' (gray-blue)
	spinDuration?: number; // Default: 4 (seconds)
	addJokerIfOdd?: boolean; // Default: false
	showConfetti?: boolean; // Default: true

	// Gidouille rewards
	gidouilleReward?: number; // Optional reward amount
	onRewardGiven?: (id, amount) => Promise<void>;

	// Callbacks
	onWinner?: (student) => void;
	onSpinStart?: () => void;
	onSpinEnd?: () => void;
}
```

### Basic Usage

```svelte
<script>
	import Wheel from '$lib/components/Wheel.svelte';

	const students = [
		{ id: '1', firstname: 'Alice' },
		{ id: '2', firstname: 'Bob' },
		{ id: '3', firstname: 'Charlie' }
	];

	function handleWinner(student) {
		console.log('Winner:', student.firstname);
	}
</script>

<Wheel {students} onWinner={handleWinner} />
```

### Advanced Usage with Rewards

```svelte
<script>
	import Wheel from '$lib/components/Wheel.svelte';

	const students = [
		/* ... */
	];

	async function handleRewardGiven(studentId, amount) {
		const response = await fetch('/api/rewards/gidouilles', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ studentId, amount })
		});

		if (response.ok) {
			console.log(`Awarded ${amount} gidouilles`);
		}
	}
</script>

<Wheel
	{students}
	gidouilleReward={10}
	onRewardGiven={handleRewardGiven}
	primaryColor="#ff6b9d"
	wheelRadius={20}
/>
```

### SVG Architecture

The wheel uses a clever SVG technique to create alternating slices:

```svelte
<!-- Base pink circle -->
<circle r="18em" fill="#e7c9de" />

<!-- Alternating dark blue slices (stroke-dasharray magic!) -->
<circle
	r="9em"
	stroke="#3a507e"
	stroke-width="18em"
	stroke-dasharray="{(pieceAngle * radius) / 2}em {(pieceAngle * radius) / 2}em"
/>

<!-- Decorative yellow dots (count * 3) -->
{#each Array(count * 3) as _, i}
	<circle fill="#f9ef69" transform="rotate({(i * 360) / (count * 3)})" />
{/each}
```

### Animation System

**Spinning:**

- CSS `transform: rotate()` with `transition: all 4s ease-out`
- Rotates 9 full times (360° × 9) plus random angle
- Winner calculated from final angle position
- Avoids landing on slice boundaries

**Blur Effect:**

- Custom keyframe animation during spin
- Subtle blur (0 → 1px → 0px) over 4 seconds
- Applied via `.blur-wheel` class

**Confetti:**

- Uses `canvas-confetti` library
- Fires from both sides of screen
- 3-second duration with particle effects
- Configurable via `showConfetti` prop

### Debug Page (`/dashboard/admin/debug/wheel`)

Interactive testing page with:

**1. Control Panel**

- Color pickers (primary, secondary, accent)
- Range sliders (radius, duration)
- Toggles (joker, confetti)
- Number input (gidouille reward)

**2. Student List Editor**

- Add/remove students dynamically
- Pre-loaded with 8 mock students
- Real-time wheel updates

**3. Preset Configurations**

- Default (Pink/Blue)
- Dark Mode
- Vibrant
- Ocean
- Reset to Defaults button

**4. Code Generation**

- Auto-generates Svelte code
- Shows only non-default props
- Copy to clipboard
- Live preview

**5. Live Wheel Preview**

- Fully functional wheel
- Displays last winner
- All callbacks working

### Teacher Dashboard Integration

The Wheel component is integrated into the Teacher Dashboard in two ways:

#### 1. Standalone Page (`/dashboard/teacher/wheel`)

**Features:**

- Class selector dropdown (native `<select>`)
- Gidouille reward configuration
- Student count display
- Auto-refresh after rewards
- Toast notifications

**API Endpoint:** `/api/rewards/gidouilles`

- Validates teacher-student relationship
- Increments gidouille balance
- Returns new total

#### 2. Teacher Dashboard Modal (NEW)

**Location:** `/dashboard` (Teacher Dashboard main page)
**Component:** `src/routes/(protected)/dashboard/TeacherDashboard.svelte`

**Access:**
Teachers can launch the wheel directly from the dashboard via a gradient "Choisir un élève" button in the Class Selection card.

**Features:**

- **On-demand student fetching**: API call `/api/classes/[classId]/students` when modal opens
- **Wide modal**: Responsive width (80-90vw) to properly fit the wheel
- **No gidouille rewards**: Pure random selection (no points awarded)
- **Confetti above modal**: `confettiZIndex={100}` ensures visibility
- **Loading state**: Spinner while fetching students
- **Empty state**: Graceful handling when no students
- **Winner display**: Built into Wheel component below the wheel
- **Continuous spinning**: Click "Lancer la roue" multiple times without closing modal

**Button Styling:**

```svelte
<Button
	onclick={handleOpenWheel}
	disabled={!selectedClassId || (selectedClass.student_count || 0) === 0}
	class="bg-gradient-to-r from-purple-500 to-pink-500 font-semibold
         text-white shadow-lg transition-all duration-200 hover:from-purple-600
         hover:to-pink-600 hover:shadow-xl"
>
	<Target class="mr-2 h-5 w-5" />
	Choisir un élève
</Button>
```

**Modal Structure:**

```svelte
<Dialog.Root bind:open={wheelModalOpen}>
	<Dialog.Content class="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw]">
		<Dialog.Header>
			<Dialog.Title>Choisir un élève</Dialog.Title>
			<Dialog.Description>
				Sélectionnez aléatoirement un élève de {selectedClass.name}
			</Dialog.Description>
		</Dialog.Header>

		{#if isLoadingStudents}
			<!-- Loading spinner -->
		{:else if wheelStudents.length === 0}
			<!-- Empty state -->
		{:else}
			<Wheel
				students={wheelStudents}
				onWinner={handleWinner}
				showConfetti={true}
				confettiZIndex={100}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
```

**API Endpoint:** `GET /api/classes/[classId]/students`

- **Security**: Verifies teacher owns the class
- **Returns**: `{ students: Array<{ id, firstname, lastname, avatar_url }> }`
- **RLS**: Teachers can only access their own classes
- **Error handling**: 401 Unauthorized, 403 Forbidden, 404 Not Found

**User Flow:**

1. Teacher selects a class from dropdown (auto-selects first class on load)
2. "Choisir un élève" button becomes enabled
3. Click button → Modal opens with loading spinner
4. Students fetched via API → Wheel displays
5. Click "Lancer la roue" → Wheel spins with confetti
6. Winner displays below wheel with name
7. Can spin again immediately or close modal with X button

**Edge Cases Handled:**

- No class selected → Button disabled with tooltip
- Class with 0 students → Button disabled with tooltip
- API fetch error → Toast error, modal closes
- Empty class → "Cette classe ne contient aucun élève" message

### Winner Calculation Algorithm

**CRITICAL: The Proven Formula**

```typescript
const winnerIndex = Math.floor((normalizedAngle * wheelData().length) / 360);
const winner = students[winnerIndex];
```

**Why This Works:**

- The wheel SVG has `transform: rotate(-{angle + 90}deg)` (see line 428 in Wheel.svelte)
- The `-90deg` offset aligns the first slice with the top pointer
- As the wheel rotates, this formula correctly maps the final angle to the student index
- **Works on first spin** (angle 0-360) **and all subsequent spins** (any normalized angle)

**Example with 8 students (45° per slice):**
| Final Angle | Calculation | Winner Index | Student |
|-------------|-------------|--------------|---------|
| 0° | floor(0 × 8 / 360) = 0 | 0 | First student |
| 45° | floor(45 × 8 / 360) = 1 | 1 | Second student |
| 90° | floor(90 × 8 / 360) = 2 | 2 | Third student |
| 270° | floor(270 × 8 / 360) = 6 | 6 | Seventh student |

**Important Notes:**

- **DO NOT** modify this formula without testing extensively
- **DO NOT** try to "fix" it with angle adjustments or inversions
- This is the original formula from `Wheel-Old.svelte:92` that has been proven to work
- The formula accounts for the wheel's initial rotation offset
- Calculates based on the **final normalized angle** after spin completes

**Text Color Contrast:**

- Pink slices (index % 2 === 0): **White text** (good contrast)
- Blue slices (index % 2 === 1): **Dark text** `#1a1a1a` (good contrast)

**Boundary Avoidance:**
The random angle generation ensures we don't land exactly on slice boundaries:

```typescript
const sliceSize = Math.floor(360 / wheelData().length);
do {
	randomAngle = Math.floor(Math.random() * 360) + 1;
} while (randomAngle % sliceSize < 2); // Minimum 2° from boundaries
```

### Default Colors

| Prop             | Default Value         | Description                    | Text Color     |
| ---------------- | --------------------- | ------------------------------ | -------------- |
| `primaryColor`   | `#e7c9de`             | Pink (main wheel slices)       | White          |
| `secondaryColor` | `#3a507e`             | Dark blue (alternating slices) | Dark (#1a1a1a) |
| `accentColor`    | `#788bb2`             | Gray-blue (outer ring/center)  | N/A            |
| Yellow dots      | `#f9ef69`             | Decorative perimeter dots      | N/A            |
| Marker gradient  | `#f9ef69` → `#ff9800` | Orange-yellow pointer          | N/A            |

### Component Behavior Updates (v2)

**Recent Improvements:**

1. **Single Button**: Removed "Recommencer" button - now only "Lancer la roue"
   - Can spin again immediately without resetting
   - Simpler UX with one consistent button

2. **Continuous Spinning**: Wheel continues from current position
   - First spin: 0° → 3240° (9 rotations + random)
   - Second spin: 3240° → 6480° (9 more rotations + random)
   - Angle normalized after each spin for accurate winner calculation

3. **Confetti Z-Index**: New `confettiZIndex` prop
   - Default: 0 (for standalone pages)
   - Set to 100+ for modal usage (above Dialog z-50)
   - Ensures confetti visibility in all contexts

4. **Text Contrast**: Automatic color adjustment
   - White text on light pink slices
   - Dark text on dark blue slices
   - Ensures readability for all students

### Best Practices

**DO:**

- Use even number of students for perfect visual balance
- Set `addJokerIfOdd={true}` to balance odd numbers
- Set `confettiZIndex={100}` when using inside modals
- Provide meaningful `onWinner` callback
- Use color picker in debug page to test themes
- Test with different student counts (2, 5, 10, 20)

**DON'T:**

- Use extremely small (`< 10em`) or large (`> 30em`) radius
- Rely on `gidouilleReward` without `onRewardGiven` callback
- Pass empty students array (component handles it gracefully)
- Modify wheel props during spinning (wait for `onSpinEnd`)

### Troubleshooting

**Wheel not spinning:**

- Check that `students` array is not empty
- Verify `isSpinning` state is not stuck
- Look for JavaScript errors in console

**Wrong student selected:**

- Verify students array hasn't changed during spin
- Check that angle calculation matches student count
- Test in debug page with known student lists

**Colors not applying:**

- Ensure hex color format is correct (`#rrggbb`)
- Check that props are passed correctly
- Use debug page to test color combinations

**Confetti not showing:**

- Verify `showConfetti={true}` (default)
- Check browser console for `canvas-confetti` errors
- Ensure `canvas-confetti` package is installed

### Performance Notes

- GPU-accelerated with `transform: translate3d()`
- Efficient SVG rendering (no canvas)
- Minimal re-renders with Svelte 5 runes
- Confetti runs in separate animation loop
- Suitable for classes up to 50 students

---

## Mathémo Game

Mathémo is a Wordle-style educational game for learning French mathematical vocabulary. Players guess math terms appropriate to their grade level with accent-normalized input and cross-difficulty validation.

### Overview

**Location:** `/games/mathemo`
**Access:** Public (no authentication required)
**Type:** Client-side game with localStorage persistence

**Key Features:**

- 7 difficulty levels (French grades: 6ème → Tale)
- 270+ mathematical terms organized by educational level
- Accent normalization ("algebre" matches "algèbre")
- Adjustable attempts (3-10)
- Cross-level validation (permissive word acceptance)
- Font scaling integration
- Physical + on-screen keyboard support
- Confetti celebration on win

### File Structure

```
src/routes/(public)/games/mathemo/
├── types.ts                  # TypeScript type definitions
├── words.ts                  # 270+ words organized by grade level
├── game.svelte.ts           # Game logic (Svelte 5 runes)
├── reduced-motion.svelte.ts # Accessibility store
└── +page.svelte             # Main UI component
```

### Core Architecture

#### 1. Type Definitions (`types.ts`)

**Difficulty Levels:**

```typescript
type Difficulty = '6ème' | '5ème' | '4ème' | '3ème' | '2nde' | '1ère' | 'Tale';
```

**Feedback Types:**

```typescript
type FeedbackType =
	| 'x' // Exact match (correct position)
	| 'c' // Close match (wrong position)
	| '_'; // Missing (not in word)
```

**Game State:**

```typescript
interface GameState {
	answer: string; // Target word
	guesses: string[]; // All guesses (including empty)
	answers: string[]; // Feedback for each guess
	correctLetters: string[]; // Revealed letters
	maxAttempts: number; // 3-10
	difficulty: Difficulty; // Current level
	currentRow: number; // 0-indexed
}
```

#### 2. Word Lists (`words.ts`)

**Organization:**

- **6ème** (82 words): Basic arithmetic, fractions, geometry
- **5ème** (66 words): Decimals, percentages, triangles
- **4ème** (56 words): Pythagorean theorem, proportions
- **3ème** (39 words): Functions, equations, probability
- **2nde** (11 words): Polynomials, sequences
- **1ère** (9 words): Derivatives, trigonometry
- **Tale** (9 words): Integrals, limits

**Key Functions:**

```typescript
// Get random word from difficulty level
getRandomWord(difficulty: Difficulty): string

// Validate word across ALL levels (permissive)
isValidWord(word: string): boolean

// Normalize accents for comparison
normalizeString(str: string): string
// "algèbre" → "algebre"
// "équation" → "equation"
```

**Normalization Algorithm:**

```typescript
str
	.normalize('NFD') // Decompose: è → e + ̀
	.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
	.toLowerCase(); // Lowercase
```

#### 3. Game Logic (`game.svelte.ts`)

**Reactive State (Svelte 5 Runes):**

```typescript
class MathemoGame {
	answer = $state('');
	guesses = $state<string[]>([]);
	answers = $state<string[]>([]);
	correctLetters = $state<string[]>([]);
	maxAttempts = $state(6);
	difficulty = $state<Difficulty>('6ème');
	currentRow = $state(0);
}
```

**Key Methods:**

1. **`startNewGame(difficulty, maxAttempts)`**
   - Selects random word from difficulty level
   - Initializes empty guesses array
   - Saves to localStorage

2. **`updateGuess(key)`**
   - Handles typing/backspace
   - Restricts to target word length
   - Auto-saves after each keystroke

3. **`enterGuess()`**
   - Validates word (permissive cross-level)
   - Rejects words longer than target
   - Pads shorter words for feedback calculation
   - Returns `true` if valid, `false` if invalid

4. **`calculateFeedback(letters)`**
   - **Two-pass algorithm** (Wordle standard):
     1. First pass: Find exact matches ('x')
     2. Second pass: Find close matches ('c')
   - Handles duplicate letters correctly
   - Uses accent normalization

**Validation Rules:**

- ✅ Accept words from ANY difficulty level
- ✅ Accept words shorter than target (padded with empty strings)
- ❌ Reject words longer than target
- ✅ Normalize accents before comparison

**localStorage Persistence:**

```typescript
// Auto-save after every state change
saveToLocalStorage();

// Auto-restore on page load
loadFromLocalStorage();

// Clear and restart
clearSaved();
```

#### 4. Main UI (`+page.svelte`)

**Derived State:**

```typescript
let won = $derived(game.hasWon());
let lost = $derived(game.hasLost());
let gameOver = $derived(game.isGameOver());
let canSubmit = $derived(currentGuess.length > 0);
```

**Keyboard State Maps:**

```typescript
// CSS classes for keyboard styling
let classnames = $derived.by(() => {
	// 'exact' | 'close' | 'missing'
});

// Accessibility descriptions
let description = $derived.by(() => {
	// 'correct' | 'present' | 'absent'
});
```

**Event Handlers:**

- `handleKeyClick(key)` - On-screen keyboard
- `handleKeydown(event)` - Physical keyboard (Enter, Backspace, A-Z)
- `handleDifficultyChange(selected)` - Difficulty dropdown
- `handleAdjustAttempts(delta)` - +/- buttons
- `handleRestart()` - Clear and restart

### Visual Design

#### Color Scheme

| State       | Light Mode       | Dark Mode        | Description                                  |
| ----------- | ---------------- | ---------------- | -------------------------------------------- |
| **Default** | `#e8e8e8`        | `#2a2a2a`        | Neutral cell background                      |
| **Exact**   | `#5b8def`        | `#4a7bd8`        | Correct letter, correct position (blue)      |
| **Close**   | Border `#5b8def` | Border `#4a7bd8` | Correct letter, wrong position (blue border) |
| **Missing** | `#c0c0c0`        | `#404040`        | Letter not in word (gray)                    |

#### Font Scaling Integration

All sizes scale with `var(--font-scale)` for accessibility:

```css
font-size: calc(2rem * var(--font-scale));
border: calc(3px * var(--font-scale)) solid #5b8def;
margin: calc(2rem * var(--font-scale)) 0;
```

#### Animations

1. **Wiggle** (invalid word):

   ```css
   .grid.bad-guess .row.current {
   	animation: wiggle 0.5s;
   }
   ```

2. **Blinking cursor** (selected cell):

   ```css
   .selected {
   	border: calc(3px * var(--font-scale)) solid #f95454;
   	animation: blinking 1.5s infinite;
   }
   ```

3. **Confetti** (on win):
   ```svelte
   use:confetti={{
   	particleCount: reducedMotion ? 0 : undefined,
   	colors: ['#ff3e00', '#40b3ff', '#676778']
   }}
   ```

### Game Flow

1. **Initialization**
   - Check localStorage for saved game
   - If found, restore state
   - Otherwise, start new game at '6ème'

2. **Gameplay Loop**
   - Player types letters (up to target word length)
   - Press Enter to submit
   - Invalid word triggers wiggle animation
   - Valid word shows feedback and advances row
   - Repeat until win/loss

3. **Win Condition**
   - All letters marked as 'x' (exact)
   - Confetti celebration
   - Show congratulations message
   - Display restart button

4. **Loss Condition**
   - Used all attempts without winning
   - Reveal answer (clue letters)
   - Display restart button

### Controls

**During Game:**

- Difficulty selector (dropdown)
- Attempts adjuster (+/- buttons, range 3-10)
- Physical keyboard (Enter, Backspace, A-Z)
- On-screen keyboard (QWERTY layout)

**After Game:**

- Restart button (clears localStorage, starts fresh)

### Best Practices

**DO:**

- Use accent normalization for all comparisons
- Accept shorter words (pad with empty strings)
- Reject longer words than target
- Save to localStorage after every state change
- Use two-pass algorithm for feedback calculation
- Scale all sizes with `var(--font-scale)`

**DON'T:**

- Hard-code word lists (use `getRandomWord()`)
- Modify game state without `saveToLocalStorage()`
- Skip accent normalization in validation
- Use Tailwind for dynamic grid columns (use inline CSS)
- Modify feedback calculation algorithm (proven Wordle standard)

### Debugging Tips

**Common Issues:**

1. **Words not validating:**
   - Check `normalizeString()` is called on both sides
   - Verify word exists in `words.ts`
   - Check cross-level validation is working

2. **Grid not displaying:**
   - Ensure `--grid-size` CSS variable is set
   - Use inline `style` not Tailwind for dynamic columns

3. **localStorage not persisting:**
   - Check `browser` environment guard
   - Verify JSON serialization is working
   - Look for `STORAGE_KEY` conflicts

4. **Feedback incorrect:**
   - Verify two-pass algorithm (exact first, then close)
   - Check duplicate letter handling
   - Ensure accent normalization in comparison

### Performance

- **Lightweight:** ~15KB total (including 270+ words)
- **Fast validation:** O(1) lookup via pre-computed Set
- **Efficient rendering:** Svelte 5 runes minimize re-renders
- **Small localStorage:** ~500 bytes per saved game
- **No server calls:** 100% client-side

### Accessibility

- **Screen reader support:** `aria-label` on keyboard buttons
- **Reduced motion:** Respects `prefers-reduced-motion` for animations
- **Font scaling:** Integrates with app's `--font-scale` system
- **Keyboard navigation:** Full keyboard support
- **Color contrast:** WCAG AA compliant (blue on white, blue border)

### Future Enhancements

Potential improvements:

- Daily challenge mode (same word for all players)
- Statistics tracking (win rate, streak)
- Share results (emoji grid like Wordle)
- Multiplayer mode (compete with classmates)
- Hints system (definition, category)
- Time-based challenges
- Custom word lists (teacher-created)

---

## Trio Game

The Trio Game is a math puzzle game where players select 3 aligned numbers from a grid to match a target equation: `a × b ± c = target`.

### Overview

**Location:** `/demo` (accessible from demo page)
**Access:** Public (no authentication required)
**Components:**

- `src/routes/(public)/games/trio/Trio.svelte` - Main game component
- `src/routes/(public)/games/trio/Tile.svelte` - Individual grid cell component

**Note:** The Trio game is available at `/games/trio` and also linked from the main demo page at `/demo`.

### Game Rules

1. **Grid:** Players see a grid of numbers (default 9×9, adjustable from 3×3 to 15×15)
2. **Selection:** Select 3 cells that are aligned (horizontal, vertical, or diagonal)
3. **Alignment:** Cells can have gaps between them (e.g., A1, C3, E5 is valid)
4. **Operation:** Toggle between `+` and `-` operations
5. **Goal:** Match the target value displayed on screen
6. **Win:** When the equation `a × b ± c` equals the target, confetti fires!

### Component Architecture

#### Trio.svelte

**State Management:**

```typescript
let grid: Grid = $state([]);                // Game grid (size × size)
let target: Target = $state({...});        // Current puzzle target
let result: number | null = $state(null);  // Current equation result
let op = $state('+');                       // User's selected operation
let win = $state(false);                    // Whether player has won
let selecteds: Position[] = $state([]);     // Currently selected cells (max 3)
let gridSize = $state(size);                // Current grid dimensions (3-15)
```

**Key Functions:**

- **`changeGrid(size)`** - Generate new random grid
- **`choseTarget()`** - Choose 3 random aligned cells and calculate target value
- **`handleClick(i, j)`** - Handle cell selection with alignment validation
- **`calculateValue(selecteds, op)`** - Calculate equation result: `a × b ± c`
- **`showSolution()`** - Reveal the answer
- **`toggleOp()`** - Switch between `+` and `-`

**Important Implementation Details:**

1. **Target Generation Algorithm:**

   ```
   1. Pick random starting cell
   2. Choose random direction (8 possible)
   3. Move 2 steps in that direction → 3 aligned cells
   4. Calculate target value from those cells
   5. Retry if value is negative or already used
   ```

   **CRITICAL:** The algorithm picks cells FIRST, then calculates the target value. It does NOT pick a target and search for matching cells.

2. **Infinite Loop Prevention:**
   - `targets` array tracks used values (prevents duplicates)
   - **Must be cleared** in `changeGrid()` to prevent accumulation
   - `MAX_ATTEMPTS = 1000` limit breaks loop if no unique value found
   - Without these safeguards, the game freezes after many grid changes

3. **Svelte 5 Reactivity with `untrack()`:**

   ```svelte
   // ✅ CORRECT - Tracks gridSize changes, but not state mutations inside changeGrid
   $effect(() => {
       const currentSize = gridSize; // Track dependency
       untrack(() => changeGrid(currentSize)); // Don't track mutations
   });

   // ❌ WRONG - Would cause infinite loop
   $effect(() => {
       changeGrid(gridSize); // Tracks all state changes = infinite loop
   });
   ```

   **Why:** `changeGrid()` modifies `grid`, `win`, `result`, `selecteds`, and `target`. Without `untrack()`, the effect re-triggers infinitely, causing browser crash with `effect_update_depth_exceeded` error.

4. **Dynamic Grid Columns:**

   ```svelte
   // CSS grid-template-columns must be dynamic (can't use Tailwind classes)
   let gridTemplateColumns = $derived(`repeat(${gridSize + 1}, minmax(0, 1fr))`);

   <div style="grid-template-columns: {gridTemplateColumns}">
   ```

   **Why:** Tailwind requires class names to be statically analyzable. Dynamic classes like `grid-cols-${gridSize + 1}` won't work. Use inline CSS instead.

#### Tile.svelte

**Props:**

```typescript
{
  n: number;                    // Number to display (1-9)
  status: string;                // 'selected' | 'selected-third' | 'not_available' | ''
  onclick: () => void;           // Click handler
}
```

**Visual States:**

- **Default:** Neutral background, clickable
- **Selected (1st/2nd):** Secondary color with shadow
- **Selected Third:** Accent color (highlights the 3rd cell)
- **Not Available:** Dimmed and disabled (opacity 20%)

### Bug Fixes Applied

**Issue #1: App Stalling (Infinite Loop)**

- **Problem:** `targets` array never cleared, causing `choseTarget()` to loop forever
- **Fix:** Clear `targets.length = 0` in `changeGrid()`
- **Fix:** Add `MAX_ATTEMPTS = 1000` safety limit

**Issue #2: Grid Not Displaying**

- **Problem:** Hardcoded `grid-cols-10` class only worked for 9×9 grids
- **Fix:** Use dynamic inline CSS: `style="grid-template-columns: {gridTemplateColumns}"`

**Issue #3: Infinite Reactivity Loop (Browser Crash)**

- **Problem:** `$effect` watching state changes but also modifying state
- **Error:** `Svelte error: effect_update_depth_exceeded`
- **Fix:** Wrap state mutations with `untrack()` to prevent re-triggering

**Issue #4: Grid Not Updating on Size Change**

- **Problem:** `untrack()` was preventing `gridSize` from being tracked
- **Fix:** Read `gridSize` outside `untrack()`: `const currentSize = gridSize; untrack(() => ...)`

### UI Controls

**Buttons:**

- **Nouvelle cible** - Generate new target (keeps same grid)
- **Solution** - Reveal the answer
- **Nouvelle grille** - Generate new grid with new target
- **Taille +/-** - Adjust grid size (3-15)

**Equation Display:**

- Left column shows: `? × ? ± ? = ?`
- Numbers fill in as cells are selected
- Result turns green (correct) or red (incorrect)
- Confetti fires on correct answer

### Best Practices

**DO:**

- Use `untrack()` when effects modify state to prevent infinite loops
- Clear `targets` array when generating new grids
- Add safety limits (`MAX_ATTEMPTS`) to loops with unpredictable exit conditions
- Use inline CSS for dynamic styling (Tailwind won't work for dynamic values)
- Comment complex algorithms (especially `choseTarget()` and `handleClick()`)

**DON'T:**

- Modify state inside `$effect()` without `untrack()`
- Use dynamic Tailwind class names (e.g., `grid-cols-${n}`)
- Remove the `targets.length = 0` line from `changeGrid()`
- Remove the `MAX_ATTEMPTS` safety limit from `choseTarget()`

### Testing

The game has been tested for:

- ✅ Grid size changes (3×3 to 15×15)
- ✅ Multiple grid regenerations (no infinite loops)
- ✅ Target uniqueness across games
- ✅ Alignment validation (horizontal, vertical, diagonal, with gaps)
- ✅ Operation toggling (+/-)
- ✅ Solution reveal
- ✅ Win condition and confetti
- ✅ Mobile responsiveness

### Performance

- **Grid rendering:** O(n²) where n = grid size
- **Target generation:** O(1) average, O(MAX_ATTEMPTS) worst case
- **Click handling:** O(n²) for availability calculation
- **Memory:** ~100 bytes per cell + targets array (<10KB total for 15×15 grid)
- **Recommended max grid size:** 15×15 (225 cells)

---

---

## Question Bank System

For detailed documentation on the Question Bank System, see **[CLAUDE_FEATURES_QUESTION_BANK.md](CLAUDE_FEATURES_QUESTION_BANK.md)**.

The Question Bank System provides a comprehensive framework for creating mathematical flashcard questions with:

- Variables with dependency resolution
- Random number generation with exclusions
- Mathematical evaluation via MathLive Compute Engine
- 6 question types (numerical, algebraic, fill-in-blanks, QCM)
- Grade-level targeting (CP → Tale + STMG)
- Categorization system with multi-variation support
