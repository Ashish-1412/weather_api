import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Particles from "react-tsparticles";
import Lottie from "react-lottie-player";

// Weather Lottie Animations
const weatherAnimations = {
  clear: "https://lottie.host/97fa4d58-9b9b-4238-b3cb-4b2f87d6abf8/otBBP7qqRc.json",
  clouds: "https://lottie.host/5b6d0b0f-c2da-45fa-b6e4-c0a5c9bcd730/IoI2LvbU8X.json",
  rain: "https://lottie.host/9e285b4a-5fd3-4a43-83da-82081c4dfcf2/CV4DJNWxKc.json",
  thunderstorm: "https://lottie.host/bcf3b4f1-5d26-45c9-b7f0-f0e0734f68dc/uz1aYhcsEZ.json",
  snow: "https://lottie.host/03d13ef9-2cb9-49a4-87a1-d5db2adf4e6e/l7EOJgm3Nc.json",
  mist: "https://lottie.host/90a04029-dcb3-4bbd-bdd2-2f42b0d5f704/FFX2BoPwbV.json",
};

// Weather ambient sounds
const weatherSounds = {
  clear: "/sounds/birds.mp3",
  clouds: "/sounds/wind.mp3",
  rain: "/sounds/rain.mp3",
  thunderstorm: "/sounds/thunder.mp3",
  snow: "/sounds/snow.mp3",
  mist: "/sounds/calm.mp3",
};

