package com.example.demo.controller.admin;

import com.example.demo.dto.community.*;
import com.example.demo.service.community.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/admin/communities") @RequiredArgsConstructor
public class AdminCommunityController {
    private final CommunityService communities;
    private final CommunityAccessService access;
    @GetMapping
    public List<CommunityResponse> list(Authentication auth) {
        access.requireAdmin(auth.getName()); return communities.findAll();
    }
    @GetMapping("/{id}")
    public CommunityResponse find(@PathVariable Long id, Authentication auth) {
        access.requireAdmin(auth.getName()); return communities.findById(id);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public CommunityResponse create(@Valid @RequestBody CommunityRequest request, Authentication auth) {
        access.requireAdmin(auth.getName()); return communities.create(request, auth.getName());
    }
    @PutMapping("/{id}")
    public CommunityResponse update(@PathVariable Long id, @Valid @RequestBody CommunityRequest request, Authentication auth) {
        access.requireAdmin(auth.getName()); return communities.update(id, request, auth.getName());
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) { communities.delete(id, auth.getName()); }
}
