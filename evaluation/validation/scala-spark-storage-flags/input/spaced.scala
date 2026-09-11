class ValidationSample[K, V, T] {


  def toInt: Int = {


    var ret = 0


    if (_useDisk) {


      ret |= 8


    }


    if (_useMemory) {


      ret |= 4


    }


    if (_useOffHeap) {


      ret |= 2


    }


    if (_deserialized) {


      ret |= 1


    }


    ret


  }


}
