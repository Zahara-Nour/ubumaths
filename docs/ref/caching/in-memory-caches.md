# In-Memory LRU Caches

Technical documentation for LRU (Least Recently Used) caches used for compilation and parsing results.

---

## Overview

UbuMaths implements two specialized LRU caches for expensive operations:

| Cache          | Location                             | Max Size    | TTL   | Purpose                  |
| -------------- | ------------------------------------ | ----------- | ----- | ------------------------ |
| Typst Cache    | `src/lib/typst/cache/typst-cache.ts` | 50 entries  | 5 min | Compiled Typst documents |
| Markdown Cache | `src/lib/utils/markdown-cache.ts`    | 100 entries | None  | Parsed Markdown ASTs     |

Both use the same **FNV-1a hash algorithm** for content addressing and **Map insertion order** for LRU eviction.

---

## Typst Cache

### Purpose

Caches compiled Typst documents to avoid recompiling identical content. Typst compilation is CPU-intensive (WASM execution), so caching provides significant performance benefits for:

- Worksheet PDF generation
- Document previews
- Repeated renders of the same content

### Location

```
src/lib/typst/cache/typst-cache.ts
```

### API

```typescript
import { TypstCache, createTypstCache } from '$lib/typst/cache/typst-cache';

// Create cache (default: 50 entries, 5 min TTL)
const cache = new TypstCache();

// Or with custom settings
const cache = createTypstCache(100, 10 * 60 * 1000); // 100 entries, 10 min

// Get cached result
const cached = cache.get(typstSource, 'pdf'); // Uint8Array | string | null

// Store result
cache.set(typstSource, 'pdf', pdfBytes);      // PDF as Uint8Array
cache.set(typstSource, 'svg', svgString);     // SVG as string

// Check existence (without updating LRU order)
if (cache.has(typstSource, 'pdf')) { ... }

// Clear all entries
cache.clear();

// Get statistics
const stats = cache.getStats();
// { size: 25, hits: 150, misses: 50, evictions: 10 }
```

### Configuration

```typescript
// Defaults
const maxSize = 50; // Maximum entries before LRU eviction
const ttl = 5 * 60 * 1000; // 5 minutes in milliseconds

const cache = new TypstCache(maxSize, ttl);
```

### Cache Key Generation

```typescript
// Key format: {format}:{contentHash}
// Example: "pdf:1a2b3c4d"

private generateKey(content: string, format: OutputFormat): string {
  const contentHash = this.hashContent(content);
  return `${format}:${contentHash}`;
}
```

### Output Formats

```typescript
type OutputFormat = 'pdf' | 'svg' | 'typst';

// PDF → Uint8Array (binary)
// SVG → string (XML)
// Typst → string (source, rarely cached)
```

### Statistics

```typescript
interface CacheStats {
	size: number; // Current number of entries
	hits: number; // Cache hits since creation
	misses: number; // Cache misses since creation
	evictions: number; // LRU evictions since creation
}

// Usage
const stats = cache.getStats();
const hitRate = stats.hits / (stats.hits + stats.misses);
console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);
```

---

## Markdown Cache

### Purpose

Caches parsed Markdown Abstract Syntax Trees (ASTs) to avoid re-parsing identical content. Parsing is relatively fast but repeated parsing of the same exercise content adds up.

### Location

```
src/lib/utils/markdown-cache.ts
```

### API

```typescript
import {
	getCachedAST,
	setCachedAST,
	clearMarkdownCache,
	getMarkdownCacheSize
} from '$lib/utils/markdown-cache';

// Get cached AST
const ast = getCachedAST(markdownContent, parseOptions);
// Returns DocumentNode | null

// Store AST
setCachedAST(markdownContent, ast, parseOptions);

// Clear cache
clearMarkdownCache();

// Get current size
const size = getMarkdownCacheSize(); // number
```

### Configuration

```typescript
// Fixed configuration (module-level constant)
const MAX_CACHE_SIZE = 100;

// No TTL - entries persist until LRU eviction
```

### Cache Key Generation

```typescript
// Key format: {contentHash}:{optionsString}
// Example: "1a2b3c4d:{\"format\":\"html\"}"

function generateKey(content: string, options?: ParseOptions): string {
	const contentHash = hashContent(content);
	const optionsStr = options ? JSON.stringify(options, Object.keys(options).sort()) : '';
	return `${contentHash}:${optionsStr}`;
}
```

### Parse Options Impact

Different parse options create separate cache entries:

```typescript
// These create different cache entries
getCachedAST(content, { format: 'html' });
getCachedAST(content, { format: 'latex' });
getCachedAST(content, undefined);
```

---

## LRU Eviction Algorithm

Both caches use JavaScript Map's **insertion order** property for LRU tracking:

