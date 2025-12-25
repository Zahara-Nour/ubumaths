# Tester les comportements Touch

## Tester le store inputCapability

### Configuration des tests

Le store utilise `window.matchMedia()`. Pour les tests, il faut mocker cette fonction.

### Helper de mock

```typescript
// Dans le fichier de test
function mockMatchMedia(overrides: Record<string, boolean> = {}) {
	const defaults: Record<string, boolean> = {
		'(any-pointer: coarse)': false, // hasTouch
		'(any-pointer: fine)': true, // hasMouse
		'(any-hover: hover)': true, // canHover
		'(pointer: coarse)': false // primaryIsTouch
	};

	const values = { ...defaults, ...overrides };

	window.matchMedia = vi.fn((query: string) => ({
		matches: values[query] ?? false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	})) as unknown as typeof window.matchMedia;
}
```

### Exemples de tests

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInputCapabilityStore } from '$lib/stores/input-capability.svelte';

describe('inputCapability store', () => {
	beforeEach(() => {
		vi.stubGlobal('window', {
			matchMedia: vi.fn()
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('hasTouch', () => {
		it('should return true when any-pointer: coarse matches', () => {
			mockMatchMedia({ '(any-pointer: coarse)': true });
			const store = createInputCapabilityStore();
			expect(store.hasTouch).toBe(true);
		});

		it('should return false when any-pointer: coarse does not match', () => {
			mockMatchMedia({ '(any-pointer: coarse)': false });
			const store = createInputCapabilityStore();
			expect(store.hasTouch).toBe(false);
		});
	});

	describe('hybrid devices', () => {
		it('should detect laptop with touchscreen', () => {
			mockMatchMedia({
				'(any-pointer: coarse)': true, // Touchscreen
				'(any-pointer: fine)': true, // Trackpad
				'(any-hover: hover)': true, // Trackpad can hover
				'(pointer: coarse)': false // Trackpad is primary
			});
			const store = createInputCapabilityStore();

			expect(store.hasTouch).toBe(true);
			expect(store.hasMouse).toBe(true);
			expect(store.canHover).toBe(true);
			expect(store.primaryIsTouch).toBe(false);
		});
	});
});
```

---

## Tester les composants

### Pattern : Media query dans le style

Les media queries CSS ne sont pas facilement testables en JavaScript. Deux approches :

#### 1. Tests visuels (Recommande)

Utiliser Chrome DevTools pour tester manuellement :

1. Ouvrir DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Choisir un device mobile (ex: iPhone 14)
4. Verifier que les elements ont la bonne taille (44px)

#### 2. Tests avec matchMedia mock

```typescript
import { render } from '@testing-library/svelte';
import Button from '$lib/components/ui/button/button.svelte';

describe('Button touch-friendly', () => {
	it('should have touch-target class', () => {
		const { container } = render(Button, {
			props: { children: () => 'Click me' }
		});

		const button = container.querySelector('button');
		expect(button?.classList.contains('touch-target')).toBe(true);
	});
});
```

### Pattern : Classe conditionnelle

Pour les composants qui utilisent le store directement :

```typescript
import { render } from '@testing-library/svelte';
import MyComponent from './MyComponent.svelte';

// Mock du store avant import du composant
vi.mock('$lib/stores/input-capability.svelte', () => ({
	inputCapability: {
		hasTouch: true,
		hasMouse: false,
		canHover: false,
		primaryIsTouch: true
	}
}));

describe('MyComponent on touch device', () => {
	it('should apply touch-mode class', () => {
		const { container } = render(MyComponent);
		expect(container.querySelector('.touch-mode')).toBeTruthy();
	});
});
```

---

## Tester dans Chrome DevTools

### Activer le mode device

1. Ouvrir DevTools (F12 ou Cmd+Option+I)
2. Cliquer sur l'icone "Toggle device toolbar" (ou Ctrl+Shift+M)
3. Selectionner un appareil mobile dans la liste

### Verifier les media queries

1. Ouvrir l'onglet "Elements"
2. Selectionner un element interactif
3. Dans le panneau "Styles", chercher les styles `@media (pointer: coarse)`
4. Verifier qu'ils sont actifs (non barres)

### Tester le hover

1. En mode desktop : survoler l'element
2. En mode mobile : cliquer sur l'element (pas de hover visible)

### Tester les tailles

1. Selectionner un bouton
2. Onglet "Computed"
3. Verifier `min-height: 44px` sur mobile

---

## Tester sur vrai appareil

### iOS Safari

1. Connecter l'iPhone/iPad au Mac via USB
2. Sur l'appareil : Reglages > Safari > Avance > Inspecteur web
3. Sur Mac : Safari > Developper > [Nom de l'appareil]
4. Naviguer vers l'app et inspecter

### Android Chrome

1. Activer le mode developpeur sur Android
2. Connecter via USB
3. Sur Chrome desktop : `chrome://inspect`
4. Selectionner l'appareil et cliquer "Inspect"

---

## Scenarios de test

### Checklist fonctionnelle

| Scenario       | Desktop          | Mobile                  | Resultat attendu        |
| -------------- | ---------------- | ----------------------- | ----------------------- |
| Bouton taille  | 40px             | 44px                    | Augmente sur mobile     |
| Checkbox zone  | 16px             | 44px                    | Zone etendue sur mobile |
| Select trigger | 36px             | 44px                    | Plus grand sur mobile   |
| Tooltip        | Visible au hover | -                       | Tooltip visible         |
| Instructions   | "Clic droit..."  | "Appuyez longuement..." | Texte adapte            |

### Tests automatises recommandes

```typescript
describe('Touch-friendly components', () => {
	describe('Button', () => {
		it('has touch-target class for CSS adaptation', () => {
			// Verifier la presence de la classe
		});
	});

	describe('MyCheckbox', () => {
		it('wraps checkbox in touch-friendly container', () => {
			// Verifier le wrapper
		});
	});

	describe('MySelect', () => {
		it('trigger has select-trigger class', () => {
			// Verifier la classe sur le trigger
		});

		it('items have select-item class', () => {
			// Verifier la classe sur les items
		});
	});
});
```

---

## Deboguer les problemes

### Media query ne s'applique pas

1. Verifier que DevTools est en mode mobile
2. Verifier que la media query est correcte : `(pointer: coarse)` pas `(pointer: touch)`
3. Verifier la specificite CSS (pas overridee par autre regle)

### Store retourne false alors que touch est actif

1. Verifier que `window.matchMedia` est disponible
2. Tester dans la console : `window.matchMedia('(any-pointer: coarse)').matches`
3. Verifier le SSR (store peut etre initialise cote serveur)

### Taille incorrecte

1. Inspecter l'element dans DevTools
2. Verifier que `min-height` est applique (pas `height`)
3. Verifier qu'il n'y a pas de `max-height` qui override

---

## Ressources

- [Chrome DevTools - Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Safari Web Inspector](https://webkit.org/web-inspector/enabling-web-inspector/)
- [Vitest - Mocking](https://vitest.dev/guide/mocking.html)
- [Testing Library - Svelte](https://testing-library.com/docs/svelte-testing-library/intro)
