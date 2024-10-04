import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useSpring, animated } from 'react-spring';
import { useMediaQuery } from 'react-responsive';
import { MapContainer, TileLayer, Polyline, Popup, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Custom marker component for route start/end points
function MarkerIcon({ position, color, label }) {
  // Memoize icon creation to avoid recreating on every render
  const icon = useMemo(() => L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">${label}</div>`
  }), [color, label]);

  return <Marker position={position} icon={icon} />;
}

// API call to convert coordinates to address (reverse geocoding)
async function fetchAddressFromCoords(lat, lng) {
  const options = {
    method: 'GET',
    url: 'https://trueway-geocoding.p.rapidapi.com/ReverseGeocode',
    params: { 
      location: `${lat},${lng}`,
      language: 'en'
    },
    headers: {
      'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'trueway-geocoding.p.rapidapi.com'
    }
  };

  const response = await axios.request(options);
  return response.data.results[0];
}

// API call to convert address to coordinates
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

// API call to get driving directions between two points
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

// Component to render individual route on map
function Route({ route, color }) {
  const map = useMap();
  
  // Extract coordinates and calculate map positioning
  const coordinates = route.directions.route.geometry.coordinates;
  const startCoord = coordinates[0];
  const endCoord = coordinates[coordinates.length - 1];

  // Center map on route start point
  useEffect(() => {
    map.flyTo([startCoord[0], startCoord[1]], 10);
  }, [map, startCoord]);

  return (
    <>
      {/* Main route polyline */}
      <Polyline positions={coordinates.map(coord => [coord[0], coord[1]])} color={color}>
        <Popup>Route</Popup>
      </Polyline>
      {/* Start and end markers */}
      <MarkerIcon position={[startCoord[0], startCoord[1]]} color={color} label="S" />
      <MarkerIcon position={[endCoord[0], endCoord[1]]} color={color} label="E" />
    </>
  );
}

