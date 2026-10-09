# Le lien entre modèles et points : quelle structure ? (décision d'architecture)

> **Statut : ANALYSE ET RECOMMANDATION, en attente de la décision de David.** Rien n'est écrit en
> base. Suspend la proposition de transfert [c5-transfert-liens.md](c5-transfert-liens.md).
> Question de David (2026-10-09) : « Est-ce qu'il n'y a pas un double travail ? le chemin modèle →
> point → nœud devait suffire » ; puis « donne-moi tes recommandations pour la structure la plus
> propre, même si ça demande du travail ».

## Le constat

L'ADR 0020 (§ 7) garde **deux** liens sur un modèle : son nœud (source de vérité) et ses tags de
points, avec une règle — « ses points doivent appartenir à ce nœud ». Elle écarte pourtant
explicitement « deux taggings indépendants — double saisie, divergence garantie ». C'est ce que
j'avais commencé à produire : le nœud par les rangements (depuis l'ancien classement), les points
par le transfert (depuis les colonnes « ex- »). Mesure, sur les 432 modèles tagués :

| Les points du modèle…                       | Modèles |
| ------------------------------------------- | ------- |
| sont exactement sur son nœud                | 150     |
| sont sur le parent ou un enfant de son nœud | 18      |
| sont sur un autre nœud                      | 46      |
| sont sur **plusieurs** nœuds                | **218** |

La divergence que l'ADR redoutait est déjà là.

## Ce que le code fait du lien modèle → point (aujourd'hui)

Le lien `question_template_points` est **le pivot du chemin chaud de l'élève** : le trigger
d'acquisition (`skill_attempts_after_insert` → `update_student_point_state`, qui retrouve les
tentatives par ce lien), les badges FSRS du tableau de bord, l'entrée d'une carte au paquet
« Programme », la couverture automatique du cahier de texte, les statistiques de classe, les gardes
de suppression d'un point. Le formulaire d'admin, une API et des scripts **écrivent** les tags. La
progression d'Automaths ne l'utilise pas encore (elle trie par thème puis `level`), mais l'ADR 0020
§ 8 en aura besoin. **Aucun code ne lit encore le nœud des modèles.**

→ Le lien modèle → point est indispensable. La vraie question est : **stocké** (saisi à la main) ou
**déduit** (calculé depuis le nœud) ?

## Les faits qui tranchent

1. **Les tags ne couvrent que 5 programmes sur 17.** Les cycles 2, 3, 4, la 1re ens. sci. et la voie
   technologique n'ont **aucun** modèle tagué. Savoir-faire entraînés par au moins un modèle :

| Programme                                | Savoir-faire | Avec les tags transférés | En déduisant du nœud |
| ---------------------------------------- | ------------ | ------------------------ | -------------------- |
| CP → CM2                                 | 433          | 0 %                      | 24 à 46 %            |
| 6e → 3e                                  | 259          | 0 %                      | 46 à 57 %            |
| 2de                                      | 97           | 20 %                     | 36 %                 |
| 1re spé / Tle spé / Tle comp. / Expertes | 303          | 61-92 %                  | 72-90 %              |
| 1re ens. sci., 1re et Tle techno         | 95           | 0 %                      | 53 à 81 %            |
| **Total**                                | **1 187**    | **19 %**                 | **53 %**             |

Avec des tags stockés, rattraper ces 12 programmes demanderait de taguer à la main les modèles
contre chacun de leurs points — **et de recommencer à chaque réforme**. C'est exactement ce que
le principe de l'ADR 0020 voulait éviter : « les mathématiques sont immuables, les programmes
changent ; un programme qui change, ce sont des pointeurs qui changent ».

2. **Le nœud ne suffit pas partout.** Un nœud porte souvent plusieurs points d'un même niveau
   (seuls 28 % des points sont seuls sur leur nœud pour leur niveau) — mais le plus souvent une
   connaissance et son savoir-faire, la même compétence. L'ambiguïté réelle (≥ 2 **savoir-faire**
   attendus d'un même programme sur un nœud qui contient des modèles) est **circonscrite : 90
   couples (niveau, nœud)**. Exemples : « calculer un angle » / « calculer une longueur » (produit
   scalaire) ; forme algébrique → trigonométrique / l'inverse ; × 5 / × 50.

3. **Simulation de la déduction**, par couple (modèle, niveau déclaré du modèle) — 1 060 couples :
   596 déduits sans ambiguïté ; 77 ambigus mais tranchés par un ancien tag ; 208 ambigus à
   préciser (15 avec plusieurs anciens tags) ; 179 sans aucun point du niveau sur le nœud, dont
   **25 vrais désaccords** (un ancien tag existait : le modèle est rangé ailleurs que son point,
   ex. « Résoudre cos x = a » rangé sous `équations`, son point 1SPE-307 sous `angles associés`) et
   154 modèles hors programme pour ce niveau (leur champ « niveaux » déborde).

## Les options

