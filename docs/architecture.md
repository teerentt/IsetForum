# Référence du backend IsetForum

Ce document décrit le backend Spring Boot présent dans le dépôt. Tous les chemins Java ci-dessous sont relatifs à [backend/src/main/java/com/example/demo](../backend/src/main/java/com/example/demo). Les commandes de démarrage utilisateur sont dans le [README](../README.md).

## Structure et démarrage

L’application [DemoApplication.java](../backend/src/main/java/com/example/demo/DemoApplication.java) démarre Spring Boot et recherche les composants sous com.example.demo. Le projet utilise Java 17, Spring Web, Spring Security, Spring Data JPA/Hibernate, Bean Validation, Spring Mail, Flyway, MySQL, Apache POI et PDFBox. Maven Wrapper fournit Maven ; le JDK reste nécessaire sur la machine.

| Package | Responsabilité |
| --- | --- |
| controller/auth, community, publication, attachment, admin | Routes HTTP, Authentication, DTO validés et statut de réponse |
| dto/auth, community, membership, publication, registration, attachment, user, common | Contrats d’entrée/sortie et erreurs ; aucune sérialisation directe des comptes avec mot de passe |
| service/user, community, publication, registration, attachment | Règles métier, droits, transactions et appels aux repositories |
| repository | Interfaces Spring Data JPA ; recherches, ordre des listes, contraintes et verrous |
| model et enums | Entités, relations, visibilité, rôles et statuts |
| config/security | Chaîne de filtres, session, CSRF et BCrypt |
| config/seed | Administrateur et exemples facultatifs |
| exception | Traduction des erreurs métier/validation en réponses JSON |

### Configuration

[application.properties](../backend/src/main/resources/application.properties) définit MySQL, Flyway, SMTP, multipart et session. [application-dev.properties](../backend/src/main/resources/application-dev.properties) configure Mailpit et les seeders locaux. [application-test.properties](../backend/src/test/resources/application-test.properties) utilise H2, create-drop et désactive Flyway.

| Contexte | Comportement |
| --- | --- |
| Sans profil dev | MySQL ; SMTP du fournisseur via SMTP_HOST/PORT/USERNAME/PASSWORD/AUTH/STARTTLS ; aucun seeder dev |
| dev | Même MySQL, administrateur initial ; Mailpit via DEV_SMTP_HOST=localhost et DEV_SMTP_PORT=1025, sans authentification ni STARTTLS |
| dev,showcase | Ajoute les exemples thématiques persistants si absents ; ne réinitialise pas les comptes existants |
| dev,test | H2 pour les tests Java, fixtures historiques activées ; transport mail simulé dans les tests qui inscrivent |

DB_URL, DB_USERNAME et DB_PASSWORD configurent la connexion. Le défaut vise MySQL Laragon sur localhost:3306. FRONTEND_URL détermine l’origine du lien de confirmation, MAIL_FROM son expéditeur. PDF_MAX_BYTES vaut 5242880 par défaut. SESSION_COOKIE_SECURE peut être activé derrière HTTPS. DEV_SEED_PASSWORD choisit le mot de passe initial avant la première création des comptes dev.

[backend/.env.example](../backend/.env.example) documente les variables. Spring Boot ne charge pas automatiquement un fichier .env : définir les variables dans PowerShell ou l’IDE, puis démarrer le processus depuis ce terminal. Les réglages DEV_SMTP_* sont distincts des réglages SMTP_* de production.

