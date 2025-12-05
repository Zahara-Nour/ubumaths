/**
 * Python Playground Store
 *
 * Svelte 5 reactive store for the Python playground.
 * Manages Pyodide state, code execution, and localStorage persistence.
 *
 * Uses PlaygroundExecutor for code execution and worker management.
 * The store adds playground-specific features:
 * - localStorage persistence
 * - Cloud save/load
 * - URL sharing
 * - Editor settings (theme, font size)
 */

import { browser } from '$app/environment';
import LZString from 'lz-string';
import { PlaygroundExecutor } from '$lib/shared/python';
import type { CompletionItem } from '$lib/shared/python';
import type { Database } from '$lib/types/database';

// =============================================================================
// Types from Database
// =============================================================================

/** PythonFile type from database schema */
export type PythonFile = Database['public']['Tables']['python_files']['Row'];

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-python-playground';

/** Debounce delay for saving to localStorage (ms) */
const STORAGE_SAVE_DEBOUNCE_MS = 500;

const DEFAULT_CODE = `# Python Playground - UbuMaths
# Exécute avec Ctrl+Entrée

import numpy as np
import matplotlib.pyplot as plt

# Exemple : tracer une fonction
x = np.linspace(-2 * np.pi, 2 * np.pi, 200)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Fonction sinus')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.grid(True)
plt.show()

print("Valeur de sin(π/2) :", np.sin(np.pi/2))
`;

// =============================================================================
// Types
// =============================================================================

// Re-export ExecutorState as PlaygroundState for backwards compatibility
export type { ExecutorState as PlaygroundState } from '$lib/shared/python';

/**
 * Available editor themes.
 */
export type EditorTheme =
	| 'default'
	| 'oneDark'
	| 'dracula'
	| 'github'
	| 'githubDark'
	| 'nord'
	| 'solarizedLight'
	| 'solarizedDark'
	| 'material'
	| 'materialDark'
	| 'vscode'
	| 'vscodeDark';

/** Theme display names for UI */
export const EDITOR_THEMES: { value: EditorTheme; label: string; dark: boolean }[] = [
	{ value: 'default', label: 'Par défaut (clair)', dark: false },
	{ value: 'oneDark', label: 'One Dark', dark: true },
	{ value: 'dracula', label: 'Dracula', dark: true },
	{ value: 'github', label: 'GitHub (clair)', dark: false },
	{ value: 'githubDark', label: 'GitHub (sombre)', dark: true },
	{ value: 'nord', label: 'Nord', dark: true },
	{ value: 'solarizedLight', label: 'Solarized (clair)', dark: false },
	{ value: 'solarizedDark', label: 'Solarized (sombre)', dark: true },
	{ value: 'material', label: 'Material (clair)', dark: false },
	{ value: 'materialDark', label: 'Material (sombre)', dark: true },
	{ value: 'vscode', label: 'VS Code (clair)', dark: false },
	{ value: 'vscodeDark', label: 'VS Code (sombre)', dark: true }
];

const DEFAULT_THEME: EditorTheme = 'default';

/**
 * Serialized state for localStorage.
 */
interface SerializedPlaygroundState {
	code: string;
	showPedagogicErrors: boolean;
	fontSize?: number;
	editorTheme?: EditorTheme;
}

/** Font size bounds */
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 14;

// =============================================================================
// Python Playground Store Class
// =============================================================================

/**
 * Reactive store for the Python playground.
 *
 * Uses PlaygroundExecutor for code execution and worker management.
 * This store adds playground-specific features on top of the executor:
 * - localStorage persistence for code and settings
 * - Cloud save/load functionality
 * - URL sharing
 * - Editor settings (theme, font size)
 *
 * @example
 * ```svelte
 * <script>
 * import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
 *
 * function handleExecute() {
 *   pythonStore.execute();
 * }
 * </script>
 *
 * <textarea bind:value={pythonStore.code}></textarea>
 * <button onclick={handleExecute}>Run</button>
 * <pre>{pythonStore.stdout}</pre>
 * ```
 */
