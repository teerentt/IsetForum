<div align="center">
  <img src="frontend/public/assets/logo-iset.png" alt="ISET Radès" width="76" />
  <h1>IsetForum</h1>
  <p><strong>Un campus. Mille idées. Une communauté.</strong></p>
  <p>Forum académique pour les étudiants et enseignants de l’ISET Radès.</p>
  <p>Java 17 · Spring Boot 3.5 · Angular 21 · MySQL 8</p>
</div>

## Version desktop — sprint 4

Le forum utilise les API Spring Boot et les données MySQL pour l’authentification, les communautés, les adhésions, les publications, les commentaires, les PDF et l’administration. Le nouveau design s’inspire du fil Reddit et de la référence Contra : navigation à gauche, publications au centre et communautés à découvrir à droite. Cartes arrondies, typographie lisible, identité bleu et blanc de l’ISET Radès et mode sombre. Toutes les actions utilisent les API réelles.

![Fil IsetForum en mode clair — capture 1920 × 1080](docs/images/forum-light.png)

Le sprint 4 est la livraison desktop finale de ce périmètre. Votes, favoris, notifications et commentaires imbriqués ne sont pas inclus. Sur écran étroit, le panneau droit disparaît et la navigation passe au-dessus du fil ; la refonte mobile complète reste hors périmètre.

<details>
<summary>Mode sombre, discussion, administration et connexion</summary>

![Fil en mode sombre](docs/images/forum-dark.png)
![Discussion et PDF en mode sombre](docs/images/sprint4-discussion-dark.png)
![Administration des inscriptions autorisées](docs/images/sprint4-admin-import.png)
![Connexion IsetForum](docs/images/login.png)

</details>

Les captures desktop montrent uniquement le viewport **1920 × 1080 (16:9)**, sans capture de la page entière. Elles présentent les exemples persistés dans MySQL avec le profil optionnel `dev,showcase`.

## Fonctionnalités

| Fonctionnalité | État |
| --- | --- |
| Autorisations d’inscription Excel : email + rôle | Import, liste et retrait réservés à ADMIN |
| Inscription étudiante et enseignante | Adresse autorisée et rôle attribué par le serveur |
| Confirmation e-mail | Lien unique valable 24 h ; renvoi après une minute |
| Authentification | BCrypt, session HttpOnly, CSRF, restauration après actualisation |
| Communautés | Création, consultation, adhésion publique ou demande privée |
| Administration des communautés | CRUD réel et décisions d’adhésion |
| Publications et commentaires | Création, lecture, modification et suppression selon les droits |
| Pièces jointes PDF | Ajout, remplacement, suppression et téléchargement protégés |
| Profil | Compte courant et publications de l’utilisateur |
| Recherche | Fil et communautés, sur les données serveur chargées |

Les présentations des communautés restent publiques. Le contenu d’une communauté publique est lisible sans connexion ; le contenu privé, PDF compris, est réservé aux membres actifs et aux administrateurs. Une demande PENDING ne donne aucun accès privé.

Écrire exige une adhésion ACTIVE, même pour un administrateur. L’auteur provient de la session ; il peut modifier son contenu tant qu’il est membre actif. L’auteur membre actif ou un administrateur peut supprimer une publication ou un commentaire. Un administrateur ne réécrit pas le texte d’un autre auteur. Les droits sont vérifiés côté serveur, y compris sur les liens directs de téléchargement.

## Structure

```text
IsetForum/
├── backend/
│   ├── src/main/java/com/example/demo/
│   │   ├── controller/   Routes auth, communautés, publications, PDF et administration
│   │   ├── dto/          Données reçues et réponses API
│   │   ├── service/      Règles métier et transactions
│   │   ├── repository/   Accès JPA aux données
│   │   ├── model/        Comptes, autorisations, jetons, communautés, contenus et PDF
│   │   ├── config/       Sécurité et administrateur initial de développement
│   │   └── exception/    Messages d’erreur communs
│   ├── src/main/resources/db/migration/   V1 à V5
│   ├── src/test/         Tests Java et fixtures
│   ├── .mvn/
│   ├── mvnw / mvnw.cmd
│   └── pom.xml
├── frontend/             Angular : core, layout, features et shared
├── docs/                 Documentation, exemples Excel/PDF et captures
└── scripts/              Outils de vérification et nettoyage explicite local
```

