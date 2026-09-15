fn window(size: usize) -> usize {
    let minimum = 1;
    let maximum = 32;
    if size < minimum {
        return minimum;
    }
    return size.min(maximum);
}
