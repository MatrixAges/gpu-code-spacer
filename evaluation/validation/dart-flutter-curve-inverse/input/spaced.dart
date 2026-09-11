class ValidationSample {


  double findInverse(double x) {


    var start = 0.0;


    var end = 1.0;


    late double mid;


    double offsetToOrigin(double pos) => x - transform(pos).dx;


    // Use a binary search to find the inverse point within 1e-6, or 100


    // subdivisions, whichever comes first.


    const errorLimit = 1e-6;


    var count = 100;


    final double startValue = offsetToOrigin(start);


    while ((end - start) / 2.0 > errorLimit && count > 0) {


      mid = (end + start) / 2.0;


      final double value = offsetToOrigin(mid);


      if (value.sign == startValue.sign) {


        start = mid;


      } else {


        end = mid;


      }


      count--;


    }


    return mid;


  }


}
