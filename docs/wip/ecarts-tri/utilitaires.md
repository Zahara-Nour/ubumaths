# Lot utilitaires : 30 points (32 blocs, 2 points découpés)

| verdict      | nombre de blocs |
| ------------ | --------------: |
| VRAI         |              24 |
| CORRIGÉ      |               1 |
| FAUX         |               0 |
| PAS UN ÉCART |               4 |
| NON VÉRIFIÉ  |               2 |
| DOUBLON      |               1 |

Aucun point du lot n'est déjà dans `docs/ecarts/registre.md` (relu en entier, 60 lignes : aucun mot clé commun). Les codes de sortie des preuves ont été relevés le 2026-11-24 ; tous valent 1 aujourd'hui (écart vrai).

## Points

### jeux-et-economie.md:424 [V] — VRAI

- **Point** : 4 cartes VIP Mathémo citent `/images/vip-cards/mathemo-*.webp`, absent de `static/` : 404.
- **Vu** : `ls static/images/vip-cards` : le dossier n'existe pas (il n'y a que `static/images/vip-cards-back/` et trois bannières `*-mathemo.webp`). `supabase/seed.sql:291-294` écrit les 4 chemins `/images/vip-cards/mathemo-{letter,undo,vowels,multiplier}.webp`. Les lignes de prod elles-mêmes ne sont pas lisibles ici : que la prod ait ce même chemin vient de la doc (constat du 2026-11-22), le 404 réel est à confirmer dans un navigateur.
- **Registre** : V · cartes VIP · les 4 cartes VIP de Mathémo s'affichent sans image (fichiers absents du dépôt) · preuve : commande `test -f static/images/vip-cards/mathemo-letter.webp` (sortie 1 ; à étendre aux 3 autres fichiers quand ils existent).

### editeur-riche.md:173 (a, collage) [V] — VRAI

- **Point** : `handlePaste` ne lit jamais `text/html` ; le collage depuis Google Docs perd sa mise en forme.
- **Vu** : `src/lib/components/rich-text/markdown-paste-extension.ts:194-209` : seul `getData('text/plain')` est lu ; si le texte brut « ressemble à du markdown » (`containsMarkdownSyntax`), `preventDefault()` puis insertion du markdown converti (l. 225-231) ; sinon `return false` et ProseMirror colle le HTML natif. Donc la mise en forme est perdue **seulement** quand le texte brut contient une syntaxe markdown (puce `- `, `1. `, `**`…), cas fréquent pour une liste copiée de Docs. L'en-tête du fichier (l. 11, « Preserves native HTML paste behavior ») sur-promet. `git grep "getData('text/html')"` : aucun résultat dans `src`.
- **Registre** : V · éditeur riche · copier une liste ou un texte mis en gras depuis un traitement de texte et le coller dans l'éditeur riche donne le texte brut converti en markdown, sans la mise en forme d'origine · preuve : commande `test -f src/lib/components/rich-text/markdown-paste-extension.ts && grep -q "getData('text/html')" src/lib/components/rich-text/markdown-paste-extension.ts` (sortie 1).

### editeur-riche.md:173 (b, `isTrivialHtmlWrapper`) [M] — VRAI

