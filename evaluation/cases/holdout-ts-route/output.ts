async function route(path: string, query: (id: number) => Promise<string>): Promise<string> {
  const segment = path.split("/").at(-1);

  if (!segment) {
    return "missing";
  }

  const id = Number(segment);

  if (!Number.isInteger(id)) {
    return "invalid";
  }

  const response = await query(id);

  return response.trim();
}
