$(document).ready(function() {
    $('.number').css('color','yellow');
    
    // =============== 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null;  // iOS 16 优化：改为持久化单例流
    let audioCtx = null;       // 单例
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

    // =============== 核心优化：预热逻辑（iOS 16 必须长驻） ===============
    async function prepareMic() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            
            // 如果已经有流且活跃，不再重新获取
            if (currentStream && currentStream.active) return;

            currentStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false, 
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });
            console.log("麦克风流已持久化预热");
        } catch (err) {
            console.warn("预热失败:", err);
        }
    }

    // =============== 录音核心功能 ===============
    async function startRecording() {
        if (isRecording) return;
        isCancelled = false;
        audioChunks = [];

        try {
            // iOS 16 优化：优先使用持久化流，避免冷启动硬件
            if (!currentStream || !currentStream.active) {
                currentStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false, 
                        noiseSuppression: false,
                        autoGainControl: true
                    }
                });
            }

            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            // 重新连接音频链路
            const source = audioCtx.createMediaStreamSource(currentStream);
            const destination = audioCtx.createMediaStreamDestination();
            
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.3; 

            source.connect(gainNode);
            gainNode.connect(destination);

            const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
            
            // 每次录音必须清理旧实例
            if (mediaRecorder) {
                mediaRecorder.ondataavailable = null;
                mediaRecorder.onstop = null;
            }

            mediaRecorder = new MediaRecorder(destination.stream, { 
                mimeType,
                audioBitsPerSecond: 128000 
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                if (isCancelled) return;
                const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                if (blob.size > 0) processAudioBlob(blob);
                // 显式清理引用，帮助 iOS 垃圾回收
                audioChunks = [];
            };

            // 关键优化：start(10) 强制系统立即开始处理音频分片，防止开头静音
            mediaRecorder.start(10);
            isRecording = true;
        } catch (err) {
            console.error('启动录音失败:', err);
            showToast("权限开启失败");
            initStatus();
        }
    }

    function stopRecording(isCancelAction = false) {
        isCancelled = isCancelAction; 
        isRecording = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (e) {}
        }

        // iOS 16 优化重点：【不要】在这里 stop currentStream 的 tracks！
        // 只有不关闭 track，硬件才不会进入休眠，从而解决多次录制后的“吞字”问题。
        // 如果非要关闭，请只在页面销毁或隐藏时处理。
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
        // 1. 切换按钮预热
        $(document).on('click', '.input_voice_switch', function() {
            prepareMic(); 
        });

        // 2. 触摸开始
        bt_recoding.addEventListener("touchstart", async function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            showBlackBoxSpeak();
            if (navigator.vibrate) navigator.vibrate(40);
            
            // iOS 16 抢跑逻辑：不等待 prepareMic 结束直接尝试启动
            await startRecording();
        });

        // 3. 触摸移动
        bt_recoding.addEventListener("touchmove", function(event) {
            event.preventDefault();
            const posMove = event.targetTouches[0].pageY;
            if (posStart - posMove < 50) {
                showBlackBoxSpeak();
            } else {
                showBlackBoxPause();
            }
        });

        // 4. 触摸结束
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

        // 5. 鼠标兼容
        bt_recoding.addEventListener("mousedown", async (e) => {
            showBlackBoxSpeak();
            await startRecording();
        });
        
        bt_recoding.addEventListener("mouseup", () => {
            stopRecording(false);
            initStatus();
        });
    }

    // 页面隐藏时清理资源（此时可以彻底关闭麦克风）
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (isRecording) stopRecording(true);
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }
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
