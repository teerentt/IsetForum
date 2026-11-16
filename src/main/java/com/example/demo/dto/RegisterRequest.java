package com.example.demo.dto;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class RegisterRequest {
    @NotBlank(message = "Le nom est obligatoire.")
    @Size(max = 100, message = "Le nom ne doit pas dépasser 100 caractères.")
    private String name;
    @NotBlank(message = "L’adresse e-mail est obligatoire.")
    @Email(message = "L’adresse e-mail est invalide.")
    @Size(max = 254, message = "L’adresse e-mail ne doit pas dépasser 254 caractères.")
    private String email;
    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères.")
    @lombok.ToString.Exclude
    private String password;
}
