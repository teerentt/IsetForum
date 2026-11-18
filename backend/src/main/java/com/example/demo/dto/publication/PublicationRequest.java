package com.example.demo.dto.publication;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class PublicationRequest {
    @NotBlank(message = "Le titre est obligatoire.")
    @Size(max = 160, message = "Le titre ne doit pas dépasser 160 caractères.")
    private String title;
    public void setTitle(String title) { this.title = title == null ? null : title.trim(); }
    @NotBlank(message = "Le contenu est obligatoire.")
    @Size(max = 10000, message = "Le contenu ne doit pas dépasser 10000 caractères.")
    private String content;
    public void setContent(String content) { this.content = content == null ? null : content.trim(); }
}
