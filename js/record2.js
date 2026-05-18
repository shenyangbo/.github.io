$(document).ready(function() {
	// =============== 全局变量 ===============
	const bt_recoding = document.getElementById("bt_recoding");
	const bt_background = document.getElementsByClassName('voice_input');
	const input_state = document.getElementsByClassName('input_state');
	const blackBoxSpeak = document.querySelector(".blackBoxSpeak");
	const blackBoxPause = document.querySelector(".blackBoxPause");
	const toast = document.getElementById("toast");
	let audioChunks = [];
	let currentStream = null; // iOS 优化：持久化单例流
	let gainNode = null; // 增益补偿
	let isRecording = false;
	let isCancelled = false;
	let posStart = 0;
	let startX = 0; // 【新增】记录触摸起始X坐标
	let startY = 0; // 【新增】记录触摸起始Y坐标
	let workletNode = null; // 替代ScriptProcessor的AudioWorklet节点
	let isWorkletReady = false; // Worklet加载状态标记
	let isPressing = false; // 判断手指是否还在按压中

	// =============== 系统判断与分系统AudioContext激活 ===============
	function getOS() {
		const userAgent = navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
		if (/android/.test(userAgent)) return 'android';
		return 'other';
	}

	const currentOS = getOS();
	let audioCtx = null; // 单例音频上下文（统一管理）
	let isAudioCtxActivated = false; // 标记是否已成功激活

	// 预创建AudioContext（仅创建不激活，等待用户交互）
	function initAudioContext() {
		if (audioCtx) return;
		const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextConstructor) {
			showToast("当前浏览器不支持录音功能");
			return;
		}
		audioCtx = new AudioContextConstructor({
			latencyHint: 'interactive',
			sampleRate: 8000
		});
	}

	// 分系统同步激活AudioContext（严格遵循各系统权限规则）
	function activateAudioContextSync() {
		if (!audioCtx) initAudioContext();
		if (isAudioCtxActivated || audioCtx.state === 'running') {
			isAudioCtxActivated = true;
			return;
		}

		// iOS：必须在用户交互的同步栈中执行，不能有任何异步包裹
		if (currentOS === 'ios') {
			try {
				audioCtx.resume();
				isAudioCtxActivated = true;
				console.log("iOS AudioContext 同步激活成功");
			} catch (err) {
				console.error("iOS AudioContext 激活失败:", err);
				showToast("录音激活失败，请重试");
			}
		}
		// Android：允许轻微异步，同步执行更稳定
		else if (currentOS === 'android') {
			audioCtx.resume().then(() => {
				isAudioCtxActivated = true;
				console.log("Android AudioContext 激活成功");
			}).catch(err => {
				console.error("Android AudioContext 激活失败:", err);
				showToast("录音激活失败，请重试");
			});
		}
	}

	// 页面加载时预创建音频上下文
	initAudioContext();

	// =============== 工具函数 ===============
	function showToast(message) {
		toast.innerText = message;
		toast.style.display = 'block';
		setTimeout(() => {
			toast.style.display = 'none';
		}, 1500);
	}

	function initStatus() {
		bt_recoding.value = '按住说话';
		showBlackBoxNone();
		$(bt_background).css('background', '#ffffff');
		$(bt_recoding).css({
			'background': 'white'
		});
		$(bt_recoding).css({
			'color': '#333333'
		});
		$(input_state).removeClass('input_state_red');
		$(input_state).css('display', 'none');
		$('.bottom_input').css('background', '#b4d0ff');
		$(bt_background).removeClass('bottom_input_active');
	}

	function showBlackBoxNone() {
		blackBoxSpeak.style.display = "none";
		blackBoxPause.style.display = "none";
	}

	// WAV编码核心函数（标准16位单声道WAV，兼容绝大多数后端）
	function encodeWav(samples, sampleRate, numChannels = 1) {
		const buffer = new ArrayBuffer(44 + samples.length * 2);
		const view = new DataView(buffer);
		// RIFF文件头
		writeString(view, 0, 'RIFF');
		view.setUint32(4, 36 + samples.length * 2, true);
		writeString(view, 8, 'WAVE');
		// fmt格式子块
		writeString(view, 12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true); // PCM线性编码
		view.setUint16(22, numChannels, true); // 单声道
		view.setUint32(24, sampleRate, true); // 采样率
		view.setUint32(28, sampleRate * numChannels * 2, true); // 字节率
		view.setUint16(32, numChannels * 2, true); // 块对齐
		view.setUint16(34, 16, true); // 16位深
		// data数据块
		writeString(view, 36, 'data');
		view.setUint32(40, samples.length * 2, true);
		// 浮点转16位PCM
		floatTo16BitPCM(view, 44, samples);
		return buffer;
	}

	function writeString(view, offset, string) {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}

	function floatTo16BitPCM(view, offset, input) {
		for (let i = 0; i < input.length; i++, offset += 2) {
			const s = Math.max(-1, Math.min(1, input[i]));
			view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
		}
	}

	// =============== 核心：iOS兼容的预热+Worklet初始化 ===============
	async function prepareMic() {
		// 音频上下文已在touchstart同步激活，这里只做状态检查
		if (!audioCtx || !isAudioCtxActivated) {
			throw new Error("音频上下文未激活，请重试");
		}

		// AudioWorklet 只加载一次
		if (!isWorkletReady) {
			const workletCode = `
                    class RecorderProcessor extends AudioWorkletProcessor {
                        process(inputs, outputs) {
                            const input = inputs[0];
                            if (input.length > 0) {
                                this.port.postMessage(input[0]);
                            }
                            return true;
                        }
                    }
                    registerProcessor('recorder-processor', RecorderProcessor);
                `;
			const workletBlob = new Blob([workletCode], {
				type: 'application/javascript'
			});
			const workletUrl = URL.createObjectURL(workletBlob);
			try {
				await audioCtx.audioWorklet.addModule(workletUrl);
				isWorkletReady = true;
				console.log("AudioWorklet 初始化完成");
			} finally {
				URL.revokeObjectURL(workletUrl);
			}
		}

		// 麦克风流（持久化复用，避免 iOS 频繁申请权限导致的硬件休眠）
		if (!currentStream || !currentStream.active) {
			currentStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: true,
					sampleRate: 8000
				}
			});
			console.log("麦克风流已就绪");
		}
	}

	// =============== 录音核心功能（AudioWorklet版，iOS完美兼容） ===============
	async function startRecording() {
		if (isRecording) return;
		isCancelled = false;
		audioChunks = [];
		try {
			// prepareMic 已在 enterVoiceMode 里 await 完成，这里只做防御性检查
			if (!isWorkletReady || !currentStream || !audioCtx) {
				throw new Error("录音环境未就绪");
			}
			// 音频链路：麦克风 → 增益 → Worklet → destination
			// iOS 必须连接 destination，否则 AudioContext 会被系统暂停
			const source = audioCtx.createMediaStreamSource(currentStream);
			gainNode = audioCtx.createGain();
			gainNode.gain.value = 1.3;
			if (workletNode) {
				workletNode.port.onmessage = null;
				workletNode.disconnect();
			}
			workletNode = new AudioWorkletNode(audioCtx, 'recorder-processor');
			workletNode.port.onmessage = (e) => {
				if (!isRecording) return;
				audioChunks.push(new Float32Array(e.data));
			};
			source.connect(gainNode);
			gainNode.connect(workletNode);
			workletNode.connect(audioCtx.destination);
			isRecording = true;
		} catch (err) {
			console.error("启动录音失败:", err);
			showToast("录音启动失败，请检查麦克风权限");
			initStatus();
		}
	}

	async function stopRecording(isCancelAction = false) {
		// 【关键修复】：如果录音根本还没启动（比如预热太久就松手了），直接清理并返回
		if (!isRecording) {
			isCancelled = true;
			return;
		}
		isCancelled = isCancelAction;
		isRecording = false;
		await new Promise(resolve => setTimeout(resolve, 50));
		// 停止采集，清理节点
		if (workletNode) {
			try {
				workletNode.port.onmessage = null;
				workletNode.disconnect();
				workletNode = null;
			} catch (e) {
				console.error('停止采集失败:', e);
			}
		}
		// 取消发送直接清空数据
		if (isCancelled) {
			audioChunks = [];
			return;
		}
		// 无音频数据直接返回
		if (audioChunks.length === 0) {
			console.warn('未采集到有效音频数据');
			showToast("未录到有效声音");
			return;
		}
		// 合并所有PCM采样数据
		let totalLength = 0;
		for (const chunk of audioChunks) {
			totalLength += chunk.length;
		}
		const mergedData = new Float32Array(totalLength);
		let offset = 0;
		for (const chunk of audioChunks) {
			mergedData.set(chunk, offset);
			offset += chunk.length;
		}
		// 编码为标准WAV格式
		const wavBuffer = encodeWav(mergedData, audioCtx.sampleRate, 1);
		// 【文件类型报错兜底】如果后端提示不支持，将下面的audio/wav改为audio/x-wav
		const wavBlob = new Blob([wavBuffer], {
			type: 'audio/wav'
		});
		// 完全复用原有处理逻辑
		processAudioBlob(wavBlob);
		// 清理数据
		audioChunks = [];
		// 【iOS优化】不在这里关闭麦克风流，仅在页面隐藏/销毁时关闭
	}

	function processAudioBlob(blob) {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = reader.result.split(',')[1];
			updateBase64Output(base64String, blob.type);
		};
		reader.readAsDataURL(blob);
	}

	// =============== 事件绑定（安卓核心修复部分） ===============
	function initEvent() {
		let pressTimer = null;
		// 【安卓优化】长按阈值调整为300ms（安卓系统默认长按阈值）
		const LONG_PRESS_TIME = currentOS === 'android' ? 300 : 250;
		// 【安卓优化】允许的微小移动阈值（15px，覆盖绝大多数手指抖动情况）
		const MOVE_TOLERANCE = currentOS === 'android' ? 15 : 10;
		let isLongPressActive = false;

		// 公共：滑动位移判定（录音中上划取消）
		function handleMoveLogic(currentY) {
			if (posStart - currentY < 50) {
				showBlackBoxSpeak();
			} else {
				showBlackBoxPause();
			}
		}

		async function enterVoiceMode(preparePromise) {
			isLongPressActive = true;
			// 1. 立即切换 UI，给用户即时反馈
			$('.mode_input').hide();
			$('.voice_input').css('display', 'flex');
			if (navigator.vibrate) navigator.vibrate(40);
			// 2. 等待权限/预热完成期间，隐藏 input_state
			$(input_state).css('display', 'none');
			// 3. 等待预热完成，捕获错误
			try {
				await preparePromise;
			} catch (err) {
				console.warn("prepareMic 失败:", err);
				showToast("请先点击话筒图标授权录音");
				isLongPressActive = false;
				initStatus();
				$('.voice_input').hide();
				$('.mode_input').css('display', 'flex');
				return;
			}
			// 4. 检查长按会话是否仍有效
			if (!isLongPressActive) {
				initStatus();
				$('.voice_input').hide();
				$('.mode_input').css('display', 'flex');
				return;
			}
			// 5. 【安卓优化】确保DOM渲染完成后再显示录音UI和启动录音
			if (currentOS === 'android') {
				await new Promise(resolve => requestAnimationFrame(resolve));
			}
			// 6. 预热完成，显示录音 UI
			showBlackBoxSpeak();
			// 7. 启动录音
			await startRecording();
		}

		// 公共：松手处理（touchend）
		async function handleVoiceTouchEnd(event) {
			isPressing = false;
			$('body').css({
				'overflow': '',
				'touch-action': ''
			});
			if (pressTimer) {
				// 短按（点击）：切换到文字输入
				clearTimeout(pressTimer);
				pressTimer = null;
				isLongPressActive = false;
				$('.mode_input, .voice_input').hide();
				$('.text_input').css('display', 'flex');
				const input = document.getElementById('userInput');
				input.removeAttribute('readonly');
				input.disabled = false;
				input.focus(); // iOS 键盘唤起：必须在 touchend 同步栈调用
				return;
			}
			// 长按结束：停止录音
			isLongPressActive = false;
			event.preventDefault(); // 防止安卓产生合成 click
			const posEnd = event.changedTouches[0].pageY;
			const isCancel = (posStart - posEnd >= 50);
			showToast(isCancel ? '取消发送' : '已发送');
			await stopRecording(isCancel);
			initStatus();
			$('.voice_input, .text_input').hide();
			$('.mode_input').css('display', 'flex');
		}

		// 1. #bt_recoding：已在语音模式，直接按住录音
		bt_recoding.addEventListener('touchstart', function(event) {
			event.preventDefault();
			activateAudioContextSync(); // 同步激活音频上下文
			// 记录起始坐标
			startX = event.touches[0].clientX;
			startY = event.touches[0].clientY;
			posStart = startY;
			isPressing = true;
			// 并行启动预热，不阻塞 timer 注册
			const preparePromise = prepareMic();
			pressTimer = setTimeout(() => {
				pressTimer = null;
				if (!isPressing) return;
				enterVoiceMode(preparePromise);
			}, LONG_PRESS_TIME);
		});

		bt_recoding.addEventListener('touchmove', function(event) {
			// 【安卓核心修复】只有移动超过阈值才清除定时器
			if (pressTimer) {
				const dx = Math.abs(event.touches[0].clientX - startX);
				const dy = Math.abs(event.touches[0].clientY - startY);
				if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
					clearTimeout(pressTimer);
					pressTimer = null;
				}
				return;
			}
			// 长按已激活，处理上滑取消逻辑
			handleMoveLogic(event.touches[0].pageY);
		});

		bt_recoding.addEventListener('touchend', async function(event) {
			await handleVoiceTouchEnd(event);
		});

		bt_recoding.addEventListener('touchcancel', function() {
			console.log("bt_recoding touchcancel 触发");
			isPressing = false;
			isLongPressActive = false;
			clearTimeout(pressTimer);
			pressTimer = null;
			initStatus();
		});

		// 2. #inputMode：点击→文字输入，长按→语音录音（安卓重点修复）
		const inputMode = document.getElementById('inputMode');
		inputMode.addEventListener('touchstart', function(event) {
			event.preventDefault();
			activateAudioContextSync(); // 同步激活音频上下文
			$('body').css({
				'overflow': 'hidden',
				'touch-action': 'none'
			});
			// 记录起始坐标
			startX = event.touches[0].clientX;
			startY = event.touches[0].clientY;
			posStart = startY;
			isPressing = true;
			// 【安卓优化】延迟启动预热，避免权限弹窗触发touchcancel
			const preparePromise = new Promise((resolve) => {
				setTimeout(() => {
					prepareMic().then(resolve).catch(resolve);
				}, 100);
			});
			pressTimer = setTimeout(() => {
				pressTimer = null;
				if (!isPressing) return;
				enterVoiceMode(preparePromise);
			}, LONG_PRESS_TIME);
		}, {
			passive: false
		});

		inputMode.addEventListener('touchmove', function(event) {
			event.preventDefault();
			// 【安卓核心修复】只有移动超过阈值才清除定时器
			if (pressTimer) {
				const dx = Math.abs(event.touches[0].clientX - startX);
				const dy = Math.abs(event.touches[0].clientY - startY);
				if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
					clearTimeout(pressTimer);
					pressTimer = null;
				}
				return;
			}
			// 长按已激活，处理上滑取消逻辑
			handleMoveLogic(event.touches[0].pageY);
		}, {
			passive: false
		});

		inputMode.addEventListener('touchend', async function(event) {
			await handleVoiceTouchEnd(event);
		});

		inputMode.addEventListener('touchcancel', function() {
			console.log("inputMode touchcancel 触发（安卓权限弹窗导致）");
			isPressing = false;
			isLongPressActive = false;
			$('body').css({
				'overflow': '',
				'touch-action': ''
			});
			clearTimeout(pressTimer);
			pressTimer = null;
			// 【安卓修复】权限弹窗关闭后自动恢复初始状态
			setTimeout(() => {
				initStatus();
				$('.voice_input, .text_input').hide();
				$('.mode_input').css('display', 'flex');
			}, 300);
		});

		// 键盘弹出/收起监听
		let initialViewportHeight = window.visualViewport ?
			window.visualViewport.height :
			window.innerHeight;
		let isManualSwitch = false;

		function handleKeyboardChange() {
			const currentHeight = window.visualViewport ?
				window.visualViewport.height :
				window.innerHeight;
			const keyboardClosed = currentHeight >= initialViewportHeight - 50;
			if (keyboardClosed) {
				setTimeout(() => {
					if (isManualSwitch) {
						isManualSwitch = false;
						return;
					}
					$('#userInput').blur();
					$('.text_input, .voice_input').hide();
					$('.mode_input').css('display', 'flex');
				}, 80);
			}
		}

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleKeyboardChange);
		} else {
			window.addEventListener('resize', handleKeyboardChange);
		}
	}

	// 页面隐藏时清理资源（仅在这里彻底关闭麦克风）
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			if (isRecording) stopRecording(true);
			if (currentStream) {
				currentStream.getTracks().forEach(t => t.stop());
				currentStream = null;
			}
			// 页面切后台时重置激活状态，切回后重新激活
			isAudioCtxActivated = false;
		}
	});

	// 页面卸载时清理资源
	window.addEventListener('beforeunload', function() {
		if (currentStream) {
			currentStream.getTracks().forEach(t => t.stop());
		}
		if (audioCtx) {
			audioCtx.close();
		}
	});

	// =============== UI状态函数（完全保留原有逻辑） ===============
	function showBlackBoxSpeak() {
		bt_recoding.value = '松开 结束';
		blackBoxSpeak.style.display = "block";
		blackBoxPause.style.display = "none";
		$(bt_background).css({
			'background': '#3473F4',
			'color': '#ffffff'
		});
		$(bt_background).addClass('bottom_input_active');
		$(bt_recoding).css({
			'color': '#ffffff'
		});
		$(input_state).css({
			'display': 'flex'
		});
		$(input_state).removeClass('input_state_red');
		$('.bottom_input').css('background', 'none')
	}

	function showBlackBoxPause() {
		bt_recoding.value = '松开手指，取消发送';
		blackBoxSpeak.style.display = "none";
		blackBoxPause.style.display = "block";
		$(bt_background).css('background', '#f44336');
		$(bt_background).removeClass('bottom_input_active');
		$(input_state).addClass('input_state_red');
		$('.bottom_input').css('background', 'none')
	}

	// 初始化事件
	initEvent();

	// 更新Base64输出并发送
	// function updateBase64Output(base64, mimeType) {
	// 	const base64Output = document.getElementById('base64Output');
	// 	base64Output.innerHTML = `${base64}`;
	// 	var openid = document.getElementById("openid").value;
	// 	var voiceList = {
	// 		"base64voice": base64,
	// 		"openid": openid
	// 	}
	// 	// 测试输出base64转语音
	// 	const audioElement = document.createElement('audio');
	// 	audioElement.controls = true;
	// 	audioElement.src = `data:audio/wav;base64,${base64}`;
	// 	const audioContainer = document.getElementById('audioContainer');
	// 	audioContainer.innerHTML = '';
	// 	audioContainer.appendChild(audioElement);
	// 	// 发送语音到后端
	// 	sendVoice();
	// }
	function updateBase64Output(base64, mimeType) {
	    // 1. 安全更新base64输出（先检查元素是否存在）
	    const base64Output = document.getElementById('base64Output');
	    if (base64Output) {
	        base64Output.innerHTML = base64;
	    }
		
		$('#audioContainer').css('display','block')
	
	    // 清空之前的内容
	    audioContainer.innerHTML = '';
	
	
	    // 【关键修复1】兼容安卓MIME类型
	    const compatibleMime = mimeType === 'audio/wav' ? 'audio/x-wav' : mimeType;
	    const audioSrc = `data:${compatibleMime};base64,${base64}`;
	
	    // 创建audio元素
	    const audioElement = document.createElement('audio');
	    audioElement.controls = true;
	    audioElement.preload = 'auto';
 
	
	    // 添加错误处理
	    audioElement.onerror = function() {
	        audioContainer.innerHTML = '<p style="color: red; padding: 10px;">音频格式不兼容</p>';
	    };
	
	    // 插入DOM后再设置src（兼容所有浏览器）
	    audioContainer.appendChild(audioElement);
	    audioElement.src = audioSrc;
	
	}
});
