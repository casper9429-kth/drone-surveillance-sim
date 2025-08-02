const CONFIG = {
    NUM_DRONES: 5,
    NUM_BUILDINGS: 20,
    DRONE_SPEED: 2,
    FOV_WIDTH_DEG: 80,
    FOV_LENGTH: 150,
    TURN_CHANCE: 0.05,
    MAX_TURN_ANGLE: 0.3,
    TARGET_DISTANCE: 60,
    // Sensor config
    SENSOR_PROBABILITY: 0.15,
    SENSOR_FOV_WIDTH_DEG: 90,
    SENSOR_FOV_LENGTH: 80,
    SCAN_DURATION_MS: 3000, // Time to scan at sensor location
    
    // Mobile optimizations
    getMobileConfig() {
        const isMobile = window.innerWidth <= 768;
        return {
            NUM_DRONES: isMobile ? 3 : 5,
            NUM_BUILDINGS: isMobile ? 12 : 20,
            DRONE_SPEED: isMobile ? 1.5 : 2,
            FOV_LENGTH: isMobile ? 100 : 150,
            TARGET_DISTANCE: isMobile ? 40 : 60,
            SENSOR_FOV_LENGTH: isMobile ? 60 : 80
        };
    }
};

class City {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Make canvas responsive
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.houses = [];
        this.drones = [];
        this.sensors = [];
        this.droneTrails = []; // Store trail points for each drone
        this.mouseX = 0;
        this.mouseY = 0;
        this.alertCount = 0;
        this.totalAlerts = 0;
        this.scanCoverage = 0;
        
