package com.nichetalentdb.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
  @Value("${app.jwt.secret}")
  private String secret;

  @Value("${app.jwt.issuer}")
  private String issuer;

  @Value("${app.jwt.expiryMinutes}")
  private long expiryMinutes;

  public String createToken(String subject, Role role) {
    var key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    var now = Instant.now();
    var exp = now.plusSeconds(expiryMinutes * 60);

    return Jwts.builder()
      .issuer(issuer)
      .subject(subject)
      .issuedAt(Date.from(now))
      .expiration(Date.from(exp))
      .claims(Map.of("role", role.name()))
      .signWith(key)
      .compact();
  }

  public io.jsonwebtoken.Claims parse(String token) {
    var key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    return Jwts.parser()
      .verifyWith(key)
      .build()
      .parseSignedClaims(token)
      .getPayload();
  }
}
