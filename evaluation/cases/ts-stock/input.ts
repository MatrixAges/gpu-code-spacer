function available(stock: number, reserved: number): boolean {
  const remaining = stock - reserved;
  const threshold = 2;
  if (remaining < threshold) {
    return false;
  }
  return true;
}
