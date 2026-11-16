---
couvre:
  - 'src/lib/server/carnet/**'
  - src/lib/validation/carnet.ts
  - 'src/lib/components/carnet/**'
  - 'src/routes/(public)/carnet/**'
  - 'src/routes/(protected)/dashboard/student/carnet/**'
---

# Carnet de liaison

> Première doc de cette zone, écrite avec la PR 2 du chantier
> [`partage-parents`](../wip/partage-parents-progress.md) (2026-11-16). Le versement complet
> (côté professeur, envois, courriels d'exception) vient en PR 5. Décision :
> [ADR 0040](../adr/0040-carnet-de-liaison-lien-par-parent.md).

## À quoi ça sert

Le **carnet de liaison** est la page d'**un** parent sur **un** élève, lue sans compte par un
lien qui lui est propre ([CONTEXT.md](../../CONTEXT.md)). L'élève voit le même carnet depuis
son Cabinet, avec « Tes parents voient cette page ».

Le carnet montre seulement (question d'accès Q16) : le prénom, un **palier** de jours de
travail pour chacune des 5 dernières semaines (0, 1, 2-3, 4+ ; jamais le nombre exact ni les
jours), le nombre de révisions en retard, les évaluations faites ou non (**jamais la note**),
et les liens du cahier et du cours de la classe.

## Les surfaces

| Adresse                     | Qui                    | Ce qu'elle fait                                                                                                                                                                     |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/carnet/[token]`           | le parent, sans compte | Le carnet (`CarnetView`) ; arrêter ou reprendre les courriels. Tout échec (révoqué, expiré, inexistant, partage coupé, élève sorti de la classe) rend le **même** 404.              |
| `/carnet/confirmer/[token]` | l'adresse saisie       | Deux boutons : « Confirmer mon adresse » (émet le lien et ouvre le carnet, `?bienvenue`) et « Je ne suis pas le parent » (adresse effacée). L'affichage seul n'appelle pas la base. |
| `/dashboard/student/carnet` | l'élève                | Son carnet, l'état du partage, les courriels envoyés à ses parents (date, nature, motifs ; jamais les adresses). Entrée « Carnet de liaison » du menu, toujours visible.            |

## Les portes

- Les fonctions SQL qui reçoivent un lien (`get_carnet_by_token`, `confirm_parent_contact`,
  `issue_parent_carnet_link`, `refuse_parent_contact`, `set_parent_emails_stopped`) sont
  réservées au **service role** ; seul `src/lib/server/carnet/carnet.ts` les appelle, après la
  forme du jeton et la limite de débit par IP des routes (30 lectures / min, 10 gestes de
  confirmation / min). Aucune policy `anon`.
- L'élève lit par **son** client : `get_my_carnet` (garde d'appelant, lui seul) et la RLS de
  `parent_notifications`.
- La forme du carnet (`src/lib/validation/carnet.ts`, Zod) **retire** toute clé hors liste :
  une colonne ajoutée par erreur côté SQL ne descend pas jusqu'à la page.

## Le jeton

- 32 octets aléatoires en base64url (43 caractères) ; la base ne garde que l'empreinte
  sha256. Un lien perdu ne se renvoie pas : on en émet un neuf, qui révoque l'ancien.
- Le lien expire le 31 août (`endOfSchoolYear`, comme le cahier et le cours).
- Le jeton ne sort pas : `noindex`, `Cache-Control: private, no-store`, aucun Referer
  (`<meta name="referrer" content="no-referrer">`, liens `noreferrer`), masqué en `[token]`
  dans l'analytique Vercel et dans le journal des erreurs (`redactSecretUrl`,
  [surveillance-des-erreurs.md](surveillance-des-erreurs.md)). Il reste dans les journaux
  d'exécution de Vercel (inhérent à un jeton dans l'adresse).

## Tests

- `src/lib/server/carnet/__tests__/carnet.test.ts` : jeton, empreinte, portes, confirmation.
- `src/routes/(public)/carnet/**/__tests__/`, `src/routes/(protected)/dashboard/student/carnet/__tests__/`.
- `src/lib/components/carnet/__tests__/CarnetView.svelte.test.ts` : paliers, évaluations par
  ligne, aucune note.
- `tests/integration/carnet-de-liaison.test.ts` : fonctions SQL et droits.
