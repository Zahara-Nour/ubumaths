# Chantier `navadra` — réécriture du jeu de combats

## Reprendre ici

_Mis à jour le 2026-11-09, phase 0, rien n'est codé._

- **État** : analyse faite. David repart **de zéro**, avec un **nouveau nom** et le **lore de Chiphre**. Le principe reste le même : chaque sort ou coup se valide par une question, et les questions viennent du système de questions de Chiphre.
- **Tranché** : avatar combattant, accompagné d'un Mathou familier ; une magie ajoutée au lore (§ « Tranché »).
- **Prochaine action** : obtenir les réponses de David sur la **magie par étapes**, proposée le 2026-11-09 :
  - **Recrue**, au primaire : des coups seulement ;
  - **Apprenti**, au collège : des sorts tout faits par Province, façon Navadra ;
  - **Mage**, au lycée : la grille verbe × matière composée par l'élève ;
  - c'est **un seul moteur** : un sort tout fait est une case cachée de la grille.
- **En attente de David** : 3 questions.
  1. Le primaire est-il inclus (étape « recrue ») ?
  2. Qu'est-ce qui fixe l'étape ? Ma recommandation : le niveau scolaire l'ouvre, le jeu en débloque le contenu.
  3. Le verbe donne-t-il l'effet en combat (la matière décidant seule du domaine de la question), ou une compétence du programme ? La seconde voie demande d'étiqueter environ 1 900 modèles.
- **Restent ensuite** : la question 2 (adversaires), la question 3 (public), la question 4 (nom) et la question 5 (progression).
- **Pièges en cours** :
  - L'analyse du jeu d'origine est dans `extern/navadra-jeu/CLAUDE.md`, un fichier **non versionné**. Ce journal en reprend l'essentiel.
  - Le Compendium n'interdit que les **mots** anglais affichés (XP, level, boss, score, leaderboard ; `lore-pataphysique.md:968,1776`), **pas les mécaniques**.
- **Worktree / branche** : aucun (doc seulement, sur `main`).

## Tranché

