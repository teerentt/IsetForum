package com.example.demo.config;

import com.example.demo.enums.Role;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
@Order(1)
@RequiredArgsConstructor
public class DevelopmentDataSeeder implements CommandLineRunner {
    private final UserRepository repository;
    private final PasswordEncoder encoder;
    @Value("${app.dev.seed-password}")
    private String seedPassword;
    @Override
    @Transactional
    public void run(String... args) {
        seed("Lina Ben Ali", "etudiant@isetforum.test", Role.STUDENT);
        seed("Pr. Sami Mansour", "professeur@isetforum.test", Role.PROFESSOR);
        seed("Amira Jaziri", "admin@isetforum.test", Role.ADMIN);
    }
    private void seed(String name, String email, Role role) {
        if (!repository.existsByEmailIgnoreCase(email)) {
            repository.save(User.builder().name(name).email(email).role(role)
                    .password(encoder.encode(seedPassword)).build());
        }
    }
}
