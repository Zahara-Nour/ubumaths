# Les formules ne sont plus extraites des blocs (Q60-Q61)

Branche `fix/ubumark-formules-hors-code`. Décisions Q60-Q61 (2026-10-02), défaut mis au jour par #630.

- `extractMathOutside` (`math-extractor.ts`) + `blockLineRanges` (`markdown-parser.ts`) : les
  lignes des blocs FERMÉS que le parseur lit lui-même (code, ``courbe, figure, statistiques,
variation, probtree, trig, line) ne passent plus par l'extraction des formules ; chaque morceau
hors bloc est extrait seul (Q61 : un `$$` qui enjamberait un bloc reste du texte). Un bloc non
fermé n'est pas protégé (revue : sinon un `` dans une formule multiligne changeait la suite en code).
- variation/probtree/trig/line repérés ET lus sur `lines` : une formule multiligne placée avant les
  décalait (tableau rendu en bloc de code).
- Empreinte : 644 .md ; 2 guides SQL retrouvent ~70 paragraphes, titres, listes et blocs avalés ;
  1 renumérotation interne d'une formule déjà mal découpée (`x§M:0§` → `x§M:1§`), rien de visible.
- Préexistant, hors champ : code d'un bloc indenté dans une liste qui fuit `§M:n§` ; ```variation
non fermé suivi de texte → document vide ; garde `firstMultilineMathLine`de #630 désormais trop
prudente (compte un`$$` situé dans du code).
