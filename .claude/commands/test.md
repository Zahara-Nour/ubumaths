---
description: Generer des tests pour un fichier ou composant specifique
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, TodoWrite
argument-hint: [chemin-fichier]
---

# Generer des Tests pour : $1

Tu generes des tests complets pour le fichier specifie.

## Phase 1 : Analyse du Fichier

### Etape 1 : Lire le fichier source

Lis `$1` pour comprendre :
- Type de fichier (composant, utilitaire, API, store)
- Fonctions/methodes exportees
- Dependances
- Logique metier

### Etape 2 : Determiner le type de test

| Type de fichier | Framework de test | Emplacement |
|-----------------|-------------------|-------------|
| `*.svelte` | vitest + @testing-library/svelte | `__tests__/*.svelte.test.ts` |
| `+server.ts` | vitest | `__tests__/*.test.ts` |
| `+page.server.ts` | vitest | `__tests__/*.test.ts` |
| `*.ts` (lib) | vitest | `__tests__/*.test.ts` |
| `*.svelte.ts` (store) | vitest | `__tests__/*.test.ts` |

### Etape 3 : Identifier les cas de test

Pour chaque fonction/comportement :

1. **Cas nominal** - Fonctionnement normal attendu
2. **Cas limites** - Valeurs vides, nulles, max
3. **Cas d'erreur** - Inputs invalides, echecs

---

## Phase 2 : Structure du Fichier de Test

### Pour un utilitaire TypeScript

```typescript
// src/lib/utils/__tests__/[name].test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { functionName } from '../[name]';

describe('[ModuleName]', () => {
  describe('functionName', () => {
    // Cas nominal
    it('should [comportement attendu] when [condition]', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });

    // Cas limites
    it('should handle empty input', () => {
      expect(functionName('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(() => functionName(null as any)).toThrow();
    });

    // Cas d'erreur
    it('should throw on invalid input', () => {
      expect(() => functionName('invalid')).toThrow('Expected error message');
    });
  });
});
```

### Pour un composant Svelte

```typescript
// src/lib/components/[Name]/__tests__/[Name].svelte.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ComponentName from '../ComponentName.svelte';

describe('ComponentName', () => {
  describe('rendering', () => {
    it('should render with required props', () => {
      render(ComponentName, {
        props: { title: 'Test Title' }
      });

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should apply correct classes based on variant', () => {
      render(ComponentName, {
        props: { title: 'Test', variant: 'primary' }
      });

      const element = screen.getByRole('button');
      expect(element).toHaveClass('primary-class');
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(ComponentName, {
        props: { title: 'Test', onclick: handleClick }
      });

      await fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should not respond when disabled', async () => {
      const handleClick = vi.fn();
      render(ComponentName, {
        props: { title: 'Test', disabled: true, onclick: handleClick }
      });

      await fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(ComponentName, {
        props: { title: 'Test', ariaLabel: 'Custom label' }
      });

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom label');
    });
  });
});
```

### Pour un endpoint API

```typescript
// src/routes/api/[endpoint]/__tests__/[endpoint].test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';

// Mock Supabase
vi.mock('$lib/server/supabase', () => ({
  createServerClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
    })),
  }),
}));

describe('GET /api/[endpoint]', () => {
  const createMockEvent = (overrides = {}) => ({
    request: new Request('http://localhost/api/endpoint'),
    locals: { user: { id: 'test-user-id' } },
    url: new URL('http://localhost/api/endpoint'),
    ...overrides,
  });

  describe('authentication', () => {
    it('should return 401 if not authenticated', async () => {
      const event = createMockEvent({ locals: { user: null } });

      await expect(GET(event as any)).rejects.toThrow('Non authentifie');
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid query params', async () => {
      const url = new URL('http://localhost/api/endpoint?invalid=true');
      const event = createMockEvent({ url });

      await expect(GET(event as any)).rejects.toThrow();
    });
  });

  describe('success cases', () => {
    it('should return data for valid request', async () => {
      const event = createMockEvent();

      const response = await GET(event as any);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });
});

describe('POST /api/[endpoint]', () => {
  const createMockEvent = (body: unknown, overrides = {}) => ({
    request: {
      json: () => Promise.resolve(body),
    } as Request,
    locals: { user: { id: 'test-user-id' } },
    ...overrides,
  });

  describe('validation', () => {
    it('should return 400 for invalid body', async () => {
      const event = createMockEvent({ invalid: 'data' });

      await expect(POST(event as any)).rejects.toThrow();
    });

    it('should accept valid body', async () => {
      const event = createMockEvent({
        name: 'Test',
        value: 42,
      });

      const response = await POST(event as any);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });
});
```

---

## Phase 3 : Patterns de Test Specifiques

### Mocking Supabase

```typescript
vi.mock('$lib/server/supabase', () => ({
  createServerClient: () => mockSupabase,
}));

const mockSupabase = {
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: mockData, error: null })),
        data: [mockData],
        error: null,
      })),
      data: [mockData],
      error: null,
    })),
    insert: vi.fn(() => ({ data: mockData, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: mockData, error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
    })),
  })),
  auth: {
    getUser: vi.fn(() => ({ data: { user: mockUser }, error: null })),
  },
};
```

### Test de stores Svelte

```typescript
import { get } from 'svelte/store';
import { myStore } from '../myStore.svelte';

describe('myStore', () => {
  beforeEach(() => {
    myStore.reset(); // Si methode reset existe
  });

  it('should have initial value', () => {
    expect(get(myStore)).toEqual(initialValue);
  });

  it('should update value', () => {
    myStore.update(value => ({ ...value, count: 1 }));
    expect(get(myStore).count).toBe(1);
  });
});
```

### Tests async

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();

  expect(result).toBeDefined();
});

it('should reject on error', async () => {
  await expect(asyncFunctionThatFails()).rejects.toThrow('Error message');
});
```

---

## Phase 4 : Execution des Tests

### Verifier que les tests echouent d'abord (TDD)

```bash
# Pour server-side
pnpm test:server [chemin] --run

# Pour client-side (composants)
pnpm test:client [chemin] --run
```

### Verifier la couverture

```bash
pnpm test:unit -- --coverage --run
```

---

## Phase 5 : Checklist

- [ ] Tous les exports publics sont testes
- [ ] Cas nominaux couverts
- [ ] Cas limites couverts (empty, null, max)
- [ ] Cas d'erreur couverts
- [ ] Mocks correctement configures
- [ ] Tests independants (pas de dependance entre tests)
- [ ] Nommage clair des tests (should X when Y)
- [ ] Arrange-Act-Assert structure

---

## Regles

1. **Un test = un comportement** (pas de tests qui testent plusieurs choses)
2. **Tests independants** (peuvent s'executer dans n'importe quel ordre)
3. **Noms descriptifs** ("should return empty array when no items")
4. **Pas de logique dans les tests** (pas de if/else)
5. **DRY via beforeEach**, pas de duplication de setup
