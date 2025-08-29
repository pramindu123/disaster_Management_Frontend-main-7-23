import React, { useRef, useState } from "react";
import districtDivisionalSecretariats from "../data/districtDivisionalSecretariats";
import { API_BASE_URL } from "../api";
import { 
  getDivisionalSecretariatCoordinates, 
  getDistrictCoordinates, 
  districtCoordinates, 
  divisionalSecretariatCoordinates 
} from "../data/coordinates";

export default function SubmitSymptoms() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [image, setImage] = useState<string>(""); // ✅ Base64 string
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [reporter_name, setFullName] = useState("");
  const [contact_no, setContactNo] = useState("");
  const [nic_number, setNicNumber] = useState("");
  const [district, setSelectedDistrict] = useState<string>("");
  const [divisional_secretariat, setSelectedDivisionalSecretariat] = useState<string>("");
  const [date_time, setDateTime] = useState("");
  const [description, setSymptoms] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>("");
  const [isLocationAutoDetected, setIsLocationAutoDetected] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [errors, setErrors] = useState({
    reporter_name: "",
    contact_no: "",
    description: ""
  });

  const validatePhoneNumber = (phone: string) => {
    const regex = /^\d{10}$/;
    return !regex.test(phone) ? "Phone number must be exactly 10 digits" : "";
  };

  // Find closest district and DS using coordinates.ts data
  const getLocationFromCoordinates = (latitude: number, longitude: number) => {
    function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
      return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
    }

    let closestDS: string | undefined = undefined;
    let minDSDist = Infinity;
    let closestDistrict: string | undefined = undefined;
    let minDistrictDist = Infinity;

    for (const [dsName, coords] of Object.entries(divisionalSecretariatCoordinates)) {
      const dist = getDistance(latitude, longitude, coords.lat, coords.lng);
      if (dist < minDSDist) {
        minDSDist = dist;
        closestDS = dsName;
      }
    }

    for (const [districtName, coords] of Object.entries(districtCoordinates)) {
      const dist = getDistance(latitude, longitude, coords.lat, coords.lng);
      if (dist < minDistrictDist) {
        minDistrictDist = dist;
        closestDistrict = districtName;
      }
    }

    let finalDistrict = closestDistrict;
    if (closestDS && closestDistrict && districtDivisionalSecretariats[closestDistrict]?.includes(closestDS)) {
      finalDistrict = closestDistrict;
    } else if (closestDS) {
      for (const [districtName, dsList] of Object.entries(districtDivisionalSecretariats)) {
        if (dsList.includes(closestDS)) {
          finalDistrict = districtName;
          break;
        }
      }
    }

    return { district: finalDistrict || "Colombo", divisionalSecretariat: closestDS || "Colombo" };
  };

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = getLocationFromCoordinates(latitude, longitude);
        setSelectedDistrict(loc.district);
        setSelectedDivisionalSecretariat(loc.divisionalSecretariat);
        setIsLocationAutoDetected(true);
        setLatitude(latitude);
        setLongitude(longitude);
        setIsLoadingLocation(false);
      },
      () => {
        setLocationError("Unable to retrieve location");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validateForm = () => {
    const newErrors: any = {};
    if (!reporter_name.trim()) {
      newErrors.reporter_name = "Full name is required";
    }
    const phoneError = validatePhoneNumber(contact_no);
    if (phoneError) newErrors.contact_no = phoneError;
    if (!description.trim()) {
      newErrors.description = "Symptoms description is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64); // ✅ for backend
        setPreviewUrl(base64); // for preview
      };
      reader.readAsDataURL(file);
      setFileName(file.name);
    } else {
      setFileName("");
      setImage("");
      setPreviewUrl("");
    }
  };

  const handleRemoveFile = () => {
    setFileName("");
    setImage("");
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClear = () => {
    formRef.current?.reset();
    setFileName("");
    setImage("");
    setPreviewUrl("");
    setFullName("");
    setNicNumber("");
    setContactNo("");
    setSelectedDistrict("");
    setSelectedDivisionalSecretariat("");
    setDateTime("");
    setSymptoms("");
    setErrors({ reporter_name: "", contact_no: "", description: "" });
    setLatitude(null);
    setLongitude(null);
    setLocationError("");
    setIsLocationAutoDetected(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    let lat = latitude;
    let lng = longitude;

    if (!lat || !lng) {
      const dsCoords = getDivisionalSecretariatCoordinates(divisional_secretariat);
      const districtCoords = getDistrictCoordinates(district);

      if (dsCoords) {
        lat = dsCoords.lat;
        lng = dsCoords.lng;
      } else if (districtCoords) {
        lat = districtCoords.lat;
        lng = districtCoords.lng;
      } else {
        alert("Could not find coordinates for the selected district/DS.");
        return;
      }
    }

    const reportData = {
      reporter_name,
      nic_number,
      contact_no,
      district,
      divisional_secretariat,
      date_time: date_time,
      description,
      image, // ✅ base64 image
      action: "Pending",
      latitude: lat,
      longitude: lng
    };

    try {
      const response = await fetch(`${API_BASE_URL}/Symptoms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      });
      if (!response.ok) throw new Error(await response.text());
      setShowSuccess(true);
      handleClear();
    } catch (error) {
      console.error(error);
      alert("Failed to submit. Try again.");
    }
  };

  const districts = Object.keys(districtDivisionalSecretariats);
  const divisionalSecretariats = district ? districtDivisionalSecretariats[district] : [];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 px-4 md:px-12 font-sans flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto p-0 md:p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 transition-all duration-300">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">Submit Symptoms</h1>
          {/* Location Detection info box removed as requested */}
          <form ref={formRef} className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            {/* Full Name */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">Full Name</label>
              <div className="w-full flex flex-col">
                <input
                  type="text"
                  required
                  value={reporter_name}
                  placeholder="Enter your full name"
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.reporter_name) setErrors(prev => ({ ...prev, reporter_name: "" }));
                  }}
                  onBlur={() => {
                    if (!reporter_name.trim()) {
                      setErrors(prev => ({ ...prev, reporter_name: "Full name is required" }));
                    } else if (!/^[A-Za-z\s]+$/.test(reporter_name.trim())) {
                      setErrors(prev => ({ ...prev, reporter_name: "Name can only contain letters and spaces" }));
                    }
                  }}
                  className={`w-full bg-gray-100 rounded-lg h-10 px-4 text-base md:text-lg focus:outline-none md:ml-2 border ${
                    errors.reporter_name ? "border-red-500" : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition`}
                />
                {errors.reporter_name && (
                  <p className="text-red-500 text-sm mt-1 ml-2">{errors.reporter_name}</p>
                )}
              </div>
            </div>

            
            <div className="border-t border-gray-200" />

{/* NIC Number */}
<div className="flex flex-col gap-1 md:flex-row md:items-center">
  <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">NIC Number</label>
  <div className="w-full flex flex-col">
    <input
      type="text"
      required
      placeholder="Enter NIC number"
      value={nic_number}
      onChange={(e) => setNicNumber(e.target.value)}
      className="w-full bg-gray-100 rounded-lg h-10 px-4 text-base md:text-lg focus:outline-none md:ml-2 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
    />
  </div>
</div>
<div className="border-t border-gray-200" />

            {/* Contact No */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">Contact No</label>
              <div className="w-full flex flex-col">
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit phone number"
                  value={contact_no}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 10) {
                      setContactNo(value);
                      if (errors.contact_no) {
                        setErrors(prev => ({ ...prev, contact_no: "" }));
                      }
                    }
                  }}
                  onBlur={() => {
                    const error = validatePhoneNumber(contact_no);
                    setErrors(prev => ({ ...prev, contact_no: error }));
                  }}
                  maxLength={10}
                  className={`w-full bg-gray-100 rounded-lg h-10 px-4 text-base md:text-lg focus:outline-none md:ml-2 border ${
                    errors.contact_no ? "border-red-500" : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition`}
                />
                {errors.contact_no && (
                  <p className="text-red-500 text-sm mt-1 ml-2">{errors.contact_no}</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* District */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">District</label>
              <div className="w-full flex flex-col md:ml-2">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <select
                    required
                    value={district}
                    onChange={e => {
                      setSelectedDistrict(e.target.value);
                      setSelectedDivisionalSecretariat("");
                      setIsLocationAutoDetected(false); // Reset auto-detected flag when manually changed
                    }}
                    className="flex-1 bg-gray-100 rounded-lg h-10 px-4 text-base md:text-lg focus:outline-none border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  >
                    <option value="">Select District</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center gap-2 ${
                      isLoadingLocation
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700 shadow"
                    }`}
                  >
                    {isLoadingLocation ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Getting GPS...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Current Location
                      </>
                    )}
                  </button>
                </div>
                {locationError && (
                  <p className="text-red-500 text-sm mt-1">{locationError}</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Divisional Secretariat */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">Divisional Secretariat</label>
              <div className="w-full flex flex-col md:ml-2">
                <select
                  required
                  value={divisional_secretariat}
                  onChange={e => {
                    setSelectedDivisionalSecretariat(e.target.value);
                    setIsLocationAutoDetected(false); // Reset auto-detected flag when manually changed
                  }}
                  className="w-full bg-gray-100 rounded-lg h-10 px-4 text-base md:text-lg focus:outline-none border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  disabled={!district}
                >
                  <option value="">Select Divisional Secretariat</option>
                  {divisionalSecretariats.map((ds: string) => (
                    <option key={ds} value={ds}>{ds}</option>
                  ))}
                </select>
                {district && divisional_secretariat && (
                  <div className="mt-2">
                    {isLocationAutoDetected ? (
                      <p className="text-green-600 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location auto-detected: {district}, {divisional_secretariat}
                      </p>
                    ) : (
                      <p className="text-blue-600 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Location manually selected: {district}, {divisional_secretariat}
                      </p>
                    )}
                    {isLocationAutoDetected && (
                      <p className="text-gray-500 text-xs mt-1 ml-5">
                        You can change the selections above if the auto-detected location is incorrect.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Date & Time */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">Date and Time</label>
              <input
                type="datetime-local"
                required
                value={date_time}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-gray-100 rounded-lg h-10 px-4 text-base md:text-lg focus:outline-none md:ml-2 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>

            <div className="border-t border-gray-200" />

            {/* Symptoms */}
            <div className="flex flex-col gap-1 md:flex-row md:items-start">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44 md:mt-2">Symptoms</label>
              <div className="w-full flex flex-col">
                <textarea
                  required
                  placeholder="Describe your symptoms"
                  value={description}
                  onChange={(e) => {
                    setSymptoms(e.target.value);
                    if (errors.description) setErrors(prev => ({ ...prev, description: "" }));
                  }}
                  onBlur={() => {
                    if (!description.trim()) {
                      setErrors(prev => ({ ...prev, description: "Symptoms description is required" }));
                    } else if (description.trim().length < 10) {
                      setErrors(prev => ({ ...prev, description: "Symptoms should be at least 10 characters long" }));
                    }
                  }}
                  className={`w-full bg-gray-100 rounded-lg h-24 md:h-28 px-4 py-2 text-base md:text-lg focus:outline-none md:ml-2 resize-none border ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1 ml-2">{errors.description}</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200" />

             {/* Upload Image (with camera capture) */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              <label className="block font-semibold text-base md:text-lg mb-1 md:w-44">Upload / Capture Image</label>
              <div className="w-full flex flex-col md:flex-row md:items-center md:ml-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"   // ✅ opens camera directly on mobile
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <label className="w-full">
                  <div
                    className="flex items-center justify-center bg-blue-600 text-white font-semibold rounded-lg h-14 px-6 cursor-pointer shadow hover:bg-blue-700 transition-all duration-150"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg className="w-7 h-7 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    <span>Take Photo</span>
                  </div>
                </label>
                {fileName && (
                  <div className="flex items-center space-x-2 mt-2 md:mt-0">
                    {image ? (
                      <img src={image} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                    ) : (
                      <span className="text-green-700 font-semibold">File uploaded</span>
                    )}
                    <button type="button" onClick={handleRemoveFile} className="ml-1 text-gray-400 hover:text-red-600 text-2xl font-bold focus:outline-none" title="Remove file">&times;</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-2">
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-xl px-10 py-2 text-xl md:text-2xl font-bold shadow hover:bg-blue-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Submit
              </button>
            </div>
          </form>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity animate-fadeIn"></div>
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl px-10 py-8 flex flex-col items-center animate-fadeIn">
                <div className="text-green-600 text-3xl mb-4 font-bold">✔</div>
                <div className="text-2xl font-semibold mb-4">Symptoms submitted successfully!</div>
                <button className="mt-2 px-8 py-2 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition" onClick={() => setShowSuccess(false)}>OK</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}