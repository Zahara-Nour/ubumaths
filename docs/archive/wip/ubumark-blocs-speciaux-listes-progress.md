# Blocs spéciaux dans les items de liste (Q66 en liste)

Branche `fix/ubumark-blocs-speciaux-listes`, suite de #645 (2026-10-02).

- `swallowsForeignBlock` / `textWithUnclosedBlocks` (markdown-parser.ts) reconnaissent aussi
  ``variation / probtree / trig / line (`SPECIAL_BLOCK_KINDS`, `specialBlockFromLines`) : dans une
liste, un `` lointain ne ferme plus un de ces blocs séparé par du texte (comme Q52 pour courbe /
  figure / statistiques) ; un bloc non fermé sans ``` plus loin devient un nœud (Q63), plus du texte brut.
- Revue : repli « source » avec formules exactement écrites (`restoreRawMath`, Q62) ; tests qui
  vérifient le bloc produit.
- Mesure prod : 485 contenus réels, 0 changement, 0 boucle.
- Limite (préexistante) : un ```line FERMÉ dans une liste reste un bloc de code (pas de branche
`line`dans`parseContentWithCodeBlocks`) ; non fermé, il devient une droite graduée.
