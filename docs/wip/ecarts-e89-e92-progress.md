# Chantier `ecarts-e89-e92` — corriger les écarts E89 à E92

## Reprendre ici

_Mis à jour le 2026-11-27, avant l'ouverture de la PR._

- **État** : les quatre correctifs sont écrits, vérifiés à l'écran et par les tests (voir ci-dessous) · **Prochaine action** : ouvrir la PR, la merger quand la CI est verte, puis clore E89 à E92 au registre (commit de doc sur `main`, numéro de PR cité) et archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-ecarts-e89-e92`, `fix/ecarts-e89-e92`

## Décision

David, le 2026-11-27 : « corrige E89 à E92 maintenant » (écarts trouvés par la deuxième nuit de `verifs-auto`, § « Deuxième nuit » de `verifs-auto-progress.md`).

## Correctifs

- **E89** (`BugReportCard.svelte`) : la carte devient un `div` ; la case à cocher (un bouton de bits-ui) est posée à côté du bouton de la carte, plus dedans. Le contenu du bouton n'a plus que des `span` (un `h3` ou un `p` n'a pas sa place dans un bouton). Au téléphone, l'étiquette d'état passe au-dessus du titre, et le texte prend toute la largeur.
- **E90** (`ChapterSectionsEditor.svelte`) : la ligne d'un document ou d'un objectif passe à la ligne (`flex-wrap`), et le titre garde au moins 10 rem ; les boutons vont à la ligne suivante au lieu d'écraser le titre.
- **E91** (`ExerciseList.svelte`) : même chose pour la ligne d'un exercice de la fiche (titre et choix de version au moins 12 rem) ; les boutons « au survol » (modifier, indispensable, configurer, retirer) restent visibles sur un écran sans survol (`[@media(hover:none)]:opacity-100`, convention déjà en place ailleurs) et au clavier (`group-focus-within`).
- **E92** (`exercice/[slug]/+page.svelte`) : le titre est un `h1` dans les trois affichages (ordinateur connecté, téléphone connecté, visiteur).

## Vérifications

- `pnpm test:verifs` sur le serveur 5176 du worktree : `chapitres`, `versions-exercices-fiche`, `qr-codes` sous iphone et android (58 verts), plus `base-locale-paquet9` et ces trois fichiers sous le navigateur par défaut (70 verts, 1 sauté volontairement).
- `pnpm voir` (iPhone, Safari) : fiche de 38 exercices, plan d'un chapitre, signalements de bug (téléphone et ordinateur), 0 erreur de console ; `h1` présent dans le HTML de `/exercice/<slug>` pour un visiteur.
- Vu en passant, hors de ces écarts : au téléphone, la page d'un chapitre a un bandeau « Voir les signalem… » coupé à droite et un bouton « Faire un modèle » qui dépasse de la carte du titre.
