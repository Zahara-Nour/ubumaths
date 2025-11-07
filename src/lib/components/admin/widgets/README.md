# Admin Health Dashboard Widgets

Collection of reusable Svelte 5 widget components for displaying system health metrics in the admin dashboard.

## Installation

Import components from the widgets directory:

```typescript
import {
	MetricCard,
	HealthStatusCard,
	ErrorSummaryWidget,
	TrendChart,
	AlertBadge,
	WidgetSkeleton
} from '$lib/components/admin/widgets';
```

Or import individually:

```typescript
import MetricCard from '$lib/components/admin/widgets/MetricCard.svelte';
```

## Components

### 1. MetricCard

Display a single metric with value, label, trend indicator, and optional alert badge.

**Props:**

- `label: string` - Metric name (e.g., "Utilisateurs en ligne")
- `value: number | string` - Main value to display
- `trend?: number` - Percentage change (positive = green ↑, negative = red ↓)
- `status?: 'ok' | 'warning' | 'critical'` - Alert level (affects background gradient)
- `icon?: typeof Icon` - Lucide icon component (optional)
- `link?: string` - Link to details page (makes card clickable)

**Example:**

```svelte
<script>
	import MetricCard from '$lib/components/admin/widgets/MetricCard.svelte';
	import { Users } from 'lucide-svelte';
</script>

<MetricCard
	label="Utilisateurs en ligne"
	value={142}
	trend={12.5}
	status="ok"
	icon={Users}
	link="/dashboard/admin/users"
/>
```

---

### 2. HealthStatusCard

Display system health status with colored indicator dot and expandable error details.

**Props:**

- `service: string` - Service name (e.g., "Base de données")
- `status: 'ok' | 'degraded' | 'down'` - Service status
- `latency?: number` - Response time in milliseconds
- `lastCheck: string` - ISO timestamp of last health check
- `message?: string` - Status message or error (shows expand button if present)

**Example:**

```svelte
<HealthStatusCard
	service="Base de données"
	status="ok"
	latency={45}
	lastCheck="2025-01-07T10:30:00Z"
/>

<HealthStatusCard
	service="API externe"
	status="degraded"
	latency={1250}
	lastCheck="2025-01-07T10:29:00Z"
	message="Timeout intermittent détecté sur l'endpoint /api/sync"
/>
```

---

### 3. ErrorSummaryWidget

Display error statistics with tooltips and link to error dashboard.

**Props:**

- `criticalErrors: number` - Count of critical errors (24h)
- `unresolvedErrors: number` - Count of unresolved errors
- `lastHourErrors: number` - Errors in last hour
- `errorRate: number` - Error rate as decimal (e.g., 0.02 = 2%)

**Features:**

- Red pulsing badge if `criticalErrors > 0`
- Orange badge if `unresolvedErrors > 10`
- Tooltips explaining each metric
- Clickable → navigates to `/dashboard/admin/errors`

**Example:**

```svelte
<ErrorSummaryWidget criticalErrors={2} unresolvedErrors={15} lastHourErrors={3} errorRate={0.02} />
```

---

### 4. TrendChart

Mini sparkline chart showing 7-day trend data.

**Props:**

- `data: number[]` - Array of 7 values (one per day)
- `label: string` - Chart label
- `color?: 'green' | 'blue' | 'red'` - Line color (default: 'blue')

**Features:**

- SVG-based smooth curve
- Shows min/max values
- Hover → displays exact value for each day
- Responsive width, fixed height (48px)

**Example:**

```svelte
<TrendChart data={[12, 15, 10, 18, 14, 11, 16]} label="Erreurs (7 jours)" color="red" />

<TrendChart data={[120, 135, 142, 138, 145, 150, 152]} label="Utilisateurs actifs" color="green" />
```

---

### 5. AlertBadge

Colored badge with count and optional pulse animation.

**Props:**

- `count: number` - Value to display
- `severity: 'info' | 'warning' | 'critical'` - Badge color
- `label: string` - Badge label text
- `pulse?: boolean` - Enable pulse animation (default: false)

**Example:**

```svelte
<AlertBadge count={5} severity="critical" label="Erreurs critiques" pulse={true} />

<AlertBadge count={23} severity="warning" label="Avertissements" />

<AlertBadge count={142} severity="info" label="Notifications" />
```