class PythonPlaygroundStore {
	// ===========================================================================
	// Executor (handles worker management and execution)
	// ===========================================================================

	/** The executor that handles Pyodide worker and code execution */
	private executor = new PlaygroundExecutor();

	// ===========================================================================
	// Forwarded Execution State (read from executor)
	// Using getters to forward reactive state from executor
	// ===========================================================================

	/** Current execution state (forwarded from executor) */
	get state() {
		return this.executor.state;
	}

	/** Standard output from execution (forwarded from executor) */
	get stdout() {
		return this.executor.stdout;
	}

	/** Standard error from execution (forwarded from executor) */
	get stderr() {
		return this.executor.stderr;
	}

	/** Plot output as base64 PNG data URL (forwarded from executor) */
	get plotData() {
		return this.executor.plotData;
	}

	/** LaTeX output from sympy expressions (forwarded from executor) */
	get latexOutput() {
		return this.executor.latexOutput;
	}

	/** Loading progress (0-100) (forwarded from executor) */
	get loadingProgress() {
		return this.executor.loadingProgress;
	}

	/** Current loading stage description (forwarded from executor) */
	get loadingStage() {
		return this.executor.loadingStage;
	}

	/** Last execution time in milliseconds (forwarded from executor) */
	get executionTime() {
		return this.executor.executionTime;
	}

	/** Error line number for highlighting (forwarded from executor) */
	get errorLine() {
		return this.executor.errorLine;
	}

	/** Packages currently being loaded (forwarded from executor) */
	get packagesLoading() {
		return this.executor.packagesLoading;
	}

	/** Packages that have been loaded during this session (forwarded from executor) */
	get loadedPackages() {
		return this.executor.loadedPackages;
	}

	/** Plotly JSON spec for interactive charts (forwarded from executor) */
	get plotlyData() {
		return this.executor.plotlyData;
	}

	/** Whether Pyodide is ready for execution (forwarded from executor) */
	get isReady() {
		return this.executor.isReady;
	}

	/** Whether code is currently executing (forwarded from executor) */
	get isExecuting() {
		return this.executor.isExecuting;
	}

	/** Whether Pyodide is currently loading (forwarded from executor) */
	get isLoading() {
		return this.executor.isLoading;
	}

	/** Whether there is an error state (forwarded from executor) */
	get hasError() {
		return this.executor.hasError;
	}

	/** Whether there is any output to display (forwarded from executor) */
	get hasOutput() {
		return this.executor.hasOutput;
	}

	/** Whether packages are currently being loaded (forwarded from executor) */
	get isLoadingPackages() {
		return this.executor.isLoadingPackages;
	}

	// ===========================================================================
	// Playground-Specific State (Svelte 5 runes)
	// ===========================================================================

	/** Python code in the editor */
	code = $state(DEFAULT_CODE);

	/** Whether to show pedagogic (user-friendly) error messages */
	showPedagogicErrors = $state(true);

	/** Editor font size in pixels */
	fontSize = $state(DEFAULT_FONT_SIZE);

	/** Editor theme */
	editorTheme = $state<EditorTheme>(DEFAULT_THEME);

	// ===========================================================================
	// Cloud Save/Load State
	// ===========================================================================

	/** Currently loaded cloud file (null if working locally) */
	currentFile = $state<PythonFile | null>(null);

	/** Whether a cloud save operation is in progress */
	isSaving = $state(false);

	/** Whether cloud files are being loaded */
	isLoadingFiles = $state(false);

	/** Cloud operation error message */
	cloudError = $state<string | null>(null);

	// ===========================================================================
	// Private State
	// ===========================================================================

	/** Timeout for debounced save */
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Last saved code for tracking modifications */
	private _lastSavedCode = $state(DEFAULT_CODE);

	/** User ID for authenticated users (enables DB sync) */
	private userId: string | null = null;

	/** Timeout for debounced database sync */
	private dbSyncTimeout: ReturnType<typeof setTimeout> | null = null;

