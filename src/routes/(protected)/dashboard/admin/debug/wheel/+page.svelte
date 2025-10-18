<!--
	@component Wheel Debug Page

	Interactive debug and testing page for the Wheel component.
	Located at: /dashboard/admin/debug/wheel (admin only)

	Features:
	- Real-time prop configuration with visual controls
	- Live wheel preview that updates instantly
	- Auto-generated code with copy-to-clipboard
	- 4 built-in color presets + custom configuration
	- Student list editor (add/remove dynamically)
	- Complete documentation of all props

	Usage:
	1. Modify controls to adjust wheel appearance/behavior
	2. Add/remove students to test different scenarios
	3. Try preset configurations for quick theme changes
	4. Copy generated code to use in your own components
	5. Spin the wheel to test functionality
-->
<script lang="ts">
	import Wheel from '$lib/components/Wheel.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Copy, Plus, Trash2, RotateCcw } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Student interface matching Wheel component requirements
	interface Student {
		id: string;
		firstname: string;
		lastname?: string;
		avatar_url?: string;
	}

	// Preset color configurations for quick testing
	// Each preset provides a complete set of wheel colors and default settings
	const presets = [
		{
			name: 'Default (Pink/Blue)',
			config: {
				wheelRadius: 18,
				primaryColor: '#e7c9de',
				secondaryColor: '#3a507e',
				accentColor: '#788bb2',
				spinDuration: 4,
				addJokerIfOdd: false,
				showConfetti: true
			}
		},
		{
			name: 'Dark Mode',
			config: {
				wheelRadius: 18,
				primaryColor: '#4a5568',
				secondaryColor: '#1a202c',
				accentColor: '#2d3748',
				spinDuration: 4,
				addJokerIfOdd: false,
				showConfetti: true
			}
		},
		{
			name: 'Vibrant',
			config: {
				wheelRadius: 18,
				primaryColor: '#ff6b9d',
				secondaryColor: '#c44569',
				accentColor: '#f78fb3',
				spinDuration: 4,
				addJokerIfOdd: false,
				showConfetti: true
			}
		},
		{
			name: 'Ocean',
			config: {
				wheelRadius: 18,
				primaryColor: '#74b9ff',
				secondaryColor: '#0984e3',
				accentColor: '#81ecec',
				spinDuration: 4,
				addJokerIfOdd: false,
				showConfetti: true
			}
		}
	];

	// Default mock students for testing
	// Provides a reasonable starting point with 8 students (even number)
	const defaultStudents: Student[] = [
		{ id: '1', firstname: 'Alice' },
		{ id: '2', firstname: 'Bob' },
		{ id: '3', firstname: 'Charlie' },
		{ id: '4', firstname: 'Diana' },
		{ id: '5', firstname: 'Eve' },
		{ id: '6', firstname: 'Frank' },
		{ id: '7', firstname: 'Grace' },
		{ id: '8', firstname: 'Henry' }
	];

	// Reactive state for all wheel props (Svelte 5 runes)
	// Using structuredClone to avoid reference issues with default data
	let students = $state<Student[]>(structuredClone(defaultStudents));
	let wheelRadius = $state(18); // Size in em units
	let primaryColor = $state('#e7c9de'); // Pink (main wheel color)
	let secondaryColor = $state('#3a507e'); // Dark blue (alternating slices)
	let accentColor = $state('#788bb2'); // Gray-blue (outer ring/center)
	let spinDuration = $state(4); // Animation duration in seconds
	let addJokerIfOdd = $state(false); // Add "Joker" when odd number of students
	let showConfetti = $state(true); // Show confetti on winner selection
	let gidouilleReward = $state(0); // Optional reward amount (0 = disabled)

	// UI state (separate from wheel props)
	let selectedStudent = $state<Student | null>(null); // Last winner
	let newStudentName = $state(''); // Input for adding new students

	// Auto-generate Svelte code based on current configuration
	// Uses $derived to reactively update when any prop changes
	// Only includes non-default props to keep code clean
	const generateCode = $derived(() => {
		// Format students array as JSON (only id and firstname for simplicity)
		const studentsCode = JSON.stringify(
			students.map((s) => ({ id: s.id, firstname: s.firstname })),
			null,
			2
		);

		// Build props array - only include if different from default
		const props = [];
		props.push(`students={students}`); // Always required
		if (wheelRadius !== 18) props.push(`wheelRadius={${wheelRadius}}`);
		if (primaryColor !== '#e7c9de') props.push(`primaryColor="${primaryColor}"`);
		if (secondaryColor !== '#3a507e') props.push(`secondaryColor="${secondaryColor}"`);
		if (accentColor !== '#788bb2') props.push(`accentColor="${accentColor}"`);
		if (spinDuration !== 4) props.push(`spinDuration={${spinDuration}}`);
		if (addJokerIfOdd) props.push(`addJokerIfOdd={${addJokerIfOdd}}`);
		if (!showConfetti) props.push(`showConfetti={${showConfetti}}`);
		if (gidouilleReward > 0) props.push(`gidouilleReward={${gidouilleReward}}`);

		// Generate complete Svelte component code
		// Note: Using string concatenation to avoid Svelte parsing <script> tags
		return (
			`<` +
			`script>
  import Wheel from '$lib/components/Wheel.svelte';

  const students = ${studentsCode};
</` +
			`script>

<Wheel
  ${props.join('\n  ')}
  onWinner={(student) => console.log('Winner:', student)}
/>`
		);
	});

	// Copy generated code to clipboard using Clipboard API
	const copyCode = async () => {
		try {
			await navigator.clipboard.writeText(generateCode());
			toaster.success('Code copied to clipboard!');
		} catch {
			toaster.error('Failed to copy code');
		}
	};

	// Add new student to the list
	// Uses timestamp as unique ID
	const addStudent = () => {
		if (!newStudentName.trim()) return;
		students.push({
			id: Date.now().toString(),
			firstname: newStudentName.trim()
		});
		students = students; // Trigger reactivity
		newStudentName = '';
	};

	// Remove student from list by ID
	const removeStudent = (id: string) => {
		students = students.filter((s) => s.id !== id);
	};

	// Apply a preset configuration
	// Updates all wheel props to match the selected preset
	const applyPreset = (preset: (typeof presets)[0]) => {
		wheelRadius = preset.config.wheelRadius;
		primaryColor = preset.config.primaryColor;
		secondaryColor = preset.config.secondaryColor;
		accentColor = preset.config.accentColor;
		spinDuration = preset.config.spinDuration;
		addJokerIfOdd = preset.config.addJokerIfOdd;
		showConfetti = preset.config.showConfetti;
	};

	// Reset everything to default values
	// Useful for starting fresh or recovering from experimentation
	const resetToDefaults = () => {
		students = structuredClone(defaultStudents);
		wheelRadius = 18;
		primaryColor = '#e7c9de';
		secondaryColor = '#3a507e';
		accentColor = '#788bb2';
		spinDuration = 4;
		addJokerIfOdd = false;
		showConfetti = true;
		gidouilleReward = 0;
		selectedStudent = null;
	};
