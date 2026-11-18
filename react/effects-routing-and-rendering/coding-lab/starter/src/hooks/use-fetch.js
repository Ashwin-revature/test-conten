/*
TASK 4. Both pages need the same stateful loading logic, so it belongs in a
custom hook. Implement useFetch(url) here so that it:
  - fetches the url with fetchJson from ../api.js inside an Effect;
  - returns an object { data, loading, error }:
      loading is true from the first render until the request settles,
      data holds the parsed JSON after success (and is null before),
      error holds the thrown Error after a failure (and is null otherwise);
  - lists url in the Effect's dependency array so changing the url starts a
    new load (and resets loading/data/error for the new request);
  - creates an AbortController in the Effect, passes its signal to fetchJson,
    aborts it in the cleanup function, and ignores the AbortError a cancelled
    request throws (TASK 6, part 2).
Every component that calls this hook gets its own independent state.
*/
export function useFetch(url) {
  // TODO: implement the hook described above
  return { data: null, loading: false, error: null };
}