```typescript
// Access moves entry to end (most recently used)
get(key) {
  const entry = this.cache.get(key);
  if (entry) {
    // Re-insert to move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
  }
  return entry;
}

// Evict from front (least recently used)
evictOldest() {
  const firstKey = this.cache.keys().next().value;
  if (firstKey) {
    this.cache.delete(firstKey);
  }
}
```

### Eviction Flow

```
Cache at capacity (size = max)
         │
         ▼
New entry arrives
         │
         ▼
Evict oldest (front of Map)
         │
         ▼
Insert new (end of Map)
```

---

## FNV-1a Hash Algorithm

Both caches use FNV-1a for fast, collision-resistant content hashing:

```typescript
function hashContent(str: string): string {
	let hash = 2166136261; // FNV offset basis
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = (hash * 16777619) >>> 0; // FNV prime, force unsigned 32-bit
	}
	return hash.toString(36); // Base36 for compact representation
}
```

### Why FNV-1a?

| Property             | FNV-1a              | SHA-256       |
| -------------------- | ------------------- | ------------- |
| Speed                | Very fast           | Slow          |
| Output size          | 32-bit              | 256-bit       |
| Collision resistance | Good for cache keys | Cryptographic |
| Use case             | Hash tables, caches | Security      |

For caching purposes, FNV-1a provides sufficient collision resistance with minimal overhead.

---

## Memory Considerations

### Typst Cache

```
Entry size = compiled document size (variable)
- PDF: ~100KB - 1MB per document
- SVG: ~50KB - 500KB per document

Max memory = 50 entries × average size
- Typical: 50 × 200KB = 10MB
- Worst case: 50 × 1MB = 50MB
```

### Markdown Cache

```
Entry size = AST object (small)
- Typical: ~5KB per AST

Max memory = 100 entries × ~5KB = 500KB
```

### Total Cache Footprint

```
Typical usage: ~10.5MB
Worst case: ~50.5MB
```

---

## TTL vs LRU

| Mechanism        | Typst Cache      | Markdown Cache    |
| ---------------- | ---------------- | ----------------- |
| TTL              | 5 minutes        | None              |
| LRU              | On capacity (50) | On capacity (100) |
| Expiration check | On get()         | Never             |

### Typst: TTL + LRU

```typescript
get(content, format) {
  const entry = this.cache.get(key);

  // Check TTL first
  if (this.isExpired(entry)) {
    this.cache.delete(key);
    return null; // Force recompile
  }

  // Update LRU order
  this.cache.delete(key);
  this.cache.set(key, entry);

  return entry.data;
}
```

### Markdown: LRU Only

```typescript
getCachedAST(content, options) {
  const entry = cache.get(key);

  if (entry) {
    // Update LRU order
    cache.delete(key);
    cache.set(key, entry);
    return entry.ast;
  }

  return null;
}
```

---

## Usage in Codebase

### Typst Service

```typescript
// src/lib/typst/service/typst-service.ts

class TypstService {
	private cache: TypstCache;

	async compile(source: string, format: OutputFormat) {
		// Check cache first
		const cached = this.cache.get(source, format);
		if (cached) {
			return cached;
		}

		// Compile (expensive)
		const result = await this.compiler.compile(source, format);

		// Cache result
		this.cache.set(source, format, result);

		return result;
	}
}
```

### Markdown Parser

```typescript
// src/lib/ubumark/parser.ts

function parse(content: string, options?: ParseOptions): DocumentNode {
	// Check cache first
	const cached = getCachedAST(content, options);
	if (cached) {
		return cached;
	}

	// Parse (moderate cost)
	const ast = parseMarkdown(content, options);

	// Cache result
	setCachedAST(content, ast, options);

	return ast;
}
```

---

## Testing

### Clear Before Tests

```typescript
import { clearMarkdownCache } from '$lib/utils/markdown-cache';

beforeEach(() => {
	clearMarkdownCache();
});
```

### Verify Cache Behavior

```typescript
it('should cache parsed AST', () => {
	const content = '# Hello World';

	// First parse - cache miss
	const ast1 = parse(content);
	expect(getMarkdownCacheSize()).toBe(1);

	// Second parse - cache hit (same object)
	const ast2 = parse(content);
	expect(ast1).toBe(ast2); // Same reference
});
```

---

## Debugging

### Typst Cache Statistics

```typescript
const cache = typstService.getCache();
const stats = cache.getStats();

console.log('Typst cache:', {
	size: stats.size,
	hitRate: `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`,
	evictions: stats.evictions
});
```

### Markdown Cache Size

```typescript
import { getMarkdownCacheSize } from '$lib/utils/markdown-cache';

console.log('Markdown cache entries:', getMarkdownCacheSize());
```

---

## Related Documentation

- [Typst Service](../../features/worksheets.md) - Worksheet PDF generation
- [Exercise Parser](../../features/exercises/README.md) - Markdown parsing
- [Improvements](improvements.md#lru-cache-improvements) - Recommended enhancements
