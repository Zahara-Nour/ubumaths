# Noms anglais des notions — journal

## Reprendre ici

_Mis à jour le 2026-11-24, PR 2 en cours (avant ouverture)._

- **État** : PR 1 mergée (#3099), migration en prod ; PR 2 codée sur `feat/notions-en-anglais-pdf` (noms anglais au PDF, règle « un nom manque → catégorie seule », signalement dans l'éditeur, doc `fiches-et-pdf.md`), tests verts, tout commité (pas encore poussé) ; revues `code-reviewer` et `security-auditor` faites, aucun bloquant, retenus : borne Zod 400 (UTF-16), `withBranches` ne renvoie plus le jsonb brut ; écartés : écart 9 (documenté), `translations` lu par tous les appelants de `loadActiveNodes`, `/*` non échappé par `escapeTypst` (déjà avant, noms écrits par l'admin seul) · **Prochaine action** : `git merge origin/main`, `check:incremental`, tests ciblés, pousser, ouvrir la PR 2, `pnpm pr:merger` ; puis PR 3 — traductions (~640 noms, page à cocher, migration de données) · **En attente de David** : rien · **Pièges en cours** : écart 9 réduit, pas disparu (fiche anglaise sans catégorie + un nom sans anglais → `title`) jusqu'à la PR 3 · **Worktree / branche** : `../ubumaths-wt-notions-en-anglais`, `feat/notions-en-anglais-pdf`

## L'idée

Suite du chantier `categorie-fiche` (clos le 2026-11-22, ADR 0041, décision 5) : une fiche en
anglais sans titre libre doit imprimer ses notions **en anglais** (« Sequences · Technical
practice »). Aujourd'hui elle imprime la catégorie seule, et `title` (français) quand elle n'a pas
de catégorie — écart 9 de `docs/systeme/fiches-et-pdf.md`.

## Relevé (2026-11-23)

- **Arbre en prod** : 19 branches, 134 notions actives (137 en tout), 484 sous-notions actives
  (555). Un nœud n'a qu'un nom, en français (`classification_nodes.name`).
- **Qui écrit l'arbre** : l'admin seulement (RLS `is_admin()` en écriture), en pratique par
  migration ; tout le monde lit les noms (anon compris).
- **Fiches** : 50 en prod, 27 ont une version anglaise (`worksheets.translations.en`), dont 24
  au titre composé. Ces 27 fiches utilisent **14 notions et 1 sous-notion**.
- **Code** : `src/lib/worksheets/worksheet-title.ts` (`printedTitle`, `CATEGORY_LABELS` fr/en) ;
  les noms des nœuds arrivent au PDF par `src/lib/server/worksheets/worksheet-classification.ts`
  (`loadWorksheetClassifications`, `loadBranches`) et par les deux fonctions SQL des liens de
  partage.

## Questions de phase 0

1. **Quels nœuds traduire ?** Les notions, les sous-notions, et aussi les **branches** :
   deux notions d'une même branche impriment la branche en titre (« Suites » → « Sequences »).
   Reco : les trois.
2. **Tout l'arbre ou seulement ce qui sert ?** Tout l'arbre = ~640 noms à traduire et relire ;
   ce qui sert aux fiches anglaises = 15 nœuds (+ leurs branches). Exemple : « Généralités sur
   les suites » sert, « Triangles semblables » (collège) non. Reco : tout l'arbre, proposé par
   moi en un lot, relu sur une page à cocher — une fiche anglaise future ne tombera pas sur un
   trou.
3. **Qui écrit et corrige les noms anglais ?** Aujourd'hui seul l'admin écrit l'arbre (par
   migration). Reco : pareil pour l'anglais (lot de traduction = migration), pas d'écran
   d'édition. Autre choix : un écran où le prof corrige un nom anglais.
4. **Où les ranger ?** A — une colonne « nom anglais » sur le nœud ; B — un champ de
   traductions comme celui des fiches (`translations.en.name`), prêt pour une autre langue.
   Reco : B, comme les fiches. Question d'accès : **qui pourra lire quoi qu'il ne lisait pas
   avant ?** Personne de nouveau : les noms anglais se lisent comme les noms français
   (tout le monde, visiteur compris), rien de personnel.
5. **Nœud sans nom anglais sur une fiche anglaise** : A — catégorie seule, comme aujourd'hui
   (rien d'imprimé en français) ; B — le nom français à la place. Exemple : « Loi géométrique »
   pas encore traduite → A imprime « Technical practice », B imprime « Loi géométrique ·
   Technical practice ». Reco : A, avec une garde qui signale les nœuds sans anglais.

**Réponse de David (2026-11-23)** : « je suis tes recos » — les cinq recommandations sont
retenues : (1) branches, notions et sous-notions ; (2) tout l'arbre, proposé en un lot, relu sur
une page à cocher ; (3) l'admin, par migration, sans écran ; (4) stockage B, champ de traductions
`translations.en.name` sur le nœud, question d'accès tranchée (personne ne lit rien de nouveau,
les noms anglais se lisent comme les noms français) ; (5) nœud sans anglais → rien en français,
catégorie seule, avec un signalement.

