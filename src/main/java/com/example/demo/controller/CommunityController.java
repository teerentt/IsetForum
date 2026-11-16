package com.example.demo.controller;

import com.example.demo.dto.CommunityRequest;
import com.example.demo.dto.CommunityResponse;
import com.example.demo.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/communities")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService communityService;

    @GetMapping
    public List<CommunityResponse> findAll() {
        return communityService.findAll();
    }

    @GetMapping("/{id}")
    public CommunityResponse findById(@PathVariable Long id) {
        return communityService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommunityResponse create(@Valid @RequestBody CommunityRequest request, Authentication authentication) {
        return communityService.create(request, authentication.getName());
    }

    @PutMapping("/{id}")
    public CommunityResponse update(@PathVariable Long id, @Valid @RequestBody CommunityRequest request,
                                    Authentication authentication) {
        return communityService.update(id, request, authentication.getName());
    }
}
