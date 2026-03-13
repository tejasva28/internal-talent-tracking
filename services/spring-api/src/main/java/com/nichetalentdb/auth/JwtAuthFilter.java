package com.nichetalentdb.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String path = request.getServletPath();
    System.out.println("DEBUG: JwtAuthFilter processing request for path: " + path);

    if (path.startsWith("/api/auth/")) {
      System.out.println("DEBUG: Skipping auth filter for auth endpoint");
      filterChain.doFilter(request, response);
      return;
    }

    String auth = request.getHeader("Authorization");
    System.out.println("DEBUG: Authorization header present: " + (auth != null));

    if (auth != null && auth.startsWith("Bearer ")) {
      String token = auth.substring(7);
      try {
        var claims = jwtService.parse(token);
        String email = claims.getSubject();
        String role = (String) claims.get("role"); // "ADMIN" or "VIEWER"
        System.out.println("DEBUG: JWT parsed. Email: " + email + ", Role: " + role);

        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        var authentication = new UsernamePasswordAuthenticationToken(email, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        System.out.println("DEBUG: SecurityContext set with authorities: " + authorities);
      } catch (Exception e) {
        System.out.println("DEBUG: JWT parsing/validation failed: " + e.getMessage());
        // ignore invalid token
      }
    } else {
      System.out.println("DEBUG: No valid Bearer token found");
    }
    filterChain.doFilter(request, response);
  }
}
