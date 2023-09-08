const vertices = new Float32Array([
//     X,    Y,
    -0.8, -0.8, // Trianble 1 (Blue)
     0.8, -0.8,
     0.8,  0.8,

    -0.8, -0.8, // Trianble 2 (Green)
     0.8,  0.8,
    -0.8,  0.8,
]);

window.onload = async () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu');
    if (!context) {
        throw new Error('WebGPU is not supported');
    }

    if (!navigator.gpu) {
        throw new Error('WebGPU is not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('Adapter is not available');
    }
    console.log(adapter);

    const device = await adapter.requestDevice();
    if (!device) {
        throw new Error('Device is not available');
    }
    console.log(device);

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: canvasFormat
    })
    console.log(canvasFormat);

    const vertexBuffer = device.createBuffer({
        label: 'Vertex Buffer',
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 8,
        attributes: [{
            format: 'float32x2',
            offset: 0,
            shaderLocation: 0,
        }]
    }

    const cellShaderModule = device.createShaderModule({
        label: 'Cell Shader',
        code: `
            @vertex
            fn vertexMain(@location(0) pos: vec2f) -> 
                @builtin(position) vec4f {
                return vec4f(pos, 0, 1);
            }

            @fragment
            fn fragmentMain(@builtin(position) pos : vec4f) -> @location(0) vec4f {
                return pos;
            }
        `
    });

    const cellPipeline = device.createRenderPipeline({
        label: 'Cell Pipeline',
        layout: "auto",
        vertex: {
            module: cellShaderModule,
            entryPoint: 'vertexMain',
            buffers: [vertexBufferLayout],
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: 'fragmentMain',
            targets: [{
                format: canvasFormat
            }]
        }
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            clearValue: { r: 0.0, g: 0.0, b: 0.4, a: 1.0 },
            storeOp: 'store',
        }]
    });

    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(6, 1, 0, 0);

    pass.end();
    const commandBuffer = encoder.finish();

    

    device.queue.submit([commandBuffer]);
};