</script>

<div class="space-y-6">
	<!-- Documentation -->
	<div class="rounded-lg border border-border bg-muted/50 p-6">
		<h2 class="mb-3 text-lg font-semibold">About This Page</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			Test and debug the Wheel component with different props. Modify the controls below to see how
			the wheel changes, and copy the generated code for your own use.
		</p>
		<div class="space-y-2 text-sm">
			<p class="font-semibold">Available Props:</p>
			<ul class="ml-2 space-y-1 text-muted-foreground">
				<li><strong>students</strong>: Array of student objects (required)</li>
				<li><strong>wheelRadius</strong>: Size of wheel in em units (default: 18)</li>
				<li><strong>primaryColor</strong>: Main wheel color (default: #e7c9de pink)</li>
				<li><strong>secondaryColor</strong>: Alternating slice color (default: #3a507e blue)</li>
				<li>
					<strong>accentColor</strong>: Outer ring and center color (default: #788bb2 gray-blue)
				</li>
				<li><strong>spinDuration</strong>: Animation duration in seconds (default: 4)</li>
				<li>
					<strong>addJokerIfOdd</strong>: Add "Joker" when student count is odd (default: false)
				</li>
				<li><strong>showConfetti</strong>: Show confetti on winner selection (default: true)</li>
				<li><strong>gidouilleReward</strong>: Optional reward amount (default: 0)</li>
			</ul>
		</div>
	</div>

	<!-- Preset Configurations -->
	<div class="rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">Preset Configurations</h2>
		<div class="flex flex-wrap gap-2">
			{#each presets as preset (preset.name)}
				<Button variant="outline" size="sm" onclick={() => applyPreset(preset)}>
					{preset.name}
				</Button>
			{/each}
			<Button variant="outline" size="sm" onclick={resetToDefaults}>
				<RotateCcw class="mr-2 size-4" />
				Reset to Defaults
			</Button>
		</div>
	</div>

	<!-- Control Panel -->
	<div class="rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">Control Panel</h2>

		<div class="grid gap-6 md:grid-cols-2">
			<!-- Colors -->
			<div class="space-y-4">
				<h3 class="font-semibold">Colors</h3>

				<div>
					<label for="primary-color" class="mb-2 block text-sm font-medium">Primary Color</label>
					<div class="flex gap-2">
						<input
							id="primary-color"
							type="color"
							bind:value={primaryColor}
							class="h-10 w-20 cursor-pointer rounded border border-input"
						/>
						<Input type="text" bind:value={primaryColor} class="flex-1" />
					</div>
				</div>

				<div>
					<label for="secondary-color" class="mb-2 block text-sm font-medium">Secondary Color</label
					>
					<div class="flex gap-2">
						<input
							id="secondary-color"
							type="color"
							bind:value={secondaryColor}
							class="h-10 w-20 cursor-pointer rounded border border-input"
						/>
						<Input type="text" bind:value={secondaryColor} class="flex-1" />
					</div>
				</div>

				<div>
					<label for="accent-color" class="mb-2 block text-sm font-medium">Accent Color</label>
					<div class="flex gap-2">
						<input
							id="accent-color"
							type="color"
							bind:value={accentColor}
							class="h-10 w-20 cursor-pointer rounded border border-input"
						/>
						<Input type="text" bind:value={accentColor} class="flex-1" />
					</div>
				</div>
			</div>

			<!-- Settings -->
			<div class="space-y-4">
				<h3 class="font-semibold">Settings</h3>

				<div>
					<label for="wheel-radius" class="mb-2 block text-sm font-medium">
						Wheel Radius ({wheelRadius}em)
					</label>
					<input
						id="wheel-radius"
						type="range"
						min="10"
						max="30"
						step="1"
						bind:value={wheelRadius}
						class="w-full"
					/>
				</div>

				<div>
					<label for="spin-duration" class="mb-2 block text-sm font-medium">
						Spin Duration ({spinDuration}s)
					</label>
					<input
						id="spin-duration"
						type="range"
						min="1"
						max="10"
						step="0.5"
						bind:value={spinDuration}
						class="w-full"
					/>
				</div>

				<div>
					<label for="gidouille-reward" class="mb-2 block text-sm font-medium">
						Gidouille Reward
					</label>
					<Input id="gidouille-reward" type="number" min="0" bind:value={gidouilleReward} />
				</div>

				<div class="flex items-center gap-4">
					<label class="flex cursor-pointer items-center gap-2">
						<input type="checkbox" bind:checked={addJokerIfOdd} class="size-4" />
						<span class="text-sm">Add Joker if odd</span>
					</label>

					<label class="flex cursor-pointer items-center gap-2">
						<input type="checkbox" bind:checked={showConfetti} class="size-4" />
						<span class="text-sm">Show confetti</span>
					</label>
				</div>
			</div>
		</div>
	</div>

	<!-- Student List Editor -->
	<div class="rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">Student List ({students.length} students)</h2>

		<div class="mb-4 flex gap-2">
			<Input
				type="text"
				placeholder="Enter student name..."
				bind:value={newStudentName}
				onkeydown={(e) => e.key === 'Enter' && addStudent()}
			/>
			<Button onclick={addStudent}>
				<Plus class="mr-2 size-4" />
				Add
			</Button>
		</div>

		<div class="grid max-h-60 gap-2 overflow-y-auto md:grid-cols-2">
			{#each students as student (student.id)}
				<div class="flex items-center justify-between rounded border border-border bg-muted/30 p-2">
					<span class="text-sm">{student.firstname}</span>
					<Button variant="ghost" size="sm" onclick={() => removeStudent(student.id)}>
						<Trash2 class="size-4 text-destructive" />
					</Button>
				</div>
			{/each}
		</div>
	</div>

	<!-- Wheel Preview -->
	<div class="rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">Wheel Preview</h2>
		<div class="flex justify-center">
			<Wheel
				{students}
				{wheelRadius}
				{primaryColor}
				{secondaryColor}
				{accentColor}
				{spinDuration}
				{addJokerIfOdd}
				{showConfetti}
				gidouilleReward={gidouilleReward > 0 ? gidouilleReward : undefined}
				onWinner={(student) => {
					selectedStudent = student;
					console.log('Winner:', student);
				}}
			/>
		</div>
		{#if selectedStudent}
			<div class="mt-4 text-center">
				<p class="text-sm text-muted-foreground">Last winner:</p>
				<p class="text-lg font-bold text-primary">{selectedStudent.firstname}</p>
			</div>
		{/if}
	</div>

	<!-- Generated Code -->
	<div class="rounded-lg border border-border bg-card p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">Generated Code</h2>
			<Button variant="outline" size="sm" onclick={copyCode}>
				<Copy class="mr-2 size-4" />
				Copy Code
			</Button>
		</div>
		<pre class="overflow-auto rounded bg-muted p-4 text-xs"><code>{generateCode()}</code></pre>
	</div>
</div>