Le backend conserve ses couches simples : controller → service → repository → MySQL. User reste l’unique entité de compte. RegistrationAuthorization contient uniquement les adresses et rôles autorisés ; EmailVerificationToken conserve le hash du jeton et son expiration. Chaque composant Angular possède ses propres fichiers TypeScript, HTML et CSS.

## Démarrage local

Prérequis : JDK 17 ou supérieur, MySQL 8 lancé avec Laragon, Node 22.19 ou une version compatible Angular 21, npm. Les commandes ci-dessous partent de la racine du dépôt.

### Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Dans IntelliJ, importer `backend/pom.xml`, puis lancer `DemoApplication` avec l’argument `--spring.profiles.active=dev`. Dans VS Code, ouvrir la racine du dépôt et importer le projet Java Maven. Le backend écoute sur http://localhost:8080.

La configuration locale utilise la base `isetForum` (affichée `isetforum` par MySQL sous Windows), l’utilisateur root et un mot de passe vide. `DB_URL`, `DB_USERNAME` et `DB_PASSWORD` permettent de les adapter. Flyway applique les migrations ; Hibernate valide le schéma. Ne pas modifier V1 à V3 : V4 ajoute les inscriptions et la confirmation, V5 ajoute les PDF. La migration V4 conserve les comptes existants comme confirmés.

### Angular

Dans un autre terminal :

```powershell
cd frontend
npm ci
```

Installer Angular CLI si nécessaire avec `npm install -g @angular/cli@21`, puis :

```text
ng serve
```

Ouvrir http://localhost:4200. Le proxy Angular transmet `/api/**` à Spring Boot sur 8080. MySQL et Spring Boot se lancent séparément. Sur Windows, utiliser Command Prompt ou `ng.cmd serve` si PowerShell bloque les scripts.

### Administrateur initial et base propre

Après validation d’Excel, les données applicatives de la base principale ont été supprimées à la demande de l’utilisateur. La structure et flyway_schema_history sont conservées. À l’issue de ce nettoyage, seul l’administrateur initial confirmé était présent ; les exemples de la section suivante ont ensuite été ajoutés à la demande de l’utilisateur :

| E-mail | Mot de passe local initial |
| --- | --- |
| admin@isetforum.test | IsetForumDev!2026 |

Le profil dev crée cet administrateur s’il est absent et conserve son mot de passe s’il existe. `DEV_SEED_PASSWORD` permet de choisir le mot de passe avant sa première création. Aucun étudiant, enseignant, communauté ou contenu n’est ajouté au démarrage normal. Les anciennes fixtures sont activées uniquement dans les tests Java ; ne pas activer `app.dev.demo-data` sur la base de travail.

### Exemples pour explorer l’interface

Après le nettoyage initial, un jeu de données a été ajouté à la demande de l’utilisateur : **9 comptes, 6 communautés, 13 publications, 26 commentaires, 12 PDF et 3 demandes privées en attente**. Ces exemples sont de vraies données MySQL ; ils restent visibles avec un démarrage dev normal et après actualisation. La base n’est donc plus vide.

| Profil d’exemple | E-mail | Mot de passe local |
| --- | --- | --- |
| Administrateur | admin@isetforum.test | IsetForumDev!2026 |
| Étudiante : accès PFE actif, robotique en attente | etudiant@isetforum.test | IsetForumDev!2026 |
| Enseignant | professeur@isetforum.test | IsetForumDev!2026 |
| Enseignante | leila@isetforum.test | IsetForumDev!2026 |

Les autres étudiants sont youssef, ines, malek, nour et aziz, avec le domaine @isetforum.test et le même mot de passe de démonstration. Ces comptes fictifs sont préconfirmés pour explorer les écrans ; l’inscription réelle reste soumise à Excel et à la confirmation e-mail.

Le profil opt-in showcase permet de réinsérer les exemples sur une base qui n’en contient pas encore :

```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev,showcase"
```

