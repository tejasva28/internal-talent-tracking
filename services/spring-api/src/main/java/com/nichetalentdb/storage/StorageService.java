package com.nichetalentdb.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.util.UUID;

@Service
public class StorageService {
  private final S3Client s3;
  private final String bucket;
  private final String endpoint;

  public StorageService(S3Client s3, @Value("${app.storage.bucket}") String bucket,
      @Value("${app.storage.endpoint:http://localhost:9000}") String endpoint) {
    this.s3 = s3;
    this.bucket = bucket;
    this.endpoint = endpoint.replaceAll("/+$", "");
    ensureBucket();
  }

  private void ensureBucket() {
    try {
      s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
    } catch (NoSuchBucketException e) {
      s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
    } catch (S3Exception e) {
      // bucket may not exist; try create
      if (e.statusCode() == 404) {
        s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
      }
    }
  }

  public String upload(byte[] bytes, String contentType, String originalFilename) {
    String key = "resumes/" + UUID.randomUUID() + "-" + (originalFilename == null ? "file" : originalFilename);
    s3.putObject(PutObjectRequest.builder()
        .bucket(bucket)
        .key(key)
        .contentType(contentType)
        .build(),
        RequestBody.fromBytes(bytes));
    return key;
  }

  public String publicGetUrl(String key) {
    return endpoint + "/" + bucket + "/" + key;
  }

  public void delete(String key) {
    s3.deleteObject(DeleteObjectRequest.builder()
        .bucket(bucket)
        .key(key)
        .build());
  }

  public byte[] download(String key) {
    try {
      var response = s3.getObject(GetObjectRequest.builder()
          .bucket(bucket)
          .key(key)
          .build());
      return response.readAllBytes();
    } catch (Exception e) {
      throw new RuntimeException("Failed to download file: " + key, e);
    }
  }
}
