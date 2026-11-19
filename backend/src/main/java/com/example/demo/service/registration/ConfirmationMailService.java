package com.example.demo.service.registration;

import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service @RequiredArgsConstructor
public class ConfirmationMailService {
    private final JavaMailSender mail;
    private final Environment configuration;
    public void send(String email, String token) {
        String link = configuration.getProperty("app.frontend-url", "http://localhost:4200") + "/confirmation?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(configuration.getProperty("app.mail.from", "noreply@isetforum.tn"));
        message.setTo(email); message.setSubject("Confirmez votre compte IsetForum");
        message.setText("Bienvenue sur IsetForum !\nConfirmez votre compte avec ce lien valable 24 heures :\n" + link);
        try { mail.send(message); }
        catch (MailException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "L’e-mail n’a pas pu être envoyé. Réessayez plus tard.");
        }
    }
}
