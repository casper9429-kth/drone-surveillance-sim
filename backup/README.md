# Drone City Simulation

A JavaScript-based web simulation featuring drones flying over a randomly generated city with a top-down view.

## Features

- **Random City Generation**: Each reload creates a new city layout with:
  - Random rectangular houses in various brown shades
  - Polyline fences scattered throughout the city
  
- **Intelligent Drones**: Multiple drones that:
  - Fly autonomously around the city
  - Display field of view (FOV) cones
  - Have realistic movement patterns
  - Come in different colors for easy identification

- **Interactive Controls**:
  - Pause/Resume simulation
  - Reset city layout
  - Adjust drone speed (0.5x to 5x)
  - Change number of drones (1-10)

## How to Run

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. The simulation will start automatically

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and responsive design
- `script.js` - Simulation logic and drone AI

## Controls

- **Pause Button**: Pause/resume the simulation
- **Reset Button**: Generate a new random city layout
- **Speed Slider**: Control how fast the drones move
- **Drone Count Slider**: Change the number of active drones

## Technical Details

- Pure JavaScript (no external dependencies)
- HTML5 Canvas for rendering
- Object-oriented design with City and Drone classes
- Responsive design that works on desktop and mobile
- 60 FPS smooth animation

## Browser Compatibility

Works in all modern browsers that support HTML5 Canvas and ES6 classes.

Enjoy watching the drones explore your randomly generated city!
