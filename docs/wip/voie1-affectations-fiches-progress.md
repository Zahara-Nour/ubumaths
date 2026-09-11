# Solder la voie 1 des affectations de fiches

> Doc de progression. Branche du temps 1 : `refactor/voie1-affectations-fiches`.

## Le sujet

Une fiche atteint un élève par trois chemins :

|            | Où                               | Ce que ça vaut                                                |
| ---------- | -------------------------------- | ------------------------------------------------------------- |
| **voie 1** | `worksheet_assignments.class_id` | colonne **historique**, duplique la première classe           |
| **voie 2** | `worksheet_assignment_classes`   | la jonction — porte **toutes** les classes, première comprise |
| **voie 3** | `worksheet_assignment_students`  | élève nommément désigné, **sans** condition de classe         |

Ce ne sont pas trois mécanismes. Depuis la distribution multi-classes, l'API
écrit toutes les classes dans la jonction **et** recopie la première dans la
colonne « pour compatibilité » :

```
class_id: classIds[0] || null   // api/worksheets/[id]/assignments/+server.ts
```

La voie 1 ne dit donc rien que la voie 2 ne dise déjà. C'est cette redondance
qui a produit le bug du 2026-09-08 : la fonction d'accès ne lisait que la
colonne, quand la création remplissait surtout la jonction.

**État en prod au 2026-09-11** : 11 affectations, 11 lignes de jonction, **zéro**
affectation à `class_id` sans jonction. Une affectation individuelle.

## Découpage décidé avec David

**Temps 1 — la voie 1 cesse de décider.** Toutes les lectures passent à la
jonction. La colonne reste écrite et présente. Aucun risque : si on s'est
trompé, elle est toujours là.

**Temps 2 — on la supprime.** Une fois le temps 1 en production et vérifié.

Ce découpage évite de mélanger, dans une migration destructive sur une base
d'élèves, la réparation de lectures et un changement de contrat d'API.

## Temps 1 — fait

### Ce qu'il répare, au-delà du ménage

`student_has_exercise_access(uuid)` garde la policy « Students can view assigned
exercises » sur `exercises`. Elle joignait `class_members` sur `wa.class_id` —
**la voie 1 seule**. La correction du 2026-09-08 avait étendu
`student_has_worksheet_access` aux trois voies et, à travers elle, les policies
de `worksheets`, `worksheet_exercises` et `worksheet_sections` — mais cette
fonction-ci est passée à travers.

**Conséquence déjà en production** : un élève atteint par la voie 2 ou 3 ouvre
la fiche et voit ses sections, mais **aucun énoncé**. Une fiche vide, sans
message. Invisible chez le professeur unique tant qu'il ne distribue qu'à une
classe à la fois.

⚠️ `student_has_exercise_access` est **surchargée** (`(uuid)` et `(uuid, uuid)`).
Le générateur de types saute les fonctions surchargées : son absence de
`database.ts` ne dit rien de son existence.

### Question d'accès (tranchée)

Un élève atteint par la **voie 2 ou 3** pourra lire les **exercices** de la
fiche. Il lisait déjà la fiche, ses sections et son affectation — c'est
l'incohérence qu'on répare. Aucun autre élargissement, personne ne perd rien.

### Le contenu

`supabase/migrations/20260911100000_voie1_cesse_de_decider.sql` :

- `student_has_worksheet_access` — voie 1 retirée ;
- `student_has_exercise_access(uuid)` — **délègue** à la précédente plutôt que de
  redéfinir les voies. C'est cette duplication qui leur avait permis de diverger ;
- `can_access_assignment` — branche historique retirée (elle couvrait déjà les
  trois voies) ;
- policy « Students can view their assignments » — test redondant retiré ;
- `search_path` durci sur les trois fonctions (`pg_temp` explicitement en
  dernier) ;
- garde-fou : la migration **échoue** s'il existe une affectation dont le
  `class_id` est **absent de sa jonction**.

⚠️ **Le prédicat du garde-fou est le point délicat**, et ma première version se
trompait. Elle testait « aucune ligne de jonction ». Le cas qui fait perdre un
accès est plus large : une jonction qui vise B et C, une colonne qui vaut A —
les élèves de A perdent tout, et l'ancien prédicat répond « tout va bien ».

Ce n'est pas théorique : le PATCH d'une affectation écrit la jonction puis,
seulement après, la colonne, en trois allers-retours non transactionnels
(`api/worksheets/assignments/[assignmentId]/+server.ts:300`, `:313`, `:330`).

Vérifié en fabriquant le piège : **ancien prédicat → 0, corrigé → 1**, et la
migration échoue bien avec un message qui dit quoi faire.

Côté application, **deux** endroits décidaient :

- `correction-release.ts` et son repli `legacyClassId`, retiré (la voie 3 y était
  déjà lue) ;
- `api/worksheets/assignments/[assignmentId]/correction/+server.ts` testait
  `assignment.class_id` contre les classes de l'élève. Un élève de seconde classe
  ou nommément désigné se voyait **refuser la correction** d'une fiche à laquelle
  il a accès. Refus en mode fermé, donc sans fuite — mais le même défaut, un
  étage plus haut. Délègue désormais à `can_access_assignment`.

### Tests

`tests/integration/worksheet-assignment-voies.test.ts` — 10 tests, écrits
**avant** la correction. **3 rouges** au départ :

- voie 2 : l'élève de la seconde classe ne lisait pas les exercices ;
- voie 3 : l'élève nommément désigné non plus ;
- colonne historique vidée : l'élève de la **première** classe perdait aussi ses
  exercices — la preuve que c'était bien elle qui les portait.

Les autres sont des témoins : élève étranger, affectation annulée, affectation
pas encore ouverte, et — ajouté sur remarque de l'audit — **classe archivée**,
qui coupe les deux voies de classe mais laisse l'élève nommément désigné, la
voie 3 n'ayant aucune condition de classe. Cette garde `classes.is_active`
n'était protégée par rien.

⚠️ **Un échec non reproduit** : sur quatre exécutions de la suite complète, une a
échoué sans laisser de trace exploitable. Le fichier ci-dessus est stable sur
quatre lancements consécutifs. À surveiller en CI.

### Audit de sécurité — aucun finding bloquant

Les quatre objets réécrits comparés garde par garde à leur version **déployée en
prod**. Rien de perdu. L'élargissement est bien celui annoncé : un exercice qui
n'est dans aucune fiche distribuée reste illisible. La surcharge
`(uuid, uuid)` est intacte et ne peut pas entrer en ambiguïté (arités
différentes). Les GRANTs sont préservés — ni `anon`, ni `PUBLIC`.

## ⚠️ Temps 2 — PRÉREQUIS AVANT TOUT `DROP COLUMN`

**L'attribution des gidouilles lit encore `worksheet_assignments.class_id`.**

`api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]/+server.ts` :
quand le professeur valide un signalement d'erreur, l'élève reçoit une gidouille
via `update_student_bonus(p_student_id, p_class_id, …)`. La classe est lue dans
la colonne historique.

Supprimer la colonne sans traiter ça **casse l'attribution des bonus**.

Sorti du temps 1 sur décision de David, à traiter à part.

### Et un défaut existant, découvert au passage

Quand `class_id` est nul — une affectation **purement individuelle**, l'élève
hors classe — le code journalise un avertissement et **saute le bonus**. L'élève
signale une vraie erreur, elle est corrigée, il ne reçoit rien. En silence.

Question produit pour David : **un élève hors classe qui signale une erreur,
doit-il être récompensé ?** Si oui, dans quelle classe le créditer — ou faut-il
rendre le bonus possible sans classe ?
