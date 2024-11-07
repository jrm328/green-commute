// This is new
const mapboxToken = 'pk.eyJ1Ijoiam1jbGF1Y2hsYW4iLCJhIjoiY20zNXkxaHJjMGZmZjJxcHh4emg2ejBvbiJ9.a2MC4kDby920S8RkB9R2rQ';
mapboxgl.accessToken = mapboxToken;

// Initialize Mapbox map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-98.5795, 39.8283],
    zoom: 3
});

const emissionFactors = {
    electricVehicle: 0.02,
    bus: 0.1,
    train: 0.05,
    subway: 0.06,
    regularCar: 0.2,
    walking: 0.0
};

const everydayItems = [
    { name: 'plastic bottle', footprint: 0.08 },
    { name: 'burger', footprint: 2.5 },
    { name: 'hour of air conditioning', footprint: 1 },
    { name: 'driving 1 km in a gas car', footprint: 0.2 },
    { name: 'pair of jeans', footprint: 33 },
    { name: 'one-way flight from NYC to LA per passenger', footprint: 900 }
];

const greenOptionEmissionFactor = emissionFactors.walking;

// Function to add a new commute leg section
function addCommuteLeg() {
    const commuteLegs = document.getElementById('commuteLegs');
    const newLeg = document.createElement('div');
    newLeg.classList.add('commute-leg', 'row', 'g-3', 'mb-3');
    newLeg.innerHTML = `
        <div class="col-md-4">
            <label for="start" class="form-label">Start Location:</label>
            <mapbox-address-autofill access-token="${mapboxToken}">
                <input type="text" class="form-control start location-input" placeholder="Enter start location" autocomplete="shipping address-line1">
            </mapbox-address-autofill>
        </div>
        <div class="col-md-4">
            <label for="end" class="form-label">End Location:</label>
            <mapbox-address-autofill access-token="${mapboxToken}">
                <input type="text" class="form-control end location-input" placeholder="Enter end location" autocomplete="shipping address-line1">
            </mapbox-address-autofill>
        </div>
        <div class="col-md-4">
            <label for="mode" class="form-label">Mode of Transportation:</label>
            <select class="form-select mode" onchange="toggleTransitType(this)">
                <option value="electricVehicle">Electric Vehicle (Scooter/Bike/Car)</option>
                <option value="publicTransport">Public Transportation (Bus/Train/Subway)</option>
                <option value="walking">Walking</option>
                <option value="regularCar">Regular Automobile</option>
            </select>
        </div>
        <div class="col-md-4 transit-type mt-3" style="display: none;">
            <label for="transitType" class="form-label">Transit Type:</label>
            <select class="form-select transitType">
                <option value="bus">Bus</option>
                <option value="train">Train</option>
                <option value="subway">Subway</option>
            </select>
        </div>
        <div class="col-md-4 mt-3">
            <button type="button" class="btn btn-danger" onclick="removeCommuteLeg(this)">Remove Leg</button>
        </div>
    `;
    commuteLegs.appendChild(newLeg);

    // Add event listener to autofill input fields on address selection
    newLeg.querySelectorAll('mapbox-address-autofill').forEach((autofill) => {
        autofill.addEventListener('retrieve', (event) => {
            const input = event.target.querySelector('input');
            input.value = event.detail.features[0].place_name;
        });
    });
}

// Function to remove a specific commute leg
function removeCommuteLeg(button) {
    const commuteLeg = button.closest('.commute-leg');
    commuteLeg.remove();
}

// Reset form, map, and results
function resetForm() {
    document.getElementById('commuteLegs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    removeAllMapLayers();
    addCommuteLeg(); // Add initial commute leg
}

// Remove all layers from the map
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

// Toggle visibility of transit type selection based on mode
function toggleTransitType(select) {
    const transitTypeDiv = select.closest('.commute-leg').querySelector('.transit-type');
    transitTypeDiv.style.display = select.value === 'publicTransport' ? 'block' : 'none';
}

// Get coordinates from Mapbox Geocoding API
async function getCoordinates(location) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
        return data.features[0].geometry.coordinates;
    } else {
        console.error(`No coordinates found for location: ${location}`);
        return null;
    }
}

