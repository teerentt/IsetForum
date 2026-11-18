package com.example.demo.dto.registration;

import com.example.demo.enums.Role;
import com.example.demo.model.registration.RegistrationAuthorization;
import java.time.LocalDateTime;

public record AuthorizationResponse(Long id, String email, Role role, LocalDateTime updatedAt) {
    public static AuthorizationResponse from(RegistrationAuthorization value) {
        return new AuthorizationResponse(value.getId(), value.getEmail(), value.getRole(), value.getUpdatedAt());
    }
}
