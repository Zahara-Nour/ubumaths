# Bouton retour — uniformisation

Chantier ouvert et clos le 2026-10-11 (#1115 → #1118, puis les suites ci-dessous). Règle : [composants-ui.md § BackLink](../../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire).

## Décisions de David (2026-10-11)

1. Le bouton mène à la **page parente, lue dans l'adresse** — jamais l'historique (l'hybride « page d'avant si elle est sur le site » a été écarté).
2. Position : **au-dessus du titre**, lien avec texte (pas de flèche seule à gauche du titre).
3. Page en pleine activité : **« Quitter »**, destination = page parente.
4. Fil d'Ariane : arborescences de plus de deux niveaux seulement, jamais avec un bouton retour.
5. Périmètre : **tout convertir**, une PR par espace.

## État des lieux (2026-10-11)

~110 boutons retour (heuristique : flèche ou ← près de « Retour », d'un lien ou d'une navigation) :
77 icône + texte, 33 icône seule ; 59 liens `href`, 50 `goto()` au clic, 2 `history.back()` ;
46 au-dessus du titre, 32 à gauche du titre, 32 ailleurs (fins de parcours, fenêtres).

## Lots

| Lot | Périmètre                                                                                          | Branche / PR                    | État |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------- | ---- |
| 1   | `BackLink` + règle + espace prof (`dashboard/teacher/**`)                                          | `refactor/bouton-retour`        | fait |
| 2   | Espace élève (`dashboard/student/**`, `dashboard/revisions/**`, `dashboard/navadra/**`)            | `refactor/bouton-retour-eleve`  | fait |
| 3   | Admin + pages protégées hors dashboard (messages, notebooks, constructions, tableur, organisation) | `refactor/bouton-retour-admin`  | fait |
| 4   | Pages publiques + composants partagés (`components/test/`, `srs/`, `student/worksheets/`)          | `refactor/bouton-retour-public` | fait |

## Lot 1 — espace prof (fait)

- 35 pages converties en `BackLink` (flèche seule, `goto()` au clic, libellés « Retour » seuls).
- 8 sous-pages qui n'avaient aucun retour en reçoivent un : énigmes (édition, création, statistiques, énigme du jour, validations), nouvel exercice, email de bienvenue, tournois de démineur.
- Exercice sans `?fiche=` : « Retour aux Corvées » (avant : aucun bouton).
- Fil d'Ariane retiré du cahier de texte (date) et du journal d'un élève.
- `confirmLeave` ajouté à `BackLink` : l'édition d'un deck SRS demandait déjà confirmation avant de partir avec des modifications non enregistrées ; le lien garde cette garde.
- Hors règle, laissés tels quels : « Retour » d'un panneau interne (fiche → affectation sélectionnée), « Retour à l'édition » (bascule de mode), « Retour à la période actuelle », « Retour aux Bataillons » en fin d'envoi de l'email de bienvenue (action de fin).

## Lot 2 — espace élève (fait)

- 20 pages converties : contrôles, cahier de texte, compétences, objectifs, cours, échanges du marché, démineur (statistiques, tournoi), énigmes (énigme, archives, historique, classement), Navadra (combat, grimoire), révisions (création, deck, programme).
- **« Quitter »** : exercice en cours (`student/exercises/[id]`), session de révision d'un deck et d'un chapitre. Le bouton de fin de session dans `ReviewSession` est hors règle et reste tel quel.
- Fil d'Ariane retiré du cahier de texte élève ; le bouton du bas « Retour au cahier de texte » devient un vrai lien.
- Démineur : « Retour au jeu », à droite du titre, devient « Retour au démineur » au-dessus du titre.
- Hors règle, laissés tels quels : combat Navadra (« Abandonner le combat », « Retour au hub » après la victoire), pagination (`devoirs`, `materials`, `worksheets`).

## Lot 3 — admin et pages protégées hors tableau de bord (fait)

- 18 pages converties : constructions (détail, édition, création, conversion), erreurs, statistiques des templates, questions (édition, création, aperçu), organisation d'une école, démineur multijoueur, messages (message, fil), kanban, notebook Python (notebook, résultats), tableur.
- **Pages de la navigation principale** : « Signalements » (admin et utilisateur) perdent leur bouton retour.
- **Fil d'Ariane gardé** (arborescence profonde), boutons retour en double retirés : migration admin (sous-domaine, édition d'une question), documentation admin. Sur la doc, « ← Précédent » (`history.back()`) est retiré ; « Retour à l'index » devient un vrai lien.
- Messages : « Retour à la boîte de réception » sur un message introuvable devient un vrai lien.

## Lot 4 — pages publiques et composants partagés (fait)

