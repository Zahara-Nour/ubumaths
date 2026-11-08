---
couvre:
  - src/lib/components/rich-text/ImageGalleryModal.svelte
  - src/lib/components/rich-text/MarkdownCodeEditor.svelte
  - src/lib/components/rich-text/RestrictedRichText.svelte
  - src/lib/components/rich-text/config.ts
  - src/lib/components/rich-text/editor-config.ts
  - src/lib/components/rich-text/markdown-detection.ts
  - src/lib/components/rich-text/markdown-paste-extension.ts
  - src/lib/components/rich-text/types.ts
  - src/lib/utils/sanitize.ts
  - src/lib/utils/sanitize-configs.ts
  - src/lib/utils/html-escape.ts
  - 'src/routes/(protected)/dev/editeur-riche/*.svelte'
---

# Éditeur riche (TipTap) et affichage sûr du contenu écrit

> Vérifié contre le code le 2026-10-12 (commit 4ab55c5e8) ; retrait de `transformMathHtml` et de `SAFE_FOR_TEMPLATES` le 2026-11-08. `isReady()` (éditeur créé, sinon `getMarkdown()` rend `''`) le 2026-11-06.
> Voisins, non recopiés ici : l'usage de `RichTextEditor` et `RichTextDisplay` est dans
> [composants-ui.md](../pratiques/composants-ui.md) ; la conversion TipTap ↔ markdown
> (`markdown-import.ts`, `markdown-export.ts`) et les extensions de `src/lib/extensions/` sont
> dans [ubumark.md](ubumark.md). `src/lib/components/rich-text/README.md` (en anglais) décrit
> la barre d'outils en détail.
> Banc d'essai (admin seul) : `/dev/editeur-riche` — modes chat et form côte à côte, réglages,
> import et export Markdown, onglet « Messagerie » (`Messagerie.svelte`, ex-`/demo/rich-text-editor-demo`).

## À quoi ça sert

Profs et élèves écrivent du texte mis en forme avec des formules : messages, chat, cahier de
textes, fiches, énigmes, cartes du kanban, blocs du tableau blanc. Un seul éditeur,
`RichTextEditor.svelte` (TipTap + MathLive), sert tous ces endroits. Ce document couvre ce qui
l'entoure : sa configuration, le collage de markdown, la galerie d'images, le mode markdown brut,
et la façon d'**afficher** sans risque un contenu écrit par quelqu'un d'autre.

## Comment c'est construit

### Configuration de l'éditeur

- `types.ts` : `RichTextMode` (`'chat' | 'form'`), `EditorPreset` (`minimal | standard | full`),
  `ToolbarConfig`, palettes, modèles de formules, `ImageUploadConfig`, `GalleryImageInfo`.
- `config.ts` : palettes `TEXT_COLORS` (8) et `HIGHLIGHT_COLORS` (7 dont « Aucun »),
  `EMOJI_CATEGORIES`, modèles de formules `MATH_TEMPLATES_FULL` (9) et `MATH_TEMPLATES_BASIC`
  (4), et `EDITOR_PRESETS`. Un preset choisit les sections de la barre d'outils et le jeu de
  modèles ; `RichTextEditor` prend `preset = 'full'` par défaut, une prop `toolbar` explicite
  l'emporte. Appelants : `minimal` (tableau blanc), `standard` (cahier de textes, kanban),
  `full` (exercices).
- `editor-config.ts` : `createEditorExtensions({ headingLevels })` construit la liste des
  extensions TipTap (StarterKit, listes, colonnes, code, liens, couleurs, alignement,
  indices, tâches, tableaux, images, vidéo, formules, variables de modèle, liens de ressource,
  tableaux de variations, droites graduées, arbres de probabilité, cercles trigonométriques,
  `MarkdownPaste`). **La liste est mise en cache par clé** (`h<niveaux>-v30`) : les extensions
  qui portent un plugin ProseMirror ne doivent exister qu'une fois, sinon deux éditeurs sur la
  même page lèvent « duplicate keyed plugin ». `getEditorProps({ minHeight })` donne les classes
  `prose` de la zone d'édition. Appelants : `RichTextEditor`, `RichTextDisplay`,
  `src/lib/extensions/resource-link-extension.ts`.

### Coller du markdown (`markdown-paste-extension.ts`, `markdown-detection.ts`)

Extension TipTap `MarkdownPaste`, branchée par `editor-config.ts`. Au collage :

