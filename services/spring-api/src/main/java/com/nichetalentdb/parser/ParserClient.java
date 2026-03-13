package com.nichetalentdb.parser;

public interface ParserClient {
  ParserResult parse(byte[] fileBytes, String contentType, String filename);
}
