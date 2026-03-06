$(document).ready(function() {
    $('.number').css('color','blue');
    
    // =============== 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null;
    let audioCtx = null;       // 保持单例
    let gainNode = null;       // 增益控制
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

    // =============== 录音核心重构 ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        try {
            // 1. 获取流：显式禁用 echoCancellation 以防止 iOS 压低音量
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false, 
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });
            currentStream = stream;

            // 2. 初始化 AudioContext (只初始化一次)
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // 必须在 touch 事件的 Promise 链中立即 resume
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            const source = audioCtx.createMediaStreamSource(stream);
            const destination = audioCtx.createMediaStreamDestination();
            
            // 3. 音量补偿：创建一个增益节点，把声音放大
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.3; // 放大 1.3 倍，解决声音小的问题

            source.connect(gainNode);
            gainNode.connect(destination);

            // 4. 配置 MediaRecorder
            const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
            
            // 指定码率确保安卓端不产生电子杂音
            mediaRecorder = new MediaRecorder(destination.stream, { 
                mimeType,
                audioBitsPerSecond: 128000 
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                if (isCancelled) return;
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                if (blob.size > 0) processAudioBlob(blob);
            };

            // 5. 立即启动
            mediaRecorder.start();
            isRecording = true;
            console.log("iOS/Android 兼容录音启动成功");

        } catch (err) {
            console.error('录音启动失败:', err);
            showToast("请检查麦克风权限");
            resetRecordingState();
        }
    }

    function stopRecording(isCancelAction = false) {
        isCancelled = isCancelAction; 
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // 注意：不关闭 audioCtx，只关闭当前流的 track
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                // 稍微延迟 200ms 关闭，防止 MediaRecorder 截断末尾
                setTimeout(() => track.stop(), 200);
            });
            currentStream = null;
        }
    }

    function resetRecordingState() {
        isRecording = false;
        isCancelled = false;
        audioChunks = [];
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
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
        // 预授权：用户第一次点击任何地方时尝试激活 AudioContext
        $(document).on('touchstart', function() {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
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
        bt_recoding.addEventListener("mousedown", async (e) => {
            showBlackBoxSpeak();
            await startRecording();
        });
        bt_recoding.addEventListener("mouseup", () => {
            stopRecording(false);
            initStatus();
        });
    }

    // 页面不可见时彻底释放资源
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopRecording(true);
            initStatus();
        }
    });

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
