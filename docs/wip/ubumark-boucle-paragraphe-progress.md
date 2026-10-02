# Boucle infinie du repli « paragraphe » (Q55)

Branche `fix/ubumark-boucle-paragraphe`. Décision Q55 (2026-10-02), trouvé en mesurant #620.

- `parseBlocks` (`markdown-parser.ts`) : la première ligne du repli « paragraphe » est toujours
  consommée. Avant, une ligne qu'aucun bloc ne prenait mais qui passait un garde d'arrêt (`| a |`
  sans ligne d'alignement, ``` indenté, code de liste avec tabulation) n'était jamais consommée →
  boucle sans fin (onglet figé, PDF bloqué).
- Preuve rouge : la suite BLOQUE sans le correctif (boucle synchrone, > 25 s).
- Empreinte : 642 .md suivis ; 635 lus par main → AST identiques ; les 7 qui bouclaient se lisent
  (le plus lent : 42 ms).
- Revue : aucun bug ; assertions des tests portées sur la valeur ; condition morte retirée.
- Suite possible (non traitée) : une fence indentée hors liste s'affiche en texte (backticks
  visibles) au lieu d'un bloc de code — `isCodeFence` rogne, la détection des blocs non.
