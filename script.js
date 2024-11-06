const mapboxToken = 'pk.eyJ1Ijoiam1jbGF1Y2hsYW4iLCJhIjoiY20zNXkxaHJjMGZmZjJxcHh4emg2ejBvbiJ9.a2MC4kDby920S8RkB9R2rQ';

// Emission factors in kg CO2 per km for each mode of transport
const emissionFactors = {
    electricVehicle: 0.02,    // Low emissions for electric vehicle
    publicTransport: 0.06,    // Average for public transit
    walking: 0,               // No emissions for walking
    regularCar: 0.21          // Higher emissions for regular cars
};

// Function to get coordinates from an address using Mapbox Geocoding API
async function getCoordinates(location) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.features[0].geometry.coordinates; // returns [longitude, latitude]
}

// Function to calculate route distance between two coordinates using Mapbox Directions API
async function getRouteDistance(startCoords, endCoords, mode) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${startCoords.join(',')};${endCoords.join(',')}?access_token=${mapboxToken}&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    return data.routes[0].distance / 1000; // Convert meters to kilometers
}

// Function to calculate total emissions for the commute
async function calculateImpact() {
    const startLocation = document.getElementById('start').value;
    const destination = document.getElementById('destination').value;

    // Get coordinates for start and destination locations
    const startCoords = await getCoordinates(startLocation);
    const destinationCoords = await getCoordinates(destination);

    // Retrieve commute legs
    const commuteLegElements = document.querySelectorAll('.commute-leg');
    let totalEmissions = 0;

    // Loop through each commute leg
    for (const leg of commuteLegElements) {
        const mode = leg.querySelector('.mode').value;
        const transportMode = mode === 'electricVehicle' ? 'cycling' : (mode === 'publicTransport' ? 'transit' : (mode === 'regularCar' ? 'driving' : 'walking'));

        // Calculate distance using Mapbox Directions API
        const distance = await getRouteDistance(startCoords, destinationCoords, transportMode);
        
        // Calculate emissions based on distance
        const emissions = distance * (emissionFactors[mode] || 0);
        totalEmissions += emissions;
    }

    // Display results
    document.getElementById('results').innerHTML = `
        <p>Total Emissions: ${totalEmissions.toFixed(2)} kg CO2</p>
    `;
}
