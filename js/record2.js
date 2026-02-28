$(document).ready(function() {
    // =============== 1. 全局变量 (保持不变) ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let audioCtx = null;
    let processor = null;
    let input = null;
    let currentStream = null;
    
    let isRealRecording = false; 
    let audioData = []; 
    let permissionGranted = false;
    let posStart = 0;

    // =============== 2. 权限预热 (保持逻辑) ===============
    async function requestMicrophonePermission() {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true }
            });

            audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
            input = audioCtx.createMediaStreamSource(currentStream);
            
            // 保持热机状态，缓冲区 4096 保证零延迟
            processor = audioCtx.createScriptProcessor(4096, 1, 1);
            input.connect(processor);
            processor.connect(audioCtx.destination);

            processor.onaudioprocess = (e) => {
                if (isRealRecording) {
                    const data = e.inputBuffer.getChannelData(0);
                    audioData.push(new Float32Array(data)); 
                }
            };

            permissionGranted = true;
            showToast("麦克风已就绪");
        } catch (err) {
            alert("无法获取麦克风: " + err.message);
        }
    }

    // =============== 3. 核心工具函数 (确保 Base64 正常渲染) ===============
    function updateBase64Output(base64) {
        // 渲染 Base64 文本
        const base64Output = document.getElementById('base64Output');
        if (base64Output) {
            base64Output.innerHTML = `<pre>${base64.substring(0, 100)}...</pre>`;
        }

        // 关键修复：动态创建 audio 标签并显示
        const audioContainer = document.getElementById('audioContainer');
        if (audioContainer) {
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            // 因为使用的是底层编码，这里必须写死为 audio/wav
            audioElement.src = `data:audio/wav;base64,${base64}`;
            audioContainer.innerHTML = '';
            audioContainer.appendChild(audioElement);
        }
    }

    // =============== 4. 录音启停逻辑 (不改动你的原有逻辑) ===============
    function startRecording() {
        if (!permissionGranted) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        audioData = []; 
        isRealRecording = true; 
    }

    function stopRecording() {
        if (!isRealRecording) return;
        isRealRecording = false;
        
        const completeData = mergeBuffers(audioData);
        const wavBlob = encodeWAV(completeData, 44100);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            updateBase64Output(base64); // 触发显示
        };
        reader.readAsDataURL(wavBlob);
    }

    // =============== 5. 事件绑定 (完全保留你的交互逻辑) ===============
    function initEvent() {
        $('.input_voice_switch').on('click', requestMicrophonePermission);

        bt_recoding.addEventListener("touchstart", function(event) {
            event.preventDefault();
            if (!permissionGranted) return;
            posStart = event.touches[0].pageY;
            
            // UI 切换
            bt_recoding.value = '松开结束';
            blackBoxSpeak.style.display = "block";
            $('#bt_recoding').css({'background': '#3473F4', 'color': '#ffffff'});
            
            startRecording();
        });

        bt_recoding.addEventListener("touchmove", function(event) {
            event.preventDefault();
            const posMove = event.targetTouches[0].pageY;
            if (posStart - posMove < 40) {
                blackBoxSpeak.style.display = "block";
                blackBoxPause.style.display = "none";
            } else {
                blackBoxSpeak.style.display = "none";
                blackBoxPause.style.display = "block";
            }
        });

        bt_recoding.addEventListener("touchend", function(event) {
            event.preventDefault();
            const posEnd = event.changedTouches[0].pageY;
            
            stopRecording();
            
            // UI 复原
            bt_recoding.value = '按住说话';
            blackBoxSpeak.style.display = "none";
            blackBoxPause.style.display = "none";
            $('#bt_recoding').css({'color': '#333333', 'background': 'white'});
            
            if (posStart - posEnd >= 40) {
                showToast("录音已取消");
                const container = document.getElementById('audioContainer');
                if(container) container.innerHTML = ''; // 取消则清空
            }
        });
    }

    // 辅助工具函数：WAV 编码 (保持不变以确保零延迟)
    function mergeBuffers(buffers) {
        let length = 0;
        buffers.forEach(b => length += b.length);
        let result = new Float32Array(length);
        let offset = 0;
        buffers.forEach(b => { result.set(b, offset); offset += b.length; });
        return result;
    }

    function encodeWAV(samples, sampleRate) {
        let buffer = new ArrayBuffer(44 + samples.length * 2);
        let view = new DataView(buffer);
        const writeString = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
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
        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    function showToast(m) { toast.innerText = m; $(toast).fadeIn().delay(1000).fadeOut(); }

    window.addEventListener('load', initEvent);
});
