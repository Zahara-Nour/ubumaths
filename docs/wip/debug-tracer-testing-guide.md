# Debug Tracer Testing Guide

## Overview

This document explains the testing strategy for the Python debug tracer implemented in Phase 2 of the Python debugger.

## Files Created

- `/src/lib/workers/pyodide.worker.debug.test.ts` - Unit tests for debug tracer

## Testing Challenges

The Python debug tracer presents unique testing challenges:

1. **Web Worker Environment**: Code runs in a Web Worker, not in Node.js
2. **Pyodide Dependency**: Python functions require Pyodide runtime to execute
3. **String-based Python Code**: Python functions are defined as strings and executed via `runPythonAsync()`
4. **Frame Objects**: Debugging relies on Python frame objects from `sys.settrace()`
5. **PyProxy Objects**: Communication between Python and JavaScript uses Pyodide's PyProxy

## Testing Strategy

### 1. Unit Tests (Current Implementation)

**File**: `src/lib/workers/pyodide.worker.debug.test.ts`

**What's Tested**:

- `convertMapToObject` helper function (41 test cases)
- Converts JavaScript Maps to plain objects recursively
- Handles nested structures, arrays, primitives, and edge cases

**What's NOT Tested** (requires Pyodide):

- Python serialization functions
- Variable extraction logic
- Snapshot creation
- Trace function behavior
- Debug session lifecycle

### 2. Specification Tests (Documented Behavior)

The test file includes "specification tests" that describe expected behavior without executing code:

- **Serialization specifications**:
  - Primitive types (int, str, bool, None, float, complex)
  - Collection limits (50 items max)
  - String truncation (200 chars max)
  - Depth limits (5 levels max)
  - Circular reference detection

- **Variable extraction specifications**:
  - Filtering internal variables (`_ubumaths_*`)
  - Filtering dunder variables (`__name__`, etc.)
  - Change detection (`isChanged` flag)
  - New variable detection (`isNew` flag)
  - Type classification (`isBuiltin`)

- **Snapshot creation specifications**:
  - Call stack ordering
  - Global variable extraction
  - Frame filtering (user code only)
  - Stdout capture
  - Unique snapshot IDs

- **Pause logic specifications**:
  - Breakpoint evaluation
  - Conditional breakpoints
  - Step modes (step, step-over, step-out, continue, run-to-end)
  - Depth tracking

### 3. Integration Tests (Recommended - Not Yet Implemented)

**Requires**: Pyodide environment in test setup

**What Should Be Tested**:

```python
# Example integration test (pseudo-code)
test('should serialize Python list with item limit', async () => {
  const pyodide = await loadPyodide();
  await pyodide.runPythonAsync(`
    # Initialize serialization function
    exec(SERIALIZATION_CODE)

    # Test list with 100 items
    test_list = list(range(100))
    result = _ubumaths_serialize_value(test_list)
  `);

  const result = pyodide.globals.get('result').toJs();
  expect(result.length).toBe(51); // 50 items + "..." marker
});
```

**Test Cases Needed**:

1. Serialization of all Python types
2. Item limit enforcement (50 items)
3. String truncation (200 chars)
4. Depth limit (5 levels)
5. Circular reference detection for lists/dicts/sets
6. Variable extraction from frame locals
7. Change detection between snapshots
8. Snapshot creation with multiple frames
9. Global variable extraction
10. Breakpoint pause conditions
11. Step mode depth tracking

**Setup Required**:

```typescript
// vitest.config.ts for integration tests
export default defineConfig({
	test: {
		environment: 'jsdom', // or custom Pyodide environment
		setupFiles: ['./tests/setup-pyodide.ts']
	}
});
```

### 4. E2E Tests (Recommended - Not Yet Implemented)

**Tool**: Playwright

**Test Scenarios**:

#### Basic Debug Session

```typescript
test('should debug simple Python code', async ({ page }) => {
	// 1. Open Python playground
	await page.goto('/playground/python');

	// 2. Set breakpoint at line 3
	await page.click('[data-line="3"]');

	// 3. Start debug session
	await page.fill('[data-editor]', 'x = 1\ny = 2\nz = x + y\nprint(z)');
	await page.click('[data-debug-start]');

	// 4. Verify paused at line 1
	await expect(page.locator('[data-current-line]')).toHaveText('1');

	// 5. Step to line 3
	await page.click('[data-debug-step]');
	await page.click('[data-debug-step]');

	// 6. Verify paused at breakpoint
	await expect(page.locator('[data-pause-reason]')).toHaveText('breakpoint');

	// 7. Inspect variables
	await expect(page.locator('[data-var-x]')).toHaveText('1');
	await expect(page.locator('[data-var-y]')).toHaveText('2');

	// 8. Continue to end
	await page.click('[data-debug-continue]');
	await expect(page.locator('[data-debug-status]')).toHaveText('finished');
});
```

#### Step Modes

```typescript
test('should step over function calls', async ({ page }) => {
	const code = `
def helper(x):
    return x * 2

result = helper(5)
print(result)
`;

	await page.fill('[data-editor]', code);
	await page.click('[data-debug-start]');

	// Step to function call
	await page.click('[data-debug-step]');
	await page.click('[data-debug-step]');

	// Step over (should skip function internals)
	await page.click('[data-debug-step-over]');

	// Should be at print(result), not inside helper()
	await expect(page.locator('[data-current-line]')).toHaveText('5');
});
```

#### Conditional Breakpoints

```typescript
test('should evaluate conditional breakpoint', async ({ page }) => {
	const code = `
for i in range(10):
    x = i * 2
    print(x)
