# Prompt de continuation — Phase 7 : Dictionnaire vocabulaire FR

## Contexte

On redessine le systeme fill-in-blanks d'UbuMaths. Les phases 1-6 sont terminees :

- **Phase 1** (COMPLETE) : Types TypeScript
- **Phase 2** (COMPLETE) : Parser ubumark + assignBlankIndices
- **Phase 3** (COMPLETE) : Pipeline de generation
- **Phase 4** (COMPLETE) : Validation per-blank
- **Phase 5** (COMPLETE) : Transformer de migration
- **Phase 6** (COMPLETE) : Composant FillBlanksInput

**Phase 7 concerne le dictionnaire de vocabulaire mathematique francais**, utilise pour l'autocompletion des trous texte (`BlankInput`) et comme glossaire.

## Documents de reference

- **`docs/wip/fill-in-blanks-redesign.md`** section 4.5 — Architecture du dictionnaire
- **`docs/wip/fill-in-blanks-v2-plan.md`** section Phase 7 — Plan d'implementation
- **`docs/wip/fill-in-blanks-v2-progress.md`** — Etat de progression

## Specification

### Interface `MathTerm`

Definie dans `docs/wip/fill-in-blanks-redesign.md` section 4.5 :

```typescript
import type { GradeCode } from '$lib/types/grades'; // 'CP' | 'CE1' | ... | 'T_COMP' | 'T_STMG'

interface MathTerm {
	term: string; // le mot (ex: "nombre premier")
	tags: string[]; // ['arithmetique', 'divisibilite'] — multi-tags
	definition: string; // markdown, peut contenir du LaTeX ($...$)
	image?: string; // chemin vers une image (optionnel)
	level: GradeCode; // niveau d'introduction (CP, CE1, ..., T_SPE, ...)
	synonyms?: string[]; // termes equivalents (ex: ["nombre de Mersenne"])
}
```

### Fonctions utilitaires

```typescript
getTermsForLevel(level: GradeCode): MathTerm[]     // termes introduits a ce niveau ou avant
getTermsByTag(tag: string): MathTerm[]              // termes avec ce tag
getTermsByTagAndLevel(tag: string, level: GradeCode): MathTerm[] // intersection
getAllTerms(): MathTerm[]                           // liste plate
```

### Couverture thematique

Les termes doivent couvrir les 12 themes des 633 questions :

| Theme            | Questions | Exemples de termes attendus                                 |
| ---------------- | --------- | ----------------------------------------------------------- |
| Entiers          | 228       | pair, impair, multiple, diviseur, quotient, reste, ...      |
| Decimaux         | 83        | dixieme, centieme, partie entiere, partie decimale, ...     |
| Calcul litteral  | 68        | expression, equation, inconnue, developper, factoriser, ... |
| Fractions        | 58        | numerateur, denominateur, fraction irreductible, ...        |
| Grandeurs        | 45        | perimetre, aire, volume, unite, conversion, ...             |
| Fonctions        | 39        | image, antecedent, croissante, decroissante, ...            |
| Relatifs         | 36        | positif, negatif, oppose, valeur absolue, ...               |
| Proportionnalite | 28        | proportionnel, coefficient, tableau, pourcentage, ...       |
| Puissances       | 21        | exposant, base, notation scientifique, ...                  |
| Suites           | 15        | terme, rang, raison, arithmetique, geometrique, ...         |
| Racines carre    | 10        | racine carree, radical, carre parfait, ...                  |
| Probabilites     | 2         | probabilite, experience aleatoire, ...                      |

- termes generaux transversaux (nombre, calcul, resultat, somme, produit, difference, ...)

Objectif : **~200-300 termes** au total.

## Fichier a creer

**`src/lib/data/math-dictionary-fr.ts`**

Structure :

```typescript
import type { GradeCode } from '$lib/types/grades';

export interface MathTerm {
  term: string;
  tags: string[];
  definition: string;
  image?: string;
  level: GradeCode;
  synonyms?: string[];
}

const MATH_DICTIONARY: MathTerm[] = [
  // ~200-300 termes
];

export function getTermsForLevel(level: GradeCode): MathTerm[] { ... }
export function getTermsByTag(tag: string): MathTerm[] { ... }
export function getTermsByTagAndLevel(tag: string, level: GradeCode): MathTerm[] { ... }
export function getAllTerms(): MathTerm[] { ... }

export default MATH_DICTIONARY;
```

## Fichier de test

**`src/lib/data/__tests__/math-dictionary-fr.test.ts`**

Tests a ecrire :

- Pas de doublons (`term` unique)
- Tous les `level` sont des `GradeCode` valides
- Tous les termes ont au moins 1 tag
- Toutes les definitions sont non vides
- `getTermsForLevel('6')` inclut les termes CP→6e mais pas 5e→T
- `getTermsByTag('arithmetique')` retourne des termes
- `getTermsByTagAndLevel('geometrie', '4')` retourne un sous-ensemble de `getTermsByTag('geometrie')`
- `getAllTerms()` retourne tous les termes

## Workflow

1. **Phase 7.1** : Creer l'interface et les fonctions utilitaires (travail direct, Opus)
2. **Phase 7.2** : Generer les ~200-300 termes (Haiku pour les donnees brutes, Opus pour la validation)
3. **Phase 7.3** : Ecrire les tests (travail direct, Opus)
4. **Phase 7.4** : Code review + commit + doc progression

## Regles

1. **`GradeCode` depuis `$lib/types/grades`** — NE PAS redefinir les niveaux
2. **Definitions en markdown** — peuvent contenir `$...$` pour du LaTeX inline
3. **Tags en minuscules sans accents** — ex: `arithmetique`, `geometrie`, `calcul-litteral`
4. **Pas de dependance externe** — donnees statiques embarquees dans le code
5. **Svelte autofixer** non applicable (fichier .ts uniquement)
6. **Documents de progression** dans `docs/wip/fill-in-blanks-v2-progress.md`
