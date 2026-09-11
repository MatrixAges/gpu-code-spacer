class ValidationSample {
  static AlignmentGeometry? lerp(AlignmentGeometry? a, AlignmentGeometry? b, double t) {
    if (identical(a, b)) {
      return a;
    }

    if (a == null) {
      return b! * t;
    }

    if (b == null) {
      return a * (1.0 - t);
    }

    if (a is Alignment && b is Alignment) {
      return Alignment.lerp(a, b, t);
    }

    if (a is AlignmentDirectional && b is AlignmentDirectional) {
      return AlignmentDirectional.lerp(a, b, t);
    }

    return _MixedAlignment(
      ui.lerpDouble(a._x, b._x, t)!,
      ui.lerpDouble(a._start, b._start, t)!,
      ui.lerpDouble(a._y, b._y, t)!,
    );
  }
}