	// ===========================================================================
	// Derived State (Playground-Specific)
	// ===========================================================================

	/** Whether the code has been modified from last saved state */
	isModified = $derived(this.code !== this._lastSavedCode);

	// ===========================================================================
	// Cloud-Related Derived State
	// ===========================================================================

	/** Whether a cloud file is currently loaded */
	hasCloudFile = $derived(this.currentFile !== null);

	/** Name of the current file (or default) */
	currentFileName = $derived(this.currentFile?.title ?? 'Sans titre');

	/** Whether the code has been modified from the cloud version */
	isModifiedFromCloud = $derived(this.currentFile !== null && this.code !== this.currentFile.code);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	// ===========================================================================
	// Executor Methods (forwarded to PlaygroundExecutor)
	// ===========================================================================

	/**
	 * Initialize Pyodide by creating and initializing the Web Worker.
	 * Should be called when the playground component mounts.
	 */
	initPyodide(): void {
		this.executor.initPyodide();
	}

	/**
	 * Terminate the worker and clean up resources.
	 * Call this when the playground component unmounts.
	 */
	destroy(): void {
		// Destroy the executor (terminates worker, cleans up autocomplete)
		this.executor.destroy();

		// Clean up store-specific resources
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		if (this.dbSyncTimeout) {
			clearTimeout(this.dbSyncTimeout);
			this.dbSyncTimeout = null;
		}
	}

	/**
	 * Execute the current Python code.
	 */
	execute(): void {
		this.executor.execute(this.code);
	}

	/**
	 * Cancel the current execution.
	 */
	cancel(): void {
		this.executor.cancel();
	}

	/**
	 * Clear all output (stdout, stderr, plotData, latexOutput, plotlyData).
	 */
	clearOutput(): void {
		this.executor.clearOutput();
	}

	/**
	 * Request Python autocompletion for code at cursor position.
	 *
	 * @param code - The full Python code
	 * @param cursor - The cursor position (character offset)
	 * @returns Promise resolving to an array of completion items
	 */
	requestCompletion(code: string, cursor: number): Promise<CompletionItem[]> {
		return this.executor.requestCompletion(code, cursor);
	}

	/**
	 * Initialize the store with user profile settings.
	 * For authenticated users, loads settings from profile.python_settings.
	 * For anonymous users, keeps localStorage settings.
	 *
	 * @param profile - The user's profile (null for anonymous users)
	 */
	initWithProfile(profile: Database['public']['Tables']['profiles']['Row'] | null): void {
		if (!profile) {
			// Anonymous user: keep localStorage settings (already loaded in constructor)
			this.userId = null;
			return;
		}

		// Set userId to enable DB sync
		this.userId = profile.id;

		// Load settings from profile.python_settings if available
		const settings = profile.python_settings as {
			editorTheme?: string;
			fontSize?: number;
			showPedagogicErrors?: boolean;
		} | null;

		if (settings) {
			// Validate and apply theme
			if (
				typeof settings.editorTheme === 'string' &&
				EDITOR_THEMES.some((t) => t.value === settings.editorTheme)
			) {
				this.editorTheme = settings.editorTheme as EditorTheme;
			}

			// Validate and apply font size
			if (
				typeof settings.fontSize === 'number' &&
				settings.fontSize >= MIN_FONT_SIZE &&
				settings.fontSize <= MAX_FONT_SIZE
			) {
				this.fontSize = settings.fontSize;
			}

			// Apply pedagogic errors setting
			if (typeof settings.showPedagogicErrors === 'boolean') {
				this.showPedagogicErrors = settings.showPedagogicErrors;
			}
		}
	}

	// ===========================================================================
	// Public Methods (Playground-Specific)
	// ===========================================================================

	/**
	 * Reset code to the default example.
	 */
	resetCode(): void {
		this.code = DEFAULT_CODE;
		this._lastSavedCode = DEFAULT_CODE;
		this.clearOutput();
		this.saveToStorage();
	}

	/**
	 * Set the Python code.
	 *
	 * @param code - The new code to set
	 */
	setCode(code: string): void {
		this.code = code;
		this.saveToStorage();
	}

