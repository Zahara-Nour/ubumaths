# 0040 — Le carnet de liaison : un lien par parent, des courriels sur exception

- **Statut** : acceptée — phase 0 du chantier `partage-parents` (journal
  `docs/wip/partage-parents-progress.md`, tours 1 à 5) ; mise en œuvre à venir
- **Date** : 2026-11-16 · **Décidée par** : David

## Contexte

Chiphre connaît l'adresse d'un parent (consentement parental, inscription par le parent) mais ne lui
montre rien du travail de l'enfant : la décision 8 du 2026-10-21 (« le parent ne voit rien du compte
de l'enfant ») et l'absence de compte parent. Les liens sans compte du cahier et du cours
([ADR 0025](0025-cours-lisible-par-lien-sans-compte.md)) sont par classe et ne disent rien d'un élève.

## Décision

Un **carnet de liaison** (terme de [`CONTEXT.md`](../../CONTEXT.md)) : page personnelle d'**un** parent
sur **un** élève, sans compte, par un lien qui lui est propre.

| Sujet               | Décision                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Lien                | **Un par parent** (révocation séparée, traçabilité d'une fuite) ; deux parents au plus                      |
| Adresse             | **Confirmée seulement** (consentement accordé, ou clic sur un lien de confirmation) ; rien d'autre ne part  |
| Porte d'entrée      | **Une fonction `SECURITY DEFINER`** qui reçoit le lien ; `anon` ne lit aucune table                         |
| Ce qui est lisible  | Jours travaillés (5 semaines), état des révisions, évaluations faites ou non avec échéance, liens de classe |
| Jamais lisible      | Notes, réponses, messages, avertissements, profil, adresses, tout autre élève                               |
| Élève               | Voit **le même carnet** dans son Cabinet, et la liste des courriels envoyés à ses parents                   |
| Qui règle           | Le professeur, **par classe** (activation, seuils) ; le carnet ne part qu'à son geste                       |
| Dérangement         | **Courriels sur exception** (évaluation non faite, révisions en retard, inactivité), un par semaine au plus |
| Message positif     | Un par trimestre, seulement s'il y a du vrai à dire                                                         |
| Vacances            | Aucun courriel (`school_holidays`), sauf échéance dans la période                                           |
| Durée de vie        | Le lien expire le 31 août ; nouveau lien à la rentrée si la nouvelle classe a le carnet                     |
| Élève majeur        | Demande l'arrêt au professeur, qui coupe le partage ; aucune date de naissance enregistrée                  |
| Arrêt par le parent | « Ne plus recevoir ces courriels » en un clic ; le carnet reste ouvert                                      |
| Stockage du lien    | **Haché** ; « J'ai perdu mon lien » envoie un nouveau lien et révoque l'ancien                              |

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
