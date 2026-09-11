struct Bounds { int low; int high; };

Bounds bounds(int center) {
    Bounds result{};

    result.low = center - 1;
    result.high = center + 1;

    return result;
}
