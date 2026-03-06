$(document).ready(function() {
   $('.number').css('color','red');
    
    // =============== 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null;
    let audioCtx = null;       // 单例，只需初始化一次
    let gainNode = null;       // 增益补偿
    let isRecording = false;
    let isCancelled = false;
    let posStart = 0;

    // =============== 工具函数 ===============
    function showToast(message) {
        toast.innerText = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 1500);
    }

    function initStatus() {
        bt_recoding.value = '按住说话';
        showBlackBoxNone();
        $(bt_recoding).css({'color': '#333333', 'background': 'white'});
    }

    function showBlackBoxNone() {
        blackBoxSpeak.style.display = "none";
        blackBoxPause.style.display = "none";
    }

    // =============== 核心优化：预热逻辑 ===============
    async function prepareMic() {
        try {
            // 1. 提前初始化 AudioContext
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // 2. 在点击事件中立即激活上下文，消除 iOS 的“静音”保护
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            // 3. 预先请求一次权限，让浏览器弹出授权框并暖机
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // 暖机后立即关闭，不占指示灯
            console.log("麦克风预热完成");
        } catch (err) {
            console.warn("预热失败（可能用户拒绝了权限）:", err);
        }
    }

    // =============== 录音核心功能 ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        try {
            // 获取流：禁用回声消除以防止 iOS 压低音量
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false, 
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });
            currentStream = stream;

            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            // 
            const source = audioCtx.createMediaStreamSource(stream);
            const destination = audioCtx.createMediaStreamDestination();
            
            // 音量补偿：解决“重启权限后声音变小”的问题
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.3; // 提升 30% 音量

            source.connect(gainNode);
            gainNode.connect(destination);

            const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
            
            mediaRecorder = new MediaRecorder(destination.stream, { 
                mimeType,
                audioBitsPerSecond: 128000 // 解决安卓电子杂音
            });

            mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                if (isCancelled) return;
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                if (blob.size > 0) processAudioBlob(blob);
            };

            // 启动录制
            mediaRecorder.start();
            isRecording = true;
        } catch (err) {
            console.error('启动录音失败:', err);
            showToast("权限开启失败");
        }
    }

    function stopRecording(isCancelAction = false) {
        isCancelled = isCancelAction; 
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (currentStream) {
            // 延迟一点点关闭，防止 iOS 截断末尾半个字
            currentStream.getTracks().forEach(t => setTimeout(() => t.stop(), 300));
            currentStream = null;
        }
    }

    function processAudioBlob(blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            updateBase64Output(base64String, blob.type);
        };
        reader.readAsDataURL(blob);
    }

    function updateBase64Output(base64, mimeType) {
        const audioContainer = document.getElementById('audioContainer');
        if (audioContainer) {
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = `data:${mimeType};base64,${base64}`;
            audioContainer.innerHTML = '';
            audioContainer.appendChild(audioElement);
        }
    }

    // =============== 事件绑定 ===============
    function initEvent() {
        // 关键：切换到语音输入界面时，利用这次点击彻底暖机
        $(document).on('click', '.input_voice_switch', function() {
            prepareMic(); 
        });

        bt_recoding.addEventListener("touchstart", async function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            showBlackBoxSpeak();
            if (navigator.vibrate) navigator.vibrate(40);
            await startRecording();
        });

        bt_recoding.addEventListener("touchmove", function(event) {
            event.preventDefault();
            const posMove = event.targetTouches[0].pageY;
            if (posStart - posMove < 50) {
                showBlackBoxSpeak();
            } else {
                showBlackBoxPause();
            }
        });

        bt_recoding.addEventListener("touchend", function(event) {
            event.preventDefault();
            const posEnd = event.changedTouches[0].pageY;
            if (posStart - posEnd >= 50) {
                stopRecording(true);
                showToast("取消发送");
            } else {
                stopRecording(false);
            }
            initStatus();
        });

        // 鼠标兼容
        bt_recoding.addEventListener(\"mousedown\", async (e) => {
            showBlackBoxSpeak();
            await startRecording();
        });
        bt_recoding.addEventListener(\"mouseup\", () => {
            stopRecording(false);
            initStatus();
        });
    }

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) stopRecording(true);
    });

    function showBlackBoxSpeak() {
        bt_recoding.value = '松开 结束';
        blackBoxSpeak.style.display = \"block\";
        blackBoxPause.style.display = \"none\";
        $(bt_recoding).css({'background': '#3473F4', 'color': '#ffffff'});
    }

    function showBlackBoxPause() {
        bt_recoding.value = '松开手指，取消发送';
        blackBoxSpeak.style.display = \"none\";
        blackBoxPause.style.display = \"block\";
        $(bt_recoding).css('background', '#f44336');
    }

    initEvent();
});
