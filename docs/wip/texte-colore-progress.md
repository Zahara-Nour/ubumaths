# Chantier « texte-colore » — du texte coloré dans ubumark, hors formule

> Né de la clôture de [questions-ce1](../archive/wip/questions-ce1-progress.md) (§ 17 et après), le 2026-11-20.
> Ouvert le 2026-11-20 : worktree `ubumaths-wt-texte-colore`, branche `feat/texte-colore`. Décision :
> [ADR 0042](../adr/0042-texte-colore-dans-la-prose.md).

## Reprendre ici

_Mis à jour le 2026-11-20 : ADR 0042 écrit, comportements et découpage proposés (§ 3-4)._

- **État** : worktree ouvert, aucune ligne de code.
- **Prochaine action** : faire valider § 3 (comportements) et § 4 (découpage), puis PR 1, tests d'abord.
- **En attente de David** : validation des § 3 et 4, et réponse aux questions Q1 à Q3 (§ 3).
- **Pièges connus** : la garde `review/textcolor-hors-maths.ts` ne tourne que dans `pnpm question:specs` ; le chat
  des élèves ne doit rien gagner (rendu `restricted`) ; un `{.x}` inconnu déclenche déjà le message « type inconnu »
  de `src/lib/questions/correction-detail.ts` (liste des détails seulement).
- **Worktree / branche** : `../ubumaths-wt-texte-colore` · `feat/texte-colore`.

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

## 3. Comportements attendus (proposés le 2026-11-20, à valider)

**Cas normaux**

- `C'est [le cône]{.orange}.` → l'élève lit « C'est le cône. », « le cône » en orange, de la même teinte que l'objet
  orange d'une figure, en thème clair comme en sombre.
- Nom anglais `{.blue}` → bleu (comme dans les figures). Majuscules ignorées : `{.Orange}` = orange.
- `[le cône]{.orange .def}` → orange, et le mot ouvre sa fiche du dictionnaire. `[la règle]{.rappel .vert}` → vert,
  et masqué en vue concise comme tout rappel.
- Mise en forme : `**[le cône]{.orange}**` et `[**le** cône]{.orange}` → gras et orange. Une formule dans le
  passage, `[$x^2$]{.orange}`, est orange elle aussi.
- Partout où le texte d'ubumark s'affiche : énoncé, choix d'un QCM, tableau, liste, encadré, correction, cours.
- Couleur tirée : `[le cône]{.{{c}}}` avec `c` tiré à `rouge` → rouge.
- PDF : même nom, teinte de la version claire.
- Chat des élèves : « le cône » sans couleur ni crochets.

**Cas limites**

- Deux couleurs l'une dans l'autre, `[le [grand]{.rouge} cône]{.bleu}` → « grand » rouge, le reste bleu.
- `{.noir}` et `{.blanc}` suivent la page, comme dans les figures (`blanc` disparaît sur fond blanc : à éviter,
  pas interdit).
- Crochets sans accolade, `[x]`, ou dans une formule `$[0;1]$` → rien ne change.
- Ancienne écriture hors formule (filet) : `\textcolor{red}{le cône}` → rouge ; `\textcolor{primary.0}{…}` → orange
  (table du § 2) ; `\textcolor{#FF5722}{…}` → texte normal, sans LaTeX visible. `question:specs` les signale toujours.

**Erreurs**

- Nom inconnu, `[le cône]{.turquoise}` → l'élève lit « le cône » en texte normal ; le prof voit « « {.turquoise} » :
  ni un type de détail, ni une couleur. Couleurs possibles : bleu, rouge, … ».
- Variable tirée à une valeur qui n'est pas un nom (`c` = `#ff0000`) → texte normal, même message.

**Questions**

- **Q1** — Aujourd'hui, un `[texte]{.rapel}` (faute de frappe) s'affiche tel quel pour l'élève, crochets compris.
  Je propose de l'aligner sur la couleur inconnue : « texte » en texte normal, message au prof. D'accord ?
- **Q2** — L'éditeur riche (TipTap) sait colorer du texte, mais la couleur se perd à l'enregistrement. Le brancher
  sur `[…]{.nom}` (12 couleurs dans son menu) : dans ce chantier, ou plus tard ?
- **Q3** — Les modèles publiés en prod qui contiennent `\textcolor` hors formule seront lisibles grâce au filet.
  Les réécrire en `[…]{.nom}` (fichiers de lots + liste pour une mise à jour en prod par toi) : dans ce chantier,
  ou les laisser au filet ?

## 4. Découpage proposé (à valider)

1. **PR 1 — syntaxe et écran** : `[…]{.nom}` lu par le parseur (plusieurs classes, variable tirée, nom inconnu),
   affichage à l'écran, chat sans couleur, message au prof. Doc d'ubumark et règle de rédaction
   (`corrections-redaction.md`). Revue : `code-reviewer` (+ `security-auditor` pour le chat des élèves).
2. **PR 2 — PDF** : la couleur dans Typst (teinte claire).
3. **PR 3 — filet** : `\textcolor{…}{…}` hors formule lu comme `[…]{.nom}` (écran et PDF).
4. Selon Q2 et Q3 : éditeur riche ; réécriture de l'existant.
