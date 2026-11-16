package com.example.demo.enums;

public enum Role {
    USER, // Ancienne valeur conservée pour les comptes existants, équivalente à STUDENT.
    STUDENT,
    PROFESSOR,
    ADMIN;

    public Role effective() { return this == USER ? STUDENT : this; }
}
