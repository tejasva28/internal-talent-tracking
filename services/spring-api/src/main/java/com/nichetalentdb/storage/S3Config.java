package com.nichetalentdb.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Configuration
public class S3Config {

  @Value("${app.storage.endpoint:}")
  private String endpoint;

  @Value("${app.storage.accessKey:}")
  private String accessKey;

  @Value("${app.storage.secretKey:}")
  private String secretKey;

  @Bean
  public S3Client s3Client() {
    var creds = StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));

    var builder = S3Client.builder()
      .credentialsProvider(creds)
      .region(Region.US_EAST_1)
      .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());

    if (endpoint != null && !endpoint.isBlank()) {
      builder = builder.endpointOverride(URI.create(endpoint));
    }
    return builder.build();
  }
}
