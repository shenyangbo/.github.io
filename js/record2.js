$(document).ready(function() {
    $('.number').css('color','yellow');
    
    // =============== 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null;
    let audioCtx = null; // 用于代码层面优化硬件唤醒
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

    async function requestMicrophonePermission() {
        if (permissionGranted) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            permissionGranted = true;
            showToast("麦克风权限已获取");
        } catch (err) {
            console.error("权限请求失败：", err);
            permissionGranted = false;
        }
    }

    // =============== 录音核心重构 (代码层面优化) ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        try {
            // 1. 获取基础流
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            currentStream = stream;

            // 2. 【核心优化】使用 AudioContext 桥接方案
            // 强制 iOS 唤醒音频管道并开始处理帧
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            // 创建源和目标节点
            const source = audioCtx.createMediaStreamSource(stream);
            const destination = audioCtx.createMediaStreamDestination();
            
            // 连接节点：这样流会经过 Web Audio 引擎处理，变得更稳定
            source.connect(destination);

            // 3. 使用桥接后的 destination.stream 进行录制
            const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
            
            mediaRecorder = new MediaRecorder(destination.stream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                if (isCancelled) return;
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                if (blob.size > 0) processAudioBlob(blob);
            };

            // 4. 利用 requestAnimationFrame 确保在下一帧开始录制
            // 这给了浏览器微量的时间来完成节点连接，而不产生体感延迟
            requestAnimationFrame(() => {
                if (!isCancelled) {
                    mediaRecorder.start();
                    isRecording = true;
                    console.log("iOS 音频管线已对齐，开始录制");
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

        // 停止录制
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // 释放 AudioContext
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close();
        }

        // 释放流和硬件
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

    // =============== 事件绑定 (保持原逻辑) ===============
    function initEvent() {
        $(document).on('click', '.input_voice_switch', function() {
            requestMicrophonePermission();
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
