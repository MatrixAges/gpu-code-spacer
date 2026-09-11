class ValidationSample {
  Offset _previousVelocityAt(int index) {
    final int endIndex = (_index + index) % _sampleSize;
    final int startIndex = (_index + index - 1) % _sampleSize;
    final _PointAtTime? end = _touchSamples[endIndex];
    final _PointAtTime? start = _touchSamples[startIndex];
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
