$(document).ready(function() {
    $('.number').css('color','blue');

    // =============== 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let globalStream = null; // 保持持久流，解决 iOS 启动延迟
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

    /**
     * 关键优化：预热麦克风
     * 在用户点击切换到语音输入时调用，提前打通音频链路
     */
    async function prepareMic() {
        if (globalStream) return globalStream;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            globalStream = stream;
            console.log("麦克风流已预热就绪");
            return stream;
        } catch (err) {
            console.error("无法获取麦克风权限:", err);
            showToast("请授权麦克风权限");
            return null;
        }
    }

    /**
     * 关键优化：释放麦克风
     * 当不需要录音功能或切后台时，必须释放，否则会影响其他App
     */
    function releaseMic() {
        if (globalStream) {
            globalStream.getTracks().forEach(track => track.stop());
            globalStream = null;
            console.log("麦克风资源已释放");
        }
    }

    // =============== 录音核心重构 ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        // 1. 获取预热好的流（如果没有则即时获取）
        const stream = await prepareMic();
        if (!stream) return;

        try {
            const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                if (isCancelled) return;
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                if (blob.size > 0) processAudioBlob(blob);
            };

            // 2. 立即开始，不再有 getUserMedia 的延迟
            mediaRecorder.start();
            isRecording = true;
            console.log("录音真正开始");

        } catch (err) {
            console.error('录音启动失败:', err);
            showToast("录音启动失败");
            isRecording = false;
        }
    }

    function stopRecording(isCancelAction = false) {
        isCancelled = isCancelAction; 
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        // 注意：这里不调用 track.stop()，保持 globalStream 存活以便下次秒开
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
        // 预热触发点：用户点击切换语音按钮时
        $(document).on('click', '.input_voice_switch', function() {
            prepareMic(); 
        });

        // 1. 触摸开始
        bt_recoding.addEventListener("touchstart", async function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            
            showBlackBoxSpeak();
            if (navigator.vibrate) navigator.vibrate(40); // 触感反馈
            
            await startRecording();
        });

        // 2. 触摸移动 (取消逻辑)
        bt_recoding.addEventListener("touchmove", function(event) {
            event.preventDefault();
            const posMove = event.targetTouches[0].pageY;
            if (posStart - posMove < 50) {
                showBlackBoxSpeak();
            } else {
                showBlackBoxPause();
            }
        });

        // 3. 触摸结束
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
        bt_recoding.addEventListener("mousedown", startRecording);
        bt_recoding.addEventListener("mouseup", () => {
            stopRecording(false);
            initStatus();
        });
    }

    // 重要：页面不可见或关闭时，必须归还麦克风权限
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopRecording(true);
            releaseMic(); // 彻底断开硬件连接
            initStatus();
        }
    });

    // UI 辅助
    function showBlackBoxSpeak() {
        bt_recoding.value = '松开 结束';
        blackBoxSpeak.style.display = "block";
        blackBoxPause.style.display = "none";
        $(bt_recoding).css({'background': '#3473F4', 'color': '#ffffff'});
    }

    function showBlackBoxPause() {
        bt_recoding.value = '松开手指，取消发送';
        blackBoxSpeak.style.display = "none";
        blackBoxPause.style.display = "block";
        $(bt_recoding).css('background', '#f44336');
    }

    initEvent();
});
