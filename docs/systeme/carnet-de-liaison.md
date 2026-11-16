---
couvre:
  - 'src/lib/server/carnet/**'
  - src/lib/validation/carnet.ts
  - 'src/lib/components/carnet/**'
  - 'src/routes/(public)/carnet/**'
  - 'src/routes/(protected)/dashboard/student/carnet/**'
  - 'src/routes/(protected)/dashboard/teacher/classes/[classId]/carnet/**'
  - src/lib/email-templates/carnet.ts
---

# Carnet de liaison

> Première doc de cette zone, écrite avec la PR 2 du chantier
> [`partage-parents`](../wip/partage-parents-progress.md) (2026-11-16) ; côté professeur et
> envois ajoutés en PR 3 ; passage quotidien (courriels d'exception, trimestriel, effacement)
> en PR 4 (migration `20261116215952`, cron `api/cron/carnet-de-liaison`). Le versement complet en
> PR 5. Vérifié contre le code le 2026-11-16. Décision :
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

| Adresse                                       | Qui                    | Ce qu'elle fait                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/carnet/[token]`                             | le parent, sans compte | Le carnet (`CarnetView`) ; arrêter ou reprendre les courriels. Tout échec (révoqué, expiré, inexistant, partage coupé, élève sorti de la classe) rend le **même** 404.                                                                                                                                         |
| `/carnet/confirmer/[token]`                   | l'adresse saisie       | Deux boutons : « Confirmer mon adresse » (émet le lien et l'**envoie par courriel** — la page ne le montre pas, Q26 : un antivirus qui clique n'emporte rien) et « Je ne suis pas le parent » (adresse effacée). L'affichage seul n'appelle pas la base.                                                       |
| `/carnet/lien-perdu`                          | le parent, sans compte | Saisir son adresse : chaque élève dont elle est confirmée et le carnet ouvert reçoit un lien **neuf** (l'ancien est révoqué). Même réponse que l'adresse soit connue ou non ; envoi après la réponse ; limites par IP (5 / 10 min) et par empreinte d'adresse (3 / jour).                                      |
| `/dashboard/student/carnet`                   | l'élève                | Son carnet, l'état du partage, les courriels envoyés à ses parents (date, nature, motifs ; jamais les adresses). Ajouter l'adresse d'un parent (carnet ouvert, moins de 2 parents ; 6 ajouts / heure). Entrée « Carnet de liaison » du menu, toujours visible.                                                 |
| `/dashboard/teacher/classes/[classId]/carnet` | le professeur          | Activer (en annonçant le nombre de courriels), désactiver, seuils des exceptions ; « Envoyer les liens manquants » ; par élève : état des adresses, ajouter, renvoyer une confirmation, nouveau lien, retirer une adresse, couper / rétablir le partage. Bouton « Carnet de liaison » de la liste des classes. |

## Les envois

Toutes les écritures sur les adresses et les liens passent par
`src/lib/server/carnet/envois.ts` (service role), après les gardes de la route (rôle, élève
membre actif de la classe, limite de débit). Courriels : `src/lib/email-templates/carnet.ts`.

- **Confirmation** (A2, A4) : vers une adresse saisie par le professeur ou l'élève ; le prénom
  de l'élève et le nom du professeur seulement (Q18). Jeton neuf à chaque envoi (seul le
  dernier courriel confirme), valable 7 jours ; 3 envois au plus par adresse, réservés par
  mise à jour conditionnelle et rendus si Brevo refuse.
- **Lien** (A1, A6, D2, Q26) : vers une adresse **confirmée** seulement ; le lien neuf révoque
  le précédent ; si le courriel ne part pas, le lien neuf est révoqué (il redevient
  « manquant »).
- **Adresse déjà connue** de l'élève (unicité élève × empreinte), saisie par le
  **professeur** : en attente → nouvelle confirmation ; invalide → remise en attente (sauf
  quota épuisé) ; retirée → remise en attente, quota à zéro ; refusée → jamais ; confirmée →
  rien. Saisie par l'**élève** : rien ne part, et il lit une réponse **neutre** (la page ne lui
  dit pas l'état d'une adresse de ses parents, ni ne lui laisse épuiser un quota). Reste, accepté :
  il distingue une adresse connue d'une adresse neuve, pour son propre carnet (6 essais par
  heure). Deux
  adresses actives au plus (`UBP01`).
