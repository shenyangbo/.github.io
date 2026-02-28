$(document).ready(function() {

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

	// =============== 状态重置 ==========
	function resetRecordingState() {
		isRecording = false;
		audioChunks = [];

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			try {
				mediaRecorder.stop();
			} catch (e) {}
		}
	}

	// =============== 安全退出 ==========
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			if (isRecording) stopRecording();
			if (currentStream) {
				currentStream.getTracks().forEach(track => track.stop());
				currentStream = null;
			}
			resetRecordingState();
			initStatus();
			showBlackBoxNone();
		}
	});

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

	// =============== 核心重构：开始录音（解决音量小的问题） ==========
	async function startRecording() {
		if (isRecording) return;
		audioChunks = [];

		if (!permissionGranted) {
			showToast("请先点击获取权限");
			initStatus();
			return;
		}

		try {
			// 修复音量的关键：如果发现音量异常，我们需要重新获取流，并禁用所有处理算法
			if (!currentStream || !currentStream.active) {
				currentStream = await navigator.mediaDevices.getUserMedia({
					audio: {
						// ！！！关键配置：禁用所有导致音量变小的处理 ！！！
						echoCancellation: false, // 禁用回声消除
						noiseSuppression: false, // 禁用降噪
						autoGainControl: false,  // 禁用自动增益，防止音量被自动压低
					}
				});
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

			mediaRecorder.start();
			isRecording = true;
		} catch (err) {
			console.error('启动失败:', err);
			showToast("录音启动失败");
		}
	}

	function stopRecording() {
		if (!isRecording || !mediaRecorder) return;
		isRecording = false;
		try {
			mediaRecorder.stop(); 
		} catch (e) {}
	}

	function processAudioBlob(blob) {
		if (blob.size === 0) return;
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = reader.result.split(',')[1];
			updateBase64Output(base64String, blob.type);
		};
		reader.readAsDataURL(blob);
	}

	// =============== 权限请求（带音量修复） ==========
	async function requestMicrophonePermission() {
		try {
			// 在初次获取权限时就直接设定好禁用处理
			currentStream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false,
				} 
			});
			permissionGranted = true;
			hasPermissionBeenDenied = false;
			showToast("麦克风已就绪");
		} catch (err) {
			permissionGranted = false;
			alert('授权失败，请重试');
		}
	}

	$('.input_voice_switch').click(function() {
		requestMicrophonePermission();
	});

	// 事件绑定部分保持不变
	function initEvent() {
		bt_recoding.addEventListener("touchstart", async function(event) {
			event.preventDefault();
			posStart = event.touches[0].pageY;
			if (!permissionGranted) return;
			showBlackBoxSpeak();
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
			showBlackBoxNone();
			$('#bt_recoding').css({'color': '#333333', 'background': 'white'});
		});

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

	window.addEventListener('load', initEvent);

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