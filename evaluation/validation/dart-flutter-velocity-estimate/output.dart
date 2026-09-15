class ValidationSample {
  Offset _previousVelocityAt(int index) {
    final _PointAtTime? end = _touchSamples[(_index + index) % _sampleSize];
    final _PointAtTime? start = _touchSamples[(_index + index - 1) % _sampleSize];

    if (end == null || start == null) {
      return Offset.zero;
    }

    final int dt = (end.time - start.time).inMicroseconds;

    assert(dt >= 0);

    return dt > 0
        // Convert dt to milliseconds to preserve floating point precision.
        ? (end.point - start.point) * 1000 / (dt.toDouble() / 1000)
        : Offset.zero;
  }
}