- **« Quitter »** dans l'en-tête des tests d'automatismes et des contrôles (`TestInteractive`, `TestCourse`, `ClassroomSeries`) et de la fiche en cours (`WorksheetHeader`). Destination calculée par le composant : « Mes contrôles » en contrôle, le panier sinon (même destination qu'avant). Les boutons de fin de série gardent `onBack`. Tests ajoutés (preuve rouge faite).
- Converties : panier, cahier de texte public (fiche), exercice public (trois mises en page), exercices Python (élève, résultats, résultat d'un élève, édition, création), démos (17 pages).
- Garde `src/lib/__tests__/bouton-retour-sans-historique.test.ts` : aucun `history.back()` hors page d'erreur.
- Hors règle, laissés tels quels : retour mobile du chat (bascule d'affichage), « Quitter (Échap) » de la présentation de notebook, fenêtres de fin de tournoi, `ReviewSession` (fin de session), pages d'authentification (« Retour à la connexion » dans la carte), annuler/jouer dans 2048 et Mathémo, démo des cartes VIP (page au style propre).

## Cas douteux à soumettre à David

- **Journal d'un élève** (`teacher/students/[id]/journal`) : s'ouvre depuis l'accueil, les récompenses et les classes. Le retour mène aux récompenses, comme avant. Faut-il un retour qui suit l'origine (paramètre dans l'adresse) ?
- **Pages prof sans retour et sans parent évident** — ni dans la navigation, ni dans un onglet :
  - `teacher/srs/decks` : ouverte depuis l'accueil seulement → « Retour à l'accueil » ?
  - `teacher/settings/google` : ouverte depuis les classes, la page Google, le tiroir de fichiers du tableau blanc → plusieurs parents.
  - `teacher/competences/export` : ouverte depuis les analytics d'une classe, mais le lien ne transmet pas la classe (la page accepte `?class=`).
  - Espace élève, pages-carrefours sans retour : `student/assessments`, `exercises`, `riddles`, `worksheets`, `devoirs`, `materials`, `classroom`, `journal`, `reports`, `minesweeper/achievements`, `minesweeper/tournaments`, `revisions`, `navadra`. Elles s'ouvrent depuis l'accueil, « Mon travail » ou des notifications → « Retour à l'accueil » / « Retour à mon travail », ou rien ?
  - Admin et outils sans retour : pages de débogage (`admin/debug/*`), `admin/backup`, `admin/friendships`, `admin/import-students`, `admin/notifications`, `admin/message-templates`, `admin/classes/composer`, `admin/errors`, `admin/migration`, `elevate`, `tutor-stats`, et les outils (`calculatrice`, `whiteboard`, `tuteur`, `organisation/pomodoro`, `games/leaderboards`, `test-exercises`). Parent = le tableau de bord admin / l'accueil ?
  - **Notebook Python** (`python-notebook/[id]`) : « Retour aux notebooks », y compris pour l'élève qui le remplit. Faut-il « Quitter » côté élève ?
  - **Liens de retour au style éditorial** : « ← Le Shtam » (article de la gazette) et « ← Le Cabinet Noir de Turingrad » (chiffrement) gardent leur typographie propre. Les passer en `BackLink` ?
  - **Exercice Python partagé** (`python-exercises/[id]`) : ouvert par un lien partagé, pas de page parente → aucun retour.
  - **Session de révision d'un deck** (`revisions/decks/[id]/study`) : « Quitter » mène à `/dashboard/revisions`, comme avant. La session part de la page du deck ou du Programme : faut-il revenir au deck (et passer l'origine dans l'adresse) ?
  - **Tournoi de démineur** (élève) : « Retour aux tournois » devient « Quitter » pendant une partie (#1117).
  - **Quitter un contrôle noté** ne demande aucune confirmation (déjà le cas avant). `confirmLeave` le permettrait : le veux-tu ?
  - **Flash-cards** (`FlashSeries`) : aucune sortie pendant l'activité, alors que les trois autres formes d'automatismes ont « Quitter ». En ajouter une ?
  - **Création d'un exercice Python** (`python-exercises/new`) : retour vers « Mes exercices Python » (entrée de la navigation), alors que `/python-exercises` y mène aussi.
  - **Énigme du jour** (`student/riddles/[id]`) : traitée comme une page de détail (« Retour aux énigmes »), pas comme une activité (« Quitter »).
  - Aucun lien trouvé vers : `consent`, `documents`, `google`, `message-templates`, `notifications`, `presques-evaluations`, `wheel` (menus, liens construits, ou pages mortes ?).

## Cas tranchés par David (2026-10-11) — suites livrées

1. **Pages-carrefours** : pas de bouton retour (critère ajouté à la règle). Le vrai manque — des listes sans aucune entrée (énigmes, fiches, contrôles côté élève) — part en ticket.
2. **Journal d'un élève** : retour vers les classes, ou vers l'accueil s'il a été ouvert de là (`?depuis=accueil`). L'ancien retour menait aux récompenses, qui ne lient jamais vers le journal.
3. **Quitter un contrôle noté** : confirmation (réponses tapées perdues ; chrono qui court en course). Pas en entraînement.
4. **Flash-cards** : « Quitter » vers le panier pendant la série.
5. **Session de révision** : « Quitter » ramène au deck, ou au Programme (`?depuis=programme`).
6. **Shtam et Cabinet Noir** : liens éditoriaux gardés, exception écrite dans la règle.

Restent sans retour, conformément au critère des carrefours : les pages-carrefours listées plus haut, et l'exercice Python partagé (ouvert par un lien, sans parent).
