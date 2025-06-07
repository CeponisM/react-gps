# React GPS Route Finder

A React-based web application that helps users find the shortest driving routes between two addresses. The app displays multiple routes on an interactive map with distance calculations and color-coded route visualization.

## Features

- 🗺️ Interactive map powered by Leaflet
- 📍 Address-to-coordinates geocoding
- 🛣️ Multi-route planning and visualization
- 📏 Distance calculations in miles
- 🎨 Color-coded routes for easy identification
- 📱 Responsive design for desktop and mobile
- ⚡ Real-time route calculation
- 🗂️ Route management (add/remove routes)

## Technologies Used

- **React** - Frontend framework
- **Leaflet & React-Leaflet** - Interactive maps
- **Axios** - HTTP requests
- **React Spring** - Animations
- **TrueWay APIs** - Geocoding and directions
- **CSS3** - Styling and responsive design

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/CeponisM/react-gps.git
   cd react-gps
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your RapidAPI key:
   ```env
   REACT_APP_RAPIDAPI_KEY=your_rapidapi_key_here
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## API Setup

This project uses TrueWay APIs from RapidAPI:
1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to TrueWay Geocoding API
3. Subscribe to TrueWay Directions API
4. Copy your API key to the `.env` file

## Usage

1. Enter a starting address in the first input field
2. Enter a destination address in the second input field
3. Click "Get Directions" to calculate and display the route
4. View the route on the map with distance information
5. Add multiple routes to compare different trips
6. Remove routes using the "Remove Route" button in each route panel
7. Minimize the control panel for better map visibility

---

*Find the shortest route to your destination with React GPS Route Finder!*
