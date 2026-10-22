# 0020 — L'arbre des notions est central ; les programmes pointent l'arbre

- **Statut** : acceptée (complète et amende [0019](0019-classement-branche-notion-sous-notion.md))
- **Date** : 2026-10-07 · **Décidée par** : David

## Contexte

Deux hiérarchies décrivent les contenus : l'arbre des notions (branche > notion > sous-notion,
ADR 0019) et le référentiel du programme (`curriculum_themes` > `curriculum_objectives` >
`curriculum_points`, un arbre **par niveau scolaire**). Doublon constaté le 2026-10-07 : thème ≈
branche, objectif ≈ notion ; seuls les **points** (grain BO par année — 1 007 en prod : 554
savoir-faire, 382 connaissances, 71 démonstrations) et leurs usages (couverture par classe via le
cahier de texte, acquisition élève) n'ont pas d'équivalent dans l'arbre. Et les mêmes modèles de
questions se taguaient deux fois (432 vers des points, 1 005 vers l'arbre dans la correspondance
proposée).

Principe retenu par David : **les mathématiques sont immuables, les programmes changent**.
« Résoudre une équation du second degré restera toujours résoudre une équation du second degré,
qu'elle fasse partie du programme ou pas. » Un programme qui change, c'est des pointeurs qui
changent — pas l'arbre.

Mesure à l'appui sur le rôle du `level` des questions : sur les 252 points pointés par plusieurs
modèles, 166 s'étalent sur plusieurs levels, et ce sont **les mêmes titres qui reviennent à des
levels différents** (« Terme général d'une suite géométrique » en 1 et en 2) : le level faisait
deux métiers — séquencer les déclinaisons du programme à grande échelle, graduer la difficulté
d'une même tâche à petite échelle.

## Décision

1. **L'arbre des notions est la taxonomie centrale et unique**, purement mathématique. Il peut
   déborder des programmes : notions hors programme pour l'enrichissement des très bons élèves,
   anticipation des réformes. Un nœud ne se supprime pas quand un programme l'abandonne : il cesse
   d'être pointé (ou s'archive, règle 0019).
2. **L'arbre ne porte aucune information de niveau scolaire** — amende 0019 : la clause « niveaux
   portés par la notion et par la sous-notion » est abandonnée, avec l'héritage et l'inclusion qui
   l'accompagnaient. Les niveaux affichables d'un nœud se **dérivent** des programmes qui le
   pointent ; un nœud que personne ne pointe est hors programme, c'est son droit.
3. **Le grain de l'arbre est celui du filtre** : il sert à catégoriser et retrouver, pas à
   recopier le BO. Critère de création d'une sous-notion : « voudra-t-on filtrer la banque
   là-dessus ? ». Trois niveaux maximum, inchangé.

   **Précision de David (2026-10-09) : un seul découpage par notion, par contenu.**

   - **Une sous-notion découpe sa notion par contenu mathématique** : un objet, une propriété ou
     une technique de calcul (terme général, discriminant, loi d'une variable aléatoire, calcul
     posé).
   - **Elle ne découpe jamais** :
     - par activité (reconnaître, calculer, compléter) ;
     - par registre (lecture graphique, problèmes en contexte) ;
     - par outil (algorithmique, tableur).
   - **Ce que l'élève fait, ce sont les points du programme qui le disent.**
   - **Les « facettes » disparaissent.** Ce sont les sous-notions créées pour le filtre pendant
     les rangements. Elles se fondent dans les sous-notions de contenu (audit
     `docs/wip/arbre-notions/audit-facettes.md`).
   - **Le critère « voudra-t-on filtrer là-dessus ? » ne vaut plus** que pour décider de
     découper un contenu plus finement.

4. **Un programme (un niveau scolaire) = un ensemble de points rattachés aux nœuds de l'arbre.**
   Le point garde le grain du BO : libellé exact, connaissance / savoir-faire / démonstration,
   attendu / approfondissement, bornes (« dénominateur ≤ 12 »), régime d'acquisition, ordre de
   progression annuel. Il reste l'unité de couverture du cahier de texte — cochable même quand
   rien n'est questionnable (constructions, manipulations, raisonnements).
5. **Un point vise une notion ou une sous-notion, jamais une branche** — même règle que le
   rangement des contenus (0019).
