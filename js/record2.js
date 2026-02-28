
$(document).ready(function() {
	// $('.num_container').hide();
	// =============== 全局变量 ===============
	var bt_recoding = document.getElementById("bt_recoding");
	var blackBoxSpeak = document.querySelector(".blackBoxSpeak");
	var blackBoxPause = document.querySelector(".blackBoxPause");
	const toast = document.getElementById("toast");

	let mediaRecorder = null;
	let audioChunks = []; 
	let currentStream = null;
	let isRecording = false;
	let posStart = 0;
	let permissionGranted = false;
	let hasPermissionBeenDenied = false;

	// 修复安卓录音开头丢失：提前创建 recorder 预热
	let pendingRecorder = null;

	// =============== 核心修复：状态重置 ==========
	function resetRecordingState() {
		isRecording = false;
		audioChunks = [];

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			try { mediaRecorder.stop(); } catch (e) {}
		}
		console.log("录音状态已重置");
	}

	function clearRecording() {
		audioChunks = [];
	}

	function clearBase64Output() {
		const base64Output = document.getElementById('base64Output');
		const audioContainer = document.getElementById('audioContainer');
		if (base64Output) base64Output.innerHTML = '';
		if (audioContainer) audioContainer.innerHTML = '';
	}

	// =============== 工具函数 ===============
	function showToast(message) {
		toast.innerText = message;
		toast.style.display = 'block';
		setTimeout(() => {
			toast.style.display = 'none';
		}, 1000);
	}

	function initStatus() {
		bt_recoding.value = '按住说话';
		showBlackBoxNone();
	}

	function showBlackBoxNone() {
		blackBoxSpeak.style.display = "none";
		blackBoxPause.style.display = "none";
	}

	function updateBase64Output(base64, mimeType) {
		const base64Output = document.getElementById('base64Output');
		if (base64Output) {
			base64Output.innerHTML = `<pre>${base64}</pre>`;
		}

		const audioContainer = document.getElementById('audioContainer');
		if (audioContainer) {
			const audioElement = document.createElement('audio');
			audioElement.controls = true;
			audioElement.src = `data:${mimeType};base64,${base64}`;
			audioContainer.innerHTML = '';
			audioContainer.appendChild(audioElement);
		}
	}

	// =============== 最佳格式获取 ==========
	function getBestMimeType() {
		const types = [
			'audio/mp4', 'audio/aac', 'audio/webm;codecs=opus',
			'audio/webm', 'audio/mpeg'
		];
		for (let t of types) {
			if (MediaRecorder.isTypeSupported(t)) return t;
		}
		return '';
	}

	// =============== 预热录音机（安卓关键修复） ==========
	async function warmUpRecorder() {
		if (!currentStream || !currentStream.active) return;
		const mimeType = getBestMimeType();
		const options = mimeType ? { mimeType } : {};
		pendingRecorder = new MediaRecorder(currentStream, options);
		console.log("录音机已预热");
	}

	// =============== 开始录音（修复安卓开头丢失） ==========
	async function startRecording() {
	    if (isRecording || !permissionGranted) return;

	    // 停止所有播放音频，避免占用
	    const allAudios = document.querySelectorAll('audio');
	    allAudios.forEach(audio => {
	        audio.pause();
	        audio.src = '';
	        audio.load();
	    });

	    audioChunks = [];

	    try {
	        if (!currentStream || !currentStream.active) {
	            currentStream = await navigator.mediaDevices.getUserMedia({
	                audio: {
	                    echoCancellation: true,
	                    noiseSuppression: true,
	                    autoGainControl: true
	                }
	            });
	        }

			// 安卓修复：使用预热好的 recorder，不现场创建
			if (pendingRecorder) {
				mediaRecorder = pendingRecorder;
			} else {
				const mimeType = getBestMimeType();
				const options = mimeType ? { mimeType } : {};
				mediaRecorder = new MediaRecorder(currentStream, options);
			}

	        mediaRecorder.ondataavailable = (e) => {
	            if (e.data.size > 0) audioChunks.push(e.data);
	        };

	        mediaRecorder.onstop = () => {
	            const finalMime = mediaRecorder?.mimeType || 'audio/mp4';
	            const audioBlob = new Blob(audioChunks, { type: finalMime });
	            const reader = new FileReader();
	            reader.onloadend = () => {
	                if (reader.result) {
	                    const base64 = reader.result.split(',')[1];
	                    updateBase64Output(base64, finalMime);
	                }
	            };
	            reader.readAsDataURL(audioBlob);
	        };

			// 安卓修复：延迟 100ms 再 start，解决前几个字录不到
			setTimeout(() => {
				if (mediaRecorder && mediaRecorder.state === "inactive") {
					mediaRecorder.start(100);
					isRecording = true;
					console.log("录音开始（延迟启动，修复安卓）");
				}
			}, 100);

	    } catch (err) {
	        console.error("启动失败:", err);
	        showToast("启动失败，请重试");
	    }
	}

	// =============== 停止录音 ==========
	function stopRecording() {
		if (!isRecording || !mediaRecorder) return;
		isRecording = false;

		try {
			if (mediaRecorder.state !== 'inactive') {
				mediaRecorder.stop();
			}
		} catch (e) {}
	}

	// =============== 权限请求 ==========
	async function requestMicrophonePermission() {
		try {
			currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			permissionGranted = true;
			hasPermissionBeenDenied = false;
			showToast("麦克风已就绪");

			// 授权后立即预热录音机
			warmUpRecorder();
		} catch (err) {
			permissionGranted = false;
			alert('麦克风权限被拒绝，请开启后刷新');
		}
	}

	$('.input_voice_switch').click(function() {
		requestMicrophonePermission();
	});

	// =============== 事件绑定 ===============
	function initEvent() {
		// 触摸开始
		bt_recoding.addEventListener("touchstart", async function(event) {
			event.preventDefault();
			posStart = event.touches[0].pageY;

			if (!permissionGranted) {
				showToast("请先授权麦克风");
				return;
			}

			showBlackBoxSpeak();
			if (navigator.vibrate) navigator.vibrate(100);
			
			await startRecording();
		});

		// 触摸移动
		bt_recoding.addEventListener("touchmove", function(event) {
			event.preventDefault();
			const posMove = event.targetTouches[0].pageY;
			if (posStart - posMove < 40) {
				showBlackBoxSpeak();
			} else {
				showBlackBoxPause();
			}
		});

		// ===================== 触摸结束（你要的代码已加进去 ✅）=====================
		bt_recoding.addEventListener("touchend", function(event) {
			event.preventDefault();
			const posEnd = event.changedTouches[0].pageY;
			
			stopRecording();
			initStatus();

			// ========== 你给的代码 我已经完整放这里了 ==========
			if (posStart - posEnd < 40) {
				showBlackBoxNone();
				$('#bt_recoding').css('color', '#333333');
				$('#bt_recoding').css('background', 'white');
			} else {
				showToast("取消发送");
				$('#bt_recoding').css('color', '#333333');
				$('#bt_recoding').css('background', 'white');

				resetRecordingState();
				clearRecording();
				clearBase64Output();
				showBlackBoxNone();
			}
		});

		// 鼠标兼容
		bt_recoding.addEventListener("mousedown", async function(event) {
			event.preventDefault();
			if (!permissionGranted) return;
			showBlackBoxSpeak();
			await startRecording();
		});

		bt_recoding.addEventListener("mouseup", function(event) {
			event.preventDefault();
			stopRecording();
			initStatus();
			showBlackBoxNone();
			$('#bt_recoding').css({'color': '#333333', 'background': 'white'});
		});
	}

	window.addEventListener('load', function() {
		initEvent();
	});

	// =============== UI ===============
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
});
</script>
