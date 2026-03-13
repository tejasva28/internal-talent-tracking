package com.nichetalentdb.auth;

import com.nichetalentdb.auth.dto.LoginRequest;
import com.nichetalentdb.auth.dto.LoginResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public LoginResponse login(LoginRequest req) {
    var user = userRepository.findByEmail(req.email())
      .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

    if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
      throw new IllegalArgumentException("Invalid credentials");
    }
    var token = jwtService.createToken(user.getEmail(), user.getRole());
    return new LoginResponse(token, "Bearer");
  }
}