1. lit `text/plain` du presse-papiers (rien d'autre) ;
2. `containsMarkdownSyntax(text)` : faux si le texte contient une balise HTML (`isHtmlContent`),
   sinon additionne les poids des motifs reconnus (titres, gras, italique, code, listes, liens,
   formules…) et compare au seuil `MARKDOWN_THRESHOLD = 3` ;
3. `normalizeMarkdownIndentation` retire l'indentation commune ;
4. `markdownToTipTap` (ubumark) convertit, puis `editor.commands.insertContent`.

Si le texte n'est pas jugé markdown, ou si la conversion est vide, le collage natif de TipTap
s'applique.

### Images : `ImageGalleryModal.svelte`

Fenêtre qui montre les images déjà téléversées (`GalleryImageInfo[]`) et propose d'en choisir
une ou d'en téléverser une nouvelle. Montée par `RichTextEditor` seulement si l'appelant fournit
`imageUpload` (`ImageUploadConfig` : `uploadFn`, `listExistingImages` facultatif). Fournisseurs :
`src/lib/components/exercises/ExerciseRichTextEditor.svelte` et
`src/lib/components/markdown/MarkdownEditor.svelte`.

### Mode markdown brut : `MarkdownCodeEditor.svelte`

Éditeur CodeMirror 6 (markdown, numéros de ligne, thème `oneDark`), modules chargés à la
demande. `RichTextEditor` l'affiche quand on bascule en mode markdown : le contenu passe par
`tipTapToMarkdown` à l'aller et `markdownToTipTap` au retour. Seul appelant : `RichTextEditor`.

### Afficher un contenu écrit par un autre : `RestrictedRichText.svelte`

Pour un texte écrit par un **élève** et lu par d'autres (messagerie, signalements de fiches,
sorties de notebook). `RichTextDisplay` monte l'éditeur complet en lecture seule : vidéo et
image externes, `\htmlStyle`, couleur de texte y passaient (audit du 2026-10-03).
`RestrictedRichText` convertit le JSON TipTap en markdown (`tipTapToMarkdown`) et le rend par
`MarkdownRenderer` en mode `restricted`. Un ancien contenu HTML est réduit à son **texte**, lu
dans un document inerte (`DOMParser`). Un JSON malformé s'affiche `[contenu illisible]` au lieu
de planter. 8 appelants (messages, signalements de fiches, notebook).

### Nettoyer du HTML : `sanitize.ts`, `sanitize-configs.ts`, `html-escape.ts`

| Fonction                        | Ce qu'elle fait                                                                 | Appelants                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `sanitizeHtml`                  | DOMPurify (`isomorphic-dompurify`), liste blanche de balises et d'attributs     | notebook, aperçu de variante, modèles de messages                                  |
| `sanitizePlainText`             | retire toute balise, garde le texte                                             | `ReportErrorDialog.svelte`                                                         |
| `sanitizeUrl`                   | lien inchangé si schéma `http`, `https`, `mailto` ou relatif ; sinon `'#'`      | rendu markdown : `InlineRenderer`, `ParagraphNode`, `HeadingNode`, `HintReference` |
| `containsDangerousHtml`         | détecte `<script`, `<iframe`, `on…=`, `javascript:`…                            | aucun (doublon, voir Écarts)                                                       |
| `NOTIFICATION_SANITIZE_CONFIG`  | 13 balises, aucun attribut : config partagée serveur / client des notifications | `server/sanitization.ts`, `utils/sanitize-notification.ts`                         |
| `escapeHtml` (`html-escape.ts`) | échappe `< > & " '` ; `null`/`undefined` → `''`                                 | `server/notifications.ts`, `auto-notifications.ts`, marché                         |

`sanitizeUrl` décide sur la forme que lira le **navigateur** : espaces et caractères de contrôle
de tête retirés, tabulations et retours à la ligne supprimés partout (`java\nscript:` devient
`javascript:`). Liste **blanche** de schémas, pas liste noire.

## Pièges

- **`sanitizeHtml` garde `style`, `class`, `img` et `src`.** Une image externe (pixel de suivi)
  et du CSS en ligne passent. Pour un contenu d'élève lu par d'autres : `RestrictedRichText`,
  pas `sanitizeHtml`.
- **Ne jamais instancier une extension à plugin ProseMirror hors de `createEditorExtensions`.**
  Ajouter une extension : l'ajouter dans `createExtensionsInternal` **et** changer la clé de
  cache (`-v30` → `-v31`), sinon un module déjà chargé garde l'ancienne liste.
- La détection markdown est heuristique : un texte avec une seule marque faible n'est pas
  converti, un texte qui contient une balise HTML ne l'est jamais.

## Écarts connus

