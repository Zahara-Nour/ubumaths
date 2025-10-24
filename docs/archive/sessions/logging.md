# Logging System Documentation

The UbuMaths application includes a comprehensive logging system designed for effective debugging and monitoring during development.

## Overview

The logging system provides:

- **Standardized severity levels** for categorizing log messages
- **Color-coded output** for easy visual scanning
- **Threshold filtering** to control log verbosity
- **Environment-aware formatting** (browser vs. server)
- **Automatic production disabling** for performance and security

## Quick Start

```typescript
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('MyComponent.svelte');

logger.info('Component initialized');
logger.warn('Potential issue detected');
logger.error('Operation failed', error);
```

## Severity Levels

The logging system uses four hierarchical severity levels:

| Level   | Numeric Value | Color  | Use Case                                   |
| ------- | ------------- | ------ | ------------------------------------------ |
| `trace` | 0             | Normal | Detailed debugging information             |
| `info`  | 1             | Blue   | General informational messages             |
| `warn`  | 2             | Orange | Potentially problematic situations         |
| `error` | 3             | Red    | Error events that need immediate attention |

### Level Hierarchy

```
trace (0) < info (1) < warn (2) < error (3)
```

Messages are filtered based on this hierarchy. If a logger has a threshold of `info`, only messages with level `info`, `warn`, or `error` will be displayed.

## Creating a Logger

### Basic Usage

```typescript
import { createLogger } from '$lib/utils/logger';

// Default threshold (info)
const logger = createLogger('MyFile.ts');
```

### With Custom Threshold

```typescript
// Show all messages including trace
const debugLogger = createLogger('Debug.ts', 'trace');

// Show only warnings and errors
const warnLogger = createLogger('Service.ts', 'warn');

// Show only errors
const errorLogger = createLogger('Critical.ts', 'error');
```

## Threshold Filtering

The threshold parameter sets the minimum log level that will be displayed:

```typescript
const logger = createLogger('Example.ts', 'info');

logger.trace('This will NOT be displayed'); // Suppressed (below threshold)
logger.info('This WILL be displayed'); // ✅ Displayed
logger.warn('This WILL be displayed'); // ✅ Displayed
logger.error('This WILL be displayed'); // ✅ Displayed
```

### Common Threshold Configurations

| Threshold | Shows             | Use Case                         |
| --------- | ----------------- | -------------------------------- |
| `trace`   | All messages      | Deep debugging sessions          |
| `info`    | info, warn, error | **Default** - normal development |
| `warn`    | warn, error       | Production-like debugging        |
| `error`   | error only        | Critical issues only             |

## Output Formats

### Browser Console (Chrome DevTools)

In the browser, logs appear with CSS-styled colored prefixes:

```
[MyComponent.svelte] Component initialized
[DataService.ts] Failed to load data
```

**Colors:**

- 🔴 Red for errors
- 🟠 Orange for warnings
- 🔵 Blue for info
- ⚪ Normal for trace

### Server Terminal (VSCode)

On the server, logs include a gray timestamp followed by ANSI-colored prefixes:

```
4:55:51 PM [server/auth.ts] User verified: user@example.com
4:55:52 PM [+layout.ts] Loading, isBrowser: false
4:55:53 PM [server/supabase.ts] Creating server client
```

**Format:** `<gray timestamp> <colored prefix> <message>`

## Usage Examples

### In a Svelte Component

```typescript
<script lang="ts">
  import { createLogger } from '$lib/utils/logger';

  const logger = createLogger('UserProfile.svelte');

  let user = $state(null);

  async function loadUser(id: string) {
    logger.info('Loading user profile', { id });

    try {
      user = await fetchUser(id);
      logger.trace('User data loaded', user);
    } catch (err) {
      logger.error('Failed to load user', err);
    }
  }

  $effect(() => {
    logger.info('Component mounted');
    return () => logger.trace('Component unmounted');
  });
</script>
```

### In a Server-Side Module

```typescript
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('api-handler.ts', 'trace');

export async function handleRequest(request: Request) {
	logger.info('Received request', {
		method: request.method,
		url: request.url
	});

	try {
		logger.trace('Processing request...');
		const result = await processRequest(request);
		logger.trace('Request processed successfully', result);
		return result;
	} catch (err) {
		logger.error('Request processing failed', err);
		throw err;
	}
}
```

### In a TypeScript Class

```typescript
import { createLogger } from '$lib/utils/logger';

export class DataService {
	private logger = createLogger('DataService.ts', 'warn');

	async fetchData(id: string) {
		this.logger.info('Fetching data', { id }); // Suppressed (below warn threshold)

		if (!id) {
			this.logger.warn('No ID provided, using default');
			id = 'default';
		}

		try {
			return await this.loadFromDatabase(id);
		} catch (err) {
			this.logger.error('Database query failed', err);
			throw err;
		}
	}
}
```

### With Multiple Data Arguments

