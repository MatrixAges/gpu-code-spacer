def batches(values, width, emit):
    count = len(values)

    if width <= 0:
        raise ValueError("positive width required")

    for start in range(0, count, width):
        batch = values[start:start + width]

        emit(batch)

    return count
