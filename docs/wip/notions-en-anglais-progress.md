# Noms anglais des notions — journal

## Reprendre ici

_Mis à jour le 2026-11-23, à l'ouverture._

- **État** : phase 0 écrite (questions ci-dessous), rien de codé · **Prochaine action** : réponses de David aux questions 1 à 5, puis découpage · **En attente de David** : questions 1 à 5 · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-notions-en-anglais` · `feat/notions-en-anglais`

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
