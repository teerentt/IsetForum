package com.example.demo.dto;

import java.util.Map;

public record ApiError(String message, Map<String, String> fields) {
    public ApiError(String message) { this(message, Map.of()); }
}
