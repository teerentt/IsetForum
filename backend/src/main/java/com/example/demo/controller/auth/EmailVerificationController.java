package com.example.demo.controller.auth;

import com.example.demo.dto.registration.*;
import com.example.demo.service.registration.EmailVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class EmailVerificationController {
    private final EmailVerificationService service;
    @PostMapping("/confirm") public Map<String, String> confirm(@Valid @RequestBody ConfirmationRequest request) {
        service.confirm(request.token()); return Map.of("message", "Votre compte est confirmé. Vous pouvez vous connecter.");
    }
    @PostMapping("/resend-confirmation") public Map<String, String> resend(@Valid @RequestBody ResendRequest request) {
        service.resend(request.email()); return Map.of("message", "Si un compte attend confirmation, un nouveau lien a été envoyé.");
    }
}
