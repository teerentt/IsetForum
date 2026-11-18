package com.example.demo.controller.attachment;

import com.example.demo.dto.attachment.PdfResponse;
import com.example.demo.service.attachment.PdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@RestController @RequestMapping("/api/{kind}/{id}/pdf") @RequiredArgsConstructor
public class PdfController {
    private final PdfService service;
    @GetMapping("/metadata")
    public PdfResponse metadata(@PathVariable String kind, @PathVariable Long id, Authentication auth) {
        return service.metadata(id, community(kind), email(auth));
    }
    @GetMapping
    public ResponseEntity<byte[]> download(@PathVariable String kind, @PathVariable Long id, Authentication auth) {
        var pdf = service.read(id, community(kind), email(auth));
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(pdf.getFilename(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff").body(pdf.getContent());
    }
    @PutMapping(consumes = "multipart/form-data")
    public PdfResponse upload(@PathVariable String kind, @PathVariable Long id, @RequestPart("file") MultipartFile file, Authentication auth) {
        return service.save(id, community(kind), file, email(auth));
    }
    @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String kind, @PathVariable Long id, Authentication auth) { service.delete(id, community(kind), email(auth)); }
    private String email(Authentication auth) { return auth == null ? null : auth.getName(); }
    private boolean community(String kind) {
        if (kind.equals("communities")) return true;
        if (kind.equals("publications")) return false;
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ressource introuvable.");
    }
}
