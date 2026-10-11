# Fences indentées hors d'une liste (Q56-Q59)

Branche `fix/ubumark-fences-indentees`. Décisions Q56-Q58 (2026-10-02), Q59 après la 1re revue.

- `dedentIndentedFences` (`parser/indented-fences.ts`), PRÉ-PASSAGE dans `parseMarkdown` avant
  `extractMath` : un bloc indenté de 1 à 3 espaces, fermé par une fence elle aussi indentée (Q59),
  sans ligne à la marge entre les deux, est ramené à la marge ; le parseur le lit comme un bloc à
  la marge d'aujourd'hui. Jamais : listes, code d'un bloc à la marge, blocs spéciaux (Q58), bloc
  non fermé (Q57), backtick dans l'info d'une fence en backticks.
- ⚠️ L'extraction des formules ignore les blocs de code (défaut PRÉEXISTANT à la marge : un `$$`
  de SQL décale l'appariement par rang des blocs). Gardes : seuls les blocs AVANT la première
  formule bloc multiligne sont ramenés ; jamais si l'extraction modifie l'ouvrante ou la fermante.
- 3 revues : v1 (règle dans `findCodeBlocks`) avalait du texte (5 cas) → pré-passage ; v2 : `$$`
  multiligne, liste scindée, perf quadratique → gardes ; v3 : `~~~ a~`, perf de la fermante,
  backtick dans l'info → corrigés. Tous les cas sont des tests, preuves rouges faites.
- Empreinte : 643 .md du dépôt, 0 AST changé.
