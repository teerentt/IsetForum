package com.example.demo.service.attachment;

import com.example.demo.dto.attachment.PdfResponse;
import com.example.demo.model.attachment.PdfAttachment;
import com.example.demo.repository.attachment.PdfAttachmentRepository;
import com.example.demo.service.community.CommunityAccessService;
import com.example.demo.service.publication.PublicationService;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class PdfService {
    private final PdfAttachmentRepository repository;
    private final CommunityAccessService access;
    private final PublicationService publications;
    private final Environment configuration;

    @Transactional(readOnly = true)
    public PdfAttachment read(Long id, boolean community, String email) {
        if (community) access.requireRead(access.community(id), email);
        else publications.readable(id, email);
        return find(id, community).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun PDF joint."));
    }
    @Transactional(readOnly = true)
    public PdfResponse metadata(Long id, boolean community, String email) {
        if (community) access.requireRead(access.community(id), email);
        else publications.readable(id, email);
        return find(id, community).map(PdfResponse::from).orElse(null);
    }
    public PdfResponse save(Long id, boolean community, MultipartFile file, String email) {
        requireWrite(id, community, email);
        long limit = configuration.getProperty("app.pdf.max-bytes", Long.class, 5242880L);
        if (file.isEmpty() || file.getSize() > limit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le PDF doit être non vide et ne pas dépasser " + limit / 1024 / 1024 + " Mo.");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase(Locale.ROOT).endsWith(".pdf")) throw invalid();
        name = name.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
        if (name.isBlank() || name.length() > 180) throw invalid();
        byte[] content;
        try {
            content = file.getBytes();
            if (content.length < 5 || !new String(content, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) throw invalid();
            try (var document = Loader.loadPDF(content)) {
                if (document.isEncrypted() || document.getNumberOfPages() == 0) throw invalid();
            }
        } catch (ResponseStatusException error) { throw error; }
        catch (Exception error) { throw invalid(); }
        PdfAttachment pdf = find(id, community).orElseGet(PdfAttachment::new);
        if (community) pdf.setCommunity(access.community(id));
        else pdf.setPublication(publications.readable(id, email));
        pdf.setFilename(name); pdf.setContent(content); pdf.setSize(content.length); pdf.setUpdatedAt(LocalDateTime.now());
        return PdfResponse.from(repository.save(pdf));
    }
    public void delete(Long id, boolean community, String email) {
        requireWrite(id, community, email);
        repository.delete(find(id, community).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun PDF joint.")));
    }
    private void requireWrite(Long id, boolean community, String email) {
        if (community) { access.requireAdmin(email); access.community(id); }
        else {
            var post = publications.readable(id, email);
            access.requireAuthor(post.getCommunity(), post.getAuthor().getId(), email, false);
        }
    }
    private Optional<PdfAttachment> find(Long id, boolean community) {
        return community ? repository.findByCommunityId(id) : repository.findByPublicationId(id);
    }
    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un véritable PDF lisible, non chiffré, avec un nom de 180 caractères maximum.");
    }
}