- **`transformMathHtml`, `sanitizeHtmlWithMath`, `linkifyResourceReferences` — retirés le
  2026-11-08** : le HTML du cahier de texte (TipTap → `<math-field read-only>`, références en
  liens) n'avait plus de lecteur depuis le passage du cahier en ubumark (chantier cahier-ubumark,
  lignes converties) et celui de la carte « cahier » de `/demo/editeur` à `JournalContent`.
  Historique utile si un rendu HTML revenait : l'ancienne transformation par expressions
  (`[^>]*` sur les attributs) laissait passer un **XSS stocké au rendu serveur** (jsdom n'échappe
  pas `>` dans une valeur d'attribut ; audit de #2425) — transformer dans l'arbre DOM rendu par
  DOMPurify, jamais sur le texte HTML.
- **`SAFE_FOR_TEMPLATES` retiré le 2026-11-08** (`sanitizeHtml`, `NOTIFICATION_SANITIZE_CONFIG`) :
  DOMPurify effaçait tout de `{{` au dernier `}}`. Mesuré : `<p>Bonjour {{studentName}}, ta note
est {{score}}.</p>` → `<p> .</p>` ; `$\sqrt{\frac{1}{2}}$ fin` → `$ fin` (aperçus des modèles de
  messages, liste du prof comprise ; notifications ; notebook). Le réglage ne protège que d'un
  moteur de gabarits qui relirait le HTML dans le navigateur (Angular, Vue) : aucun dans l'app,
  Svelte ne relit pas `{@html}`. Prod au 2026-11-08 : 0 modèle de message, 0 notification
  concernée. Garde : `describeTextesAccolades` (`sanitize-attack-vectors.ts`), à côté de la suite
  d'attaque, serveur et navigateur.
- **Deux points faibles notés par l'audit de #2425 — clos le 2026-11-08** :
  - `<math-field>` accepté dans le HTML : `sanitizeHtml` n'autorise plus aucune balise MathLive
    (`math-field`, `math-inline`, `math-display`, attributs `read-only` / `disabled`). MathLive lit
    leur texte comme du LaTeX, où `\htmlStyle`, `\class`, `\cssId`, `\htmlData`, `\href` posent
    style, classe, identifiant, données ou lien. Aucun appelant de `sanitizeHtml` (sorties HTML
    du carnet, modèles de messages) n'en produit (grep), et la prod n'en contenait pas au
    2026-11-08 (0 carnet sur 2, 0 modèle de message). Garde : `describeSansMathLive`
    (`sanitize-attack-vectors.ts`).
  - `\href` de MathLive (0.111.1, mesuré dans son code) : au rendu, une adresse autre que `http:`
    ou `https:` lève une erreur (`javascript:` ne passe pas) ; au clic dans un `math-field`,
    `openUrl` n'ouvre que `http:`, `https:`, `file:`. Reste un lien externe : seuls des auteurs
    de confiance (prof, admin) écrivent des formules rendues en mode normal. Tout contenu d'élève
    lu par un autre passe par une liste blanche ou le rendu restreint, qui refuse `\href` et les
    commandes à attributs : chat (`RestrictedRichText`), signalements d'erreur (description),
    carnet d'élève lu par un autre (`isForeignStudentNotebook`), réponses d'élèves
    (`student-answer-safety.ts`), Atelier (`safe-latex.ts`).
  - Restes faibles, notés par l'audit de #2488 (non traités) : (1) le lien public du cahier
    (`JournalContent`, lecteurs anonymes) rend les formules du prof sans rendu restreint — une
    formule `\htmlStyle{background:url(…)}` y ferait charger une adresse externe, comme les
    vidéos écartées le 2026-11-06 ; auteur de confiance, à trancher par David ; (2) le rendu
    restreint refuse par liste NOIRE (`UNSAFE_MATH_COMMANDS`) : une macro par défaut de MathLive
    qui se développerait en commande à attributs n'est pas rattrapée par
    `mathlive-commandes-a-valeur.test.ts`.
- **Énigmes : HTML enregistré, lu comme du markdown — corrigé le 2026-11-08** (vu le
  2026-10-25) : `RiddleForm.svelte` écrit désormais en ubumark (chantier cahier-ubumark, PR 4).
  Les 2 énigmes de prod, des essais en HTML, n'ont pas été converties : David les a supprimées après le déploiement (v0.77.0, 2026-11-08).
- **`isTrivialHtmlWrapper` n'est appelé nulle part** hors de ses tests
  (`git grep -n isTrivialHtmlWrapper -- src` : la définition et `__tests__/markdown-paste.test.ts`).
  `handlePaste` ne lit jamais `text/html` (`git log -S "text/html"` sur le fichier : aucun
  commit) : l'en-tête du fichier promet de « préserver le collage HTML natif », mais un
  copier depuis Google Docs dont le texte brut ressemble à du markdown est converti depuis ce
  texte brut, la mise en forme HTML est perdue.
- **Exports sans appelant hors tests** : `getDetectedPatterns` (`markdown-detection.ts`),
  `RichTextEditorProps` (`types.ts`), `isAlreadyEscaped` et `escapeHtmlSafe`
  (`html-escape.ts`), `NotificationSanitizeConfig` (`sanitize-configs.ts`).
- **`containsDangerousHtml` existe deux fois** : `src/lib/utils/sanitize.ts` (sans appelant) et
  `src/lib/server/sanitization.ts` (celle qu'on utilise). De même, `src/lib/utils/errorMonitoring.ts`
  a sa propre `sanitizeUrl` locale, sans rapport avec celle de `sanitize.ts`.
- **`escapeHtml` existe en cinq exemplaires** : `src/lib/utils/html-escape.ts`,
  `src/lib/components/markdown/utils.ts`, `src/lib/email-templates/parental-consent.ts`,
  `src/lib/components/geometry/GeometryCanvas.svelte`, `src/lib/whiteboard/core/pdf-export.ts`.
- `config.ts` et `RichTextEditor.svelte` citent encore `FormRichTextEditor.svelte`, fusionné
  dans `RichTextEditor` et absent du dépôt.
