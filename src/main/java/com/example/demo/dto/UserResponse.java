package com.example.demo.dto;

import com.example.demo.enums.Role;
import com.example.demo.model.User;

public record UserResponse(Long id, String name, String email, Role role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(),
                user.getRole() == null ? Role.STUDENT : user.getRole().effective());
    }
}
