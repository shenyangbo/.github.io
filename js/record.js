$(document).ready(function() {


	// =============== 全局变量 ===============
	var bt_recoding = document.getElementById("bt_recoding");
	var blackBoxSpeak = document.querySelector(".blackBoxSpeak");
	var blackBoxPause = document.querySelector(".blackBoxPause");
	const toast = document.getElementById("toast");

	let audioContext = null;
	let mediaStreamSource = null;
	let scriptProcessorNode = null;
	let mergedBuffer = new Float32Array(0);
	let bufferLength = 0;
	let currentStream = null;
	let isRecording = false;
	let posStart = 0;
	let audioContextReady = false;
	let isFirstTime = true;
	let permissionGranted = false;
	let hasPermissionBeenDenied = false;
	// 新增：预初始化标记，避免重复初始化
	let isPreInitialized = false;

	// =============== 核心修复：轻量重置（只清数据，不清上下文） ==========
	function resetRecordingState() {
		// 只清空音频数据和录音标记，保留就绪的AudioContext
		isRecording = false;
		mergedBuffer = new Float32Array(0);
		bufferLength = 0;

		// 断开节点但保留上下文
		if (scriptProcessorNode) {
			try {
				scriptProcessorNode.disconnect();
			} catch (e) {}
			scriptProcessorNode = null;
		}
		if (mediaStreamSource) {
			try {
				mediaStreamSource.disconnect();
			} catch (e) {}
			mediaStreamSource = null;
		}

		// 停止流但不关闭上下文
		if (currentStream) {
			try {
				currentStream.getTracks().forEach(track => track.stop());
			} catch (e) {}
			currentStream = null;
		}

		console.log("录音数据已重置（保留AudioContext）");
	}

	// =============== 核心修复：页面切后台才强制重置上下文 ==========
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			// 切后台时才彻底重置（包括上下文）
			resetAllRecordingState();
			initStatus();
			showBlackBoxNone();
			showToast("录音已暂停（切换应用）");
			// 标记需要重新预初始化
			isPreInitialized = false;
		}
	});

	// 彻底重置（仅切后台时用）
	function resetAllRecordingState() {
		resetRecordingState();
		// 关闭上下文（仅切后台时执行）
		if (audioContext) {
			try {
				audioContext.close();
			} catch (e) {}
			audioContext = null;
			audioContextReady = false;
		}
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

	function updateBase64Output(base64) {
		const base64Output = document.getElementById('base64Output');
		if (base64Output) {
			base64Output.innerHTML = `<pre>${base64}</pre>`;
		}

		const audioContainer = document.getElementById('audioContainer');
		if (audioContainer) {
			const audioElement = document.createElement('audio');
			audioElement.controls = true;
			audioElement.src = `data:audio/wav;base64,${base64}`;
			audioContainer.innerHTML = '';
			audioContainer.appendChild(audioElement);
		}
		console.log(base64);
	}

	// =============== 核心修复：预初始化音频上下文（提前激活，避免启动延迟） ==========
	async function preInitAudioContext() {
		if (isPreInitialized && audioContextReady) return true;

		try {
			if (!audioContext || audioContext.state === 'closed') {
				const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
				if (!AudioContextConstructor) {
					throw new Error("当前浏览器不支持AudioContext");
				}
				audioContext = new AudioContextConstructor({
					sampleRate: 8000
				});
			}

			// 提前激活上下文（关键：在用户第一次点击时完成，录音时直接用）
			if (audioContext.state === 'suspended') {
				await audioContext.resume();
			}

			audioContextReady = true;
			isPreInitialized = true;
			console.log("音频上下文预初始化完成，状态：", audioContext.state);
			return true;
		} catch (err) {
			console.error("预初始化AudioContext失败:", err);
			audioContextReady = false;
			isPreInitialized = false;
			return false;
		}
	}

	async function preRequestPermission() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});
			stream.getTracks().forEach(track => track.stop());
			console.log("预权限请求成功");
			return true;
		} catch (err) {
			console.error("预权限请求失败:", err);
			return false;
		}
	}

	// =============== 核心修复：录音启动（复用预初始化的上下文，无延迟） ==========
	async function startRecording() {
		if (isRecording) return;

		// 只清数据，不清上下文（避免重建延迟）
		resetRecordingState();

		if (!permissionGranted) {
			if (!hasPermissionBeenDenied) {
				showToast("请先点击获取麦克风权限");
			} else {
				showToast("麦克风权限已被拒绝，请刷新页面重试。");
			}
			initStatus();
			showBlackBoxNone();
			return;
		}

		try {
			console.log("开始录音流程（复用预初始化上下文）...");

			// 复用预初始化的上下文，无需重建
			if (!audioContextReady) {
				await preInitAudioContext();
			}

			if (!audioContextReady) {
				throw new Error("AudioContext未准备就绪");
			}

			// 快速请求流（权限已提前获取，无延迟）
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});

			currentStream = stream;

			// 立即创建节点并开始采集（无延迟）
			mediaStreamSource = audioContext.createMediaStreamSource(stream);
			scriptProcessorNode = audioContext.createScriptProcessor(1024, 1, 1);
			scriptProcessorNode.onaudioprocess = onAudioProcess;

			mediaStreamSource.connect(scriptProcessorNode);
			scriptProcessorNode.connect(audioContext.destination);

			isRecording = true;
			isFirstTime = false;
			console.log("录音启动成功（无延迟）");

		} catch (err) {
			console.error('录音启动失败:', err);
			resetRecordingState();

			if (err.name === 'NotFoundError') {
				alert('未找到麦克风设备');
			} else if (err.message.includes('AudioContext')) {
				alert('音频系统初始化失败，请重试');
			} else if (err.name === 'NotAllowedError') {
				alert('麦克风权限已被拒绝，请重新获取权限');
				hasPermissionBeenDenied = true;
			} else {
				alert(`录音失败: ${err.message}`);
			}

			initStatus();
			showBlackBoxNone();
			audioContextReady = false;
		}
	}

	// =============== 音频处理（无修改） ===============
	function onAudioProcess(event) {
		if (!isRecording) return;

		const inputBuffer = event.inputBuffer.getChannelData(0);
		const newBuffer = new Float32Array(bufferLength + inputBuffer.length);
		newBuffer.set(mergedBuffer);
		newBuffer.set(inputBuffer, bufferLength);
		mergedBuffer = newBuffer;
		bufferLength += inputBuffer.length;
	}

	function stopRecording() {
		if (!isRecording) return;
		isRecording = false;

		if (scriptProcessorNode) {
			scriptProcessorNode.disconnect();
			scriptProcessorNode = null;
		}
		if (mediaStreamSource) {
			mediaStreamSource.disconnect();
			mediaStreamSource = null;
		}
		if (currentStream) {
			currentStream.getTracks().forEach(track => track.stop());
			currentStream = null;
		}

		processAudioData();
		// 只清数据，保留上下文
		resetRecordingState();
	}

	function encodeWAV(samples, sampleRate) {
		const buffer = new ArrayBuffer(44 + samples.length * 2);
		const view = new DataView(buffer);

		const writeString = (offset, string) => {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		};

		writeString(0, 'RIFF');
		view.setUint32(4, 36 + samples.length * 2, true);
		writeString(8, 'WAVE');
		writeString(12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, 1, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, sampleRate * 2, true);
		view.setUint16(32, 2, true);
		view.setUint16(34, 16, true);
		writeString(36, 'data');
		view.setUint32(40, samples.length * 2, true);

		let offset = 44;
		for (let i = 0; i < samples.length; i++, offset += 2) {
			const s = Math.max(-1, Math.min(1, samples[i]));
			view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
		}

		return new Blob([view], {
			type: 'audio/wav'
		});
	}

	function processAudioData() {
		if (bufferLength === 0) return;

		const wavBlob = encodeWAV(mergedBuffer, 8000);
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = reader.result.split(',')[1];
			updateBase64Output(base64String);
		};
		reader.readAsDataURL(wavBlob);

		mergedBuffer = new Float32Array(0);
		bufferLength = 0;
	}

	// =============== 首次初始化（提前激活上下文） ==========
	async function handleFirstTimeInit() {
		if (!isFirstTime) return true;

		try {
			console.log("iOS首次初始化处理（提前激活上下文）...");
			// 提前初始化上下文（关键：在第一次点击时完成）
			await preInitAudioContext();
			await preRequestPermission();

			console.log("首次初始化完成（上下文已激活）");
			return true;
		} catch (err) {
			console.error("首次初始化失败:", err);
			return false;
		}
	}

	// =============== 权限请求（提前激活上下文） ==========
	async function requestMicrophonePermission() {
		try {
			// 提前初始化上下文（用户点击获取权限时就激活，录音时无延迟）
			await preInitAudioContext();

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			});

			stream.getTracks().forEach(track => track.stop());
			permissionGranted = true;
			hasPermissionBeenDenied = false;
			showToast("麦克风权限已获取，可以开始录音");
			isFirstTime = false;

		} catch (err) {
			console.error("请求麦克风权限失败:", err);
			permissionGranted = false;

			if (err.name === 'NotAllowedError') {
				hasPermissionBeenDenied = true;
				alert('您已拒绝麦克风权限。请刷新页面，再次点击“获取权限”按钮，并在浏览器提示时允许访问。');
			} else {
				alert(`请求麦克风权限时发生错误: ${err.message}`);
			}
		}
	}

	$('.input_voice_switch').click(function() {
		requestMicrophonePermission();
	});

	// =============== 事件绑定（无核心修改） ===============
	function initEvent() {
		bt_recoding.addEventListener("touchstart", async function(event) {
			event.preventDefault();
			posStart = event.touches[0].pageY;

			showBlackBoxSpeak();

			if (navigator.vibrate) {
				navigator.vibrate(100);
			}

			if (hasPermissionBeenDenied) {
				showToast("麦克风权限已被拒绝，请刷新页面重试。");
				initStatus();
				showBlackBoxNone();
				return;
			}

			if (isFirstTime) {
				const initSuccess = await handleFirstTimeInit();
				if (!initSuccess) {
					if (hasPermissionBeenDenied) {
						showToast("麦克风权限已被拒绝，请刷新页面重试。");
					} else {
						showToast("初始化失败，请重试。");
					}
					initStatus();
					showBlackBoxNone();
					return;
				}
			}

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

		bt_recoding.addEventListener("mousedown", async function(event) {
			event.preventDefault();
			showBlackBoxSpeak();

			if (hasPermissionBeenDenied) {
				showToast("麦克风权限已被拒绝，请刷新页面重试。");
				initStatus();
				showBlackBoxNone();
				return;
			}

			if (isFirstTime) {
				const initSuccess = await handleFirstTimeInit();
				if (!initSuccess) {
					if (hasPermissionBeenDenied) {
						showToast("麦克风权限已被拒绝，请刷新页面重试。");
					} else {
						showToast("初始化失败，请重试。");
					}
					initStatus();
					showBlackBoxNone();
					return;
				}
			}

			await startRecording();
		});

		bt_recoding.addEventListener("mouseup", function(event) {
			event.preventDefault();
			stopRecording();
			initStatus();
			showBlackBoxNone();
			$('#bt_recoding').css('color', '#333333');
			$('#bt_recoding').css('background', 'white');
		});
	}

	window.addEventListener('load', function() {
		initEvent();
		console.log("录音组件初始化完成");
	});

	// =============== 其他辅助函数 ===============
	var showBlackBoxSpeak = function() {
		bt_recoding.value = '松开结束';
		blackBoxSpeak.style.display = "block";
		blackBoxPause.style.display = "none";
		$('#bt_recoding').css('background', '#3473F4');
		$('#bt_recoding').css('color', '#ffffff');
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

	function clearRecording() {
		mergedBuffer = new Float32Array(0);
		bufferLength = 0;
	}

	function clearBase64Output() {
		const base64Output = document.getElementById('base64Output');
		if (base64Output) {
			base64Output.innerText = '';
		}
	}
})