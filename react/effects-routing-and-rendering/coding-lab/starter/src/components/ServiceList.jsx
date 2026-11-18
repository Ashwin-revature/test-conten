import ServiceCard from "./ServiceCard.jsx";

// Given: renders whatever list of services it receives.
export default function ServiceList({ services }) {
  return (
    <ul className="card-grid">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </ul>
  );
}
