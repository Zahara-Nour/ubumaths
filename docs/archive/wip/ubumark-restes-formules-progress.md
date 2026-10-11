# Restes de la revue de #635 (Q62-Q65)

Branche `fix/ubumark-restes-formules`. Décisions Q62-Q65 (2026-10-02).

- Q62 : le code d'un bloc dans un item de liste affichait `§M:n§` → formules exactement écrites
  (champ `raw` des placeholders, `restoreRawMath`). Limite : un `\$` échappé y devient `$`.
- Q63 : ```variation / probtree / line / trig NON FERMÉ → s'arrête à la 1re ligne vide
(`unclosed-block.ts`) ; avant, variation / probtree / line faisaient disparaître tout le document.
  Les 7 blocs spéciaux sont masqués pour la recherche des blocs de code.
- Q64 : bloc spécial invalide → sa source en bloc de code (premier niveau et listes).
- Q65 : la garde des fences indentées (#630) ignore les `$$` des blocs (`block-ranges.ts`, partagé).
- Revue : un bloc spécial non fermé affichait encore `§M:n§` → protégé lui aussi (borné par Q63) ;
  fin de bloc spécial = ``` seul, comme leurs parseurs (`~~~` passait pour une fin).
- Limite connue : un bloc spécial « non fermé » suivi plus loin d'un ``` nu s'y ferme (règle
  inchangée, seule la fin de document a changé).
- Empreinte : 648 .md, 2 changent (code de listes qui fuyait `§M:n§`, désormais exact).
