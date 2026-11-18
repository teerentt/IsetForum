package com.example.demo.config.seed;

import com.example.demo.enums.Role;
import com.example.demo.model.user.User;
import com.example.demo.repository.user.UserRepository;
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
    @Value("${app.dev.demo-data:false}")
    private boolean demoData;
    @Override
    @Transactional
    public void run(String... args) {
        if (demoData) {
            seed("Lina Ben Ali", "etudiant@isetforum.test", Role.STUDENT);
            seed("Pr. Sami Mansour", "professeur@isetforum.test", Role.PROFESSOR);
        }
        seed("Amira Jaziri", "admin@isetforum.test", Role.ADMIN);
    }
    private void seed(String name, String email, Role role) {
        if (!repository.existsByEmailIgnoreCase(email)) {
            repository.save(User.builder().name(name).email(email).role(role)
                    .password(encoder.encode(seedPassword)).build());
        }
    }
}