const Weather = () => {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [time, setTime] = useState(new Date());
  const [bgPhase, setBgPhase] = useState("day");
  const audioRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather by coordinates or fallback
  useEffect(() => {
    const fetchWeatherByCoords = async (lat, lon) => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/weather?lat=${lat}&lon=${lon}`);
        setWeather(res.data);
        setCity(res.data.city);
        setError("");
      } catch {
        setError("Failed to fetch location. Showing default city.");
        fetchWeatherByCity("New York");
      }
    };

    const fetchWeatherByCity = async (cityName) => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/weather?city=${cityName}`);
        setWeather(res.data);
        setCity(res.data.city);
        setError("");
      } catch {
        setError("Failed to fetch weather.");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeatherByCity("New York")
      );
    } else fetchWeatherByCity("New York");
  }, []);

  const fetchWeather = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/weather?city=${city}`);
      setWeather(res.data);
      setError("");
    } catch {
      setWeather(null);
      setError("City not found or server error");
    }
  };

  const getWeatherKey = (condition) => {
    if (!condition) return "clear";
    const key = condition.toLowerCase();
    if (key.includes("rain")) return "rain";
    if (key.includes("thunder")) return "thunderstorm";
    if (key.includes("snow")) return "snow";
    if (key.includes("mist") || key.includes("fog")) return "mist";
    if (key.includes("cloud")) return "clouds";
    return "clear";
  };

  // Play ambient sound for 15 seconds
useEffect(() => {
  if (weather && soundEnabled) {
    const key = getWeatherKey(weather.condition);
    const sound = weatherSounds[key];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    audioRef.current = new Audio(sound);
    audioRef.current.volume = 0.4;
    audioRef.current.play().catch(() => {});

    // Stop sound after 20 seconds
    const timer = setTimeout(() => {
      if (audioRef.current) audioRef.current.pause();
    }, 20000);

    // Cleanup on unmount or change
    return () => {
      clearTimeout(timer);
      if (audioRef.current) audioRef.current.pause();
    };
  } else if (!soundEnabled && audioRef.current) {
    audioRef.current.pause();
  }
}, [weather, soundEnabled]);


  // Background phase based on time
  useEffect(() => {
    if (!weather) return;
    const hour = time.getHours();
    const sunrise = new Date(weather.sunrise).getHours();
    const sunset = new Date(weather.sunset).getHours();
    if (hour >= sunrise && hour < sunrise + 1) setBgPhase("sunrise");
    else if (hour >= sunrise + 1 && hour < sunset) setBgPhase("day");
    else if (hour >= sunset && hour < sunset + 1) setBgPhase("sunset");
    else setBgPhase("night");
  }, [time, weather]);

  const bgGradients = {
    day: "from-sky-300 via-blue-400 to-indigo-500",
    sunrise: "from-orange-300 via-pink-400 to-purple-500",
    sunset: "from-red-400 via-orange-500 to-purple-700",
    night: "from-gray-900 via-slate-800 to-black",
  };

  const getMapTile = () => {
    return bgPhase === "day" || bgPhase === "sunrise"
      ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      : "https://tiles.stadiamaps.com/tiles/alidade_dark/{z}/{x}/{y}{r}.png";
  };

  const dayName = time.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center text-white transition-all duration-1000 bg-gradient-to-b ${bgGradients[bgPhase]}`}>
      {/* Particle overlay */}
      {weather && ["rain", "snow", "mist"].includes(getWeatherKey(weather.condition)) && (
        <Particles options={{
          particles: {
            number: { value: getWeatherKey(weather.condition) === "rain" ? 200 : 100 },
            move: { speed: getWeatherKey(weather.condition) === "rain" ? 8 : 2 },
            shape: { type: "circle" },
            size: { value: getWeatherKey(weather.condition) === "rain" ? 2 : 3 },
            opacity: { value: 0.5 },
            color: { value: "#fff" },
            direction: "bottom",
          },
        }} className="absolute inset-0" />
      )}

      {/* Theme toggle */}
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="absolute top-5 right-5 px-4 py-2 rounded-full bg-white/30 backdrop-blur-md text-black hover:bg-white/50 shadow-lg transition">
        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>

      {/* Sound toggle */}
      <button onClick={() => setSoundEnabled(!soundEnabled)} className="absolute top-5 left-5 px-4 py-2 rounded-full bg-white/30 backdrop-blur-md text-black hover:bg-white/50 shadow-lg transition">
        {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
      </button>

      <div className="relative z-10 w-full max-w-2xl bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-6 drop-shadow-md">🌎 Live Weather Dashboard</h1>

        {/* Date & Day */}
        <div className="text-center mb-4 text-lg font-semibold">
          <p>{dayName}</p>
          <p>{time.toLocaleDateString()}</p>
          <p>{time.toLocaleTimeString()}</p>
        </div>

        {/* City Input */}
        <div className="flex justify-center mb-4">
          <input type="text" value={city} placeholder="Enter city name" onChange={(e) => setCity(e.target.value)} className="p-2 rounded-l-md w-2/3 text-gray-800" />
          <button onClick={fetchWeather} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md">Get Weather</button>
        </div>

        {error && <p className="text-red-200 text-center">{error}</p>}

        {weather && (
          <div className="text-center">
            {/* Lottie Weather Animation */}
            <div className="flex justify-center mb-2">
              <Lottie loop play src={weatherAnimations[getWeatherKey(weather.condition)]} style={{ width: 180, height: 180 }} />
            </div>

            <h2 className="text-3xl font-semibold mb-2">{weather.city}, {weather.country}</h2>
            <p className="text-2xl">🌡 {weather.temperature}°C</p>
            <p className="text-lg">💧 Humidity: {weather.humidity}%</p>
            <p className="capitalize text-xl mt-1">{weather.condition}</p>

            {/* Forecast chart */}
            <div className="mt-6">
              <h3 className="text-lg mb-2">Next 12 hours forecast</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weather.hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="time" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip />
                  <Line type="monotone" dataKey="temp" stroke="#facc15" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Map */}
            {weather.lat && weather.lon && (
              <div className="mt-8 h-72 rounded-xl overflow-hidden shadow-lg border border-white/20 relative">
                <MapContainer center={[weather.lat, weather.lon]} zoom={11} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url={getMapTile()} attribution="&copy; OpenStreetMap contributors" />
                  <Marker position={[weather.lat, weather.lon]}>
                    <Popup>{weather.city}, {weather.country}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;
