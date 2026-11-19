package workshops;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Public tests for Tasks 1 to 8 of the Spring Boot Basics lab. They call the API
 * over MockMvc and check responses (status codes and JSON bodies); Task 6 checks
 * the two settings the application reads from application.properties.
 */
@SpringBootTest(properties = { "spring.main.banner-mode=off", "logging.level.root=warn" })
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.MethodName.class)
class WorkshopApiTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    Environment env;

    @Test
    void task1ListsTheSeededWorkshops() throws Exception {
        mvc.perform(get("/workshops"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", hasItem("Spring Kickstart")))
                .andExpect(jsonPath("$[*].title", hasItem("REST Deep Dive")));
    }

    @Test
    void task2FindsOneWorkshopByItsId() throws Exception {
        mvc.perform(get("/workshops/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Spring Kickstart"))
                .andExpect(jsonPath("$.seats").value(20));
    }

    @Test
    void task3UnknownWorkshopIdGives404() throws Exception {
        mvc.perform(get("/workshops/2"))
                .andExpect(status().isOk());
        mvc.perform(get("/workshops/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void task4FiltersWorkshopsByMinSeats() throws Exception {
        mvc.perform(get("/workshops").param("minSeats", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", hasItem("Spring Kickstart")))
                .andExpect(jsonPath("$[*].title", not(hasItem("REST Deep Dive"))));
    }

    @Test
    void task5CreateReturns201AndTheCreatedWorkshop() throws Exception {
        mvc.perform(post("/workshops")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Testing Lab\",\"seats\":6}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/workshops/3"))
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.title").value("Testing Lab"))
                .andExpect(jsonPath("$.seats").value(6));
    }

    @Test
    void task6ApplicationPropertiesNameTheServiceAndPort() {
        assertEquals("workshop-catalog", env.getProperty("spring.application.name"),
                "spring.application.name, read from starter/src/main/resources/application.properties");
        assertEquals("8081", env.getProperty("server.port"),
                "server.port, read from starter/src/main/resources/application.properties");
    }

    @Test
    void task7ScanningFindsTheAboutController() throws Exception {
        mvc.perform(get("/about"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Workshop catalog lab"));
    }

    @Test
    void task8AvailabilityFollowsTheOpenApiContract() throws Exception {
        mvc.perform(get("/workshops/1/availability").param("groupSize", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workshopId").value(1))
                .andExpect(jsonPath("$.groupSize").value(12))
                .andExpect(jsonPath("$.bookable").value(true));
        mvc.perform(get("/workshops/1/availability").param("groupSize", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookable").value(true));
        mvc.perform(get("/workshops/2/availability").param("groupSize", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookable").value(false));
        mvc.perform(get("/workshops/999/availability").param("groupSize", "2"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/workshops/1/availability"))
                .andExpect(status().isBadRequest());
    }
}
