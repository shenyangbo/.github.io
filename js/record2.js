$(document).ready(function() {
    // =============== 1. 全局变量 (保持不变) ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null; 
    let isRecording = false;
    let posStart = 0;
    let permissionGranted = false;
    let audioCtx = null;

    // =============== 2. 核心优化：权限预热 (解决安卓冷启动) ===============
    async function requestMicrophonePermission() {
        try {
            // 在点击授权时就直接拿到 stream 并保存到全局变量 currentStream
            // 这样在 startRecording 时不需要重新申请硬件，实现“秒开”
            currentStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true 
                } 
            });
            
            // 初始化一下 AudioContext 备用（解决 iOS 冲突）
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            permissionGranted = true;
            showToast("麦克风授权成功");
        } catch (err) {
            permissionGranted = false;
            alert('无法获取麦克风：' + err.message);
        }
    }

    // =============== 3. 核心优化：录音启动逻辑 ===============
    async function startRecording() {
        if (isRecording || !permissionGranted) return;

        // A. 释放硬件占用
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.src = ''; 
            audio.load();
        });

        if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        audioChunks = []; 
        if (mediaRecorder) mediaRecorder = null; 

        try {
            // B. 关键点：检查预热的流是否活跃，不活跃才重新捕获
            if (!currentStream || !currentStream.active) {
                currentStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
            }

            const mimeType = getBestMimeType();
            const options = mimeType ? { mimeType } : {};
            
            mediaRecorder = new MediaRecorder(currentStream, options);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const finalMime = mediaRecorder ? (mediaRecorder.mimeType || mimeType) : 'audio/mp4';
                const audioBlob = new Blob(audioChunks, { type: finalMime });
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        const base64 = reader.result.split(',')[1];
                        updateBase64Output(base64, finalMime);
                    }
                };
                reader.readAsDataURL(audioBlob);
            };

            // C. 核心优化：start(10) 
            // 传入 10ms 的时间片，强制 MediaRecorder 立即开始切片编码
            // 这能显著减少安卓系统等待缓冲区填满而导致的“吞字”现象
            mediaRecorder.start(10); 
            
            isRecording = true;
            console.log("录音已瞬时启动");
        } catch (err) {
            console.error("启动失败:", err);
            currentStream = null;
            showToast("录音启动失败，请重试");
        }
    }

    // --- 以下逻辑保持与你的原代码一致 ---
    function getBestMimeType() {
        const types = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
        for (let type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ""; 
    }

    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        try { if (mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch (e) {}
    }

    function initEvent() {
        $('.input_voice_switch').on('click', requestMicrophonePermission);
        bt_recoding.addEventListener("touchstart", async (e) => {
            e.preventDefault();
            if (!permissionGranted) { showToast("请先授权麦克风"); return; }
            posStart = e.touches[0].pageY;
            blackBoxSpeak.style.display = "block";
            $(bt_recoding).css({'background': '#3473F4', 'color': '#fff'}).val('松开结束');
            await startRecording();
        });
        bt_recoding.addEventListener("touchmove", (e) => {
            const moveY = e.targetTouches[0].pageY;
            if (posStart - moveY < 40) {
                blackBoxSpeak.style.display = "block";
                blackBoxPause.style.display = "none";
            } else {
                blackBoxSpeak.style.display = "none";
                blackBoxPause.style.display = "block";
            }
        });
        bt_recoding.addEventListener("touchend", (e) => {
            const endY = e.changedTouches[0].pageY;
            stopRecording();
            $(bt_recoding).css({'background': '#fff', 'color': '#333'}).val('按住说话');
            showBlackBoxNone();
            if (posStart - endY >= 40) {
                showToast("录音已取消");
                audioChunks = [];
            }
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (isRecording) stopRecording();
            // 注意：这里建议保留流，不要 stop()，除非页面关闭，以维持下一次点击的“热启动”状态
        }
    });

    function updateBase64Output(base64, mimeType) {
        document.getElementById('base64Output').innerHTML = `<pre>${base64.substring(0, 100)}...</pre>`;
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.src = `data:${mimeType};base64,${base64}`;
        const container = document.getElementById('audioContainer');
        container.innerHTML = '';
        container.appendChild(audioElement);
    }

    function showBlackBoxNone() {
        blackBoxSpeak.style.display = "none";
        blackBoxPause.style.display = "none";
    }

    initEvent();
});