- **2026-11-09 — Combattant = l'avatar du joueur, accompagné d'un Mathou familier** (décision de David). Les Mathoux ne combattent pas façon Pokémon. Raison : un Mathou = une notion, ce qui empêchait de travailler tout le programme. Le jeu choisit la notion, le joueur ne choisit que la Province ou la Forme du sort.
- **2026-11-09 — Ajouter une magie au lore** (idée de David), inspirée d'Ars Magica : grille verbe × matière. ⚠️ Le texte d'Ars Magica est sous CC BY-SA 4.0 (partage à l'identique, https://atlas-games.com/openars) : on s'inspire de la mécanique, **sans copier ni texte ni noms**. Piste de David : **adapter le système à l'âge**, avec la grille pour le lycée et un système simple, façon Navadra, pour le collège. En discussion.

## À trancher (posé à David le 2026-11-09)

1. **Combattants** : les **Mathoux** servent-ils de combattants (équipe de 3, chaque attaque est une question de la notion du Mathou), à la place des sorts et du grimoire ? C'est la décision du 2026-10-18 (`mathoux-conception.md:98-109`) : la confirmer ou la rouvrir.
2. **Adversaires** : des **erreurs typiques** (« le Carré Fourbe ») au service du **Czar Alexis**, ou autre chose ? Cela engage un catalogue d'erreurs rattachées aux modèles de questions, et des illustrations.
3. **Public de la première version** : quels niveaux ? Navadra visait la 6e.
4. **Nom du jeu** : David en a-t-il un, ou faut-il des propositions tirées du lore ?
5. Question rattachée à la 1 : faut-il une progression propre au jeu (niveau, prestige personnel ou limité au Bataillon), ou le stade des Mathoux suffit-il ?

## Existant dans Chiphre (portage d'octobre 2025, en pause depuis le 2026-10-13)

**Rien à garder dans le code.**

- Routes `src/routes/(protected)/dashboard/navadra/` : hub, `combat/`, `spells/`.
- `src/lib/utils/game/{combat,challenge-variables}.ts`, `src/lib/stores/game/`, `src/lib/components/game/{combat,challenges}/`.
- Les formules de combat sont **réinventées**, pas celles de l'original.
- 8 tables `game_*`, dont `game_challenges` (les 464 défis importés).
- Trigger `award_gidouilles_on_victory`, qui crédite sans écrire dans `gidouilles_activity` (écart L11).
- Prod mesurée le 2026-11-09 :
  - 79 `game_players` créés du 15 au 17/10/2025 ;
  - 13 combats ;
  - **0 tentative de défi**, 0 deck.
  - Aucune donnée n'est à conserver.
- À supprimer **après** le nouveau jeu. C'est une migration destructive : grep des usages et arrêt avant le `DROP`.

## Ce qu'on garde de Navadra et comment l'adapter (proposition, non validée)

- **Un sort = une question réussie** ; un échec n'a pas d'autre effet. On le garde.
  - Rendu par `QuestionCard` + `TestTimer`, instances générées par `generateInstance`.
  - Correction côté client, comme partout (ADR 0001). Les gains se plafonnent côté serveur (ADR 0014).
- **Round = 3 coups, puis riposte de l'adversaire.** Cela va avec l'équipe de 3 Mathoux.
- **4 éléments → 6 Provinces** (une par domaine). Un Mathou appartient à la Province de sa branche. Les faiblesses se jouent entre Provinces.
- **Pyrs et grimoire supprimés.** Les Mathoux s'obtiennent par le travail seulement : ce sont eux, les sorts. Leur stade fait la puissance.
- **Tirage adaptatif.** On reprend l'idée, branchée sur `student_point_state` : d'abord les points à remédier, puis les non acquis, puis ceux à revoir. Ce sélecteur est à écrire.
- **Équilibrage chiffré de l'original** comme point de départ : formules dans `extern/navadra-jeu/CLAUDE.md` § 5.
- **Tutoriel court** mené par Bordure (Sergent-Recruteur). Les indices viennent de Conscience.
- **Les 464 défis** servent de **réserve de contenu** pour le cycle 3 et la 6e (skill `couvrir-niveau`). Ce n'est pas un format à reprendre.
- **On abandonne** :
  - les saisons et le classement ouvert ;
  - le chat, la messagerie et les questions créées par les joueurs ;
  - le multijoueur hors de l'école.

## Idées d'ajouts (proposition)

1. Gagner avec un Mathou en sieste vaut **révision** : il se réveille.
2. Un point « à remédier » fait venir le monstre de son erreur : la remédiation se fait en jouant.
3. **Bataille de Bataillon** : le prof lance un adversaire commun à la classe, avec des PV partagés sur une semaine. Coopératif, dans l'école seulement.
4. **Campagne des 6 Provinces**, avec une bataille de fin menée par le gouverneur. La dernière bataille se joue au palais d'Hiver, pendant la « Mobilisation Générale » avant le brevet ou le bac.
5. Les Palotins donnent des indices selon leur caractère : Quatrezoneilles (relis l'énoncé), Mousched-Gogh (fais une figure), Giron (reviens aux bases).
6. Gidouilles versées par une RPC serveur plafonnée, sur le modèle de `record_game_reward` et `gidouilles_activity`.

## Contraintes repérées

- Il faut des **questions rapides** : une case, un QCM, du calcul court. Aucun champ ne mesure aujourd'hui la durée ou la difficulté d'un modèle ; un filtre est à concevoir.
- Couverture des modèles publiés (2026-11-09) :
  - 6e : 173 ; 5e : 167 ; 4e : 123 ; 3e : 82 ;
  - primaire : de 109 à 185 selon le niveau.
- Les liens entre modèles et points travaillables (`question_template_points`) **ne sont pas dans le cache public** `templates/all` : il faut une lecture dédiée.
- Ton :
  - jamais « faux » ni « boss » ;
  - « Tu as dévié », « Coup de Maître » ;
  - seul le Czar peut dire « mauvais » ;
  - le Czar n'est jamais monstrueux, et on ne nomme aucun pays réel.

## Historique

- **2026-11-09** :
  - dépôt `Navadra/navadra-jeu` ajouté à `extern/repos.md` (`ecafc4520`) ;
  - analyse du jeu d'origine dans `extern/navadra-jeu/CLAUDE.md` (non versionné) ;
  - état des lieux du portage, du lore et du système de questions ;
  - propositions et 4 questions posées à David.
