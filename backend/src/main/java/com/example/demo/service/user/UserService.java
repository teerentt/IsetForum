package com.example.demo.service.user;

import com.example.demo.dto.user.UserResponse;
import com.example.demo.enums.Role;
import com.example.demo.model.user.User;
import com.example.demo.repository.user.UserRepository;
import com.example.demo.repository.registration.RegistrationAuthorizationRepository;
import com.example.demo.service.registration.EmailVerificationService;
import com.example.demo.service.registration.RegistrationAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationAuthorizationRepository authorizations;
    private final EmailVerificationService verification;

    @Transactional
    public UserResponse register(String name, String email, String password) {
        String normalizedEmail = RegistrationAuthorizationService.normalize(email);
        if (repository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette adresse e-mail est déjà utilisée.");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le mot de passe dépasse la limite de 72 octets.");
        }
        var authorization = authorizations.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette adresse n’est pas autorisée à s’inscrire. Contactez l’administration."));
        User user = User.builder()
                .name(name.trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password)) // BCrypt
                .role(authorization.getRole())
                .confirmed(false)
                .build();
        repository.saveAndFlush(user);
        verification.send(user);
        return UserResponse.from(user);
    }

    public UserResponse currentUser(String email) {
        return repository.findByEmailIgnoreCase(email).map(UserResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Veuillez vous reconnecter."));
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = repository.findByEmailIgnoreCase(RegistrationAuthorizationService.normalize(email))
                .orElseThrow(() -> new UsernameNotFoundException("Identifiants invalides."));
        Role role = user.getRole() == null ? Role.STUDENT : user.getRole().effective();
        String[] authorities = role == Role.ADMIN
                ? new String[]{"ROLE_ADMIN", "ROLE_PROFESSOR", "ROLE_STUDENT"}
                : new String[]{"ROLE_" + role.name()};
        return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPassword()).authorities(authorities).disabled(!user.isConfirmed()).build();
    }
}
