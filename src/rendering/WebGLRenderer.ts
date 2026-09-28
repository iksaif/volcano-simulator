// WebGL renderer with smooth, game-like rendering

import { Renderer } from './Renderer';
import { Grid } from '../core/Grid';
import { Cell } from '../core/Cell';
import { Config } from '../app/Config';

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private textureData: Uint8Array;
  private materialData: Uint8Array;
  private texture: WebGLTexture;
  private materialTexture: WebGLTexture;
  private gridWidth: number;   // Physics grid size
  private gridHeight: number;  // Physics grid size
  private renderWidth: number; // Internal render resolution
  private renderHeight: number; // Internal render resolution
  private time: number = 0;

  // Vertex buffer
  private positionBuffer: WebGLBuffer;

  // 2D overlay above the WebGL canvas for the cursor and velocity arrows
  private overlay: Renderer | null;

  /**
   * @param overlayCanvas - Optional canvas stacked above this one for 2D overlays
   */
  constructor(
    canvas: HTMLCanvasElement,
    gridWidth: number,
    gridHeight: number,
    overlayCanvas?: HTMLCanvasElement
  ) {
    this.overlay = overlayCanvas
      ? new Renderer(overlayCanvas, gridWidth, gridHeight, 4, true)
      : null;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.renderWidth = Config.WEBGL_RENDER_WIDTH;
    this.renderHeight = Config.WEBGL_RENDER_HEIGHT;

    // Get WebGL2 context
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      depth: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      // Provide detailed debugging information
      console.error('❌ Failed to create WebGL2 context');
      console.log('🔍 WebGL Debug Information:');

      // Check if WebGL1 is available
      const webgl1 = canvas.getContext('webgl');
      console.log('  • WebGL 1.0 available:', webgl1 !== null);

      // Check canvas state
      console.log('  • Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('  • Canvas in DOM:', document.body.contains(canvas));

      // Check if canvas already has a context
      const existingContext = (canvas as any).getContext('2d');
      if (existingContext) {
        console.warn('  ⚠️  Canvas already has a 2D context! Cannot create WebGL context.');
      }

      // Browser and GPU information
      console.log('  • User Agent:', navigator.userAgent);
      console.log('  • Platform:', navigator.platform);

      // Check for WebGL support in general
      if (typeof WebGL2RenderingContext === 'undefined') {
        console.error('  ❌ WebGL2RenderingContext is not defined (WebGL2 not supported by browser)');
      } else {
        console.log('  ✅ WebGL2RenderingContext is defined');
      }

      // Check hardware acceleration
      console.log('  • Hardware concurrency:', navigator.hardwareConcurrency);

      // Try to get WebGL1 context and check extensions
      if (webgl1) {
        console.log('  • WebGL1 Renderer:', webgl1.getParameter(webgl1.RENDERER));
        console.log('  • WebGL1 Vendor:', webgl1.getParameter(webgl1.VENDOR));
        console.log('  • WebGL1 Version:', webgl1.getParameter(webgl1.VERSION));

        const debugInfo = webgl1.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          console.log('  • Unmasked Renderer:', webgl1.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          console.log('  • Unmasked Vendor:', webgl1.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        }
      }

      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;

    // Set canvas size to render resolution (CSS will scale to display size)
    canvas.width = this.renderWidth;
    canvas.height = this.renderHeight;

    // Initialize texture data at GRID resolution (not render resolution)
    this.textureData = new Uint8Array(gridWidth * gridHeight * 4);
    this.materialData = new Uint8Array(gridWidth * gridHeight * 4); // Store material IDs

    // Create shader program
    this.program = this.createShaderProgram();

    // Create textures
    this.texture = this.createTexture(0);
    this.materialTexture = this.createTexture(1);

    // Create quad (2 triangles covering screen)
    this.positionBuffer = this.createQuad();

    // Setup WebGL state
    this.setupGL();
  }

  private createShaderProgram(): WebGLProgram {
    const gl = this.gl;

    // Vertex shader - simple passthrough with UV coordinates
    const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      out vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
        v_texCoord.y = 1.0 - v_texCoord.y; // Flip Y
      }
    `;

    // Fragment shader - material-specific rendering with advanced effects
    const fragmentShaderSource = `#version 300 es
      precision highp float;

      in vec2 v_texCoord;
      out vec4 fragColor;

      uniform sampler2D u_texture;
      uniform sampler2D u_materialTexture;
      uniform vec2 u_gridResolution;   // Grid size (128x128)
      uniform vec2 u_renderResolution; // Render size (512x512)
      uniform float u_time;

      // Material IDs (must match TypeScript)
      const float MAT_EMPTY = 0.0;
      const float MAT_LAVA = 1.0;
      const float MAT_ROCK = 2.0;
      const float MAT_GAS = 3.0;
      const float MAT_WATER = 4.0;
      const float MAT_VAPOR = 5.0;
      const float MAT_AIR = 6.0;
      const float MAT_GRASS = 7.0;

      // Hash function for noise
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Smooth noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Bilinear upsampling from grid to render resolution
      vec4 sampleGridBilinear(sampler2D tex, vec2 uv) {
        vec2 texelSize = 1.0 / u_gridResolution;

        // Get integer and fractional parts
        vec2 gridPos = uv * u_gridResolution;
        vec2 iPos = floor(gridPos);
        vec2 fPos = fract(gridPos);

        // Sample 2x2 neighborhood
        vec2 tc = (iPos + 0.5) * texelSize;
        vec4 s00 = texture(tex, tc);
        vec4 s10 = texture(tex, tc + vec2(texelSize.x, 0.0));
        vec4 s01 = texture(tex, tc + vec2(0.0, texelSize.y));
        vec4 s11 = texture(tex, tc + texelSize);

        // Bilinear interpolation
        vec4 s0 = mix(s00, s10, fPos.x);
        vec4 s1 = mix(s01, s11, fPos.x);
        return mix(s0, s1, fPos.y);
      }

      // Lava effect: flowing, glowing, bubbling
      vec4 applyLavaEffect(vec4 color, vec2 uv) {
        vec2 flowUV = uv + vec2(0.0, u_time * 0.05);
        float n1 = noise(flowUV * 20.0 + u_time * 2.0);
        float n2 = noise(flowUV * 10.0 - u_time * 1.5);

        // Bubbling distortion
        vec2 distortion = vec2(n1, n2) * 0.02;
        vec4 distortedColor = texture(u_texture, uv + distortion);

        // Intense glow
        float glow = n1 * 0.3 + 0.7;
        color.rgb = mix(color.rgb, distortedColor.rgb, 0.5);
        color.rgb *= glow;

        // Add bright orange/yellow highlights
        color.rgb += vec3(0.2, 0.1, 0.0) * n2;

        // Bloom effect
        color.rgb += vec3(0.4, 0.15, 0.0) * pow(color.r, 3.0);

        return color;
      }

      // Water effect: shimmering, reflective, flowing
      vec4 applyWaterEffect(vec4 color, vec2 uv) {
        vec2 flowUV = uv + vec2(u_time * 0.02, u_time * 0.03);
        float n1 = noise(flowUV * 30.0 + u_time * 1.0);
        float n2 = noise(flowUV * 15.0 - u_time * 0.5);

        // Shimmer
        float shimmer = n1 * 0.2 + 0.8;
        color.rgb *= shimmer;

        // Add blue/cyan highlights
        color.rgb += vec3(0.0, 0.1, 0.15) * n2;

        // Subtle wave distortion
        vec2 wave = vec2(sin(uv.y * 50.0 + u_time * 3.0), cos(uv.x * 50.0 + u_time * 2.0)) * 0.005;
        vec4 waveColor = texture(u_texture, uv + wave);
        color.rgb = mix(color.rgb, waveColor.rgb, 0.3);

        // Transparency for depth
        color.a = 0.9;

        return color;
      }

      // Gas/Vapor effect: wispy, translucent, flowing
      vec4 applyGasEffect(vec4 color, vec2 uv, float materialId) {
        vec2 flowUV = uv + vec2(u_time * 0.08, -u_time * 0.15);
        float n1 = noise(flowUV * 15.0 + u_time * 1.5);
        float n2 = noise(flowUV * 8.0 - u_time * 1.0);

        // Wispy appearance
        float wisp = (n1 + n2) * 0.5;
        color.rgb *= 0.6 + wisp * 0.4;

        // Transparency based on density
        color.a = 0.3 + wisp * 0.3;

        // Vapor is lighter/whiter than gas
        if (materialId > 4.5) {
          color.rgb = mix(color.rgb, vec3(0.9, 0.95, 1.0), 0.4);
        }

        return color;
      }

      // Rock/Solid effect: add texture detail
      vec4 applyRockEffect(vec4 color, vec2 uv) {
        float n = noise(uv * u_gridResolution * 0.5);
        color.rgb *= 0.9 + n * 0.2;
        return color;
      }

      // Grass effect: slight movement, organic texture
      vec4 applyGrassEffect(vec4 color, vec2 uv) {
        float n = noise(uv * u_gridResolution * 0.3 + u_time * 0.5);
        color.rgb *= 0.95 + n * 0.1;

        // Subtle green variation
        color.g += n * 0.05;

        return color;
      }

      // Global glow for hot materials
      vec4 addGlow(vec4 color, vec2 uv, float materialId) {
        // Only lava gets strong glow
        if (materialId < 1.5 && materialId > 0.5) {
          vec2 texelSize = 1.0 / u_gridResolution;
          vec4 glow = vec4(0.0);
          float samples = 0.0;
          float glowRadius = 3.0;

          for (float y = -glowRadius; y <= glowRadius; y += 1.0) {
            for (float x = -glowRadius; x <= glowRadius; x += 1.0) {
              vec2 offset = vec2(x, y) * texelSize;
              float mat = texture(u_materialTexture, uv + offset).r * 255.0;

              if (mat > 0.5 && mat < 1.5) { // Lava nearby
                vec4 texelColor = texture(u_texture, uv + offset);
                float dist = length(vec2(x, y));
                float weight = 1.0 - (dist / glowRadius);
                weight = max(0.0, weight);
                glow += texelColor * weight;
                samples += weight;
              }
            }
          }

          if (samples > 0.0) {
            glow /= samples;
            color.rgb += glow.rgb * 0.4;
          }
        }

        return color;
      }

      void main() {
        // Sample with bilinear upsampling
        vec4 color = sampleGridBilinear(u_texture, v_texCoord);
        float materialId = sampleGridBilinear(u_materialTexture, v_texCoord).r * 255.0;

        // Apply material-specific effects
        if (materialId > 0.5 && materialId < 1.5) {
          color = applyLavaEffect(color, v_texCoord);
        } else if (materialId > 1.5 && materialId < 2.5) {
          color = applyRockEffect(color, v_texCoord);
        } else if (materialId > 2.5 && materialId < 3.5) {
          color = applyGasEffect(color, v_texCoord, materialId);
        } else if (materialId > 3.5 && materialId < 4.5) {
          color = applyWaterEffect(color, v_texCoord);
        } else if (materialId > 4.5 && materialId < 5.5) {
          color = applyGasEffect(color, v_texCoord, materialId);
        } else if (materialId > 6.5 && materialId < 7.5) {
          color = applyGrassEffect(color, v_texCoord);
        }

        // Add global glow
        color = addGlow(color, v_texCoord, materialId);

        // Slight contrast
        color.rgb = pow(color.rgb, vec3(0.9));

        fragColor = vec4(color.rgb, color.a);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    // Create program
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Failed to link program: ' + info);
    }

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Failed to compile shader: ' + info);
    }

    return shader;
  }

  private createTexture(unit: number): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Failed to create texture');

    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set texture parameters - LINEAR for smooth interpolation
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Initialize with empty data at GRID resolution
    const data = unit === 0 ? this.textureData : this.materialData;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.gridWidth,
      this.gridHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );

    return texture;
  }

  private createQuad(): WebGLBuffer {
    const gl = this.gl;

    // Full-screen quad (2 triangles)
    const positions = new Float32Array([
      -1, -1, // Bottom-left
      1, -1, // Bottom-right
      -1, 1, // Top-left
      1, 1, // Top-right
    ]);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Failed to create buffer');

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    return buffer;
  }

  private setupGL(): void {
    const gl = this.gl;

    gl.useProgram(this.program);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Setup position attribute
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniform values
    const gridResLocation = gl.getUniformLocation(this.program, 'u_gridResolution');
    gl.uniform2f(gridResLocation, this.gridWidth, this.gridHeight);

    const renderResLocation = gl.getUniformLocation(this.program, 'u_renderResolution');
    gl.uniform2f(renderResLocation, this.renderWidth, this.renderHeight);

    const textureLocation = gl.getUniformLocation(this.program, 'u_texture');
    gl.uniform1i(textureLocation, 0);

    const materialTextureLocation = gl.getUniformLocation(this.program, 'u_materialTexture');
    gl.uniform1i(materialTextureLocation, 1);

    // Set viewport at render resolution
    gl.viewport(0, 0, this.renderWidth, this.renderHeight);
  }

  /**
   * Render the grid with smooth WebGL rendering
   */
  render(grid: Grid, getColor: (cell: Cell) => number): void {
    const gl = this.gl;

    // Overlays are redrawn every frame
    this.overlay?.clearOverlay();

    // Update time
    this.time += 0.016; // Roughly 60fps
    const timeLocation = gl.getUniformLocation(this.program, 'u_time');
    gl.uniform1f(timeLocation, this.time);

    // Fill texture data from grid
    for (let i = 0; i < grid.size; i++) {
      const cell = grid.getUnsafe(i);
      const color = getColor(cell);
      const materialId = cell.materialId;

      // Convert ABGR to RGBA for color texture
      const r = color & 0xff;
      const g = (color >> 8) & 0xff;
      const b = (color >> 16) & 0xff;
      const a = 0xff;

      const offset = i * 4;
      this.textureData[offset] = r;
      this.textureData[offset + 1] = g;
      this.textureData[offset + 2] = b;
      this.textureData[offset + 3] = a;

      // Fill material texture
      this.materialData[offset] = materialId;
      this.materialData[offset + 1] = 0;
      this.materialData[offset + 2] = 0;
      this.materialData[offset + 3] = 255;
    }

    // Update color texture at GRID resolution
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.gridWidth,
      this.gridHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.textureData
    );

    // Update material texture at GRID resolution
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.materialTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      this.gridWidth,
      this.gridHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.materialData
    );

    // Clear and draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Draw brush cursor on the 2D overlay canvas
   */
  drawCursor(gridX: number, gridY: number, brushSize: number): void {
    this.overlay?.drawCursor(gridX, gridY, brushSize);
  }

  /**
   * Draw tooltip
   * Note: We can't use 2D context on a WebGL canvas, so this is a no-op for now
   */
  drawTooltip(_gridX: number, _gridY: number, _text: string): void {
    // WebGL tooltip drawing would require creating a separate overlay canvas
    // For now, we skip tooltip drawing in WebGL mode
  }

  /**
   * Draw velocity vectors as arrows on the 2D overlay canvas
   */
  drawVelocityOverlay(
    grid: Grid,
    scale?: number,
    spacing?: number,
    minMagnitude?: number
  ): void {
    this.overlay?.drawVelocityOverlay(grid, scale, spacing, minMagnitude);
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}