`;

	// Set conditional breakpoint: i > 5
	await page.click('[data-line="3"]');
	await page.fill('[data-breakpoint-condition]', 'i > 5');

	await page.click('[data-debug-start]');
	await page.click('[data-debug-continue]');

	// Should pause when i=6
	await expect(page.locator('[data-var-i]')).toHaveText('6');
});
```

#### Variable Change Detection

```typescript
test('should mark changed variables', async ({ page }) => {
	const code = `
x = 1
y = 2
x = 3  # x changes here
`;

	await page.click('[data-debug-start]');

	// Step to x = 3
	await page.click('[data-debug-step]');
	await page.click('[data-debug-step]');

	// x should not be marked as changed yet
	await expect(page.locator('[data-var-x]')).not.toHaveClass(/changed/);

	// Step past x = 3
	await page.click('[data-debug-step]');

	// Now x should be marked as changed
	await expect(page.locator('[data-var-x]')).toHaveClass(/changed/);
});
```

#### Call Stack

```typescript
test('should show correct call stack', async ({ page }) => {
	const code = `
def outer():
    inner()

def inner():
    x = 42  # breakpoint here

outer()
`;

	await page.click('[data-line="5"]'); // Set breakpoint
	await page.click('[data-debug-start]');
	await page.click('[data-debug-continue]');

	// Verify call stack
	const stack = page.locator('[data-call-stack]');
	await expect(stack.locator('[data-frame="0"]')).toContainText('<module>');
	await expect(stack.locator('[data-frame="1"]')).toContainText('outer');
	await expect(stack.locator('[data-frame="2"]')).toContainText('inner');
	await expect(stack.locator('[data-frame="2"]')).toHaveClass(/current/);
});
```

## Test Coverage Summary

| Area                 | Unit Tests       | Integration Tests  | E2E Tests      |
| -------------------- | ---------------- | ------------------ | -------------- |
| convertMapToObject   | ✅ 41 tests      | N/A                | N/A            |
| Python Serialization | 📋 Spec only     | ❌ Not implemented | ✅ Recommended |
| Variable Extraction  | 📋 Spec only     | ❌ Not implemented | ✅ Recommended |
| Snapshot Creation    | 📋 Spec only     | ❌ Not implemented | ✅ Recommended |
| Breakpoint Logic     | 📋 Spec only     | ❌ Not implemented | ✅ Recommended |
| Step Modes           | 📋 Spec only     | ❌ Not implemented | ✅ Recommended |
| Debug Lifecycle      | 📋 Spec only     | ❌ Not implemented | ✅ Recommended |
| Message Schemas      | ✅ Full coverage | N/A                | N/A            |

Legend:

- ✅ Implemented and passing
- 📋 Specified but not executable (requires Pyodide)
- ❌ Not yet implemented
- N/A Not applicable

## Running Tests

### Current Unit Tests

```bash
# Run all debug tracer tests
pnpm test:server src/lib/workers/pyodide.worker.debug.test.ts

# Run with watch mode
pnpm test:unit
```

### Future Integration Tests (Not Yet Implemented)

```bash
# Would require setup
pnpm test:integration src/lib/workers/pyodide.worker.integration.test.ts
```

### Future E2E Tests (Not Yet Implemented)

```bash
# Would use Playwright
pnpm test:e2e tests/e2e/python-debugger.spec.ts
```

## Implementation Recommendations

### For Integration Tests

1. **Create Pyodide Test Environment**:

   ```typescript
   // tests/setup-pyodide.ts
   import { loadPyodide } from 'pyodide';

   export async function setupPyodide() {
   	const pyodide = await loadPyodide();
   	// Load debug tracer code
   	await pyodide.runPythonAsync(DEBUG_TRACER_CODE);
   	return pyodide;
   }
   ```

2. **Extract Python Code to Testable Modules**:
   - Move Python functions to separate files
   - Load them in both tests and worker
   - Easier to test independently

3. **Mock Frame Objects**:
   - Create mock Python frames for testing
   - Test serialization without full execution

### For E2E Tests

1. **Create Test Fixtures**:

   ```typescript
   // tests/fixtures/python-code.ts
   export const SIMPLE_LOOP = `
   for i in range(5):
       print(i)
   `;

   export const FUNCTION_CALL = `
   def add(a, b):
       return a + b
   
   result = add(3, 4)
   `;
   ```

2. **Use Page Object Model**:

   ```typescript
   // tests/pages/python-debugger.ts
   export class PythonDebuggerPage {
     async setBreakpoint(line: number) { ... }
     async startDebug() { ... }
     async step() { ... }
     async getVariableValue(name: string) { ... }
   }
   ```

3. **Test Error Cases**:
   - Syntax errors during debug
   - Runtime exceptions
   - Timeout scenarios
   - Invalid breakpoint conditions

## Known Limitations

1. **No Frame Object Mocking**: Python frame objects from `sys.settrace()` cannot be easily mocked
2. **PyProxy Complexity**: Pyodide's PyProxy objects have complex lifecycle management
3. **Timing-Dependent**: Debug sessions involve asynchronous message passing
4. **Worker Isolation**: Web Workers run in separate contexts, hard to instrument

## Future Improvements

1. **Extract Python Code**: Move Python functions to `.py` files for better testability
2. **Mock Worker Messages**: Create mock message bus for testing TypeScript functions
3. **Snapshot Comparison**: Add snapshot testing for complex debug states
4. **Performance Tests**: Measure serialization performance with large objects
5. **Stress Tests**: Test with deeply nested structures, many breakpoints, long sessions

## Conclusion

The current test suite provides:

- ✅ Full coverage of testable TypeScript helpers
- ✅ Documentation of expected Python behavior
- ✅ Clear specification of debug features
- 📋 Blueprint for future integration and E2E tests

The Python debug tracer is **specification-tested** but not **execution-tested**. Integration and E2E tests are strongly recommended before production use.
