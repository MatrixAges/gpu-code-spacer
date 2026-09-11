using System;

public static class Input
{
    public static bool Accept(string text, Action<int> submit)
    {
        var parsed = int.TryParse(text, out var number);

        if (!parsed)
        {
            return false;
        }

        var normalized = Math.Abs(number);

        submit(normalized);

        return true;
    }
}
