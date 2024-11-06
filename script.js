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

// Function to add address prediction
function initAutocomplete(input) {
    input.addEventListener('input', async () => {
        const query = input.value;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Clear any existing suggestions
        const datalist = document.createElement('datalist');
        datalist.id = `autocomplete-${input.classList[0]}`;
        data.features.forEach((feature) => {
            const option = document.createElement('option');
            option.value = feature.place_name;
            datalist.appendChild(option);
        });
        input.appendChild(datalist);
        input.setAttribute('list', datalist.id);
    });
}

// Toggle visibility of transit type selection based on mode
function toggleTransitType(select) {
    const transitTypeDiv = select.closest('.commute-leg').querySelector('.transit-type');
    transitTypeDiv.style.display = select.value === 'publicTransport' ? 'block' : 'none';
}

// Add a new commute leg section
function addCommuteLeg() {
    const commuteLegs = document.getElementById('commuteLegs');
    const newLeg = document.createElement('div');
    newLeg.classList.add('commute-leg');
    newLeg.innerHTML = `
        <label for="start">Start Location:</label>
        <input type="text" class="start location-input" placeholder="Enter start location" oninput="initAutocomplete(this)">

        <label for="end">End Location:</label>
        <input type="text" class="end location-input" placeholder="Enter end location" oninput="initAutocomplete(this)">

        <label for="mode">Mode of Transportation:</label>
        <select class="mode" onchange="toggleTransitType(this)">
            <option value="electricVehicle">Electric Vehicle (Scooter/Bike/Car)</option>
            <option value="publicTransport">Public Transportation (Bus/Train/Subway)</option>
            <option value="walking">Walking</option>
            <option value="regularCar">Regular Automobile</option>
        </select>

        <div class="transit-type" style="display: none;">
            <label for="transitType">Transit Type:</label>
            <select class="transitType">
                <option value="bus">Bus</option>
                <option value="train">Train</option>
                <option value="subway">Subway</option>
            </select>
        </div>
    `;
    commuteLegs.appendChild(newLeg);
}

// Function to get coordinates from an address using Mapbox Geocoding API
async function getCoordinates(location) {
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Check if data has results and return coordinates, else log an error
        if (data.features && data.features.length > 0) {
            return data.features[0].geometry.coordinates; // returns [longitude, latitude]
        } else {
            console.error(`No coordinates found for location: ${location}`);
            return null; // or handle it as needed
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        return null; // or handle the error accordingly
    }
}

// Function to calculate route distance between two coordinates using Mapbox Directions API
async function getRouteDistanceAndPlot(startCoords, endCoords, mode, legColor) {
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

// Calculate emissions based on the selected transit type
async function calculateEmissions(distance, mode, transitType = null) {
    let vehicleType;
    if (mode === 'publicTransport') {
        vehicleType = transitType === 'train' ? 'train' : 
                      transitType === 'subway' ? 'subway' : 'bus';
    } else if (mode === 'electricVehicle') {
        vehicleType = 'electric_vehicle';
    } else if (mode === 'regularCar') {
        vehicleType = 'passenger_vehicle';
    } else {
        return 0; // No emissions for walking
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
        const transitType = leg.querySelector('.transitType') ? leg.querySelector('.transitType').value : null;

        // Fetch coordinates and calculate route distance
        const startCoords = await getCoordinates(startLocation);
        if (!startCoords) continue; // Skip if coordinates are not available

        const endCoords = await getCoordinates(endLocation);
        if (!endCoords) continue; // Skip if coordinates are not available

        const legColor = `#${Math.floor(Math.random()*16777215).toString(16)}`; // Random color for each leg
        const distance = await getRouteDistanceAndPlot(startCoords, endCoords, mode, legColor);

        // Calculate emissions with transit type accounted for
        const emissions = await calculateEmissions(distance, mode, transitType);
        totalEmissions += emissions;
    }

    // Display results
    document.getElementById('results').innerHTML = `
        <p>Total Emissions: ${totalEmissions.toFixed(2)} kg CO2</p>
    `;
}
