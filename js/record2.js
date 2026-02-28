$(document).ready(function() {
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
        const types = [
            'audio/mp4',           // iOS 首选
            'audio/aac',           // iOS 备选
            'audio/webm;codecs=opus', // 安卓首选
            'audio/webm'
        ];
        for (let type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ""; 
    }

    // =============== 3. UI 辅助函数 ===============
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

    // =============== 4. 录音逻辑核心 ===============

    // 核心：iOS 权限必须通过用户点击触发
    async function requestMicrophonePermission() {
        try {
            // 解决音量小：禁用所有处理算法
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                } 
            });
            currentStream = stream; // 持有流，实现热启动
            permissionGranted = true;
            showToast("麦克风授权成功");
        } catch (err) {
            permissionGranted = false;
            alert('无法获取麦克风：' + err.message);
        }
    }

    async function startRecording() {
        if (isRecording || !permissionGranted) return;
        audioChunks = []; 

        try {
            // 确保流活跃
            if (!currentStream || !currentStream.active) {
                currentStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
                });
            }

            const mimeType = getBestMimeType();
            const options = mimeType ? { mimeType } : {};
            
            mediaRecorder = new MediaRecorder(currentStream, options);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const finalMime = mediaRecorder.mimeType || mimeType || 'audio/mp4';
                const audioBlob = new Blob(audioChunks, { type: finalMime });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    updateBase64Output(base64, finalMime);
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();
            isRecording = true;
            console.log("录音已启动");
        } catch (err) {
            console.error(err);
            showToast("录音启动失败");
        }
    }

    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
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

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && currentStream) {
            currentStream.getTracks().forEach(t => t.stop());
            currentStream = null;
        }
    });

    initEvent();
});
