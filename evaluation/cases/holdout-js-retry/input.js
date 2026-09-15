async function retry(attempt, fallback) {
  const first = await attempt();
  if (first !== null) {
    return first;
  }
  const backup = await fallback();
  return backup;
}
