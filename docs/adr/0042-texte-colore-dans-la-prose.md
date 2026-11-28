# 0042 — Texte coloré dans la prose : `[texte]{.nom}`, les 12 noms de la palette

- **Statut** : acceptée — phase 0 du chantier `texte-colore` (journal
  [`docs/archive/wip/texte-colore-progress.md`](../archive/wip/texte-colore-progress.md), § 2 ; chantier clos le 2026-11-22)
- **Date** : 2026-11-20 · **Décidée par** : David

## Contexte

Ubumark n'a pas de syntaxe de texte coloré hors formule. Les auteurs écrivent `\textcolor{…}{…}`
dans la prose, que l'élève lit en LaTeX brut (« C'est \textcolor{#FF5722}{le cône}. ») ; seul le
PDF le convertit. La couleur existe ailleurs : dans les formules (`\textcolor` de mathAST), dans
les blocs graphiques (12 noms, `src/lib/theme/named-colors.ts`) et dans l'éditeur riche (perdue à
l'export). Ampleur au 2026-11-02 : 648 occurrences corrigées en 2de, 53 fichiers de lots encore
touchés, beaucoup publiés ; `question:specs` refuse un `\textcolor` hors `$` depuis #2283.

## Décision

| Sujet               | Décision                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Syntaxe             | `C'est [le cône]{.orange}.`, de la famille des détails de correction ([ADR 0017](0017-correction-concise-et-detaillee.md)) et du dictionnaire ; combinable : `[le cône]{.orange .def}`                            |
| Couleurs admises    | Les **12 noms de la palette des figures** (bleu, rouge, vert, orange, violet, jaune, cyan, marron, rose, gris, noir, blanc ; synonymes anglais ramenés au français). Ni hex ni `primary.N`                        |
| Teinte              | Celle de l'objet de même nom dans une figure : `var(--color-fig-<nom>)` à l'écran (thèmes clair et sombre), variante claire (`NAMED_COLOR_PRINT`) au PDF                                                          |
| Couleur tirée       | Permise par une variable : `[le cône]{.{{c}}}`, `c` tirée parmi les noms, pour suivre une figure à couleur tirée                                                                                                  |
| Nom inconnu         | Texte normal pour l'élève, message pour le prof (comme un `{.rappel}` mal formé)                                                                                                                                  |
| Chat des élèves     | Aucune couleur : texte normal, crochets retirés (rendu restreint)                                                                                                                                                 |
| PDF noir et blanc   | Pas de gras automatique. Règle de rédaction (`corrections-redaction.md`) : la couleur souligne un mot qui porte déjà le sens, jamais seule (« le terme [qu'on transforme]{.orange} », jamais « le terme orange ») |
| Contenu existant    | **Nettoyage** (amendement du 2026-11-20, ci-dessous) : les modèles réécrits en `[…]{.nom}`, sans filet de rendu. La garde de `question:specs` refuse tout nouveau `\textcolor` hors formule                       |
| Anciens `primary.N` | 0 → orange, 1 → bleu, 2 → vert, 3 → jaune, 4 → violet, 5 → orange, 6 → cyan, 7 → rose (rôles de `corrections-redaction.md` : orange = ce qu'on transforme, bleu = l'étape, vert = la conclusion)                  |

## Écarté

- **`:orange[le cône]`** (directive à la manière de remark) : une syntaxe de plus, alors que
  `[…]{.…}` existe déjà pour les détails et le dictionnaire.
- **`\textcolor` hors formule comme syntaxe officielle** : du LaTeX dans la prose, illisible pour
  l'auteur et pour le chat.
- **Hex et `primary.N` dans le texte** : une teinte fixe ne suit pas le thème sombre, et ne
  correspond à aucun objet de figure.
- **Gras automatique au PDF** pour remplacer la couleur en noir et blanc : il changerait le sens
  visuel de tout texte coloré ; la règle de rédaction suffit.
- **Les mêmes noms dans les formules** (`\textcolor{orange}{…}` qui suit le thème) : utile, mais
  c'est un autre chantier (mathAST, MathLive) ; reporté.

## Conséquences

- `TextNode` (`src/lib/ubumark/types/ast.ts`) gagne un champ couleur (nom de la palette) ; le
  parseur lit `{.nom}` dans la même famille de marquages que `{.rappel}` et `{.def}`, plusieurs
  classes dans une même accolade.
- Le nom de couleur devient un **contrat avec le contenu stocké** : un synonyme ajouté l'est pour
  toujours (déjà vrai pour les figures).
- Rendus touchés : écran (composants markdown), PDF (Typst), rendu restreint (couleur retirée).
- Les modèles publiés qui ont du `\textcolor` hors formule sont réécrits (retouches
  `pnpm corrections:retouches --lot texte-colore`, appliquées en prod par David).

## Amendement du 2026-11-20 — nettoyage plutôt que filet

La décision d'origine prévoyait un **filet** : un `\textcolor{…}{…}` hors formule rendu comme du
texte coloré, à l'écran et au PDF. Écarté par David le 2026-11-20 (« nettoyer les modèles plutôt
que d'avoir un garde-fou à maintenir »), sur mesure : la garde du rendu passée sur **toute la
prod** (2 077 modèles portent `\textcolor`) n'en trouve que **2 publiés** qui l'affichent hors
formule (5 occurrences), aucun exercice. Les réécrire coûte moins qu'un traducteur de l'ancienne
syntaxe gardé pour toujours.

- Prix accepté : un `\textcolor` hors formule écrit hors des fichiers de lots (à la main, dans
  l'éditeur) s'affiche en LaTeX brut ; aucun cas en prod à cette date.
- Dans les deux modèles, les formules entièrement colorées des mêmes phrases passent aussi en
  `[$…$]{.orange}`, pour qu'une phrase n'ait qu'une teinte d'orange.
