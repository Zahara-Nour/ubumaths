# Test-Driven Development (TDD)

Guide pour le TDD collaboratif dans UbuMaths.

## Pourquoi le TDD ?

### Le probleme des tests traditionnels

Les tests ecrits **apres** le code testent **ce que le code fait**, pas **ce qu'il devrait faire**. Il n'y a aucune garantie que les comportements implementes correspondent aux attentes metier.

### L'approche TDD

Le TDD inverse le processus : on definit d'abord les comportements attendus (tests), puis on ecrit le code qui les satisfait.

```
Traditionnel : Code -> Tests -> "Ca marche"
TDD         : Specs -> Tests -> Code -> "Ca fait ce qu'on veut"
```

---

## Le Cycle TDD

### RED - GREEN - REFACTOR

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌─────────┐     ┌─────────┐     ┌───────────┐           │
│    │   RED   │ --> │  GREEN  │ --> │ REFACTOR  │ ──┐       │
│    │         │     │         │     │           │   │       │
│    │ Ecrire  │     │ Ecrire  │     │ Ameliorer │   │       │
│    │ test    │     │ code    │     │ code      │   │       │
│    │ qui     │     │ minimal │     │ sans      │   │       │
│    │ echoue  │     │ qui     │     │ casser    │   │       │
│    │         │     │ passe   │     │ tests     │   │       │
│    └─────────┘     └─────────┘     └───────────┘   │       │
│         ^                                          │       │
│         └──────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Phase        | Action                                              | Resultat attendu     |
| ------------ | --------------------------------------------------- | -------------------- |
| **RED**      | Ecrire un test qui decrit le comportement voulu     | Test echoue (rouge)  |
| **GREEN**    | Ecrire le minimum de code pour faire passer le test | Test passe (vert)    |
| **REFACTOR** | Ameliorer le code sans changer le comportement      | Tests toujours verts |

---

## TDD Collaboratif (Workflow UbuMaths)

### Vue d'ensemble

Le TDD dans ce projet est **collaboratif** : Claude propose les comportements, l'utilisateur valide/corrige avant l'implementation.

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD COLLABORATIF                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ETAPE 1: Claude propose les comportements en francais     │
│           ↓                                                 │
│  ETAPE 2: Utilisateur valide / corrige / complete          │
│           ↓                                                 │
│  ETAPE 3: Claude ecrit les tests (code)                    │
│           ↓                                                 │
│  ETAPE 4: Claude implemente le code                        │
│           ↓                                                 │
│  ETAPE 5: Tests passent = comportement conforme            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Etape 1 : Proposition des comportements

Claude decrit les comportements attendus **en francais**, de maniere claire et non technique :

```markdown
## Fonctionnalite : Attribution des gidouilles

### Comportements proposes :

1. **Bonne reponse** : L'eleve gagne 10 gidouilles
2. **Mauvaise reponse** : L'eleve ne perd rien (0 gidouilles)
3. **Reponse rapide** : Si reponse en moins de 5 secondes, bonus de 5 gidouilles
4. **Limite maximum** : Un eleve ne peut pas depasser 1000 gidouilles
5. **Limite minimum** : Les gidouilles ne peuvent pas etre negatives

### Questions :

- Le bonus de rapidite s'applique-t-il aussi aux mauvaises reponses ?
- Y a-t-il des cas speciaux (exercices difficiles, etc.) ?
```

### Etape 2 : Validation utilisateur

L'utilisateur corrige les comportements proposes :

```markdown
Corrections :

- Point 2 : Non, l'eleve PERD 2 gidouilles pour une mauvaise reponse
- Point 3 : Le bonus est de 3 gidouilles, pas 5
- Nouveau : Les exercices de niveau "difficile" donnent le double de gidouilles

Reponses :

- Le bonus de rapidite ne s'applique qu'aux bonnes reponses
- Pas d'autres cas speciaux pour l'instant
```

### Etape 3 : Ecriture des tests

Apres validation, Claude ecrit les tests qui correspondent **exactement** aux regles validees :

