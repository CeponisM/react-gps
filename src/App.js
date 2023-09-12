import React, { useState } from 'react';
import axios from 'axios';
import { useSpring, animated } from 'react-spring';
import { useMediaQuery } from 'react-responsive';
import { MapContainer, TileLayer, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Importing Leaflet's CSS
import './App.css'; // Importing CSS

async function fetchLocation(address) {
  const options = {
    method: 'GET',
    url: 'https://trueway-geocoding.p.rapidapi.com/Geocode',
    params: { address },
    headers: {
      'X-RapidAPI-Key': '0026bcf8a1mshb924ad6fbaa031fp15ce2cjsn87ce6d3e6066',
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
      'X-RapidAPI-Key': '0026bcf8a1mshb924ad6fbaa031fp15ce2cjsn87ce6d3e6066',
      'X-RapidAPI-Host': 'trueway-directions2.p.rapidapi.com'
    }
  };

  const response = await axios.request(options);
  return response.data;
}

function Route({ route, color }) {
  const map = useMap();

  const startCoord = route.directions.route.geometry.coordinates[0];

  map.flyTo([startCoord[0], startCoord[1]]);

  return (
    <Polyline positions={route.directions.route.geometry.coordinates.map(coord => [coord[0], coord[1]])} color={color}>
      <Popup>Route</Popup>
    </Polyline>
  );
}

function App() {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];


  const isDesktopOrLaptop = useMediaQuery({
    query: '(min-device-width: 1224px)'
  });

  const animationProps = useSpring({
    opacity: directions ? 1 : 0,
    transform: directions ? 'translateY(0)' : 'translateY(-100%)',
    delay: 300
  });

  const handleClick = async () => {
    try {
      const startLocation = await fetchLocation(startAddress);
      const endLocation = await fetchLocation(endAddress);
      const directionsData = await fetchDirections(startLocation, endLocation);

      setDirections(directionsData);
      setError(null);

      setRoutes(prevRoutes => [...prevRoutes, { startAddress, endAddress, directions: directionsData }]);
    } catch (error) {
      console.error(error);
      setError('An error occurred while fetching directions.');
    }
  };

  const handleRouteChange = (index, startAddress, endAddress) => {
    // Fetch new directions and update the corresponding route
  };

  const handleRouteRemove = (index) => {
    setRoutes(prevRoutes => prevRoutes.filter((route, i) => i !== index));
  };

  return (
    <div className={`App ${isDesktopOrLaptop ? 'desktop' : 'mobile'}`}>
      <input
        type="text"
        placeholder="Enter start address"
        onChange={e => setStartAddress(e.target.value)}
        className="input-field"
      />
      <input
        type="text"
        placeholder="Enter end address"
        onChange={e => setEndAddress(e.target.value)}
        className="input-field"
      />
      <button onClick={handleClick} className="directions-button">Get Directions</button>
      {error && <p>{error}</p>}
      <div className="route-bubbles">
        {routes.map((route, index) => (
          <div key={index} className="route-bubble" style={{ backgroundColor: colors[index % colors.length] }}>
            <p>Start: {route.startAddress}</p>
            <p>End: {route.endAddress}</p>
            <button onClick={() => handleRouteChange(index)}>Change Address</button>
            <button onClick={() => handleRouteRemove(index)}>Remove Route</button>
          </div>
        ))}
      </div>
      <div className="map-container">
        <MapContainer style={{ height: "100%", width: "100%" }} center={directions ? [directions.route.bounds.north, directions.route.bounds.east] : [0, 0]} zoom={13}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {routes.map((route, index) => (
            <Route key={index} route={route} color={colors[index % colors.length]} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;