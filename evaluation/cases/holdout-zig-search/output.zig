fn position(values: []const i32, wanted: i32) ?usize {
    const count = values.len;

    for (0..count) |index| {
        const value = values[index];

        if (value == wanted) {
            return index;
        }
    }

    // The requested value was absent.
    return null;
}