```typescript
// src/lib/utils/gidouilles.test.ts
import { describe, it, expect } from 'vitest';
import { calculerGidouilles } from './gidouilles';

describe('calculerGidouilles', () => {
	describe('reponse correcte', () => {
		it('ajoute 10 gidouilles pour une bonne reponse', () => {
			const result = calculerGidouilles({
				correct: true,
				gidouillesActuelles: 50,
				tempsReponse: 10000, // 10 secondes
				difficulte: 'normal'
			});
			expect(result).toBe(60);
		});

		it('ajoute 3 gidouilles bonus si reponse en moins de 5 secondes', () => {
			const result = calculerGidouilles({
				correct: true,
				gidouillesActuelles: 50,
				tempsReponse: 3000, // 3 secondes
				difficulte: 'normal'
			});
			expect(result).toBe(63); // 50 + 10 + 3
		});

		it('double les gidouilles pour les exercices difficiles', () => {
			const result = calculerGidouilles({
				correct: true,
				gidouillesActuelles: 50,
				tempsReponse: 10000,
				difficulte: 'difficile'
			});
			expect(result).toBe(70); // 50 + (10 * 2)
		});
	});

	describe('reponse incorrecte', () => {
		it('retire 2 gidouilles pour une mauvaise reponse', () => {
			const result = calculerGidouilles({
				correct: false,
				gidouillesActuelles: 50,
				tempsReponse: 10000,
				difficulte: 'normal'
			});
			expect(result).toBe(48);
		});

		it('ne donne pas de bonus de rapidite pour une mauvaise reponse', () => {
			const result = calculerGidouilles({
				correct: false,
				gidouillesActuelles: 50,
				tempsReponse: 2000, // Tres rapide mais faux
				difficulte: 'normal'
			});
			expect(result).toBe(48); // Pas de bonus
		});
	});

	describe('limites', () => {
		it('ne depasse jamais 1000 gidouilles', () => {
			const result = calculerGidouilles({
				correct: true,
				gidouillesActuelles: 995,
				tempsReponse: 2000,
				difficulte: 'normal'
			});
			expect(result).toBe(1000); // Plafonne a 1000
		});

		it('ne descend jamais en dessous de 0', () => {
			const result = calculerGidouilles({
				correct: false,
				gidouillesActuelles: 1,
				tempsReponse: 10000,
				difficulte: 'normal'
			});
			expect(result).toBe(0); // Pas negatif
		});
	});
});
```

### Etape 4 : Implementation

Claude ecrit le code qui fait passer tous les tests :

```typescript
// src/lib/utils/gidouilles.ts
interface CalculGidouillesParams {
	correct: boolean;
	gidouillesActuelles: number;
	tempsReponse: number; // en millisecondes
	difficulte: 'facile' | 'normal' | 'difficile';
}

const GAIN_BASE = 10;
const PERTE_BASE = 2;
const BONUS_RAPIDITE = 3;
const SEUIL_RAPIDITE = 5000; // 5 secondes
const MAX_GIDOUILLES = 1000;
const MIN_GIDOUILLES = 0;

export function calculerGidouilles(params: CalculGidouillesParams): number {
	const { correct, gidouillesActuelles, tempsReponse, difficulte } = params;

	let delta = 0;

	if (correct) {
		// Gain de base
		delta = GAIN_BASE;

		// Multiplicateur difficulte
		if (difficulte === 'difficile') {
			delta *= 2;
		}

		// Bonus rapidite (uniquement si correct)
		if (tempsReponse < SEUIL_RAPIDITE) {
			delta += BONUS_RAPIDITE;
		}
	} else {
		// Perte pour mauvaise reponse
		delta = -PERTE_BASE;
	}

	// Appliquer les limites
	const nouveau = gidouillesActuelles + delta;
	return Math.max(MIN_GIDOUILLES, Math.min(MAX_GIDOUILLES, nouveau));
}
```

---

## Format de Proposition des Comportements

### Template standard

```markdown
## Fonctionnalite : [Nom de la fonctionnalite]

### Contexte

[Description breve du contexte et de l'objectif]

### Comportements proposes

#### Cas nominal

1. [Comportement principal attendu]
2. [Autre comportement normal]

#### Cas limites

3. [Que se passe-t-il si X est vide ?]
4. [Que se passe-t-il si Y depasse Z ?]

#### Cas d'erreur

5. [Que se passe-t-il si l'entree est invalide ?]
6. [Que se passe-t-il si la DB echoue ?]

### Questions pour clarification

- [Question 1 ?]
- [Question 2 ?]

### Hypotheses (a confirmer)

- [Hypothese 1]
- [Hypothese 2]
```

### Exemple complet

```markdown
## Fonctionnalite : Inscription d'un eleve a une classe

### Contexte

Un eleve peut rejoindre une classe en utilisant un code d'invitation.

### Comportements proposes

#### Cas nominal

1. L'eleve entre un code valide et rejoint la classe
2. L'eleve apparait dans la liste des membres de la classe
3. L'eleve voit la classe dans son tableau de bord

#### Cas limites

4. Si l'eleve est deja membre de la classe, afficher "Vous etes deja inscrit"
5. Si la classe est pleine (max 35 eleves), refuser l'inscription

#### Cas d'erreur

6. Code invalide : afficher "Code incorrect"
7. Code expire : afficher "Ce code n'est plus valide"
8. Classe archivee : afficher "Cette classe n'accepte plus d'inscriptions"

### Questions pour clarification

- Y a-t-il une limite de classes par eleve ?
- Un professeur peut-il exclure un eleve ?

### Hypotheses (a confirmer)

- Le code est insensible a la casse (ABC123 = abc123)
- L'eleve recoit une notification apres inscription
```

---

## Bonnes Pratiques TDD

### 1. Un test = Un comportement

```typescript
// BON : Un comportement par test
it('ajoute 10 gidouilles pour une bonne reponse', () => {
	expect(calculer({ correct: true, actuel: 50 })).toBe(60);
});

it('retire 2 gidouilles pour une mauvaise reponse', () => {
	expect(calculer({ correct: false, actuel: 50 })).toBe(48);
});

// MAUVAIS : Plusieurs comportements melanges
it('gere les gidouilles', () => {
	expect(calculer({ correct: true, actuel: 50 })).toBe(60);
	expect(calculer({ correct: false, actuel: 50 })).toBe(48);
	expect(calculer({ correct: true, actuel: 999 })).toBe(1000);
});
```

