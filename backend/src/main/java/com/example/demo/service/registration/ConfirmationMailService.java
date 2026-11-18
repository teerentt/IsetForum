package com.example.demo.service.registration;

import lombok.RequiredArgsConstructor;
import org.slf4j.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;

@Service @RequiredArgsConstructor
public class ConfirmationMailService {
    private static final Logger log = LoggerFactory.getLogger(ConfirmationMailService.class);
    private final ObjectProvider<JavaMailSender> mail;
    private final Environment configuration;
    public void send(String email, String token) {
        String link = configuration.getProperty("app.frontend-url", "http://localhost:4200") + "/confirmation?token=" + token;
        if (configuration.getProperty("app.mail.mode", "smtp").equals("console")
                && configuration.acceptsProfiles(Profiles.of("dev", "test"))) {
            log.warn("Confirmation locale pour {} : {}", email, link);
            String outbox = configuration.getProperty("app.mail.dev-outbox", "target/dev-confirmations.log");
            if (!outbox.isBlank()) try {
                Path target = Path.of(outbox);
                if (target.getParent() != null) Files.createDirectories(target.getParent());
                Files.writeString(target, email + " " + link + System.lineSeparator(), StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            } catch (Exception error) { throw unavailable("Impossible de préparer l’e-mail de confirmation."); }
            return;
        }
        JavaMailSender sender = mail.getIfAvailable();
        if (sender == null) throw unavailable("L’envoi des e-mails n’est pas configuré.");
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(configuration.getProperty("app.mail.from", "noreply@isetforum.tn"));
        message.setTo(email); message.setSubject("Confirmez votre compte IsetForum");
        message.setText("Bienvenue sur IsetForum !\nConfirmez votre compte avec ce lien valable 24 heures :\n" + link);
        try { sender.send(message); }
        catch (Exception error) { throw unavailable("L’e-mail n’a pas pu être envoyé. Réessayez plus tard."); }
    }
    private ResponseStatusException unavailable(String message) {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
