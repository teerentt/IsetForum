package com.example.demo.controller.publication;

import com.example.demo.dto.publication.*;
import com.example.demo.service.publication.PublicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class PublicationController {
    private final PublicationService service;
    @GetMapping("/communities/{parentId}/publications")
    public List<PublicationResponse> list(@PathVariable Long parentId, Authentication authentication) {
        return service.list(parentId, email(authentication));
    }
    @GetMapping("/publications/{id}")
    public PublicationResponse find(@PathVariable Long id, Authentication authentication) { return service.find(id, email(authentication)); }
    @PostMapping("/communities/{parentId}/publications") @ResponseStatus(HttpStatus.CREATED)
    public PublicationResponse create(@PathVariable Long parentId, @Valid @RequestBody PublicationRequest request, Authentication authentication) {
        return service.create(parentId, request, email(authentication));
    }
    @PutMapping("/publications/{id}")
    public PublicationResponse update(@PathVariable Long id, @Valid @RequestBody PublicationRequest request, Authentication authentication) {
        return service.update(id, request, email(authentication));
    }
    @DeleteMapping("/publications/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) { service.delete(id, email(authentication)); }
    private String email(Authentication authentication) { return authentication == null ? null : authentication.getName(); }
}
