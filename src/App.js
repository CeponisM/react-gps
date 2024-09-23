import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSpring, animated } from 'react-spring';
import { useMediaQuery } from 'react-responsive';
import { MapContainer, TileLayer, Polyline, Popup, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Importing Leaflet's CSS
import './App.css'; // Importing CSS

function MarkerIcon({ position, color, label }) {
  const icon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">${label}</div>`
  });

  return <Marker position={position} icon={icon} />;
}

async function fetchLocation(address) {
  const options = {
    method: 'GET',
    url: 'https://trueway-geocoding.p.rapidapi.com/Geocode',
    params: { address },
    headers: {
      'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'trueway-geocoding.p.rapidapi.com'
    }
  };

  const response = await axios.request(options);
  return response.data.results[0].location;
}

async function fetchDirections(startLocation, endLocation) {
  const options = {
    method: 'GET',
    url: 'https://trueway-directions2.p.rapidapi.com/FindDrivingRoute',
    params: {
      stops: `${startLocation.lat},${startLocation.lng};${endLocation.lat},${endLocation.lng}`
    },
    headers: {
      'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'trueway-directions2.p.rapidapi.com'
    }
  };

  const response = await axios.request(options);
  return response.data;
}

function Route({ route, color }) {
  const map = useMap();
  const coordinates = route.directions.route.geometry.coordinates;
  const startCoord = coordinates[0];
  const endCoord = coordinates[coordinates.length - 1];

  map.flyTo([startCoord[0], startCoord[1]], 10);

  return (
    <>
      <Polyline positions={coordinates.map(coord => [coord[0], coord[1]])} color={color}>
        <Popup>Route</Popup>
      </Polyline>
      <MarkerIcon position={[startCoord[0], startCoord[1]]} color={color} label="S" />
      <MarkerIcon position={[endCoord[0], endCoord[1]]} color={color} label="E" />
    </>
  );
}

function App() {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const [legDistances, setLegDistances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddressBarMinimized, setIsAddressBarMinimized] = useState(false);

  const isDesktopOrLaptop = useMediaQuery({
    query: '(min-device-width: 768px)'
  });

  const animationProps = useSpring({
    opacity: directions ? 1 : 0,
    transform: directions ? 'translateY(0)' : 'translateY(-100%)',
    delay: 300
  });

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const startLocation = await fetchLocation(startAddress);
      const endLocation = await fetchLocation(endAddress);
      const directionsData = await fetchDirections(startLocation, endLocation);

      if (!startLocation || !endLocation) {
        setError('Unable to find one or both addresses. Please check and try again.');
        return;
      }

      // Calculate total distance and distances for each leg
      const totalDistance = directionsData.route.legs.reduce((acc, leg) => acc + leg.distance, 0);
      const legDistances = directionsData.route.legs.map(leg => leg.distance);

      setDirections(directionsData);
      setError(null);

      setRoutes(prevRoutes => [...prevRoutes, {
        startAddress,
        endAddress,
        directions: directionsData,
        totalDistance,
        legDistances
      }]);
    } catch (error) {
      console.error(error);
      setError('An error occurred while fetching directions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteRemove = (index) => {
    setRoutes(prevRoutes => prevRoutes.filter((route, i) => i !== index));
  };

  function metersToMiles(meters) {
    return meters * 0.000621371;
  }

  return (
    <div className={`App ${isDesktopOrLaptop ? 'desktop' : 'mobile'}`}>
      <div className={`address-bar ${isAddressBarMinimized ? 'minimized' : ''}`}>
        <div className='address-title'>
          <p />Shortest Drive
          <button
            className="minimize-button"
            onClick={() => setIsAddressBarMinimized(!isAddressBarMinimized)}
          >
            <div className='minimize-button-arrows'>{isAddressBarMinimized ? '▶' : '◀'}</div>
          </button>
        </div>
        {!isAddressBarMinimized && (
          <>
            <input
              type="text"
              placeholder="Enter start address"
              onChange={e => setStartAddress(e.target.value)}
              className="input-field"
              aria-label="Start address"
            />
            <input
              type="text"
              placeholder="Enter end address"
              onChange={e => setEndAddress(e.target.value)}
              className="input-field"
              aria-label="End address"
            />
            <button onClick={handleClick} className="directions-button" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Get Directions'}
            </button>
            <p></p>
            <div className="route-bubbles">
              {routes.map((route, index) => (
                <div key={index} className="route-bubble">
                  <div className="route-bubble-header">
                    <div
                      className="route-color-indicator"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <div className="route-info">
                      <div className="route-bubble-line">Start: <span className="uppercase-text"> {route.startAddress}</span></div>
                      <div className="route-bubble-line">End: <span className="uppercase-text"> {route.endAddress}</span></div>
                    </div>
                  </div>
                  {route.legDistances.map((distance, legIndex) => (
                    <div className="route-bubble-line" key={legIndex}>Distance: {metersToMiles(distance).toFixed(2)} Miles</div>
                  ))}
                  <button className="route-bubble-button" onClick={() => handleRouteRemove(index)}>Remove Route</button>
                </div>
              ))}
            </div>
            <div className="made-by">
              <a href="https://github.com/CeponisM/react-gps" target="_blank" rel="noopener noreferrer">
                Source Code
              </a>
            </div>
          </>
        )}
      </div>
      <div className='main-content'>
        {error && <p>{error}</p>}
        <div className="map-container">
          <MapContainer style={{ height: "100%", width: "100%" }} center={[39.8283, -98.5795]} zoom={4}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {routes.map((route, index) => (
              <Route key={index} route={route} color={colors[index % colors.length]} />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;