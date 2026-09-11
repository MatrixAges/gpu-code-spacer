fun quota(used: Int, limit: Int): Int {
    val remaining = limit - used
    val empty = 0

    if (remaining < empty) {
        return empty
    }

    return remaining
}
