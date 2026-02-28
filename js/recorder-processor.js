
// recorder-processor.js
class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 可以通过 port 与主线程进行通信，这里我们主要用于发送音频数据
    }

    process(inputs, outputs, parameters) {
        // inputs[0] 包含 MediaStreamSource 提供的音频数据
        // 每个元素是一个 Float32Array，代表一个声道的数据
        const input = inputs[0];

        // 确保有输入数据
        if (input.length > 0) {
            // 获取第一个声道的数据。如果你需要多声道，需要处理所有声道
            const channelData = input[0];

            // 将处理后的（或原始的）音频数据发送回主线程
            // 注意：postMessage 会复制数据，如果数据量非常大，可以考虑使用 SharedArrayBuffer
            this.port.postMessage(channelData);
        }

        // 返回 true 表示处理器应该保持活跃
        return true;
    }
}

// 注册 AudioWorklet 处理器，第一个参数是处理器名称，需要在 AudioWorkletNode 中使用
registerProcessor('recorder-processor', RecorderProcessor);