- **Retirer une adresse** (D2, Q31) : état `removed` (migration
  `20261116204753_carnet_adresse_retiree.sql`) ; adresse effacée, empreinte gardée, liens
  révoqués par trigger, place libérée. Elle ne revient ni par l'élève, ni par un
  consentement, ni par « lien perdu » ; le professeur seul la ressaisit. Les liens du cahier
  et du cours de la classe déjà vus restent ouverts (dit à l'écran).
- **Carnet fermé** (classe désactivée ou archivée, élève sorti) : `sendCarnetLink` regarde
  `carnet_student_is_shared` avant d'émettre ; aucun lien ne part vers un carnet qui
  afficherait « lien plus valide ».
- **Liens manquants** d'une classe (A1, Q29) : `planMissingLinks` (pure) crée, confirmées, les
  adresses des consentements accordés (dans la limite de deux), confirme les adresses en
  attente qu'un consentement couvre, puis envoie un lien à chaque adresse confirmée sans lien
  actif ; élèves au partage coupé exclus. Le même plan donne le nombre annoncé avant
  d'activer (Q30). Rejouable sans doublon ; l'envoi automatique (élève arrivé après) vient
  avec le cron de la PR 4.
- **Couper le partage** (D3) : une ligne `student_carnet_opt_outs` écrite par le client du
  professeur (le trigger révoque les liens) ; les liens du cahier et du cours de la classe
  restent ouverts. **Rétablir** : ligne retirée, puis lien neuf pour chaque adresse
  confirmée.
- Chaque courriel, parti ou non, laisse une ligne `parent_notifications` (sans l'adresse) ;
  le professeur voit « dernier envoi en échec » (E6).

### Limite connue (Q32, acceptée)

Un lien neuf révoque l'ancien **avant** l'envoi du courriel (fonction SQL
`issue_parent_carnet_link`). Si Brevo échoue, le parent n'a plus de lien jusqu'au renvoi (le
professeur voit « dernier envoi en échec ») ; une personne qui connaît son adresse peut faire
tourner son lien par « J'ai perdu mon lien » (3 fois par jour au plus). Rien ne fuit : le
lien neuf ne part qu'à l'adresse du parent. De même, une nouvelle confirmation remplace la
précédente. Tranché par David le 2026-11-16 : accepté, pas de changement de la fonction.

Les échecs de Brevo sont journalisés par message et code seulement : l'objet d'erreur garde
le corps du courriel, donc les liens à jeton.

## Le passage quotidien

Cron Vercel `/api/cron/carnet-de-liaison`, chaque jour à 16 h UTC (17 h à Paris l'hiver, 18 h
l'été), `Bearer CRON_SECRET` ; journal `background_job_runs` (job `carnet_de_liaison`, nombres
seulement). Module `src/lib/server/carnet/courriels.ts` (`runCarnetDaily`), dans cet ordre :

1. **Effacement** (Q21, Q35) : `carnet_erase_orphan_contacts` marque `orphaned_since` le premier
   jour où l'élève n'est dans aucune classe active, retire la marque s'il revient, efface les
   adresses marquées depuis 90 jours (ligne entière, liens et épisodes ; le journal des
   courriels garde ses lignes sans adresse). Une adresse « Je ne suis pas le parent » effacée
   ainsi peut être ressaisie.
2. **Liens manquants** (Q29, Q36) : `sendClassMissingLinks` sur chaque classe active au carnet
   activé (élève arrivé après, consentement accordé après, rentrée, envoi en échec).
3. **Exceptions** (E1-E3, E7) : `carnet_sync_exception_episodes` ouvre un épisode par adresse
   et par exception en cours (évaluation non faite dans les 7 jours après l'échéance, une par
   évaluation ; plus ancienne révision en retard depuis plus de N jours ; aucun jour actif sur
   les N derniers jours de classe hors vacances, depuis la rentrée ; année scolaire inconnue →
   pas d'inactivité) et ferme ceux qui ont disparu ; `carnet_exception_plan` rend un courriel
   par adresse qui a des épisodes non signalés, si aucun courriel d'exception ou trimestriel
   n'est parti vers elle depuis 6 j 12 h (Q19, Q33) ; pendant les vacances, seules les
   évaluations non faites partent. Épisode marqué signalé après l'envoi ; en échec, nouvel
   essai le lendemain (E6).
4. **Trimestriel** (E4, Q34), lu **après** l'envoi des exceptions : `carnet_quarterly_plan`,
   trimestre fini depuis 30 jours au plus (`academic_periods`), hors vacances, sous le
   plafond ; « a travaillé régulièrement » (un jour actif dans 2 semaines de classe sur 3) et
   « révisions à jour », sans aucun nombre ; rien de vrai → rien ne part.

Au plus 150 courriels par passage (la moitié du quota Brevo), le reste le lendemain. Courriels :
`getCarnetExceptionEmail*`, `getCarnetQuarterlyEmail*` (`src/lib/email-templates/carnet.ts`),
une phrase par motif, jamais plus que le carnet.

**Jeton d'un courriel** (Q38) : chaque courriel d'exception ou trimestriel porte son propre
jeton, haché dans `parent_notifications.access_token_hash` (ligne écrite « failed » avant
l'envoi, passée « sent » après). `carnet_contact_by_token` accepte le lien du parent ou ce
jeton, tant que le lien qui était actif au moment de l'envoi vit : un lien neuf (retrait puis
ressaisie, rentrée, lien perdu) ne ranime pas les anciens courriels. Le courriel mène au carnet
et à son bas (`#courriels`, bouton « Ne plus recevoir ») ; en-tête `List-Unsubscribe` vers ce
même lien. Pas de `List-Unsubscribe-Post` : SvelteKit refuse, avant tout hook, un POST de
formulaire sans `Origin` de notre site (Q39).

### Limites connues (PR 4)

- Les rejets définitifs que Brevo signale **après** l'envoi ne marquent pas l'adresse
  `invalid` (pas de webhook Brevo) ; seuls les échecs immédiats sont journalisés.
- `access_count` du lien compte aussi les ouvertures par le jeton d'un courriel.
- Arrêter puis reprendre les courriels resignale une exception encore en cours ; un élève
  arrivé en cours d'année est jugé inactif depuis la rentrée de l'école ; une évaluation sans
  échéance jamais faite reste dans le carnet d'une année sur l'autre (Q27).

## Les portes

- Les fonctions SQL qui reçoivent un lien (`get_carnet_by_token`, `confirm_parent_contact`,
  `issue_parent_carnet_link`, `refuse_parent_contact`, `set_parent_emails_stopped`) sont
  réservées au **service role** ; seuls `src/lib/server/carnet/carnet.ts` et `envois.ts` les
  appellent (avec `carnet_student_is_shared` avant chaque lien émis), après la
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

- `src/lib/server/carnet/__tests__/carnet.test.ts` : jeton, empreinte, portes.
- `src/lib/server/carnet/__tests__/envois.test.ts` : confirmations, liens, quota, plan des
  liens manquants, lien perdu. `src/lib/email-templates/__tests__/carnet.test.ts` : courriels.
- `src/routes/(protected)/dashboard/teacher/classes/[classId]/carnet/__tests__/` : gardes,
  appartenance à la classe, gestes.
- `src/routes/(public)/carnet/**/__tests__/`, `src/routes/(protected)/dashboard/student/carnet/__tests__/`.
- `src/lib/components/carnet/__tests__/CarnetView.svelte.test.ts` : paliers, évaluations par
  ligne, aucune note.
- `tests/integration/carnet-courriels-exception.test.ts` : exceptions, épisodes, plafond,
  vacances, jeton d'un courriel, Q27, trimestriel, effacement.
- `tests/integration/carnet-passage-quotidien.test.ts` : `runCarnetDaily` contre la base locale,
  Brevo simulé (lien manquant, courriel et jeton, second passage, échec Brevo, plafond).
- `src/routes/api/cron/carnet-de-liaison/__tests__/route.test.ts` : jeton du cron, journal.
- `tests/integration/carnet-de-liaison.test.ts` : fonctions SQL et droits ; bloc « PR 3 » :
  empreinte du serveur = celle du trigger, porte `carnet_student_is_shared`, upsert des
  réglages et de l'opt-out par le professeur.