## Comportements (à valider)

Fiche d'exercices en anglais, sans titre libre :

- **Nominal** : notion « Suites arithmétiques » (« Arithmetic sequences »), catégorie
  Entraînement technique → titre « Arithmetic sequences », « technical practice » en petit
  dessous, bas de page « Arithmetic sequences · Technical practice ».
- **Branche** : deux notions de « Suites » → « Sequences » en grand, les deux notions anglaises
  dessous, la catégorie en petit ; bas de page « Sequences · Technical practice ».
- **Limite — un nom manque** : il suffit qu'**un** des noms à imprimer (notion ou branche) n'ait
  pas d'anglais pour qu'on n'imprime **aucune** notion : catégorie seule, comme aujourd'hui.
  Jamais de mélange français / anglais.
- **Limite — fiche française** : rien ne change.
- **Signalement** : dans l'éditeur, une fiche qui a une version anglaise et une notion sans nom
  anglais affiche sous ses notions « Sans nom anglais : Loi géométrique — la version anglaise
  n'imprimera pas les notions ».
- **Erreur** : un nom anglais vide est refusé par la base, comme un nom français (`btrim(name) <> ''`) ;
  la base n'impose pas de longueur aux noms français, pas davantage aux noms anglais.

## Découpage (à valider)

1. **PR 1 — ADR 0043 + migration** : champ de traductions sur les nœuds (vide par défaut, forme
   vérifiée par la base), les deux fonctions des liens de partage rendent aussi le nom anglais
   des notions ; tests d'intégration rouges puis verts ; `db:migrate`, `db:types`.
2. **PR 2 — code** : PDF anglais avec les noms anglais (notions, branche, tous les chemins :
   éditeur, élève, partage, corrigé), règle « un nom manque → catégorie seule », signalement
   dans l'éditeur ; doc `fiches-et-pdf.md` (écart 9 retiré).
3. **PR 3 — traductions** : je propose les ~640 noms, page à cocher pour la relecture, puis
   migration de données (remplit les traductions, n'efface rien) après tes réponses. Elle peut
   se faire en parallèle de la PR 2.

### 2026-11-24 — PR 1

- Comportements et découpage validés par David (« go »).
- Fonctions de partage en prod = dépôt (md5 identique prod / local, 2026-11-24) : corps repris de
  `20261119182829_titre_libre_fiche.sql`, une clé ajoutée (`classifications[].translations`).
- Preuve rouge : 17 tests rouges sans le fichier de migration ; verts avec (59, et 218 sur les
  10 fichiers de partage, d'arbre et de notions).
- Piège attrapé : `{"en": {}}` passait le CHECK (clé absente → NULL) → `coalesce(…, false)`.
- Revues : `code-reviewer` (Sonnet) et `security-auditor` (Opus), aucun bloquant ; retenus :
  200 caractères au plus, blancs (tabulations, retours à la ligne) refusés, seule `en` vérifiée
  (commentaire). Pour la PR 2 : échapper le nom anglais au PDF.
- CI de #3099 : deux rouges corrigés — `database.ts` doit suivre les migrations de la branche
  (`pnpm db:types` dans la PR même) ; trois fixtures de nœuds de test sans `translations`.
- Mergée le 2026-11-24 ; `migration list --linked` : seule `20261124180821` en attente ;
  `db:migrate` joué, vérifié en prod par le MCP (lecture).

### 2026-11-24 — PR 2

- `worksheet-title.ts` : `englishName`, `branchNodeOf`, `missingEnglishNames` ; `printedTitle` imprime
  les noms anglais (branche commune décidée sur les noms français : deux branches traduites pareil
  restent deux branches). Lectures : `loadBranches` rend `{ name, name_en }`,
  `loadWorksheetClassifications` et `withBranches` ajoutent `name_en` / `branch_en` ; schémas Zod de
  réponse élargis (fiche, PDF élève, lien du cours : `translations` gardé pour `withBranches`).
- Éditeur : `TreeNode.translations` (lu par `loadActiveNodes`), une notion ajoutée porte son
  `name_en` ; `MetadataCards` signale les noms manquants (fiche anglaise au titre composé).
- Preuves rouges : 11 tests de titre sans le code, 2 tests de PDF compilé sans le générateur.
  Verts : unitaires, intégration (58, dont lecture des noms anglais), `check:incremental`,
  `types:cliquet`, `lint:fast`.
- Écran (`pnpm voir`, base locale, fiche brouillon passée en anglais puis remise) : signalement
  « Sans nom anglais : Ensembles de nombres… » affiché, disparu une fois la notion traduite.
