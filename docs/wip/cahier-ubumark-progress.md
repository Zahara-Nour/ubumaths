# Chantier cahier-ubumark — journal

## Reprendre ici

_Mis à jour le 2026-11-06, ouverture du chantier (aucune PR)._

- **État** : phase 0 écrite, en attente de validation.
- **Prochaine action** : réponses de David aux questions Q1-Q3, puis tests rouges.
- **En attente de David** : Q1 (conversion des 4 lignes), Q2 (énigmes dedans ou à part), Q3 (ordre des PR).
- **Pièges en cours** : `InternalLink` ne connaît pas le jeton du lien public (`linkify` si) ; `transformMathHtml` a été corrigé par #2425 (formules plus vides), le chantier reste décidé.
- **Worktree / branche** : `../ubumaths-wt-cahier-ubumark` · `feat/cahier-ubumark`.

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

## Questions à David

- **Q1** — Les 4 lignes de prod : je propose un `UPDATE` (migration de données) qui retire les
  `<p>` et garde les références ; la chaîne HTML disparaît du cahier. Alternative : lecture double
  (HTML détecté → ancienne chaîne), sans toucher aux données, mais on garde les deux chemins.
- **Q2** — Énigmes (`RiddleForm` écrit du HTML, `RiddleCard` le lit en markdown) : dans ce chantier
  ou à part ?
- **Q3** — Ordre : PR 1 = code (écriture + lecture markdown, lecture double le temps de la
  conversion) ; PR 2 = migration de conversion après `deploy:prod` ; PR 3 = retrait de la lecture
  HTML.

## Historique
