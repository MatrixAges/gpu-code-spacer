using System.Collections.Generic;
public static class Tags
{
    public static void Append(List<string> tags, string value)
    {
        var cleaned = value.Trim();


        tags.Add(cleaned);


        tags.Sort();
    }
}
