/*
TASK 3. The route "services/:serviceId" renders this page for one service.
Build it so that it:
  - reads the serviceId from the URL with useParams;
  - loads `/api/services/${serviceId}` with the useFetch hook from TASK 4;
  - shows a paragraph reading  Loading service...  while the request is
    pending, and on failure
      <p className="error-banner">Could not load this service (HTTP 404)</p>
    (take the code from error.message);
  - on success shows the service name as a level-2 heading, its StatusBadge,
    team, uptime and summary;
  - offers a "Back to overview" button that navigates to "/" from code with
    useNavigate when clicked.
*/
export default function ServiceDetailPage() {
  return <p>TODO: build the service detail page</p>;
}