[compose.yaml](../compose.yaml) lance Mailpit avec un volume local. Les ports SMTP 1025 et HTTP 8025 sont publiés exclusivement sur 127.0.0.1. Mailpit reçoit les adresses fictives sans expédier les messages à leurs destinataires réels. [Documentation officielle Docker Mailpit](https://mailpit.axllent.org/docs/install/docker/).

### MySQL et migrations

Flyway exécute les migrations avant la validation Hibernate : ddl-auto=validate, open-in-view=false, baseline-on-migrate=true et baseline-version=0. Une base historique non vide peut être adoptée sans supprimer ses comptes. Ne pas modifier une migration déjà appliquée ; ajouter une nouvelle version. Les tests H2 ne remplacent pas cette validation MySQL.

| Migration dans src/main/resources/db/migration | Effet |
| --- | --- |
| V1__user_roles.sql | Crée/adopte user et conserve la valeur historique USER dans l’ENUM |
| V2__communities_and_memberships.sql | Communautés, adhésions uniques et index de statut |
| V3__publications_and_comments.sql | Publications, commentaires, auteurs et index chronologiques |
| V4__registration_authorizations.sql | confirmed=true pour les anciens comptes ; adresses autorisées et jetons de confirmation |
| V5__pdf_attachments.sql | PDF en LONGBLOB, parent exclusif, unicité et cascades SQL |

Les fichiers sont consultables dans le [répertoire des migrations](../backend/src/main/resources/db/migration). flyway_schema_history conserve versions et checksums. Les migrations n’effacent pas les données métier.

DevelopmentDataSeeder crée l’administrateur dev absent et le marque confirmé. InterfaceExampleSeeder est réservé à dev ET showcase ; il ajoute des comptes fictifs, communautés, adhésions, publications, commentaires et PDF réels. CommunityDataSeeder et les anciennes fixtures restent disponibles aux tests via app.dev.demo-data ; elles sont désactivées avec dev seul.

## Modèle de données

Les classes se trouvent sous model/user, model/community, model/publication, model/registration et model/attachment.

| Entité / table | Données et relations importantes |
| --- | --- |
| User / user | id, name, email unique, password BCrypt, role, confirmed ; compte unique pour étudiant, professeur et administrateur |
| Community / community | name ≤100, description ≤1000, visibility PUBLIC/PRIVATE, creator obligatoire, createdAt |
| CommunityMembership / community_membership | user et community obligatoires, requestedAt, status PENDING/ACTIVE ; UNIQUE(user_id, community_id) |
| Publication / publication | community et author obligatoires, title ≤160, content ≤10000, createdAt/updatedAt |
| Comment / publication_comment | publication et author obligatoires, content ≤2000, dates |
| RegistrationAuthorization / registration_authorization | email normalisé unique ≤254, role STUDENT/PROFESSOR, updatedAt ; aucune relation nécessaire avec un compte |
| EmailVerificationToken / email_verification_token | un user unique, tokenHash unique de 64 caractères, expiresAt, sentAt |
| PdfAttachment / pdf_attachment | filename ≤180, size, updatedAt, content LONGBLOB ; community OU publication, un seul fichier par parent |

Les clés étrangères protègent les relations. Le CHECK de V5 impose exactement un parent au PDF. Les deux colonnes parent possèdent chacune une contrainte UNIQUE ; la suppression du parent supprime son PDF par ON DELETE CASCADE, également déclaré dans le modèle Hibernate.

RegistrationAuthorization n’est pas une autre entité utilisateur : elle autorise une future inscription. Retirer une adresse de cette liste ne supprime ni ne désactive un compte existant. L’ancien rôle USER est traité comme STUDENT par Role.effective(). Les nouveaux comptes inscrits reçoivent uniquement STUDENT ou PROFESSOR ; ADMIN n’est jamais attribué depuis Excel ou une requête d’inscription.

Il n’existe pas de module autonome StudyResource, ni de likes, favoris, notifications, signalements ou réponses imbriquées. Les ressources actuellement persistées sont les pièces jointes PDF.

## Parcours d’une requête

Exemple : POST /api/communities/12/publications.

1. SecurityConfig valide le CSRF, restaure la session et exige une authentification.
2. PublicationController reçoit PublicationRequest avec @Valid et Authentication. L’auteur vient de Authentication.getName(), jamais d’un authorId fourni par le client.
3. Bean Validation vérifie titre/contenu après suppression des espaces extérieurs dans les setters.
4. PublicationService ouvre une transaction, charge la communauté et appelle CommunityAccessService.requireMember : l’adhésion doit être ACTIVE.
5. PublicationRepository enregistre l’entité JPA avec son auteur et ses dates. MySQL contrôle les clés étrangères.
6. Le service construit PublicationResponse dans la transaction ; le contrôleur retourne 201 JSON. La transaction est validée avant la fin du traitement HTTP. Une exception entraîne le rollback.
7. ApiExceptionHandler transforme les erreurs attendues en ApiError ; les refus du filtre de sécurité sont rendus directement par SecurityConfig.

Les lectures sont marquées readOnly lorsqu’approprié. Les DTO évitent l’exposition des mots de passe, hashes de jetons et octets de PDF dans les listes. Le téléchargement binaire utilise une route séparée.

## Authentification et autorisations

### Excel et inscription

[RegistrationAuthorizationService.java](../backend/src/main/java/com/example/demo/service/registration/RegistrationAuthorizationService.java) exige ADMIN, lit la première feuille d’un .xlsx de 2 Mio maximum et au plus 5000 lignes de données. L’en-tête doit contenir email et role. Les formules sont refusées ; les lignes vides sont ignorées. Les adresses sont trim/lowercase et validées ; les rôles sont STUDENT ou PROFESSOR. Le premier doublon valide est conservé. Le bilan détaille imported, updated, duplicates et invalidRows avec les numéros de ligne.

L’import ajoute ou actualise les autorisations présentes. Les adresses absentes du classeur et les rôles des comptes existants ne changent pas. L’accès est contrôlé par /api/admin/** et par requireAdmin dans le service.

[UserService.java](../backend/src/main/java/com/example/demo/service/user/UserService.java) refuse les doublons avec 409 et les adresses non autorisées avec 403. Le DTO impose nom non vide ≤100, e-mail valide ≤254 et mot de passe de 8 à 72 caractères. Le service contrôle aussi la limite BCrypt de 72 octets UTF-8. Il enregistre un compte non confirmé avec le rôle de l’autorisation, hash BCrypt, puis demande l’envoi du mail dans la même transaction.

### Confirmation et renvoi

[EmailVerificationService.java](../backend/src/main/java/com/example/demo/service/registration/EmailVerificationService.java) génère 32 octets SecureRandom et encode le jeton en Base64 URL. Seul son SHA-256 est stocké. L’expiration est de 24 heures ; un jeton par compte est autorisé. Le repository utilise un verrou pessimiste à la lecture par userId ou tokenHash pour sérialiser les opérations concurrentes sur les lignes existantes.

[ConfirmationMailService.java](../backend/src/main/java/com/example/demo/service/registration/ConfirmationMailService.java) prépare un SimpleMailMessage et appelle directement JavaMailSender. En dev, ce même flux SMTP aboutit à Mailpit. Le lien n’est ni journalisé ni écrit dans une outbox fichier. Une MailException devient une réponse 503 en français.

La confirmation marque le compte confirmé et supprime le jeton. Un lien expiré, réutilisé ou remplacé retourne 400. Le renvoi retourne un message générique pour les comptes inconnus ou déjà confirmés ; pour un compte non confirmé, il exige une minute depuis sentAt (sinon 429), remplace le jeton et expédie le mail. Si l’envoi échoue, la transaction annule le remplacement : l’ancien lien reste valable. Si le premier envoi échoue, le compte et son jeton sont annulés, ce qui permet de réessayer l’inscription sans conflit.

Le SMTP et MySQL ne participent pas à une transaction distribuée : un e-mail livré juste avant un échec de commit pourrait contenir un lien inutilisable. Le renvoi permet de récupérer ce cas. Il n’existe ni file d’envoi ni traitement asynchrone.

### Session et CSRF

[SecurityConfig.java](../backend/src/main/java/com/example/demo/config/security/SecurityConfig.java) configure une authentification par session, sans JWT, HTTP Basic ni formulaire Spring par défaut. UserService charge UserDetails et désactive le compte tant que confirmed=false. Un compte non confirmé retourne 403 ; des identifiants incorrects retournent 401.

AuthenticationController utilise AuthenticationManager, change l’identifiant de session à la connexion, renouvelle le CSRF et sauvegarde le SecurityContext en session. JSESSIONID est HttpOnly, SameSite=Lax ; la session expire après 30 minutes d’inactivité. Le cookie XSRF-TOKEN est lisible pour permettre au client de renvoyer X-XSRF-TOKEN. GET /api/auth/csrf initialise/retourne le jeton.

Tous les POST, PUT et DELETE exigent le CSRF, même inscription, connexion et confirmation. Une route permitAll dispense de connexion, pas de CSRF ni des permissions métier. POST /api/auth/logout invalide la session, efface le cookie et retourne 204. L’administrateur reçoit les autorités ADMIN, PROFESSOR et STUDENT, sans contourner l’obligation d’être membre pour écrire.

## Fonctionnalités métier

### Communautés et adhésions

CommunityController délègue à CommunityService. Tout visiteur peut consulter les noms et descriptions, y compris privés. Tout compte connecté peut créer une communauté : son identité vient de la session et une adhésion ACTIVE lui est immédiatement créée. Nom, description et visibilité sont validés par CommunityRequest.

Le créateur ou ADMIN peut modifier une communauté. Le passage en PUBLIC active les demandes PENDING ; le passage en PRIVATE conserve les membres actifs. Seul ADMIN peut supprimer. Dans une transaction, CommunityService supprime commentaires, publications, adhésions puis communauté ; les PDF disparaissent avec leurs parents. Les comptes et autorisations d’inscription sont conservés. Une erreur annule l’ensemble.

CommunityMembershipService crée une adhésion ACTIVE pour une communauté publique ou PENDING pour une privée. Une seconde demande/adhésion retourne 409 ; la contrainte SQL protège aussi les courses concurrentes. Quitter supprime l’adhésion ; la même route annule une demande. Le créateur ne peut pas quitter sa propre communauté (409). Les listes privées de membres exigent ACTIVE ou ADMIN.

AdminMembershipController expose les demandes privées à ADMIN uniquement. Approuver transforme PENDING en ACTIVE ; refuser supprime la demande. Une demande inexistante retourne 404, déjà active 409. Une demande PENDING ne donne jamais accès au contenu privé.

### Publications et commentaires

PublicationService filtre le fil selon CommunityAccessService.canRead. Les listes sont triées par création décroissante puis id ; les commentaires par création croissante puis id. Il n’existe pas encore de pagination.

| Action | Règle serveur |
| --- | --- |
| Lire contenu/PDF public | Visiteur autorisé |
| Lire contenu/PDF privé | Membre ACTIVE ou ADMIN ; visiteur 401, extérieur/PENDING 403 |
| Publier ou commenter | Compte connecté et membre ACTIVE, y compris ADMIN |
| Modifier texte d’une publication/commentaire | Auteur et membre ACTIVE |
| Supprimer publication/commentaire | Auteur membre ACTIVE ou ADMIN |
| Modifier/supprimer communauté | Créateur ou ADMIN pour modifier ; ADMIN seul pour supprimer |
| Gérer PDF de communauté | ADMIN |
| Gérer PDF de publication | Auteur membre ACTIVE ; ADMIN ne remplace pas le fichier d’autrui |

PublicationRequest limite le titre à 160 et le contenu à 10000 caractères ; CommentRequest limite le commentaire à 2000. Les champs sont obligatoires et trimés. Modifier met à jour updatedAt. Supprimer une publication supprime d’abord ses commentaires et laisse MySQL cascader son PDF, dans une transaction.

CommentService charge la publication par readable avant création/lecture. Les droits de modification/suppression sont réévalués depuis le parent et l’auteur persistés ; changer un id dans une URL ne permet pas d’écrire au nom d’autrui.

### Pièces jointes

[PdfService.java](../backend/src/main/java/com/example/demo/service/attachment/PdfService.java) vérifie les droits avant de lire ou d’écrire le fichier. Il impose un fichier non vide, taille ≤ PDF_MAX_BYTES, extension .pdf, préfixe %PDF-, parse PDFBox réussi, au moins une page et absence de chiffrement. Le nom est nettoyé de ses chemins et caractères de contrôle, puis limité à 180 caractères.

Les octets et métadonnées sont stockés ensemble dans MySQL. Remplacer réutilise la ligne existante ; un document invalide conserve l’ancien PDF. DELETE supprime uniquement le fichier. Un seul PDF est autorisé par contenu.

PdfController ne reconnaît que kind=communities ou publications. Le téléchargement retourne application/pdf, Content-Disposition: attachment avec nom UTF-8, Cache-Control: no-store et X-Content-Type-Options: nosniff. Les métadonnées retournent null/corps vide si aucun fichier, après vérification de l’accès ; télécharger un fichier absent retourne 404.

La limite métier est de 5 Mio par défaut. Spring multipart accepte 6 MB par fichier et 7 MB par requête : un dépassement métier retourne 400, un dépassement de la limite multipart 413. Si PDF_MAX_BYTES est augmenté, ajuster aussi ces plafonds.

## Référence API

Préfixe commun : /api. Toutes les écritures exigent CSRF. « Lecture » signifie public sans connexion, privé ACTIVE ou ADMIN. Les créations prennent des DTO JSON sauf import et upload multipart avec un champ file. Les identifiants sont numériques.

### Authentification

| Méthode et route | Permission / entrée | Succès et refus principaux |
| --- | --- | --- |
| GET /auth/csrf | Visiteur | 200 {token} |
| POST /auth/register | Visiteur ; name,email,password | 201 UserResponse ; 400 validation,403 adresse,409 doublon,503 SMTP |
| POST /auth/login | Visiteur ; email,password | 200 UserResponse + session ; 401 identifiants,403 non confirmé |
| GET /auth/me | Connecté | 200 UserResponse ; 401 |
| POST /auth/logout | Connecté/CSRF | 204 |
| POST /auth/confirm | Visiteur ; token | 200 {message} ; 400 lien |
| POST /auth/resend-confirmation | Visiteur ; email | 200 {message} ; 429 délai,503 SMTP |

### Communautés et adhésions

| Méthode et route | Permission | Succès |
| --- | --- | --- |
| GET /communities | Visiteur | 200 CommunityResponse[] |
| GET /communities/{id} | Visiteur | 200 CommunityResponse |
| POST /communities | Connecté | 201 CommunityResponse |
| PUT /communities/{id} | Créateur ou ADMIN | 200 CommunityResponse |
| GET /communities/{id}/members | Lecture | 200 MembershipResponse[] actifs |
| GET /communities/{id}/membership | Connecté, son adhésion | 200 MembershipResponse ; 404 si absente |
| POST /communities/{id}/membership | Connecté | 201 MembershipResponse ; 409 doublon |
| DELETE /communities/{id}/membership | Connecté, son adhésion, sauf créateur | 204 ; 409 créateur |
| GET /memberships/mine | Connecté | 200 MembershipResponse[] |

### Publications, commentaires et PDF

| Méthode et route | Permission | Succès |
| --- | --- | --- |
| GET /publications | Fil filtré selon la session ou visiteur | 200 PublicationResponse[] |
| GET /communities/{id}/publications | Lecture | 200 PublicationResponse[] |
| GET /publications/{id} | Lecture | 200 PublicationResponse |
| POST /communities/{id}/publications | ACTIVE | 201 PublicationResponse |
| PUT /publications/{id} | Auteur ACTIVE | 200 PublicationResponse |
| DELETE /publications/{id} | Auteur ACTIVE ou ADMIN | 204 |
| GET /publications/{id}/comments | Lecture | 200 CommentResponse[] |
| POST /publications/{id}/comments | ACTIVE | 201 CommentResponse |
| PUT /comments/{id} | Auteur ACTIVE | 200 CommentResponse |
| DELETE /comments/{id} | Auteur ACTIVE ou ADMIN | 204 |
| GET /{kind}/{id}/pdf/metadata | Lecture | 200 PdfResponse ou corps vide |
| GET /{kind}/{id}/pdf | Lecture | 200 binaire ; 404 absent |
| PUT /{kind}/{id}/pdf | ADMIN communauté, auteur ACTIVE publication | 200 PdfResponse |
| DELETE /{kind}/{id}/pdf | Même règle d’écriture | 204 ; 404 absent |

### Administration

Le filtre /api/admin/** exige ROLE_ADMIN ; les services contrôlent également l’acteur. Un visiteur reçoit 401, un autre rôle 403.

| Méthode et route | Action | Succès |
| --- | --- | --- |
| GET /admin/communities | Toutes les communautés | 200 CommunityResponse[] |
| GET /admin/communities/{id} | Détail | 200 CommunityResponse |
| POST /admin/communities | Créer, administrateur auteur | 201 CommunityResponse |
| PUT /admin/communities/{id} | Modifier | 200 CommunityResponse |
| DELETE /admin/communities/{id} | Supprimer toute la communauté | 204 |
| GET /admin/membership-requests | Demandes PENDING | 200 MembershipResponse[] |
| POST /admin/membership-requests/{id}/approve | Accepter | 200 MembershipResponse |
| POST /admin/membership-requests/{id}/reject | Refuser | 204 |
| GET /admin/registration-authorizations | Autorisations triées par email | 200 AuthorizationResponse[] |
| POST /admin/registration-authorizations/import | Import Excel multipart | 200 ImportReport |
| DELETE /admin/registration-authorizations/{id} | Retirer l’autorisation | 204 |

Les contrôleurs correspondants sont dans [controller](../backend/src/main/java/com/example/demo/controller). Les propriétés exactes des réponses sont dans [dto](../backend/src/main/java/com/example/demo/dto).

### Erreurs

ApiExceptionHandler renvoie ApiError {message,fields}. fields contient les erreurs de validation par champ. Les erreurs de filtre (401/403) utilisent le même format. Aucune réponse métier ne renvoie de stack trace.

| Statut | Exemple |
| --- | --- |
| 400 | DTO/JSON invalide, enum ou id mal formé, PDF/Excel illisible, lien expiré |
| 401 | Session absente, identifiants incorrects, visiteur sur contenu privé |
| 403 | Rôle insuffisant, PENDING, non-auteur, compte non confirmé |
| 404 | Entité, adhésion, demande ou PDF absent |
| 409 | E-mail/adhésion en doublon, créateur qui quitte, conflit SQL, demande déjà active |
| 413 | Limite multipart dépassée |
| 429 | Renvoi demandé avant une minute |
| 503 | Transport SMTP indisponible ; rollback de l’inscription ou du renvoi |

## Tests et vérifications

### Tests Java

```powershell
cd backend
.\mvnw.cmd test
```

53 tests dans src/test/java :

- auth/AuthenticationTest : inscription autorisée, BCrypt, normalisation, validation, session/rotation, connexion/déconnexion et CSRF.
- community/CommunityTest : création, visibilité, adhésions, approbation, droits et suppression.
- publication/PublicationTest : CRUD, session auteur, public/privé, droits de modification/suppression et cascades.
- sprint4/RegistrationAndPdfTest : Excel, attribution des rôles, confirmation, expiration/renvoi, PDF valides/invalides, limites et droits.
- registration/MailDeliveryTest : véritable ConfirmationMailService avec JavaMailSender simulé ; 503 et rollback si SMTP indisponible, réinscription possible, ancien lien préservé après renvoi échoué et usage unique.

Les tests H2 désactivent Flyway : ils contrôlent les règles Java et transactions, mais pas l’exécution des fichiers SQL MySQL. Les rapports sont dans backend/target/surefire-reports. Les tests n’ont pas besoin d’un fournisseur SMTP.

### Parcours MySQL, Mailpit et navigateur

Démarrer Mailpit, créer une base séparée et lancer le backend de validation depuis PowerShell à la racine :

```powershell
mysql -u root -e "CREATE DATABASE isetforum_validation CHARACTER SET utf8mb4;"
cd backend
$env:DB_URL='jdbc:mysql://localhost:3306/isetforum_validation'
$env:FRONTEND_URL='http://127.0.0.1:4300'
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev" "-Dspring-boot.run.arguments=--server.port=8082"
```

Si mysql n’est pas dans PATH, utiliser le terminal Laragon ou le chemin complet de mysql.exe. Dans un autre terminal :

```powershell
cd frontend
npm ci
npm test
npm run build
$env:ISETFORUM_API_URL='http://127.0.0.1:8082'
$env:ISETFORUM_MAILPIT_URL='http://127.0.0.1:8025'
npm run test:browser
```

Le script héberge le build Angular sur 127.0.0.1:4300 et utilise Microsoft Edge. Le backend doit générer les liens avec cette même origine. Pour changer le port, régler ISETFORUM_BROWSER_PORT et FRONTEND_URL ensemble.

Le scénario importe un classeur unique, refuse une adresse absente, inscrit les deux rôles et contrôle le refus avant confirmation. Il ouvre les e-mails dans Mailpit et clique leurs liens. Pour l’étudiant, il teste le délai 429, attend une minute, renvoie réellement un mail, vérifie l’invalidation du premier lien puis l’usage unique du nouveau. Il rejoue ensuite l’approbation privée, les publications/commentaires/PDF réels, les refus visiteur/extérieur, l’administration, les thèmes et la persistance après actualisation.

Redémarrer le même backend sans supprimer sa base, puis :

```powershell
npm run test:browser -- --read-only
```

Le mode lecture seule réutilise frontend/artifacts/sprint4-verification.json et vérifie les comptes confirmés, adhésions, commentaire et hash des deux PDF après redémarrage. Le rapport devient inutilisable si sa base est supprimée. Ne pas exécuter le scénario sur une base contenant des données utilisateur à préserver.

Pour vérifier une panne SMTP en MySQL sans arrêter la boîte existante, démarrer le backend de validation avec DEV_SMTP_PORT pointant vers un port local libre. Inscrire une nouvelle adresse autorisée : 503, absence du compte en base. Restaurer le bon port puis réessayer : inscription possible. Les mêmes garanties et le maintien de l’ancien lien lors d’un renvoi échoué sont automatisés dans MailDeliveryTest.

### Vérifications complémentaires et limites

Vérifier Flyway V1→V5 sur base vide, la validation du schéma existant et la conservation des comptes. Les contraintes d’unicité, clés étrangères et cascades PDF doivent être exercées sur MySQL, pas uniquement H2. Conserver les données de développement existantes ; les nettoyages éventuels ciblent exclusivement la base de validation nommée explicitement.

Dans Edge desktop, vérifier les boutons d’action à icônes, leurs titres et noms accessibles, le focus clavier, les thèmes clair/sombre et les SVG des communautés. Les composants respectent prefers-reduced-motion. Les visuels sont locaux et déterminés par le sujet, sans champ ou migration supplémentaire.

Les neuf tests Angular vérifient les services d’authentification et de données, notamment les erreurs et le refus de réinjecter une réponse obsolète après déconnexion. Un build de production reste nécessaire.

Le moteur Docker peut être arrêté alors qu’une instance Mailpit native fonctionne : docker compose config valide le fichier, mais ne prouve pas que le conteneur a démarré. Le bilan de livraison distingue ce contrôle du véritable parcours SMTP exécuté. Un fournisseur SMTP de production externe reste à vérifier avec ses identifiants réels.

## Simplifications ciblées

ConfirmationMailService utilise maintenant un unique JavaMailSender injecté. Le choix console/SMTP, le fournisseur optionnel, les écritures de fichier et la méthode intermédiaire de construction d’erreur ont été retirés. La seule erreur interceptée est MailException ; les erreurs de programmation ne sont plus masquées comme panne d’e-mail. Les tests MailDeliveryTest garantissent l’envoi construit, les statuts 503 et les rollbacks.

La normalisation des e-mails réutilise RegistrationAuthorizationService.normalize dans UserService, au lieu de dupliquer trim/lowercase. La recherche du jeton utilise une référence de méthode pour l’erreur invalide. Aucune validation métier, permission, transaction ou cascade nécessaire n’a été retirée.
