# Chantier « texte-colore » — du texte coloré dans ubumark, hors formule

> Né de la clôture de [questions-ce1](questions-ce1-progress.md) (§ 17 et après), le 2026-11-20.
> Ouvert le 2026-11-20 : worktree `ubumaths-wt-texte-colore`, branche `feat/texte-colore`. Décision :
> [ADR 0042](../../adr/0042-texte-colore-dans-la-prose.md).

## Reprendre ici

_Mis à jour le 2026-11-22 : chantier clos._

- **État** : clos. PR 1 (#2933 + #2934), PR 2 (#2935), PR 3 (#2937) en prod (0.100.0) ; les 2 modèles réécrits en prod
  par David le 2026-11-22 ; garde du rendu sur toute la prod : 0 modèle fautif (§ 8). Durable versé dans
  `docs/systeme/ubumark.md`, `fiches-et-pdf.md`, `realtime.md`, `questions.md`, CONTEXT.md, ADR 0042.
- **Reste** : vérification à l'œil de David (`docs/wip/verifications-manuelles.md`, ligne du 2026-11-20). Q2 (éditeur
  riche branché sur `[…]{.nom}`) : futur chantier à part.

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

## 3. Comportements attendus (validés par David le 2026-11-20 : « je suis tes recos »)

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
  → **Validé** (proposition suivie, 2026-11-20). Le message « type inconnu » de `correction-detail.ts` disparaît :
  un seul message, au rendu, à l'endroit du marquage.
- **Q2** — L'éditeur riche (TipTap) sait colorer du texte, mais la couleur se perd à l'enregistrement. Le brancher
  sur `[…]{.nom}` (12 couleurs dans son menu) : dans ce chantier, ou plus tard ?
  → **Plus tard, chantier à part** (David, 2026-11-20 : « ok je te suis » à cette proposition).
- **Q3** — Les modèles publiés en prod qui contiennent `\textcolor` hors formule seront lisibles grâce au filet.
  Les réécrire en `[…]{.nom}` (fichiers de lots + liste pour une mise à jour en prod par toi) : dans ce chantier,
  ou les laisser au filet ?
  → **Dans ce chantier, après le filet** : fichiers de lots réécrits, liste des modèles en prod pour David
  (David, 2026-11-20 : « ok je te suis »).

## 4. Découpage (validé le 2026-11-20)

1. **PR 1 — syntaxe et écran** : `[…]{.nom}` lu par le parseur (plusieurs classes, variable tirée, nom inconnu),
   affichage à l'écran, chat sans couleur, message au prof. Doc d'ubumark et règle de rédaction
   (`corrections-redaction.md`). Revue : `code-reviewer` (+ `security-auditor` pour le chat des élèves).
2. **PR 2 — PDF** : la couleur dans Typst (teinte claire).
3. ~~**PR 3 — filet**~~ → **PR 3 — nettoyage** (David, 2026-11-20, § 7) : modèles réécrits, pas de filet.
4. Selon Q2 et Q3 : éditeur riche ; réécriture de l'existant.

## 5. PR 1 — syntaxe et écran (2026-11-20)

- Un seul motif `SPAN_MARK_REGEX` + `parseSpanClasses` (`src/lib/ubumark/utils/detail-kinds.ts`) remplace les
  deux motifs (détail, dictionnaire) ; deux passes du même motif dans le parseur (extérieur, puis intérieur).
- `TextNode.color`, `TextNode.unknownClasses`, `MathInlineNode.color` ; une marque intérieure l'emporte.
- Rendu : `inline-color.ts`, `InlineColor.svelte` (formules), `TextNode.svelte` (couleur + message au prof),
  cellules de tableau (`table-cell-inline.ts`) ; restreint → aucune couleur.
- Vu en capture (thèmes clair et sombre) : texte, gras, formule et cellule colorés ; message au prof lisible.
- Revue (`code-reviewer`) : un détail dans un passage sans détail (`[la règle [à retenir]{.rappel}]{.orange}`)
  restait en concis — corrigé (`lastIndex` relu) ; `{.Def}` lu. Audit (`security-auditor`) : rien de bloquant ;
  seconde défense ajoutée (`restrictDocument` retire `color`). Regex mesurée sans retour arrière catastrophique.
