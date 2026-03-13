package com.nichetalentdb.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserSeeder implements CommandLineRunner {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public UserSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  public void run(String... args) {
    seed("admin@local.test", "admin123", Role.ADMIN);
    seed("viewer@local.test", "viewer123", Role.VIEWER);
  }

  private void seed(String email, String password, Role role) {
    if (userRepository.findByEmail(email).isPresent()) return;
    var u = new UserEntity();
    u.setEmail(email);
    u.setPasswordHash(passwordEncoder.encode(password));
    u.setRole(role);
    userRepository.save(u);
  }
}
