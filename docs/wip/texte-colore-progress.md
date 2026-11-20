# Chantier « texte-colore » — du texte coloré dans ubumark, hors formule

> Né de la clôture de [questions-ce1](../archive/wip/questions-ce1-progress.md) (§ 17 et après), le 2026-11-20.
> Chantier **pas encore ouvert** (ni worktree ni branche) : phase 0 validée, rien codé.

## Reprendre ici

_Mis à jour le 2026-11-20 : phase 0 validée par David, chantier à ouvrir._

- **État** : syntaxe et règles tranchées (§ 2) ; aucune ligne de code.
- **Prochaine action** : ouvrir le chantier (worktree `ubumaths-wt-texte-colore`), écrire l'ADR, puis les comportements
  en français (nominal / limite / erreur) et le découpage en PR, à faire valider.
- **En attente de David** : rien.
- **Pièges connus** : la garde `review/textcolor-hors-maths.ts` ne tourne que dans `pnpm question:specs` ; le chat
  des élèves ne doit rien gagner (rendu `restricted`).

## 1. Le défaut

Ubumark n'a pas de syntaxe de texte coloré : hors `$…$`, `\textcolor{…}{…}` reste dans un nœud texte et l'élève lit
le LaTeX brut (« C'est \textcolor{#FF5722}{le cône}. »). Vérifié dans le code le 2026-11-20 : `TextNode`
(`src/lib/ubumark/types/ast.ts`) n'a ni champ couleur ni syntaxe dans le parseur. La couleur existe seulement dans
les formules (`metadata.color` de mathAST, `\textcolor` lu par le parseur LaTeX), dans les blocs graphiques
(palette des 12 noms) et dans l'éditeur riche TipTap (perdue à l'export markdown). Seul le PDF (Typst) convertit
`\textcolor` hors formule.

Ampleur : 2de corrigée le 2026-11-02 (648 occurrences, 24 modèles, `questions-2de` § 58-59) ; lot 10 du CE1 corrigé
le même jour ; **53 autres fichiers de lots** relevés le 2026-11-02 (CE1 lot 9, 2de, 3e, 4e, CM1, Tle, beaucoup
publiés), à recompter. Depuis le 2026-11-03, `question:specs` refuse un `\textcolor` hors `$` (#2283).

## 2. Phase 0 — décisions (David, 2026-11-20 : « ok pour A », puis « je valide » aux recommandations)

1. **Syntaxe A**, de la famille des détails de correction (ADR 0017) et du lexique : `C'est [le cône]{.orange}.` ;
   combinable : `[le cône]{.orange .def}`. Écartées : `:orange[le cône]` (une syntaxe de plus) ; `\textcolor` hors
   formule comme syntaxe officielle (LaTeX dans la prose).
2. **Couleurs : les 12 noms de la palette des figures**, seuls admis dans le texte (`src/lib/theme/named-colors.ts` :
   bleu, rouge, vert, orange, violet, jaune, cyan, marron, rose, gris, noir, blanc ; synonymes anglais ramenés au
   français). Même teinte que l'objet de la figure, thème clair et sombre (`var(--color-fig-<nom>)`), variante
   claire au PDF. Ni hex ni `primary.N` dans le texte.
   - Table de passage des anciens `primary.N` : 0 → orange, 1 → bleu, 2 → vert, 3 → jaune, 4 → violet, 5 → orange,
     6 → cyan, 7 → rose (rôles de `corrections-redaction.md` : orange = ce qu'on transforme, bleu = l'étape,
     vert = la conclusion).
   - Plus tard, chantier à part : les mêmes noms dans les formules (`\textcolor{orange}{…}` qui suit le thème).
3. **Couleur tirée** : permise par une variable, `[le cône]{.{{c}}}` (`c` tirée parmi les noms), pour suivre une
   figure à couleur tirée. Nom inconnu : texte normal pour l'élève, message pour le prof (comme un `{.rappel}` mal
   formé).
4. **Chat des élèves** : aucune couleur ; texte normal, crochets retirés.
5. **PDF en noir et blanc** : pas de gras automatique ; règle de rédaction dans `corrections-redaction.md` — la
   couleur souligne un mot qui porte déjà le sens, jamais seule (« le terme [qu'on transforme]{.orange} », jamais
   « le terme orange »).
6. **Filet pour l'existant** : un `\textcolor{…}{…}` hors formule est rendu comme du texte coloré (nom correspondant
   si `primary.N` ou nom connu, sinon texte normal), jamais en LaTeX brut ; les modèles publiés sont réparés dès la
   livraison. La garde de `question:specs` continue de les signaler, pour réécriture en `[…]{.nom}`.
