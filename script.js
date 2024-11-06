const mapboxToken = 'pk.eyJ1Ijoiam1jbGF1Y2hsYW4iLCJhIjoiY20zNXkxaHJjMGZmZjJxcHh4emg2ejBvbiJ9.a2MC4kDby920S8RkB9R2rQ';

// Emission factors in kg CO2 per minute for each mode of transport
const emissionFactors = {
    electricVehicle: 0.01,    // e.g., low emissions for electric vehicle
    publicTransport: 0.05,    // average for public transit
    walking: 0,               // no emissions for walking
    regularCar: 0.15          // higher emissions for regular cars
};

// Function to add a new commute leg
function addCommuteLeg() {
    const commuteLegs = document.getElementById('commuteLegs');
    const newLeg = document.createElement('div');
    newLeg.classList.add('commute-leg');
    newLeg.innerHTML = `
        <label for="mode">Mode of Transportation:</label>
        <select class="mode">
            <option value="electricVehicle">Electric Vehicle (Scooter/Bike/Car)</option>
            <option value="publicTransport">Public Transportation (Bus/Train/Subway)</option>
            <option value="walking">Walking</option>
            <option value="regularCar">Regular Automobile</option>
        </select>

        <label for="timeSpent">Time Spent (minutes):</label>
        <input type="number" class="timeSpent" placeholder="Enter time in minutes">
    `;
    commuteLegs.appendChild(newLeg);
}

// Function to calculate total emissions
function calculateImpact() {
    const commuteLegElements = document.querySelectorAll('.commute-leg');
    let totalEmissions = 0;

    commuteLegElements.forEach(leg => {
        const mode = leg.querySelector('.mode').value;
        const timeSpent = parseFloat(leg.querySelector('.timeSpent').value) || 0;

        // Calculate emissions based on time spent and mode of transportation
        const emissions = timeSpent * (emissionFactors[mode] || 0);
        totalEmissions += emissions;
    });

    // Display results
    document.getElementById('results').innerHTML = `
        <p>Total Emissions: ${totalEmissions.toFixed(2)} kg CO2</p>
    `;
}
