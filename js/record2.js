$(document).ready(function() {

 $('.number').css('color','red');    // =============== 全局变量（单例持久化） ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null;  // 持久化流，防止 iOS 16 频繁开启硬件
    let globalAudioCtx = null; // 核心：音频泵，防止硬件进入休眠
    let isRecording = false;
    let posStart = 0;
    let permissionGranted = false;

    // =============== 核心逻辑：权限请求与“保温” ===============
    async function requestMicrophonePermission() {
        try {
            // 如果流已存在且有效，直接复用
            if (currentStream && currentStream.active) {
                permissionGranted = true;
                return true;
            }

            currentStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                } 
            });

            // 【关键补丁】iOS 16 驱动保温：创建一个常驻的静音上下文
            // 只要这个 Context 不关闭，iOS 16 就不会回收麦克风驱动，从而解决后续录音延迟
            if (!globalAudioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                globalAudioCtx = new AudioContext();
                const source = globalAudioCtx.createMediaStreamSource(currentStream);
                const silentGain = globalAudioCtx.createGain();
                silentGain.gain.value = 0; 
                source.connect(silentGain);
                silentGain.connect(globalAudioCtx.destination);
            }
            
            if (globalAudioCtx.state === 'suspended') {
                await globalAudioCtx.resume();
            }

            permissionGranted = true;
            showToast("麦克风已就绪");
            return true;
        } catch (err) {
            console.error('授权失败:', err);
            permissionGranted = false;
            alert('麦克风授权失败，请在系统设置中开启');
            return false;
        }
    }

    // =============== 核心逻辑：开始录音（防吞字优化） ===============
    async function startRecording() {
        if (isRecording) return;
        audioChunks = [];

        // 确保权限和流处于热启动状态
        if (!permissionGranted) {
            const ok = await requestMicrophonePermission();
            if (!ok) return initStatus();
        }

        try {
            // 每次录制前清理上一个录音实例，防止内存堆积导致延迟
            if (mediaRecorder) {
                mediaRecorder.ondataavailable = null;
                mediaRecorder.onstop = null;
                mediaRecorder = null;
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            mediaRecorder = new MediaRecorder(currentStream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: mimeType });
                processAudioBlob(audioBlob);
            };

            // 【关键补丁】start(10) 强制小分片数据传输
            // 解决 iOS 16 多次录制后缓冲区排队导致的开头静音
            mediaRecorder.start(10); 
            isRecording = true;
        } catch (err) {
            console.error('启动失败:', err);
            showToast("录音启动失败");
            initStatus();
        }
    }

    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        try {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        } catch (e) {}
        // 注意：此处绝不停止 currentStream 的轨道，保持硬件在线
    }

    // =============== 工具函数 ===============
    function processAudioBlob(blob) {
        if (blob.size === 0) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            updateBase64Output(base64String, blob.type);
        };
        reader.readAsDataURL(blob);
    }

    function initStatus() {
        bt_recoding.value = '按住说话';
        showBlackBoxNone();
        $('#bt_recoding').css({'color': '#333333', 'background': 'white'});
    }

    function showBlackBoxNone() {
        blackBoxSpeak.style.display = "none";
        blackBoxPause.style.display = "none";
    }

    function showToast(message) {
        toast.innerText = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 1500);
    }

    function updateBase64Output(base64, mimeType) {
        // 原有逻辑保持不变
        console.log("录音转换完成，Base64长度:", base64.length);
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
        // 针对 iOS 优化：touchstart 时立即执行，不等待权限的 Promise
        bt_recoding.addEventListener("touchstart", function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            
            if (permissionGranted) {
                showBlackBoxSpeak();
                startRecording(); // 异步启动
            } else {
                requestMicrophonePermission();
            }
        });

        bt_recoding.addEventListener("touchmove", function(event) {
            event.preventDefault();
            const posMove = event.targetTouches[0].pageY;
            if (posStart - posMove < 40) showBlackBoxSpeak();
            else showBlackBoxPause();
        });

        bt_recoding.addEventListener("touchend", function(event) {
            event.preventDefault();
            stopRecording();
            initStatus();
        });

        // 桌面端适配
        bt_recoding.addEventListener("mousedown", function(event) {
            if (!permissionGranted) {
                requestMicrophonePermission();
                return;
            }
            showBlackBoxSpeak();
            startRecording();
        });

        bt_recoding.addEventListener("mouseup", function(event) {
            stopRecording();
            initStatus();
        });
    }

    // UI 显示函数
    var showBlackBoxSpeak = function() {
        bt_recoding.value = '松开结束';
        blackBoxSpeak.style.display = "block";
        blackBoxPause.style.display = "none";
        $('#bt_recoding').css({'background': '#3473F4', 'color': '#ffffff'});
    }

    var showBlackBoxPause = function() {
        bt_recoding.value = '松开手指，取消发送';
        blackBoxSpeak.style.display = "none";
        blackBoxPause.style.display = "block";
        $('#bt_recoding').css('background', 'red');
    }

    $('.input_voice_switch').click(function() {
        requestMicrophonePermission();
    });

    window.addEventListener('load', initEvent);

    // 安全处理：页面隐藏时停止录音，但保留 Stream 复用
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isRecording) {
            stopRecording();
            initStatus();
        }
    });
});
