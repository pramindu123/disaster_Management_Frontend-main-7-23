import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import districtGnDivisions from "../data/districtDivisionalSecretariats";
import DisasterMap from "../components/DisasterMap";
import { API_BASE_URL } from "../api";
import { FaExclamationTriangle, FaMapMarkedAlt, FaHandsHelping, FaDonate, FaUserPlus } from "react-icons/fa";

const rowsPerPage = 6;

function StatCard({
  icon,
  value,
  label,
  color,
  inView,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 1200;
    const increment = Math.ceil(end / (duration / 16));
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-1">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${color} rounded-2xl opacity-0 group-hover:opacity-10 transition duration-300`}
      ></div>
      <div className="relative">
        <span className="text-4xl mb-4 block transform group-hover:scale-110 transition duration-300">
          {icon}
        </span>
        <h3 className="text-3xl font-bold text-gray-900 mb-2">
          {count.toLocaleString()}
        </h3>
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  );
}

interface Alert {
  id: number;
  type: string;
  severity: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  district?: string;
}

interface AidRequest {
  aid_id: number;
  full_name: string;
  type_support: string;
  request_type: string;
  district: string;
  divisional_secretariat: string;
  latitude: number;
  longitude: number;
  contact_no?: string;
}

interface DSOfficer {
  divisional_secretariat: string;
  contact_no: string;
}

export default function Home() {
 const navigate = useNavigate();
const aidTableRef = useRef<HTMLDivElement>(null);

const handleTileClick = (target: string) => {
  if (target === "#aid-table") {
    aidTableRef.current?.scrollIntoView({ behavior: "smooth" });
  } else {
    navigate(target);
  }
};

  const [aidRequests, setAidRequests] = useState<AidRequest[]>([]);
  const [deliveredAidRequests, setDeliveredAidRequests] = useState<AidRequest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dsContacts, setDsContacts] = useState<Record<string, string>>({});

  const [showAlerts, setShowAlerts] = useState(true);
  const [showAidRequests, setShowAidRequests] = useState(true);
  const [showDeliveredAid, setShowDeliveredAid] = useState(true);
  

  const [activeVolunteers, setActiveVolunteers] = useState(0);
  const [alertsSent, setAlertsSent] = useState(0);
  const [aidDelivered, setAidDelivered] = useState(0);

  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedDivisionalSecretariat, setSelectedDivisionalSecretariat] = useState<string | null>(null);

  const aboutRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  const handleLearnMore = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStatsInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchAidRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/AidRequest/ongoing`);
        const data = await res.json();
        console.log("Fetched ongoing aid requests:", data);
        setAidRequests(data);
      } catch (err) {
        console.error("Error fetching aid requests:", err);
      }
    };
    fetchAidRequests();
  }, []);

  useEffect(() => {
    const fetchDeliveredAidRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/AidRequest/delivered`);
        const data = await res.json();
        setDeliveredAidRequests(data);
      } catch (err) {
        console.error("Error fetching delivered aid requests:", err);
      }
    };
    fetchDeliveredAidRequests();
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/Alerts/all`);
        const data = await res.json();
        const savedDistrict = localStorage.getItem("selectedDistrict");
        setAlerts(savedDistrict ? data.filter((a: Alert) => a.district === savedDistrict) : data);
      } catch (err) {
        console.error("Error fetching alerts:", err);
      }
    };
    fetchAlerts();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [vol, alerts, aid] = await Promise.all([
          fetch(`${API_BASE_URL}/active-volunteers-count`),
          fetch(`${API_BASE_URL}/alerts-sent-count`),
          fetch(`${API_BASE_URL}/total-aid-requests-count`),
        ]);
        setActiveVolunteers((await vol.json()).count);
        setAlertsSent((await alerts.json()).count);
        setAidDelivered((await aid.json()).count);
      } catch (err) {
        console.error("Error fetching statistics:", err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchDSContacts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/DSOfficer/all`);
        const data: DSOfficer[] = await res.json();
        const mapping: Record<string, string> = {};
        data.forEach(ds => {
          const normalizedKey = ds.divisional_secretariat.trim().toLowerCase();
          mapping[normalizedKey] = ds.contact_no;
        });
        setDsContacts(mapping);
      } catch (err) {
        console.error("Error fetching DS officer contacts:", err);
      }
    };
    fetchDSContacts();
  }, []);

  const aidTypes = Array.from(
  new Set(
    aidRequests
      .map(r => r.type_support)
      .filter(Boolean)
  )
);


  const districts = Object.keys(districtGnDivisions);

  const divisionalSecretariats = selectedDistrict
    ? districtGnDivisions[selectedDistrict] || []
    : Array.from(new Set(aidRequests.map(r => r.divisional_secretariat).filter(Boolean)));

  const filtered = aidRequests.filter(
  req => req.request_type?.toLowerCase() === "postdisaster"
);

