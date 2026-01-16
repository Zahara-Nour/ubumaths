# Registre des Sous-Traitants - UbuMaths

> **Article RGPD** : Art. 28 - Sous-traitant
> **Derniere mise a jour** : 2026-01-16
> **Version** : 1.2

---

## Table des matieres

1. [Introduction](#1-introduction)
2. [Liste des sous-traitants](#2-liste-des-sous-traitants)
3. [Details par sous-traitant](#3-details-par-sous-traitant)
4. [Transferts hors UE](#4-transferts-hors-ue)
5. [Procedure de mise a jour](#5-procedure-de-mise-a-jour)

---

## 1. Introduction

Conformement a l'article 28 du RGPD, UbuMaths documente tous les sous-traitants qui traitent des donnees personnelles pour son compte. Ce registre est mis a jour lors de tout changement de sous-traitant.

### Obligations du responsable de traitement

- S'assurer que chaque sous-traitant presente des garanties suffisantes
- Conclure un contrat ou DPA (Data Processing Agreement) avec chaque sous-traitant
- Documenter les sous-traitants ulterieurs (sous-sous-traitants)
- Informer les personnes concernees des sous-traitants

---

## 2. Liste des sous-traitants

| Sous-traitant    | Fonction                | Donnees traitees      | Localisation   | DPA       |
| ---------------- | ----------------------- | --------------------- | -------------- | --------- |
| **Supabase**     | Base de donnees, Auth   | Toutes les donnees    | UE (Frankfurt) | Oui       |
| **Vercel**       | Hebergement, CDN        | Logs, cookies session | USA + UE       | Oui       |
| **Google Cloud** | OAuth, Classroom, Drive | Tokens, fichiers      | USA + UE       | Oui       |
| **Brevo**        | Emails transactionnels  | Emails destinataires  | UE (France)    | Oui       |
| **Groq**         | API LLM (tuteur IA)     | Messages tuteur       | USA            | Oui       |
| **Sentry**       | Monitoring erreurs      | Logs erreurs, user_id | USA + UE       | Optionnel |

---

## 3. Details par sous-traitant

### 3.1 Supabase Inc.

| Attribut           | Valeur                                       |
| ------------------ | -------------------------------------------- |
| **Raison sociale** | Supabase Inc.                                |
| **Adresse**        | 970 Toa Payoh North #07-04, Singapore 318992 |
| **Site web**       | https://supabase.com                         |
| **DPA**            | https://supabase.com/legal/dpa               |
| **Certifications** | SOC 2 Type II, HIPAA eligible                |

#### Donnees traitees

- Profils utilisateurs (noms, emails, roles)
- Donnees pedagogiques (exercices, progression, quiz)
- Messages et communications
- Tokens Google chiffres (AES-256-GCM)
- Donnees de gamification

#### Localisation des donnees

- **Region principale** : `eu-central-1` (Frankfurt, Allemagne)
- **Backups** : Meme region UE
- **Pas de transfert hors UE** pour les donnees de production

#### Mesures de securite

- Chiffrement au repos (AES-256)
- Chiffrement en transit (TLS 1.3)
- Row Level Security (RLS)
- Audit logs disponibles
- Backups automatiques quotidiens

#### Lien DPA

Le DPA Supabase est disponible a : https://supabase.com/legal/dpa

**Actions requises** :

- [x] DPA standard accepte lors de la creation du projet
- [ ] Conserver une copie signee du DPA

---

### 3.2 Vercel Inc.

| Attribut           | Valeur                                       |
| ------------------ | -------------------------------------------- |
| **Raison sociale** | Vercel Inc.                                  |
| **Adresse**        | 340 S Lemon Ave #4133, Walnut, CA 91789, USA |
| **Site web**       | https://vercel.com                           |
| **DPA**            | https://vercel.com/legal/dpa                 |
| **Certifications** | SOC 2 Type II                                |

#### Donnees traitees

- Logs de requetes (IP, user-agent, URLs)
- Cookies de session (httpOnly)
- Code source deploye
- Variables d'environnement (chiffrees)

#### Localisation des donnees

- **Edge Network** : Global (CDN)
- **Fonctions serverless** : Region configurable
- **Region preferee** : `fra1` (Frankfurt) ou `cdg1` (Paris)

#### Transferts hors UE

Vercel utilise des mecanismes de transfert conformes :

- Standard Contractual Clauses (SCCs)
- Adequation pour certaines regions

#### Lien DPA

Le DPA Vercel est disponible a : https://vercel.com/legal/dpa

**Actions requises** :

- [x] DPA standard accepte via ToS
- [ ] Configurer la region preferee en UE si possible

---

### 3.3 Google Cloud Platform / Google Workspace

| Attribut           | Valeur                                                  |
| ------------------ | ------------------------------------------------------- |
| **Raison sociale** | Google LLC                                              |
| **Adresse**        | 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA |
| **Site web**       | https://cloud.google.com                                |
| **DPA**            | https://cloud.google.com/terms/data-processing-addendum |
| **Certifications** | ISO 27001, SOC 1/2/3, FedRAMP, HIPAA                    |

#### Services utilises

| Service              | Usage             | Donnees                  |
| -------------------- | ----------------- | ------------------------ |
| Google OAuth         | Authentification  | Email, nom, photo profil |
| Google Classroom API | Sync classes      | Cours, eleves, devoirs   |
| Google Drive API     | Stockage fichiers | Documents partages       |
| Gmail API            | Envoi emails      | Emails bienvenue eleves  |

#### Donnees traitees

- **OAuth tokens** : Access/refresh tokens (chiffres AES-256-GCM dans Supabase)
- **Profil Google** : Email, nom, avatar
- **Classroom** : Liste des cours, eleves, devoirs
- **Gmail** : Envoi uniquement (pas de lecture)

#### Scopes demandes

```
openid
email
profile
classroom.courses.readonly
classroom.coursework.students.readonly
drive.file
gmail.send
```

> **Note** : Le scope `gmail.send` est utilise uniquement pour l'envoi d'emails de bienvenue aux eleves. Necessaire car les emails scolaires (@ecole.fr) bloquent souvent les emails externes (Brevo). Les emails de consentement parental sont envoyes via Brevo (emails personnels des parents).

#### Localisation des donnees

- Serveurs Google globaux avec options de localisation
- Donnees pouvant etre stockees en UE ou USA selon configuration du compte Google de l'utilisateur

#### Lien DPA

- **Cloud DPA** : https://cloud.google.com/terms/data-processing-addendum
- **Workspace DPA** : https://workspace.google.com/terms/dpa_terms.html

**Actions requises** :

- [x] DPA Google Cloud accepte
- [ ] Verifier les parametres de localisation des donnees
- [x] Scope `gmail.send` documente - utilise pour emails bienvenue (emails scolaires)

---

### 3.4 Brevo (ex-Sendinblue)

| Attribut           | Valeur                                       |
| ------------------ | -------------------------------------------- |
| **Raison sociale** | Brevo (anciennement Sendinblue)              |
| **Adresse**        | 106 boulevard Haussmann, 75008 Paris, France |
| **Site web**       | https://www.brevo.com                        |
| **DPA**            | https://www.brevo.com/legal/termsofuse/      |
| **Certifications** | ISO 27001, RGPD natif (entreprise francaise) |

#### Donnees traitees

- Adresses email des destinataires (parents uniquement)
- Contenu des emails transactionnels
- Logs d'envoi (deliverabilite, ouvertures)

#### Localisation des donnees

- **Region** : France / Union Europeenne
- **Pas de transfert hors UE**

#### Finalites

- Envoi d'emails de consentement parental (Art. 8 RGPD)

> **Note** : Les emails de bienvenue aux eleves sont envoyes via Gmail du professeur car les emails scolaires bloquent souvent les expediteurs externes.

#### Mesures de securite

- Chiffrement TLS pour l'envoi
- Pas de stockage long terme du contenu des emails
- Authentification SPF/DKIM/DMARC

#### Lien DPA

DPA disponible sur demande via le dashboard Brevo.

**Actions requises** :

- [x] Compte cree et API key configuree
- [ ] Verifier le domaine d'envoi (SPF/DKIM)
- [ ] Configurer l'adresse d'envoi verifiee

---

### 3.5 Groq Inc.

| Attribut           | Valeur                                                 |
| ------------------ | ------------------------------------------------------ |
| **Raison sociale** | Groq Inc.                                              |
| **Adresse**        | Mountain View, CA, USA                                 |
| **Site web**       | https://groq.com                                       |
| **DPA**            | https://groq.com/legal/dpa (ou via contrat entreprise) |

#### Donnees traitees

- Messages envoyes au tuteur IA
- Contexte pedagogique (exercice en cours, niveau)
- **Pas de donnees d'identification directe** envoyees

#### Mesures de minimisation

- Pas d'envoi de noms/emails a l'API
- Pas de retention des conversations par Groq (zero data retention policy)
- Contexte anonymise avant envoi

#### Localisation

- Serveurs USA
- Inference en temps reel (pas de stockage)

#### Lien DPA

**Actions requises** :

- [ ] Verifier les conditions de service Groq
- [ ] Obtenir confirmation ecrite de la politique zero-retention
- [ ] Considerer alternative europeenne si necessaire

---

### 3.6 Sentry (Functional Software Inc.)

| Attribut           | Valeur                                                     |
| ------------------ | ---------------------------------------------------------- |
| **Raison sociale** | Functional Software Inc. (Sentry)                          |
| **Adresse**        | 45 Fremont Street, 8th Floor, San Francisco, CA 94105, USA |
| **Site web**       | https://sentry.io                                          |
| **DPA**            | https://sentry.io/legal/dpa/                               |
| **Certifications** | SOC 2 Type II, GDPR compliant                              |

#### Statut

**OPTIONNEL** - Sentry n'est pas actuellement utilise en production. Le monitoring des erreurs est gere via la table `error_logs` dans Supabase.

#### Donnees potentiellement traitees (si active)

- Stack traces d'erreurs
- User ID (si fourni)
- URL de la page
- Metadonnees navigateur

#### Lien DPA

Le DPA Sentry est disponible a : https://sentry.io/legal/dpa/

**Actions requises** :

- [ ] Si Sentry est active, accepter le DPA
- [ ] Configurer le scrubbing des donnees personnelles
- [ ] Choisir la region UE si disponible

---

## 4. Transferts hors UE

### Mecanismes de transfert

Conformement au Chapitre V du RGPD, les transferts vers des pays tiers sont encadres par :

| Sous-traitant | Mecanisme                    | Reference              |
| ------------- | ---------------------------- | ---------------------- |
| Supabase      | Region UE (pas de transfert) | -                      |
| Vercel        | SCCs + DPA                   | Art. 46(2)(c)          |
| Google        | SCCs + DPA + BCRs            | Art. 46(2)(c), Art. 47 |
| Brevo         | France (pas de transfert)    | -                      |
| Groq          | SCCs (a verifier)            | Art. 46(2)(c)          |
| Sentry        | SCCs + DPA                   | Art. 46(2)(c)          |

### Decisions d'adequation

La Commission europeenne a reconnu un niveau de protection adequat pour :

- Suisse, Canada, Japon, Royaume-Uni, Coree du Sud, etc.
- USA : Data Privacy Framework (depuis juillet 2023)

---

## 5. Procedure de mise a jour

### Ajout d'un nouveau sous-traitant

1. **Evaluation** : Verifier les garanties de securite et conformite RGPD
2. **DPA** : S'assurer qu'un DPA est disponible et l'accepter
3. **Documentation** : Mettre a jour ce registre
4. **Notification** : Informer les utilisateurs si necessaire (mise a jour politique de confidentialite)

### Revue periodique

- **Frequence** : Trimestrielle
- **Responsable** : Responsable de traitement / DPO
- **Actions** : Verifier la validite des DPAs, les certifications, les incidents de securite

### Historique des modifications

| Date       | Version | Modification                                        |
| ---------- | ------- | --------------------------------------------------- |
| 2026-01-16 | 1.2     | Strategie hybride: Brevo (parents) + Gmail (eleves) |
| 2026-01-16 | 1.1     | Ajout Brevo pour emails consentement parental       |
| 2026-01-16 | 1.0     | Creation initiale du registre                       |

---

## Annexe : Checklist DPA

### Pour chaque sous-traitant, verifier :

- [ ] Existence d'un DPA ecrit (Art. 28(3))
- [ ] Objet et duree du traitement definis
- [ ] Nature et finalite du traitement definis
- [ ] Types de donnees personnelles traites
- [ ] Categories de personnes concernees
- [ ] Obligations et droits du responsable de traitement
- [ ] Instructions documentees (Art. 28(3)(a))
- [ ] Confidentialite des personnes autorisees (Art. 28(3)(b))
- [ ] Mesures de securite appropriees (Art. 28(3)(c))
- [ ] Conditions pour les sous-traitants ulterieurs (Art. 28(3)(d))
- [ ] Assistance pour les droits des personnes (Art. 28(3)(e))
- [ ] Assistance pour les obligations de securite (Art. 28(3)(f))
- [ ] Suppression ou restitution des donnees (Art. 28(3)(g))
- [ ] Audits et inspections possibles (Art. 28(3)(h))

---

**Document maintenu par** : Equipe UbuMaths
**Contact** : [A definir]
