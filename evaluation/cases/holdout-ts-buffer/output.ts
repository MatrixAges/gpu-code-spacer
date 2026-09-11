function flush(chunks: string[], append: (text: string) => void, commit: () => void): void {
  const header = "BEGIN";

  const payload = chunks
    .filter((chunk) => chunk.length > 0)
    .join(";");

  append(header);
  append(payload);
  // Commit the completed batch.
  commit();
}
