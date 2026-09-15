# Lire ce que la production a à dire

> Écrit le 2026-09-15, après une journée où **trois pannes de production ont été
> trouvées par accident** — un décor de test qui butait dessus, pas un test, pas
> une alerte. Le premier passage sur les journaux Vercel en a révélé trois
> autres en quatre minutes.

## Le problème, en une phrase

**Rien ne prévient.** La CI ne joue pas les tests d'intégration (ils exigent une
base locale), les échecs de RLS ne rendent aucune erreur, et les erreurs qui
sont journalisées le sont dans un endroit que personne ne regarde.

Un bug qui crie se corrige le jour même ; un bug qui chuchote survit des mois.
Le classement des jeux rendait `permission denied` depuis le **6 septembre**.

## Comment regarder (4 minutes)

Les identifiants sont dans `.vercel/project.json` :

```json
{ "projectId": "prj_…", "orgId": "team_…" }
```

**Les erreurs groupées** — c'est par là qu'on commence. Table pré-agrégée, pas
de risque de délai d'attente, fenêtre de 7 jours maximum :

```
mcp__plugin_vercel_vercel__get_runtime_errors
    projectId = <projectId>   teamId = <orgId>   since = "7d"
```

Rend : nom de l'erreur, nombre d'occurrences, **nombre d'utilisateurs touchés**,
routes concernées, première et dernière apparition, et un échantillon de pile.

**Les journaux**, pour compter ou chercher :

```
mcp__plugin_vercel_vercel__get_runtime_logs
    projectId = …   teamId = …   since = "24h"
    environment = "production"   group_by = "statusCode"
```

⚠️ `group_by` répond vite même sur une fenêtre large ; sans lui, sur 7 jours, la
requête peut expirer. Et `query = "marketplace"` filtre en plein texte.

⚠️ **Zéro ligne ne veut pas dire « aucune erreur »** : ça peut vouloir dire que
personne n'a ouvert la page. Le 2026-09-15, la RPC du marché était cassée pour
toute carte réelle, et les journaux étaient vides — simplement parce qu'aucun
élève n'avait ouvert le marché depuis la migration. Une panne réelle, jamais
servie. Ne pas conclure d'un journal vide que le code est sain.

## Trier ce qui remonte

| Ce qu'on voit                                                    | Ce que ça veut dire                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `PGRST116` / « 0 rows »                                          | **Absence, pas panne.** Un `.single()` sur une ligne facultative. → `.maybeSingle()`      |
| `42501 permission denied`                                        | Une route appelle quelque chose que son rôle n'a plus le droit d'appeler — souvent `anon` |
| `22P02 invalid input syntax`                                     | Un `::type` en SQL qui ment sur la forme réelle de la donnée                              |
| « Enrichissement illisible : … »                                 | Nos propres journaux de dégradation : l'écran s'affiche, amputé                           |
| `[404] GET /.netrc`, `/.pypirc`, `/config.json`, `/sitemap*.xml` | **Bruit.** Balayage de robots, à ignorer                                                  |

## Ce que le premier passage a trouvé (2026-09-15)

| Erreur                                                                | Portée                                         | Suite donnée                            |
| --------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| `checkForTemplateUpdates` → `PGRST116`                                | 14 occurrences, 2 profs, depuis le 13/09       | **Corrigé** (`.maybeSingle()`) + test   |
| `game_leaderboard` → `42501 permission denied`                        | 3 occurrences, 3 utilisateurs, depuis le 06/09 | ⏸️ **question d'accès** (voir plus bas) |
| `presques-evaluations` → `42501 permission denied for table profiles` | 2 utilisateurs, page **publique**              | ⏸️ **question d'accès** (voir plus bas) |

### Les deux questions d'accès qui restent

Elles ne se tranchent pas en lisant du code — ce sont des questions de produit,
et la réponse facile (« rendre l'accès à `anon` ») déferait le durcissement
d'août.

1. **Le classement des jeux doit-il être visible sans être connecté ?** La
   fonction `game_leaderboard` n'accorde `EXECUTE` qu'à `authenticated`. Or elle
   est appelée depuis `/(public)/auth/login` — donc en tant qu'`anon`, qui se
   fait refuser. Soit la page ne doit pas la demander, soit il faut une RPC
   bornée pour les visiteurs (comme `get_staff_directory` ou
   `resolve_marketplace_participants`).
2. **La page publique « presques-évaluations » a besoin de `profiles`.** Depuis
   le durcissement, `anon` ne lit plus cette table. Même alternative : retirer le
   besoin, ou le servir par une fonction qui ne rend que le strict nécessaire.

⚠️ Dans les deux cas, **ne pas re-`grant` à `anon`** sans mesurer ce que ça
rouvre : c'est la cause racine de l'audit d'août.

## La limite, et ce qu'il faut en faire

**La fenêtre est de 7 jours maximum, et rien n'est archivé.** Une panne
apparue et corrigée il y a huit jours est invisible, et une panne installée
depuis trois semaines n'affiche que ses sept derniers jours.

Donc : **regarder chaque semaine**, sans quoi ce document ne sert à rien. Le
dépôt a déjà deux routines claude.ai programmées (CI nocturne, audit des
dépendances hebdomadaire) qui ouvrent des PR — c'est le même moule. Prompt à
coller dans une troisième :

> Lis les erreurs d'exécution du projet Vercel `prj_7AcalefMmOpS5jANEfVh4LF4t6Hr`
> (équipe `team_gn9W4dSrGih1EsxVMNUg3fZt`) sur les 7 derniers jours. Ignore les
> 404 de balayage de robots. Pour chaque autre groupe d'erreurs, dis : la route,
> le nombre d'utilisateurs touchés, depuis quand, et la cause probable selon
> `docs/ref/observabilite-erreurs-prod.md`. Si une correction est évidente et
> sans décision d'accès, ouvre une PR avec un test. Sinon, pose la question.

Lié : [rls-echecs-silencieux.md](rls-echecs-silencieux.md) — pourquoi tant de
choses échouent sans rien dire.