---

### 6. WidgetSkeleton

Loading skeleton placeholder for widgets.

**Props:**

- `type: 'metric' | 'status' | 'chart'` - Skeleton type to match widget

**Example:**

```svelte
{#if loading}
	<WidgetSkeleton type="metric" />
	<WidgetSkeleton type="status" />
	<WidgetSkeleton type="chart" />
{:else}
	<MetricCard {...data} />
	<HealthStatusCard {...healthData} />
	<TrendChart {...chartData} />
{/if}
```

---

## Complete Dashboard Example

```svelte
<script lang="ts">
	import {
		MetricCard,
		HealthStatusCard,
		ErrorSummaryWidget,
		TrendChart,
		WidgetSkeleton
	} from '$lib/components/admin/widgets';
	import { Users, Activity, Database } from 'lucide-svelte';

	let loading = $state(false);
</script>

<div class="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
	<!-- Metrics Row -->
	{#if loading}
		<WidgetSkeleton type="metric" />
		<WidgetSkeleton type="metric" />
		<WidgetSkeleton type="metric" />
	{:else}
		<MetricCard
			label="Utilisateurs en ligne"
			value={142}
			trend={12.5}
			status="ok"
			icon={Users}
			link="/dashboard/admin/users"
		/>

		<MetricCard label="Requêtes/min" value={856} trend={-5.2} status="warning" icon={Activity} />

		<MetricCard label="Temps de réponse" value="45ms" trend={8.1} status="ok" icon={Database} />
	{/if}

	<!-- Health Status Row -->
	<div class="col-span-full grid grid-cols-1 gap-4 md:grid-cols-2">
		<HealthStatusCard
			service="Base de données Supabase"
			status="ok"
			latency={45}
			lastCheck="2025-01-07T10:30:00Z"
		/>

		<HealthStatusCard
			service="API Vercel Edge"
			status="ok"
			latency={23}
			lastCheck="2025-01-07T10:30:05Z"
		/>
	</div>

	<!-- Error Summary -->
	<div class="col-span-full md:col-span-1">
		<ErrorSummaryWidget
			criticalErrors={0}
			unresolvedErrors={8}
			lastHourErrors={2}
			errorRate={0.015}
		/>
	</div>

	<!-- Trend Charts -->
	<div class="col-span-full grid grid-cols-2 gap-4 md:col-span-2">
		<TrendChart data={[12, 15, 10, 18, 14, 11, 16]} label="Erreurs (7 jours)" color="red" />

		<TrendChart
			data={[120, 135, 142, 138, 145, 150, 152]}
			label="Utilisateurs actifs"
			color="green"
		/>
	</div>
</div>
```

## Design System

### Color Scheme

- **OK/Success**: `green-50`, `green-100`, `green-200`, `green-600`
- **Warning**: `orange-50`, `orange-100`, `orange-200`, `orange-600`
- **Critical/Error**: `red-50`, `red-100`, `red-200`, `red-600`
- **Info**: `blue-50`, `blue-100`, `blue-200`, `blue-600`

### Typography

- Large values: `text-3xl font-bold`
- Labels: `text-sm font-medium text-gray-600`
- Small text: `text-xs text-gray-500`

### Spacing

- Card padding: `p-4` or `p-6`
- Gap between elements: `gap-2` or `gap-4`
- Rounded corners: `rounded-lg`

### Animations

- Hover: `hover:shadow-md transition-shadow duration-200`
- Pulse: `animate-ping` for critical alerts
- Skeleton: Custom shimmer animation

## Accessibility

All components follow WCAG 2.1 Level AA standards:

- ✅ Semantic HTML elements
- ✅ Keyboard navigation support
- ✅ ARIA labels for icon-only buttons
- ✅ Color is not the only indicator (icons + text)
- ✅ Sufficient color contrast ratios
- ✅ Screen reader friendly

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

## Notes

- All components use **Svelte 5 runes** (`$state`, `$derived.by`, `$props`)
- Event handlers use **lowercase** syntax (`onclick`, not `on:click`)
- Numbers are formatted with French locale (`fr-FR`)
- All UI text is in **French** (code/comments in English)
- Components are fully **responsive** (mobile-first design)
- **Dark mode** support via semantic Tailwind tokens
