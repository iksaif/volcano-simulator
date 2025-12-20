// Global configuration constants

export const Config = {
  // Grid dimensions
  GRID_WIDTH: 128,
  GRID_HEIGHT: 128,

  // Display
  PIXEL_SCALE: 4, // Canvas CSS scaling
  TARGET_FPS: 60, // Rendering framerate
  WEBGL_RENDER_WIDTH: 512, // Internal render resolution for WebGL (4x super-sampling)
  WEBGL_RENDER_HEIGHT: 512,

  // Physics
  PHYSICS_FPS: 20, // Physics update rate (can be different from render rate)
  GRAVITY: 0.98,
  THERMAL_DIFFUSION_RATE: 0.01, // Reduced from 0.05 for slower cooling
  ABSOLUTE_MIN_TEMPERATURE: -273, // Absolute zero in Celsius
  ROOM_TEMPERATURE: 20, // Standard room temperature
  MAX_TEMPERATURE: 5000,

  // Materials
  LAVA_SOLIDIFY_TEMP: 800,
  WATER_BOIL_TEMP: 100,

  // Interaction
  DEFAULT_INJECTION_RATE: 0.5, // Reduced from 2 for slower injection
  DEFAULT_BRUSH_SIZE: 2,
  MAX_BRUSH_SIZE: 10,

  // Performance
  ENABLE_DIRTY_RECT: false, // Enable for 256x256
  CHUNK_SIZE: 32,
} as const;
