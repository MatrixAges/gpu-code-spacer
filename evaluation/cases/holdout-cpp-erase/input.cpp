bool erase(std::vector<int>& values, int wanted) {
    const auto found = std::find(values.begin(), values.end(), wanted);
    if (found == values.end()) {
        return false;
    }
    const auto index = found - values.begin();
    values.erase(values.begin() + index);
    return true;
}
