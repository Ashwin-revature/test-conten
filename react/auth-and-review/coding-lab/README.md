# Beacon dashboard, part 4: auth and review

Beacon goes to production, so the free-for-all ends: operators sign in, pages
are guarded, roles decide what each person sees and may do, and the API
answers 401 and 403 like a real back end. You finish by switching off the
development auto-sign-in - the front-end twin of the back end's open dev
profile - and pointing the app at its API through an environment variable.

This is the final part of the four-part scenario and is self-contained: the
dev server carries a mock of the SECURED status API (`mock-api.js`), playing a
Spring back end running without its dev profile.

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

Development accounts for the mock API (fake fixtures, not secrets):
`avery` / `beacon1` (admin) and `omar` / `beacon2` (operator).

## How to test

From the `tests` folder:

```
npm test
```

All 8 tests fail on the shipped starter. The tests stub `fetch` and run fully
offline. One coupling to know: test 1 ends on the loaded dashboard, so it
needs task 2 (the bearer token) as well as task 1 before it turns green.

## Files you edit

Every change happens at a `TASK n` comment in these files:

- `starter/src/auth/AuthContext.jsx` - tasks 1 and 7
- `starter/src/pages/LoginPage.jsx` - task 1
- `starter/src/api.js` - tasks 2 and 8
- `starter/src/auth/RequireSignIn.jsx` - task 3
- `starter/src/components/AppLayout.jsx` - tasks 4 and 7
- `starter/src/pages/AdminPage.jsx` - task 4
- `starter/src/pages/OverviewPage.jsx` - task 6
- `starter/src/dev-auth.js` - task 8

Task 5 is read-and-verify in `starter/src/auth/use-authed-fetch.js`; you read
it, you do not change it. Everything else is support and stays as shipped -
`tests/`, `expected/`, `starter/mock-api.js` and every starter file not
listed. The tests pass by implementing the tasks, not by changing the tests.

## The API you are coding against

- `POST /api/login` with `{ "username": ..., "password": ... }` - 200 with
  `{ "token": ..., "user": { "name": ..., "role": ... } }`, or 401.
- Every other endpoint requires `Authorization: Bearer <token>` and answers
  401 without a valid one.
- `GET /api/services` - the list.
- `POST /api/services/<id>/restart` - admin only; 403 for other roles.

## The tasks

Every task is marked with a `TASK n` comment in the starter source.

1. **Sign in** - `src/auth/AuthContext.jsx` (signIn) and
   `src/pages/LoginPage.jsx` (handleSubmit). Success stores the session in
   application state and navigates on; a 401 says
   "Wrong username or password." and keeps the typed username.
2. **Carry the credential** - `src/api.js` (authFetch). Every signed-in
   request sends `Authorization: Bearer <token>`; non-ok responses become
   errors that carry their status.
3. **Guard the pages** - `src/auth/RequireSignIn.jsx`. Signed-out visitors are
   redirected to the login page, which remembers where they wanted to go and
   returns them there after sign-in.
4. **Role-based screens** - `src/components/AppLayout.jsx` and
   `src/pages/AdminPage.jsx`. The Admin link renders only for admins, and the
   admin page itself shows "Not allowed" to everyone else. The guards shape
   the interface; the server still enforces every rule.
5. **Handle 401** - read the given flow end to end (`use-authed-fetch.js`,
   `sessionExpired` in the context): a 401 mid-session clears the client's
   auth state and lands on the login page with
   "Your session expired - sign in again.", returning after a new sign-in.
   Your tasks 1-3 make this flow work; the test proves the whole loop.
6. **Handle 403** - `src/pages/OverviewPage.jsx` (handleRestart). A 403 means
   authenticated but refused: show "You are not allowed to do that." and keep
   the user signed in.
7. **Sign out** - `src/auth/AuthContext.jsx` (signOut) and the header button.
   The session is forgotten and the guards take over again.
8. **Turn off the dev profile** - `src/dev-auth.js` and `src/api.js` (apiUrl).
   Nobody is signed in automatically any more, and the API base address comes
   from the `VITE_API_URL` environment variable (defaulting to `/api`).

## Expected output

See `expected/on-completion.txt`. The run summary must show
`Test Files  8 passed (8)` and `Tests  8 passed (8)`.

## Offline note

Only the `npm ci` commands need the network, once. Tests and the dev server
then work offline.

## Reset

Your edits live only in `starter/src`. Restore that folder from a fresh copy
of the lab to start over. The session lives in React state only - a reload
signs you out.

## Cleanup

Delete `tests/node_modules` (and `starter/node_modules` if you created it).
The lab writes nothing else.

## Troubleshooting

- `vitest: command not found` - run `npm ci` inside `tests` first.
- Signing in works but the dashboard stays empty - check that authFetch
  actually sends the Authorization header; the secured API answers 401
  without it and the hook then drops the session.
- Test 8's environment assertions fail although auto-sign-in is off - apiUrl
  must read `import.meta.env.VITE_API_URL` each time it is called, not once
  at module load.