```typescript
const logger = createLogger('Analytics.ts');

// Log with multiple arguments
logger.info('User action', 'button-click', {
	buttonId: 'submit',
	timestamp: new Date(),
	userId: 123
});

// Log complex objects
logger.trace('State update', {
	before: { count: 0 },
	after: { count: 1 },
	diff: { count: +1 }
});
```

## Production Behavior

In production mode (`dev === false`), all logger methods become no-op functions:

```typescript
// In production, this creates functions that do nothing
const logger = createLogger('MyComponent.svelte');

// These calls have zero runtime overhead in production
logger.trace('...'); // No-op
logger.info('...'); // No-op
logger.warn('...'); // No-op
logger.error('...'); // No-op
```

**Benefits:**

- ✅ Zero performance impact
- ✅ No log output in production
- ✅ No need to remove logging code
- ✅ Logs automatically return when switching back to development

## Best Practices

### 1. File Naming Convention

Use the actual filename (including extension) for easy source location:

```typescript
// ✅ Good - clear and searchable
const logger = createLogger('UserProfile.svelte');
const logger = createLogger('auth.ts');

// ❌ Avoid - harder to locate
const logger = createLogger('user-profile');
const logger = createLogger('Auth Service');
```

### 2. Appropriate Log Levels

Choose the right level for each message:

```typescript
// ✅ Good usage
logger.trace('Loop iteration', { i: 5 }); // Detailed debugging
logger.info('User logged in', { userId: 123 }); // Important events
logger.warn('Deprecated API used'); // Potential issues
logger.error('Database connection failed', err); // Actual errors

// ❌ Poor usage
logger.error('User clicked button'); // Not an error
logger.trace('Critical security breach'); // Too low for critical issues
```

### 3. Meaningful Messages

Write descriptive log messages:

```typescript
// ✅ Good - descriptive and contextual
logger.info('User authentication successful', { userId, method: 'oauth' });
logger.error('Failed to save user preferences', err, { userId, preferences });

// ❌ Poor - vague and unhelpful
logger.info('Success');
logger.error('Error', err);
```

### 4. Threshold Selection

Choose appropriate thresholds for different scenarios:

```typescript
// ✅ Development - see most activity
const logger = createLogger('MyComponent.svelte', 'info');

// ✅ Debugging specific issues - see everything
const logger = createLogger('BuggyComponent.svelte', 'trace');

// ✅ Noisy component - reduce verbosity
const logger = createLogger('ChattyService.ts', 'warn');

// ✅ Critical path - errors only
const logger = createLogger('PaymentProcessor.ts', 'error');
```

### 5. Structured Data

Include relevant context in log messages:

```typescript
// ✅ Good - structured and searchable
logger.info('API request completed', {
	endpoint: '/api/users',
	method: 'GET',
	statusCode: 200,
	duration: 145,
	userId: 123
});

// ❌ Poor - harder to parse
logger.info(`API request to /api/users completed with status 200 in 145ms for user 123`);
```

## Interactive Demo

Visit the main page of the application to see an interactive demo of the logging system. The demo includes:

- Examples of all four log levels
- Threshold filtering demonstrations
- Color-coded output examples
- Usage code snippets

## Implementation Details

### File Location

```
src/lib/utils/logger.ts
```

### Key Functions

- `createLogger(filename: string, threshold?: LogLevel): Logger`
- `formatTimestamp(): string` (server-side only)
- `formatMessage(...)` (internal)

### Type Definitions

```typescript
export type LogLevel = 'trace' | 'info' | 'warn' | 'error';
export type Logger = ReturnType<typeof createLogger>;
```

## Troubleshooting

### Logs Not Appearing

**Problem:** No logs are showing up in the console.

**Solutions:**

1. Check that you're in development mode (`dev === true`)
2. Verify the threshold is not too high (e.g., set to `'error'` when logging `info`)
3. Check browser console filters (don't filter out `log`, `info`, `warn`, `error`)

### Timestamp Not Showing

**Problem:** Server logs don't have timestamps.

**Solutions:**

1. Timestamps only appear in server-side (terminal) output, not browser console
2. Verify you're checking the VSCode terminal, not the browser

### Colors Not Working

**Problem:** Logs appear without colors.

**Solutions:**

1. **Browser:** Check that your browser's console supports CSS styling
2. **Terminal:** Ensure your terminal supports ANSI color codes
3. Some terminals may need color support enabled in settings

## Migration from console.\*

If you're migrating existing code, replace console calls with the logger:

```typescript
// Before
console.log('[MyComponent] User clicked button');
console.error('[MyComponent] Error:', err);

// After
import { createLogger } from '$lib/utils/logger';
const logger = createLogger('MyComponent.svelte');

logger.info('User clicked button');
logger.error('Error:', err);
```

## Related Files

- Implementation: `src/lib/utils/logger.ts`
- Examples: `src/lib/utils/logger.example.ts`
- Demo Component: `src/lib/components/LoggerDemo.svelte`
- Documentation: `README.md`, `LOGGING.md`
