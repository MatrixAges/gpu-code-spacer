class ValidationSample {
  double findInverse(double x) {
    var start = 0.0;
    var end = 1.0;
    late double mid;

    double offsetToOrigin(double pos) => x - transform(pos).dx;

    final double startValue = offsetToOrigin(start);

    // Stop within 1e-6, or after 100 subdivisions.
    for (var count = 100; (end - start) / 2.0 > 1e-6 && count > 0; count--) {
      mid = (end + start) / 2.0;

      final double value = offsetToOrigin(mid);

      if (value.sign == startValue.sign) {
        start = mid;
      } else {
        end = mid;
      }
    }

    return mid;
  }
}
