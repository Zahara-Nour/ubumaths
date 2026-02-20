# Debug : Prefilled math blanks n'affichent pas le groupement de chiffres francais en mode interactif

## Statut : RESOLU (commit dca355da)

## Probleme

Dans un exercice fill-in-the-blanks, quand un blank math a une valeur `prefilled` (ex: "12345"), le groupement de chiffres francais (espaces fines entre groupes de 3 chiffres) s'affiche correctement en **flash mode** mais PAS en **mode interactif**.

- **Flash mode** : "12 345" (correct, avec espace fine)
- **Mode interactif** : "12345" (incorrect, pas d'espace)

## Cause racine

Les composants parents (FlashCard, QuestionCard, QuestionSlide) initialisaient `fillBlankValues` avec la valeur brute de `b.prefilled` (ex: `'6168'`), sans appliquer `toFrenchDecimal`.

```typescript
// AVANT (bug) - FlashCard.svelte:125
fillBlankValues = instance.blanks.map((b) => b.prefilled ?? '');
```

Cette valeur brute ecrasait la valeur formatee de `buildInputStates` (ex: `'6\\,168'`) via le pattern `values[i] ?? s.value` dans `FillBlanksInput.inputStates` (ligne 179).

### Chaine causale complete

1. `buildInputStates(blanks)` cree `s.value = '6\\,168'` (avec `toFrenchDecimal`) - CORRECT
2. FlashCard `$effect` set `fillBlankValues[0] = '6168'` (brut, sans formatage) - BUG ICI
3. `FillBlanksInput.inputStates` derive : `values[0] = '6168'` (non-null) ecrase `s.value = '6\\,168'`
4. MathPrompt `$effect` recoit `'6168'` -> pas de groupement de chiffres

### Pourquoi les tentatives precedentes echouaient

Les corrections dans `buildInputStates` (tentative 1) et `MathPrompt` (tentatives 2-3) etaient correctes en isolation, mais la valeur formatee etait systematiquement ecrasee par `fillBlankValues` du parent avant d'arriver au rendu.

## Fix (commit dca355da)

Appliquer `toFrenchDecimal` pour les blanks math lors de l'initialisation de `fillBlankValues` dans les 3 composants parents :

```typescript
// APRES (fix)
fillBlankValues = instance.blanks.map((b) =>
	b.prefilled ? (b.type === 'math' ? toFrenchDecimal(b.prefilled) : b.prefilled) : ''
);
```

### Fichiers modifies

| Fichier                                            | Modification                                   |
| -------------------------------------------------- | ---------------------------------------------- |
| `src/lib/components/questions/FlashCard.svelte`    | Import `toFrenchDecimal` + formatage prefilled |
| `src/lib/components/questions/QuestionCard.svelte` | Idem                                           |
| `src/lib/slides/core/QuestionSlide.svelte`         | Idem                                           |

## Methode de debug

### Pistes explorees avec console.log

**Piste A (le $effect tourne-t-il ?)** : OUI, le $effect tourne correctement. Le premier run utilise la bonne valeur formatee. Mais un re-run subsequent recoit la valeur brute (ecrasee par le parent).

**Piste D (MathLive preserve-t-il `\,` ?)** : OUI, le round-trip `setPromptValue` -> `getPromptValue` preserve `\,` parfaitement. MathLive n'est pas en cause.

**Decouverte cle** : `handleInput` et `handleInputChange` ne sont JAMAIS appeles. Ce n'est pas un event MathLive qui ecrase la valeur, c'est l'initialisation du parent (`fillBlankValues = instance.blanks.map((b) => b.prefilled ?? '')`) qui le fait via le pattern `values[i] ?? s.value`.

## Tentatives precedentes (pour reference)

### 1. `toFrenchDecimal` dans `buildInputStates` (commit e80a4842)

- Correct mais insuffisant : la valeur est ecrasee par le parent

### 2. Guard maison `settingPromptValues` + `queueMicrotask`

- Inutile : `handleInput` ne se declenche pas du tout

### 3. `silenceNotifications: true` natif MathLive (commit d6088b4e)

- Fonctionne pour son objectif (pas d'events MathLive) mais ne resout pas le vrai probleme

## Architecture a retenir

```
FlashCard/QuestionCard/QuestionSlide
  └─ fillBlankValues[] = [valeur brute]     ← doit appliquer toFrenchDecimal ici
      └─ FillBlanksInput (bind:values)
          └─ inputStates = buildInputStates() + values[i] ?? s.value
              └─ ParagraphNode (inputs={inputStates})
                  └─ MathPrompt (inputs filtered by type)
                      └─ $effect → setPromptValue(value)
```

Le pattern `values[i] ?? s.value` signifie que toute valeur non-null dans `values[]` ecrase la valeur calculee par `buildInputStates`. Il faut donc que `values[]` soit initialise avec des valeurs deja formatees.
