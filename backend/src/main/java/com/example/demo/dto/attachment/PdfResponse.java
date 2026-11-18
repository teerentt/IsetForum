package com.example.demo.dto.attachment;

import com.example.demo.model.attachment.PdfAttachment;
import java.time.LocalDateTime;

public record PdfResponse(String filename, long size, LocalDateTime updatedAt) {
    public static PdfResponse from(PdfAttachment pdf) { return new PdfResponse(pdf.getFilename(), pdf.getSize(), pdf.getUpdatedAt()); }
}
