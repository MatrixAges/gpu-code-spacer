import java.io.IOException;
import java.io.Writer;
class Export {
    static int write(Writer target, String body) throws IOException {
        String cleaned = body.strip();

        if (cleaned.isEmpty()) {
            return 0;
        }

        String ending = System.lineSeparator();

        target.write(cleaned);
        target.write(ending);
        target.flush();

        return cleaned.length();
    }
}
