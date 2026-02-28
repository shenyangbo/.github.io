$(document).ready(function() {
//////$('.num_container').hide();
	// =============== 全局变量 ===============
	var bt_recoding = document.getElementById("bt_recoding");
	var blackBoxSpeak = document.querySelector(".blackBoxSpeak");
	var blackBoxPause = document.querySelector(".blackBoxPause");
	const toast = document.getElementById("toast");

	// 重构核心：使用 MediaRecorder 相关的变量
	let mediaRecorder = null;
	let audioChunks = []; 
	let currentStream = null;
	let isRecording = false;
	let posStart = 0;
	let isFirstTime = true;
	let permissionGranted = false;
	let hasPermissionBeenDenied = false;
	let isPreInitialized = false;

	// =============== 核心修复：重置状态（MediaRecorder 版） ==========
	function resetRecordingState() {
		isRecording = false;
		audioChunks = [];

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			try {
				mediaRecorder.stop();
			} catch (e) {}
		}
		
		if (currentStream) {
			try {
				currentStream.getTracks().forEach(track => track.stop());
			} catch (e) {}
			currentStream = null;
		}
		console.log("录音状态已重置");
	}

	// =============== 核心修复：页面切后台处理 ==========
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			// 切后台时停止当前录音，MediaRecorder 会更稳定地释放资源
			if (isRecording) {
				stopRecording();
			}
			resetAllRecordingState();
			initStatus();
			showBlackBoxNone();
			showToast("录音已暂停（切换应用）");
		}
	});

	function resetAllRecordingState() {
		resetRecordingState();
		isPreInitialized = false;
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
			// 注意：MediaRecorder 的 MIME 类型可能是 audio/webm 或 audio/mp4(iOS)
			audioElement.src = `data:${mimeType};base64,${base64}`;
			audioContainer.innerHTML = '';
			audioContainer.appendChild(audioElement);
		}
		console.log("音频 Base64 已生成");
	}

	// =============== 核心重构：开始录音（MediaRecorder） ==========
	async function startRecording() {
		if (isRecording) return;

		resetRecordingState();

		if (!permissionGranted) {
			if (!hasPermissionBeenDenied) {
				showToast("请先点击获取麦克风权限");
			} else {
				showToast("麦克风权限已被拒绝，请刷新页面。");
			}
			initStatus();
			showBlackBoxNone();
			return;
		}

		try {
			console.log("开始录音（MediaRecorder）...");

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			currentStream = stream;
			
			// 自动检测浏览器支持的格式 (iOS Safari 通常支持 audio/mp4)
			const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
			
			mediaRecorder = new MediaRecorder(stream);
			audioChunks = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunks, { type: mimeType });
				processAudioBlob(audioBlob);
			};

			// 开启采集
			mediaRecorder.start();
			isRecording = true;
			isFirstTime = false;
			console.log("MediaRecorder 启动成功");

		} catch (err) {
			console.error('录音启动失败:', err);
			resetRecordingState();
			alert(`录音失败: ${err.name}`);
			initStatus();
			showBlackBoxNone();
		}
	}

	function stopRecording() {
		if (!isRecording || !mediaRecorder) return;
		isRecording = false;

		try {
			mediaRecorder.stop(); // 触发 onstop 回调进行数据处理
		} catch (e) {
			console.error("停止录音异常:", e);
		}

		if (currentStream) {
			currentStream.getTracks().forEach(track => track.stop());
		}
	}

	// 处理录音生成的 Blob
	function processAudioBlob(blob) {
		if (blob.size === 0) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = reader.result.split(',')[1];
			updateBase64Output(base64String, blob.type);
		};
		reader.readAsDataURL(blob);
	}

	// =============== 权限与初始化（保持原有逻辑） ==========
	async function requestMicrophonePermission() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach(track => track.stop());
			permissionGranted = true;
			hasPermissionBeenDenied = false;
			showToast("麦克风权限已获取");
			isFirstTime = false;
		} catch (err) {
			permissionGranted = false;
			if (err.name === 'NotAllowedError') {
				hasPermissionBeenDenied = true;
				alert('权限被拒绝，请刷新重试');
			}
		}
	}

	$('.input_voice_switch').click(function() {
		requestMicrophonePermission();
	});

	function initEvent() {
		// touchstart / mousedown 等事件保持不变，内部调用重构后的 startRecording
		bt_recoding.addEventListener("touchstart", async function(event) {
			event.preventDefault();
			posStart = event.touches[0].pageY;
			showBlackBoxSpeak();
			if (navigator.vibrate) navigator.vibrate(100);
			if (hasPermissionBeenDenied) return;
			await startRecording();
		});

		bt_recoding.addEventListener("touchmove", function(event) {
			event.preventDefault();
			const posMove = event.targetTouches[0].pageY;
			if (posStart - posMove < 40) showBlackBoxSpeak();
			else showBlackBoxPause();
		});

		bt_recoding.addEventListener("touchend", function(event) {
			event.preventDefault();
			const posEnd = event.changedTouches[0].pageY;
			stopRecording();
			initStatus();
			if (posStart - posEnd >= 40) {
				showToast("取消发送");
				resetRecordingState();
				showBlackBoxNone();
			} else {
				showBlackBoxNone();
			}
			$('#bt_recoding').css({'color': '#333333', 'background': 'white'});
		});

		// 鼠标事件兼容
		bt_recoding.addEventListener("mousedown", async function(event) {
			event.preventDefault();
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
		console.log("MediaRecorder 录音组件加载完成");
	});

	// UI 辅助函数保持不变
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

	var showBlackBoxNone = function() {
		blackBoxSpeak.style.display = "none";
		blackBoxPause.style.display = "none";
	}
});上面的问题是HTTPS的问题，不用解决了，但是有个新问题，就是用了几次后，会有前面几个字没有录到的情况