// Get route distance and plot on the map
async function getRouteDistanceAndPlot(startCoords, endCoords, mode, legColor) {
    const mapboxMode = mode === 'electricVehicle' ? 'cycling' :
                       mode === 'publicTransport' ? 'driving' :
                       mode === 'regularCar' ? 'driving' : 'walking';

    const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxMode}/${startCoords.join(',')};${endCoords.join(',')}?access_token=${mapboxToken}&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    const distance = data.routes[0].distance / 1000;

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

    new mapboxgl.Marker().setLngLat(startCoords).addTo(map);
    new mapboxgl.Marker().setLngLat(endCoords).addTo(map);

    return distance;
}

// Calculate cumulative savings over time
function calculateSavingsOverTime(currentEmissions, greenEmissions) {
    const savingsPerTrip = currentEmissions - greenEmissions;
    return {
        weekly: savingsPerTrip * 5,
        monthly: savingsPerTrip * 20,
        yearly: savingsPerTrip * 240,
        fiveYears: savingsPerTrip * 1200
    };
}

// Find the closest comparison item
function findClosestComparison(totalEmissions) {
    let closestItem = everydayItems[0];
    let smallestDifference = Math.abs(totalEmissions - closestItem.footprint);

    for (const item of everydayItems) {
        const difference = Math.abs(totalEmissions - item.footprint);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestItem = item;
        }
    }
    return closestItem;
}

// Main function to calculate total emissions and display results
async function calculateImpact() {
    const commuteLegElements = document.querySelectorAll('.commute-leg');
    let totalEmissions = 0;
    let greenEmissions = 0;
    const allCoordinates = [];

    for (const leg of commuteLegElements) {
        const startLocation = leg.querySelector('.start').value;
        const endLocation = leg.querySelector('.end').value;
        const mode = leg.querySelector('.mode').value;
        const transitType = leg.querySelector('.transitType') ? leg.querySelector('.transitType').value : null;

        let emissionFactor = mode === 'publicTransport' ? emissionFactors[transitType] : emissionFactors[mode];
        emissionFactor = emissionFactor !== undefined ? emissionFactor : 0.0;

        const startCoords = await getCoordinates(startLocation);
        if (!startCoords) continue;

        const endCoords = await getCoordinates(endLocation);
        if (!endCoords) continue;

        allCoordinates.push(startCoords, endCoords);
        const legColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        const distance = await getRouteDistanceAndPlot(startCoords, endCoords, mode, legColor);

        totalEmissions += distance * emissionFactor;
        greenEmissions += distance * greenOptionEmissionFactor;
    }

    if (allCoordinates.length > 0) {
        const bounds = allCoordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0]));
        map.fitBounds(bounds, { padding: 50 });
    }

    const closestItem = findClosestComparison(totalEmissions);
    const savings = calculateSavingsOverTime(totalEmissions, greenEmissions);

    document.getElementById('results').innerHTML = `
        <p>Total Emissions: ${totalEmissions.toFixed(2)} kg CO₂</p>
        <p>That's roughly equivalent to the carbon footprint of ${closestItem.footprint} kg CO₂ for a ${closestItem.name}.</p>
        <p>Potential savings if you switch to a greener option:</p>
        <ul>
            <li>Weekly: ${savings.weekly.toFixed(2)} kg CO₂</li>
            <li>Monthly: ${savings.monthly.toFixed(2)} kg CO₂</li>
            <li>Yearly: ${savings.yearly.toFixed(2)} kg CO₂</li>
            <li>Five Years: ${savings.fiveYears.toFixed(2)} kg CO₂</li>
        </ul>
        <p>By choosing greener commute options, you reduce your carbon footprint and contribute to a healthier planet, slowing the progression of global warming.</p>
    `;
}

// Initial call to add a single commute leg on load
document.addEventListener('DOMContentLoaded', () => {
    addCommuteLeg();
});