|                             | 1. Tags stockés, contraints au nœud (ADR 0020 telle quelle) | 2. Le tag décide du nœud                   | 3. Tout déduire du nœud | **4. Déduire, et préciser l'exception** (reco) |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------ | ----------------------- | ---------------------------------------------- |
| Source de vérité            | nœud + tags                                                 | tags (nœud dérivé)                         | nœud                    | nœud                                           |
| Saisie par modèle           | un tag par point de chaque programme                        | des tags                                   | aucune                  | aucune, sauf ambiguïté                         |
| Nouveau programme / réforme | re-taguer les modèles                                       | re-taguer                                  | **rien**                | **rien** (sauf les zones ambiguës neuves)      |
| Les 12 programmes sans tags | à taguer à la main (milliers de liens)                      | idem                                       | 53 % d'emblée           | 53 % d'emblée                                  |
| Grain                       | fin                                                         | fin                                        | grossier dans 90 zones  | fin                                            |
| Modèles sans point (573)    | rangés, hors programme                                      | **perdus** (plus de nœud)                  | rangés                  | rangés                                         |
| Modèles multi-nœuds (218)   | contrainte violée → arbitrages                              | **impossible** (un modèle = un nœud, 0019) | le nœud tranche         | le nœud tranche                                |
| Divergence possible         | oui, contenue par une contrainte                            | oui                                        | **non**                 | **non** (la précision est contrainte au nœud)  |

L'option 2 contredit l'ADR 0019 et perd les modèles sans point : écartée. L'option 1 est
cohérente mais coûteuse pour toujours. L'option 3 est la plus simple, mais ramène 90 zones au grain
du nœud (un modèle « angle » créditerait aussi le point « longueur »).

## Recommandation : option 4 — « le nœud fait foi, le lien se déduit, l'exception se précise »

1. **Une seule saisie : le nœud du modèle** (le rangement, en prod depuis #981). Le lien modèle →
   point n'est plus jamais saisi à la main.
2. **Le lien se déduit** : les points d'un modèle sont les points (de tous les programmes) dont le
   nœud **couvre** le nœud du modèle — le même nœud, ou un ancêtre (un point posé sur une notion
   couvre les modèles de ses sous-notions ; un modèle posé sur une notion ne crédite pas les points
   de ses sous-notions).
3. **L'exception se précise** : quand, pour un niveau, ce lien déduit contient **au moins deux
   savoir-faire attendus** et que le modèle n'en travaille qu'une partie, on le **précise** dans une
   petite table (modèle, point). Une précision **ne peut que restreindre** le lien déduit, jamais
   l'étendre (contrainte en base) : la divergence est impossible par construction.
4. **Signal pour l'arbre** : si la même précision revient sur beaucoup de modèles d'un même nœud,
   c'est que le nœud est trop grossier — c'est le critère de l'ADR 0020 § 3 (« voudra-t-on filtrer
   là-dessus ? »), désormais mesurable.
5. **Bascule sans casse** : une **vue** `question_template_points` (mêmes colonnes) remplace la
   table ; le trigger d'acquisition, les badges, le paquet Programme, la couverture et les stats
   continuent de la lire sans changement. Seules les **écritures** (formulaire d'admin, API, scripts)
   deviennent des écritures de précisions. L'ancienne table est conservée (renommée) jusqu'à
   l'étape 4 de C5.
6. **Bonus** : les tentatives des élèves étant rattachées aux modèles, l'état d'acquisition sur les
   **nouveaux** points se recalcule depuis tout l'historique — les élèves ne repartent pas de zéro.

### Le travail que cela demande (à la place du transfert)

Les 1 026 anciens tags ne sont plus transférés : ils servent d'**audit**.

- **25 désaccords** de rangement à trancher (déplacer le modèle, ou constater que le point du
  programme est ailleurs) ;
- **les zones ambiguës** : 77 précisions pré-remplies par les anciens tags, ~210 à décider,
  **regroupées par nœud** (~90 nœuds) — une décision par nœud quand les modèles se ressemblent ;
- une **migration de schéma** (table des précisions + contrainte, vue, renommage de l'ancienne
  table) — avec la question d'accès posée avant le SQL ;
- la **bascule des écritures** (formulaire, API, scripts) à l'étape 3 de C5.
- Amendement de l'**ADR 0020** (§ 7 : le lien se déduit, la précision est l'exception ; § 8
  inchangé : la progression suit l'ordre des points, puis le `level`) → **ADR 0021** à valider.

### Pour plus tard (décision séparée)

Le champ « niveaux » d'un modèle devient lui aussi déductible (les niveaux dont un point couvre
son nœud) — c'est le même double emploi que l'ADR 0020 a retiré à l'arbre. Les 154 couples « hors
programme » viennent de là. À trancher après, à part.

## Questions pour David

- **Q1** — Retiens-tu l'option 4 (reco) ? Sinon, laquelle ?
- **Q2** — Règle de déduction : « même nœud ou ancêtre » (reco) — un modèle rangé sur une notion
  ne crédite pas les points de ses sous-notions ?
- **Q3** — Seuil de l'exception : « au moins deux savoir-faire attendus d'un même niveau » (reco) —
  les connaissances, démonstrations et approfondissements du nœud restent crédités sans précision ?
