package com.example.demo.model;

import com.example.demo.enums.MembershipStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "community_membership", uniqueConstraints = {
        @UniqueConstraint(name = "uk_membership_user_community", columnNames = {"user_id", "community_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CommunityMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "community_id", nullable = false)
    private Community community;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime requestedAt;
}
