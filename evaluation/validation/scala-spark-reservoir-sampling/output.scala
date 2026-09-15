class ValidationSample[T] {
  def updateReservoir(
      reservoir: Array[T],
      input: Iterator[T],
      count: Long,
      random: scala.util.Random): Long = {
    var total = count

    while (input.hasNext) {
      val item = input.next()

      total += 1

      val replacementIndex = (random.nextDouble() * total).toLong

      if (replacementIndex < reservoir.length) {
        reservoir(replacementIndex.toInt) = item
      }
    }

    return total
  }
}
