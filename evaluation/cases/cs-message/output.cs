public static class Messages
{
    public static string Build(string name, int count)
    {
        var message = string.Format(
            "{0}: {1}",
            name,
            count);

        return message;
    }
}
