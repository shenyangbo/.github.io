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
    let audioCtx = null; 
    let isRecording = false;
    let isCancelled = false;
    let posStart = 0;
    let permissionGranted = false;

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

    // =============== 录音核心逻辑 ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        try {
            // 1. 获取流 - 安卓杂音优化：关闭部分软件处理，减少冲突
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false, // 安卓建议关闭，由硬件处理
                    noiseSuppression: false,  // 安卓建议关闭
                    autoGainControl: true    // 保留自动增益以维持音量稳定
                }
            });
            currentStream = stream;

            // 2. iOS 启动优化 - AudioContext 桥接
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            const source = audioCtx.createMediaStreamSource(stream);
            const destination = audioCtx.createMediaStreamDestination();
            
            // 3. 安卓电流声优化 - 增加极短淡入
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05); // 50ms淡入

            source.connect(gainNode);
            gainNode.connect(destination);

            // 4. MediaRecorder 编码优化
            const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
            
            // 指定较高码率减少杂音
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

            // 5. 对齐帧启动
            requestAnimationFrame(() => {
                if (!isCancelled) {
                    mediaRecorder.start();
                    isRecording = true;
                    console.log("录制已开始 (优化版)");
                }
            });

        } catch (err) {
            console.error('录音启动失败:', err);
            showToast("无法启动录音");
            resetRecordingState();
        }
    }

    function stopRecording(isCancelAction = false) {
        isCancelled = isCancelAction; 
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close();
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
        if (audioCtx) audioCtx.close();
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
        const audioContainer = document.getElementById('audioContainer');
        if (audioContainer) {
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = `data:${mimeType};base64,${base64}`;
            audioContainer.innerHTML = '';
            audioContainer.appendChild(audioElement);
        }
    }

    // =============== 事件绑定 (维持原逻辑) ===============
    function initEvent() {
        // 用户切换到语音界面时，点击即可获取权限
        $(document).on('click', '.input_voice_switch', function() {
            if (!permissionGranted) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                .then(s => {
                    s.getTracks().forEach(t => t.stop());
                    permissionGranted = true;
                });
            }
        });

        bt_recoding.addEventListener("touchstart", async function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            showBlackBoxSpeak();
            if (navigator.vibrate) navigator.vibrate(50);
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

    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isRecording) {
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
