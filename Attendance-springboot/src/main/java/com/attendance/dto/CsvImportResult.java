package com.attendance.dto;

import java.util.List;

public class CsvImportResult {
    private List<String> created;
    private List<String> skipped;

    public CsvImportResult(List<String> created, List<String> skipped) {
        this.created = created;
        this.skipped = skipped;
    }

    public List<String> getCreated() { return created; }
    public List<String> getSkipped() { return skipped; }
}
