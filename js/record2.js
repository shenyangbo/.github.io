$(document).ready(function() {
    $('.num_container').hide();
    // =============== 1. 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    let audioCtx = null;
    let processor = null;
    let input = null;
    let currentStream = null;
    
    let isRealRecording = false; // 用户是否按下按钮
    let audioData = []; // 存储采样数据
    let permissionGranted = false;

    // =============== 2. 权限预热（彻底激活硬件） ===============
    async function initAudioSystem() {
        try {
            // 1. 获取流
            currentStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });

            // 2. 创建音频上下文并保持运行 (这是不延迟的核心)
            audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 44100 // 固定采样率，防止系统切换逻辑导致延迟
            });
            
            input = audioCtx.createMediaStreamSource(currentStream);
            
            // 3. 使用 ScriptProcessor (兼容性最强) 持续监听，但不存储数据
            // 缓冲区设为 4096，保证实时性
            processor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            input.connect(processor);
            processor.connect(audioCtx.destination);

            // 关键：持续处理流，只有当 isRealRecording 为 true 时才往数组里塞数据
            processor.onaudioprocess = (e) => {
                if (isRealRecording) {
                    const data = e.inputBuffer.getChannelData(0);
                    audioData.push(new Float32Array(data)); // 毫秒级无缝接入
                }
            };

            permissionGranted = true;
            console.log("音频链路已打通，处于热机状态");
        } catch (err) {
            alert("初始化失败: " + err.message);
        }
    }

    // =============== 3. 录音控制（真正的零延迟启动） ===============
    function startRecording() {
        if (!permissionGranted) return;
        
        // 彻底解决 iOS 播放冲突：在处理前恢复上下文
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        audioData = []; // 清空之前的采样
        isRealRecording = true; // 仅改变标志位，onaudioprocess 内部瞬间开始记录
        console.log("录音瞬间开启");
    }

    function stopRecording() {
        isRealRecording = false;
        
        // 将采集到的 Float32Array 合并并转为 WAV 或 Base64
        const completeData = mergeBuffers(audioData);
        const wavBlob = encodeWAV(completeData, 44100);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            updateBase64Output(base64, "audio/wav");
        };
        reader.readAsDataURL(wavBlob);
    }

    // =============== 4. 工具函数（Buffer合并与WAV编码） ===============
    function mergeBuffers(buffers) {
        let length = 0;
        buffers.forEach(b => length += b.length);
        let result = new Float32Array(length);
        let offset = 0;
        buffers.forEach(b => {
            result.set(b, offset);
            offset += b.length;
        });
        return result;
    }

    function encodeWAV(samples, sampleRate) {
        let buffer = new ArrayBuffer(44 + samples.length * 2);
        let view = new DataView(buffer);
        // WAV 头部定义
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);
        // 写入采样数据
        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // =============== 5. 事件绑定 ===============
    $('.input_voice_switch').on('click', initAudioSystem);

    bt_recoding.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (!permissionGranted) return;
        
        // UI 瞬间切换颜色，没有任何延迟
        $(bt_recoding).css({'background': '#3473F4', 'color': '#fff'}).val('正在录音');
        $(".blackBoxSpeak").show();
        
        startRecording();
    });

    bt_recoding.addEventListener("touchend", (e) => {
        stopRecording();
        $(bt_recoding).css({'background': '#fff', 'color': '#333'}).val('按住说话');
        $(".blackBoxSpeak").hide();
    });
});
