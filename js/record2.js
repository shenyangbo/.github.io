$(document).ready(function() {
	$('.number').css('color','#000000');
    // =============== 全局变量 ===============
    const bt_recoding = document.getElementById("bt_recoding");
    const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
    const blackBoxPause = document.querySelector(".blackBoxPause");
    const toast = document.getElementById("toast");

    let mediaRecorder = null;
    let audioChunks = []; 
    let currentStream = null;
    let isRecording = false;
    let isCancelled = false; // 新增：用于标记是否是“取消发送”操作
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

    // =============== 录音核心重构 ===============

    async function startRecording() {
        if (isRecording) return;
        isCancelled = false; // 重置取消标志
        audioChunks = [];    // 清空旧数据

        try {
            // 1. 获取流（iOS 必须在 touchstart 同步逻辑中调用）
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            currentStream = stream;

            // 2. 自动适配 MIME 类型 (iOS 不支持 webm)
            const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            const mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // 如果标记为取消，则不进行 Base64 处理
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
        // 这里放入你原本处理成功的逻辑，如显示预览、上传等
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
        // 1. 触摸开始
        bt_recoding.addEventListener("touchstart", async function(event) {
            event.preventDefault();
            posStart = event.touches[0].pageY;
            
            showBlackBoxSpeak();
            if (navigator.vibrate) navigator.vibrate(50);
            
            await startRecording();
        });

        // 2. 触摸移动（判断是否上划取消）
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
            
            // 判断是否满足取消条件
            if (posStart - posEnd >= 50) {
                stopRecording(true); // 传入 true，标记为取消
                showToast("取消发送");
            } else {
                stopRecording(false);
                console.log("正常发送");
            }
            
            initStatus();
        });

        // 鼠标兼容逻辑
        bt_recoding.addEventListener("mousedown", startRecording);
        bt_recoding.addEventListener("mouseup", () => {
            stopRecording(false);
            initStatus();
        });
    }

    // 处理页面切后台
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && isRecording) {
            stopRecording(true);
            initStatus();
            showToast("录音已中断");
        }
    });

    // 辅助 UI 函数
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

    // 页面加载完成初始化
    initEvent();
    console.log("MediaRecorder 组件初始化成功");
});
