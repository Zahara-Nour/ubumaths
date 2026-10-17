# 0023 — Copie d'une fiche : niveau de guidage choisi par affectation, jamais tiré

- **Statut** : acceptée
- **Date** : 2026-10-11 · **Décidée par** : David

## Contexte

Quatre calculs produisaient « la copie d'un élève » (écran et PDF de l'élève, lot ZIP et corrigé du
prof, aperçu d'affectation, générateur sans appelant), avec des graines et des variations
différentes. Mesuré en prod le 2026-10-11 : les 29 exercices de fiche à plusieurs versions ont tous
des **niveaux de guidage** (`guided` / `intermediate` / `autonomous`), aucun n'a de variable tirée,
et l'écran de l'élève tirait le niveau au hasard (guidé pour l'un, autonome pour l'autre) pendant
que le corrigé du prof montrait toujours le guidé. Le réglage par exercice « Mode de variante »
(aucune / individuel / N versions / groupe) n'était lu par aucun chemin vivant ; ses 398 lignes
sont à « aucune ».

## Décision

- **Le niveau de guidage se choisit à l'affectation** : guidé, intermédiaire ou autonome, **guidé
  par défaut**. Il n'est **jamais tiré au hasard**.
- Niveau absent d'un exercice : le niveau existant le plus proche **du côté le plus guidé**
  (intermédiaire manquant → guidé ; autonome manquant → intermédiaire, sinon guidé). Un exercice à
  une seule version ne change pas.
- **Différenciation par groupes de niveau** = affecter la même fiche plusieurs fois, chacune à une
  liste d'élèves choisie, avec un niveau différent. Pas de notion de « groupe » à créer.
- **Le niveau est une colonne de l'affectation.** L'élève peut lire celui de ses propres
  affectations (il le déduit de toute façon de son sujet et des étiquettes des exercices, qu'il
  lit) ; il **ne lit pas** les affectations des autres groupes, donc ni leur niveau ni leur
  composition. Aucun écran élève n'affiche le niveau. Pour des groupes de niveau, le prof vise des
  élèves nommés, et le titre de l'affectation (visible par ses élèves) reste neutre.
- La case « exercices individualisés » de l'affectation décide **même copie pour toute la classe**
  (décochée, comme l'ADR 0011) ou **une copie par élève** (cochée) — pour les **valeurs tirées**
  des exercices à variables seulement.
- La copie est **recalculée** depuis une graine, par **une seule fonction** pour tous les chemins
  (écran et PDF de l'élève, aperçu, lot ZIP, corrigé du prof) ; rien n'est enregistré par élève.
- La copie est propre à l'**affectation** : réaffecter une fiche donne d'autres tirages.
- Hors affectation (page de la fiche, cahier de texte public) : guidé par défaut ; l'aperçu du prof
  permet de choisir le niveau à imprimer.
- Le réglage par exercice « Mode de variante » est retiré de l'interface et n'est plus lu.

## Écarté

- **Tirer le niveau au hasard par élève** (comportement trouvé) : les niveaux de guidage ne se
  valent pas, c'est au prof de choisir.
- **Enregistrer la copie de chaque élève en base** (`worksheet_instances`) : recalculer depuis une
  graine suffit pour des fiches papier ; une copie suit alors les corrections de l'exercice.
- **Une copie par fiche** plutôt que par affectation : deux affectations de la même fiche
  partageraient leurs tirages.
- **Modes « N versions » et « groupe » par exercice** : jamais utilisés, et faux (l'étiquette A/B
  ne suivait pas la graine ; les « groupes » étaient des tranches d'identifiant, sans lien avec les
  groupes de la classe). L'idée des sujets A / B pourra revenir comme réglage de l'affectation.
- **Cacher à l'élève son propre niveau** (table à part, lue par une fonction privilégiée ou un
  accès administrateur) : décidé puis abandonné le même jour. Aucune de ces voies ne le cache — les
  exercices, lisibles par l'élève, portent les étiquettes `guided` / `autonomous` de toutes leurs
  versions — et toutes protégeaient seulement ce que la règle d'accès aux affectations protège déjà
  (le niveau des autres groupes).

## Conséquences

- Une migration additive (colonne de niveau sur `worksheet_assignments`) précède le code (deux PR).
- La table `worksheet_instances` (0 ligne) et les colonnes de mode de variante restent en base ;
  leur suppression est destructive et attend un chantier à part, avec l'accord de David.
- Glossaire : « niveau de guidage » ≠ « variation » (`CONTEXT.md`).

## Révision

- 2026-10-11, même séance, avant toute implémentation : l'accès au niveau passe de « lisible par le
  prof seul » à « colonne de l'affectation » (Q4 rouverte par David après vérification des règles
  d'accès : voir Écarté).
