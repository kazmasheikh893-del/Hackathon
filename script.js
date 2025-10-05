class WeatherApp {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:5000/api';
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTheme();
        this.checkGeolocationSupport();
        this.loadDemoData();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => this.searchWeather());
        document.getElementById('city-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchWeather();
        });

        // Location button
        document.getElementById('location-btn').addEventListener('click', () => this.getLocationWeather());

        // Theme toggle
        document.getElementById('theme-btn').addEventListener('click', () => this.toggleTheme());

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshWeather());

        // Modal controls
        document.getElementById('modal-close').addEventListener('click', () => this.hideErrorModal());
        document.getElementById('modal-retry').addEventListener('click', () => {
            this.hideErrorModal();
            this.refreshWeather();
        });
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('weatherAppTheme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('weatherAppTheme', theme);

        const themeIcon = document.querySelector('#theme-btn i');
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    checkGeolocationSupport() {
        if (!navigator.geolocation) {
            document.getElementById('location-btn').style.display = 'none';
        }
    }

    async searchWeather() {
        const city = document.getElementById('city-input').value.trim();
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        await this.fetchWeatherData({ city });
    }

    async getLocationWeather() {
        this.showLoading(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await this.fetchWeatherData({ lat: latitude, lon: longitude });
            },
            (error) => {
                this.showLoading(false);
                this.showError('Unable to retrieve your location. Please search for a city instead.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    async fetchWeatherData(params) {
        this.showLoading(true);

        try {
            let url;
            if (params.city) {
                url = `${this.baseUrl}/weather?city=${encodeURIComponent(params.city)}`;
            } else {
                url = `${this.baseUrl}/weather?lat=${params.lat}&lon=${params.lon}`;
            }

            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.updateUI(data);

        } catch (error) {
            console.error('Weather API error:', error);
            this.showError(`Failed to fetch weather data: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    updateUI(data) {
        this.updateCurrentWeather(data);
        this.updateForecast(data.forecast);
        this.updateAdditionalInfo(data);
        this.updateAirQuality(data.air_quality);
    }

    updateCurrentWeather(data) {
        const current = data.current;

        document.getElementById('city-name').innerHTML =
            '<i class="fas fa-map-marker-alt"></i>' +
            '<span class="city-text">' + data.city + ', ' + data.country + '</span>';

        document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        document.getElementById('weather-description').textContent = current.weather[0].description;
        document.getElementById('current-temp').textContent = Math.round(current.temp);
        document.getElementById('feels-like').textContent = Math.round(current.feels_like);
        document.getElementById('wind-speed').textContent = current.wind_speed + ' km/h';
        document.getElementById('humidity').textContent = current.humidity + '%';
        document.getElementById('pressure').textContent = current.pressure + ' hPa';

        const weatherIcon = document.getElementById('weather-icon');
        weatherIcon.className = 'fas ' + this.getWeatherIcon(current.weather[0].main) + ' weather-icon';
    }

    updateForecast(forecastData) {
        const container = document.getElementById('forecast-container');
        container.innerHTML = '';

        forecastData.forEach(day => {
            const date = new Date(day.dt * 1000);
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card glassmorphism';

            forecastCard.innerHTML =
                '<div class="forecast-date">' +
                    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
                '</div>' +
                '<i class="fas ' + this.getWeatherIcon(day.weather[0].main) + ' forecast-icon"></i>' +
                '<div class="forecast-temp">' + Math.round(day.temp.day) + '°C</div>' +
                '<div class="forecast-desc">' + day.weather[0].description + '</div>' +
                '<div class="forecast-details">' +
                    '<small>H: ' + Math.round(day.temp.max) + '° L: ' + Math.round(day.temp.min) + '°</small>' +
                '</div>';

            container.appendChild(forecastCard);
        });
    }

    updateAdditionalInfo(data) {
        const current = data.current;

        document.getElementById('uv-index').textContent = current.uvi;
        document.getElementById('uv-level').textContent = this.getUVLevel(current.uvi);
        document.getElementById('uv-level').className = 'info-label ' + this.getUVLevelClass(current.uvi);

        document.getElementById('visibility').textContent = (current.visibility / 1000).toFixed(1) + ' km';
        
        document.getElementById('sunrise').textContent = new Date(current.sunrise * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        document.getElementById('sunset').textContent = new Date(current.sunset * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    updateAirQuality(airQuality) {
        const aqiValue = document.getElementById('aqi-value');
        const aqiLevel = document.getElementById('aqi-level');

        aqiValue.textContent = airQuality.aqi;
        aqiLevel.textContent = this.getAQILevel(airQuality.aqi);
        aqiValue.className = 'aqi-value ' + this.getAQILevelClass(airQuality.aqi);
        aqiLevel.className = 'aqi-level ' + this.getAQILevelClass(airQuality.aqi);

        document.getElementById('pm25').textContent = airQuality.components.pm2_5;
        document.getElementById('pm10').textContent = airQuality.components.pm10;
        document.getElementById('o3').textContent = airQuality.components.o3;
    }

    getWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': 'fa-sun',
            'Clouds': 'fa-cloud',
            'Rain': 'fa-cloud-rain',
            'Drizzle': 'fa-cloud-drizzle',
            'Thunderstorm': 'fa-bolt',
            'Snow': 'fa-snowflake',
            'Mist': 'fa-smog',
            'Fog': 'fa-smog',
            'Haze': 'fa-smog'
        };

        return iconMap[weatherMain] || 'fa-cloud';
    }

    getUVLevel(uvIndex) {
        if (uvIndex <= 2) return 'Low';
        if (uvIndex <= 5) return 'Moderate';
        if (uvIndex <= 7) return 'High';
        if (uvIndex <= 10) return 'Very High';
        return 'Extreme';
    }

    getUVLevelClass(uvIndex) {
        if (uvIndex <= 2) return 'uv-low';
        if (uvIndex <= 5) return 'uv-moderate';
        if (uvIndex <= 7) return 'uv-high';
        return 'uv-extreme';
    }

    getAQILevel(aqi) {
        const levels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        return levels[aqi - 1] || 'Unknown';
    }

    getAQILevelClass(aqi) {
        const classes = ['aqi-good', 'aqi-moderate', 'aqi-moderate', 'aqi-unhealthy', 'aqi-hazardous'];
        return classes[aqi - 1] || '';
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        spinner.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').style.display = 'flex';
    }

    hideErrorModal() {
        document.getElementById('error-modal').style.display = 'none';
    }

    refreshWeather() {
        const cityElement = document.querySelector('.city-text');
        if (cityElement && cityElement.textContent !== 'Search for a city') {
            const currentCity = cityElement.textContent.split(',')[0];
            this.fetchWeatherData({ city: currentCity });
        } else {
            this.getLocationWeather();
        }
    }

    loadDemoData() {
        this.fetchWeatherData({ city: 'New Delhi' });
    }
}

class FeatureManager {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:5000/api';
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/me`);
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateAuthUI();
            }
        } catch (error) {
            console.log('Not authenticated');
        }
    }

    updateAuthUI() {
        const authBtn = document.getElementById('auth-btn');
        if (this.currentUser) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> ' + this.currentUser.name;
        } else {
            authBtn.innerHTML = '<i class="fas fa-user"></i> Login';
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.updateAuthUI();
                this.hideAuthModal();
                alert('Login successful!');
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        if (!name || !email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.updateAuthUI();
                this.hideAuthModal();
                alert('Account created successfully!');
            } else {
                alert(data.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Signup failed. Please try again.');
        }
    }

    async handleLogout() {
        try {
            await fetch(`${this.baseUrl}/auth/logout`, { method: 'POST' });
            this.currentUser = null;
            this.updateAuthUI();
            alert('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    bindEvents() {
        const featuresBtn = document.getElementById('features-btn');
        const authBtn = document.getElementById('auth-btn');
        
        if (featuresBtn) {
            featuresBtn.addEventListener('click', () => {
                this.showFeaturesModal();
            });
        }
        
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    if (confirm('Do you want to logout?')) {
                        this.handleLogout();
                    }
                } else {
                    this.showAuthModal();
                }
            });
        }
        
        this.bindAuthTabs();
        this.bindModalClosers();
    }

    bindAuthTabs() {
        const authTabs = document.querySelectorAll('.auth-tab');
        
        authTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                
                authTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.auth-form').forEach(form => {
                    form.classList.remove('active');
                });
                document.getElementById(`${tabName}-form`).classList.add('active');
            });
        });
    }

    bindModalClosers() {
        const featuresClose = document.querySelector('#features-modal .modal-close');
        if (featuresClose) {
            featuresClose.addEventListener('click', () => {
                this.hideFeaturesModal();
            });
        }
        
        const authClose = document.querySelector('#auth-modal .modal-close');
        if (authClose) {
            authClose.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target.id === 'features-modal') {
                this.hideFeaturesModal();
            }
            if (e.target.id === 'auth-modal') {
                this.hideAuthModal();
            }
        });
    }

    showFeaturesModal() {
        const modal = document.getElementById('features-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideFeaturesModal() {
        const modal = document.getElementById('features-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

   showAQICalculator() {
    this.hideFeaturesModal();
    showAQICalculator();
}

    

    showPollutionMap() {
    this.hideFeaturesModal();
    showPollutionMap();
}

showChatBot() {
    this.hideFeaturesModal();
    showWeatherAssistant();
}

showWeatherCards() {
    this.hideFeaturesModal();
    showHealthGuidelines();
}
}
// AQI Calculator Functions
function showAQICalculator() {
    document.getElementById('aqi-calculator-modal').style.display = 'flex';
    document.getElementById('aqi-result').style.display = 'none';
    // Clear previous inputs
    document.getElementById('pm25-input').value = '';
    document.getElementById('pm10-input').value = '';
    document.getElementById('o3-input').value = '';
    document.getElementById('no2-input').value = '';
    document.getElementById('so2-input').value = '';
    document.getElementById('co-input').value = '';
}

function hideAQICalculator() {
    document.getElementById('aqi-calculator-modal').style.display = 'none';
}

function calculateAQI() {
    // Get input values
    const pm25 = parseFloat(document.getElementById('pm25-input').value) || 0;
    const pm10 = parseFloat(document.getElementById('pm10-input').value) || 0;
    const o3 = parseFloat(document.getElementById('o3-input').value) || 0;
    const no2 = parseFloat(document.getElementById('no2-input').value) || 0;
    const so2 = parseFloat(document.getElementById('so2-input').value) || 0;
    const co = parseFloat(document.getElementById('co-input').value) || 0;

    // Calculate individual AQI values
    const aqiPm25 = calculatePollutantAQI(pm25, 'pm25');
    const aqiPm10 = calculatePollutantAQI(pm10, 'pm10');
    const aqiO3 = calculatePollutantAQI(o3, 'o3');
    const aqiNo2 = calculatePollutantAQI(no2, 'no2');
    const aqiSo2 = calculatePollutantAQI(so2, 'so2');
    const aqiCo = calculatePollutantAQI(co, 'co');

    // Overall AQI is the maximum of all pollutants
    const overallAQI = Math.max(aqiPm25, aqiPm10, aqiO3, aqiNo2, aqiSo2, aqiCo);

    // Display results
    displayAQIResults(overallAQI, {
        pm25: aqiPm25,
        pm10: aqiPm10,
        o3: aqiO3,
        no2: aqiNo2,
        so2: aqiSo2,
        co: aqiCo
    });
}

function calculatePollutantAQI(concentration, pollutant) {
    // AQI breakpoints based on US EPA standards
    const breakpoints = {
        pm25: [
            [0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
            [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300], [250.5, 500.4, 301, 500]
        ],
        pm10: [
            [0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150],
            [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 301, 500]
        ],
        o3: [
            [0, 54, 0, 50], [55, 70, 51, 100], [71, 85, 101, 150],
            [86, 105, 151, 200], [106, 200, 201, 300], [201, 500, 301, 500]
        ],
        no2: [
            [0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150],
            [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]
        ],
        so2: [
            [0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150],
            [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]
        ],
        co: [
            [0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150],
            [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]
        ]
    };

    const ranges = breakpoints[pollutant];
    
    for (let range of ranges) {
        const [cLow, cHigh, aqiLow, aqiHigh] = range;
        if (concentration >= cLow && concentration <= cHigh) {
            return Math.round(((aqiHigh - aqiLow) / (cHigh - cLow)) * (concentration - cLow) + aqiLow);
        }
    }
    
    return 0;
}

function displayAQIResults(aqi, pollutants) {
    const resultDiv = document.getElementById('aqi-result');
    const aqiValue = document.getElementById('aqi-calculated-value');
    const aqiLevel = document.getElementById('aqi-calculated-level');
    const breakdownDiv = document.getElementById('pollutant-breakdown');
    const healthDiv = document.getElementById('health-recommendation');

    // Set AQI value and level
    aqiValue.textContent = aqi;
    aqiLevel.textContent = getAQILevelText(aqi);
    
    // Apply color classes
    const aqiClass = getAQIClass(aqi);
    aqiValue.className = `aqi-value-large ${aqiClass}`;
    aqiLevel.className = `aqi-level-large ${aqiClass}`;

    // Create pollutant breakdown
    breakdownDiv.innerHTML = '';
    for (const [pollutant, value] of Object.entries(pollutants)) {
        if (value > 0) {
            const pollutantDiv = document.createElement('div');
            pollutantDiv.className = 'pollutant-item';
            pollutantDiv.innerHTML = `
                <span class="pollutant-name">${getPollutantName(pollutant)}</span>
                <span class="pollutant-aqi ${getAQIClass(value)}">${value}</span>
            `;
            breakdownDiv.appendChild(pollutantDiv);
        }
    }

    // Set health recommendations
    healthDiv.innerHTML = getHealthRecommendation(aqi);

    // Show results
    resultDiv.style.display = 'block';
}

function getAQILevelText(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

function getAQIClass(aqi) {
    if (aqi <= 50) return 'aqi-good';
    if (aqi <= 100) return 'aqi-moderate';
    if (aqi <= 150) return 'aqi-unhealthy-sensitive';
    if (aqi <= 200) return 'aqi-unhealthy';
    if (aqi <= 300) return 'aqi-very-unhealthy';
    return 'aqi-hazardous';
}

function getPollutantName(code) {
    const names = {
        pm25: 'PM2.5',
        pm10: 'PM10',
        o3: 'Ozone',
        no2: 'NO₂',
        so2: 'SO₂',
        co: 'CO'
    };
    return names[code] || code;
}

function getHealthRecommendation(aqi) {
    let recommendation = '';
    
    if (aqi <= 50) {
        recommendation = `
            <h5><i class="fas fa-check-circle"></i> Good Air Quality</h5>
            <p>Air quality is satisfactory. Perfect for outdoor activities.</p>
        `;
    } else if (aqi <= 100) {
        recommendation = `
            <h5><i class="fas fa-info-circle"></i> Moderate Air Quality</h5>
            <p>Acceptable air quality. Unusually sensitive people should consider reducing prolonged outdoor exertion.</p>
        `;
    } else if (aqi <= 150) {
        recommendation = `
            <h5><i class="fas fa-exclamation-triangle"></i> Unhealthy for Sensitive Groups</h5>
            <p>People with respiratory or heart conditions, children and older adults should limit prolonged outdoor exertion.</p>
        `;
    } else if (aqi <= 200) {
        recommendation = `
            <h5><i class="fas fa-exclamation-circle"></i> Unhealthy</h5>
            <p>Everyone may begin to experience health effects. Sensitive groups should avoid outdoor activities.</p>
        `;
    } else if (aqi <= 300) {
        recommendation = `
            <h5><i class="fas fa-skull-crossbones"></i> Very Unhealthy</h5>
            <p>Health alert: Everyone may experience more serious health effects. Avoid outdoor activities.</p>
        `;
    } else {
        recommendation = `
            <h5><i class="fas fa-radiation"></i> Hazardous</h5>
            <p>Health warning of emergency conditions. The entire population is likely to be affected.</p>
        `;
    }
    
    return recommendation;
}
/// ===== NASA POLLUTION MAP FUNCTIONS =====
function showPollutionMap() {
    document.getElementById('pollution-map-modal').style.display = 'flex';
    loadNASACities();
    initializeNASAMap();
}

function hidePollutionMap() {
    document.getElementById('pollution-map-modal').style.display = 'none';
}

function loadNASACities() {
    const cities = [
        { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
        { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
        { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
        { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
        { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
        { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 }
    ];

    const grid = document.getElementById('nasa-cities-grid');
    grid.innerHTML = cities.map(city => `
        <div class="city-card" onclick="analyzeWithNASA('${city.name}', ${city.lat}, ${city.lon})">
            <h4>${city.name}</h4>
            <div class="city-coords">${city.lat.toFixed(2)}°N, ${city.lon.toFixed(2)}°E</div>
            <div class="city-action">Analyze with NASA</div>
        </div>
    `).join('');
}

async function analyzeWithNASA(cityName, lat, lon) {
    try {
        document.getElementById('nasa-loading').style.display = 'flex';
        document.getElementById('nasa-live-data').style.opacity = '0.5';

        const response = await fetch(`/api/nasa/pollution?lat=${lat}&lon=${lon}`);
        
        if (!response.ok) {
            throw new Error('NASA API request failed');
        }

        const data = await response.json();
        
        if (data.success) {
            updateNASADisplay(data.data, cityName);
        } else {
            throw new Error(data.error || 'NASA data unavailable');
        }

    } catch (error) {
        console.error('NASA analysis error:', error);
        alert(`NASA data temporarily unavailable for ${cityName}. Please try again later.`);
    } finally {
        document.getElementById('nasa-loading').style.display = 'none';
        document.getElementById('nasa-live-data').style.opacity = '1';
    }
}

function updateNASADisplay(nasaData, cityName) {
    document.getElementById('aod-value').textContent = nasaData.aerosol_optical_depth;
    document.getElementById('nasa-aqi').textContent = nasaData.estimated_aqi;
    document.getElementById('nasa-pm25').textContent = nasaData.pm25_estimate.toFixed(1) + ' μg/m³';
    
    updateNASAVisualization(nasaData);
    showNASANotification(`NASA data loaded for ${cityName}`, 'success');
}

function updateNASAVisualization(nasaData) {
    const map = document.getElementById('nasa-map');
    const aod = nasaData.aerosol_optical_depth;
    
    let color;
    if (aod < 0.3) color = '#00ff00';
    else if (aod < 0.6) color = '#ffff00';
    else if (aod < 0.9) color = '#ff9900';
    else color = '#ff0000';
    
    map.style.background = `radial-gradient(circle at center, ${color}20 0%, transparent 70%), 
                           linear-gradient(135deg, #1a2a6c 0%, #2c3e50 100%)`;
}

function initializeNASAMap() {
    const map = document.getElementById('nasa-map');
    map.innerHTML = `
        <div class="map-overlay">
            <div class="nasa-loading" id="nasa-loading" style="display: none;">
                <i class="fas fa-satellite fa-spin"></i>
                <p>Connecting to NASA Satellite...</p>
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div class="nasa-legend">
                <h5><i class="fas fa-palette"></i> Aerosol Concentration</h5>
                <div class="legend-scale">
                    <div class="legend-item" style="background: #00ff00;">Low (0-0.3)</div>
                    <div class="legend-item" style="background: #ffff00;">Moderate (0.3-0.6)</div>
                    <div class="legend-item" style="background: #ff9900;">High (0.6-0.9)</div>
                    <div class="legend-item" style="background: #ff0000;">Very High (0.9+)</div>
                </div>
            </div>
        </div>
    `;
}

function showNASANotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `nasa-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function loadNASAData() {
    const layer = document.getElementById('nasa-layer').value;
    const date = document.getElementById('nasa-date').value;
    showNASANotification('Fetching latest NASA satellite data...', 'info');
}

function viewCityAQI(cityName) {
    alert(`Showing detailed AQI data for ${cityName}`);
    // In real implementation, you would fetch detailed data for the city
}

// Weather Assistant Functions
function showWeatherAssistant() {
    document.getElementById('weather-assistant-modal').style.display = 'flex';
}

function hideWeatherAssistant() {
    document.getElementById('weather-assistant-modal').style.display = 'none';
}

function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    input.value = '';
    
    // Simulate bot response
    setTimeout(() => {
        const response = generateBotResponse(message);
        addBotMessage(response);
    }, 1000);
}

function addUserMessage(message) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addBotMessage(message) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function generateBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Extract AQI number from message
    const aqiMatch = lowerMessage.match(/(\d+)\s*(aqi|index|level|quality)?/);
    const aqiValue = aqiMatch ? parseInt(aqiMatch[1]) : null;
    
    // Context-based responses
    if (aqiValue !== null) {
        return getAQISpecificResponse(aqiValue, message);
    }
    
    if (lowerMessage.includes('safe') || lowerMessage.includes('go outside') || 
        lowerMessage.includes('outdoor') || lowerMessage.includes('exercise')) {
        return getSafetyResponse(message);
    }
    
    if (lowerMessage.includes('mask') || lowerMessage.includes('protection') || 
        lowerMessage.includes('precaution') || lowerMessage.includes('protect')) {
        return getProtectionResponse(message);
    }
    
    if (lowerMessage.includes('health') || lowerMessage.includes('effect') || 
        lowerMessage.includes('risk') || lowerMessage.includes('symptom')) {
        return getHealthResponse(message);
    }
    
    if (lowerMessage.includes('child') || lowerMessage.includes('kid') || 
        lowerMessage.includes('baby') || lowerMessage.includes('pregnant')) {
        return getSensitiveGroupResponse(message);
    }
    
    if (lowerMessage.includes('indoor') || lowerMessage.includes('home') || 
        lowerMessage.includes('house') || lowerMessage.includes('purifier')) {
        return getIndoorResponse(message);
    }
    
    if (lowerMessage.includes('what is aqi') || lowerMessage.includes('aqi means') || 
        lowerMessage.includes('define aqi')) {
        return getAQIDefinition();
    }
    
    // Default responses for unknown questions
    return getDefaultResponse();
}

function getAQISpecificResponse(aqiValue, message) {
    const level = getAQILevel(aqiValue);
    const responses = {
        good: [
            `With AQI ${aqiValue} (Good), the air quality is excellent! Perfect for all outdoor activities including exercise, sports, and extended time outside. No health concerns for anyone.`,
            `AQI ${aqiValue} falls in the Good range. This is ideal air quality - feel free to enjoy outdoor activities without any restrictions. Great day for a walk or run!`,
            `At AQI ${aqiValue}, you're experiencing Good air quality. Safe for sensitive groups, children, elderly, and people with respiratory conditions. Perfect for outdoor plans.`
        ],
        moderate: [
            `AQI ${aqiValue} is Moderate. Generally acceptable, but unusually sensitive people might experience minor symptoms. Consider reducing intense outdoor exercise if you notice discomfort.`,
            `With AQI ${aqiValue} (Moderate), most people can continue normal activities. If you have asthma or heart conditions, monitor how you feel during prolonged outdoor exertion.`,
            `Moderate air quality at AQI ${aqiValue}. Usually safe for the general population, but sensitive individuals should consider limiting prolonged or heavy outdoor activities.`
        ],
        unhealthySensitive: [
            `AQI ${aqiValue} is Unhealthy for Sensitive Groups. Children, elderly, and people with heart/lung conditions should reduce outdoor activities. Others are less likely affected.`,
            `At AQI ${aqiValue}, sensitive groups may experience health effects. Consider moving activities indoors or shortening outdoor time if you have asthma, bronchitis, or heart disease.`,
            `Unhealthy for Sensitive Groups (AQI ${aqiValue}). People with respiratory conditions should keep medications handy. Limit prolonged outdoor exertion if you're in a sensitive group.`
        ],
        unhealthy: [
            `AQI ${aqiValue} is Unhealthy. Everyone may begin to experience health effects. Sensitive groups should avoid outdoor activities. Others should limit prolonged exertion.`,
            `With AQI ${aqiValue} (Unhealthy), health effects are possible for everyone. Avoid prolonged outdoor activities and consider wearing a mask if you need to be outside.`,
            `Unhealthy air quality at AQI ${aqiValue}. All individuals may experience respiratory symptoms. Sensitive groups should stay indoors with windows closed.`
        ],
        veryUnhealthy: [
            `AQI ${aqiValue} is Very Unhealthy. Health alert! Everyone may experience more serious health effects. Avoid all outdoor activities and stay indoors when possible.`,
            `Very Unhealthy conditions at AQI ${aqiValue}. This poses significant health risks to all populations. Essential outdoor activities only, and wear N95 masks if going out.`,
            `Health warning: AQI ${aqiValue} is Very Unhealthy. All outdoor activities should be cancelled. Use air purifiers indoors and keep windows closed.`
        ],
        hazardous: [
            `🚨 AQI ${aqiValue} is HAZARDOUS! Emergency conditions. The entire population is likely to be affected. Remain indoors and avoid physical activity. Follow emergency advisories.`,
            `🚨 HAZARDOUS air quality at AQI ${aqiValue}! This is a health emergency. Stay indoors with air purification. Seek alternative shelter if air quality doesn't improve indoors.`,
            `🚨 EMERGENCY: AQI ${aqiValue} is Hazardous. Avoid all outdoor exposure. Use high-efficiency air purifiers. Consider relocating if indoor air quality cannot be maintained.`
        ]
    };
    
    const levelResponses = responses[level] || responses.moderate;
    return levelResponses[Math.floor(Math.random() * levelResponses.length)];
}

function getSafetyResponse(message) {
    const responses = [
        "Safety depends on AQI levels: 0-50 Good (completely safe), 51-100 Moderate (generally safe), 101-150 (sensitive groups be cautious), 151+ (avoid outdoor activities). What's your local AQI?",
        "Outdoor safety varies by AQI: Good (0-50) - Perfectly safe; Moderate (51-100) - Usually safe; 101-150 - Limit time if sensitive; 151+ - Avoid outdoors. Check your current AQI for specific advice!",
        "For outdoor safety: Good AQI (0-50) = All activities safe. Moderate (51-100) = Most activities ok. 101-150 = Sensitive groups reduce exertion. 151+ = Everyone should limit outdoor time."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getProtectionResponse(message) {
    const responses = [
        "Protection tips: AQI 0-100 = Usually no protection needed. 101-150 = Sensitive groups consider masks. 151-200 = N95 masks recommended outdoors. 200+ = Essential to wear masks outside and use air purifiers indoors.",
        "For protection: Below AQI 100 = Minimal precautions. 101-200 = Wear N95 masks outdoors, close windows. Above 200 = High-efficiency masks essential, use air purifiers, limit time outside.",
        "Protective measures: Good AQI = No special needs. Moderate = Monitor symptoms. Unhealthy levels = Masks for sensitive groups. Very Unhealthy+ = Everyone needs masks outdoors and air purification indoors."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getHealthResponse(message) {
    const responses = [
        "Health effects vary: Good AQI = No expected effects. Moderate = Minor irritation possible for sensitive people. Unhealthy = Coughing, throat irritation for many. Very Unhealthy+ = Serious respiratory and cardiovascular effects.",
        "Health impacts: Low AQI = Minimal risk. Moderate = Possible minor symptoms in sensitive individuals. High AQI = Worsening of asthma, increased respiratory symptoms. Very High = Emergency-level health risks for everyone.",
        "Health risks increase with AQI: Below 50 = No concerns. 51-100 = Possible irritation for sensitive people. 101-200 = Respiratory symptoms likely. 200+ = Significant health risks requiring protective actions."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getSensitiveGroupResponse(message) {
    const responses = [
        "Sensitive groups (children, elderly, pregnant women, asthma/heart patients) need extra care: AQI 0-50 = Safe. 51-100 = Monitor symptoms. 101+ = Reduce outdoor activities. 151+ = Avoid outdoors.",
        "For sensitive individuals: Good AQI = No restrictions. Moderate = Be cautious with intense activities. Unhealthy for Sensitive = Limit outdoor time. Unhealthy+ = Stay indoors as much as possible.",
        "Special care for sensitive groups: They feel effects at lower AQI levels. Keep medications handy, limit outdoor time when AQI > 100, use air purifiers at home, and wear masks when AQI > 150."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getIndoorResponse(message) {
    const responses = [
        "For indoor air quality: Keep windows closed when outdoor AQI > 100. Use air purifiers with HEPA filters. Avoid activities that generate particles (smoking, frying). Maintain good ventilation when outdoor air is clean.",
        "Indoor protection: Close windows during high pollution. Use HEPA air purifiers. Avoid burning candles/incense. Consider indoor plants that purify air. Ventilate when outdoor AQI is Good.",
        "Improve indoor air: Use air purifiers for AQI > 100. Keep windows closed during pollution peaks. Clean with wet cloths to avoid stirring dust. Maintain 40-60% humidity. Ventilate when outdoor air quality improves."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getAQIDefinition() {
    const definitions = [
        "AQI (Air Quality Index) is a scale from 0-500 that measures how clean or polluted the air is. It tracks 5 major pollutants: PM2.5, PM10, ozone, nitrogen dioxide, and sulfur dioxide. Lower numbers mean cleaner air!",
        "The Air Quality Index (AQI) is like a thermometer for air pollution, ranging from 0 (cleanest) to 500 (most polluted). It helps you understand daily air quality and potential health impacts quickly.",
        "AQI stands for Air Quality Index - a simple way to report air quality. It converts complex pollution data into an easy-to-understand scale: Good (0-50), Moderate (51-100), Unhealthy for Sensitive (101-150), Unhealthy (151-200), Very Unhealthy (201-300), Hazardous (301-500)."
    ];
    return definitions[Math.floor(Math.random() * definitions.length)];
}

function getDefaultResponse() {
    const defaults = [
        "I'm here to help with air quality questions! You can ask me about specific AQI levels, safety recommendations, health effects, or protection measures. What would you like to know?",
        "I specialize in air quality and health advice. Try asking me about a specific AQI number, outdoor safety, mask recommendations, or health impacts of pollution!",
        "Need air quality guidance? Ask me about anything related to AQI levels, outdoor activities safety, health protection, or pollution effects. I'm here to help!"
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
}

function getAQILevel(aqi) {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'unhealthySensitive';
    if (aqi <= 200) return 'unhealthy';
    if (aqi <= 300) return 'veryUnhealthy';
    return 'hazardous';
}

// Health Guidelines Functions
function showHealthGuidelines() {
    document.getElementById('health-guidelines-modal').style.display = 'flex';
    loadHealthGuidelines('all');
    setupLevelSelectors();
}

function hideHealthGuidelines() {
    document.getElementById('health-guidelines-modal').style.display = 'none';
}

function setupLevelSelectors() {
    const buttons = document.querySelectorAll('.level-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadHealthGuidelines(this.dataset.level);
        });
    });
}

function loadHealthGuidelines(level) {
    const guidelines = {
        good: {
            title: "Good (0-50)",
            icon: "fa-smile",
            color: "good",
            recommendations: [
                "Perfect for outdoor activities and exercise",
                "No health impacts expected",
                "Ideal for sensitive groups",
                "Windows can be kept open for ventilation",
                "No special precautions needed"
            ]
        },
        moderate: {
            title: "Moderate (51-100)",
            icon: "fa-meh",
            color: "moderate",
            recommendations: [
                "Generally acceptable for most activities",
                "Sensitive individuals may experience minor symptoms",
                "Consider reducing intense outdoor exercise",
                "Monitor symptoms if you have respiratory conditions",
                "Usually no need for masks"
            ]
        },
        unhealthySensitive: {
            title: "Unhealthy for Sensitive Groups (101-150)",
            icon: "fa-frown",
            color: "unhealthy-sensitive",
            recommendations: [
                "Sensitive groups should reduce outdoor activities",
                "People with asthma should keep medications handy",
                "Limit prolonged outdoor exertion",
                "Consider wearing masks if sensitive",
                "Close windows if indoor air quality is better"
            ]
        },
        unhealthy: {
            title: "Unhealthy (151-200)",
            icon: "fa-sad-tear",
            color: "unhealthy",
            recommendations: [
                "Everyone may experience health effects",
                "Avoid prolonged outdoor activities",
                "Sensitive groups should stay indoors",
                "Wear N95 masks if going outside",
                "Use air purifiers indoors"
            ]
        },
        veryUnhealthy: {
            title: "Very Unhealthy (201-300)",
            icon: "fa-dizzy",
            color: "very-unhealthy",
            recommendations: [
                "Health alert - everyone may experience serious effects",
                "Avoid all outdoor activities",
                "Stay indoors with windows closed",
                "Wear masks if essential to go outside",
                "Run air purifiers continuously"
            ]
        },
        hazardous: {
            title: "Hazardous (301-500)",
            icon: "fa-skull",
            color: "hazardous",
            recommendations: [
                "Emergency conditions - health warning for everyone",
                "Remain indoors and avoid physical activity",
                "Use high-efficiency air purifiers",
                "Seek alternative shelter if no air purification",
                "Follow emergency health advisories"
            ]
        }
    };

    const contentDiv = document.getElementById('guidelines-content');
    const statsDiv = document.getElementById('stats-grid');
    
    if (level === 'all') {
        contentDiv.innerHTML = Object.values(guidelines).map(guideline => `
            <div class="guideline-card ${guideline.color}">
                <div class="guideline-header">
                    <i class="fas ${guideline.icon}"></i>
                    <h4>${guideline.title}</h4>
                </div>
                <ul class="guideline-list">
                    ${guideline.recommendations.map(rec => `
                        <li><i class="fas fa-check-circle"></i>${rec}</li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    } else {
        const guideline = guidelines[level.replace('-', '').toLowerCase()];
        contentDiv.innerHTML = `
            <div class="guideline-card ${guideline.color}">
                <div class="guideline-header">
                    <i class="fas ${guideline.icon}"></i>
                    <h4>${guideline.title}</h4>
                </div>
                <ul class="guideline-list">
                    ${guideline.recommendations.map(rec => `
                        <li><i class="fas fa-check-circle"></i>${rec}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // Load statistics
    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">15%</div>
            <div class="stat-label">Increased asthma risk at AQI 100+</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">10%</div>
            <div class="stat-label">Higher heart disease risk at AQI 150+</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">25%</div>
            <div class="stat-label">Reduced lung function in children</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">5 years</div>
            <div class="stat-label">Reduced life expectancy in high pollution</div>
        </div>
    `;
}


document.addEventListener('DOMContentLoaded', () => {
    const weatherApp = new WeatherApp();
    const featureManager = new FeatureManager();
    
    window.weatherApp = weatherApp;
    window.featureManager = featureManager;
    
    console.log('🌤️ WeatherCast Pro loaded successfully!');
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}