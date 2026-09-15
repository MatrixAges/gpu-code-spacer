fn leadingZeros(bytes: []const u8) usize {
    var index: usize = 0;
    while (index < bytes.len and bytes[index] == 0) : (index += 1) {
    }
    return index;
}