        this.setupMouse();
        this.setupTouch();
        this.setupClickToInvestigate();
        this.generateCity();
        this.generateSensors();
        this.initializeDrones();
        this.animate();
    }
    
    resizeCanvas() {
        // Set canvas size to fit viewport
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Regenerate content if dimensions changed significantly and arrays exist
        if (this.houses && this.houses.length > 0) {
            this.houses = [];
            this.sensors = [];
            this.generateCity();
            this.generateSensors();
        }
    }
    
    setupMouse() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
    }
    
    setupTouch() {
        // Add touch support for mobile devices
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        });
    }
    
    setupClickToInvestigate() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // Send closest available drone to investigate clicked location
            const closestDrone = this.findClosestDrone(clickX, clickY);
            if (closestDrone) {
                closestDrone.investigatePosition(clickX, clickY);
            }
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const clickX = touch.clientX - rect.left;
            const clickY = touch.clientY - rect.top;
            
            // Send closest available drone to investigate touched location
            const closestDrone = this.findClosestDrone(clickX, clickY);
            if (closestDrone) {
                closestDrone.investigatePosition(clickX, clickY);
            }
        });
    }
    
    generateCity() {
        const mobileConfig = CONFIG.getMobileConfig();
        for (let i = 0; i < mobileConfig.NUM_BUILDINGS; i++) {
            this.houses.push({
                x: Math.random() * (this.width - 80) + 40,
                y: Math.random() * (this.height - 80) + 40,
                width: 30 + Math.random() * 40,
                height: 30 + Math.random() * 40
            });
        }
    }
    
    generateSensors() {
        this.houses.forEach(house => {
            // Check each corner of the building
            const corners = [
                { x: house.x, y: house.y, angle: Math.PI * 1.25 },           // Top-left
                { x: house.x + house.width, y: house.y, angle: Math.PI * 1.75 },     // Top-right
                { x: house.x, y: house.y + house.height, angle: Math.PI * 0.75 },    // Bottom-left
                { x: house.x + house.width, y: house.y + house.height, angle: Math.PI * 0.25 } // Bottom-right
            ];
            
            corners.forEach(corner => {
                if (Math.random() < CONFIG.SENSOR_PROBABILITY) {
                    this.sensors.push(new Sensor(corner.x, corner.y, corner.angle));
                }
            });
        });
    }
    
    initializeDrones() {
        const mobileConfig = CONFIG.getMobileConfig();
        for (let i = 0; i < mobileConfig.NUM_DRONES; i++) {
            this.drones.push(new Drone(
                Math.random() * this.width,
                Math.random() * this.height,
                this.width,
                this.height,
                i
            ));
            // Initialize trail array for each drone
            this.droneTrails[i] = [];
        }
    }
    
    draw() {
        // Dark surveillance background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw drone trails first (behind everything)
        this.drawDroneTrails();
        
        // Draw buildings
        this.ctx.fillStyle = '#2a2a2a';
        this.houses.forEach(h => {
            this.ctx.fillRect(h.x, h.y, h.width, h.height);
            // Add building outline
            this.ctx.strokeStyle = '#404040';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(h.x, h.y, h.width, h.height);
        });
        
        this.sensors.forEach(sensor => sensor.draw(this.ctx));
        this.drones.forEach(drone => drone.draw(this.ctx));
        
        // Update dashboard
        this.updateDashboard();
    }
    
    drawDroneTrails() {
        this.droneTrails.forEach((trail, droneIndex) => {
            if (trail.length < 2) return;
            
            this.ctx.strokeStyle = `rgba(0, 255, 0, 0.3)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            for (let i = 0; i < trail.length - 1; i++) {
                const alpha = (i / trail.length) * 0.3; // Fade effect
                this.ctx.globalAlpha = alpha;
                
                if (i === 0) {
                    this.ctx.moveTo(trail[i].x, trail[i].y);
                } else {
                    this.ctx.lineTo(trail[i].x, trail[i].y);
                }
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1; // Reset alpha
        });
    }
    
    updateDashboard() {
        // Update drone count
        document.getElementById('droneCount').textContent = this.drones.length;
        
        // Update alert count
        document.getElementById('alertCount').textContent = this.totalAlerts;
        
        // Calculate coverage (simplified - based on drone movement)
        const activePercent = Math.min(100, Math.floor((this.totalAlerts + this.drones.filter(d => d.isTracking || d.isInvestigating).length * 10)));
        document.getElementById('coveragePercent').textContent = activePercent + '%';
        
        // Update status
        const investigating = this.drones.filter(d => d.isInvestigating).length;
        const tracking = this.drones.filter(d => d.isTracking).length;
        let status = 'PATROL';
        if (tracking > 0) status = 'TRACKING';
        if (investigating > 0) status = 'INVESTIGATING';
        document.getElementById('systemStatus').textContent = status;
    }
    
    update() {
        // Update drone trails
        this.drones.forEach((drone, index) => {
            // Add current position to trail
            this.droneTrails[index].push({ x: drone.x, y: drone.y, time: Date.now() });
            
            // Keep trail length manageable (last 50 points)
            if (this.droneTrails[index].length > 50) {
                this.droneTrails[index].shift();
            }
        });
        
        // Check sensors for mouse detection
        let alertSensor = null;
        let currentAlerts = 0;
        this.sensors.forEach(sensor => {
            if (sensor.detectsMouse(this.mouseX, this.mouseY)) {
                alertSensor = sensor;
                sensor.isAlerting = true;
                currentAlerts++;
            } else {
                sensor.isAlerting = false;
            }
        });
        
        // Update total alerts counter
        if (currentAlerts > 0 && this.alertCount === 0) {
            this.totalAlerts++;
        }
        this.alertCount = currentAlerts;
        
        // If sensor detects mouse, send closest drone to investigate
        if (alertSensor) {
            const closestDrone = this.findClosestDrone(alertSensor.x, alertSensor.y);
            if (closestDrone) {
                closestDrone.investigateSensor(alertSensor);
            }
        }
        
        this.drones.forEach(drone => drone.update(this.mouseX, this.mouseY));
    }
    
    findClosestDrone(x, y) {
        let closest = null;
        let closestDistance = Infinity;
        
        this.drones.forEach(drone => {
            if (!drone.isTracking) { // Only available drones
                const dx = drone.x - x;
                const dy = drone.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closest = drone;
                }
            }
        });
        
        return closest;
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

class Drone {
    constructor(x, y, worldWidth, worldHeight, id) {
        this.x = x;
        this.y = y;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.id = id;
        this.angle = Math.random() * Math.PI * 2;
        
        // Use mobile-responsive config
        const mobileConfig = CONFIG.getMobileConfig();
        this.speed = mobileConfig.DRONE_SPEED;
        this.size = 8;
        this.fovAngle = (CONFIG.FOV_WIDTH_DEG * Math.PI) / 180;
        this.fovDistance = mobileConfig.FOV_LENGTH;
        this.targetDistance = mobileConfig.TARGET_DISTANCE;
        
        this.isTracking = false;
        this.isInvestigating = false;
        this.investigateTarget = null;
        this.scanStartTime = null;
    }
    
    update(mouseX, mouseY) {
        const mouseInFOV = this.isMouseInFOV(mouseX, mouseY);
        
        if (mouseInFOV) {
            this.isTracking = true;
            this.isInvestigating = false;
            this.investigateTarget = null;
            this.centerMouse(mouseX, mouseY);
        } else if (this.isTracking) {
            this.isTracking = false;
            this.speed = CONFIG.getMobileConfig().DRONE_SPEED;
        } else if (this.isInvestigating && this.investigateTarget) {
            this.moveToTarget();
        } else if (Math.random() < CONFIG.TURN_CHANCE) {
            this.angle += (Math.random() - 0.5) * CONFIG.MAX_TURN_ANGLE;
        }
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        if (this.x <= this.size || this.x >= this.worldWidth - this.size) {
            this.angle = Math.PI - this.angle;
            this.x = Math.max(this.size, Math.min(this.worldWidth - this.size, this.x));
            this.isTracking = false;
            this.isInvestigating = false;
            this.scanStartTime = null;
            this.speed = CONFIG.getMobileConfig().DRONE_SPEED;
        }
        if (this.y <= this.size || this.y >= this.worldHeight - this.size) {
            this.angle = -this.angle;
            this.y = Math.max(this.size, Math.min(this.worldHeight - this.size, this.y));
            this.isTracking = false;
            this.isInvestigating = false;
            this.scanStartTime = null;
            this.speed = CONFIG.getMobileConfig().DRONE_SPEED;
        }
    }
    
    investigateSensor(sensor) {
        if (!this.isTracking) {
            this.isInvestigating = true;
            this.scanStartTime = null; // Reset scan timer
            // Calculate position where drone FOV center aligns with sensor FOV center
            const distance = this.targetDistance;
            const targetX = sensor.x - Math.cos(sensor.angle) * distance;
            const targetY = sensor.y - Math.sin(sensor.angle) * distance;
            this.investigateTarget = { 
                x: targetX, 
                y: targetY, 
                alignAngle: sensor.angle 
            };
        }
    }
    
    investigatePosition(x, y) {
        if (!this.isTracking) {
            this.isInvestigating = true;
            this.scanStartTime = null;
            // Calculate angle to face the clicked position
            const dx = x - this.x;
            const dy = y - this.y;
            const angleToTarget = Math.atan2(dy, dx);
            
            this.investigateTarget = {
                x: x,
                y: y,
                alignAngle: angleToTarget
            };
        }
    }
    
    moveToTarget() {
        const dx = this.investigateTarget.x - this.x;
        const dy = this.investigateTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 15) {
            // Arrived at position, now align angle with sensor and start scanning
            this.angle = this.investigateTarget.alignAngle;
            this.speed = 0;
            
            // Start scan timer if not already started
            if (this.scanStartTime === null) {
                this.scanStartTime = Date.now();
            }
            
            // Check if scan duration is complete
            const elapsed = Date.now() - this.scanStartTime;
            if (elapsed >= CONFIG.SCAN_DURATION_MS) {
                // Scanning complete, return to patrol
                this.isInvestigating = false;
                this.investigateTarget = null;
                this.scanStartTime = null;
                this.speed = CONFIG.getMobileConfig().DRONE_SPEED;
            }
        } else {
            // Move toward target position
            this.angle = Math.atan2(dy, dx);
            this.speed = this.constructor.prototype.speed || CONFIG.getMobileConfig().DRONE_SPEED;
        }
    }
    
    centerMouse(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseAngle = Math.atan2(dy, dx);
        
        // Calculate angle error
        let angleError = mouseAngle - this.angle;
        while (angleError > Math.PI) angleError -= 2 * Math.PI;
        while (angleError < -Math.PI) angleError += 2 * Math.PI;
        
        // Turn to center mouse (only if not already centered)
        if (Math.abs(angleError) > 0.1) {
            const turnDirection = angleError > 0 ? 1 : -1;
            this.angle += turnDirection * CONFIG.MAX_TURN_ANGLE;
        }
        
        // Distance control: move at max speed or stop
        if (distance > this.targetDistance + 10) {
            this.speed = CONFIG.getMobileConfig().DRONE_SPEED; // Move forward
        } else if (distance < this.targetDistance - 10) {
            this.speed = -CONFIG.getMobileConfig().DRONE_SPEED; // Back up
        } else {
            this.speed = 0; // Stay still
        }
    }
    
    isMouseInFOV(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.fovDistance) return false;
        
        const mouseAngle = Math.atan2(dy, dx);
        let angleDiff = mouseAngle - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        return Math.abs(angleDiff) <= this.fovAngle / 2;
    }
    
    draw(ctx) {
        this.drawFOV(ctx);
        
        let color = '#ff0000'; // Default red
        if (this.isTracking) {
            if (this.speed > 0) color = '#00ff00';      // Green: moving forward
            else if (this.speed < 0) color = '#0080ff'; // Blue: backing up  
            else color = '#ffff00';                     // Yellow: staying still
        } else if (this.isInvestigating) {
            if (this.scanStartTime !== null) {
                color = '#9933ff';                      // Purple: scanning
            } else {
                color = '#ff8800';                      // Orange: moving to investigate
            }
        }
        
        // Add glowing effect
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size - 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Direction indicator
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * (this.size + 8),
            this.y + Math.sin(this.angle) * (this.size + 8)
        );
        ctx.stroke();
        
        // Add drone ID for debugging
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.id, this.x, this.y - this.size - 5);
    }
    
    drawFOV(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.fovDistance, 
               this.angle - this.fovAngle / 2, 
               this.angle + this.fovAngle / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class Sensor {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.fovAngle = (CONFIG.SENSOR_FOV_WIDTH_DEG * Math.PI) / 180;
        this.fovDistance = CONFIG.getMobileConfig().SENSOR_FOV_LENGTH;
        this.isAlerting = false;
        this.size = 4;
        this.pulseRadius = 0;
        this.pulseTime = 0;
    }
    
    detectsMouse(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.fovDistance) return false;
        
        const mouseAngle = Math.atan2(dy, dx);
        let angleDiff = mouseAngle - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        return Math.abs(angleDiff) <= this.fovAngle / 2;
    }
    
    draw(ctx) {
        // Update pulse animation
        if (this.isAlerting) {
            this.pulseTime += 0.1;
            this.pulseRadius = Math.sin(this.pulseTime) * 20 + 25;
        } else {
            this.pulseTime += 0.05;
            this.pulseRadius = Math.sin(this.pulseTime) * 5 + 10;
        }
        
        // Draw pulse effect
        ctx.save();
        ctx.globalAlpha = this.isAlerting ? 0.6 : 0.3;
        ctx.strokeStyle = this.isAlerting ? '#ff0000' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // Draw FOV cone
        ctx.save();
        ctx.globalAlpha = this.isAlerting ? 0.5 : 0.2;
        ctx.fillStyle = this.isAlerting ? '#ff0000' : '#004400';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.fovDistance, 
               this.angle - this.fovAngle / 2, 
               this.angle + this.fovAngle / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Draw sensor body
        ctx.fillStyle = this.isAlerting ? '#ff0000' : '#00ff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw sensor outline
        ctx.strokeStyle = this.isAlerting ? '#ffffff' : '#008800';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add glowing effect for active sensors
        if (this.isAlerting) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('cityCanvas');
    new City(canvas);
});
