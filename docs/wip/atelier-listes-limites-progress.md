# Limites des listes de l'atelier (Q48-Q51)

Branche `fix/atelier-listes-limites`. Décisions Q48-Q51 (2026-10-02), suites de Q45/Q46.

- Q48 : la partenaire choisie est gardée par l'atelier (`partnerChoiceOf`, `choosePartner`), hors
  de `serialize()` comme les diagrammes ; elle suit un renommage, disparaît avec la liste supprimée.
- Q49 : `1/2,3/4` → « Sépare tes valeurs par des points-virgules : 1/2 ; 3/4 » ; un mélange
  (`1,5/2`) ne déclenche pas le message.
- Q50 : `readListValue` lit `+1/6` et le vrai signe moins (−) ; `readNumber` inchangé.
- Q51 : la Loi nomme la première valeur sans fraction simple (plafond 10 000 gardé).

Tests : `list-limits.test.ts` (13), `ObjectPanel.svelte.test.ts` (renommage de la partenaire).

## Revue (code-reviewer)

- Corrigé : la détection des virgules ignorait le vrai signe moins (`−1,−2` écarté sans message ;
  `−3,14` aurait été découpé si une seule des deux lectures avait changé) → `readListValue` partout.
- Corrigé : la Loi nomme la valeur comme l'élève l'a tapée (`1/10007`), plus son décimal.
- Accepté : `1/0,2/3` écarté sans message (fraction illisible, cohérent avec Q49).

Vérifs : 490 tests serveur `src/lib/atelier`, 63 client atelier, `check:incremental` 0, eslint, `lint:fast`.
