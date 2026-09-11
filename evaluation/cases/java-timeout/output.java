class Timeout {
    static int countExpired(int[] timeouts) {
        int count = 0;

        for (int timeout : timeouts) {
            if (timeout <= 0) {
                count++;
            }
        }

        return count;
    }
}
