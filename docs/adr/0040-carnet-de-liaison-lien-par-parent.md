# 0040 — Le carnet de liaison : un lien par parent, des courriels sur exception

- **Statut** : acceptée — phase 0 du chantier `partage-parents` (journal
  `docs/wip/partage-parents-progress.md`, tours 1 à 5) ; mise en œuvre par les PR #2718, #2724,
  #2731, #2736 et #2737 (fonctionnement : [carnet-de-liaison.md](../systeme/carnet-de-liaison.md))
- **Date** : 2026-11-16 · **Décidée par** : David

## Contexte

Chiphre connaît l'adresse d'un parent (consentement parental, inscription par le parent) mais ne lui
montre rien du travail de l'enfant : la décision 8 du 2026-10-21 (« le parent ne voit rien du compte
de l'enfant ») et l'absence de compte parent. Les liens sans compte du cahier et du cours
([ADR 0025](0025-cours-lisible-par-lien-sans-compte.md)) sont par classe et ne disent rien d'un élève.

## Décision

Un **carnet de liaison** (terme de [`CONTEXT.md`](../../CONTEXT.md)) : page personnelle d'**un** parent
sur **un** élève, sans compte, par un lien qui lui est propre.

| Sujet               | Décision                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lien                | **Un par parent** (révocation séparée, traçabilité d'une fuite) ; deux parents au plus                                                                         |
| Adresse             | **Confirmée seulement** (consentement accordé, ou clic sur un lien de confirmation) ; rien d'autre ne part                                                     |
| Porte d'entrée      | **Une fonction `SECURITY DEFINER`** qui reçoit le lien ; `anon` ne lit aucune table                                                                            |
| Ce qui est lisible  | Palier de régularité par semaine (depuis la rentrée, règle de la grille du prof), état des révisions, évaluations faites ou non avec échéance, liens de classe |
| Jamais lisible      | Notes, réponses, messages, avertissements, profil, adresses, tout autre élève                                                                                  |
| Élève               | Voit **le même carnet** dans son Cabinet, et la liste des courriels envoyés à ses parents                                                                      |
| Qui règle           | Le professeur, **par classe** (activation, seuils) ; le carnet ne part qu'à son geste                                                                          |
| Dérangement         | **Courriels sur exception** (évaluation non faite, révisions en retard, inactivité), un par semaine au plus                                                    |
| Message positif     | Un par trimestre, seulement s'il y a du vrai à dire                                                                                                            |
| Vacances            | Aucun courriel (`school_holidays`), sauf échéance dans la période                                                                                              |
| Durée de vie        | Le lien expire le 31 août ; nouveau lien à la rentrée si la nouvelle classe a le carnet                                                                        |
| Élève majeur        | Demande l'arrêt au professeur, qui coupe le partage ; aucune date de naissance enregistrée                                                                     |
| Arrêt par le parent | « Ne plus recevoir ces courriels » en un clic ; le carnet reste ouvert                                                                                         |
| Stockage du lien    | **Haché** ; « J'ai perdu mon lien » envoie un nouveau lien et révoque l'ancien                                                                                 |

## Invariants

- Le lien **ne fait que lire** ; il n'ouvre ni le compte de l'enfant, ni le cahier ou le cours d'une
  autre classe, ni un autre élève.
- Lien révoqué, expiré, inexistant, partage coupé, élève sorti de la classe : **la même réponse**.
- Aucun courriel vers une adresse non confirmée ; le courriel de confirmation ne nomme l'élève que par
  son **prénom**, avec le nom du professeur (ni nom de famille, ni école, ni classe).
- « J'ai perdu mon lien » répond la même chose qu'une adresse soit connue ou non.
- Pages en `noindex`.

## Écarté

- **Compte parent** : lourd, contredit la décision 8 ; à rediscuter pour l'offre payante.
- **Bilan hebdomadaire systématique** : submerge les familles (« on est tous déjà submergés »).
- **SMS** : un numéro de plus à collecter.
- **« L'élève peut cacher »** (partage seulement s'il l'accepte) : l'autorité parentale court jusqu'à
  18 ans ; le seuil RGPD de 15 ans porte sur le consentement au traitement, pas sur l'information des
  parents.
- **Arrêt automatique à 18 ans** : exige une date de naissance (minimisation).
- **Temps passé** dans le carnet : mal mesuré (un onglet ouvert compte comme du travail).
- **Comportement (avertissements C/M/R/T)** : mal compris hors de la classe ; écarté pour l'instant.
- **Policy `anon`** sur les tables d'activité : l'erreur du finding H8 (cf. ADR 0025).

## Conséquences

- La fonction du carnet refait à la main ce qu'elle lit (activité, révisions, évaluations) : un nouveau
  type de travail n'apparaît pas dans le carnet tant qu'on ne l'y ajoute pas.
- Les **notes** (résultats détaillés) relèvent de l'offre payante ; les ajouter ouvre une nouvelle
  question d'accès.
- Élèves hors classe : pas de carnet dans la première version.
- Le carnet donne au parent les **liens du cahier et du cours** de la classe (avec son nom) : ces
  liens sont ceux de la classe ([ADR 0025](0025-cours-lisible-par-lien-sans-compte.md)). Retirer
  l'adresse d'un parent, ou couper le partage, **ne coupe pas** les liens de classe qu'il a déjà vus ;
  seul leur renouvellement par le professeur le fait (dit sur l'écran du professeur).
- **Retirer une adresse** (amendement du 2026-11-16, Q31) : « révoquer un lien » ne suffisait pas,
  l'adresse restée confirmée en récupérait un par « J'ai perdu mon lien ». Le professeur **retire**
  l'adresse (état `removed` : effacée, liens révoqués, place libérée) ; elle ne revient que s'il la
  ressaisit. Le besoin est de corriger une adresse fausse (bidon, mauvaise personne, périmée), pas
  d'écarter un parent : un parent qui a l'autorité parentale reste en droit d'être informé.
- **Lien neuf avant l'envoi** (Q32, accepté) : un lien neuf révoque l'ancien avant l'envoi du
  courriel ; un envoi en échec laisse le parent sans lien jusqu'au renvoi, et un tiers qui connaît
  son adresse peut faire tourner son lien (3 fois par jour). Gêne sans fuite.
- Le professeur lit les adresses et l'état des liens, **jamais les empreintes** (droits par colonne) :
  l'empreinte d'une adresse refusée n'est pas anonyme (sha256 non salé).
- **Effacement des adresses** (amendement du 2026-11-16, Q35) : les adresses d'un élève qui n'est
  membre actif d'**aucune classe active depuis 90 jours** sont effacées (ligne entière : adresse,
  empreinte, liens) ; le journal des courriels reste, sans l'adresse. Les 90 jours se comptent par une
  marque du passage quotidien (`orphaned_since`), pas par `left_at` (vide sur les membres archivés).
  « Gardées d'une année à l'autre » (Q21) tient : l'été dure moins de 90 jours. Un parent effacé doit
  être ressaisi et reconfirmé ; une adresse « Je ne suis pas le parent » effacée ainsi peut être
  ressaisie.
- **Un jeton par courriel** (amendement du 2026-11-16, Q38) : le lien du parent est stocké haché, le
  passage quotidien ne le connaît pas. Chaque courriel d'exception ou trimestriel porte son **propre
  jeton**, haché sur sa ligne du journal ; il ouvre le carnet et arrête les courriels aux mêmes
  conditions que le lien du parent, et seulement tant que vit le lien qui était actif à l'envoi.
  Écartés : un lien neuf à chaque courriel (il tuerait le raccourci de l'écran d'accueil) ; un
  courriel sans lien. Question d'accès : le détenteur d'un courriel lit le carnet tant que le lien du
  parent vit, comme celui qui détient le courriel du lien.
- **Pas de désinscription en un geste par la messagerie** (2026-11-16, Q39, recommandation en
  attente de David) : `List-Unsubscribe-Post` exige d'accepter un POST sans en-tête `Origin`, que
  SvelteKit refuse avant tout hook. L'en-tête `List-Unsubscribe` mène au carnet (`#courriels`), où le
  parent clique « Ne plus recevoir ». Gmail n'exige le geste unique qu'au-delà de 5 000 courriels par
  jour.
- **Arrivée en cours d'année** (amendement du 2026-11-17, Q43) : l'inactivité, l'alerte d'évaluation
  non faite et le carnet se comptent depuis l'arrivée de l'élève dans une classe au carnet, pas
  depuis la rentrée (sinon fausse alarme dès le lendemain de son arrivée). Une évaluation sans
  échéance non faite ne reste que si elle date de l'année scolaire en cours (Q27 bornée).
