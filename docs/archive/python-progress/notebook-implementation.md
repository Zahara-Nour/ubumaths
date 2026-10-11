# Notebook Types and Store Implementation

## Summary

Created TypeScript types, Zod validation schemas, executor class, and Svelte 5 store for Python notebooks with multi-cell execution and persistent context.

**Date**: 2025-12-06
**Status**: Complete - Ready for integration

---

## Files Created

### 1. TypeScript Types

**File**: `src/lib/types/notebook.ts`

Defines Jupyter-compatible notebook structure:

- **Cell Types**: `CellType`, `CellExecutionState`
- **Cell Outputs**: `StreamOutput`, `ErrorOutput`, `DisplayOutput` (Jupyter-compatible)
- **Notebook Cell**: `NotebookCell` with execution state and outputs
- **Notebook Content**: `NotebookContent` with metadata and cells
- **Full Notebook**: `PythonNotebook` with database fields
- **API Types**: Request/response types for notebook operations
- **Helper Types**: `CellDirection`, `AddCellOptions`, execution results

### 2. Zod Validation Schemas

**File**: `src/lib/server/validation/notebooks.ts`

Complete input validation for all notebook operations:

- **Cell Schemas**: `notebookCellSchema`, `cellOutputSchema`
- **Content Schemas**: `notebookContentSchema`, `notebookMetadataSchema`
- **CRUD Schemas**:
  - `createNotebookSchema` - Create new notebook
  - `updateNotebookSchema` - Update notebook content/metadata
  - `shareNotebookSchema` - Change public/private status
- **Cell Operation Schemas**:
  - `addCellSchema` - Add new cell
  - `updateCellSourceSchema` - Update cell source
  - `moveCellSchema` - Move cell up/down
  - `deleteCellSchema` - Delete cell
- **Execution Schemas**:
  - `executeCellSchema` - Execute single cell
  - `executeAllCellsSchema` - Execute all cells

**Security Features**:

- Maximum limits enforced (200 cells/notebook, 100 outputs/cell, 50KB/cell)
- UUID validation for IDs
- String length limits
- Array size limits

### 3. Notebook Executor

**File**: `src/lib/shared/python/execution/notebook-executor.svelte.ts`

Extends `BasePythonExecutor` for persistent context execution:

**Key Features**:

- **Persistent Context**: Uses context ID `notebook_${notebookId}`
- **State Preservation**: Variables persist across cell executions
- **Kernel Reset**: `resetKernel()` clears Python namespace
- **Context ID**: `getContextId()` returns notebook context
- **Hooks**: `onExecutionComplete()`, `onExecutionError()` for subclass customization

**Usage**:

```typescript
const executor = new NotebookExecutor('notebook-123');
executor.initPyodide();
executor.execute('x = 42'); // Cell 1
executor.execute('print(x)'); // Cell 2 - uses x from Cell 1
executor.resetKernel(); // Clear namespace
```

### 4. Notebook Store

**File**: `src/lib/stores/notebookStore.svelte.ts`

Svelte 5 reactive store for notebook management:

**State Management** (Svelte 5 runes):

- `notebook` - Current notebook (`$state<PythonNotebook | null>`)
- `activeCell` - Active cell ID (`$state<string | null>`)
- `isModified` - Unsaved changes flag (`$state(false)`)
- `executionQueue` - Sequential execution queue (`$state<string[]>([])`)
- `isSaving`, `isLoading`, `cloudError` - Cloud operation state

**Derived State**:

- `cells` - Array of cells from notebook
- `isExecutingAny` - Whether any cell is running
- `isReady`, `isLoading2`, `hasError` - Forwarded from executor
- `loadingProgress`, `loadingStage` - Forwarded from executor
- `hasQueuedCells` - Whether execution queue has items

**Notebook Operations**:

- `createNotebook(title, description?, isPublic?)` - Create new notebook
- `loadNotebook(id)` - Load from server
- `saveNotebook()` - Save to server
- `deleteNotebook()` - Delete notebook

**Cell Operations**:

- `addCell(options)` - Add cell (code/markdown) at optional index
- `deleteCell(cellId)` - Delete cell (prevents deleting last cell)
- `moveCell(cellId, direction)` - Move cell up/down
- `updateCellSource(cellId, source)` - Update cell code
- `getCell(cellId)`, `getCellIndex(cellId)` - Cell accessors

**Execution**:

- `executeCell(cellId)` - Execute single cell
- `executeAllCells()` - Execute all cells sequentially
- `stopExecution()` - Cancel execution and clear queue
- `resetKernel()` - Reset Python namespace
- `requestCompletion(code, cursor)` - Autocompletion support

**Sequential Execution**:

- Cells execute one at a time in queue order
- Outputs collected per-cell with Jupyter-compatible format
- Execution counter increments globally across notebook
- Automatic queue processing after each cell completes

**Output Collection**:

- Converts executor outputs to Jupyter-compatible format
- Supports: stdout, stderr, errors with traceback, plots, LaTeX, Plotly
- Limits: 100 outputs per cell (configurable via `MAX_OUTPUTS_PER_CELL`)

### 5. Export Updates

**File**: `src/lib/shared/python/index.ts`

Added export for `NotebookExecutor`:

```typescript
export { NotebookExecutor } from './execution/notebook-executor.svelte';
```

---

## Architecture

### Execution Flow

