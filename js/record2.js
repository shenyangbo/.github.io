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
    let isRecording = false;
    let isCancelled = false;
    let posStart = 0;
    let permissionGranted = false; // 权限标记

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

    // =============== 新增：提前获取麦克风权限 ===============
    async function requestMicrophonePermission() {
        if (permissionGranted) return; // 已授权则不再请求
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 授权成功后立即关闭流（不录音，仅授权）
            stream.getTracks().forEach(track => track.stop());
            permissionGranted = true;
            showToast("麦克风权限已获取");
            console.log("麦克风权限授权成功");
        } catch (err) {
            console.error("权限请求失败：", err);
            if (err.name === 'NotAllowedError') {
                showToast("麦克风权限被拒绝，请在设置中开启");
            } else {
                showToast("获取麦克风权限失败");
            }
            permissionGranted = false;
        }
    }

    // =============== 录音核心重构 ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        // 如果已经提前授权，直接跳过权限请求，更快启动
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            currentStream = stream;
            permissionGranted = true; // 同步标记

            const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                if (isCancelled) {
                    console.log("录音已取消，停止处理数据");
                    return;
                }
                
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                if (blob.size > 0) {
                    processAudioBlob(blob);
                }
            };

            mediaRecorder.start();
            isRecording = true;
            console.log("录音已开始, 格式:", mimeType);

        } catch (err) {
            console.error('录音启动失败:', err);
            if (err.name === 'NotAllowedError') {
                showToast("麦克风权限被拒绝");
            } else {
                showToast("无法启动录音");
            }
            resetRecordingState();
        }
    }

    function stopRecording(isCancelAction = false) {
        isCancelled = isCancelAction; 
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }

    function resetRecordingState() {
        isRecording = false;
        isCancelled = false;
        audioChunks = [];
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
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
        console.log("生成 Base64 完成");
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
        // 新增：点击 .input_voice_switch 提前请求权限
        $(document).on('click', '.input_voice_switch', function() {
            requestMicrophonePermission();
        });

        // 1. 触摸开始
        bt_recoding.addEventListener("touchstart", async function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            
            showBlackBoxSpeak();
            if (navigator.vibrate) navigator.vibrate(50);
            
            await startRecording();
        });

        // 2. 触摸移动
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
                console.log("正常发送");
            }
            
            initStatus();
        });

        // 鼠标兼容
        bt_recoding.addEventListener("mousedown", async () => {
            showBlackBoxSpeak();
            await startRecording();
        });
        bt_recoding.addEventListener("mouseup", () => {
            stopRecording(false);
            initStatus();
        });
    }

    // 页面切后台中断录音
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isRecording) {
            stopRecording(true);
            initStatus();
            showToast("录音已中断");
        }
    });

    // 辅助 UI
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

    // 初始化
    initEvent();
    console.log("MediaRecorder 组件初始化成功");
});
