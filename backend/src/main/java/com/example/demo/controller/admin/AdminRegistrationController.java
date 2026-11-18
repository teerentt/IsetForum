package com.example.demo.controller.admin;

import com.example.demo.dto.registration.*;
import com.example.demo.service.registration.RegistrationAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController @RequestMapping("/api/admin/registration-authorizations") @RequiredArgsConstructor
public class AdminRegistrationController {
    private final RegistrationAuthorizationService service;
    @GetMapping public List<AuthorizationResponse> list(Authentication auth) { return service.list(auth.getName()); }
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public ImportReport importExcel(@RequestPart("file") MultipartFile file, Authentication auth) { return service.importExcel(file, auth.getName()); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Long id, Authentication auth) { service.remove(id, auth.getName()); }
}
