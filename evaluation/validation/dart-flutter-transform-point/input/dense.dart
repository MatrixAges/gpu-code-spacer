class ValidationSample {
  static Offset transformPoint(Matrix4 transform, Offset point) {
    final Float64List storage = transform.storage;
    final double x = point.dx;
    final double y = point.dy;
    // Directly simulate the transform of the vector (x, y, 0, 1),
    // dropping the resulting Z coordinate, and normalizing only
    // if needed.
    final double rx = storage[0] * x + storage[4] * y + storage[12];
    final double ry = storage[1] * x + storage[5] * y + storage[13];
    final double rw = storage[3] * x + storage[7] * y + storage[15];
    if (rw == 1.0) {
      return Offset(rx, ry);
    } else {
      return Offset(rx / rw, ry / rw);
    }
  }
}
