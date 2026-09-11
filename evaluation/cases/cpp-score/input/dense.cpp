int score(int value) {
    const int floor = 0;
    const int offset = 10;
    if (value < floor) {
        return floor;
    }
    return value + offset;
}
