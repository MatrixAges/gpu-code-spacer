fn components(base: u8) [3]u8 {
    const values = [3]u8{


        base,


        base +| 1,


        base +| 2,


    };


    return values;
}
