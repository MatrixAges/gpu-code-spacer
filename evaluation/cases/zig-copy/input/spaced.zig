fn initialize(destination: []u8, input: []const u8) void {
    const count = @min(destination.len, input.len);


    @memset(destination, 0);


    @memcpy(destination[0..count], input[0..count]);
}
