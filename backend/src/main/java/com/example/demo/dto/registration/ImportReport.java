package com.example.demo.dto.registration;

import java.util.List;

public record ImportReport(int imported, int updated, int duplicates, List<RowError> invalidRows) {
    public record RowError(int row, String message) {}
}
