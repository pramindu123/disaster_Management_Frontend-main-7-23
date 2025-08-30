import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../api";

interface Volunteer {
  userId: number;
  name: string;
  divisional_secretariat: string;
  district: string;
  email: string;
  contact_number: string; 
  availability: string; // "Available" | "Unavailable"
}

export default function DMCVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dsFilter, setDSFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // ✅ Helper to normalize availability safely
  const normalizeAvailability = (value: any): "Available" | "Unavailable" => {
    if (value === true || value === 1) return "Available";
    if (typeof value === "string" && value.toLowerCase() === "available") return "Available";
    return "Unavailable";
  };

  useEffect(() => {
    const dmcData = JSON.parse(localStorage.getItem("dmcOfficerData") || "{}");
    const district = dmcData?.district;

    if (!district) {
      console.warn("District not found in localStorage");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/Volunteer/by-district?district=${district}`)
      .then((res) => res.json())
      .then((data) => {
        const volunteersWithAvailability = data.map((vol: any) => ({
          ...vol,
          availability: normalizeAvailability(vol.availability),
        }));
        setVolunteers(volunteersWithAvailability);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch volunteers:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-100 rounded-2xl shadow p-8 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Volunteers in Your District</h2>
      </div>

      {/* Filter Controls */}
      {!loading && volunteers.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4">
          <select className="px-3 py-2 rounded border" value={dsFilter} onChange={e => setDSFilter(e.target.value)}>
            <option value="">All Divisional Secretariats</option>
            {Array.from(new Set(volunteers.map(v => v.divisional_secretariat))).map(ds => (
              <option key={ds} value={ds}>{ds}</option>
            ))}
          </select>
          <select className="px-3 py-2 rounded border" value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)}>
            <option value="">All Availability</option>
            {Array.from(new Set(volunteers.map(v => v.availability))).map(av => (
              <option key={av} value={av}>{av}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-600">Loading volunteers...</p>
      ) : volunteers.length === 0 ? (
        <p className="text-center text-gray-600">
          No volunteers found in your district.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg border">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Divisional Secretariat</th>
                <th className="py-2 px-4 border">District</th>
                <th className="py-2 px-4 border">Email</th>
                <th className="px-4 py-2 border">Contact No</th> 
                <th className="py-2 px-4 border">Availability</th>
              </tr>
            </thead>
            <tbody>
              {volunteers
                .filter(vol =>
                  (!dsFilter || vol.divisional_secretariat === dsFilter) &&
                  (!availabilityFilter || vol.availability === availabilityFilter)
                )
                .map((vol) => (
                <tr key={vol.userId} className="border-b last:border-b-0">
                  <td className="py-2 px-4 border">{vol.name}</td>
                  <td className="py-2 px-4 border">{vol.divisional_secretariat}</td>
                  <td className="py-2 px-4 border">{vol.district}</td>
                  <td className="py-2 px-4 border">{vol.email || "N/A"}</td>
                  <td className="px-4 py-2 border">{vol.contact_number || "N/A"}</td>
                  <td className="py-2 px-4 border">{vol.availability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}