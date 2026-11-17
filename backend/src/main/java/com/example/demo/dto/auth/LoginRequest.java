package com.example.demo.dto.auth;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class LoginRequest {
    @NotBlank(message = "L’adresse e-mail est obligatoire.")
    @Email(message = "L’adresse e-mail est invalide.")
    @Size(max = 254, message = "L’adresse e-mail ne doit pas dépasser 254 caractères.")
    private String email;
    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Size(max = 72, message = "Le mot de passe ne doit pas dépasser 72 caractères.")
    @lombok.ToString.Exclude
    private String password;
}
