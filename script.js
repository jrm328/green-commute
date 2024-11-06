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

// Everyday items and their carbon footprints in kg CO₂
const everydayItems = [
    { name: 'plastic bottle', footprint: 0.08 },
    { name: 'burger', footprint: 2.5 },
    { name: 'hour of air conditioning', footprint: 1 },
    { name: 'driving 1 km in a gas car', footprint: 0.2 },
    { name: 'pair of jeans', footprint: 33 },
    { name: 'one-way flight from NYC to LA per passenger', footprint: 900 }
];

// Define the emission factor for the greenest commute option (walking or biking)
const greenOptionEmissionFactor = emissionFactors.walking; // 0 kg CO₂ per km

// Function to calculate cumulative savings over different time periods
function calculateSavingsOverTime(currentEmissions, greenEmissions) {
    const savingsPerTrip = currentEmissions - greenEmissions;

    return {
        weekly: savingsPerTrip * 5,        // Assuming 5 commute days in a week
        monthly: savingsPerTrip * 20,      // Assuming 20 commute days in a month
        yearly: savingsPerTrip * 240,      // Assuming 240 commute days in a year
        fiveYears: savingsPerTrip * 1200   // Assuming 1200 commute days in five years
    };
}

// Function to find the closest item for comparison
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

// Main function to calculate total emissions and potential savings
async function calculateImpact() {
    const commuteLegElements = document.querySelectorAll('.commute-leg');
    let totalEmissions = 0;
    let greenEmissions = 0;

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

        // Calculate emissions for the current mode and the green option
        const emissions = distance * emissionFactor;
        const greenLegEmissions = distance * greenOptionEmissionFactor;
        totalEmissions += emissions;
        greenEmissions += greenLegEmissions;
    }

    // Find the closest everyday item comparison
    const closestItem = findClosestComparison(totalEmissions);

    // Calculate cumulative savings
    const savings = calculateSavingsOverTime(totalEmissions, greenEmissions);

    // Display results with comparison and cumulative savings
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
