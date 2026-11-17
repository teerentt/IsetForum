package com.example.demo.dto.community;

import com.example.demo.enums.CommunityVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CommunityRequest {
    @NotBlank(message = "Le nom de la communauté est obligatoire.")
    @Size(max = 100, message = "Le nom ne doit pas dépasser 100 caractères.")
    private String name;

    @NotBlank(message = "La description est obligatoire.")
    @Size(max = 1000, message = "La description ne doit pas dépasser 1 000 caractères.")
    private String description;

    @NotNull(message = "La visibilité est obligatoire : PUBLIC ou PRIVATE.")
    private CommunityVisibility visibility;
}