	/**
	 * Immediately save the current code to localStorage.
	 * Bypasses the debounce delay to ensure instant save.
	 *
	 * @returns true if saved successfully
	 */
	saveCode(): boolean {
		if (!browser) return false;

		try {
			// Clear existing debounce timeout
			if (this.saveTimeout) {
				clearTimeout(this.saveTimeout);
				this.saveTimeout = null;
			}

			// Save immediately
			const serialized: SerializedPlaygroundState = {
				code: this.code,
				showPedagogicErrors: this.showPedagogicErrors
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
			this._lastSavedCode = this.code;
			return true;
		} catch (error) {
			console.error('Failed to save Python playground state to localStorage:', error);
			return false;
		}
	}

	/**
	 * Toggle pedagogic error display.
	 */
	togglePedagogicErrors(): void {
		this.showPedagogicErrors = !this.showPedagogicErrors;
		this.saveToStorage();
	}

	/**
	 * Increase editor font size.
	 */
	increaseFontSize(): void {
		if (this.fontSize < MAX_FONT_SIZE) {
			this.fontSize = Math.min(MAX_FONT_SIZE, this.fontSize + 2);
			this.saveToStorage();
		}
	}

	/**
	 * Decrease editor font size.
	 */
	decreaseFontSize(): void {
		if (this.fontSize > MIN_FONT_SIZE) {
			this.fontSize = Math.max(MIN_FONT_SIZE, this.fontSize - 2);
			this.saveToStorage();
		}
	}

	/**
	 * Set editor theme.
	 * @param theme - The theme to set
	 */
	setTheme(theme: EditorTheme): void {
		this.editorTheme = theme;
		this.saveToStorage();
	}

	/**
	 * Generate a shareable URL with the current code compressed in the query parameter.
	 *
	 * @returns The share URL with compressed code
	 * @throws Error if code compression results in URL longer than 2000 characters
	 */
	generateShareUrl(): string {
		if (!browser) return '';

		const compressed = LZString.compressToEncodedURIComponent(this.code);

		// Check if compressed URL is too long (safety limit for URLs)
		if (compressed.length > 2000) {
			throw new Error('Le code est trop long pour être partagé via URL');
		}

		const url = new URL(window.location.href);
		url.searchParams.set('code', compressed);
		return url.toString();
	}

	/**
	 * Load code from a URL query parameter.
	 *
	 * @param url - The URL to load code from
	 * @returns true if code was loaded successfully, false otherwise
	 */
	loadFromUrl(url: URL): boolean {
		const codeParam = url.searchParams.get('code');
		if (!codeParam) return false;

		try {
			const decompressed = LZString.decompressFromEncodedURIComponent(codeParam);

			// Validate that decompression succeeded and result is non-empty
			if (!decompressed || typeof decompressed !== 'string' || decompressed.trim().length === 0) {
				console.warn('Failed to decompress code from URL or result is empty');
				return false;
			}

			// Set the code
			this.code = decompressed;
			this._lastSavedCode = decompressed;

			return true;
		} catch (error) {
			console.error('Error loading code from URL:', error);
			return false;
		}
	}

	// ===========================================================================
	// Cloud Save/Load Methods
	// ===========================================================================

	/**
	 * Load a file from cloud into the editor.
	 * Sets the current code, updates currentFile reference, and clears output.
	 *
	 * @param file - The PythonFile to load
	 */
	loadCloudFile(file: PythonFile): void {
		this.code = file.code;
		this.currentFile = file;
		this._lastSavedCode = file.code;
		this.cloudError = null;
		this.clearOutput();
	}

	/**
	 * Save current code to cloud (create new or update existing).
	 * If currentFile exists, updates it. Otherwise creates a new file.
	 *
	 * @param title - The file title
	 * @param description - Optional file description
	 * @param isPublic - Whether the file should be public
	 * @returns The saved PythonFile or null on error
	 */
	async saveToCloud(
		title: string,
		description?: string,
		isPublic?: boolean
	): Promise<PythonFile | null> {
		if (!browser) return null;

		this.isSaving = true;
		this.cloudError = null;

		try {
			if (this.currentFile) {
				// Update existing file
				const success = await this.updateCloudFile({
					title,
					description,
					code: this.code,
					is_public: isPublic
				});

				if (success && this.currentFile) {
					// Update local reference with new values
					this.currentFile = {
						...this.currentFile,
						title,
						description: description ?? this.currentFile.description,
						code: this.code,
						is_public: isPublic ?? this.currentFile.is_public,
						updated_at: new Date().toISOString()
					};
					this._lastSavedCode = this.code;
					return this.currentFile;
				}
				return null;
			} else {
				// Create new file
				const response = await fetch('/api/python-files', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title,
						description: description ?? null,
						code: this.code,
						is_public: isPublic ?? false
					})
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					const errorMessage =
						errorData.message || `Erreur lors de la sauvegarde (${response.status})`;
					this.cloudError = errorMessage;
					return null;
				}

				const data = await response.json();
				const file = data.file as PythonFile;
				this.currentFile = file;
				this._lastSavedCode = file.code;
				return file;
			}
		} catch (err) {
			console.error('Error saving to cloud:', err);
			this.cloudError =
				err instanceof Error ? err.message : 'Erreur inconnue lors de la sauvegarde';
			return null;
		} finally {
			this.isSaving = false;
		}
	}

	/**
	 * Update an existing cloud file.
	 *
	 * @param updates - The fields to update
	 * @returns true if successful, false otherwise
	 */
	async updateCloudFile(updates: {
		title?: string;
		description?: string;
		code?: string;
		is_public?: boolean;
	}): Promise<boolean> {
		if (!browser || !this.currentFile) return false;

		this.isSaving = true;
		this.cloudError = null;

		try {
			const response = await fetch(`/api/python-files/${this.currentFile.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage =
					errorData.message || `Erreur lors de la mise a jour (${response.status})`;
				this.cloudError = errorMessage;
				return false;
			}

			const data = await response.json();
			this.currentFile = data.file as PythonFile;
			this._lastSavedCode = this.currentFile.code;
			return true;
		} catch (err) {
			console.error('Error updating cloud file:', err);
			this.cloudError =
				err instanceof Error ? err.message : 'Erreur inconnue lors de la mise a jour';
			return false;
		} finally {
			this.isSaving = false;
		}
	}

	/**
	 * Delete a cloud file.
	 *
	 * @param id - The file ID to delete
	 * @returns true if successful, false otherwise
	 */
	async deleteCloudFile(id: string): Promise<boolean> {
		if (!browser) return false;

		this.cloudError = null;

		try {
			const response = await fetch(`/api/python-files/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage =
					errorData.message || `Erreur lors de la suppression (${response.status})`;
				this.cloudError = errorMessage;
				return false;
			}

			// If we deleted the currently loaded file, clear the reference
			if (this.currentFile?.id === id) {
				this.currentFile = null;
			}

			return true;
		} catch (err) {
			console.error('Error deleting cloud file:', err);
			this.cloudError =
				err instanceof Error ? err.message : 'Erreur inconnue lors de la suppression';
			return false;
		}
	}

	/**
	 * Start a new file (clear current cloud file reference).
	 * Resets to default code and clears output.
	 */
	newFile(): void {
		this.currentFile = null;
		this.code = DEFAULT_CODE;
		this._lastSavedCode = DEFAULT_CODE;
		this.cloudError = null;
		this.clearOutput();
	}

	/**
	 * Check if localStorage has code worth migrating to cloud.
	 * Returns true if localStorage has code that differs from DEFAULT_CODE.
	 *
	 * @returns true if there's local code to migrate
	 */
	hasLocalCodeToMigrate(): boolean {
		if (!browser) return false;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return false;

			const parsed = JSON.parse(stored) as SerializedPlaygroundState;
			if (typeof parsed.code !== 'string') return false;

			// Check if local code differs from default
			return parsed.code.trim() !== DEFAULT_CODE.trim() && parsed.code.trim().length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * Get local code for migration to cloud.
	 *
	 * @returns The code from localStorage if it exists, null otherwise
	 */
	getLocalCodeForMigration(): string | null {
		if (!browser) return null;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;

			const parsed = JSON.parse(stored) as SerializedPlaygroundState;
			if (typeof parsed.code !== 'string') return null;

			return parsed.code;
		} catch {
			return null;
		}
	}

	/**
	 * Clear localStorage after successful migration to cloud.
	 * Resets the stored code to DEFAULT_CODE to prevent re-migration prompts.
	 */
	clearLocalStorageAfterMigration(): void {
		if (!browser) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as SerializedPlaygroundState;
				// Keep settings, just reset code
				const updated: SerializedPlaygroundState = {
					...parsed,
					code: DEFAULT_CODE
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
			}
		} catch (err) {
			console.error('Error clearing localStorage after migration:', err);
		}
	}

	// ===========================================================================
	// localStorage Persistence
	// ===========================================================================

	/**
	 * Load state from localStorage.
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored) as SerializedPlaygroundState;

			if (typeof parsed.code === 'string') {
				this.code = parsed.code;
				this._lastSavedCode = parsed.code;
			}
			if (typeof parsed.showPedagogicErrors === 'boolean') {
				this.showPedagogicErrors = parsed.showPedagogicErrors;
			}
			if (
				typeof parsed.fontSize === 'number' &&
				parsed.fontSize >= MIN_FONT_SIZE &&
				parsed.fontSize <= MAX_FONT_SIZE
			) {
				this.fontSize = parsed.fontSize;
			}
			if (
				typeof parsed.editorTheme === 'string' &&
				EDITOR_THEMES.some((t) => t.value === parsed.editorTheme)
			) {
				this.editorTheme = parsed.editorTheme as EditorTheme;
			}
		} catch (error) {
			console.error('Failed to load Python playground state from localStorage:', error);
		}
	}

	/**
	 * Save state to localStorage with debounce.
	 * Debounces writes to avoid excessive localStorage operations during typing.
	 * For authenticated users, also syncs settings to database.
	 */
	private saveToStorage(): void {
		if (!browser) return;

		// Clear existing timeout
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		// Debounce before saving
		this.saveTimeout = setTimeout(() => {
			try {
				const serialized: SerializedPlaygroundState = {
					code: this.code,
					showPedagogicErrors: this.showPedagogicErrors,
					fontSize: this.fontSize,
					editorTheme: this.editorTheme
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
				this._lastSavedCode = this.code;
			} catch (error) {
				console.error('Failed to save Python playground state to localStorage:', error);
			}
		}, STORAGE_SAVE_DEBOUNCE_MS);

		// For authenticated users, also sync to database
		if (this.userId) {
			this.syncToDatabase();
		}
	}

	/**
	 * Sync settings to database for authenticated users.
	 * Debounced to avoid excessive API calls.
	 */
	private syncToDatabase(): void {
		if (!browser || !this.userId) return;

		// Clear existing timeout
		if (this.dbSyncTimeout) {
			clearTimeout(this.dbSyncTimeout);
		}

		// Debounce before syncing (slightly longer delay than localStorage)
		this.dbSyncTimeout = setTimeout(async () => {
			try {
				const settings = {
					editorTheme: this.editorTheme,
					fontSize: this.fontSize,
					showPedagogicErrors: this.showPedagogicErrors
				};

				const response = await fetch('/api/profile/python-settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(settings)
				});

				if (!response.ok) {
					console.error(
						'[Python Store] Failed to sync settings to database:',
						response.status,
						await response.text()
					);
				}
			} catch (error) {
				console.error('[Python Store] Error syncing settings to database:', error);
			}
		}, 1000); // 1 second debounce for DB sync
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the Python playground store.
 *
 * Use this in components to access playground state and methods.
 */
export const pythonStore = new PythonPlaygroundStore();