- **Vu** : définie `markdown-paste-extension.ts:40` ; seul importeur : `__tests__/markdown-paste.test.ts:12`. Aucun appelant dans le code. Lettre : M (code mort ; lié à (a) : c'est la fonction qui servirait à décider de garder le HTML).
- **Registre** : M · éditeur riche · aucun effet visible, fonction sans appelant (voir (a)) · preuve : commande `test -f src/lib/components/rich-text/markdown-paste-extension.ts && ! grep -q "isTrivialHtmlWrapper" src/lib/components/rich-text/markdown-paste-extension.ts` (sortie 1). À traiter avec (a) : soit on la branche, soit on la retire.

### utilitaires-et-demos.md:409 [V] — DOUBLON

- **Vu** : même constat que `jeux-et-economie.md:424` (premier bloc). Pas de ligne séparée au registre.

### utilitaires-et-demos.md:412 [V] — VRAI

- **Point** : `angle_polaire` rend des degrés même en mode radians.
- **Vu** : `src/lib/geometry-core/graph/compute-position.ts:1180-1189` : `const rad = Math.atan2(dy, dx); return (rad * 180) / Math.PI;` sans lecture du mode d'angle. `dsl/builtins.ts:3626` annonce « `atan2(...)` en radians » ; le test `builtins-angle.test.ts:147` attend 90 pour (0,1) (il fige les degrés). Le mode `unite_angle` (`interpreter.ts:828`) n'intervient pas. Contradiction réelle entre l'aide du builtin (radians) et la valeur (degrés).
- **Registre** : V · géométrie DSL · `angle_polaire` donne 90 au lieu de π/2 en mode radians, donc cos(3θ) est faux · preuve : commande `test -f src/lib/geometry-core/graph/compute-position.ts && ! grep -q "return (rad \* 180) / Math.PI" src/lib/geometry-core/graph/compute-position.ts` (sortie 1 ; à remplacer par un test si la correction change la forme du code).

### utilitaires-et-demos.md:419 [V] — NON VÉRIFIÉ

- **Point** : sur téléphone, les flèches du `Deck` chevauchent le bas d'une diapositive de `/demo/diaporama`.
- **Vu** : `src/lib/slides/core/Deck.svelte` : les commandes sont en `position: absolute` avec `bottom` en CSS (l. 823-905), superposées à la diapositive, sans marge réservée apparente. Plausible mais c'est une affaire de rendu : il faut un iPhone ou `pnpm voir /demo/diaporama` à 390 px. Rien n'a été lancé (consigne).

### utilitaires-et-demos.md:446 [V] — VRAI

- **Point** : réglage admin de la numérotation des listes dans `localStorage`, élèves et profs voient le défaut.
- **Vu** : `src/lib/stores/listNumbering.svelte.ts:22,29,60` (`localStorage`, clé `listNumberingConfig`, aucune écriture en base) ; lu par `MarkdownRenderer.svelte:293-296` (`listNumberingStore.config`). La page `dashboard/admin/settings/+page.svelte:125-180` (« Numerotation des listes ») ne dit nulle part que le réglage ne vaut que pour ce navigateur.
- **Registre** : V · réglages admin · l'admin règle la numérotation des listes, rien ne change pour les élèves et profs, et la page ne le dit pas · preuve : à la main (décision : soit enregistrer en base, soit retirer le réglage, soit écrire « ce navigateur seulement »).

### exercices.md:250 [V] — VRAI

- **Vu** : `src/routes/(protected)/dashboard/teacher/contenu/+layout.svelte:14,24,29,34,41,42` : labels `Templates`, `Enigmes`, `Worksheets`, `Notebooks`, titre « Contenu pedagogique », description « Gerez vos templates … enigmes ». Même défaut dans `teacher/gamification/+layout.svelte:37` (« Gerez les recompenses, cartes VIP et le marche … eleves »). Les libellés « Templates / Worksheets / Notebooks » sont aussi en anglais.
- **Registre** : V · espace de contenu du prof · l'entête et les onglets de « Contenu » sont écrits sans accents et en anglais (Contenu pedagogique, Gerez, Enigmes, Templates, Worksheets, Notebooks) · preuve : commande `f="src/routes/(protected)/dashboard/teacher/contenu/+layout.svelte"; test -f "$f" && ! grep -q -e "Contenu pedagogique" -e "Gerez" -e "Enigmes" "$f"` (sortie 1).

### analytique-prof.md:252 [V] — VRAI

- **Vu** : `src/lib/components/teacher/analytics/ClassCurriculumPointGrid.svelte:147` : `title={point.name}` (nom brut du point, qui peut contenir du LaTeX) ; l. 182 : ``title={`${student.display_name} — ${point.name} : ${meta.label}`}``.
- **Registre** : V · analytique de classe · en survolant une colonne ou une case de la grille des points, l'infobulle montre le nom du point avec ses signes LaTeX bruts · preuve : commande `f=src/lib/components/teacher/analytics/ClassCurriculumPointGrid.svelte; test -f $f && ! grep -q "title={point.name}" $f` (sortie 1 ; la ligne 182 est à traiter avec).

### editeur-riche.md:120 [T] — PAS UN ÉCART

- **Point** : `sanitizeHtml` garde `style`, `class`, `img`, `src` ; pour un contenu d'élève lu par d'autres, passer par `RestrictedRichText`.
- **Ce que le code laisse passer** : `src/lib/utils/sanitize.ts:29-102` : liste blanche DOMPurify, balises dont `img`, `a`, `div`, `span` ; attributs `href`, `src`, `style`, `class`, `width`, `height`, `target`, `rel`… ; `ALLOW_DATA_ATTR: false`, `ALLOW_UNKNOWN_PROTOCOLS: false`. Donc : une image `https://hôte-externe/pixel.gif` est chargée par le navigateur du lecteur (fuite d'adresse IP, pixel de suivi) ; un `style="background:url(https://…)"` charge de même une adresse choisie par l'auteur ; pas de script ni de gestionnaire d'événement.
- **Par où un contenu d'élève arrive à un autre lecteur** (4 appelants seulement, `grep sanitizeHtml src`) :
  1. `src/lib/components/notebook/CellOutputs.svelte:272-277` (`{@html sanitizeHtml(output.data['text/html'])}`) : sortie HTML d'une cellule de carnet. Un carnet d'élève lu par un autre (prof) passe par la branche **restreinte** l. 265-271 (`htmlToText` : DOMParser inerte, texte seul), commandée par `foreignStudentNotebook` (`NotebookView.svelte:61-65,538`) et par `provideRestrictedRendering` (aussi dans `NotebookPresentation.svelte:36`, page `python-notebook/[id]/present`). Un test garde le contrat : `notebook/__tests__/cell-outputs-mime-restreint.test.ts` (chaque type MIME rendu a sa branche `isRestricted`). Le chemin non restreint ne sert donc qu'à l'auteur lui-même ou à un carnet de prof : contenu de confiance.
  2. `dashboard/teacher/message-templates/+page.svelte:802,986` et `dashboard/admin/message-templates/+page.svelte:769` : aperçu de modèles de messages, écrits et lus par le prof ou l'admin. Aucun élève n'écrit ni ne lit ces pages.
- **Vu** : aucun chemin actuel ne mène un contenu d'élève jusqu'à un autre lecteur via `sanitizeHtml`. Le piège est une mise en garde d'usage correctement documentée, pas un défaut ; le risque se rouvre le jour où un 5e appelant rendrait du contenu d'élève (aucune garde automatique n'interdit l'appel, contrairement aux types MIME). Si David veut une garde : test `grep sanitizeHtml` figeant la liste des 4 fichiers (à écrire, pas au registre).

### editeur-riche.md:163 [T] — VRAI (latent, non exploitable aujourd'hui)

- **Point** : rendu restreint des formules par liste noire (`UNSAFE_MATH_COMMANDS`) ; une macro MathLive développée en commande à attributs n'est pas rattrapée.
- **Ce que le code fait** : `src/lib/components/markdown/restricted-rendering.ts:90-137` (liste de noms : `htmlStyle`, `class`, `cssId`, `href`, `url`, `enclose`, `bbox`, couleurs, polices, dimensions, `def`/`gdef`/`let`/`newcommand`/`csname`…) ; `:166-173` : regex sur le **texte LaTeX tel qu'écrit** (`\\nom` non suivi d'une lettre). Le texte n'est jamais développé : une macro est vue sous son nom, pas sous son expansion. La garde `mathlive-commandes-a-valeur.test.ts:15-40` lit `node_modules/mathlive/mathlive.mjs` et exige que chaque commande dont la signature a un argument `:value`, `:string`, `:color` ou `:raw` soit classée (liste noire ou `REVIEWED_SAFE_MATH_COMMANDS`) : elle couvre les **commandes** à argument libre, pas les **macros** par défaut (`DEFAULT_MACROS`, `mathlive.mjs` l. ~3330 et suivantes).
- **Ce qui passe réellement** (lecture de `DEFAULT_MACROS` de la version installée, rien lancé) : les macros par défaut qui se développent en commande listée sont `\angl`, `\angln`, `\anglr`, `\anglk` (`\enclose{actuarial}{…}`), la macro `\phase`-like (`\enclose{phasorangle}{#1}`) et une macro à `\raise{4mu}` / `\rule{2mu}{1.5mu}` : valeurs **fixes** écrites par MathLive, l'élève ne choisit que le contenu `#1`. Aucune macro par défaut n'accepte un argument servant d'attribut (style, classe, URL) ; je n'en ai trouvé aucune. Donc rien d'exploitable aujourd'hui.
- **Par où un contenu d'élève atteint un autre lecteur** : (1) chat élève (rendu restreint de `MathInline.svelte:78`, `MathBlock.svelte:79`, `MathPrompt.svelte:135`) ; (2) carnet d'élève lu par le prof (`CellOutputs.svelte:225`, `text/plain` testé par `isRefusedRestrictedFormula`) ; (3) cahier de texte (blocs spéciaux : `neutralizeUnsafeBlocks`, `restricted-rendering.ts:297-308`, qui n'utilise que `hasUnsafeMathCommand`). Dans les trois cas la même regex sur le texte brut décide. Une mise à jour de MathLive qui ajouterait une macro par défaut à argument libre (ou un nouvel alias de commande) passerait sans que le test le voie, car il ne lit que `defineFunction`.
- **Registre** : T · rendu restreint · aucun effet visible aujourd'hui : un contenu d'élève formule MathLive est filtré par noms de commandes sur le texte écrit, sans développer les macros, donc une future macro MathLive à attribut libre fuirait une adresse chez le lecteur · preuve : test à écrire : lire `DEFAULT_MACROS` dans `node_modules/mathlive/mathlive.mjs` et échouer si une expansion contient une commande de `UNSAFE_MATH_COMMANDS` avec un argument `#n` en position de valeur (aujourd'hui seules des expansions à valeurs fixes sont présentes, il faudra donc les lister comme « examinées »).

### statistiques.md:300 [L] — VRAI

- **Vu** : `src/lib/ubumark/utils/stat-chart-scene.ts:677-680` : `formatTick(Math.round(value * factor) / factor, locale)`, utilisé l. 1047 pour les pourcentages du camembert (1 décimale). Sonde jetable (node, rien d'écrit dans le dépôt) : parmi les effectifs c/t avec t ≤ 200, 6 cas diffèrent de l'arrondi exact au demi supérieur, ex. 23/80 : `100*23/80 = 28.749999999999996`, `Math.round(287.49999…)` donne 287 soit « 28,7 % » au lieu de « 28,8 % » ; de même 41/80 (51,2 au lieu de 51,3) et 51/80 (63,7 au lieu de 63,8). Le doc dit « sans demi négatif » : ce n'est pas le problème, ce sont des demis positifs mal arrondis par la représentation flottante.
- **Registre** : L · statistiques · un secteur de camembert d'effectif 23 sur 80 s'étiquette 28,7 % au lieu de 28,8 % (idem 41/80, 51/80) · preuve : test à écrire : la scène d'un camembert 23/80 étiquette « 28,8 % » (passer par `Fraction` ou un arrondi exact).

### utilitaires-et-demos.md:503 [L] — VRAI

- **Vu** : `src/lib/utils/format.ts:10` `formatDuration(seconds: number)` (importée par `VictoryModal.svelte:32`, `TournamentDefeatModal.svelte:34`, `TournamentVictoryModal.svelte:35`) et `src/lib/utils/worksheet-constants.ts:113` `formatDuration(minutes: number | null)` (importée par `worksheets/MetadataCards.svelte:45`). Deux homonymes, chacun correctement appelé aujourd'hui. Aucun effet visible.
- **Registre** : L · utilitaires · aucun effet visible, deux `formatDuration` d'unités différentes (secondes / minutes), une erreur d'import passerait le typage · preuve : commande `test "$(grep -rl "export function formatDuration" src | grep -v test | wc -l)" -le 1` (sortie 1 ; fermer en renommant la version « minutes »).

### utilitaires-et-demos.md:506 [L] — VRAI

- **Vu** : `src/lib/components/MathField.svelte:19-21` : `if (value) node.value = value;`. Remettre `value = ''` ne touche pas le champ. Appelants : `atelier/DefinitionField.svelte:320` (`bind:value={latex}`), `questions/TestSpecEditor.svelte:422` (`bind:value` avec accesseurs), `dev/bancs-essai`, `dev/mots-cliquables`. Je n'ai pas lu les appelants pour savoir si l'un remet à `''` : latent tant qu'aucun ne le fait.
- **Registre** : L · composant de saisie de formule · vider la valeur liée à un champ de formule ne vide pas le champ · preuve : commande `test -f src/lib/components/MathField.svelte && ! grep -q "if (value) node.value" src/lib/components/MathField.svelte` (sortie 1).

### analytique-prof.md:248 [L] — VRAI

- **Vu** : `src/lib/server/stats/class-knowledge.ts:192-198` : un seul `from('skill_attempts').select('student_id, template_id').in('student_id', studentIds).not('template_id','is',null)`, sans `.range` ni découpage (`grep -c "range(" ` : 0). `supabase/config.toml:18` : `max_rows = 1000`. `skill_attempts` a une ligne par tentative : une classe de 25 élèves à 40 tentatives atteint 1000 ; au-delà, la requête rend les 1000 premières lignes **sans erreur**, des (élève, modèle) disparaissent et le badge « non commencée » s'affiche à tort. La requête `srs_card_stats` (l. 281-287) est découpée par modèles mais pas paginée non plus. La limite en prod est la valeur du projet Supabase (non lue : défaut 1000). Ce n'est donc pas seulement latent : plausible dès une classe active. Lettre proposée : V (cause silencieuse, effet visible).
- **Registre** : V · analytique de classe · dans la grille des points d'une classe qui a beaucoup d'essais, des modèles déjà tentés apparaissent « non commencés » parce que les essais sont lus d'un bloc, plafonnés à 1000 lignes · preuve : commande `f=src/lib/server/stats/class-knowledge.ts; test -f $f && grep -q "\.range(" $f` (sortie 1).

### statistiques.md:304 [D] — PAS UN ÉCART

- **Vu** : `src/lib/ubumark/utils/stat-chart-scene.ts:1794` calcule `binomialDistribution(n, p)` ; `src/lib/statistics/simulation.ts:130` n'offre que `discreteSampler(values, probabilities)` ; aucun `binomialSampler` dans `src`. L'état est exact, mais la simulation obtenue est correcte (probabilités exactes de la loi) ; aucun effet visible pour l'élève ni le prof. Pas de question à David : rien à décider tant qu'aucun besoin (n très grand) n'apparaît.

### utilitaires-et-demos.md:401 [D] — VRAI (décision en attente)

- **Vu** : `src/routes/(protected)/dashboard/admin/vip-cards`, `src/routes/api/admin/vip-cards`, `dashboard/admin/dictionnaire`, `src/routes/api/admin/dictionnaire` existent ; aucun équivalent sous `dashboard/teacher/`. État décrit exact.
- **Question à David** : « Aujourd'hui, c'est toi (en tant qu'admin) qui crées et modifies les cartes VIP et les mots du dictionnaire. La règle dit que le contenu pédagogique doit venir du prof. Tu veux que ce soit : (a) le prof qui les gère, avec son propre écran (par exemple, il ajoute un mot « parabole » au dictionnaire sans passer par toi) ; (b) rester chez l'admin parce que ces deux contenus font partie du jeu et du site, pas du cours ; (c) plus tard, sans date, en laissant la note ? » Registre : D · contenu pédagogique · cartes VIP et dictionnaire gérés par l'admin alors que la règle dit le prof · preuve : à la main · en attente de David.

### editeur-riche.md:179 [M] — VRAI

- **Vu** (`grep -rn` hors tests) : `getDetectedPatterns` (`markdown-detection.ts:165`), `RichTextEditorProps` (`types.ts:57`), `escapeHtmlSafe` (`html-escape.ts:76`) : définis, aucun appelant. `isAlreadyEscaped` (`html-escape.ts:63`) n'est appelé que par `escapeHtmlSafe` (l. 79) : mort par ricochet. `NotificationSanitizeConfig` (`sanitize-configs.ts:105`) : type exporté sans importeur.
- **Registre** : M · éditeur riche · aucun effet visible, 5 exports sans appelant · preuve : commande `test -f src/lib/utils/html-escape.ts && ! grep -q -e "function isAlreadyEscaped" -e "function escapeHtmlSafe" src/lib/utils/html-escape.ts` (sortie 1 ; à étendre aux trois autres noms).

### editeur-riche.md:182 [M] — VRAI (doc inexacte sur un détail)

- **Vu** : `containsDangerousHtml` est définie `src/lib/utils/sanitize.ts:159` **et** `src/lib/server/sanitization.ts:116`. Hors tests, **aucune des deux n'a d'appelant** (`grep -rn containsDangerousHtml src | grep -v test` : les deux définitions seulement) : la doc dit que celle de `server/sanitization.ts` est « celle qu'on utilise », c'est faux. `sanitizeUrl` : `utils/sanitize-url.ts:22` et une locale `utils/errorMonitoring.ts:572`, homonymes sans rapport.
- **Registre** : M · sécurité des entrées · aucun effet visible, `containsDangerousHtml` existe deux fois et ne sert nulle part · preuve : commande `test "$(grep -rl "export function containsDangerousHtml" src | grep -v test | wc -l)" -le 1` (sortie 1).

### editeur-riche.md:185 [M] — VRAI

- **Vu** : définitions de `escapeHtml` : `utils/html-escape.ts:35` (exportée), `components/markdown/utils.ts:28` (exportée), `email-templates/parental-consent.ts:22`, `whiteboard/core/pdf-export.ts:850`, `components/geometry/GeometryCanvas.svelte:468` : cinq, comme annoncé.
- **Registre** : M · utilitaires · aucun effet visible, `escapeHtml` écrit en cinq exemplaires · preuve : commande `test "$(grep -rlE "function escapeHtml\b" src | grep -v test | wc -l)" -le 1` (sortie 1).

### outils-prof.md:40 [M] — NON VÉRIFIÉ

- **Point** : `/constructions/conversion` : 0 construction au format JSON sur 9, état « résiduel ».
- **Vu** : la page existe (`constructions/conversion/+page.svelte`, 723 lignes, lien « Importer XML » dans `constructions/+page.svelte:191`) : c'est l'import XML (Instrumenpoche vers le format Chiphre), donc vivante pour l'import et pas du code mort. Le « 0 sur 9 » est un compte de la base de prod : non vérifiable ici (MCP read-only possible pour David, interdit ici).

### utilitaires-et-demos.md:405 [M] — PAS UN ÉCART

- **Vu** : `src/routes/(protected)/dev/saisie-naturelle/+page.svelte` (176 lignes) existe, liée depuis `dev/+page.svelte` ; son en-tête dit « Prototype JETABLE » mais précise qu'elle garde le panneau « sous le capot » du champ qui sert l'Atelier. C'est un choix de ménage à trancher par David, pas un défaut ; rien d'automatique à prouver.

### utilitaires-et-demos.md:407 [M] — PAS UN ÉCART

- **Vu** : `constructions/essais/+page.svelte` (212 lignes, scripts DSL du prof seul, test `essais/__tests__/page.server.test.ts`, redirection `/construction-demo` dans `redirectHandle.ts:53`) et `/constructions` (brouillons JSON/DSL enregistrés) ont des rôles distincts dans le code lu. « Doublon possible » n'est pas étayé ; rien de précis à prouver.

### utilitaires-et-demos.md:449 [M] — VRAI

- **Vu** : `src/lib/components/markdown/MarkdownRenderer.svelte:113,179,295` : prop `listNumberingOverride`, fusionnée dans la configuration ; `grep -rn listNumberingOverride src` : aucun passage de la prop par un appelant.
- **Registre** : M · rendu markdown · aucun effet visible, prop `listNumberingOverride` sans appelant · preuve : commande `test -f src/lib/components/markdown/MarkdownRenderer.svelte && ! grep -q "listNumberingOverride" src/lib/components/markdown/MarkdownRenderer.svelte` (sortie 1).

### utilitaires-et-demos.md:513 [M] — VRAI

- **Vu** (`grep -rlw <nom> src`, tests exclus, un seul fichier = la définition) : `flyAndScale` (`utils.ts:74`), `deleteChatAttachment`, `validateFileType`, `getFileIcon` (`utils/file-upload.ts:128,177` ; quatre composants redéfinissent le leur : `DocumentUpload`, `DocumentCard`, `messages/[id]`, `messages/thread/[id]`), `getFilenameWithoutExtension`, `initMathFonts`, `preloadAllFonts`, `sanitizeSearchQuery`, `RECENT_EXERCISES_LIMIT`, `MAX_SEARCH_LENGTH`, `MAX_PAGE_SIZE`. `formatNumber` de `utils/format.ts:28` : aucun importeur (trois autres `formatNumber` homonymes ailleurs). `formatDate` de `worksheet-constants.ts:87` : aucun importeur. Nuance : `MS_PER_DAY` et `DEFAULT_PAGE_SIZE` ont un mot identique dans d'autres fichiers (3 et 2 fichiers) ; je n'ai pas distingué import et redéfinition locale : à recompter.
- **Registre** : M · utilitaires · aucun effet visible, une quinzaine d'exports sans appelant · preuve : commande `test -f src/lib/utils/file-upload.ts && ! grep -q "export async function deleteChatAttachment" src/lib/utils/file-upload.ts` (sortie 1 ; une preuve par fichier serait plus nette).

### utilitaires-et-demos.md:528 [M] — VRAI

- **Vu** : `src/lib/components/JsonViewer.svelte` : aucun importeur ; `src/lib/supabase-test.ts` : importé nulle part (il importe `supabaseClient.ts`) ; `src/lib/supabaseClient.ts` : seul importeur `supabase-test.ts:7` ; `src/lib/index.ts` : un commentaire, aucun import `#lib` seul.
- **Registre** : M · utilitaires · aucun effet visible, 4 fichiers morts · preuve : commande `test -d src/lib/components && ! test -f src/lib/components/JsonViewer.svelte && ! test -f src/lib/supabase-test.ts && ! test -f src/lib/supabaseClient.ts && ! test -f src/lib/index.ts` (sortie 1).

### utilitaires-et-demos.md:534 (a, `formatDate`) [M] — VRAI

- **Vu** : `grep -rn "function formatDate\|const formatDate" src` hors tests : 82 définitions dans 78 fichiers (la doc dit 81 : à un près, l'écart vient du moment du relevé).
- **Registre** : M · utilitaires · aucun effet visible, `formatDate` recopiée 82 fois · preuve : commande `test "$(grep -rnE "function formatDate\b" src | grep -v test | wc -l)" -le 5` (seuil à fixer par David ; sortie 1 aujourd'hui).

### utilitaires-et-demos.md:534 (b, `slugify`) [M] — VRAI

- **Vu** : `utils/string.ts:20` (exportée) et `exercises/slug-generator.ts:24` (privée).
- **Registre** : M · utilitaires · aucun effet visible, `slugify` en double · preuve : commande `test "$(grep -rlE "function slugify" src | grep -v test | wc -l)" -le 1` (sortie 1).

### utilitaires-et-demos.md:538 [M] — VRAI

- **Vu** : quatre fichiers existent : `components/CodeViewer.svelte`, `components/LaTeXEditor.svelte`, `components/rich-text/MarkdownCodeEditor.svelte`, `constructions/components/JsonEditor.svelte`. « Presque identiques » : non comparé ligne à ligne (la ressemblance n'a pas été mesurée). Pas de preuve mécanique raisonnable : à la main.
- **Registre** : M · utilitaires · aucun effet visible, 3 à 4 enveloppes CodeMirror presque identiques · preuve : à la main.

### exercices.md:246 [M] — VRAI

- **Vu** : `src/lib/components/FontSelector.svelte` : aucun importeur ; `src/lib/stores/exerciseFont.svelte.ts` : importé par `FontSelector` seulement. Conséquence : la propriété `--exercise-font-family` (posée par `exerciseFont.svelte.ts:95`) n'est jamais posée, `.exercise-content { font-family: var(--exercise-font-family) }` (`src/app.css:559-575`, 3 usages de la classe dans `src`) reste sans effet réel.
- **Registre** : M · exercices · aucun effet visible, sélecteur de police d'exercice jamais affiché et règle CSS inerte · preuve : commande `test -d src/lib/components && ! test -f src/lib/components/FontSelector.svelte && ! test -f src/lib/stores/exerciseFont.svelte.ts` (sortie 1).

### editeur-riche.md:188 [C] — VRAI

- **Vu** : `src/lib/components/rich-text/config.ts:6` (« Unified from RichTextEditor.svelte and FormRichTextEditor.svelte ») et `:312` (« Subset … (FormRichTextEditor) ») ; `RichTextEditor.svelte:6` (« FormRichTextEditor (form mode) into a single component »). Le fichier n'existe plus. L. 6 des deux fichiers dit « fusionné », ce qui est exact historiquement ; la ligne 312 de `config.ts` est la vraiment périmée.
- **Registre** : C · éditeur riche · aucun effet visible, commentaire de `config.ts` qui cite un composant disparu · preuve : commande `test -f src/lib/components/rich-text/config.ts && ! grep -q FormRichTextEditor src/lib/components/rich-text/config.ts` (sortie 1).

### utilitaires-et-demos.md:416 [C] — CORRIGÉ

- **Vu** : `grep -rn calculateNewStability src` : aucun résultat ; `src/lib/srs/fsrs.ts` : `recallStability(d, s, r, grade)` (l. 162), `forgetStability` (l. 176), `shortTermStability` (l. 187) ; `fsrs.ts:239-240` choisit la formule selon la note. `docs/systeme/srs.md:463` l'annonce corrigé le 2026-11-15. La ligne du doc utilitaires est périmée.

## Vu en passant

- `docs/systeme/utilitaires-et-demos.md:513` cite `formatNumber` de `format.ts` comme sans appelant : vrai, mais trois autres `formatNumber` homonymes existent (`mathAST/common/format.ts:25`, `typst/utils/typst-utils.ts:32`, `ciphers/alphabet.ts:62`).
- `src/routes/(protected)/dashboard/admin/settings/+page.svelte:125-135` : la page de réglages est elle aussi sans accents (« Numerotation des listes », « ordonnees », « schema »).
- `docs/systeme/editeur-riche.md:100-106` (tableau) : `containsDangerousHtml` y est « aucun (doublon) » et la ligne 182 dit l'inverse du tableau pour l'exemplaire serveur : incohérence interne de la doc.
