public static class Counts {
    public static object Describe(string? text) {
        var length = text?.Length ?? 0;
        if (length == 0) {
            return new { Label = "empty", Size = 0 };
        }
        var result = new {
            Label = "content",
            Size = length
        };
        return result;
    }
}
