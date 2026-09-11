function label(parts: string[]): string {
  const joined = parts.join(


    ":",


  );


  // Keep an empty label explicit.
  return joined || "untitled";
}
