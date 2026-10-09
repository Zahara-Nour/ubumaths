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
