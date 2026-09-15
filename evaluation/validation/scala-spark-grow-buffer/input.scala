class ValidationSample[K, V, T] {
  private def growToSize(newSize: Int): Unit = {
    // since two fields are hold in element0 and element1, an array holds newSize - 2 elements
    val newArraySize = newSize - 2
    val arrayMax = ByteArrayMethods.MAX_ROUNDED_ARRAY_LENGTH
    if (newSize < 0 || newArraySize > arrayMax) {
      throw new UnsupportedOperationException(s"Can't grow buffer past $arrayMax elements")
    }
    val capacity = if (otherElements != null) otherElements.length else 0
    if (newArraySize > capacity) {
      var newArrayLen = 8L
      while (newArraySize > newArrayLen) {
        newArrayLen *= 2
      }
      if (newArrayLen > arrayMax) {
        newArrayLen = arrayMax
      }
      val newArray = new Array[T](newArrayLen.toInt)
      if (otherElements != null) {
        System.arraycopy(otherElements, 0, newArray, 0, otherElements.length)
      }
      otherElements = newArray
    }
    curSize = newSize
  }
}
