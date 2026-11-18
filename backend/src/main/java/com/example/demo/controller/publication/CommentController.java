package com.example.demo.controller.publication;

import com.example.demo.dto.publication.*;
import com.example.demo.service.publication.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class CommentController {
    private final CommentService service;
    @GetMapping("/publications/{parentId}/comments")
    public List<CommentResponse> list(@PathVariable Long parentId, Authentication authentication) {
        return service.list(parentId, email(authentication));
    }

    @PostMapping("/publications/{parentId}/comments") @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse create(@PathVariable Long parentId, @Valid @RequestBody CommentRequest request, Authentication authentication) {
        return service.create(parentId, request, email(authentication));
    }
    @PutMapping("/comments/{id}")
    public CommentResponse update(@PathVariable Long id, @Valid @RequestBody CommentRequest request, Authentication authentication) {
        return service.update(id, request, email(authentication));
    }
    @DeleteMapping("/comments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) { service.delete(id, email(authentication)); }
    private String email(Authentication authentication) { return authentication == null ? null : authentication.getName(); }
}
