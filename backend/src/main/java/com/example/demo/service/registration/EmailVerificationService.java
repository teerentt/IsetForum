package com.example.demo.service.registration;

import com.example.demo.model.user.User;
import com.example.demo.model.registration.EmailVerificationToken;
import com.example.demo.repository.registration.EmailVerificationTokenRepository;
import com.example.demo.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.security.*;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class EmailVerificationService {
    private final EmailVerificationTokenRepository tokens;
    private final UserRepository users;
    private final ConfirmationMailService mail;
    public void send(User user) {
        var existing = tokens.findByUserId(user.getId());
        if (existing.isPresent() && existing.get().getSentAt().isAfter(LocalDateTime.now().minusMinutes(1))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Attendez une minute avant de demander un nouveau lien.");
        }
        byte[] random = new byte[32]; new SecureRandom().nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        var value = existing.orElseGet(EmailVerificationToken::new);
        value.setUser(user); value.setTokenHash(hash(token));
        value.setSentAt(LocalDateTime.now()); value.setExpiresAt(LocalDateTime.now().plusHours(24));
        tokens.saveAndFlush(value);
        mail.send(user.getEmail(), token);
    }
    public void confirm(String token) {
        var value = tokens.findByTokenHash(hash(token)).orElseThrow(this::invalid);
        if (!value.getExpiresAt().isAfter(LocalDateTime.now()) || value.getUser().isConfirmed()) throw invalid();
        value.getUser().setConfirmed(true); users.save(value.getUser()); tokens.delete(value);
    }
    public void resend(String email) {
        var user = users.findByEmailIgnoreCase(RegistrationAuthorizationService.normalize(email));
        if (user.isPresent() && !user.get().isConfirmed()) send(user.get());
    }
    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce lien est invalide, expiré ou déjà utilisé.");
    }
    public static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
}