### 2. Noms de tests descriptifs (en francais acceptable)

```typescript
// BON : Decrit le comportement metier
it('refuse l inscription si la classe est pleine', () => {});
it('envoie un email de confirmation apres inscription', () => {});

// MAUVAIS : Trop technique ou vague
it('returns false', () => {});
it('handles edge case', () => {});
```

### 3. Tester les cas limites

```typescript
describe('limites', () => {
	it('gere une liste vide', () => {});
	it('gere un seul element', () => {});
	it('gere le maximum autorise', () => {});
	it('gere les valeurs negatives', () => {});
	it('gere les caracteres speciaux', () => {});
});
```

### 4. Tester les erreurs explicitement

```typescript
describe('erreurs', () => {
	it('rejette un UUID invalide', () => {
		expect(() => inscrireEleve('pas-un-uuid')).toThrow('UUID invalide');
	});

	it('retourne 404 si la classe n existe pas', async () => {
		const response = await rejoindreClasse('CODE-INEXISTANT');
		expect(response.status).toBe(404);
	});
});
```

---

## Integration dans les Plans

### Chaque plan de fonctionnalite doit inclure

```markdown
## Plan : [Nom de la fonctionnalite]

### Phase 0 : Specification TDD (OBLIGATOIRE)

#### 0.1 Proposition des comportements

- Claude propose les comportements attendus en francais
- Format : liste numerotee avec cas nominaux, limites, erreurs

#### 0.2 Validation utilisateur

- L'utilisateur valide, corrige ou complete les comportements
- AUCUN code n'est ecrit avant cette validation

#### 0.3 Ecriture des tests

- Claude ecrit les tests correspondant aux comportements valides
- Les tests DOIVENT echouer (RED)

### Phase 1 : Implementation

- Ecrire le code qui fait passer les tests (GREEN)
- Refactorer si necessaire (REFACTOR)

### Phase 2 : Review et Commit

- Code review
- Commit
```

---

## Quand utiliser le TDD

### Ideal pour

| Type de code   | Pourquoi                   |
| -------------- | -------------------------- |
| Logique metier | Regles complexes, calculs  |
| Validations    | Cas limites nombreux       |
| API endpoints  | Comportements bien definis |
| Utilitaires    | Fonctions pures, testables |
| Refactoring    | Filet de securite          |

### Moins adapte pour

| Type de code        | Alternative               |
| ------------------- | ------------------------- |
| Prototypage rapide  | Tests apres stabilisation |
| UI exploratoire     | Tests visuels / Storybook |
| Integration externe | Tests d'integration       |

---

## Commandes utiles

```bash
# Lancer un test specifique en watch mode (TDD)
pnpm test:server src/lib/utils/gidouilles.test.ts

# Voir les tests echouer (RED)
# Implementer le code
# Voir les tests passer (GREEN)
```

---

## Audit TDD

### Objectif

L'audit TDD permet de verifier que les tests existants correspondent aux regles metier attendues. Les tests ecrits **apres** le code peuvent tester ce que le code fait, mais pas necessairement ce qu'il **devrait** faire.

### Processus d'audit

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT D'UN DOMAINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Claude presente les comportements actuellement testes   │
│     Format : liste en francais des "regles" testees         │
│                                                             │
│  2. Utilisateur valide / corrige / complete                 │
│     "V" = Valide                                            │
│     "I : [raison]" = Invalide (a corriger)                  │
│     "D : [question]" = Demande de details                   │
│                                                             │
│  3. Claude identifie les tests a modifier/ajouter           │
│     Liste des changements necessaires                       │
│                                                             │
│  4. Implementation des corrections                          │
│     Modifier tests existants + ajouter nouveaux             │
│                                                             │
│  5. Validation finale                                       │
│     Tous les tests passent avec les bonnes regles           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Fichiers de suivi

| Fichier                                 | Contenu                                    |
| --------------------------------------- | ------------------------------------------ |
| `docs/wip/tdd-audit-tracker.md`         | Liste des domaines a auditer, statistiques |
| `docs/wip/audit-<domaine>-behaviors.md` | Detail des comportements par domaine       |

### Domaines audites

| #   | Domaine          | Status    | Comportements                 |
| --- | ---------------- | --------- | ----------------------------- |
| 24  | Authentification | ✅ Valide | 62/62 (60 valides, 2 etendus) |

### Lancer un audit

Pour lancer un audit, utiliser :

```
"On commence l'audit TDD du domaine [X]"
```

Claude :

1. Lit les fichiers de test du domaine
2. Extrait les comportements testes
3. Presente la liste en francais avec descriptions detaillees
4. Attend la validation (V/I/D) pour chaque comportement
5. Implemente les corrections necessaires

---

## Voir aussi

- [patterns.md](./patterns.md) - Patterns de tests
- [mocking.md](./mocking.md) - Strategies de mock
- [utilities.md](./utilities.md) - Helpers de test
