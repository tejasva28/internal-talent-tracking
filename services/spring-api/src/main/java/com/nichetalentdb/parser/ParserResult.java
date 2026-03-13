package com.nichetalentdb.parser;

public record ParserResult(
  String parsedSnapshotJson,
  String confidenceJson,
  String parserVersion
) {}
