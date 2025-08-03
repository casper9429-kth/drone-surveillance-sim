const CONFIG = {
    NUM_DRONES: 4,
    NUM_BUILDINGS: 12,
    DRONE_SPEED: 1.8,
    FOV_WIDTH_DEG: 85, // Wider FOV for better surveillance coverage
    FOV_LENGTH: 140,   // Extended range for thermal/night vision capability
    TURN_CHANCE: 0.04, // More focused patrol patterns
    MAX_TURN_ANGLE: 0.25,
    TARGET_DISTANCE: 45,
    SENSOR_PROBABILITY: 0.18, // More sensors for critical infrastructure
    SENSOR_FOV_WIDTH_DEG: 95,
    SENSOR_FOV_LENGTH: 80,
    SCAN_DURATION_MS: 4000 // Longer scan time for thorough inspection
};

class City {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        
        this.buildings = [];
        this.drones = [];
        this.sensors = [];
        this.trails = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.alertCount = 0;
        this.totalAlerts = 0;
        
        this.setupEvents();
        this.generate();
        this.animate();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Complete simulation reload on resize
        if (this.buildings && this.buildings.length > 0) {
            this.buildings = [];
            this.drones = [];
            this.sensors = [];
            this.trails = [];
            this.alertCount = 0;
            this.totalAlerts = 0;
            this.generate();
        }
    }
    
    setupEvents() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.sendDrone(x, y);
        });
        
        // Touch events
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
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
            this.sendDrone(this.mouseX, this.mouseY);
        });
    }
    
    generate() {
        // Generate buildings (critical infrastructure)
        for (let i = 0; i < CONFIG.NUM_BUILDINGS; i++) {
            const w = 35 + Math.random() * 45;
            const h = 30 + Math.random() * 40;
            this.buildings.push({
                x: Math.random() * (this.width - w - 100) + 50,
                y: Math.random() * (this.height - h - 100) + 50,
                width: w,
                height: h,
                type: ['Power Grid', 'Control Center', 'Data Center', 'Security Hub', 'Comm Tower', 'Storage'][Math.floor(Math.random() * 6)]
            });
        }
        
        // Generate sensors
        this.buildings.forEach(building => {
            const corners = [
                { x: building.x, y: building.y, angle: Math.PI * 1.25 },
                { x: building.x + building.width, y: building.y, angle: Math.PI * 1.75 },
                { x: building.x, y: building.y + building.height, angle: Math.PI * 0.75 },
                { x: building.x + building.width, y: building.y + building.height, angle: Math.PI * 0.25 }
            ];
            
            corners.forEach(corner => {
                if (Math.random() < CONFIG.SENSOR_PROBABILITY) {
                    this.sensors.push(new Sensor(corner.x, corner.y, corner.angle));
                }
            });
        });
        
        // Generate drones
        for (let i = 0; i < CONFIG.NUM_DRONES; i++) {
            this.drones.push(new Drone(
                Math.random() * this.width,
                Math.random() * this.height,
                this.width,
                this.height,
                i
            ));
            this.trails[i] = [];
        }
    }
    
    sendDrone(x, y) {
        const closest = this.findClosestDrone(x, y);
        if (closest) closest.investigate(x, y);
    }
    
    findClosestDrone(x, y) {
        let closest = null;
        let minDist = Infinity;
        
        this.drones.forEach(drone => {
            if (!drone.isTracking) {
                const dx = drone.x - x;
                const dy = drone.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = drone;
                }
            }
        });
        
        return closest;
    }
    
    update() {
        // Update trails
        this.drones.forEach((drone, i) => {
            this.trails[i].push({ x: drone.x, y: drone.y });
            if (this.trails[i].length > 50) this.trails[i].shift();
        });
        
        // Check sensors
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
        
        if (currentAlerts > 0 && this.alertCount === 0) {
            this.totalAlerts++;
        }
        this.alertCount = currentAlerts;
        
        if (alertSensor) {
            const closest = this.findClosestDrone(alertSensor.x, alertSensor.y);
            if (closest) closest.investigateSensor(alertSensor);
        }
        
        this.drones.forEach(drone => drone.update(this.mouseX, this.mouseY));
    }
    
    draw() {
        // Subtle dark background for minimalistic design
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Very subtle drone trails
        this.trails.forEach((trail, droneIndex) => {
            if (trail.length < 2) return;
            
            const drone = this.drones[droneIndex];
            let trailColor = 'rgba(60, 120, 180, 0.08)'; // Subtle patrol trail
            
            if (drone && drone.isTracking) {
                trailColor = 'rgba(80, 180, 120, 0.12)'; // Subtle tracking trail
            } else if (drone && drone.isInvestigating) {
                trailColor = 'rgba(180, 120, 60, 0.1)'; // Subtle investigation trail
            }
            
            this.ctx.strokeStyle = trailColor;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            
            for (let i = 0; i < trail.length - 1; i++) {
                this.ctx.globalAlpha = (i / trail.length) * 0.2;
                if (i === 0) this.ctx.moveTo(trail[i].x, trail[i].y);
                else this.ctx.lineTo(trail[i].x, trail[i].y);
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        });
        
        // Minimal buildings (critical infrastructure)
        this.buildings.forEach(b => {
            // Very subtle building styling
            this.ctx.fillStyle = '#151515';
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
            
            // Minimal border
            this.ctx.strokeStyle = '#222';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(b.x, b.y, b.width, b.height);
            
            // No building labels for minimal design
        });
        
        // Draw sensors and drones with reduced intensity
        this.sensors.forEach(s => s.draw(this.ctx));
        this.drones.forEach(d => d.draw(this.ctx));
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
        this.speed = CONFIG.DRONE_SPEED;
        this.size = 8;
        this.fovAngle = (CONFIG.FOV_WIDTH_DEG * Math.PI) / 180;
        this.fovDistance = CONFIG.FOV_LENGTH;
        this.targetDistance = CONFIG.TARGET_DISTANCE;
        this.isTracking = false;
        this.isInvestigating = false;
        this.target = null;
        this.scanStart = null;
    }
    
    update(mouseX, mouseY) {
        const mouseInFOV = this.isMouseInFOV(mouseX, mouseY);
        
        if (mouseInFOV) {
            this.isTracking = true;
            this.isInvestigating = false;
            this.target = null;
            this.centerMouse(mouseX, mouseY);
        } else if (this.isTracking) {
            this.isTracking = false;
            this.speed = CONFIG.DRONE_SPEED;
        } else if (this.isInvestigating && this.target) {
            this.moveToTarget();
        } else if (Math.random() < CONFIG.TURN_CHANCE) {
            this.angle += (Math.random() - 0.5) * CONFIG.MAX_TURN_ANGLE;
        }
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // Bounce off walls
        if (this.x <= this.size || this.x >= this.worldWidth - this.size) {
            this.angle = Math.PI - this.angle;
            this.x = Math.max(this.size, Math.min(this.worldWidth - this.size, this.x));
            this.reset();
        }
        if (this.y <= this.size || this.y >= this.worldHeight - this.size) {
            this.angle = -this.angle;
            this.y = Math.max(this.size, Math.min(this.worldHeight - this.size, this.y));
            this.reset();
        }
    }
    
    reset() {
        this.isTracking = false;
        this.isInvestigating = false;
        this.scanStart = null;
        this.speed = CONFIG.DRONE_SPEED;
    }
    
    investigate(x, y) {
        if (!this.isTracking) {
            this.isInvestigating = true;
            this.scanStart = null;
            const dx = x - this.x;
            const dy = y - this.y;
            this.target = { x, y, alignAngle: Math.atan2(dy, dx) };
        }
    }
    
    investigateSensor(sensor) {
        if (!this.isTracking) {
            this.isInvestigating = true;
            this.scanStart = null;
            const distance = this.targetDistance;
            const targetX = sensor.x - Math.cos(sensor.angle) * distance;
            const targetY = sensor.y - Math.sin(sensor.angle) * distance;
            this.target = { x: targetX, y: targetY, alignAngle: sensor.angle };
        }
    }
    
    moveToTarget() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 15) {
            this.angle = this.target.alignAngle;
            this.speed = 0;
            
            if (this.scanStart === null) {
                this.scanStart = Date.now();
            }
            
            const elapsed = Date.now() - this.scanStart;
            if (elapsed >= CONFIG.SCAN_DURATION_MS) {
                this.isInvestigating = false;
                this.target = null;
                this.scanStart = null;
                this.speed = CONFIG.DRONE_SPEED;
            }
        } else {
            this.angle = Math.atan2(dy, dx);
            this.speed = CONFIG.DRONE_SPEED;
        }
    }
    
    centerMouse(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseAngle = Math.atan2(dy, dx);
        
        let angleError = mouseAngle - this.angle;
        while (angleError > Math.PI) angleError -= 2 * Math.PI;
        while (angleError < -Math.PI) angleError += 2 * Math.PI;
        
        if (Math.abs(angleError) > 0.1) {
            const turnDirection = angleError > 0 ? 1 : -1;
            this.angle += turnDirection * CONFIG.MAX_TURN_ANGLE;
        }
        
        if (distance > this.targetDistance + 10) {
            this.speed = CONFIG.DRONE_SPEED;
        } else if (distance < this.targetDistance - 10) {
            this.speed = -CONFIG.DRONE_SPEED;
        } else {
            this.speed = 0;
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
        // Minimal FOV with very subtle visibility
        ctx.save();
        ctx.globalAlpha = this.isTracking ? 0.06 : 0.03;
        
        // Subtle gradient FOV
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.fovDistance);
        gradient.addColorStop(0, this.isTracking ? '#4a9eff' : '#3a7acc');
        gradient.addColorStop(0.7, this.isTracking ? '#2a6ecc' : '#2a5599');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.fovDistance, 
               this.angle - this.fovAngle / 2, 
               this.angle + this.fovAngle / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Minimal drone design
        let color = '#4a7cb8'; // Subtle patrol blue
        if (this.isTracking) color = '#5bb85c'; // Subtle target lock green
        else if (this.isInvestigating) {
            color = this.scanStart ? '#b85c5c' : '#b8925c'; // Subtle scanning/moving colors
        }
        
        // Simple drone body without glow effects
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimal inner core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size - 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Center dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimal direction indicator
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * (this.size + 4),
            this.y + Math.sin(this.angle) * (this.size + 4)
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Remove drone ID and status text for minimal design
    }
}

