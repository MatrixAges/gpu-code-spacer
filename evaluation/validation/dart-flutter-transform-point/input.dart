class ValidationSample {
  static Offset transformPoint(Float64List storage, Offset point) {
    final double rx = storage[0] * point.dx + storage[4] * point.dy + storage[12];
    final double ry = storage[1] * point.dx + storage[5] * point.dy + storage[13];
    final double rw = storage[3] * point.dx + storage[7] * point.dy + storage[15];
    if (rw == 1.0) {
      return Offset(rx, ry);
    } else {
      return Offset(rx / rw, ry / rw);
    }
  }
}
