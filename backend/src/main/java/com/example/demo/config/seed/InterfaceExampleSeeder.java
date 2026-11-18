package com.example.demo.config.seed;

import com.example.demo.dto.community.CommunityRequest;
import com.example.demo.enums.*;
import com.example.demo.model.community.Community;
import com.example.demo.model.publication.*;
import com.example.demo.model.registration.RegistrationAuthorization;
import com.example.demo.model.attachment.PdfAttachment;
import com.example.demo.model.user.User;
import com.example.demo.repository.community.CommunityRepository;
import com.example.demo.repository.community.CommunityMembershipRepository;
import com.example.demo.repository.publication.*;
import com.example.demo.repository.registration.RegistrationAuthorizationRepository;
import com.example.demo.repository.attachment.PdfAttachmentRepository;
import com.example.demo.repository.user.UserRepository;
import com.example.demo.service.community.*;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;

/** Explicit local examples, never enabled by a normal dev startup. */
@Component @Profile("dev & showcase") @Order(3) @RequiredArgsConstructor
public class InterfaceExampleSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final CommunityRepository communities;
    private final CommunityMembershipRepository membershipRepository;
    private final PublicationRepository publications;
    private final CommentRepository comments;
    private final PdfAttachmentRepository attachments;
    private final RegistrationAuthorizationRepository authorizations;
    private final CommunityService communityService;
    private final CommunityMembershipService memberships;
    private final PasswordEncoder encoder;
    private final Environment configuration;
    private int hours;
    private static final String ADMIN = "admin@isetforum.test";

    @Override @Transactional
    public void run(String... args) throws Exception {
        hours = 1;
        User lina = account("Lina Ben Ali", "etudiant@isetforum.test", Role.STUDENT);
        User youssef = account("Youssef Trabelsi", "youssef@isetforum.test", Role.STUDENT);
        User ines = account("Ines Ayari", "ines@isetforum.test", Role.STUDENT);
        User malek = account("Malek Gharbi", "malek@isetforum.test", Role.STUDENT);
        User nour = account("Nour Ben Salem", "nour@isetforum.test", Role.STUDENT);
        User aziz = account("Aziz Hammami", "aziz@isetforum.test", Role.STUDENT);
        User sami = account("Pr. Sami Mansour", "professeur@isetforum.test", Role.PROFESSOR);
        User leila = account("Pr. Leila Haddad", "leila@isetforum.test", Role.PROFESSOR);
        authorize("nouvel.etudiant@isetforum.test", Role.STUDENT);
        authorize("nouvel.enseignant@isetforum.test", Role.PROFESSOR);

        group("Informatique & développement", "Java, Spring Boot, Angular et SQL : posez vos questions et partagez vos projets.",
                CommunityVisibility.PUBLIC, sami, List.of(sami,lina,youssef,ines), new String[][]{
                {"Bien démarrer une API REST avec Spring Boot", "Pour le prochain TP, nous construirons une API de bibliothèque.\n\nCommencez par le modèle et le repository, puis ajoutez le service et le controller. Le PDF joint présente les étapes. Quelle partie souhaitez-vous revoir ensemble ?"},
                {"Angular : où placer la logique de chargement des données ?", "Je travaille sur un composant qui affiche les communautés.\n\nEst-ce que vous séparez loading et error dans le composant ou dans un service partagé ? J’aimerais garder un code simple et facile à relire."},
                {"Un petit projet à construire ensemble ce week-end ?", "Je cherche deux ou trois personnes pour développer un planificateur de révisions.\n\nLes débutants sont les bienvenus : l’objectif est d’apprendre en faisant. Dites-moi si vous préférez travailler sur le frontend ou le backend."},
                {"Ma fiche de révision SQL : JOIN, GROUP BY et HAVING", "J’ai préparé une fiche avec des exemples sur les étudiants, les cours et les inscriptions.\n\nWHERE filtre les lignes avant le regroupement ; HAVING filtre les groupes. Partagez vos exercices dans les commentaires."}});
        group("Mathématiques & révisions", "Des exercices, des explications et des groupes de révision pour progresser ensemble.",
                CommunityVisibility.PUBLIC, leila, List.of(leila,lina,ines), new String[][]{
                {"Révisions : matrices et systèmes linéaires", "La séance de jeudi sera consacrée aux systèmes linéaires.\n\nPréparez les exercices du document joint et indiquez votre méthode, même si le calcul n’aboutit pas. Nous chercherons ensemble où se situe le blocage."},
                {"Groupe de révision samedi à la bibliothèque", "Qui est disponible samedi à 10 h pour travailler les probabilités ?\n\nOn pourrait commencer par les variables aléatoires, puis comparer nos corrections. Tous les niveaux sont les bienvenus."}});
        Community pfe = group("Projets de fin d’études", "Espace privé de suivi des PFE : sujets, livrables et retours des encadrants.",
                CommunityVisibility.PRIVATE, sami, List.of(sami,lina,malek), new String[][]{
                {"PFE : préparer la première réunion avec son encadrant", "Préparez une présentation du problème, les utilisateurs visés, trois fonctionnalités prioritaires et un planning provisoire.\n\nLe document joint vous servira de trame. Chaque équipe peut publier son avancement ici."},
                {"Notre première version du cahier des charges est prête", "Nous travaillons sur une plateforme de réservation de salles.\n\nL’analyse des besoins est terminée. La prochaine étape sera le modèle de données et la définition des règles de validation des réservations."}});
        if (pfe != null) enroll(pfe,aziz,false);
        group("Vie du campus", "Informations utiles, événements étudiants et bons conseils du quotidien à l’ISET Radès.",
                CommunityVisibility.PUBLIC, leila, List.of(nour,youssef,leila), new String[][]{
                {"Bienvenue ! Présentez-vous en quelques lignes", "Dites-nous votre département, un sujet que vous aimez et ce que vous aimeriez apprendre cette année.\n\nJe suis Nour, passionnée de design d’interface, et j’aimerais mieux comprendre le développement frontend."},
                {"Atelier de préparation aux entretiens de stage", "Un échange autour du CV, de la présentation d’un projet et des questions techniques fréquentes.\n\nApportez une réalisation dont vous êtes fier. La date sera choisie avec les participants dans cette discussion."}});
        group("Anglais & communication", "Pratiquez l’anglais et préparez vos présentations et entretiens professionnels.",
                CommunityVisibility.PUBLIC, leila, List.of(leila,malek), new String[][]{
                {"Présenter son projet en anglais en deux minutes", "Un pitch simple suit quatre étapes : le problème, la solution, une démonstration et la prochaine amélioration.\n\nÉcrivez votre première phrase en commentaire ; nous pourrons la retravailler ensemble."}});
        Community robotics = group("Club robotique", "Espace privé du club : prototypes, matériel et préparation des ateliers.",
                CommunityVisibility.PRIVATE, sami, List.of(aziz,sami), new String[][]{
                {"Robot suiveur de ligne : les premiers essais", "Le montage fonctionne sur une piste simple. Il faut encore ajuster la position des capteurs et la vitesse dans les virages.\n\nQui souhaite participer à la prochaine séance de tests ?"},
                {"Organisation du matériel pour les prochains ateliers", "Avant chaque atelier, vérifiez les batteries, les capteurs et les câbles.\n\nSignalez dans cette discussion les éléments manquants et les pièces à remplacer."}});
        if (robotics != null) { enroll(robotics,lina,false); enroll(robotics,nour,false); }
    }

    private User account(String name, String email, Role role) {
        authorize(email,role);
        return users.findByEmailIgnoreCase(email).orElseGet(() -> users.save(
                User.builder().name(name).email(email).role(role).confirmed(true)
                        .password(encoder.encode(configuration.getProperty("app.dev.seed-password"))).build()));
    }
    private void authorize(String email, Role role) {
        if (authorizations.findByEmail(email).isPresent()) return;
        var value = new RegistrationAuthorization(); value.setEmail(email); value.setRole(role);
        value.setUpdatedAt(LocalDateTime.now()); authorizations.save(value);
    }
    private Community group(String name, String description, CommunityVisibility visibility, User creator,
                            List<User> participants, String[][] content) throws Exception {
        // Never overwrite an existing community or duplicate its discussions.
        if (communities.existsByName(name)) return null;
        long id = communityService.create(new CommunityRequest(name,description,visibility),creator.getEmail()).id();
        Community community = communities.findById(id).orElseThrow();
        for (User user : participants) enroll(community,user,true);
        enroll(community,users.findByEmailIgnoreCase(ADMIN).orElseThrow(),true);
        for (int index=0; index<content.length; index++) {
            User author = participants.get(index % participants.size());
            var post = new Publication(); post.setCommunity(community); post.setAuthor(author);
            post.setTitle(content[index][0]); post.setContent(content[index][1]);
            post.setCreatedAt(LocalDateTime.now().minusHours(hours++)); post.setUpdatedAt(post.getCreatedAt());
            publications.save(post);
            for (int reply=0; reply<2; reply++) {
                User respondent = participants.get((index+reply+1) % participants.size());
                var comment = new Comment(); comment.setPublication(post); comment.setAuthor(respondent);
                comment.setContent(reply == 0 ? "Merci pour ce partage ! Je vais préparer un exemple pour notre prochaine séance."
                        : "Bonne idée. Nous pourrons comparer nos solutions ici et compléter les notes ensemble.");
                comment.setCreatedAt(post.getCreatedAt().plusMinutes(15+reply*20)); comment.setUpdatedAt(comment.getCreatedAt());
                comments.save(comment);
            }
            if (index == 0) attach(community,post,"notes-"+id+".pdf");
        }
        attach(community,null,"guide-"+id+".pdf");
        return community;
    }
    private void enroll(Community community, User user, boolean active) {
        if (membershipRepository.findByCommunityIdAndUserId(community.getId(),user.getId()).isPresent()) return;
        var membership = memberships.join(community.getId(),user.getEmail());
        if (active && membership.status() == MembershipStatus.PENDING) memberships.approve(membership.id(),ADMIN);
    }
    private void attach(Community community, Publication post, String filename) throws Exception {
        byte[] bytes;
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            var page = new PDPage(); document.addPage(page);
            try (var stream = new PDPageContentStream(document,page)) {
                stream.beginText(); stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD),20);
                stream.newLineAtOffset(56,760); stream.showText("IsetForum - Guide de travail");
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),12);
                for (String line : List.of("Document pedagogique fictif pour explorer l'interface.",
                        "1. Lire la publication et identifier les notions essentielles.",
                        "2. Preparer un exercice ou une question pour le groupe.",
                        "3. Partager votre progression dans les commentaires.",
                        "ISET Rades - Exemple de demonstration locale.")) {
                    stream.newLineAtOffset(0,-38); stream.showText(line);
                }
                stream.endText();
            }
            document.save(output); bytes = output.toByteArray();
        }
        var pdf = new PdfAttachment();
        if (post == null) pdf.setCommunity(community); else pdf.setPublication(post);
        pdf.setFilename(filename); pdf.setContent(bytes); pdf.setSize(bytes.length); pdf.setUpdatedAt(LocalDateTime.now());
        attachments.save(pdf);
    }
}
