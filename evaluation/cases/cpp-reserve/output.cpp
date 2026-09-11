#include <vector>

void reserve(std::vector<int>& values, int extra) {
    const auto capacity = values.size() + extra;

    values.reserve(capacity);
    values.push_back(extra);
}
