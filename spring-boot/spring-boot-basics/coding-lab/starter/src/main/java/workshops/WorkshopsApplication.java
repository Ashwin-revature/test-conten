package workshops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The main application class. You edit it in Tasks 7 and 9.
 */
// TODO Task 7: component scanning starts in this class's package (workshops), so it
// never finds AboutController in the about package. Give @SpringBootApplication a
// scanBasePackages list that names both packages: "workshops" and "about".
@SpringBootApplication
public class WorkshopsApplication {

    public static void main(String[] args) {
        // TODO Task 9: start Spring Boot from this main method. Call
        // SpringApplication.run with this class and args, so the application
        // context and its embedded web server start.
    }
}
