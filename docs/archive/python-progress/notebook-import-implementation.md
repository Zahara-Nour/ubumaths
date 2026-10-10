# Notebook Import Implementation

Implementation complete: 2025-12-06

## Summary

Created a comprehensive Jupyter notebook import utility that converts `.ipynb` files to our internal `NotebookContent` format.

## Files Created

### 1. Core Implementation

**File**: `/Users/david/Coding/js/ubumaths/src/lib/utils/notebook-import.ts`

**Functions**:

- `importIpynb(fileContent: string): NotebookContent` - Main import function
- `isValidIpynb(fileContent: string): boolean` - Validates file format
- `getIpynbMetadata(fileContent: string)` - Extracts metadata without full conversion

**Features**:

- Full support for Jupyter nbformat v4+
- Converts code and markdown cells
- Handles source as both string and string[] (Jupyter format)
- Generates unique cell IDs with `crypto.randomUUID()`
- Ensures at least one cell exists after import
- Proper error handling with French error messages

**Output Format Support**:

- ✅ stdout/stderr streams
- ✅ Error outputs (traceback)
- ✅ execute_result with execution_count
- ✅ display_data outputs
- ✅ PNG images (image/png)
- ✅ JPEG images (converted to image/png)
- ✅ LaTeX (converted to HTML wrapper)
- ✅ JSON data (including Plotly)
- ❌ Widgets (skipped)
- ❌ Raw cells (skipped)

**Type Definitions**:

- Complete TypeScript types for Jupyter format
- JupyterNotebook, JupyterCell, JupyterOutput interfaces
- Support for various output types (stream, error, display_data, execute_result)

### 2. Comprehensive Tests

**File**: `/Users/david/Coding/js/ubumaths/src/lib/utils/notebook-import.test.ts`

**Coverage**: 33 test cases covering:

- Validation (5 tests)
- Metadata extraction (3 tests)
- Cell conversion (7 tests)
- Output conversion (13 tests)
- Error handling (3 tests)
- Special cases (2 tests - Colab, kernel info)

**Test Results**: ✅ All 33 tests passing

### 3. Usage Examples

**File**: `/Users/david/Coding/js/ubumaths/src/lib/utils/notebook-import.example.ts`

**Examples**:

1. Basic validation and import
2. File upload handler
3. Preview before import
4. Batch import

## Technical Decisions

### Source Normalization

Jupyter notebooks can have source as `string` or `string[]`. We normalize to single string:

```typescript
function normalizeSource(source: string | string[]): string {
	if (Array.isArray(source)) {
		return source.join('');
	}
	return source;
}
```

### Cell ID Generation

- Preserves cell IDs from Jupyter metadata if present
- Generates UUID for cells without IDs
- Ensures uniqueness across notebook

### Output Mapping

| Jupyter Format                 | Our Format       | Notes                            |
| ------------------------------ | ---------------- | -------------------------------- |
| stream (stdout/stderr)         | StreamOutput     | Direct mapping                   |
| error                          | ErrorOutput      | Preserves traceback              |
| execute_result                 | DisplayOutput    | Includes execution_count         |
| display_data                   | DisplayOutput    | Multi-format support             |
| image/jpeg                     | image/png        | JPEG converted to PNG key        |
| text/latex                     | text/html        | Wrapped in `<div class="latex">` |
| application/vnd.plotly.v1+json | application/json | Stringified JSON                 |

### Error Messages

All user-facing error messages in French:

- "Format de fichier invalide. Le fichier doit être un notebook Jupyter valide (.ipynb)."
- "Impossible d'extraire les métadonnées : ..."
- "Erreur lors de la lecture du fichier : ..."

## Integration Points

### Current Usage

This utility is ready to be integrated into:

1. File upload handler for notebooks
2. API endpoint for importing .ipynb files
3. Drag-and-drop notebook import feature

### Example Integration

```typescript
// In a SvelteKit form action
export const actions = {
  import: async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('notebook') as File;

    const content = await file.text();

    if (!isValidIpynb(content)) {
      return fail(400, { error: 'Format invalide' });
    }

    const notebook = importIpynb(content);
    notebook.metadata.title = file.name.replace('.ipynb', '');

    // Save to database
    const { error } = await supabase
      .from('python_notebooks')
      .insert({ content: notebook, ... });

    if (error) return fail(500, { error });

    return { success: true };
  }
};
```

## Quality Checks

- ✅ TypeScript: No errors in implementation files
- ✅ ESLint: No errors or warnings
- ✅ Tests: 33/33 passing
- ✅ Code Review: Self-reviewed, follows project conventions

## Next Steps

Potential enhancements:

1. Add progress callback for large notebooks
2. Support for notebook validation rules (max cells, max output size)
3. Streaming import for very large files
4. Automatic cell cleanup (remove empty cells, merge consecutive markdown)
5. Import statistics (total outputs, images count, etc.)
