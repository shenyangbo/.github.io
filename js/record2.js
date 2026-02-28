$(document).ready(function() {
    //// $('.num_container').hide();
    // =============== 1. 全局变量 ===============
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

    // =============== 2. 格式兼容性检测 ===============
    function getBestMimeType() {
        const types = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
        for (let type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ""; 
    }

    function showToast(message) {
        toast.innerText = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 1500);
    }

    function showBlackBoxNone() {
        blackBoxSpeak.style.display = "none";
        blackBoxPause.style.display = "none";
    }

    function updateBase64Output(base64, mimeType) {
        document.getElementById('base64Output').innerHTML = `<pre>${base64.substring(0, 100)}...</pre>`;
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.src = `data:${mimeType};base64,${base64}`;
        const container = document.getElementById('audioContainer');
        container.innerHTML = '';
        container.appendChild(audioElement);
    }

    // =============== 4. 录音逻辑核心修复 ===============

    async function requestMicrophonePermission() {
        try {
            // 第一次请求权限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
            });
            currentStream = stream; 
            permissionGranted = true;
            showToast("麦克风授权成功");
        } catch (err) {
            permissionGranted = false;
            alert('无法获取麦克风：' + err.message);
        }
    }

  // 在全局变量中记录当前的音频上下文（如果需要）
let audioCtx = null;

async function startRecording() {
    if (isRecording || !permissionGranted) return;

    // --- 【新增：核心修复方案】 ---
    // 1. 停止所有正在播放的 audio 标签，释放硬件占用
    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => {
        audio.pause();
        audio.src = ''; // 彻底断开连接
        audio.load();
    });

    // 2. 尝试激活/恢复 AudioContext (iOS 26 唤醒硬件的关键)
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
    } catch (e) {
        console.warn("AudioContext 唤醒失败，尝试继续录音...");
    }
    // --- 【修复结束】 ---

    audioChunks = []; 
    if (mediaRecorder) mediaRecorder = null; 

    try {
        // 确保流活跃，如果之前播放过声音，这里必须重新捕获最新的流
        if (!currentStream || !currentStream.active) {
            currentStream = await navigator.mediaDevices.getUserMedia({
                audio: { 
                    echoCancellation: true, // 开启回声消除有助于解决播放后的冲突
                    noiseSuppression: true,
                    autoGainControl: true 
                }
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

        mediaRecorder.start();
        isRecording = true;
        console.log("录音已启动");
    } catch (err) {
        console.error("播放后启动失败:", err);
        // 如果是因为播放导致的冲突，尝试彻底重置流再试一次
        currentStream = null;
        showToast("音频通道冲突，请重试");
    }
}

    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        try {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        } catch (e) {
            console.warn("停止录音异常:", e);
        }
    }

    // =============== 5. 事件绑定 ===============
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

    // 切后台时必须销毁流，否则 iOS 会锁定麦克风导致无法开启第二次
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (isRecording) stopRecording();
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }
        }
    });

    initEvent();
});
