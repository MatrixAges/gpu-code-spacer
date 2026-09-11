fn publish(bytes: []const u8, offset: ?usize, send: *const fn ([]const u8) void) bool {
    const start = offset orelse return false;


    if (start >= bytes.len) {
        return false;
    }


    const selected = bytes[start..];


    send(selected);


    return true;
}
