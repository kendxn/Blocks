// WebGL CRT Shader Effect
(function initCRTEffect() {
    let crtCanvas = document.getElementById('crtCanvas');
    if (!crtCanvas) {
        crtCanvas = document.createElement('canvas');
        crtCanvas.id = 'crtCanvas';
        document.body.appendChild(crtCanvas);
    }

    let gl = null;
    let program = null;
    let posBuf = null;
    let texBuf = null;
    let texture = null;
    let posLoc, texLoc, resLoc, texLocUnif, useTexLoc;
    let isCrtEnabled = false;
    try {
        isCrtEnabled = localStorage.getItem('crtEffectEnabled') === 'true';
    } catch (e) {
        isCrtEnabled = false;
    }

    if (crtCanvas) {
        crtCanvas.style.display = isCrtEnabled ? 'block' : 'none';
    }

    window.toggleCRTEffect = function(enable) {
        if (enable !== undefined) {
            isCrtEnabled = !!enable;
        } else {
            isCrtEnabled = !isCrtEnabled;
        }
        try {
            localStorage.setItem('crtEffectEnabled', isCrtEnabled ? 'true' : 'false');
        } catch (e) {}
        if (crtCanvas) {
            crtCanvas.style.display = isCrtEnabled ? 'block' : 'none';
        }
        return isCrtEnabled;
    };

    window.isCRTEffectEnabled = function() {
        return isCrtEnabled;
    };

    function initGLResources() {
        if (!gl || gl.isContextLost()) return false;

        const vsSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fsSource = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform bool u_use_texture;
            varying vec2 v_texCoord;
            
            #define CURVATURE 0.02
            #define BLOOM 0.5
            #define VIGNETTE 0.0
            
            void main() {
                vec2 uv = v_texCoord;
                vec2 center = uv - 0.5;
            
                float dist = dot(center, center);
                uv += center * (-CURVATURE) * dist;
            
                if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
            
                vec3 color = vec3(0.0);

                if (u_use_texture) {
                    color = texture2D(u_texture, uv).rgb;
                    vec2 texelSize = 1.0 / u_resolution;
                    vec3 blurred = texture2D(u_texture, uv + vec2(0.0, 1.5) * texelSize).rgb * 0.5;
                    blurred += texture2D(u_texture, uv - vec2(0.0, 1.5) * texelSize).rgb * 0.5;
                    color += blurred * BLOOM;
                }

                float resY = max(1.0, u_resolution.y);
                float pixel_y = uv.y * resY;
                float lineSpace = max(1.0, resY * 0.006); 
                float wave = sin(pixel_y * 6.28318 / lineSpace) * 0.5 + 0.5;
                
                float scanlineBrightness = mix(0.90, 1.0, wave);

                if (u_use_texture) {
                    color *= scanlineBrightness;
                    color += color * wave * 0.05;

                    float vignette = 1.0 - dot(center, center) * VIGNETTE * 4.0;
                    color *= vignette;

                    float glass_reflection = pow(1.0 - abs(uv.x - 0.5) * 2.0, 2.0);
                    color += vec3(0.02, 0.02, 0.03) * glass_reflection;
                    gl_FragColor = vec4(color, 1.0);
                } else {
                    float scanlineDarkness = (1.0 - scanlineBrightness) * 0.85;
                    float vignetteDarkness = dot(center, center) * VIGNETTE * 3.5;
                    float glass_reflection = pow(1.0 - abs(uv.x - 0.5) * 2.0, 2.0) * 0.035;

                    vec3 overlayColor = vec3(glass_reflection) + vec3(0.01, 0.03, 0.02) * wave * BLOOM;
                    float overlayAlpha = clamp(scanlineDarkness + vignetteDarkness, 0.0, 0.70);
                    gl_FragColor = vec4(overlayColor, overlayAlpha);
                }
            }
        `;

        function createShader(glCtx, type, source) {
            const shader = glCtx.createShader(type);
            glCtx.shaderSource(shader, source);
            glCtx.compileShader(shader);
            if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
                console.error(glCtx.getShaderInfoLog(shader));
                glCtx.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return false;

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);

        posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

        texBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 1,1, 1,0, 0,0]), gl.STATIC_DRAW);

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

        posLoc = gl.getAttribLocation(program, 'a_position');
        texLoc = gl.getAttribLocation(program, 'a_texCoord');
        resLoc = gl.getUniformLocation(program, 'u_resolution');
        texLocUnif = gl.getUniformLocation(program, 'u_texture');
        useTexLoc = gl.getUniformLocation(program, 'u_use_texture');

        return true;
    }

    function initGL() {
        gl = crtCanvas.getContext('webgl', { alpha: true, antialias: true }) || 
             crtCanvas.getContext('experimental-webgl', { alpha: true, antialias: true });
        if (!gl) return false;

        crtCanvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
        }, false);

        crtCanvas.addEventListener('webglcontextrestored', () => {
            initGLResources();
        }, false);

        return initGLResources();
    }

    function resize() {
        if (!crtCanvas) return;
        crtCanvas.width = Math.max(1, window.innerWidth);
        crtCanvas.height = Math.max(1, window.innerHeight);
        if (gl && !gl.isContextLost()) {
            gl.viewport(0, 0, crtCanvas.width, crtCanvas.height);
        }
    }
    window.addEventListener('resize', resize);

    if (!initGL()) return;
    resize();

    function render() {
        requestAnimationFrame(render);

        if (!isCrtEnabled || !gl || gl.isContextLost()) return;

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const sourceCanvas = document.getElementById('gameCanvas');
        let useTexture = false;

        if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
            useTexture = true;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(resLoc, crtCanvas.width, crtCanvas.height);
        gl.uniform1i(texLocUnif, 0);
        gl.uniform1i(useTexLoc, useTexture ? 1 : 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    render();
})();