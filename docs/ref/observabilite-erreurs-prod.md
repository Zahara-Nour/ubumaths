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

| Erreur                                                                | Portée                                         | Suite donnée                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `checkForTemplateUpdates` → `PGRST116`                                | 14 occurrences, 2 profs, depuis le 13/09       | **Corrigé** (`.maybeSingle()`) + test                             |
| `game_leaderboard` → `42501 permission denied`                        | 3 occurrences, 3 utilisateurs, depuis le 06/09 | **Corrigé** — ce n'était pas une question d'accès (voir plus bas) |
| `presques-evaluations` → `42501 permission denied for table profiles` | 2 utilisateurs, page **publique**              | ⏸️ **question d'accès** (voir plus bas)                           |

### Les deux questions d'accès qui restent

Elles ne se tranchent pas en lisant du code — ce sont des questions de produit,
et la réponse facile (« rendre l'accès à `anon` ») déferait le durcissement
d'août.

~~1. Le classement des jeux doit-il être visible sans être connecté ?~~
**Ce n'en était pas une** — mal qualifié au premier passage. La page est bien
sous `(protected)`, mais son `load` n'attendait pas `parent()`. Or SvelteKit
exécute les `load` du layout et de la page **en parallèle** : la RPC partait
avant que le garde n'ait redirigé, donc en tant qu'`anon`. D'où le `42501`,
transformé en **500** au lieu d'une redirection vers `/login`. Corrigé par un
`await parent()`, le motif que documente déjà `(protected)/+layout.server.ts`.

⚠️ **À vérifier sur toute page `(protected)` qui interroge la base** : sans
`await parent()` — ou sans garde explicite (`requireAdmin`, `locals.user`…) — le
`load` s'exécute pour un visiteur non connecté. Les 12 autres pages du dépôt qui
appellent une RPC ont été vérifiées une par une : toutes gardées.

1. **La page publique « presques-évaluations » a besoin de `profiles`.** Depuis
   le durcissement, `anon` ne lit plus cette table. Même alternative : retirer le
   besoin, ou le servir par une fonction qui ne rend que le strict nécessaire.

⚠️ Dans les deux cas, **ne pas re-`grant` à `anon`** sans mesurer ce que ça
rouvre : c'est la cause racine de l'audit d'août.

## La limite, et pourquoi ça ne s'automatise pas (encore)

**La fenêtre est de 7 jours, et rien n'est archivé.** Une panne apparue et
corrigée il y a huit jours est invisible ; une panne installée depuis trois
semaines n'affiche que ses sept derniers jours.

⚠️ **Il n'existe aucun chemin d'automatisation aujourd'hui.** Les deux idées
évidentes ont été essayées, et échouent toutes les deux :

1. **Une routine cloud claude.ai** — impossible : les routines cloud **n'ont pas
   accès aux connecteurs MCP**. Vérifié quatre fois le 2026-06-14 (« No connected
   MCP connectors found »), et c'est pour cette raison exacte que les routines
   « advisors Supabase » et « erreurs de prod » avaient déjà été abandonnées à
   l'époque. Les quatre routines qui tournent (triage CI, audit des dépendances,
   scan de secrets, hygiène des PR) ne dépendent, elles, que de `git` et `gh`.
2. **Le CLI Vercel** — `vercel logs --environment production --level error
--since 7d` fonctionne, mais **ne voit pas les mêmes données** : il rend
   « No logs found » là où `get_runtime_errors` remonte 14 groupes. Le CLI lit
   les journaux bruts (rétention courte) ; l'outil MCP lit la table d'erreurs
   **agrégée** (7 jours). Mesuré le 2026-09-15 sur le message exact
   « Enrichissement illisible » : trouvé par le MCP, introuvable par le CLI.

   ⚠️ Un script `pnpm errors:prod` bâti sur le CLI annoncerait donc « aucune
   erreur » alors qu'il y en a. Pire que rien : ça institutionnalise le piège du
   journal vide. **Ne pas le faire.**

### Donc : un rituel, pas une automatisation

Le seul chemin fiable est l'outil MCP — c'est-à-dire **moi, en session**, ou toi
dans le tableau de bord Vercel (Observability → Errors).

Pour que ça arrive vraiment, l'accrocher à un geste qui existe déjà :

- **après chaque `pnpm db:migrate`** — c'est là qu'on casse le plus, et c'est
  déjà le moment retenu en juin pour relancer les advisors Supabase ;
- **au début d'une session de travail sur la prod**, avant d'ouvrir un chantier.

Ça demande quatre minutes et ça a trouvé trois pannes du premier coup, dont une
vieille de neuf jours.

Lié : [rls-echecs-silencieux.md](rls-echecs-silencieux.md) — pourquoi tant de
choses échouent sans rien dire.
