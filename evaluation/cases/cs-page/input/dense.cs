public static class Pages
{
    public static int Start(int page, int size)
    {
        var offset = page * size;
        var minimum = 0;
        if (offset < minimum)
        {
            return minimum;
        }
        return offset;
    }
}
