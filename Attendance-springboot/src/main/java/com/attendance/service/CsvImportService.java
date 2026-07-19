package com.attendance.service;

import com.attendance.dto.CsvImportResult;
import com.attendance.entity.User;
import com.attendance.repository.UserRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CsvImportService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    private String safeGet(CSVRecord record, String column) {
    return record.isSet(column) ? record.get(column) : null;
    }
    public CsvImportResult importUsersFromCsv(MultipartFile file) throws IOException {
        List<String> created = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
                CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT
                        .withFirstRecordAsHeader()
                        .withIgnoreHeaderCase()
                        .withTrim())) {

            for (CSVRecord csvRecord : csvParser) {
                String sap = csvRecord.get("sap");
                String email = csvRecord.get("email");

                if (userRepository.existsByEmail(email) ||
                        (sap != null && !sap.isEmpty() && userRepository.existsBySap(sap))) {
                    skipped.add(email + " (already exists)");
                    continue;
                }

                User user = new User();
user.setSap(sap);
user.setName(csvRecord.get("name"));
user.setEmail(email);
user.setPassword(passwordEncoder.encode(csvRecord.get("password")));
user.setClassName(safeGet(csvRecord, "className"));
user.setRole(csvRecord.get("role"));
user.setDepartment(safeGet(csvRecord, "department"));
user.setIsFirstLogin(true);
user.setCreatedAt(LocalDateTime.now());

                try {
                    userRepository.save(user);
                    created.add(email);
                } catch (Exception e) {
                    skipped.add(email + " (" + e.getMessage() + ")");
                }
            }
        }

        return new CsvImportResult(created, skipped);
    }
}