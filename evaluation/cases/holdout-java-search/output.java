class Search {
    static int firstLong(String[] words, int length) {
        int result = -1;

        for (int i = 0; i < words.length; i++) {
            String word = words[i];

            if (word.length() >= length) {
                result = i;

                break;
            }
        }

        return result;
    }
}
