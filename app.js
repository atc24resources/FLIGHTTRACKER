// Aviation Navigation App - Main JavaScript

class AviationApp {
    constructor() {
        this.aircraft = [];
        this.waypoints = [];
        this.flightPlans = [];
        this.logbookEntries = [];
        this.selectedAircraft = null;
        this.selectedFlightPlan = null;
        this.selectedLogbookEntry = null;
        
        // Map state
        this.mapState = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0
        };
        
        // Map interaction state
        this.isDragging = false;
        this.isRotating = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.isAddingWaypoint = false;
        this.waypointType = 'waypoint';
        
        // API state
        this.apiStatus = 'connecting';
        this.isUsingMockData = false;
        this.lastUpdateTime = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWaypoints();
        this.loadLogbook();
        this.loadFlightPlans();
        this.startAircraftUpdates();
        this.updateMapDisplay();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = e.currentTarget.dataset.page;
                this.showPage(targetPage);
            });
        });

        // Map controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomMap(1.2));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomMap(0.8));
        document.getElementById('reset-view').addEventListener('click', () => this.resetMapView());

        // Waypoint controls
        document.getElementById('add-waypoint').addEventListener('click', () => this.startAddingWaypoint('waypoint'));
        document.getElementById('add-airport').addEventListener('click', () => this.startAddingWaypoint('airport'));
        document.getElementById('show-waypoints').addEventListener('click', () => this.showWaypointsList());

        // Map interaction
        const mapContainer = document.getElementById('map-container');
        mapContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        mapContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        mapContainer.addEventListener('mouseup', () => this.handleMouseUp());
        mapContainer.addEventListener('wheel', (e) => this.handleWheel(e));
        mapContainer.addEventListener('click', (e) => this.handleMapClick(e));

        // Waypoint modal
        document.getElementById('save-waypoint').addEventListener('click', () => this.saveWaypoint());
        document.getElementById('cancel-waypoint').addEventListener('click', () => this.closeWaypointModal());
        document.getElementById('close-waypoint-modal').addEventListener('click', () => this.closeWaypointModal());

        // Waypoints list modal
        document.getElementById('close-waypoints-list').addEventListener('click', () => this.closeWaypointsList());

        // Aircraft info panel
        document.getElementById('close-aircraft-info').addEventListener('click', () => this.closeAircraftInfo());

        // Settings
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

        // Logbook
        document.getElementById('clear-logbook').addEventListener('click', () => this.clearLogbook());

        // Modal background clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    modal.classList.remove('show');
                });
                this.isAddingWaypoint = false;
                document.body.classList.remove('adding-waypoint');
            }
        });
    }

    // Navigation
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show target page
        document.getElementById(pageId).classList.add('active');
        
        // Update navigation buttons
        document.querySelectorAll('.nav-button').forEach(button => {
            button.classList.remove('border-b-2', 'border-blue-500', 'text-blue-600');
            button.classList.add('text-gray-600');
        });
        
        document.querySelectorAll(`[data-page="${pageId}"]`).forEach(button => {
            button.classList.add('border-b-2', 'border-blue-500', 'text-blue-600');
            button.classList.remove('text-gray-600');
        });

        // Refresh page data if needed
        if (pageId === 'logbook-page') {
            this.refreshLogbook();
        }
    }

    // Toast notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        lucide.createIcons();
    }

    // Map functionality
    handleMouseDown(e) {
        if (this.isAddingWaypoint) return;
        
        if (e.shiftKey) {
            this.isRotating = true;
        } else {
            this.isDragging = true;
        }
        
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        document.getElementById('map-container').classList.add('dragging');
    }

    handleMouseMove(e) {
        if (!this.isDragging && !this.isRotating) return;
        
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        if (this.isDragging) {
            this.mapState.x += deltaX / this.mapState.scale;
            this.mapState.y += deltaY / this.mapState.scale;
        } else if (this.isRotating) {
            this.mapState.rotation += deltaX * 0.5;
        }
        
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.updateMapDisplay();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.isRotating = false;
        document.getElementById('map-container').classList.remove('dragging');
    }

    handleWheel(e) {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomMap(scaleFactor);
    }

    handleMapClick(e) {
        if (this.isAddingWaypoint) {
            e.stopPropagation();
            const svgCoords = this.screenToSVG(e.clientX, e.clientY);
            this.showWaypointModal(svgCoords);
            this.isAddingWaypoint = false;
            document.body.classList.remove('adding-waypoint');
        }
    }

    screenToSVG(clientX, clientY) {
        const mapContainer = document.getElementById('map-container');
        const svg = document.getElementById('aviation-map');
        const rect = mapContainer.getBoundingClientRect();
        
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;
        
        const viewBoxWidth = 2000;
        const viewBoxHeight = 2000;
        const svgX = (relativeX / rect.width) * viewBoxWidth - viewBoxWidth/2;
        const svgY = (relativeY / rect.height) * viewBoxHeight - viewBoxHeight/2;
        
        // Account for current map transformation
        const transformedX = (svgX - this.mapState.x) / this.mapState.scale;
        const transformedY = (svgY - this.mapState.y) / this.mapState.scale;
        
        return { x: transformedX, y: transformedY };
    }

    zoomMap(factor) {
        this.mapState.scale = Math.max(0.1, Math.min(5, this.mapState.scale * factor));
        this.updateMapDisplay();
    }

    resetMapView() {
        this.mapState = { x: 0, y: 0, scale: 1, rotation: 0 };
        this.updateMapDisplay();
    }

    updateMapDisplay() {
        const mapElements = document.getElementById('map-elements');
        mapElements.style.transform = `translate(${this.mapState.x}px, ${this.mapState.y}px) scale(${this.mapState.scale}) rotate(${this.mapState.rotation}deg)`;
    }

    // Aircraft functionality
    async startAircraftUpdates() {
        this.updateAPIStatus('connecting');
        
        try {
            // Try to fetch from real API first
            const response = await fetch('https://24data.ptfs.app/acft-data', { 
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.aircraft = data.map(aircraft => ({
                    id: aircraft.callsign || `aircraft-${Math.random()}`,
                    callsign: aircraft.callsign || 'N/A',
                    x: aircraft.x || 0,
                    y: aircraft.y || 0,
                    altitude: aircraft.altitude || 0,
                    speed: aircraft.speed || 0,
                    heading: aircraft.heading || 0,
                    type: aircraft.type || 'Unknown'
                }));
                
                this.updateAPIStatus('connected');
                this.isUsingMockData = false;
            } else {
                throw new Error('API response not ok');
            }
        } catch (error) {
            console.warn('Failed to fetch from API, using mock data:', error);
            this.useMockAircraftData();
            this.updateAPIStatus('error');
            this.isUsingMockData = true;
        }
        
        this.renderAircraft();
        this.lastUpdateTime = new Date();
        
        // Continue updating every 5 seconds
        setTimeout(() => this.startAircraftUpdates(), 5000);
    }

    useMockAircraftData() {
        this.aircraft = [
            {
                id: 'mock-1',
                callsign: 'N123AB',
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500,
                altitude: 37000,
                speed: 420,
                heading: 180,
                type: 'B737'
            },
            {
                id: 'mock-2',
                callsign: 'N456CD',
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500,
                altitude: 35000,
                speed: 380,
                heading: 90,
                type: 'A320'
            },
            {
                id: 'mock-3',
                callsign: 'N789EF',
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500,
                altitude: 41000,
                speed: 450,
                heading: 270,
                type: 'B787'
            }
        ];
    }

    updateAPIStatus(status) {
        this.apiStatus = status;
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        
        switch (status) {
            case 'connecting':
                indicator.className = 'w-3 h-3 rounded-full bg-yellow-500';
                text.textContent = 'Connecting...';
                break;
            case 'connected':
                indicator.className = 'w-3 h-3 rounded-full bg-green-500';
                text.textContent = this.isUsingMockData ? 'Mock Data' : 'Live Data';
                break;
            case 'error':
                indicator.className = 'w-3 h-3 rounded-full bg-red-500';
                text.textContent = 'Connection Error';
                break;
        }
    }

    renderAircraft() {
        const container = document.getElementById('aircraft-markers');
        container.innerHTML = '';
        
        this.aircraft.forEach(aircraft => {
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            marker.className = 'aircraft-marker';
            marker.dataset.aircraftId = aircraft.id;
            
            if (this.selectedAircraft === aircraft.id) {
                marker.classList.add('selected');
            }
            
            marker.innerHTML = `
                <circle cx="${aircraft.x}" cy="${aircraft.y}" r="8" fill="#3b82f6" stroke="white" stroke-width="2"/>
                <text x="${aircraft.x}" y="${aircraft.y - 15}" text-anchor="middle" fill="#1f2937" font-size="12" font-weight="bold">${aircraft.callsign}</text>
                <path d="M${aircraft.x - 6},${aircraft.y + 2} L${aircraft.x},${aircraft.y - 8} L${aircraft.x + 6},${aircraft.y + 2} Z" 
                      fill="white" stroke="#3b82f6" stroke-width="1" 
                      transform="rotate(${aircraft.heading} ${aircraft.x} ${aircraft.y})"/>
            `;
            
            marker.addEventListener('click', (e) => this.handleAircraftClick(aircraft.id, e));
            container.appendChild(marker);
        });
        
        // Update footer info with first aircraft or selected aircraft
        const displayAircraft = this.selectedAircraft ? 
            this.aircraft.find(a => a.id === this.selectedAircraft) : 
            this.aircraft[0];
            
        if (displayAircraft) {
            this.updateFooterInfo(displayAircraft);
        }
    }

    handleAircraftClick(aircraftId, event) {
        event.stopPropagation();
        
        if (this.selectedAircraft === aircraftId) {
            this.selectedAircraft = null;
            this.closeAircraftInfo();
        } else {
            this.selectedAircraft = aircraftId;
            const aircraft = this.aircraft.find(a => a.id === aircraftId);
            if (aircraft) {
                this.showAircraftInfo(aircraft);
                this.updateFooterInfo(aircraft);
            }
        }
        
        this.renderAircraft();
    }

    showAircraftInfo(aircraft) {
        const panel = document.getElementById('aircraft-info');
        document.getElementById('aircraft-callsign').textContent = aircraft.callsign;
        document.getElementById('aircraft-altitude').textContent = `${aircraft.altitude.toLocaleString()} ft`;
        document.getElementById('aircraft-speed').textContent = `${aircraft.speed} kts`;
        document.getElementById('aircraft-heading').textContent = `${aircraft.heading}°`;
        document.getElementById('aircraft-type').textContent = aircraft.type;
        panel.classList.remove('hidden');
    }

    closeAircraftInfo() {
        document.getElementById('aircraft-info').classList.add('hidden');
        this.selectedAircraft = null;
        this.renderAircraft();
    }

    updateFooterInfo(aircraft) {
        document.getElementById('footer-altitude').textContent = `${aircraft.altitude.toLocaleString()} ft`;
        document.getElementById('footer-callsign').textContent = aircraft.callsign;
        document.getElementById('footer-speed').textContent = `${aircraft.speed} kts`;
        document.getElementById('footer-heading').textContent = `${aircraft.heading}°`;
        document.getElementById('footer-aircraft').textContent = aircraft.type;
    }

    // Waypoint functionality
    loadWaypoints() {
        const saved = localStorage.getItem('aviationWaypoints');
        if (saved) {
            try {
                this.waypoints = JSON.parse(saved);
                this.renderWaypoints();
            } catch (error) {
                console.error('Failed to load waypoints:', error);
            }
        }
    }

    saveWaypointsToStorage() {
        localStorage.setItem('aviationWaypoints', JSON.stringify(this.waypoints));
    }

    startAddingWaypoint(type) {
        this.isAddingWaypoint = true;
        this.waypointType = type;
        document.body.classList.add('adding-waypoint');
        this.showToast(`Click on the map to add ${type}`, 'success');
    }

    showWaypointModal(coords) {
        const modal = document.getElementById('waypoint-modal');
        const title = document.getElementById('waypoint-modal-title');
        const typeSelect = document.getElementById('waypoint-type');
        
        title.textContent = this.waypointType === 'airport' ? 'Add Airport' : 'Add Waypoint';
        typeSelect.value = this.waypointType;
        
        this.pendingWaypointCoords = coords;
        modal.classList.add('show');
        
        // Clear form
        document.getElementById('waypoint-name').value = '';
        document.getElementById('waypoint-description').value = '';
        document.getElementById('waypoint-name').focus();
    }

    closeWaypointModal() {
        document.getElementById('waypoint-modal').classList.remove('show');
        this.pendingWaypointCoords = null;
    }

    saveWaypoint() {
        const name = document.getElementById('waypoint-name').value.trim();
        const type = document.getElementById('waypoint-type').value;
        const description = document.getElementById('waypoint-description').value.trim();
        
        if (!name) {
            this.showToast('Please provide a name for the waypoint', 'error');
            return;
        }
        
        if (!this.pendingWaypointCoords) {
            this.showToast('Invalid waypoint coordinates', 'error');
            return;
        }
        
        const waypoint = {
            id: `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            x: this.pendingWaypointCoords.x,
            y: this.pendingWaypointCoords.y,
            description: description || undefined
        };
        
        this.waypoints.push(waypoint);
        this.saveWaypointsToStorage();
        this.renderWaypoints();
        this.closeWaypointModal();
        
        this.showToast(`${type === 'airport' ? 'Airport' : 'Waypoint'} "${name}" added`, 'success');
    }

    renderWaypoints() {
        const container = document.getElementById('waypoint-markers');
        container.innerHTML = '';
        
        this.waypoints.forEach(waypoint => {
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            marker.className = 'waypoint-marker';
            marker.dataset.waypointId = waypoint.id;
            
            const color = waypoint.type === 'airport' ? '#10b981' : '#f59e0b';
            const icon = waypoint.type === 'airport' ? '✈' : '📍';
            
            marker.innerHTML = `
                <circle cx="${waypoint.x}" cy="${waypoint.y}" r="6" fill="${color}" stroke="white" stroke-width="2"/>
                <text x="${waypoint.x}" y="${waypoint.y - 12}" text-anchor="middle" fill="#1f2937" font-size="10" font-weight="bold">${waypoint.name}</text>
            `;
            
            marker.addEventListener('click', (e) => this.handleWaypointClick(waypoint.id, e));
            container.appendChild(marker);
        });
    }

    handleWaypointClick(waypointId, event) {
        event.stopPropagation();
        const waypoint = this.waypoints.find(w => w.id === waypointId);
        if (waypoint) {
            this.showToast(`${waypoint.type === 'airport' ? 'Airport' : 'Waypoint'}: ${waypoint.name}`, 'success');
        }
    }

    showWaypointsList() {
        const modal = document.getElementById('waypoints-list-modal');
        const content = document.getElementById('waypoints-list-content');
        
        if (this.waypoints.length === 0) {
            content.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i data-lucide="map-pin" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                    <p>No waypoints or airports added yet</p>
                    <p class="text-sm mt-2">Use the map controls to add waypoints and airports</p>
                </div>
            `;
        } else {
            content.innerHTML = this.waypoints.map(waypoint => `
                <div class="flex items-center justify-between p-3 border-b hover:bg-gray-50">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 rounded-full ${waypoint.type === 'airport' ? 'bg-green-500' : 'bg-yellow-500'}"></div>
                        <div>
                            <div class="font-medium">${waypoint.name}</div>
                            <div class="text-sm text-gray-600">${waypoint.type === 'airport' ? 'Airport' : 'Waypoint'}</div>
                            ${waypoint.description ? `<div class="text-xs text-gray-500">${waypoint.description}</div>` : ''}
                        </div>
                    </div>
                    <button onclick="app.deleteWaypoint('${waypoint.id}')" class="text-red-600 hover:text-red-800">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('');
        }
        
        modal.classList.add('show');
        lucide.createIcons();
    }

    closeWaypointsList() {
        document.getElementById('waypoints-list-modal').classList.remove('show');
    }

    deleteWaypoint(waypointId) {
        this.waypoints = this.waypoints.filter(w => w.id !== waypointId);
        this.saveWaypointsToStorage();
        this.renderWaypoints();
        this.showWaypointsList(); // Refresh the list
        this.showToast('Waypoint deleted', 'success');
    }

    // Flight Plans functionality
    async loadFlightPlans() {
        // Mock flight plans data
        this.flightPlans = [
            {
                id: '1',
                callsign: 'N123AB',
                departure: 'KJFK',
                arrival: 'KLAX',
                departureTime: '2025-01-25T14:30:00',
                arrivalTime: '2025-01-25T18:45:00',
                aircraft: 'Boeing 737-800',
                altitude: 37000,
                route: 'KJFK DCT PENNS J70 RICCE DCT KLAX',
                status: 'active',
                distance: 2475,
                duration: '5h 15m',
                fuel: 18500
            },
            {
                id: '2',
                callsign: 'N456CD',
                departure: 'KORD',
                arrival: 'KDEN',
                departureTime: '2025-01-25T16:00:00',
                arrivalTime: '2025-01-25T18:30:00',
                aircraft: 'Airbus A320',
                altitude: 35000,
                route: 'KORD DCT WYNDE J146 KATEE DCT KDEN',
                status: 'scheduled',
                distance: 888,
                duration: '2h 30m',
                fuel: 12000
            },
            {
                id: '3',
                callsign: 'N789EF',
                departure: 'KSEA',
                arrival: 'KPHX',
                departureTime: '2025-01-25T12:15:00',
                arrivalTime: '2025-01-25T15:45:00',
                aircraft: 'Boeing 787-9',
                altitude: 41000,
                route: 'KSEA J503 LKV J134 KPHX',
                status: 'completed',
                distance: 1107,
                duration: '3h 30m',
                fuel: 15200
            },
            {
                id: '4',
                callsign: 'N987GH',
                departure: 'KMIA',
                arrival: 'KJFK',
                departureTime: '2025-01-25T09:00:00',
                arrivalTime: '2025-01-25T12:30:00',
                aircraft: 'Cessna Citation X',
                altitude: 45000,
                route: 'KMIA J79 WINCO J174 KJFK',
                status: 'active',
                distance: 1092,
                duration: '3h 30m',
                fuel: 8500
            }
        ];
        
        this.renderFlightPlans();
    }

    renderFlightPlans() {
        const container = document.getElementById('flight-plans-list');
        const countElement = document.getElementById('flight-plans-count');
        
        countElement.textContent = `${this.flightPlans.length} flight plan${this.flightPlans.length !== 1 ? 's' : ''} found`;
        
        container.innerHTML = this.flightPlans.map(plan => `
            <div class="flight-plan-card bg-white rounded-lg border shadow-sm p-4 cursor-pointer hover:bg-gray-50 ${this.selectedFlightPlan === plan.id ? 'ring-2 ring-blue-500' : ''}" 
                 onclick="app.selectFlightPlan('${plan.id}')">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <i data-lucide="plane" class="w-4 h-4"></i>
                        <span class="font-medium">${plan.callsign}</span>
                    </div>
                    <span class="inline-block px-2 py-1 text-xs font-medium text-white rounded status-${plan.status}">
                        ${plan.status}
                    </span>
                </div>
                
                <div class="flex items-center space-x-4 text-sm">
                    <div class="flex items-center space-x-1">
                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                        <span>${plan.departure}</span>
                    </div>
                    <span>→</span>
                    <div class="flex items-center space-x-1">
                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                        <span>${plan.arrival}</span>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4 text-xs text-gray-600 mt-2">
                    <div class="flex items-center space-x-1">
                        <i data-lucide="clock" class="w-3 h-3"></i>
                        <span>${this.formatTime(plan.departureTime)}</span>
                    </div>
                    <span>•</span>
                    <span>${plan.aircraft}</span>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
        
        // Auto-select first plan if none selected
        if (!this.selectedFlightPlan && this.flightPlans.length > 0) {
            this.selectFlightPlan(this.flightPlans[0].id);
        }
    }

    selectFlightPlan(planId) {
        this.selectedFlightPlan = planId;
        this.renderFlightPlans();
        
        const plan = this.flightPlans.find(p => p.id === planId);
        if (plan) {
            this.showFlightPlanDetails(plan);
        }
    }

    showFlightPlanDetails(plan) {
        const container = document.getElementById('flight-plan-details');
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-semibold">${plan.callsign}</h2>
                    <p class="text-gray-600">${plan.aircraft}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="inline-block px-3 py-1 text-sm font-medium text-white rounded status-${plan.status}">
                        ${plan.status}
                    </span>
                    <button onclick="app.saveToLogbook('${plan.id}')" class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1">
                        <i data-lucide="save" class="w-4 h-4"></i>
                        <span>Save to Logbook</span>
                    </button>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Route Information -->
                <div class="bg-white rounded-lg border shadow-sm p-4">
                    <h3 class="text-lg font-medium mb-3">Route</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <div class="text-sm text-gray-600">Departure</div>
                            <div class="font-medium">${plan.departure}</div>
                            <div class="text-sm text-gray-600">${this.formatTime(plan.departureTime)}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Arrival</div>
                            <div class="font-medium">${plan.arrival}</div>
                            <div class="text-sm text-gray-600">${this.formatTime(plan.arrivalTime)}</div>
                        </div>
                    </div>
                    <hr class="my-3">
                    <div>
                        <div class="text-sm text-gray-600 mb-1">Flight Route</div>
                        <div class="text-sm font-mono bg-gray-100 p-2 rounded">${plan.route}</div>
                    </div>
                </div>

                <!-- Flight Details -->
                <div class="bg-white rounded-lg border shadow-sm p-4">
                    <h3 class="text-lg font-medium mb-3">Flight Details</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-gray-600">Cruise Altitude</div>
                            <div class="font-medium">${plan.altitude.toLocaleString()} ft</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Distance</div>
                            <div class="font-medium">${plan.distance} nm</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Duration</div>
                            <div class="font-medium">${plan.duration}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Fuel Required</div>
                            <div class="font-medium">${plan.fuel.toLocaleString()} lbs</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        lucide.createIcons();
    }

    saveToLogbook(planId) {
        const plan = this.flightPlans.find(p => p.id === planId);
        if (!plan) return;
        
        const logbookEntry = {
            ...plan,
            id: `logbook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            savedAt: new Date().toISOString()
        };
        
        this.logbookEntries.unshift(logbookEntry);
        this.saveLogbookToStorage();
        this.showToast(`Flight plan ${plan.callsign} saved to logbook`, 'success');
    }

    // Logbook functionality
    loadLogbook() {
        const saved = localStorage.getItem('flightLogbook');
        if (saved) {
            try {
                this.logbookEntries = JSON.parse(saved);
            } catch (error) {
                console.error('Failed to load logbook:', error);
            }
        }
    }

    saveLogbookToStorage() {
        localStorage.setItem('flightLogbook', JSON.stringify(this.logbookEntries));
    }

    refreshLogbook() {
        this.renderLogbook();
    }

    renderLogbook() {
        const container = document.getElementById('logbook-list');
        const countElement = document.getElementById('logbook-count');
        const clearButton = document.getElementById('clear-logbook');
        
        if (this.logbookEntries.length === 0) {
            countElement.textContent = 'No saved flight plans';
            clearButton.classList.add('hidden');
            container.innerHTML = `
                <div class="flex items-center justify-center h-full text-center text-gray-500">
                    <div>
                        <i data-lucide="plane" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                        <p class="mb-2">No saved flight plans</p>
                        <p class="text-sm">Save flight plans from the Plan tab to view them here</p>
                    </div>
                </div>
            `;
        } else {
            countElement.textContent = `${this.logbookEntries.length} saved flight plan${this.logbookEntries.length !== 1 ? 's' : ''}`;
            clearButton.classList.remove('hidden');
            
            container.innerHTML = `
                <div class="space-y-3">
                    ${this.logbookEntries.map(entry => `
                        <div class="logbook-entry-card bg-white rounded-lg border shadow-sm p-4 cursor-pointer hover:bg-gray-50 ${this.selectedLogbookEntry === entry.id ? 'ring-2 ring-blue-500' : ''}" 
                             onclick="app.selectLogbookEntry('${entry.id}')">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center space-x-2">
                                    <i data-lucide="plane" class="w-4 h-4"></i>
                                    <span class="font-medium">${entry.callsign}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class="inline-block px-2 py-1 text-xs font-medium text-white rounded status-${entry.status}">
                                        ${entry.status}
                                    </span>
                                    <button onclick="app.deleteLogbookEntry('${entry.id}', event)" class="text-red-600 hover:text-red-800 p-1">
                                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-4 text-sm">
                                <div class="flex items-center space-x-1">
                                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                                    <span>${entry.departure}</span>
                                </div>
                                <span>→</span>
                                <div class="flex items-center space-x-1">
                                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                                    <span>${entry.arrival}</span>
                                </div>
                            </div>
                            
                            <div class="flex items-center justify-between text-xs text-gray-600 mt-2">
                                <div class="flex items-center space-x-4">
                                    <div class="flex items-center space-x-1">
                                        <i data-lucide="clock" class="w-3 h-3"></i>
                                        <span>${this.formatTime(entry.departureTime)}</span>
                                    </div>
                                    <span>•</span>
                                    <span>${entry.aircraft}</span>
                                </div>
                                <span>Saved ${this.formatSavedTime(entry.savedAt)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        lucide.createIcons();
        
        // Auto-select first entry if none selected
        if (!this.selectedLogbookEntry && this.logbookEntries.length > 0) {
            this.selectLogbookEntry(this.logbookEntries[0].id);
        }
    }

    selectLogbookEntry(entryId) {
        this.selectedLogbookEntry = entryId;
        this.renderLogbook();
        
        const entry = this.logbookEntries.find(e => e.id === entryId);
        if (entry) {
            this.showLogbookDetails(entry);
        }
    }

    showLogbookDetails(entry) {
        const container = document.getElementById('logbook-details');
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-semibold">${entry.callsign}</h2>
                    <p class="text-gray-600">${entry.aircraft}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="inline-block px-3 py-1 text-sm font-medium text-white rounded status-${entry.status}">
                        ${entry.status}
                    </span>
                    <button onclick="app.deleteLogbookEntry('${entry.id}')" class="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                        <i data-lucide="trash-2" class="w-4 h-4 mr-1"></i>
                        Delete
                    </button>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Save Information -->
                <div class="bg-gray-50 rounded-lg border p-4">
                    <h3 class="text-lg font-medium mb-2">Logbook Entry</h3>
                    <div class="text-sm text-gray-600">
                        Saved on ${this.formatSavedTime(entry.savedAt)}
                    </div>
                </div>

                <!-- Route Information -->
                <div class="bg-white rounded-lg border shadow-sm p-4">
                    <h3 class="text-lg font-medium mb-3">Route</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <div class="text-sm text-gray-600">Departure</div>
                            <div class="font-medium">${entry.departure}</div>
                            <div class="text-sm text-gray-600">${this.formatTime(entry.departureTime)}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Arrival</div>
                            <div class="font-medium">${entry.arrival}</div>
                            <div class="text-sm text-gray-600">${this.formatTime(entry.arrivalTime)}</div>
                        </div>
                    </div>
                    <hr class="my-3">
                    <div>
                        <div class="text-sm text-gray-600 mb-1">Flight Route</div>
                        <div class="text-sm font-mono bg-gray-100 p-2 rounded">${entry.route}</div>
                    </div>
                </div>

                <!-- Flight Details -->
                <div class="bg-white rounded-lg border shadow-sm p-4">
                    <h3 class="text-lg font-medium mb-3">Flight Details</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-gray-600">Cruise Altitude</div>
                            <div class="font-medium">${entry.altitude.toLocaleString()} ft</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Distance</div>
                            <div class="font-medium">${entry.distance} nm</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Duration</div>
                            <div class="font-medium">${entry.duration}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Fuel Required</div>
                            <div class="font-medium">${entry.fuel.toLocaleString()} lbs</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        lucide.createIcons();
    }

    deleteLogbookEntry(entryId, event = null) {
        if (event) {
            event.stopPropagation();
        }
        
        this.logbookEntries = this.logbookEntries.filter(e => e.id !== entryId);
        this.saveLogbookToStorage();
        
        // If deleted entry was selected, clear selection
        if (this.selectedLogbookEntry === entryId) {
            this.selectedLogbookEntry = null;
            document.getElementById('logbook-details').innerHTML = `
                <div class="flex items-center justify-center h-full text-center text-gray-500">
                    <div>
                        <i data-lucide="plane" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                        <p>Select a logbook entry to view details</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
        }
        
        this.renderLogbook();
        this.showToast('Logbook entry deleted', 'success');
    }

    clearLogbook() {
        if (confirm('Are you sure you want to clear all logbook entries? This action cannot be undone.')) {
            this.logbookEntries = [];
            this.selectedLogbookEntry = null;
            this.saveLogbookToStorage();
            this.renderLogbook();
            document.getElementById('logbook-details').innerHTML = `
                <div class="flex items-center justify-center h-full text-center text-gray-500">
                    <div>
                        <i data-lucide="plane" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                        <p>Select a logbook entry to view details</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
            this.showToast('Logbook cleared', 'success');
        }
    }

    // Settings functionality
    saveSettings() {
        const settings = {
            notifications: document.getElementById('notifications').checked,
            darkMode: document.getElementById('dark-mode').checked,
            autoSave: document.getElementById('auto-save').checked,
            liveUpdates: document.getElementById('live-updates').checked,
            soundAlerts: document.getElementById('sound-alerts').checked
        };
        
        localStorage.setItem('aviationSettings', JSON.stringify(settings));
        this.showToast('Settings saved successfully', 'success');
    }

    // Utility functions
    formatTime(isoString) {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    formatSavedTime(isoString) {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize the application
const app = new AviationApp();