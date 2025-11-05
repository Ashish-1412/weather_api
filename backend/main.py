from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timedelta

app = FastAPI()

# --- Enable CORS for frontend connection ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "661c4647a6b7e8d78154954b07cba61f"
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
GEOCODE_URL = "http://api.openweathermap.org/geo/1.0/reverse"


@app.get("/weather")
def get_weather(
    city: str = Query(None, description="City name"),
    lat: float = Query(None, description="Latitude"),
    lon: float = Query(None, description="Longitude")
):
    try:
        # Reverse geocoding if lat/lon provided
        if lat is not None and lon is not None:
            geo_res = requests.get(GEOCODE_URL, params={"lat": lat, "lon": lon, "limit": 1, "appid": API_KEY})
            geo_data = geo_res.json()
            if geo_data:
                city = geo_data[0]["name"]

        if not city:
            return {"error": "City or coordinates required"}

        # Fetch current weather
        weather_response = requests.get(BASE_URL, params={"q": city, "appid": API_KEY, "units": "metric"})
        weather_data = weather_response.json()
        if weather_response.status_code != 200:
            return {"error": weather_data.get("message", "City not found")}

        # Extract info
        lat = weather_data["coord"]["lat"]
        lon = weather_data["coord"]["lon"]
        temp = weather_data["main"]["temp"]
        humidity = weather_data["main"]["humidity"]
        condition = weather_data["weather"][0]["main"]
        country = weather_data["sys"]["country"]
        sunrise = weather_data["sys"]["sunrise"] * 1000
        sunset = weather_data["sys"]["sunset"] * 1000
        localtime = weather_data["dt"] * 1000

        # Fetch 12-hour forecast
        forecast_response = requests.get(
            FORECAST_URL,
            params={"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}
        )
        forecast_data = forecast_response.json()
        hours = []
        for item in forecast_data["list"][:4]:  # next 12 hours = 4x3hr
            time_obj = datetime.utcfromtimestamp(item["dt"]) + timedelta(hours=5, minutes=30)
            hours.append({
                "time": time_obj.strftime("%I:%M %p"),
                "temp": round(item["main"]["temp"], 1)
            })

        return {
            "city": weather_data["name"],
            "country": country,
            "temperature": round(temp, 1),
            "humidity": humidity,
            "condition": condition,
            "lat": lat,
            "lon": lon,
            "sunrise": sunrise,
            "sunset": sunset,
            "localtime": localtime,
            "hours": hours
        }

    except Exception as e:
        return {"error": str(e)}
