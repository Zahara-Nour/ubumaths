# JavaScript Worker Types and Schemas

TypeScript types and Zod validation schemas for the JavaScript sandbox Worker used in Blockly visual programming.

## Files

- **`types.ts`** - TypeScript type definitions for Worker communication
- **`schemas.ts`** - Zod validation schemas for runtime message validation

## Message Types

### To Worker (Main Thread → Worker)

```typescript
import type { ToJsWorkerMessage } from './types';

// Execute JavaScript code
const executeMsg: ToJsWorkerMessage = {
	type: 'execute',
	code: 'console.log("Hello");',
	id: 'exec-123'
};

// Cancel running execution
const cancelMsg: ToJsWorkerMessage = {
	type: 'cancel',
	id: 'exec-123'
};
```

### From Worker (Worker → Main Thread)

```typescript
import type { FromJsWorkerMessage } from './types';

// Worker ready
const readyMsg: FromJsWorkerMessage = {
	type: 'ready'
};

// Console output
const stdoutMsg: FromJsWorkerMessage = {
	type: 'stdout',
	data: 'Hello\n',
	id: 'exec-123'
};

// Execution error
const errorMsg: FromJsWorkerMessage = {
	type: 'error',
	message: 'ReferenceError: x is not defined',
	line: 5,
	id: 'exec-123'
};

// Execution complete
const completeMsg: FromJsWorkerMessage = {
	type: 'complete',
	id: 'exec-123',
	duration: 234
};
```

## Runtime Validation

### Validating Messages

```typescript
import { toJsWorkerMessageSchema, fromJsWorkerMessageSchema } from './schemas';

// Validate message to worker
const result = toJsWorkerMessageSchema.safeParse(unknownData);
if (result.success) {
	// result.data is type-safe ToJsWorkerMessage
	worker.postMessage(result.data);
} else {
	console.error('Invalid message:', result.error.issues);
}

// Validate message from worker
worker.onmessage = (event) => {
	const validation = fromJsWorkerMessageSchema.safeParse(event.data);
	if (validation.success) {
		handleMessage(validation.data);
	} else {
		console.error('Invalid worker message:', validation.error);
	}
};
```

### Using Type Guards

```typescript
import { isToJsWorkerMessage, isFromJsWorkerMessage } from './schemas';

// Type guard for ToJsWorkerMessage
if (isToJsWorkerMessage(data)) {
	// data is narrowed to ToJsWorkerMessage
	worker.postMessage(data);
}

// Type guard for FromJsWorkerMessage
if (isFromJsWorkerMessage(event.data)) {
	// event.data is narrowed to FromJsWorkerMessage
	handleMessage(event.data);
}
```

## Execution Context

```typescript
import type { JsExecutionContext } from './types';
import { DEFAULT_JS_EXECUTION_CONTEXT, jsExecutionContextSchema } from './schemas';

// Use default configuration
const context: JsExecutionContext = DEFAULT_JS_EXECUTION_CONTEXT;
// { timeoutMs: 5000, maxOutputSize: 100_000, detectInfiniteLoops: true }

// Custom configuration with validation
const customContext = jsExecutionContextSchema.parse({
	timeoutMs: 10000,
	maxOutputSize: 50000,
	detectInfiniteLoops: false
});
```

## State Machine

```typescript
import type { JsExecutorState } from './types';

let state: JsExecutorState = 'initial';

// Transitions:
// initial → ready (worker initialized)
// ready → executing (code execution started)
// executing → ready (execution completed/timeout/error)
// * → error (fatal error, requires worker restart)
```

## Best Practices

1. **Always validate** incoming messages with Zod schemas
2. **Use type guards** for runtime type narrowing
3. **Handle all message types** in discriminated union switches
4. **Respect limits**: Code size (100KB), output size (100KB), timeout (5s default)
5. **Generate unique IDs** for each execution to track messages

## Example: Worker Message Handler

```typescript
import type { FromJsWorkerMessage, JsExecutorState } from './types';
import { fromJsWorkerMessageSchema } from './schemas';

let state: JsExecutorState = 'initial';

worker.onmessage = (event) => {
	const validation = fromJsWorkerMessageSchema.safeParse(event.data);
	if (!validation.success) {
		console.error('Invalid message from worker:', validation.error);
		return;
	}

	const message = validation.data;

	switch (message.type) {
		case 'ready':
			state = 'ready';
			break;

		case 'stdout':
			console.log(`[${message.id}]`, message.data);
			break;

		case 'stderr':
			console.error(`[${message.id}]`, message.data);
			break;

		case 'error':
			state = 'ready';
			handleError(message);
			break;

		case 'complete':
			state = 'ready';
			console.log(`Execution completed in ${message.duration}ms`);
			break;

		case 'timeout':
			state = 'ready';
			console.warn(`Execution ${message.id} timed out`);
			break;

		default:
			// TypeScript ensures exhaustive checking
			const _exhaustive: never = message;
			break;
	}
};
```

## Validation Constraints

### Code Limits

- **Max code length**: 100,000 characters
- **Max line number**: 100,000 lines

### Output Limits

- **Max console output**: 100,000 characters per message
- **Max error message**: 10,000 characters

### Execution Limits

- **Min timeout**: 100ms
- **Max timeout**: 60,000ms (60 seconds)
- **Max duration**: 300,000ms (5 minutes)

### ID Constraints

- **Execution ID**: 1-100 characters, non-empty