InterfaceExampleSeeder n’est pas exécuté avec dev seul. Il conserve les comptes et communautés existants et ne duplique pas les discussions au redémarrage. Il ne remet pas à zéro les mots de passe des comptes existants. Les panneaux latéraux occupent désormais les bords gauche et droit, avec un contenu central symétrique ; la disposition a été vérifiée à 1366 et 1920 pixels de largeur.

L’administrateur importe ensuite la liste Excel. Les étudiants et enseignants s’inscrivent et confirment eux-mêmes leur adresse. Exemple fourni : [inscriptions-autorisees.xlsx](docs/examples/inscriptions-autorisees.xlsx). Ses adresses sont fictives et utilisables avec la confirmation locale.

Le script `scripts/reset-local-data.sql` documente le nettoyage demandé. Il efface définitivement les données de développement : ne pas l’exécuter pour un démarrage ordinaire.

## Import Excel et confirmation

L’onglet **Inscriptions autorisées** de `/forum/administration` accepte un fichier .xlsx de 2 Mo maximum, première feuille, colonnes email et role sur la première ligne, au maximum 5 000 lignes de données. Les rôles permis sont STUDENT et PROFESSOR ; ADMIN est refusé. Les adresses sont nettoyées et mises en minuscules à l’import et à l’inscription.

Le bilan distingue les ajouts, les mises à jour, les doublons dans le fichier et les lignes invalides avec leur numéro. Le premier doublon valide est retenu. Les entrées absentes d’un nouvel import sont conservées. Modifier ou retirer une autorisation ne modifie ni ne désactive les comptes déjà créés.

En profil dev, la confirmation est affichée dans les logs Spring Boot et dans `backend/target/dev-confirmations.log`. Ouvrir le lien `/confirmation?token=...` avec Angular démarré. Le jeton est aléatoire, stocké uniquement sous forme de hash dans MySQL, expire après 24 heures et ne fonctionne qu’une fois. Un renvoi invalide le précédent lien. La connexion est bloquée avant confirmation.

### Envoi réel des e-mails

Configurer dans l’environnement du processus Spring Boot :

| Variable | Utilité |
| --- | --- |
| MAIL_MODE | smtp pour un envoi réel ; console en développement uniquement |
| SMTP_HOST / SMTP_PORT | Serveur SMTP et port, 587 par défaut |
| SMTP_USERNAME / SMTP_PASSWORD | Identifiants du serveur SMTP |
| SMTP_AUTH | Authentification SMTP, true par défaut |
| SMTP_STARTTLS | STARTTLS, true par défaut |
| MAIL_FROM | Expéditeur autorisé par le fournisseur |
| FRONTEND_URL | URL publique Angular utilisée dans le lien, sans slash final |

Le fichier [backend/.env.example](backend/.env.example) sert de modèle. Spring Boot ne charge pas automatiquement ce fichier : renseigner les variables dans l’IDE ou le terminal. Le mode console est limité aux profils dev/test ; les liens ne sont pas exposés par une API publique. L’envoi vers un fournisseur SMTP réel n’a pas été vérifié pendant cette livraison.

## PDF persistants

Un administrateur gère un PDF par communauté depuis son détail ; un auteur membre actif gère un PDF par publication depuis le formulaire ou la discussion. Le serveur vérifie l’extension, la signature et l’ouverture réelle du PDF avec PDFBox. Les fichiers vides, illisibles, chiffrés ou de plus de 5 Mio par défaut sont refusés.

Les octets sont stockés dans MySQL, dans `pdf_attachment` (LONGBLOB), avec le nom, la taille et la date. Aucun dossier de fichiers persistant n’est nécessaire. Sauvegarder MySQL sauvegarde donc les PDF. Le remplacement met à jour le même enregistrement ; les suppressions des contenus suppriment leurs pièces jointes par clés étrangères en cascade. Les téléchargements vérifient les droits et sont servis en pièce jointe, sans cache.

`PDF_MAX_BYTES` règle la limite serveur, 5242880 par défaut ; les limites multipart sont configurées dans application.properties (6 Mo par fichier et 7 Mo par requête). L’interface et le scénario livré utilisent la limite standard de 5 Mio. [Document PDF fictif](docs/examples/document.pdf).