const finalFiltered = filtered.filter(req =>
  (!selectedType || req.type_support === selectedType) &&
  (!selectedDistrict || req.district === selectedDistrict) &&
  (!selectedDivisionalSecretariat || req.divisional_secretariat === selectedDivisionalSecretariat)
);

const paginated = finalFiltered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

useEffect(() => {
  if (page > Math.ceil(finalFiltered.length / rowsPerPage) && finalFiltered.length > 0) {
    setPage(1);
  }
}, [finalFiltered, page]);

  const resetFilters = useCallback(() => {
    setSelectedType(null);
    setSelectedDistrict(null);
    setSelectedDivisionalSecretariat(null);
    setPage(1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 transform -skew-y-6"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-24">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Disaster Management System
              </h1>
              <p className="text-xl md:text-2xl text-gray-600">
                Empowering communities with real-time alerts, rapid response, and coordinated aid distribution.
              </p>
              <button
                onClick={handleLearnMore}
                className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-xl text-lg font-bold shadow hover:shadow-lg hover:-translate-y-1 transition"
              >
                Learn More
              </button>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-30"></div>
                <div className="relative bg-white p-2 rounded-2xl shadow-xl">
                  <img src="home.png" alt="Hero" className="w-full h-72 object-cover rounded-2xl shadow-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
             <section ref={aboutRef} className="max-w-5xl mx-auto mb-16 scroll-mt-28 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mt-4">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
            About the HazardX System
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Our system helps communities prepare for, respond to, and recover from disasters efficiently.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                title: "Report Disasters",
                desc: "Easily report disasters for quick response.",
                path: "/submit-symptoms",
                icon: <FaExclamationTriangle className="text-3xl text-blue-600 mb-2" />,
              },
              {
                title: "View Disaster",
                desc: "Access real-time disaster information with an interactive map.",
                path: "/alerts",
                icon: <FaMapMarkedAlt className="text-3xl text-purple-600 mb-2" />,
              },
              {
                title: "Request Support",
                desc: "Ask for emergency support and post emergency period aids.",
                path: "/request-aid",
                icon: <FaHandsHelping className="text-3xl text-green-600 mb-2" />,
              },
            ].map((item) => (
              <button
                key={item.title}
                onClick={() => handleTileClick(item.path)}
                className="flex flex-col items-center justify-center bg-blue-50 text-center rounded-xl p-6 shadow hover:shadow-lg transition transform hover:-translate-y-1 w-full cursor-pointer border-2 border-transparent hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                type="button"
                tabIndex={0}
              >
                {item.icon}
                <h3 className="text-lg font-semibold text-blue-800 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </button>
            ))}

            {/* Second row: wrap last 2 tiles */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 justify-center">
              {[
                {
                  title: "Donors Donation",
                  desc: "Donate to support disaster relief efforts.",
                  path: "#aid-table",
                  icon: <FaDonate className="text-3xl text-yellow-600 mb-2" />,
                },
                {
                  title: "Volunteers",
                  desc: "Join as a volunteer to help affected communities.",
                  path: "/signup",
                  icon: <FaUserPlus className="text-3xl text-pink-600 mb-2" />,
                },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleTileClick(item.path)}
                  className="flex flex-col items-center justify-center bg-blue-50 text-center rounded-xl p-6 shadow hover:shadow-lg transition transform hover:-translate-y-1 w-full cursor-pointer border-2 border-transparent hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  type="button"
                  tabIndex={0}
                >
                  {item.icon}
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

        {/* Map */}
      <section className="w-full mb-16 max-w-7xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">Live Disaster Map</h2>
        <p className="text-lg text-gray-700 mb-6">
          View affected areas, aid requests, delivered aid, and active alerts.
        </p>

        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={() => setShowAlerts(!showAlerts)}
            />
            Show Alerts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAidRequests}
              onChange={() => setShowAidRequests(!showAidRequests)}
            />
            Show Ongoing Aid Requests
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDeliveredAid}
              onChange={() => setShowDeliveredAid(!showDeliveredAid)}
            />
            Show Delivered Aid
          </label>
        </div>

        <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-lg">
          <DisasterMap
            approvedAidRequests={showAidRequests ? aidRequests : []} // ✅ all ongoing aids for the map!
            deliveredAidRequests={showDeliveredAid ? deliveredAidRequests : []}
            approvedAlerts={showAlerts ? alerts : []}
            />

        </div>
      </section>



      {/* Stats*/ }
      <section className="py-20 bg-white" ref={statsRef}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { label: "Active Volunteers", value: activeVolunteers, icon: "👥", color: "from-blue-500 to-blue-600" },
              { label: "Alerts Sent", value: alertsSent, icon: "🔔", color: "from-purple-500 to-purple-600" },
              { label: "Aid Requested", value: aidDelivered, icon: "✅", color: "from-green-500 to-green-600" },
            ].map(stat => (
              <StatCard key={stat.label} {...stat} inView={statsInView} />
            ))}
          </div>
        </div>
      </section>

   {/* Aid Table */}
      <section ref={aidTableRef} className="w-full mt-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-blue-800">
            Post Emergency Period Aid Requests
          </h2>
          <p className="text-gray-700 mb-6">
            If you like to donate, contact the Divisional Secretariat office of the affected area to get instructions on the donation process.
          </p>

          {/* Filter */}
          <div className="mb-6 bg-blue-50 rounded-xl p-4 flex flex-wrap gap-4 items-center">
            <span className="font-semibold text-gray-700">Filter by:</span>
            <select
              className="px-3 py-2 rounded-lg border"
              value={selectedType || ""}
              onChange={e => {
                setSelectedType(e.target.value || null);
                setPage(1);
              }}
            >
              <option value="">Request Type</option>
              {aidTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border"
              value={selectedDistrict || ""}
              onChange={e => {
                setSelectedDistrict(e.target.value || null);
                setSelectedDivisionalSecretariat(null);
                setPage(1);
              }}
            >
              <option value="">District</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 rounded-lg border"
              value={selectedDivisionalSecretariat || ""}
              onChange={e => {
                setSelectedDivisionalSecretariat(e.target.value || null);
                setPage(1);
              }}
            >
              <option value="">Divisional Secretariat</option>
              {divisionalSecretariats.map(ds => (
                <option key={ds} value={ds}>{ds}</option>
              ))}
            </select>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300"
            >
              Reset
            </button>
          </div>

         {/* Table */}
<div className="w-full overflow-x-auto">
  <table className="min-w-[1000px] w-full divide-y divide-gray-200 rounded-xl overflow-hidden shadow">
    <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
      <tr>
        {[
          "#",
          "Recipient Name",
          "Requester Contact",
          "Request Type",
          "District",
          "Divisional Secretariat with Contact"
        ].map((header) => (
          <th
            key={header}
            className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-100">
      {paginated.length === 0 ? (
        <tr>
          <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
            No aid requests found.
          </td>
        </tr>
      ) : (
        paginated.map((req, idx) => {
          const normalizedKey = req.divisional_secretariat.trim().toLowerCase();
          const dsContact = dsContacts[normalizedKey] || "N/A";
          const combinedDS = `${req.divisional_secretariat} - ${dsContact}`;

          return (
            <tr key={req.aid_id}>
              <td className="px-6 py-4">
                {(page - 1) * rowsPerPage + idx + 1}
              </td>
              <td className="px-6 py-4 font-semibold text-blue-700">
                {req.full_name}
              </td>
              <td className="px-6 py-4">
                {req.contact_no || "N/A"}
              </td>
              <td className="px-6 py-4">
                {req.type_support || req.request_type}
              </td>
              <td className="px-6 py-4">{req.district}</td>
              <td className="px-6 py-4">{combinedDS}</td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>



    <div className="px-6 py-4 bg-gray-50 border-t">
      <div className="flex justify-center space-x-1">
        {Array.from({ length: Math.ceil(filtered.length / rowsPerPage) }, (_, i) => (
          <button
            key={i}
            className={`px-4 py-2 border text-sm rounded-md ${
              page === i + 1
                ? "bg-blue-600 text-white"
                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  </div>
</section>


      {/* Enhanced Footer */}
      <footer className="bg-gray-900 mt-8">
        <div className="max-w-7xl mx-auto py-10 px-4 flex flex-col items-center">
          {/* <img src="hazardx-logo.png" alt="HazardX Logo" className="h-12 w-auto mb-4" /> */}
          <h2 className="text-2xl font-bold text-white mb-2">HazardX Disaster Management</h2>
          <p className="text-gray-300 text-center max-w-2xl mb-6">
            HazardX is a comprehensive disaster management platform that empowers communities with real-time alerts, rapid response coordination, and transparent aid distribution. Our mission is to help you prepare for, respond to, and recover from disasters efficiently and collaboratively.
          </p>
          <div className="flex space-x-4 mb-2">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-2xl">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-2xl">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-2xl">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="mailto:info@hazardx.com" className="text-gray-300 hover:text-white text-2xl">
              <i className="fas fa-envelope"></i>
            </a>
          </div>
          <p className="text-gray-500 mt-4 text-sm">© 2025 HazardX Team. Empowering Disaster Management.</p>
        </div>
      </footer>
    </div>
  );
}