function App() {
  // Form input states
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  
  // Application states
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isAddressBarMinimized, setIsAddressBarMinimized] = useState(false);
  
  // Route colors for visual distinction
  const colors = useMemo(() => ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'], []);
  
  // Responsive design detection
  const isDesktopOrLaptop = useMediaQuery({
    query: '(min-device-width: 768px)'
  });

  // Animation configuration for UI transitions
  const animationProps = useSpring({
    opacity: directions ? 1 : 0,
    transform: directions ? 'translateY(0)' : 'translateY(-100%)',
    delay: 300
  });

  // Get user's current location and convert to address
  const getCurrentLocation = useCallback(async () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocationLoading(true);
    setError(null);

    // Use Promise wrapper for geolocation API
    const getCurrentPosition = () => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 300000 // 5 minutes cache
          }
        );
      });
    };

    try {
      // Get current coordinates
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      // Convert coordinates to address
      const addressData = await fetchAddressFromCoords(latitude, longitude);
      
      if (addressData && addressData.address) {
        setStartAddress(addressData.address);
      } else {
        throw new Error('Unable to determine address from location');
      }

    } catch (error) {
      console.error('Location error:', error);
      
      // Handle different types of location errors
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          setError('Location access denied. Please enable location services and try again.');
          break;
        case 2: // POSITION_UNAVAILABLE
          setError('Location information unavailable. Please try again.');
          break;
        case 3: // TIMEOUT
          setError('Location request timed out. Please try again.');
          break;
        default:
          setError('Failed to get current location. Please enter address manually.');
      }
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // Handle Enter key press for form submission
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  }, []);

  // Handle Enter key press for form submission
  const handleClick = useCallback(async () => {
    // Validation
    if (!startAddress.trim() || !endAddress.trim()) {
      setError('Please enter both start and end addresses.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Convert addresses to coordinates
      const [startLocation, endLocation] = await Promise.all([
        fetchLocation(startAddress),
        fetchLocation(endAddress)
      ]);

      // Validate geocoding results
      if (!startLocation || !endLocation) {
        setError('Unable to find one or both addresses. Please check and try again.');
        return;
      }

      // Step 2: Get driving directions
      const directionsData = await fetchDirections(startLocation, endLocation);

      // Step 3: Process route data
      const totalDistance = directionsData.route.legs.reduce((acc, leg) => acc + leg.distance, 0);
      const legDistances = directionsData.route.legs.map(leg => leg.distance);

      // Step 4: Update application state
      setDirections(directionsData);
      
      // Add new route to existing routes
      setRoutes(prevRoutes => [...prevRoutes, {
        startAddress,
        endAddress,
        directions: directionsData,
        totalDistance,
        legDistances
      }]);

    } catch (error) {
      console.error('Route calculation error:', error);
      setError('An error occurred while fetching directions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [startAddress, endAddress]);

  // Handle route removal from the list
  const handleRouteRemove = useCallback((index) => {
    setRoutes(prevRoutes => prevRoutes.filter((_, i) => i !== index));
  }, []);

  // Utility function for distance conversion
  const metersToMiles = useCallback((meters) => {
    return meters * 0.000621371;
  }, []);

  // Handle input changes with debouncing effect
  const handleStartAddressChange = useCallback((e) => {
    setStartAddress(e.target.value);
  }, []);

  const handleEndAddressChange = useCallback((e) => {
    setEndAddress(e.target.value);
  }, []);

  return (
    <div className={`App ${isDesktopOrLaptop ? 'desktop' : 'mobile'}`}>
      {/* Control Panel */}
      <div className={`address-bar ${isAddressBarMinimized ? 'minimized' : ''}`}>
        <div className='address-title'>
          <p />Shortest Drive
          <button
            className="minimize-button"
            onClick={() => setIsAddressBarMinimized(!isAddressBarMinimized)}
            aria-label={isAddressBarMinimized ? 'Expand controls' : 'Minimize controls'}
          >
            <div className='minimize-button-arrows'>{isAddressBarMinimized ? '▶' : '◀'}</div>
          </button>
        </div>
        
        {!isAddressBarMinimized && (
          <>
            {/* Address Input Section */}
            <div className="input-container">
              <div className="input-with-button">
                <input
                  type="text"
                  placeholder="Enter start address"
                  value={startAddress}
                  onChange={handleStartAddressChange}
                  className="input-field"
                  aria-label="Start address"
                />
                <button
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading}
                  className="location-button"
                  title="Use current location"
                  aria-label="Get current location"
                >
                  {isLocationLoading ? '⏳' : '📍'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter end address"
                value={endAddress}
                onChange={handleEndAddressChange}
                onKeyPress={handleKeyPress}
                className="input-field"
                aria-label="End address"
              />
            </div>
            <button 
              onClick={handleClick} 
              className="directions-button" 
              disabled={isLoading || isLocationLoading || !startAddress.trim() || !endAddress.trim()}
            >
              {isLoading ? 'Calculating Route...' : 'Get Directions'}
            </button>
            
            {/* Route Management Section */}
            <div className="route-bubbles">
              {routes.map((route, index) => (
                <div key={`route-${index}`} className="route-bubble">
                  <div className="route-bubble-header">
                    <div
                      className="route-color-indicator"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <div className="route-info">
                      <div className="route-bubble-line">
                        Start: <span className="uppercase-text">{route.startAddress}</span>
                      </div>
                      <div className="route-bubble-line">
                        End: <span className="uppercase-text">{route.endAddress}</span>
                      </div>
                    </div>
                  </div>
                  {/* Display distance for each route leg */}
                  {route.legDistances.map((distance, legIndex) => (
                    <div className="route-bubble-line" key={`leg-${legIndex}`}>
                      Distance: {metersToMiles(distance).toFixed(2)} Miles
                    </div>
                  ))}
                  <button 
                    className="route-bubble-button" 
                    onClick={() => handleRouteRemove(index)}
                  >
                    Remove Route
                  </button>
                </div>
              ))}
            </div>
            
            {/* Footer Link */}
            <div className="made-by">
              <a href="https://github.com/CeponisM/react-gps" target="_blank" rel="noopener noreferrer">
                Source Code
              </a>
            </div>
          </>
        )}
      </div>
      
      {/* Main Map Content */}
      <div className='main-content'>
        {/* Error Display */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Interactive Map */}
        <div className="map-container">
          <MapContainer 
            style={{ height: "100%", width: "100%" }} 
            center={[39.8283, -98.5795]} 
            zoom={4}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Render all calculated routes */}
            {routes.map((route, index) => (
              <Route 
                key={`map-route-${index}`} 
                route={route} 
                color={colors[index % colors.length]} 
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
