# Chantier `navadra` — réécriture du jeu de combats

## Reprendre ici

_Mis à jour le 2026-11-09, phase 0, rien n'est codé._

- **État** : analyse faite. David repart **de zéro**, avec un **nouveau nom** et le **lore de Chiphre**. Le principe reste le même : chaque sort ou coup se valide par une question, et les questions viennent du système de questions de Chiphre.
- **Tranché** : avatar combattant, accompagné d'un Mathou familier ; une magie ajoutée au lore (§ « Tranché »).
- **Tranché aussi** : la magie par étapes (recrue, apprenti, mage), avec un seul moteur. Voir § « Tranché ».
- **Tranché aussi** : les adversaires sont des **Bêtes imprévues**, un bestiaire imaginaire par Province ; le Czar ne vient qu'aux grandes batailles. Voir § « Tranché ».
- **Prochaine action** : la **riposte** (une frappe simple, ou une esquive par une question ?), puis les questions 4 (nom) et 5 (progression).
- **En attente de David** : la riposte, puis les questions 4 et 5. La question 3 (public) est réglée : du primaire au lycée.
- **Pièges en cours** :
  - L'analyse du jeu d'origine est dans `extern/navadra-jeu/CLAUDE.md`, un fichier **non versionné**. Ce journal en reprend l'essentiel.
  - Le Compendium n'interdit que les **mots** anglais affichés (XP, level, boss, score, leaderboard ; `lore-pataphysique.md:968,1776`), **pas les mécaniques**.
- **Worktree / branche** : aucun (doc seulement, sur `main`).

## Tranché

- **2026-11-09 — Combattant = l'avatar du joueur, accompagné d'un Mathou familier** (décision de David). Les Mathoux ne combattent pas façon Pokémon. Raison : un Mathou = une notion, ce qui empêchait de travailler tout le programme. Le jeu choisit la notion, le joueur ne choisit que la Province ou la Forme du sort.
- **2026-11-09 — Ajouter une magie au lore** (idée de David), inspirée d'Ars Magica : grille verbe × matière. ⚠️ Le texte d'Ars Magica est sous CC BY-SA 4.0 (partage à l'identique, https://atlas-games.com/openars) : on s'inspire de la mécanique, **sans copier ni texte ni noms**. Piste de David : **adapter le système à l'âge**, avec la grille pour le lycée et un système simple, façon Navadra, pour le collège. En discussion.

- **2026-11-09 — La magie s'apprend par étapes, avec un seul moteur.** David a retenu mes recommandations :
  - **Recrue**, au primaire : des coups seulement, sans magie. **Le primaire est inclus.**
  - **Apprenti**, au collège : des sorts tout faits, rattachés à une Province, façon Navadra.
  - **Mage**, au lycée : la grille verbe × matière, composée par l'élève.
  - Un sort tout fait est une case cachée de la grille.
  - **Le niveau scolaire** (`profiles.grade`) **ouvre l'étape** ; jouer en débloque le contenu progressivement.
  - **Le verbe donne l'effet en combat** (soigner, frapper, entraver, transformer, révéler) ; **la matière seule décide du domaine** de la question. Pas d'étiquetage par compétence.

- **2026-11-09 — Adversaires : les Bêtes imprévues, et le Czar pour les grandes batailles** (choix de David). David préfère les monstres imaginaires de Navadra aux troupes du Czar :
  - **Combats courants** : un bestiaire imaginaire, chaque Province ayant sa faune ; la Province décide du domaine des questions.
  - **Origine dans le lore** : la « bête imprévue Clinamen » de Jarry (_Faustroll_, livre VI ; `lore-pataphysique.md:152`). Les bêtes naissent du **Clinamen en général**, la déviation qui fait exister les choses. Le rot du Père Ubu qui a révélé la dimension pataphysique de la Pologne (`lore-pataphysique.md:189`) en est le premier. **Elles ne naissent pas des erreurs des élèves** : David a écarté cette lecture, qui ferait de l'erreur un mal.
  - **La remédiation se fait en coulisse** : le jeu envoie plus souvent les bêtes des points à remédier, sans que le lore le raconte.
  - **Le Czar et ses troupes** ne viennent qu'aux grandes batailles (fin de campagne, Mobilisation Générale).
  - **Pas de catalogue d'erreurs** : rien dans Chiphre ne reconnaît quelle erreur l'élève a faite (statuts juste, faux, mal écrit seulement ; aucune mauvaise réponse étiquetée dans les QCM).
  - **À surveiller** : distinguer les bêtes des Mathoux au premier coup d'œil ; des bêtes drôles, pas effrayantes, puisque le primaire est inclus ; environ 3 ou 4 bêtes par Province pour la v1. Les images de Navadra ne sont pas réutilisables, faute de licence.

## À trancher (posé à David le 2026-11-09)

1. **Combattants** : les **Mathoux** servent-ils de combattants (équipe de 3, chaque attaque est une question de la notion du Mathou), à la place des sorts et du grimoire ? C'est la décision du 2026-10-18 (`mathoux-conception.md:98-109`) : la confirmer ou la rouvrir.
2. ✅ _Tranché le 2026-11-09 (Bêtes imprévues, voir § « Tranché »)._ **Adversaires** : des **erreurs typiques** (« le Carré Fourbe ») au service du **Czar Alexis**, ou autre chose ? Cela engage un catalogue d'erreurs rattachées aux modèles de questions, et des illustrations.
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
