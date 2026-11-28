---
title: Lot d'outils equation-lignes — résoudre une équation ligne par ligne (outil 55)
date: 2026-11-28
status: clos — outil 55 livré (#3292)
---

# Lot `equation-lignes` (outil 55)

## Reprendre ici

_Mis à jour le 2026-11-28, après #3292._

- **État** : lot clos, outil 55 livré par #3292 (mergée), journal archivé · **Prochaine action** :
  aucune ; les modèles qui se servent de la case `resolution` vont aux sessions « questions » /
  « idées » · **En attente de David** : rien · **Pièges** : `read-only="false"` laisse MathLive
  en lecture seule ; `onbeforeinput` de Svelte est délégué (écouteur natif nécessaire).

## Outil 55 — phase 0 (2026-11-28)

Source : `outils-manquants.md` n° 55 ; idée venue de `idees-3e-calcul-litteral` (3L13, 3L13-1,
3L13-2), points 4-024 et 4-025. Aucune décision détaillée de David écrite avant ce journal.

### Ce que verrait l'élève

L'énoncé donne l'équation. Sous elle, la case : une première ligne vide, un bouton « Ajouter une
ligne » (et Entrée passe à la ligne suivante), une croix pour retirer une ligne.

> Résous : 3x − 5 = 7
>
> 3x = 12
> x = 4

### Comment c'est jugé

- Chaque ligne est comparée à la précédente (la première à l'équation de l'énoncé) : elles doivent
  avoir **les mêmes solutions**. `3x = 12` → `x = 4` : juste. `6x = 24` aussi.
- La dernière ligne doit être **x = valeur**, valeur simplifiée (fraction irréductible ; décimal
  exact accepté si le modèle le dit, comme une case ordinaire).
- **Nominal** : 3x − 5 = 7 → 3x = 12 → x = 4 : juste.
- **Limite** : … → x = 12/3 : lignes justes, dernière non simplifiée → ½ (« à simplifier »), comme
  ailleurs. Une ligne recopiée sans changement : acceptée (elle ne change pas les solutions).
- **Erreur** : 3x − 5 = 7 → 3x = 2 → x = 2/3 : la ligne 1 est marquée fausse (« cette ligne n'a
  pas les mêmes solutions que la précédente »), la réponse est fausse. Ligne illisible ou sans
  signe = : marquée « je ne peux pas lire cette ligne », réponse fausse. Rien écrit : vide.
- À la correction, chaque ligne porte ✓ ou ✗ ; la correction modèle montre les étapes que mathAST
  sait déjà écrire (`pedagogical-solve`, équations du premier degré).

Portée : équations du premier degré en x à une solution (3L13, 3L13-1, y compris
k(ax + b) = cx + d) et équations de proportion (x/4 = 3/5, 4/x = 5/3).

### Syntaxe d'auteur proposée

Une nouvelle nature de case, comme `intervalles` ou `equation` :

```python
{'answerKind': 'resolution', 'equation': '{{a}}x+{{b}}={{c}}'}   # réponse attendue : x={{s}}
```

### Réponses de David (2026-11-28)

David a répondu « je te suis » aux quatre questions ci-dessous, chacune avec ma recommandation :

1. ligne fausse au milieu → réponse fausse ; 2. `x = 4` seul → juste, réglage `minLines` pour
   exiger des étapes ; 3. marques ✓ / ✗ seulement à la validation ; 4. nom `resolution`.

### Questions posées

1. **Ligne fausse au milieu, dernière ligne juste** (deux erreurs qui se compensent) : réponse
   fausse (je recommande : c'est la méthode qu'on juge) ou ½ ?
2. **L'élève écrit seulement `x = 4`**, sans étape : juste (je recommande, avec un réglage du
   modèle « au moins N lignes » pour exiger des étapes) ou toujours au moins une étape ?
3. **Coche à chaque ligne pendant la saisie**, ou seulement à la validation (je recommande : comme
   les autres cases ; en évaluation, une coche en direct donnerait la réponse) ?
4. **Nom** de la nature de case : `resolution` ?

## Historique

### 2026-11-28 — ouverture

Lot réservé par `pnpm outils lancer` (c825324f80). Outil vérifié absent : `AnswerKind` =
intervalles, equation, vecteur, matrice, primitive, solution-ed ; rien à plusieurs lignes.

### 2026-11-28 — outil 55 codé

- Juge pur `questions/resolution/resolution-answer.ts` (ensembles de solutions du solveur de
  mathAST, ligne par ligne) ; lignes ↔ valeur de la case dans `resolution-lines.ts` (séparateur
  `\\`).
- Branché : `AnswerKind`, schéma (`minLines` 1 à 20), générateur (champs `equation`, `variable`,
  `minLines`, comme `solution-ed`), validateur (AVANT la garde de complexité, le juge mesure
  chaque ligne), barème serveur, lanceur de specs (`readExpectedResolution`), éditeur de modèle
  (case « équation résolue ligne par ligne », sinon l'éditeur effaçait la nature à
  l'enregistrement).
- Écran : `ResolutionInput.svelte`, monté par `FillBlanksInput` pour une case seule dans
  `$$?$$`. Exemple dans `/dev/carte-question?question=resolution`.
- Corrigé : l'attendue `x = 4` ; les étapes, par le mode B existant (`linear-equation`).

### 2026-11-28 — revue `code-reviewer` (opus), corrections

- Bloquant, coût : `(x+1)^{999}=…` coûtait des secondes au solveur, `((x+1)^{10})^{10}…`
  épuisait la mémoire → garde avant le solveur (exposant entier écrit ≤ 10, degré écrit ≤ 20),
  et arrêt à la première ligne fausse (les suivantes restent sans marque).
- Bloquant, valeur finale : comparée à elle-même, `x = 8-4` ou `x = 0,5` (sans `acceptDecimal`)
  passaient → jugée contre le membre droit de l'attendue avec les réglages de la case.
- `minLines` contourné par une conclusion ou l'énoncé recopiés → ne comptent plus.
- « Première case vide » ne trouvait pas la case : `data-resolution-focus` posé.
- `x = 12/3 = 4` : message « écris une seule égalité par ligne ».
- Séparateur : barre oblique seule en fin de ligne retirée.
- Laissé : `\left(x\right) = 4` refusé comme conclusion (rare).
