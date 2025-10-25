# 🧪 Guide de tests

Guide complet pour tester UbuMaths.

**Status** : 📝 Documentation en cours

---

## 🎯 Stratégie de tests

### Pyramide des tests

```
        /\
       /E2E\       <- Peu, lents, valeur élevée
      /------\
     /  Integ \    <- Moyens, API endpoints
    /----------\
   /   Unit      \  <- Nombreux, rapides, logique métier
  /--------------\
```

---

## 🔬 Tests unitaires

**Framework** : [Vitest](https://vitest.dev/)

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node', // ou 'jsdom' pour composants
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html']
		}
	}
});
```

### Structure fichiers

```
src/lib/utils/questions/
├── parser.ts
├── parser.test.ts     # Tests unitaires
├── generator.ts
└── generator.test.ts
```

### Exemple test

```typescript
// parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseLatex } from './parser';

describe('LaTeX Parser', () => {
	it('should parse simple expression', () => {
		const input = '2x + 3';
		const result = parseLatex(input);

		expect(result.success).toBe(true);
		expect(result.ast).toBeDefined();
	});

	it('should handle invalid syntax', () => {
		const input = '2x +';
		const result = parseLatex(input);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should parse fractions', () => {
		const input = '\\frac{1}{2}';
		const result = parseLatex(input);

		expect(result.ast.type).toBe('fraction');
		expect(result.ast.numerator).toBe('1');
		expect(result.ast.denominator).toBe('2');
	});
});
```

### Lancer tests

```bash
# Tous les tests
pnpm test:unit

# Watch mode
pnpm test:unit -- --watch

# Coverage
pnpm test:unit -- --coverage

# Fichier spécifique
pnpm test:unit src/lib/utils/questions/parser.test.ts
```

---

## 🎭 Tests composants

**Tests Svelte avec Vitest + Testing Library**

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
	test: {
		environment: 'jsdom', // DOM simulation
		setupFiles: ['./vitest-setup.ts']
	}
});
```

### Exemple

```typescript
// QuestionCard.svelte.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import QuestionCard from './QuestionCard.svelte';

describe('QuestionCard', () => {
	it('should render question title', () => {
		const question = {
			id: '1',
			title: 'Test Question',
			type: 'multiple_choice'
		};

		render(QuestionCard, { props: { question } });

		expect(screen.getByText('Test Question')).toBeInTheDocument();
	});

	it('should call onEdit when edit button clicked', async () => {
		const question = { id: '1', title: 'Test' };
		const handleEdit = vi.fn();

		render(QuestionCard, {
			props: { question, onEdit: handleEdit }
		});

		const editButton = screen.getByRole('button', { name: /edit/i });
		await fireEvent.click(editButton);

		expect(handleEdit).toHaveBeenCalledWith('1');
	});
});
```

---

## 🔌 Tests intégration (API)

Tester endpoints API.

### Exemple

```typescript
// src/routes/api/questions/+server.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from './+server';

describe('Questions API', () => {
	let mockSupabase;
	let mockUser;

	beforeEach(() => {
		mockUser = { id: 'user-123', email: 'test@test.com' };

		mockSupabase = {
			from: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [{ id: '1', title: 'Question 1' }],
				error: null
			})
		};
	});

	it('GET should return user questions', async () => {
		const request = new Request('http://localhost/api/questions');

		const response = await GET({
			request,
			locals: {
				safeGetSession: async () => ({ user: mockUser }),
				supabase: mockSupabase
			}
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
		expect(data[0].title).toBe('Question 1');
	});

	it('POST should create question', async () => {
		const body = { title: 'New Question', type: 'multiple_choice' };
		const request = new Request('http://localhost/api/questions', {
			method: 'POST',
			body: JSON.stringify(body)
		});

		mockSupabase.insert = vi.fn().mockResolvedValue({
			data: { id: '2', ...body },
			error: null
		});

		const response = await POST({
			request,
			locals: {
				safeGetSession: async () => ({ user: mockUser }),
				supabase: mockSupabase
			}
		});

		expect(response.status).toBe(201);
		expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining(body));
	});
});
```

---

## 🎬 Tests E2E

**Framework** : [Playwright](https://playwright.dev/)

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry'
	},

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	]
});
```

### Exemple

```typescript
// e2e/questions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Question Bank', () => {
	test.beforeEach(async ({ page }) => {
		// Login
		await page.goto('/auth/login');
		await page.fill('[name="email"]', 'teacher@voltairedoha.com');
		await page.fill('[name="password"]', 'password');
		await page.click('button[type="submit"]');

		await page.waitForURL('/dashboard');
	});

	test('should create a new question', async ({ page }) => {
		// Navigate to questions
		await page.goto('/dashboard/teacher/questions');

		// Click create button
		await page.click('text=Créer une question');

		// Fill form
		await page.fill('[name="title"]', 'Test Question E2E');
		await page.selectOption('[name="type"]', 'multiple_choice');
		await page.fill('[name="statement"]', 'Quelle est la réponse ?');

		// Submit
		await page.click('button[type="submit"]');

		// Verify redirect and success
		await expect(page).toHaveURL(/\/dashboard\/teacher\/questions/);
		await expect(page.locator('text=Test Question E2E')).toBeVisible();
	});

	test('should filter questions by category', async ({ page }) => {
		await page.goto('/dashboard/teacher/questions');

		// Select category
		await page.selectOption('[name="category"]', 'algebra');

		// Verify filtered results
		const questions = page.locator('[data-testid="question-card"]');
		await expect(questions).toHaveCount(greaterThan(0));

		// All questions should be algebra
		const categories = await questions.locator('[data-category]').allTextContents();
		expect(categories.every((cat) => cat === 'Algèbre')).toBe(true);
	});
});
```

### Lancer E2E

```bash
# Démarrer dev server d'abord
pnpm dev

# Dans autre terminal
npx playwright test

# UI mode (debug)
npx playwright test --ui

# Browser spécifique
npx playwright test --project=chromium
```

---

## 📊 Coverage

### Générer rapport

```bash
pnpm test:unit -- --coverage
```

### Objectifs

- **Logique métier** : > 80%
- **API endpoints** : > 70%
- **Composants** : > 60%
- **Global** : > 70%

### Visualiser

```bash
# Ouvrir rapport HTML
open coverage/index.html
```

---

## 💡 Best Practices

### Tests unitaires

- **Un concept par test**
- **Noms descriptifs** : "should [expected behavior] when [condition]"
- **AAA Pattern** : Arrange, Act, Assert
- **Isolés** : Pas de dépendances entre tests
- **Rapides** : < 100ms par test

### Tests E2E

- **User flows complets**
- **Happy path + edge cases**
- **Données de test isolées**
- **Cleanup après chaque test**
- **Sélecteurs stables** : `data-testid` plutôt que classes CSS

### Mocking

```typescript
// Mock Supabase
const mockSupabase = {
	from: vi.fn().mockReturnThis(),
	select: vi.fn().mockReturnThis(),
	eq: vi.fn().mockResolvedValue({ data: [], error: null })
};

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
	ok: true,
	json: async () => ({ data: 'mocked' })
});
```

---

## 🐛 Debugging tests

### Vitest

```bash
# Debug mode
pnpm test:unit -- --inspect-brk

# UI mode
pnpm test:unit -- --ui
```

### Playwright

```bash
# Headed mode (voir browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Trace viewer
npx playwright show-trace trace.zip
```

---

## 🔗 Ressources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)

---

[← Retour aux guides](README.md)
