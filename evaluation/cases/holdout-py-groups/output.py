def batches(values, width, emit):
    count = len(values)

    if width <= 0:
        raise ValueError("positive width required")

    for start in range(0, count, width):
        end = min(start + width, count)

        batch = values[start:end]

        emit(batch)

    return count
