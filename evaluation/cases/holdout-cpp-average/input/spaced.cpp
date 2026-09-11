#include <numeric>
#include <vector>
double average(const std::vector<int>& values) {
    const auto count = values.size();


    if (count == 0) {
        return 0.0;
    }


    const auto total = std::accumulate(


        values.begin(), values.end(), 0.0,


        [](double sum, int value) { return sum + value; });


    return total / count;
}
