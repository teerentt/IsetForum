package com.example.demo.model.attachment;

import com.example.demo.model.community.Community;
import com.example.demo.model.publication.Publication;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity @Table(name = "pdf_attachment") @Getter @Setter @NoArgsConstructor
public class PdfAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "community_id", unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Community community;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "publication_id", unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Publication publication;
    @Column(nullable = false, length = 180)
    private String filename;
    @Column(nullable = false)
    private long size;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    @Lob @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] content;
}
