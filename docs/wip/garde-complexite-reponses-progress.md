# Garde de complexité des réponses (Q58) — suivi

Worktree `../ubumaths-wt-garde` · branche `fix/garde-complexite-reponses` · 2026-10-01.

## Décision (David, Q58)

Limiter la complexité d'une réponse d'élève AVANT de la corriger, sur les cases ordinaires.
Au-delà : `incorrect` (0 point) + « Réponse trop complexe pour être corrigée : simplifie ton écriture. »

## Fait

- `src/lib/questions/answer-complexity.ts` : mesure sans parse (longueur, profondeur
  d'imbrication avec `\sqrt`/`\frac`/puissances même sans accolades, chiffres d'exposant).
- Câblage `answer-validator.ts` : `validateSingleBlank` (réponse ET LaTeX), `validateBlankValue`,
  `validateBlanksOrderIndependent` → couvre `validateAnswer`, `isBlankValueCorrect`,
  `blankStatuses`, `gradeQuestion`. Cases `intervalles` : garde propre, inchangée.
- Nombre de cases : déjà borné (réponses ≠ cases → `incorrect`).
- `incorrect` plutôt qu'`empty` : une case vide minoritaire vaut ½, et le message « rien répondu »
  serait faux.

## Mesures

Corpus du dépôt (`docs/relecture` 632 + `scripts/questions` 33 ; 8 tirages par variation + specs) :
18 609 réponses ; max longueur 103, profondeur 3, chiffres d'exposant 2 (`10^{16}`).
Limites : 400 / 9 / 4. Modèles en base NON rejoués (lecture prod refusée à l'agent).

Avant → après (`gradeQuestion`) : `\sqrt` ×12 110 ms → < 1 ms ; ×14 à ×60 500 ms → < 1 ms ;
`2^{9999999}` 747 ms → < 1 ms ; `\sqrt{2^{9999999}}` 747 ms → < 1 ms ; 20 questions hostiles
14,96 s → < 50 ms.

## Reste ouvert (à trancher par David)

Écritures courtes mais coûteuses SOUS les limites, bornées seulement par le budget de 500 ms de
`isAnswerMatch` (dépassé par des opérations non interruptibles) : `(x+y+z+1)^{30}` ~710 ms,
`\left(1.0001^{99}\right)^{99}` ~820 ms, `1.0001^{9999}` ~1,2 s, `(x+1)^{9999}` ~500 ms.
