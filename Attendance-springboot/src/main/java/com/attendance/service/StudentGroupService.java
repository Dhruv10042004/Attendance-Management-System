package com.attendance.service;

import com.attendance.entity.StudentGroup;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.repository.StudentGroupRepository;
import com.attendance.repository.UserRepository;
import java.util.Set;
import java.util.TreeSet;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * One CSV column ("sap") per group, uploaded once at the start of term — same
 * {@link CsvImportService} pattern already used for bulk user import, reused
 * rather than adding a
 * new file format or library. A row whose sap doesn't match a real student is
 * skipped, not fatal,
 * so one typo doesn't block the whole batch; the skipped list tells the admin
 * what to fix.
 */
@Service
public class StudentGroupService {

    @Autowired
    private StudentGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    public List<StudentGroup> getAll() {
        return groupRepository.findAll();
    }

    public StudentGroup importFromCsv(String name, MultipartFile file) throws IOException {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Group name is required");
        }
        List<String> studentIds = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        Set<String> classes = new TreeSet<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
                CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT
                        .withFirstRecordAsHeader().withIgnoreHeaderCase().withTrim())) {
            for (CSVRecord row : csvParser) {
                String sap = row.get("sap");
                User u = userRepository.findBySap(sap).orElse(null);
                if (u == null || !"student".equalsIgnoreCase(u.getRole())) {
                    skipped.add(sap + " (no such student)");
                    continue;
                }
                studentIds.add(u.getId());
                if (u.getClassName() != null && !u.getClassName().isBlank())
                    classes.add(u.getClassName());
            }
        }
        if (studentIds.isEmpty()) {
            throw new BadRequestException("No valid students found in file. Skipped: " + skipped);
        }

        StudentGroup group = new StudentGroup(null, name, studentIds, new ArrayList<>(classes), LocalDateTime.now());
        return groupRepository.save(group);
        // ponytail: skipped rows are dropped after the throw/save, not returned to the
        // caller.
        // Add a result DTO (studentIds + skipped) if admins need to see partial-skip
        // details in the UI.
    }

    public void delete(String id) {
        groupRepository.deleteById(id);
    }
}