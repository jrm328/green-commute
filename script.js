const mapboxToken = 'pk.eyJ1Ijoiam1jbGF1Y2hsYW4iLCJhIjoiY20zNXkxaHJjMGZmZjJxcHh4emg2ejBvbiJ9.a2MC4kDby920S8RkB9R2rQ';
mapboxgl.accessToken = mapboxToken;

// Initialize Mapbox map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-98.5795, 39.8283], // Centered on USA
    zoom: 3
});

// Emission factors in kg CO₂ per km for each mode of transport
const emissionFactors = {
    electricVehicle: 0.02,
    bus: 0.1,
    train: 0.05,
    subway: 0.06,
    regularCar: 0.2,
    walking: 0.0
};

// Function to add address prediction
function initAutocomplete(input) {
    input.addEventListener('input', async () => {
        const query = input.value;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5`;
        const response = await fetch(url);
        const data = await response.json();
        
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
        <button type="button" class="remove-leg" onclick="removeCommuteLeg(this)">Remove Leg</button>
    `;
    commuteLegs.appendChild(newLeg);
}

// Function to remove a specific commute leg
function removeCommuteLeg(button) {
    const commuteLeg = button.closest('.commute-leg');
    commuteLeg.remove();
}

// Function to reset the form and map
function resetForm() {
    // Clear all commute legs
    document.getElementById('commuteLegs').innerHTML = `
        <h3>Commute Legs</h3>
    `;
    addCommuteLeg(); // Add an initial commute leg

    // Clear results and reset map
    document.getElementById('results').innerHTML = "";
    removeAllMapLayers();
}

// Function to remove all map layers (routes and markers)
function removeAllMapLayers() {
    const layers = map.getStyle().layers;
    if (layers) {
        layers.forEach(layer => {
            if (layer.id.startsWith('route-')) {
                map.removeLayer(layer.id);
                map.removeSource(layer.id);
            }
        });
    }
}

// Function to get coordinates from an address using Mapbox Geocoding API
async function getCoordinates(location) {
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            return data.features[0].geometry.coordinates; // returns [longitude, latitude]
        } else {
            console.error(`No coordinates found for location: ${location}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        return null;
    }
}

// Function to calculate route distance and plot it on the map
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

// Main function to calculate total emissions
async function calculateImpact() {
    const commuteLegElements = document.querySelectorAll('.commute-leg');
    let totalEmissions = 0;

    for (const leg of commuteLegElements) {
        const startLocation = leg.querySelector('.start').value;
        const endLocation = leg.querySelector('.end').value;
        const mode = leg.querySelector('.mode').value;
        const transitType = leg.querySelector('.transitType') ? leg.querySelector('.transitType').value : null;

        // Determine the specific emission factor for this leg
        let emissionFactor;
        if (mode === 'publicTransport') {
            emissionFactor = emissionFactors[transitType];
        } else {
            emissionFactor = emissionFactors[mode];
        }

        // Set a default emission factor of 0.0 if undefined (e.g., for walking)
        if (emissionFactor === undefined) {
            emissionFactor = 0.0;
        }

        // Log a warning only if it's not expected (i.e., not walking or transitType issues)
        if (emissionFactor === 0.0 && mode !== "walking") {
            console.warn(`No emission factor found for mode: ${mode}`);
            continue;
        }

        // Fetch coordinates and calculate route distance
        const startCoords = await getCoordinates(startLocation);
        if (!startCoords) continue;

        const endCoords = await getCoordinates(endLocation);
        if (!endCoords) continue;

        const legColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Random color for each leg
        const distance = await getRouteDistanceAndPlot(startCoords, endCoords, mode, legColor);

        // Calculate emissions
        const emissions = distance * emissionFactor;
        totalEmissions += emissions;
    }

    // Display results
    document.getElementById('results').innerHTML = `
        <p>Total Emissions: ${totalEmissions.toFixed(2)} kg CO₂</p>
    `;
}
