package sample

func capacity(requested int) int {
    minimum := 4
    maximum := 128

    if requested < minimum {
        return minimum
    }

    return min(requested, maximum)
}
