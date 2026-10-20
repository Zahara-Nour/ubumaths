# 0031 — Le parseur maison est une langue interne, lue comme le BIPM

- **Statut** : acceptée — mise en œuvre close le 2026-10-21 (#1555, #1557, #1558, #1560, #1561,
  #1562, #1565 ; phase 0, corpus, sondes et journal : `docs/archive/wip/lecture-grandeurs-*.md`)
- **Date** : 2026-10-20 · **Décidée par** : David (phase 0 et pages à cocher : grandeurs 81/81,
  virgule 31/31)

## Contexte

`1/2[m]` se lisait 1/(2[m]) = 0,5 m⁻¹ dans les deux parseurs, alors que `\frac{1}{2}\unit{m}` vaut
0,5 m et que l'atelier lit `1/2 m` = (1/2) m. Le parseur maison tolérait aussi la virgule décimale
depuis son premier commit, sans décision écrite : elle a coûté `mod(16,4)` = mod(16.4) (153 tirages
faux sur 1 050). `pi` nu était réécrit en `\pi` par une tolérance de `{{eval}}` (`BARE_PI`). Les
refus rendaient presque tous `UNEXPECTED_TOKEN`, et l'atelier traduisait le texte anglais.

Un parseur maison « en français » (virgule décimale, `;` séparateur) a été écarté : ~23 000
expressions de prod à migrer, 68 virgules séparatrices entre chiffres (`max(-9,1-a*b)`) qui
changeraient de sens en silence, et `;` déjà pris par les modificateurs des modèles et les en-têtes
de blocs.

## Décision

La syntaxe maison est la **langue interne** du moteur, lue selon la brochure SI (BIPM) :
**l'unité multiplie tout le terme qui la précède** ; `×`, `·`, `⋅` = `*` ; **point décimal seul,
virgule toujours séparatrice, `;` refusé** ; lettres grecques avec antislash (`pi` = p × i, `π` et
`\pi` = la constante) ; durées juxtaposées (`2[h] 30[min]`) = une somme marquée, les autres grandeurs
juxtaposées refusées. Chaque refus porte un **code précis** ; l'atelier traduit par code.

Le français (virgule décimale, « ; ») est traduit **avant** le parseur, par qui le reçoit : l'atelier,
la saisie de l'élève ; les textes déjà rangés (atelier) et les chaînes du DSL géométrie gardent
l'ancienne lecture (`legacyDecimalCommas`).

## Conséquences

- Contenus en base réécrits au point et à l'antislash avant la mise en prod
  (`scripts/reecrire-pi-nu-base.ts`, `scripts/reecrire-virgule-decimale-base.ts`).
- L'atelier garde `2 m 30 cm` = 2,3 m (somme), le parseur refuse `2[m] 30[cm]` ; pas d'unités ′ et ″
  (`′` sert de prime).
- Détail du code : [mathast/README.md](../systeme/mathast/README.md) (parseurs),
  [grandeurs.md](../systeme/grandeurs.md), [notation-unites.md](../pratiques/notation-unites.md).
