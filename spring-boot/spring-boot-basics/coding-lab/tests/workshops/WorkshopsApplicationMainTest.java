package workshops;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringApplicationRunListener;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * Public test for Task 9. It calls WorkshopsApplication.main the way
 * java -jar or your IDE would, on a free port, then sends one real HTTP
 * request to the embedded server that main started.
 */
class WorkshopsApplicationMainTest {

    @Test
    void task9MainStartsTheEmbeddedServer() throws Exception {
        AtomicReference<ConfigurableApplicationContext> started = new AtomicReference<>();
        SpringApplication.withHook(application -> new SpringApplicationRunListener() {
            @Override
            public void started(ConfigurableApplicationContext context, Duration timeTaken) {
                started.set(context);
            }
        }, () -> WorkshopsApplication.main(new String[] {
                "--server.port=0", "--spring.main.banner-mode=off", "--logging.level.root=warn" }));

        ConfigurableApplicationContext context = started.get();
        assertNotNull(context, "main(args) did not start a Spring application");
        try {
            String port = context.getEnvironment().getProperty("local.server.port");
            assertNotNull(port, "the application started without an embedded web server");
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/workshops")).build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(200, response.statusCode(), "GET /workshops on the embedded server");
        } finally {
            context.close();
        }
    }
}
