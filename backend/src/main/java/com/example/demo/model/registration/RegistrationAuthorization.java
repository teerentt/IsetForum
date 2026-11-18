package com.example.demo.model.registration;

import com.example.demo.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "registration_authorization")
@Getter @Setter @NoArgsConstructor
public class RegistrationAuthorization {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 254)
    private String email;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Role role;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