6. **`curriculum_themes` et `curriculum_objectives` disparaissent à terme** : les pages
   programme / avancement s'affichent par branche > notion, filtrées par les points du niveau.
   Leur retrait est destructif → inventaire des usages (grep, chaînes et schémas Zod compris),
   arrêt et explication, le moment venu.
7. **Tagging des contenus** : le nœud direct d'un modèle (un seul, 0019) reste la source de
   vérité ; ses points doivent appartenir à ce nœud, et taguer un point suggère le nœud
   automatiquement. Un contenu rangé sans aucun point est, par définition, hors programme.

   **Précisions de David (2026-10-09).** Elles font suite à l'analyse
   `docs/wip/arbre-notions/c5-architecture-liens.md` :

   - **Le nœud d'une ressource est stocké.** C'est lui que lit le filtre ; il ne se déduit pas
     des points. Une ressource sans point garde son nœud, et ce nœud peut être plus fin que
     celui de son point.
   - **Le lien ressource → point se saisit.** Il ne se déduit pas du nœud, car le point porte
     des bornes que le nœud n'a pas : CE1-021 « … de même dénominateur » et 5-026 « … de
     dénominateurs quelconques » sont sur le même nœud. Le nœud sert seulement à proposer les
     points candidats.
   - **« Appartenir à ce nœud » se lit ainsi** : le point est sur le nœud de la ressource ou
     sur la notion de ce nœud. Pour un exercice, il est sur l'un de ses nœuds ou sur leur
     notion. Une règle en base refuse le reste.
   - **Un modèle porte exactement un point par programme** ; un exercice en porte plusieurs.

   **Précisions de David (2026-10-17).** Elles font suite au lot de tags du primaire et du
   collège (étape 2 bis de C5) :

   - **Le BO est immuable : aucun point n'est créé pour accueillir un modèle.** Un modèle qu'aucun
     point ne décrit pour un programme n'est pas tagué pour ce programme. « Exactement un point
     par programme » se lit donc « au plus un, et un seul quand un point le décrit vraiment » :
     un point de vocabulaire ou d'une technique voisine ne compte pas.
   - **Un point peut naître d'une ligne d'automatisme, jamais d'un modèle.** La rubrique
     « Automatismes » fait partie du texte officiel. Quand une partie d'une ligne d'automatisme ne
     renvoie à aucun point des programmes précédents, on cherche d'abord un point antérieur à
     scinder (avec toute sa famille) pour obtenir une référence précise ; sinon, on ajoute au
     programme dont la liste contient la ligne un point ⚙ fidèle à son texte, comme le seed l'a
     fait pour 5-056, 3-010 et 3-011 (décision de David, 2026-10-17).
   - **Le hors-programme vit dans l'arbre (point 1).** Un modèle sans point garde son nœud ; il
     reste trouvable, assignable et jouable, et ses tentatives sont enregistrées. Il ne compte
     pas dans la progression du programme. Montrer à l'élève ce qu'il a travaillé hors programme
     se fera, si on le veut, par une progression par nœud calculée depuis les tentatives.
   - **Un même savoir-faire revient d'une année à l'autre** (progression en spirale du BO :
     CE2-020 tables d'addition, CM1-035 et CM2-035 répertoire additif). Chaque année garde son
     point, et un modèle utilisé dans plusieurs programmes porte un tag par programme. La
     progression d'un élève se lit dans les points de son programme.
   - **Une scission vaut pour toute la famille.** Un point qui réunit deux savoir-faire
     séparables (« ajouter ou soustraire », « dans les deux sens ») peut être scindé en restant
     fidèle au BO (même grain, aucun contenu ajouté). Les points qui expriment le même
     savoir-faire dans les autres années se scindent alors de la même façon, sinon un même modèle
     serait suivi finement une année et grossièrement la suivante. Le premier point garde son
     code ; les autres reçoivent un nouveau code.
   - **Critère de scission : au moins un point évaluable.** On scinde quand la scission donne au
     moins un point qu'un modèle de question peut évaluer automatiquement, avec nos outils
     actuels ou à venir (grapheur, module de géométrie…). L'autre partie peut relever du cours
     et s'évaluer à l'écrit ou à l'oral : elle garde son point, cochable dans le cahier de
     texte. Exemple : 5-058 « Connaitre la somme des angles d'un triangle et savoir la
     démontrer » donne « connaître » (évaluable) et « démontrer » (travaillé en cours). Un point
     dont aucune partie ne s'évalue par un modèle relève plutôt d'une compétence : il reste
     entier.
   - **Une puce large reste un point (David, 2026-10-22).** « Résoudre des problèmes impliquant
     des grandeurs et mesures », « modéliser une situation par une suite », « choisir la
     représentation la plus adaptée »… : aucune question ne les évaluera, mais elles font partie du
     programme ; elles relèvent de l'évaluation par compétences. On les garde comme points entiers
     (cochables dans le cahier de texte). Les puces écartées au seed du lycée pour ce motif
     (2026-10-08) sont rétablies par la passe lycée.
   - **Exception : un doublon du BO lui-même s'archive.** Deux points d'un même programme ne
     disent jamais la même chose. Quand le texte officiel répète une ligne mot pour mot ou
     presque, le premier point est gardé et le second est **archivé** : il reste en base, fidèle
     au BO, mais n'est plus proposé au tag, ni affiché, ni compté dans la progression. Seul cas
     connu : en 3e, « Nombres rationnels > Objectifs d'apprentissage » donne à la suite
     « Mettre une fraction sous forme irréductible. » (3-001, gardé) et « Rendre irréductible une
     fraction. » (3-002, archivé) — vérifié dans le programme du cycle 4,
     `docs/ref/programmes/Programme de mathématiques du cycle 4.pdf`. Tout nouveau cas se signale
     et se tranche avec David ; aucun autre écart au BO n'est permis.

8. **Le `level` des questions est une gradation à l'intérieur d'un point** (du facile au
   difficile), plus un axe global 1-20. La progression d'Automaths suit l'ordre des points du
   programme du niveau de l'élève, puis le level à l'intérieur du point.

## Conséquences et chemin

- **PR 1** (écrite, appliquée nulle part sauf en local) : retirer `classification_nodes.grades`
  et les règles associées (non-vide sur notion, héritage/inclusion sur sous-notion,
  avertissement d'incohérence de niveaux).
- **Schéma cible** : le point porte son nœud (`curriculum_points.node_id`) et son niveau
  (aujourd'hui porté par le thème). Rattachement assisté des 1 007 points existants aux nœuds,
  validé par David ; le retrait de themes/objectives vient après, à son rythme.
- **Transition** : tout filtre « par niveau » s'appuie sur les points ; tant qu'un niveau n'a pas
  son programme saisi et pointé, le filtre dégrade en arbre complet. La saisie des programmes
  (CP → terminale, en cours) est le chemin critique.
- Les **[N]** des documents d'écarts (`programmes-ecarts.md`, `programmes-ecarts-cycle2.md`) se
  lisent désormais « le programme de ce niveau doit pointer ce nœud ».

## Écarté

- **Statu quo** (le « pas de lien » de 0019, question A7 retirée sans avoir été posée) : deux
  taxonomies et deux taggings indépendants — double saisie, divergence garantie.
- **Pointeurs nus** (programme = ensemble de couples nœud + niveau, sans points) : perd le grain
  du BO et ramène la couverture du programme au grain de la notion, trop grossier pour « où en
  suis-je dans mon année ».
- **Fusion inverse** (tout ranger dans les arbres par année de `curriculum_*`) : perd la
  transversalité — une notion par programme au lieu d'une notion pour toute la scolarité — et le
  hors-programme.
- **Table de correspondance nœud ↔ point comme état final** : retenue seulement comme étape de
  migration ; en régime de croisière, le point porte son nœud directement.
- **Points spéciaux « entraînement » ou « approfondissement »** pour les modèles qu'aucun point
  ne décrit (2026-10-17) : mêlerait au BO ce qui n'en est pas (couverture, progression et cahier
  de texte devraient les filtrer partout), exigerait un niveau pour un contenu qui n'en a pas, et
  recréerait l'arbre en moins bien. Le hors-programme est le rôle de l'arbre.
- **Un seul point de référence par famille, celui du plus petit niveau** (2026-10-17) : la
  progression d'un élève de CM2 ne verrait plus son travail sur un savoir-faire dont le point
  de référence est au CE2.