## API principales

| Domaine | Routes |
| --- | --- |
| Authentification | `/api/auth/register`, `/login`, `/me`, `/logout`, `/csrf` sous `/api/auth` |
| Confirmation | `/api/auth/confirm`, `/api/auth/resend-confirmation` |
| Autorisations | `/api/admin/registration-authorizations`, `/import`, `/{id}` |
| Communautés | `/api/communities`, `/{id}`, `/{id}/membership`, `/{id}/members` |
| Fil et publications | `/api/publications`, `/api/communities/{id}/publications`, `/api/publications/{id}` |
| Commentaires | `/api/publications/{id}/comments`, `/api/comments/{id}` |
| PDF | `/api/communities/{id}/pdf`, `/api/publications/{id}/pdf`, et leur sous-route `/metadata` |
| Administration | `/api/admin/communities`, `/api/admin/membership-requests` |

Les écritures nécessitent le jeton CSRF. Les imports et envois PDF sont multipart, champ file. Les autres corps sont JSON. Les erreurs utilisent `{ message, fields }` en français. Voir [sprint 4](docs/sprint-4.md) pour les opérations détaillées et le scénario de démonstration.

## Vérification

Depuis backend :

```powershell
.\mvnw.cmd test
```

Depuis frontend :

```text
npm test
npm run build
```

Résultats de cette livraison : 51 tests Java, 9 tests Angular et compilation de production réussis. Les tests H2 ne valident pas Flyway ; les migrations ont aussi été exécutées sur MySQL dédié et sur la base principale avant nettoyage. Les 11 anciens comptes sont restés confirmés après migration, avant leur suppression explicitement demandée.

Pour les tests navigateur desktop, démarrer un backend dev sur une **base dédiée**, puis depuis frontend dans PowerShell :

```powershell
$env:ISETFORUM_API_URL='http://127.0.0.1:8081'
npm run test:browser
# Redémarrer le même backend avec la même base, puis :
npm run test:browser -- --read-only
```

Le test utilise Microsoft Edge et PowerShell pour préparer un Excel unique. Il crée de vrais comptes et contenus, lit les liens de confirmation dans l’outbox locale et conserve ses identifiants dans frontend/artifacts/sprint4-verification.json. Configurer `ISETFORUM_DEV_OUTBOX` si le fichier diffère de backend/target/sprint4-test-confirmations.log. Captures et rapports restent ignorés par Git. Le scénario complet, les refus d’accès et la persistance des octets PDF après redémarrage ont été vérifiés. Le mode `--clean-check` vérifie une base ne contenant que l’administrateur, sans créer de données métier.

Les scripts des sprints précédents restent des références historiques et nécessitent leurs anciennes fixtures ; ils ne constituent plus la procédure de vérification de la livraison courante.

Les bases dédiées utilisées pendant la livraison sont supprimées après validation ; la base principale conserve les exemples demandés pour explorer l’interface. Pour rejouer les tests, créer une base dédiée et lancer le scénario complet avant le mode `--read-only`.

## Documentation

- [Sprint 4 : règles, scénario et bilan](docs/sprint-4.md)
- [Architecture](docs/architecture.md)
- [Frontend Angular](frontend/README.md)
- [Contribuer](CONTRIBUTING.md)
- Historique : [sprint 2](docs/sprint-2.md), [sprint 3](docs/sprint-3.md)

Le logo ISET est fourni par le projet. La référence Contra/Mobbin transmise sert d’inspiration visuelle ; les captures montrent les comptes fictifs et les données MySQL du profil de présentation.

Pour régénérer ces images : démarrer le backend avec les exemples `dev,showcase`, puis exécuter `npm run build` et `npm run screenshots` depuis `frontend`. Microsoft Edge doit être installé. Le script ne crée ni ne modifie de contenu métier. Il utilise l’administrateur local ; les variables `ISETFORUM_API_URL`, `ISETFORUM_CAPTURE_EMAIL` et `ISETFORUM_CAPTURE_PASSWORD` permettent de changer le serveur ou le compte.
