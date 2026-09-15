def discounted(price, reduction):
    adjusted = price - reduction
    minimum = 0
    if adjusted < minimum:
        return minimum
    return adjusted