- ⚠️ **Incident** : #2933 mergée avec un test client rouge (CorrectionView D5 attendait `[x]{.truc}` littéral) —
  `gh pr checks | tail -15` masquait l'échec. Corrigé par #2934. Désormais : grep des checks non `pass` vide avant
  tout merge.

## 6. PR 2 — PDF (2026-11-20)

- `wrapInlineColor` (`typst-generator.ts`) : `#text(fill: namedColorTypst(nom))[…];` autour du texte (après le
  gras, avant italique / barré / surligné) et de la formule ; à l'intérieur du détail (`wrapInlineDetail`), pour
  que la couleur l'emporte sur le gris d'un calcul et se lise dans le surlignage d'un rappel, comme à l'écran.
- Cellules de tableau : `processTableCellContent` lisait la chaîne brute (le marquage s'imprimait tel quel). Les
  marquages y sont cherchés hors formules (`maskSpans`), chaque passage rendu à son tour (imbrication), classe
  inconnue → texte normal ; `**[a]{.orange}**` lu avant le marquage (sinon `**` imprimés), `**` hors marquage
  appariés deux par deux (revue : `**a** [b]{.orange} **c**` appariait le fermant de a et l’ouvrant de c). Sans `]{.` dans la
  cellule : chemin d'avant, inchangé. Bonus : un `[…]{.rappel}` de cellule est enfin surligné au PDF.
- Rendu réel : `texte-colore-typst.test.ts` compile le PDF et lit ses couleurs de remplissage (pdfjs) — vérifié
  rouge en coupant `wrapInlineColor`. Le rendu SVG de typst.ts n'est pas installé : PDF seulement.

## 7. PR 3 — nettoyage plutôt que filet (2026-11-20)

**Décision (David, 2026-11-20)** : « nettoyer les modèles plutôt que d'avoir un garde-fou à maintenir » → le filet
(§ 2 point 6, § 4 point 3) est abandonné ; ADR 0042 amendée.

- **Mesure** : garde du rendu (`findTextcolorOutsideMath`, 10 tirages par variation) sur **toute la prod**, lecture
  seule : 2 077 modèles portent `\textcolor`, **2 publiés** l'affichent hors formule — `78feafed` « Traduire une phrase
  en expression mathématique » (4 étapes) et `e4784c78` « Lire une fonction Python plus complexe » (1 étape).
  Exercices : aucun hors formule. Fichiers de lots du dépôt : 2 copies de `e4784c78` seulement.
- **Retouches** (`scripts/corrections/lib/retouches-texte-colore.ts`, `pnpm corrections:retouches --lot
texte-colore`) : `primary.1` → `{.bleu}`, `primary.0` → `{.orange}` ; les formules entièrement colorées des mêmes
  phrases passent en `[$…$]{.orange}` (sinon deux oranges dans une phrase) ; plus aucun `\textcolor` dans les deux
  modèles. Simulation sur la prod : 2/2 prêtes, `checkTemplate` vert ; vérificateur vert pour `78feafed` (20 000
  tirages).
- **Vérificateur et `e4784c78`** : déjà rouge AVANT retouche (hors lot → classe N : « aucun calcul aligné » ;
  `written` : la réponse n'est pas dans l'énoncé, elle se lit dans le code). Ajout `Retouche.skipVerifier` (raison
  affichée), `checkTemplate` toujours exigé ; le fond intact est prouvé par le test « rien d'autre ne change ».
- Fichiers de lots réécrits : `scripts/questions/1techno-t2/e4784c78.json`,
  `scripts/questions/2de-programmes-11b/13-fonction-complexe.json` (specs 8/8, garde 0/60).
- Instantané de test : `data/corrections/texte-colore/_modeles.json` (sans identifiant d'utilisateur).

## 8. Clôture (2026-11-22)

- `deploy:prod` 0.100.0 (2026-11-22) contient #2933 → #2937.
- `pnpm corrections:retouches --lot texte-colore --publier` lancé par David le 2026-11-22 : 2/2 écrites et relues
  (78feafed : 14/14 specs, vérificateur vert sur 20 000 tirages ; e4784c78 : 8/8 specs).
- Garde du rendu (`findTextcolorOutsideMath`, 10 tirages par variation) sur toute la prod, lecture seule, après
  écriture : 2 114 modèles portent `\textcolor`, **0** l'affiche hors formule.
- Découpage recompté : PR 1, 2, 3 mergées ; Q3 (réécriture de l'existant) faite par la PR 3 ; Q2 renvoyée à plus tard.
