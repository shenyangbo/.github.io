$(document).ready(function() {

	// =============== 全局变量 ===============
	var bt_recoding = document.getElementById("bt_recoding");
	var blackBoxSpeak = document.querySelector(".blackBoxSpeak");
	var blackBoxPause = document.querySelector(".blackBoxPause");
	const toast = document.getElementById("toast");

	let mediaRecorder = null;
	let audioChunks = []; 
	let currentStream = null; // 关键：持久化持有流，实现热启动
	let isRecording = false;
	let posStart = 0;
	let permissionGranted = false;
	let hasPermissionBeenDenied = false;

	// =============== 核心修复：状态重置（不关闭流） ==========
	function resetRecordingState() {
		isRecording = false;
		audioChunks = [];

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			try {
				mediaRecorder.stop();
			} catch (e) {}
		}
		// 核心改动：这里不停止 currentStream，保持硬件唤醒状态
		console.log("录音状态已重置（保留硬件唤醒）");
	}

	// =============== 核心修复：安全退出（切后台必须关闭） ==========
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			// 切后台时为了隐私和系统合规，必须彻底关掉麦克风
			if (isRecording) {
				stopRecording();
			}
			if (currentStream) {
				currentStream.getTracks().forEach(track => track.stop());
				currentStream = null; // 清空流，下次回来会重新获取
			}
			resetRecordingState();
			initStatus();
			showBlackBoxNone();
			showToast("录音已重置");
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

	// =============== 核心重构：开始录音（零延迟启动） ==========
	async function startRecording() {
		if (isRecording) return;
		audioChunks = []; // 确保每次开始前清空缓存

		if (!permissionGranted) {
			showToast("请先点击获取权限");
			initStatus();
			return;
		}

		try {
			// 如果流不存在（初次或切后台回来），则重新获取
			if (!currentStream || !currentStream.active) {
				console.log("正在重新初始化音频流...");
				currentStream = await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true
					}
				});
			}

			// iOS 通常支持 audio/mp4，安卓/PC 支持 audio/webm
			const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
			
			// 瞬间创建 Recorder 实例
			mediaRecorder = new MediaRecorder(currentStream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunks, { type: mimeType });
				processAudioBlob(audioBlob);
			};

			// 直接启动，无需再次等待硬件唤醒
			mediaRecorder.start();
			isRecording = true;
			console.log("MediaRecorder 瞬间启动成功");

		} catch (err) {
			console.error('录音启动失败:', err);
			permissionGranted = false;
			showToast("录音启动失败，请刷新");
		}
	}

	function stopRecording() {
		if (!isRecording || !mediaRecorder) return;
		isRecording = false;

		try {
			// 停止录音，触发 onstop 将数据转为 Blob
			mediaRecorder.stop(); 
		} catch (e) {
			console.error("停止录音异常:", e);
		}
		// 注意：此处不执行 currentStream.stop()，实现热启动
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

	// =============== 权限请求（提前占坑） ==========
	async function requestMicrophonePermission() {
		try {
			// 在用户手动点击切换按钮时，直接唤醒麦克风并保持
			currentStream = await navigator.mediaDevices.getUserMedia({ 
				audio: true 
			});
			permissionGranted = true;
			hasPermissionBeenDenied = false;
			showToast("麦克风已就绪");
			console.log("权限已预先获取，流已激活");
		} catch (err) {
			permissionGranted = false;
			if (err.name === 'NotAllowedError') {
				hasPermissionBeenDenied = true;
				alert('权限被拒绝，请在微信设置中开启后刷新页面');
			} else {
				alert('无法访问麦克风：' + err.message);
			}
		}
	}

	$('.input_voice_switch').click(function() {
		requestMicrophonePermission();
	});

	// =============== 事件绑定 ===============
	function initEvent() {
		bt_recoding.addEventListener("touchstart", async function(event) {
			event.preventDefault();
			posStart = event.touches[0].pageY;

			if (!permissionGranted) {
				showToast("请先点击下方按钮授权");
				return;
			}

			showBlackBoxSpeak();
			if (navigator.vibrate) navigator.vibrate(100);
			
			await startRecording();
		});

		bt_recoding.addEventListener("touchmove", function(event) {
			event.preventDefault();
			const posMove = event.targetTouches[0].pageY;
			if (posStart - posMove < 40) {
				showBlackBoxSpeak();
			} else {
				showBlackBoxPause();
			}
		});

		bt_recoding.addEventListener("touchend", function(event) {
			event.preventDefault();
			const posEnd = event.changedTouches[0].pageY;
			
			stopRecording();
			initStatus();

			if (posStart - posEnd < 40) {
				showBlackBoxNone();
			} else {
				showToast("取消发送");
				audioChunks = []; // 丢弃当前数据
				showBlackBoxNone();
			}
			$('#bt_recoding').css({'color': '#333333', 'background': 'white'});
		});

		// 鼠标事件兼容
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

	// =============== UI 辅助函数 ===============
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