```
User Action (Execute Cell)
    ↓
NotebookStore.executeCell(cellId)
    ↓
Mark cell as 'running', clear outputs
    ↓
NotebookExecutor.execute(code)
    ↓
Pyodide Worker (with context ID = "notebook_123")
    ↓
Execution completes
    ↓
Collect outputs from executor
    ↓
Convert to Jupyter format (StreamOutput, ErrorOutput, DisplayOutput)
    ↓
Update cell: execution_count++, outputs[], state = 'success'/'error'
    ↓
Process next cell in queue if any
```

### Context Management

**Playground** (PlaygroundExecutor):

- Context ID: `undefined`
- State: Reset between executions
- Use case: Quick code experiments

**Notebook** (NotebookExecutor):

- Context ID: `notebook_${notebookId}`
- State: Persistent across cells
- Use case: Multi-cell notebooks with shared variables

### Data Model

```typescript
PythonNotebook {
  id: string
  title: string
  description: string | null
  content: NotebookContent {
    version: '1.0'
    metadata: { title, created_at, updated_at }
    cells: NotebookCell[] {
      id: string
      type: 'code' | 'markdown'
      source: string
      execution_count: number | null
      outputs: CellOutput[]  // Jupyter-compatible
      state: 'idle' | 'running' | 'success' | 'error'
    }
  }
  author_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}
```

---

## Usage Example

### Creating a Notebook

```typescript
import { NotebookStore } from '$lib/stores/notebookStore.svelte';

const store = new NotebookStore();

// Create notebook
const notebook = await store.createNotebook(
	'Mon premier notebook',
	'Description optionnelle',
	false // private
);

// Initialize Pyodide
store.initPyodide();

// Add cells
store.addCell({ type: 'code', source: 'import numpy as np' });
store.addCell({ type: 'code', source: 'x = np.array([1, 2, 3])' });
store.addCell({ type: 'code', source: 'print(x.mean())' });

// Execute all cells
await store.executeAllCells();

// Save
await store.saveNotebook();

// Clean up
store.destroy();
```

### Svelte Component Integration

```svelte
<script lang="ts">
	import { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import { onMount, onDestroy } from 'svelte';

	const notebook = new NotebookStore();

	onMount(async () => {
		await notebook.loadNotebook('notebook-123');
		notebook.initPyodide();
	});

	onDestroy(() => {
		notebook.destroy();
	});

	function handleExecuteCell(cellId: string) {
		notebook.executeCell(cellId);
	}

	function handleAddCell() {
		notebook.addCell({ type: 'code' });
	}
</script>

{#if notebook.isLoading2}
	<div>Loading Pyodide: {notebook.loadingProgress}%</div>
{:else if notebook.isReady}
	{#each notebook.cells as cell (cell.id)}
		<div class="cell">
			<textarea bind:value={cell.source}></textarea>
			<button onclick={() => handleExecuteCell(cell.id)}> Run </button>

			{#if cell.state === 'running'}
				<div>Executing...</div>
			{/if}

			{#each cell.outputs as output}
				{#if output.output_type === 'stream'}
					<pre>{output.text}</pre>
				{:else if output.output_type === 'error'}
					<pre class="error">{output.traceback.join('\n')}</pre>
				{:else if output.output_type === 'display_data'}
					{#if output.data['image/png']}
						<img src="data:image/png;base64,{output.data['image/png']}" alt="plot" />
					{/if}
				{/if}
			{/each}
		</div>
	{/each}

	<button onclick={handleAddCell}>Add Cell</button>
{/if}
```

---

## Integration Checklist

### Backend API Endpoints (To Create)

- [ ] `POST /api/notebooks` - Create notebook
- [ ] `GET /api/notebooks/:id` - Load notebook
- [ ] `PUT /api/notebooks/:id` - Update notebook
- [ ] `DELETE /api/notebooks/:id` - Delete notebook
- [ ] `GET /api/notebooks` - List user notebooks

### Database Migration (To Create)

Create `python_notebooks` table with columns:

- `id` (uuid, primary key)
- `title` (text)
- `description` (text, nullable)
- `content` (jsonb) - NotebookContent
- `author_id` (uuid, foreign key to profiles)
- `is_public` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

RLS policies for CRUD operations.

### Frontend Components (To Create)

- [ ] NotebookEditor component (main notebook UI)
- [ ] NotebookCell component (individual cell)
- [ ] CellToolbar component (run, delete, move)
- [ ] NotebookToolbar component (save, add cell, restart kernel)
- [ ] OutputRenderer component (render different output types)

---

## Testing Considerations

### Unit Tests

- Cell management (add, delete, move)
- Execution queue logic
- Output conversion (executor → Jupyter format)
- State transitions (idle → running → success/error)

### Integration Tests

- Sequential cell execution
- Context persistence across cells
- Kernel restart
- Cloud save/load

### Edge Cases

- Deleting last cell (should be prevented)
- Maximum cells limit (200)
- Maximum outputs per cell (100)
- Empty notebook handling
- Execution cancellation mid-queue

---

## Next Steps

1. **Create database migration** for `python_notebooks` table
2. **Implement API endpoints** using validation schemas
3. **Build UI components** for notebook editor
4. **Add tests** for store and executor
5. **Security audit** - Ensure RLS policies are correct
6. **Documentation** - User-facing docs for notebooks

---

## Notes

- All Zod schemas enforce strict limits (cells, outputs, sizes)
- Jupyter-compatible output format for potential export/import
- Persistent context uses worker context management (already implemented)
- Store follows same pattern as `pythonPlayground.svelte.ts`
- Ready for integration with existing Pyodide worker infrastructure
