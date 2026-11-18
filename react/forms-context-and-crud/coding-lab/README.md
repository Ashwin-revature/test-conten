# Beacon dashboard, part 3: forms, context and CRUD

Beacon becomes read-write: operators register new services, edit them and
retire them. You will build an accessible controlled form, validate on the
client while treating the server as the authority, create/update/delete
against the API, share notifications through context, and write a Testing
Library test of your own.

This is part 3 of a four-part scenario and is self-contained: the part-2
routing and data loading you need ship finished in the starter, and the dev
server carries a stateful mock of the status API (`mock-api.js`).

## Prerequisites

- Node.js 22.12 or newer and npm 10 or newer. Check with:

  ```
  node --version
  npm --version
  ```

## Setup (one-time, needs the network once)

From this lab folder:

```
cd tests
npm ci
```

Optional, to use the app against the mock API in a browser:

```
cd starter
npm ci
npm run dev
```

## How to test

From the `tests` folder:

```
npm test
```

All 8 tests fail on the shipped starter - including test 8, which lives in
`starter/src/service-form.test.jsx` because you write it yourself. The tests
stub `fetch` and run fully offline.

## Files you edit

Every change happens at a `TASK n` comment in these files:

- `starter/src/components/ServiceForm.jsx` - tasks 1 to 5
- `starter/src/api.js` - tasks 4 and 6
- `starter/src/pages/OverviewPage.jsx` - task 6
- `starter/src/ToastContext.jsx` - task 7
- `starter/src/service-form.test.jsx` - task 8 (the test you write)

Everything else is support and stays as shipped - `tests/`, `expected/`,
`starter/mock-api.js` and every starter file not listed. The public tests
pass by implementing the tasks, not by changing the tests.

## The API you are coding against

- `GET /api/services`, `GET /api/services/<id>` - as in part 2.
- `POST /api/services` - create. 201 with the created service, or
  400 with `{ "errors": { "<field>": "<message>" } }`.
- `PUT /api/services/<id>` - update. 200, or 400 with the same error shape.
- `DELETE /api/services/<id>` - remove. 204 with no content.

All request bodies are JSON and need a `Content-Type: application/json`
header.

## The tasks

Every task is marked with a `TASK n` comment in the starter source.

1. **Control the fields** - `src/components/ServiceForm.jsx`. Text input,
   select and checkbox all read from state and write back in onChange.
2. **Associate the labels** - same file. `htmlFor`/`id` for name and team;
   mark both required.
3. **Client-side validation on submit** - same file. `preventDefault`,
   validate from state, accessible field errors (`aria-describedby`,
   `aria-invalid`), and no API call while input is invalid.
4. **Create against the API** - `src/api.js` (sendJson, createService) and the
   in-flight disable in the form. JSON POST, disabled Save while pending, and
   the overview shows the new service afterwards.
5. **Surface server errors** - `src/components/ServiceForm.jsx`, building on
   task 4's sendJson error contract. 400 field errors appear next to
   their fields; network failures show a form-level `role="alert"` message;
   the user's input is never thrown away.
6. **Edit and delete** - `src/api.js` (updateService, deleteService) and the
   delete handler in `src/pages/OverviewPage.jsx`. PUT and DELETE to the
   service's URL, then bring the list back in line with the server.
7. **Toasts through context** - `src/ToastContext.jsx`. A real context,
   provider state, `addToast`, and the layout's live region shows every toast.
8. **Write your own test** - `starter/src/service-form.test.jsx`. Query by
   role and label, simulate typing and clicking with user-event, pick the
   right getBy/queryBy/findBy variant, and assert what the user can see.

## Expected output

See `expected/on-completion.txt`. The run summary must show
`Test Files  8 passed (8)` and `Tests  8 passed (8)`.

## Offline note

Only the `npm ci` commands need the network, once. Tests and the dev server
then work offline; the dev API is a local in-memory mock that resets on
restart.

## Reset

Your edits live only in `starter/src`. Restore that folder from a fresh copy
of the lab to start over. The mock API resets whenever the dev server
restarts; the tests reset it on every run.

## Cleanup

Delete `tests/node_modules` (and `starter/node_modules` if you created it).
The lab writes nothing else.

## Troubleshooting

- `vitest: command not found` - run `npm ci` inside `tests` first.
- "A component is changing an uncontrolled input to be controlled" in the
  console - a field starts with `undefined` as its value; initialValues always
  provides a string or boolean, so read from state, not from props directly.
- Task 4's test hangs - make sure handleSubmit awaits onSave inside
  try/finally so the button re-enables even on failure.
- Your own test cannot find the button - its accessible name is the visible
  text; check what the form actually renders while submitting.
