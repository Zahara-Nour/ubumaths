# Chantier cahier-ubumark — journal

## Reprendre ici

_Mis à jour le 2026-11-08, après #2453._

- **État** : PR 1, 1b en prod (0.76.0) ; PR 2 (#2444) mergée, migration appliquée en prod le 2026-11-08 ; PR 3 (#2453, retrait de la lecture HTML) **mergée, pas encore en prod** (sans risque : 0 ligne HTML en base).
- **Prochaine action** : PR 4 = énigmes (`RiddleForm` écrit du HTML, `RiddleCard` le lit en markdown ; 2 énigmes en prod, en HTML) — phase 0 à écrire et faire valider.
- **En attente de David** : vidéo dans une liste ou une citation jamais rendue (`ListNode`, `Blockquote`, partout) — PR à part avant la PR 4, ou `outils-manquants.md` ?
- **Pièges en cours** : `db:migrate` refusé par le classifieur du mode auto → David le lance ; migration plus ancienne que la dernière distante → `--include-all` (`--dry-run` d'abord) ; `Doc-inchangée:` dans un COMMIT ; job navigateur de la CI qui plante tests verts (`wrapDynamicImport`) → `gh run rerun <run> --failed` ; cookies partagés sur `localhost` → `cahier.localhost:5178`.
- **Worktree / branche** : aucun ; PR 4 → nouveau worktree `../ubumaths-wt-cahier-ubumark` depuis `origin/main`.

## Décision d'origine

David, 2026-10-25 (voie 2, PR #1723) : le cahier de texte (`class_journal_entries.lesson_content`,
`journal_entry_homework.content`) passe du HTML à ubumark — `bind:markdownValue` à l'écriture,
`MarkdownRenderer` à la lecture. Voir aussi `docs/systeme/editeur-riche.md` § Écarts connus.

## État des lieux (2026-11-06)

- **Écriture** : `teacher/cahier-texte/[classId]/[date]/+page.svelte` (l. 635 et 692,
  `bind:htmlValue`).
- **Lecture** : page élève `student/cahier-texte/[entryId]/+page.svelte` (l. 103) et lien public
  `(public)/cahier/[token]/+page.svelte` (l. 41) : `{@html linkifyResourceReferences(transformMathHtml(…))}`.
- **Aperçus** : `JournalWeekGrid.svelte` (`stripHtml` = `referencesToLabels` + retrait des balises),
  `HomeworkCard.svelte` (`truncateContent`, retrait des balises).
- **Couverture du programme** : `server/curriculum-coverage.ts` extrait les `[[…]]` du texte
  brut — indifférent au format.
- **Appelants restants de `transformMathHtml` / `linkify` après le chantier** : `/demo/editeur`
  seulement (+ tests).
- **Rendu des références en markdown** : `InternalLink.svelte` prend `role` et `classId`, **pas
  de `shareToken`** → à ajouter pour le lien public.
- **Prod** (MCP lecture seule, 2026-11-06) : 2 séances, 2 travaux, tous en HTML, aucune formule,
  tous contiennent des références `[[worksheet:…|…]]`. Contenu = uniquement des `<p>` (dont des
  vides) autour de références. Conversion = retirer les `<p>`, séparer par une ligne vide :
  **rien n'est perdu** sauf les paragraphes vides.

## Phase 0 — comportements

### Nominal

1. Le prof écrit une séance ou un travail avec texte mis en forme, formule, référence → enregistré
   en ubumark.
2. L'élève (page élève) lit le texte mis en forme, les formules rendues, les références en liens
   vers sa route élève.
3. Le lien public `/cahier/[token]` rend la même chose ; les références passent par le jeton.
4. Le prof rouvre la séance : l'éditeur recharge le markdown sans perte (formule, référence, gras,
   listes).
5. Aperçus (grille de la semaine, carte de travail) : texte brut, sans `**`, `$`, ni `[[…]]` —
   libellés des références seulement.
6. La couverture du programme continue de voir les références citées.

### Limites

7. Contenu vide → rien d'affiché (pas de bloc vide).
8. Texte saisi contenant `<script>` ou une balise : affiché comme du texte, jamais exécuté
   (`MarkdownRenderer` ne fait pas de `{@html}` du contenu).
9. Référence vers une ressource supprimée / inconnue : texte inerte, comme aujourd'hui.

### Erreurs

10. Aucune nouvelle entrée serveur : la validation Zod existante (`validation/journal.ts`) garde
    ses bornes de longueur.

### Question d'accès

Aucune : mêmes colonnes, mêmes policies, mêmes lecteurs. Le changement est de format, pas d'accès.

## Décisions de David (2026-11-06)

- **Vidéos** (audit de #2435, N1) : au cahier, vidéos de notre stockage seulement ; les autres, **YouTube compris**, deviennent un lien.

- **Q1** : convertir les 4 lignes (migration de données, avant/après montrés au moment de l'écrire).
- **Q2** : énigmes dans ce chantier, PR 4 à part (2 énigmes en prod, toutes deux en HTML).
- **Q3** : ordre PR 1 code + lecture double → `deploy:prod` → PR 2 conversion → PR 3 retrait HTML → PR 4 énigmes.
- Jeton du lien public : ajouté au rendu des références (`InternalLink`), pas de rendu à part.

## Questions à David (posées le 2026-11-06, tranchées ci-dessus)

- **Q1** — Les 4 lignes de prod : je propose un `UPDATE` (migration de données) qui retire les
  `<p>` et garde les références ; la chaîne HTML disparaît du cahier. Alternative : lecture double
  (HTML détecté → ancienne chaîne), sans toucher aux données, mais on garde les deux chemins.
- **Q2** — Énigmes (`RiddleForm` écrit du HTML, `RiddleCard` le lit en markdown) : dans ce chantier
  ou à part ?
- **Q3** — Ordre : PR 1 = code (écriture + lecture markdown, lecture double le temps de la
  conversion) ; PR 2 = migration de conversion après `deploy:prod` ; PR 3 = retrait de la lecture
  HTML.

## Historique

### 2026-11-06 — PR 1

- `src/lib/journal/content.ts` : `isLegacyHtmlContent` (balise de bloc en tête), `journalContentPreview` (aperçu, 4 appelants).
- `internal-link-context.ts` + prop `internalLinks` de `MarkdownRenderer` : le rôle n'arrivait jamais à `InternalLink` (toujours élève) ; le contexte porte rôle, classe, jeton.
- `JournalContent.svelte` : markdown → `MarkdownRenderer` ; HTML hérité → ancienne chaîne.
- Page prof : `getMarkdown()` de chaque éditeur dans le `use:enhance` (la liaison markdown a un délai de 150 ms) ; HTML hérité chargé par `htmlValue`, réenregistré en markdown.
- Vérifié dans le navigateur (base locale) : saisie + enregistrement immédiat (dernier mot gardé) ; séance HTML → élève OK → réenregistrée en markdown ; formule rendue, `<b>` tapé reste du texte ; lien public → `/cahier/<jeton>/fiche/<id>`.
- Preuve rouge : sans la modif d'`InternalLink`, 2 tests du lien public échouent.
- Revue de code : 1 bloquant corrigé — `getMarkdown()` rend `''` avant la création de l'éditeur, un clic pendant le chargement effaçait la séance. `isReady()` exporté par `RichTextEditor`, repli au contenu chargé, champs cachés remis (repli sans JS). Test rouge puis vert ; réessayé dans le navigateur.
- Audit sécurité : rien de bloquant. N2 (`classId` non validé dans `InternalLink`) corrigé, test rouge puis vert. N1 (vidéo tierce sur le lien public) → écart 12, question à David.
- #2435 mergée le 2026-11-06 (conflit de la ligne « Vérifié » d'`ubumark.md` résolu ; job navigateur relancé une fois, plantage connu).

### 2026-11-06 — PR 1b (vidéos)

- `provideProjectMediaOnly` (`restricted-rendering.ts`) + prop `projectMediaOnly` de `MarkdownRenderer`, passée par `JournalContent` ; `VideoDisplay` rend un lien `external-media` (`rel="noopener noreferrer nofollow"`, `target=_blank`) pour toute vidéo hors stockage Supabase, YouTube → `youtube.com/watch?v=…`.
- Tests rouges puis verts (4) ; hors cahier, inchangé (test). Navigateur (lien public) : 0 `<video>`/`<iframe>`, 0 requête vers l'hôte tiers ou YouTube ; liens sur leur propre ligne.
- Revue de #2442 : aucun bloquant. Mineurs non traités : lien `href="#"` si `sanitizeUrl` refuse l'adresse (inoffensif) ; pas de test pour une vidéo imbriquée (liste, citation via `StaticBlockNode`) ni pour `data:`, `//hôte`, adresse relative (le code les gère) — à ajouter à la PR 3, qui retouche ces tests.

### 2026-11-06 — PR 2 (conversion des 4 lignes)

- Prod relue (MCP, lecture seule) : les 4 lignes de l'état des lieux, inchangées.
- Migration : `<p></p>` retirés, `</p><p>` → ligne vide, `<p>`/`</p>` d'extrémité retirés. Garde : ne convertit que des `<p>` autour d'un texte sans caractère qu'ubumark lirait autrement (chevron, esperluette, étoile, tiret bas, dollar, accent grave, barre oblique inverse, dièse), hors références ; si une ligne HTML reste, `raise exception`. Triggers `updated_at` coupés. Rollback = les 4 valeurs d'avant, en commentaire.
- Testé en local dans une transaction annulée : cas de prod convertis, ligne déjà ubumark intacte, `updated_at` gardé ; `<p>a **b**</p>` et `<ul>` → exception.
- Revue (code-reviewer) : rien de bloquant ; garde renforcée — forme entière `<p>…</p>` exigée (du texte hors `<p>` passait), résultat vide refusé (contrainte `not_blank`), marques de liste / citation / bloc de code, `| ~ ^ [ ]` et entités dans un libellé refusées, fonctions `pg_temp` supprimées avant le commit. 4 formes de prod acceptées, 14 pièges refusés (mesuré en local).
- Test de rendu (`JournalContent`) sur la sortie exacte pour la séance à deux références : deux paragraphes, deux liens.
- Garde doc de la CI : `docs/systeme/base-de-donnees.md` couvre les migrations → `Doc-inchangée:` (schéma inchangé, migration de données seule). En local, `docs:check-a-jour` ne voit que les commits, pas l'index.
- Avant / après (prod) :
  - séance 9e9e75aa : `<p>[[…|Evaluation : Produit scalaire]]</p><p></p><p>[[…#2,4,5|… ex. 2, 4 et 5]]</p><p></p>` → `[[…|Evaluation : Produit scalaire]]` + ligne vide + `[[…#2,4,5|… ex. 2, 4 et 5]]`
  - séance 5e44b047, travaux abd84575 et 77c58e2c : `<p>[[…]]</p>` (± `<p></p>`) → `[[…]]`

### 2026-11-08 — PR 2 appliquée en prod

- Prod relue juste avant (MCP) : les 4 lignes du rollback, aucune autre ligne HTML. `migration list --linked` : seule `20261106164230` en attente, plus ancienne que deux distantes → `--dry-run --include-all` (elle seule), puis `pnpm db:migrate --include-all` lancé par David (refusé au classifieur).
- Après : 4 lignes en ubumark, identiques à l'avant/après prévu ; `updated_at` inchangés ; 0 ligne contenant une balise.

### 2026-11-08 — PR 3 (retrait de la lecture HTML)

- Retirés : `isLegacyHtmlContent` et la branche HTML de `journalContentPreview` (`content.ts`), la branche `{@html}` de `JournalContent`, `editorInput` de l'éditeur de séance (l'éditeur charge `markdownValue`). `linkifyResourceReferences` reste (page `/demo/editeur`).
- Tests rouges puis verts : une ligne à l'ancienne forme HTML s'affiche en texte (`<strong>` littéral) ; module sans détection HTML. Mineurs de la revue #2442 ajoutés : `//hôte`, adresse relative → lien, `data:` → ni vidéo ni lien `data:`.
- ⚠️ Constat : une vidéo dans une liste ou une citation n'est **jamais rendue** — l'arbre ubumark la porte (`list-item` / `blockquote` → `video`), mais `ListNode` et `Blockquote` n'ont pas de cas `video`. Vrai partout (cours compris). Côté cahier, rien n'est chargé (testé). Question à David.
- Mergée (#2453) le 2026-11-08 ; revue (code-reviewer) sans bloquant ; job navigateur relancé une fois (plantage connu).
