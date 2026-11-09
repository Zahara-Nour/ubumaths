# Chantier `navadra` — réécriture du jeu de combats

## Reprendre ici

_Mis à jour le 2026-11-09, phase 0, rien n'est codé._

- **État** : analyse faite. David repart **de zéro**, avec un **nouveau nom** et le **lore de Chiphre**. Le principe reste le même : chaque sort ou coup se valide par une question, et les questions viennent du système de questions de Chiphre.
- **Tranché** : avatar combattant, accompagné d'un Mathou familier ; une magie ajoutée au lore (§ « Tranché »).
- **Tranché aussi** : la magie par étapes (recrue, apprenti, mage), avec un seul moteur. Voir § « Tranché ».
- **Tranché aussi** : les adversaires sont des **Bêtes imprévues**, un bestiaire imaginaire par Province ; le Czar ne vient qu'aux grandes batailles. Voir § « Tranché ».
- **Tranché aussi** : la riposte. La recrue l'esquive par une question ; l'apprenti et le mage se défendent par leurs sorts.
- **Tranché aussi** : pas de nom de produit. Le jeu s'appelle **La Descente de la Vistule**, un voyage initiatique à travers le Royaume, et c'est une activité de Chiphre, pas son cadre. Voir § « Tranché ».
- **Tranché aussi** : la descente ne suit aucun ordre. Les Bêtes surgissent n'importe où dans le Royaume, et le joueur va les combattre là où elles sont.
- **Tranché aussi** : les Bêtes naissent des besoins de l'élève et sont vulnérables à ce domaine ; le joueur choisit le domaine par son coup ou son sort, la recrue comprise.
- **Tranché aussi** : le grade de l'Ordre de la Grande Passoire se fondera sur le travail réel, pas sur les gidouilles ; c'est le chantier à part `ordre-grande-passoire`.
- **Prochaine action** : la question 5, point par point, en commençant par **5a** (la puissance de l'avatar). Les propositions 5a à 5e sont dans § « À trancher ».
- **En attente de David** : 5a à 5e. La question 3 (public) est réglée : du primaire au lycée.
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
  - **Combats courants** : un bestiaire imaginaire, chaque Province ayant sa faune. La Province de la Bête donne son allure et ses faiblesses. Le domaine de la question vient du coup ou du sort que choisit le joueur, comme le dit la décision sur l'avatar. _(Correction du 2026-11-09, confirmée par David le même jour.)_
  - **Origine dans le lore** : la « bête imprévue Clinamen » de Jarry (_Faustroll_, livre VI ; `lore-pataphysique.md:152`). Les bêtes naissent du **Clinamen en général**, la déviation qui fait exister les choses. Le rot du Père Ubu qui a révélé la dimension pataphysique de la Pologne (`lore-pataphysique.md:189`) en est le premier. **Elles ne naissent pas des erreurs des élèves** : David a écarté cette lecture, qui ferait de l'erreur un mal.
  - **La remédiation se fait en coulisse** : le jeu envoie plus souvent les bêtes des points à remédier, sans que le lore le raconte.
  - **Le Czar et ses troupes** ne viennent qu'aux grandes batailles (fin de campagne, Mobilisation Générale).
  - **Pas de catalogue d'erreurs** : rien dans Chiphre ne reconnaît quelle erreur l'élève a faite (statuts juste, faux, mal écrit seulement ; aucune mauvaise réponse étiquetée dans les QCM).
  - **À surveiller** : distinguer les bêtes des Mathoux au premier coup d'œil ; des bêtes drôles, pas effrayantes, puisque le primaire est inclus ; environ 3 ou 4 bêtes par Province pour la v1. Les images de Navadra ne sont pas réutilisables, faute de licence.

- **2026-11-09 — Riposte de la bête : elle dépend de l'étape** (choix de David, sur ma recommandation) :
  - **Recrue** (primaire, pas de magie) : la riposte s'esquive par une question. Si elle est réussie, le coup est évité. Cela fait 4 questions par round.
  - **Apprenti et mage** : la bête frappe, comme dans Navadra. Pour se défendre, il faut avoir lancé des sorts (entraver, protéger). Cela fait 3 questions par round.
  - Raison : sans esquive, la recrue regarderait la bête frapper sans rien pouvoir faire. À partir de l'apprenti, se défendre devient un choix tactique.

- **2026-11-09 — Nom : La Descente de la Vistule, un voyage initiatique** (choix de David ; mes recommandations sur le reste) :
  - **Pas de nom de produit.** L'entrée du menu s'appelle « La Descente de la Vistule ». Elle se présente comme un **voyage initiatique à travers le Royaume**.
  - **Appuis dans le Compendium** : « Le voyage Chiphre » (`lore-pataphysique.md:106`) ; l'Ordre de la Grande Passoire, ordre initiatique de navigateurs (l. 1058) ; la flottille de bateaux-passoires de Faustroll sur la Vistule (l. 1387) ; la Vistule traverse les 6 Provinces (l. 568) ; les quêtes principales, une par Province (l. 1185).
  - **Portée : une activité de Chiphre**, un lieu du menu à côté des exercices et des Mathoux, **pas le cadre de toute l'appli**. On pourra l'étendre plus tard.
  - « Tour du Royaume » est déjà pris par la page `/royaume`.
  - **À faire au moment du code** : ajouter le terme à `CONTEXT.md`.

- **2026-11-09 — La descente ne suit aucun ordre** (décision de David). La Vistule symbolise le voyage à travers tout le Royaume, pas un parcours imposé :
  - les Bêtes surgissent **n'importe où dans le Royaume**, et le joueur va combattre celle qu'il veut, là où elle se trouve, comme sur la carte de Navadra ;
  - le tracé du fleuve (`lore-pataphysique.md:568`) ne change pas, mais il n'impose **aucun ordre aux Provinces** ;
  - cela règle le problème de l'ordre des domaines et celui des Provinces vides au primaire ;
  - **Reste à écrire** : les règles d'apparition des Bêtes (combien, où, combien de temps). Dans Navadra, il y avait 3 nouveaux monstres par jour et les gros fuyaient au bout de 3 à 6 jours. Cela relève de la question 5.

- **2026-11-09 — Les Bêtes portent le besoin pédagogique** (David a validé mes 4 recommandations). Le problème : si le joueur choisit le domaine de chaque coup ou sort, il peut ne travailler que ses domaines favoris. Navadra ne s'en protégeait presque pas : faiblesses à ±15 %, et seul le mode classe imposait des notions.
  - **Les Bêtes naissent des besoins de l'élève**, d'après le sélecteur (`student_point_state`) : d'abord les points à remédier, puis les non acquis, puis ceux à revoir.
  - **Chaque Bête est nettement vulnérable au domaine à travailler**, sans y être limitée. Ordre de grandeur : ×2 avec le bon domaine, ×0,75 avec les autres, à régler à l'équilibrage. Avec le mauvais domaine, elle reste battable, mais le combat est plus long.
  - **Le joueur choisit toujours le domaine** par son coup ou son sort. **La recrue aussi** : elle choisit ses coups par Province, et la Bête l'oriente.
  - **Mode classe** (le prof impose les notions du moment, comme les créneaux de Navadra) : **plus tard**, pas en v1, avec la Bataille de Bataillon (idée n° 3).

## À trancher (posé à David le 2026-11-09)

1. **Combattants** : les **Mathoux** servent-ils de combattants (équipe de 3, chaque attaque est une question de la notion du Mathou), à la place des sorts et du grimoire ? C'est la décision du 2026-10-18 (`mathoux-conception.md:98-109`) : la confirmer ou la rouvrir.
2. ✅ _Tranché le 2026-11-09 (Bêtes imprévues, voir § « Tranché »)._ **Adversaires** : des **erreurs typiques** (« le Carré Fourbe ») au service du **Czar Alexis**, ou autre chose ? Cela engage un catalogue d'erreurs rattachées aux modèles de questions, et des illustrations.
3. **Public de la première version** : quels niveaux ? Navadra visait la 6e.
4. **Nom du jeu** : David en a-t-il un, ou faut-il des propositions tirées du lore ?
5. Question rattachée à la 1 : faut-il une progression propre au jeu (niveau, prestige personnel ou limité au Bataillon), ou le stade des Mathoux suffit-il ?

6. ✅ _Tranché le 2026-11-09 : aucun ordre, voir § « Tranché »._ **Ordre de la descente** (posé le 2026-11-09). D'après le Compendium (l. 568), le fleuve passe par Bedonstan (géométrie, source), Glitchistan (algorithmique), Patatovie (logique), Nombrilie (nombres), Pifométrie (probabilités et statistiques), puis Yoyolande (fonctions, delta). Faut-il suivre cet ordre, une Province après l'autre, ou chaque étape mêle-t-elle les domaines ?

7. **Progression (question 5)**, proposée le 2026-11-09. On n'ajoute pas de grade propre au jeu.
   - **5a. Puissance de l'avatar** : pas de niveau ni de chiffres qui gonflent ; on progresse par déblocage (coups, sorts, cases de la grille).
   - **5b. Récompenses** : gidouilles seulement, plafonnées côté serveur.
   - **5c. Carnet de route** : les Bêtes vaincues, Province par Province.
   - **5d. Le Mathou familier** : un appui modeste qui grandit avec son stade.
   - **5e. Apparition des Bêtes** : 3 par jour, 5 en stock au plus. Une Bête née d'un point à remédier reste jusqu'à sa défaite. Une grosse Bête par semaine.
   - **Hors du jeu** : le grade de l'Ordre se fondera sur le travail réel, pas sur les gidouilles (décision de David du 2026-11-09). C'est le chantier à part `docs/wip/ordre-grande-passoire-progress.md`. La Descente ne doit pas être le moyen le plus rapide de monter dans l'Ordre.

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
