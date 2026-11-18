package com.example.demo.dto.registration;

import jakarta.validation.constraints.*;

public record ConfirmationRequest(
        @NotBlank(message = "Le lien de confirmation est obligatoire.")
        @Size(max = 100, message = "Le lien de confirmation est invalide.") String token) {}
