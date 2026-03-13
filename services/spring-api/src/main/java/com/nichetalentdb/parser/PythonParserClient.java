package com.nichetalentdb.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

@Component
public class PythonParserClient implements ParserClient {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;
  private final String baseUrl;

  public PythonParserClient(@Value("${app.parser.baseUrl}") String baseUrl, ObjectMapper objectMapper) {
    this.restTemplate = new RestTemplate();
    this.objectMapper = objectMapper;
    this.baseUrl = baseUrl;
  }

  @Override
  public ParserResult parse(byte[] fileBytes, String contentType, String filename) {
    // Send file bytes directly so parsing does not depend on MinIO object public
    // access.
    Map<String, Object> payload = Map.of(
        "file_base64", Base64.getEncoder().encodeToString(fileBytes),
        "content_type", contentType == null ? "" : contentType,
        "filename", filename == null ? "" : filename);

    try {
      System.out.println("DEBUG: Sending parsing request for file: " + filename);

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

      ResponseEntity<String> response = restTemplate.postForEntity(
          baseUrl + "/parse",
          request,
          String.class);

      System.out.println("DEBUG: Parser response received, status: " + response.getStatusCode());

      String resp = response.getBody();
      if (resp == null || resp.isEmpty()) {
        throw new RuntimeException("Empty response from parser");
      }

      var root = objectMapper.readTree(resp);
      String confidence = root.path("confidence").toString();
      String parserVersion = root.path("parser_version").asText("v1-rules");
      return new ParserResult(resp, confidence, parserVersion);
    } catch (Exception e) {
      System.out.println("DEBUG: Parsing exception: " + e.getClass().getSimpleName() + ": " + e.getMessage());
      e.printStackTrace();
      // fallback to empty result so upload succeeds even if parsing fails
      return new ParserResult("{}", "0.0", "error");
    }
  }
}
