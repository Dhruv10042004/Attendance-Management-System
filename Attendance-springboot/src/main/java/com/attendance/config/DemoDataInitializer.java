package com.attendance.config;

import com.attendance.entity.User;
import com.attendance.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Creates local demo accounts on startup when demo data is enabled. */
@Configuration
@ConditionalOnProperty(prefix = "app.demo-data", name = "enabled", havingValue = "true")
public class DemoDataInitializer {

    private static final String DEMO_PASSWORD = "Demo@123";

    @Bean
    CommandLineRunner seedDemoUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            seed(userRepository, passwordEncoder, "DEMO-ADMIN", "Demo Admin", "admin@demo.com", "Administration", "admin");
            seed(userRepository, passwordEncoder, "DEMO-HOD", "Demo HOD", "hod@demo.com", "Computer Science", "hod");
            seed(userRepository, passwordEncoder, "DEMO-TEACHER", "Demo Teacher", "teacher@demo.com", "BCA", "teacher");
            seed(userRepository, passwordEncoder, "DEMO-STUDENT", "Demo Student", "student@demo.com", "BCA", "student");
        };
    }

    private void seed(UserRepository userRepository, PasswordEncoder passwordEncoder, String sap, String name,
                      String email, String className, String role) {
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User user = new User();
        user.setSap(sap);
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(DEMO_PASSWORD));
        user.setClassName(className);
        user.setRole(role);
        user.setIsFirstLogin(false);
        userRepository.save(user);
    }
}
