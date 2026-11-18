package com.example.demo.dto.publication;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class CommentRequest {

    @NotBlank(message = "Le contenu est obligatoire.")
    @Size(max = 2000, message = "Le contenu ne doit pas dépasser 2000 caractères.")
    private String content;
    public void setContent(String content) { this.content = content == null ? null : content.trim(); }
}