class Sensor {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.fovAngle = (CONFIG.SENSOR_FOV_WIDTH_DEG * Math.PI) / 180;
        this.fovDistance = CONFIG.SENSOR_FOV_LENGTH;
        this.isAlerting = false;
        this.size = 4;
        this.pulse = 0;
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
        this.pulse += 0.05; // Slower pulse for minimal effect
        const pulseSize = Math.sin(this.pulse) * 4 + 8;
        
        // Very subtle sensor FOV
        ctx.save();
        ctx.globalAlpha = this.isAlerting ? 0.15 : 0.06;
        
        // Minimal gradient FOV for sensors
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.fovDistance);
        gradient.addColorStop(0, this.isAlerting ? '#cc6666' : '#66aa66');
        gradient.addColorStop(0.8, this.isAlerting ? '#994444' : '#447744');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.fovDistance, 
               this.angle - this.fovAngle / 2, 
               this.angle + this.fovAngle / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Minimal pulse effect
        ctx.save();
        ctx.globalAlpha = this.isAlerting ? 0.3 : 0.15;
        ctx.strokeStyle = this.isAlerting ? '#cc6666' : '#66aa66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // Simple sensor body without glow
        ctx.fillStyle = this.isAlerting ? '#cc6666' : '#66aa66';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimal inner sensor core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Center dot
        ctx.fillStyle = this.isAlerting ? '#cc6666' : '#66aa66';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    new City(canvas);
});
