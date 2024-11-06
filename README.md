
# Green Commute

## Project Overview
The Green Commute is a tool that helps users measure the environmental impact of their daily commute. By entering the distance covered by different transportation modes like electric scooters, trains, public transit, and walking, users can see the total CO2 emissions generated. The project uses Mapbox for distance calculation and leverages Google Sheets and Make.com for data storage and automation.

## Features
- **Multi-Modal Commute Calculation**: Calculate emissions for commutes that involve multiple types of transportation.
- **Customizable Commute Legs**: Users can enter each leg of their commute, allowing for personalized results.
- **Distance Measurement via Mapbox**: Automatically fetches distances using the Mapbox Directions API.
- **Emissions Breakdown**: Displays emissions for each commute leg and the total, helping users identify greener choices.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **API**: Mapbox Directions API
- **Automation and Data Storage**: Make.com and Google Sheets

## Getting Started

### Prerequisites
- [Mapbox Account and API Key](https://www.mapbox.com/)
- Basic knowledge of JavaScript, HTML, and CSS
- GitHub account for deployment on GitHub Pages
- Make.com account (optional for automation)

### Setup Instructions
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/green-commute-calculator.git
   cd green-commute-calculator
   ```

2. **Obtain a Mapbox API Key:**
   - Sign up on [Mapbox](https://www.mapbox.com/) and generate an API key.
   - Update `script.js` with your Mapbox token.

3. **Run the Project Locally:**
   - Open `index.html` in your browser to test the application locally.

4. **Deploy on GitHub Pages:**
   - Push the repository to GitHub and enable GitHub Pages in the repository settings.

## Usage
1. Open the [Green Commute Calculator](https://jrm328.github.io/green-commute/).
2. Enter the starting point and distances for each leg of your commute.
3. Click "Calculate Impact" to view the total emissions and breakdown by commute mode.

## Project Structure
```plaintext
green-commute-calculator/
│
├── index.html          # Main HTML structure
├── style.css           # Basic styling for the page
├── script.js           # JavaScript logic for API calls and emissions calculation
└── README.md           # Project documentation
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or new features.

## License
This project is licensed under the MIT License.

## Acknowledgments
- **Mapbox** for route calculations and mapping services.
- **Make.com** for automation and Google Sheets integration.
