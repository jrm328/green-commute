const mapboxToken = 'pk.eyJ1Ijoiam1jbGF1Y2hsYW4iLCJhIjoiY20zNXkxaHJjMGZmZjJxcHh4emg2ejBvbiJ9.a2MC4kDby920S8RkB9R2rQ';
const carbonInterfaceApiKey = 'VyVFtne2m9RXuiTFwoyhA';
mapboxgl.accessToken = mapboxToken;

// Initialize Mapbox map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-98.5795, 39.8283], // Centered on USA
    zoom: 3
});

// Function to add a new commute leg section
function addCommuteLeg() {
    const commuteLegs = document.getElementById('commuteLegs');
    const newLeg = document.createElement('div');
    newLeg.classList.add('commute-leg');
    newLeg.innerHTML = `
        <label for="start">Start Location:</label>
        <input type="text" class="start" placeholder="Enter start location">

        <label for="end">End Location:</label>
        <input type="text" class="end" placeholder="Enter end location">

        <label for="mode">Mode of Transportation:</label>
        <select class="mode">
            <option value="electricVehicle">Electric Vehicle (Scooter/Bike/Car)</option>
            <option value="publicTransport">Public Transportation (Bus/Train/Subway)</option>
            <option value="walking">Walking</option>
            <option value="regularCar">Regular Automobile</option>
        </select>
    `;
    commuteLegs.appendChild(newLeg);
}

// Function to get coordinates from an address using Mapbox Geocoding API
async function getCoordinates(location) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.features[0].geometry.coordinates; // returns [longitude, latitude]
}

// Function to calculate route distance between two coordinates using Mapbox Directions API
async function getRouteDistance(startCoords, endCoords, mode, legColor) {
    const mapboxMode = mode === 'electricVehicle' ? 'cycling' :
                       mode === 'publicTransport' ? 'driving' :
                       mode === 'regularCar' ? 'driving' : 'walking';

    const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxMode}/${startCoords.join(',')};${endCoords.join(',')}?access_token=${mapboxToken}&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    const distance = data.routes[0].distance / 1000; // distance in kilometers

    // Plot route on map
    const route = data.routes[0].geometry;
    map.addLayer({
        id: `route-${Math.random()}`,
        type: 'line',
        source: {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: route
            }
        },
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': legColor,
            'line-width': 5
        }
    });

    // Add start and end markers
    new mapboxgl.Marker().setLngLat(startCoords).addTo(map);
    new mapboxgl.Marker().setLngLat(endCoords).addTo(map);

    return distance;
}

// Function to calculate emissions using Carbon Interface API
async function calculateEmissions(distance, mode) {
    let vehicleType;
    switch (mode) {
        case 'electricVehicle':
            vehicleType = 'electric_vehicle';
            break;
        case 'regularCar':
            vehicleType = 'passenger_vehicle';
            break;
        case 'publicTransport':
            vehicleType = 'bus'; // Assuming bus for public transport
            break;
        case 'walking':
            return 0; // No emissions for walking
        default:
            return 0;
    }

    const url = 'https://www.carboninterface.com/api/v1/estimates';
    const body = {
        type: 'vehicle',
        distance_unit: 'km',
        distance_value: distance,
        vehicle_model_id: vehicleType
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${carbonInterfaceApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    return data.data.attributes.carbon_kg; // Emissions in kg CO2
}

// Main function to calculate total emissions
async function calculateImpact() {
    const commuteLegElements = document.querySelectorAll('.commute-leg');
    let totalEmissions = 0;

    for (const leg of commuteLegElements) {
        const startLocation = leg.querySelector('.start').value;
        const endLocation = leg.querySelector('.end').value;
        const mode = leg.querySelector('.mode').value;

        // Fetch coordinates and calculate route distance
        const startCoords = await getCoordinates(startLocation);
        const endCoords = await getCoordinates(endLocation);
        const legColor = `#${Math.floor(Math.random()*16777215).toString(16)}`; // Random color for each leg

        const distance = await getRouteDistance(startCoords, endCoords, mode, legColor);

        // Calculate emissions using Carbon Interface API
        const emissions = await calculateEmissions(distance, mode);
        totalEmissions += emissions;
    }

    // Display results
    document.getElementById('results').innerHTML = `
        <p>Total Emissions: ${totalEmissions.toFixed(2)} kg CO2</p>
    `;
}
