package com.example.demo.dto.registration;

import jakarta.validation.constraints.*;

public record ResendRequest(
        @NotBlank(message = "L’adresse e-mail est obligatoire.")
        @Email(message = "L’adresse e-mail est invalide.")
        @Size(max = 254, message = "L’adresse e-mail ne doit pas dépasser 254 caractères.") String email) {
    public ResendRequest { if (email != null) email = email.trim().toLowerCase(java.util.Locale.ROOT); }
}
