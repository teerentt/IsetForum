package com.example.demo.repository.attachment;

import com.example.demo.model.attachment.PdfAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PdfAttachmentRepository extends JpaRepository<PdfAttachment, Long> {
    Optional<PdfAttachment> findByCommunityId(Long communityId);
    Optional<PdfAttachment> findByPublicationId(Long publicationId);
}
