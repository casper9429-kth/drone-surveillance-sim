const CONFIG = {
    NUM_DRONES: 4,
    NUM_BUILDINGS: 12,
    DRONE_SPEED: 1.8,
    FOV_WIDTH_DEG: 80,
    FOV_LENGTH: 130,
    TURN_CHANCE: 0.05,
    MAX_TURN_ANGLE: 0.3,
    TARGET_DISTANCE: 50,
    SENSOR_PROBABILITY: 0.15,
    SENSOR_FOV_WIDTH_DEG: 90,
    SENSOR_FOV_LENGTH: 70,
    SCAN_DURATION_MS: 3000
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
        // Generate buildings
        for (let i = 0; i < CONFIG.NUM_BUILDINGS; i++) {
            const w = 30 + Math.random() * 50;
            const h = 25 + Math.random() * 35;
            this.buildings.push({
                x: Math.random() * (this.width - w - 100) + 50,
                y: Math.random() * (this.height - h - 100) + 50,
                width: w,
                height: h,
                type: ['Power', 'Control', 'Storage', 'Security'][Math.floor(Math.random() * 4)]
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
        // Clear screen
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw trails
        this.trails.forEach(trail => {
            if (trail.length < 2) return;
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let i = 0; i < trail.length - 1; i++) {
                this.ctx.globalAlpha = (i / trail.length) * 0.3;
                if (i === 0) this.ctx.moveTo(trail[i].x, trail[i].y);
                else this.ctx.lineTo(trail[i].x, trail[i].y);
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw buildings
        this.buildings.forEach(b => {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
            this.ctx.strokeStyle = '#666';
            this.ctx.strokeRect(b.x, b.y, b.width, b.height);
            
            // Label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(b.type, b.x + b.width/2, b.y + b.height/2);
        });
        
        // Draw sensors and drones
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
        // FOV
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.fovDistance, 
               this.angle - this.fovAngle / 2, 
               this.angle + this.fovAngle / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Drone body
        let color = '#00f';
        if (this.isTracking) color = '#0f0';
        else if (this.isInvestigating) color = this.scanStart ? '#f0f' : '#f80';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * (this.size + 6),
            this.y + Math.sin(this.angle) * (this.size + 6)
        );
        ctx.stroke();
        
        // ID
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.id, this.x, this.y - this.size - 5);
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
        this.pulse += 0.1;
        const pulseSize = Math.sin(this.pulse) * 5 + 10;
        
        // FOV
        ctx.save();
        ctx.globalAlpha = this.isAlerting ? 0.5 : 0.2;
        ctx.fillStyle = this.isAlerting ? '#f00' : '#080';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.fovDistance, 
               this.angle - this.fovAngle / 2, 
               this.angle + this.fovAngle / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Pulse
        ctx.strokeStyle = this.isAlerting ? '#f00' : '#0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Sensor body
        ctx.fillStyle = this.isAlerting ? '#f00' : '#0f0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    new City(canvas);
});
