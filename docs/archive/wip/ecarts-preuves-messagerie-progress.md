---
title: Tests de preuve des écarts de messagerie — journal
date: 2026-11-26
status: #3165 mergée ; chantier clos
---

## Reprendre ici

_Mis à jour le 2026-11-26, après #3165._

- **État** : #3165 mergée ; les 6 écarts de messagerie (L78, L79, L80, L82, L83, L84) ont leur preuve, leurs lignes du registre la pointent, toutes rouges au rejeu (`pnpm ecarts rejouer`), aucune cassée.
- **Prochaine action** : aucune ici ; la suite (autres domaines) est dans [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : un `it.fails` est vert dès que son corps lève : sonde dans un `beforeAll`, une seule affirmation, un témoin à côté.
- **Worktree / branche** : aucun (retirés au merge de #3165).

---

Chantier fils de [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md) : une PR de tests de preuve par domaine.

## Ce que chaque preuve affirme

| Écart | Où                                            | Sonde                                                                      | Attendu                         | Aujourd'hui                |
| ----- | --------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------- | -------------------------- |
| L78   | commande (registre)                           | grep d'une écriture de l'état `invalid` (carnet, routes d'API, migrations) | quelque chose écrit cet état    | rien ne l'écrit (sortie 1) |
| L79   | `tests/integration/ecarts-messagerie.test.ts` | `get_carnet_by_token` avec le jeton d'un courriel                          | `access_count` du lien inchangé | + 1                        |
| L80   | `tests/ecarts/messagerie.test.ts`             | `runCarnetDaily`, base simulée, marquage des épisodes en échec             | le passage finit en erreur      | il finit sans rien dire    |
| L82   | intégration                                   | `add_warning` du prof, élève de la classe A, classe B                      | aucune ligne `student_warnings` | 1 ligne                    |
| L83   | intégration                                   | `createNotification` (cible `users`), seule adhésion archivée              | `success: false`                | `success: true`            |
| L84   | intégration                                   | `send_private_message` du prof vers un élève `is_test`                     | rien dans `message_inbox`       | 1 message reçu             |

## Choix

- **Preuves sur une vraie base** (L79, L82, L83, L84) : le projet vitest `ecarts` n'a pas de base. Elles sont en `it.fails` dans la suite d'intégration, suivies au registre par une commande qui grepe un marqueur (« écart L82 »), comme les écarts E de `e2e/verifs/`. Effet voulu : la PR qui corrige l'écart voit sa CI rouge tant qu'elle n'a pas retiré `.fails` et le marqueur. Écrit dans [registre-des-ecarts.md](../../pratiques/registre-des-ecarts.md) § Les trois preuves.
- **L78** : aucun code ne reçoit les rejets de Brevo, donc aucun test ne peut appeler ce qui n'existe pas ; la commande affirme qu'une écriture de l'état `invalid` existe (tests exclus).
- **L80** : le tri laissait deux corrections possibles (ne pas reproposer l'épisode, ou remonter l'échec). Le test affirme la seconde ; si la correction prend la première, il est à réécrire en intégration sur `carnet_exception_plan` (dit en commentaire du test).

## Vérification des verts possibles

- Intégration : `.fails` retiré sur une copie, les quatre preuves échouent sur leur affirmation (`expected 1 to be 0` ×3, `expected true to be false`), pas sur le décor ; les quatre témoins sont verts.
- L80 : témoin vert (marquage réussi → `exceptions: { sent: 1, failed: 0 }`), deux tests rouges par « promise resolved ».
- L78 : commande témoin (`confirm_sent_count` dans le même dossier) en sortie 0, la preuve en sortie 1.

## Lignes du registre posées après le merge

```
L78 : commande `test -d src/lib/server/carnet && grep -rqE --exclude-dir=__tests__ "status: 'invalid'|status = 'invalid'" src/lib/server/carnet src/routes/api supabase/migrations`
L79, L82, L83, L84 : commande `f=tests/integration/ecarts-messagerie.test.ts; test -f "$f" && ! grep -q "écart L79" "$f"`
L80 : test tests/ecarts/messagerie.test.ts › L80
```

## Revue (code-reviewer, avant la PR)

- Corrigé : les preuves de L80 acceptaient n'importe quelle erreur, y compris le « table inattendue » de la base simulée (vert à tort si la correction lit une autre table) ; elles refusent maintenant cette erreur, et le témoin affirme que le marquage passe par `parent_exception_episodes`.
- Noté dans la doc : la commande sur marqueur ferme la ligne si le test est renommé ou supprimé sans correction.
- Rien à signaler sur L79, L82, L83, L84 (code visé relu), ni sur le nettoyage.
