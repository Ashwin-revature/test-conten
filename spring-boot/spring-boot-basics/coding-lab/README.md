# Spring Boot Basics lab: the workshop catalog API

## Goal

Finish a small workshop-catalog service built with Spring Boot.
Nine linked tasks:
- Tasks 1 to 5: wire the configured catalog bean into the controller, then add the list, find-by-id, filter and create endpoints.
- Task 6: give the generated project its settings file.
- Task 7: make component scanning find a controller in a second package.
- Task 8: implement one operation from an OpenAPI document.
- Task 9: start the application and its embedded web server from `main`.

Everything runs on your own computer; no cloud account, no Docker.
On the Standard track this lab is required; on the Fast track it is not required.
Plan about 36 minutes for the tasks (an estimate), after the one-time setup.

## What you edit

| File | Tasks |
| --- | --- |
| `starter/src/main/java/workshops/WorkshopController.java` | 1-5 and 8 |
| `starter/src/main/resources/application.properties` | 6 (you create this file) |
| `starter/src/main/java/workshops/WorkshopsApplication.java` | 7 and 9 |

Every other file is complete and stays as shipped. Read `fixtures/workshops-openapi.yaml` for Task 8, but do not change it, and do not move `AboutController` out of its `about` package.

## Prerequisites

JDK 25 and Apache Maven 3.9 or later (the same install you used for the Java Foundations labs). Check both in a terminal:

```
java -version
mvn -v
```

`java -version` must report 25, and the `Java version:` line of `mvn -v` must also say 25.

## Setup (once, needs the internet)

From the lab's `starter` folder:

```
mvn -q dependency:go-offline
```

This downloads Spring Boot 4.1.2 and the pinned plugins into your local Maven repository, then everything else runs offline.

## Tasks

Open the `starter` folder as a Maven project in your IDE and open `WorkshopController.java`.
Each task has a `TODO` comment, except Task 6, which creates a new file. Each test is named after its task, so a failure tells you which task it belongs to.
Run the one test command from the `starter` folder after each task:

```
mvn -q -o test
```

### Task 1: inject the catalog bean

The controller builds its own empty catalog with `new WorkshopCatalog(List.of())`, so it never sees the two seeded workshops that `CatalogConfig` puts in the real bean.
Replace the manual `new` with constructor injection: make the field `final` and assign it from a constructor parameter.
Then make `all()` return the catalog's workshops.
Done when `task1ListsTheSeededWorkshops` no longer fails.

### Task 2: find one workshop by id

Add a `GET /workshops/{id}` handler method that takes the id as a `@PathVariable int id` and returns the matching workshop from the catalog.
Done when `task2FindsOneWorkshopByItsId` no longer fails.

### Task 3: 404 for an unknown id

Change that method to return `ResponseEntity<Workshop>`: `200 OK` with the workshop when the id exists, `404 Not Found` when it does not (`findById` returns an `Optional` to build on).
Done when `task3UnknownWorkshopIdGives404` no longer fails.

### Task 4: filter with a query parameter

Give `all()` an optional `Integer minSeats` query parameter (`@RequestParam(required = false)`).
When it is present, return only workshops with at least that many seats; when absent, return all of them.
Done when `task4FiltersWorkshopsByMinSeats` no longer fails.

### Task 5: create a workshop

Add a `POST /workshops` handler that takes a `NewWorkshop` `@RequestBody`, adds it with `catalog.add(...)`, and returns `201 Created` with a `Location` header of `/workshops/{newId}` and the created workshop as the body (`ResponseEntity.created(URI.create(...)).body(...)`).
Done when `task5CreateReturns201AndTheCreatedWorkshop` no longer fails.

### Task 6: add the settings file

A project generated with Spring Initializr keeps its settings in `src/main/resources/application.properties`, but this one has no `resources` folder yet.
Create `starter/src/main/resources/application.properties` with two lines: `spring.application.name=workshop-catalog` and `server.port=8081`.
The file must be in `src/main/resources`: Maven copies that folder onto the classpath, but it ignores a `.properties` file put under `src/main/java`.
Done when `task6ApplicationPropertiesNameTheServiceAndPort` no longer fails.

### Task 7: scan a second package

`AboutController` in `starter/src/main/java/about/` maps `GET /about`, but that request returns 404.
`@SpringBootApplication` scans for components only in and below its own package, `workshops`, so `about` is never scanned.
In `WorkshopsApplication.java`, give the annotation the attribute `scanBasePackages = { "workshops", "about" }`. Name both packages, because a package list replaces the default.
Done when `task7ScanningFindsTheAboutController` no longer fails.

### Task 8: implement an operation from its OpenAPI document

`fixtures/workshops-openapi.yaml` describes one more operation for the catalog API.
Read it to find the path, the parameters and where each one goes, the response schema and the status codes.
Then add that handler method to `WorkshopController.java`, with a small record for the response body inside the same file.
Use the field names exactly as the schema spells them.
Done when `task8AvailabilityFollowsTheOpenApiContract` no longer fails.

### Task 9: start the embedded server from main

`main` in `WorkshopsApplication.java` is empty, so running the class does nothing.
Call `SpringApplication.run(WorkshopsApplication.class, args)` there and pass `args` through.
Spring Boot then creates the application context and starts an embedded Tomcat from your own `main` method; no separately installed server is needed.
The test calls `main` with `--server.port=0`, then sends one real HTTP request to the server it started.
Done when `task9MainStartsTheEmbeddedServer` no longer fails.

## Test

The one test command, run from the `starter` folder:

```
mvn -q -o test
```

Before you start, all nine tests fail; when you finish, the command prints nothing and exits with status 0.
Most tests call the API over MockMvc and check status codes and JSON bodies. The Task 6 test checks the two settings, and the Task 9 test starts the application from `main`.
None of them checks how your code is written, so compare your code with each task's steps yourself.
Full test output, including the Spring log of each run, is written under `starter/target/surefire-reports/`.

After Task 9 you can also run the API itself: run `WorkshopsApplication` from your IDE (its `main` method).
The startup log names the port, 8081 after Task 6. Call the API with curl, for example `curl localhost:8081/workshops`, and stop the application from your IDE.

## Expected output

`expected/test-summary.txt` shows the surefire summary of a completed run.

## Offline note

Only the setup step uses the network. `mvn -q -o test` runs offline; if it reports a missing artifact, run the setup step once more while online.

## Cleanup

The lab writes only `starter/target`. Delete it from the `starter` folder:

- macOS and Linux: `rm -rf target`
- Windows PowerShell: `Remove-Item -Recurse -Force target`

## Troubleshooting

- **`mvn -v` shows a Java version other than 25**: set `JAVA_HOME` to your JDK 25 folder and open a new terminal.
- **`COMPILATION ERROR`**: fix the file and line Maven names, then rerun the test command.
- **`Cannot access central in offline mode`**: run the setup command once more while online.
- **Port 8081 already in use when running the app**: another server is running; stop it, or run the tests instead (the Task 9 test picks a free port).
