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
	let audioCtx = null; // 单例音频上下文
	let gainNode = null; // 增益补偿
	let isRecording = false;
	let isCancelled = false;
	let posStart = 0;
	let workletNode = null; // 替代ScriptProcessor的AudioWorklet节点
	let isWorkletReady = false; // Worklet加载状态标记

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

	// WAV编码核心函数（标准16位单声道WAV，和你之前可识别的格式完全一致）
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
		try {
			// 1. 初始化音频上下文（必须在用户交互中触发，iOS强制要求）
			if (!audioCtx) {
				audioCtx = new(window.AudioContext || window.webkitAudioContext)({
					latencyHint: 'interactive',
					sampleRate: 8000 // 固定采样率，避免iOS不同设备采样率不一致
				});
			}
			if (audioCtx.state === 'suspended') {
				await audioCtx.resume();
			}

			// 2. 预加载AudioWorklet（仅加载一次，避免重复初始化）
			if (!isWorkletReady) {
				// 内联Worklet代码，无需单独文件，方便部署
				const workletCode = `
                    class RecorderProcessor extends AudioWorkletProcessor {
                        process(inputs, outputs) {
                            const input = inputs[0];
                            if (input.length > 0) {
                                // 把单声道音频数据发送到主线程
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
				await audioCtx.audioWorklet.addModule(workletUrl);
				URL.revokeObjectURL(workletUrl); // 释放内存
				isWorkletReady = true;
				console.log("AudioWorklet 初始化完成，iOS兼容就绪");
			}

			// 3. 持久化麦克风流（避免频繁申请权限，解决iOS多次录音后吞字问题）
			if (!currentStream || !currentStream.active) {
				currentStream = await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: false,
						noiseSuppression: false,
						autoGainControl: true,
						sampleRate: 8000
					}
				});
				console.log("麦克风流已持久化预热");
			}
		} catch (err) {
			console.warn("麦克风预热/Worklet初始化失败:", err);
		}
	}

	// =============== 录音核心功能（AudioWorklet版，iOS完美兼容） ===============
	async function startRecording() {
		if (isRecording) return;
		isCancelled = false;
		audioChunks = [];

		function switchToVoiceAndRecord() {
			$('.text_input').hide();
			$('.voice_input').css('display', 'flex');
			resumeAudioContext();
			window.startVoiceRecording();

			// 🔥 录音开始时锁定页面，禁止上下滑动
			$('body').css('overflow', 'hidden');
			$('body').css('touch-action', 'none');
		}

		try {
			// 先确保预热完成、Worklet就绪、音频上下文激活
			await prepareMic();
			if (!isWorkletReady || !currentStream || !audioCtx) {
				throw new Error("录音环境未就绪");
			}

			// 音频链路：麦克风音源 -> 增益节点 -> Worklet录音节点 -> 输出（iOS必须连接destination才能正常运行）
			const source = audioCtx.createMediaStreamSource(currentStream);
			gainNode = audioCtx.createGain();
			gainNode.gain.value = 1.3; // 保留原有的增益补偿

			// 清理旧的Worklet节点
			if (workletNode) {
				workletNode.port.onmessage = null;
				workletNode.disconnect();
			}

			// 创建录音Worklet节点
			workletNode = new AudioWorkletNode(audioCtx, 'recorder-processor');
			// 接收Worklet传来的PCM音频数据
			workletNode.port.onmessage = (e) => {
				if (!isRecording) return;
				audioChunks.push(new Float32Array(e.data));
			};

			// 连接音频链路
			source.connect(gainNode);
			gainNode.connect(workletNode);
			workletNode.connect(audioCtx.destination); // iOS强制要求：必须连接到输出，否则音频上下文会被暂停

			isRecording = true;
		} catch (err) {
			console.error('启动录音失败:', err);
			showToast("录音启动失败，请检查麦克风权限");
			initStatus();
		}
	}

	function stopRecording(isCancelAction = false) {
		isCancelled = isCancelAction;
		isRecording = false;

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

		// 编码为标准WAV格式（和你之前可识别的格式完全一致）
		const wavBuffer = encodeWav(mergedData, audioCtx.sampleRate, 1);
		const wavBlob = new Blob([wavBuffer], {
			type: 'audio/wav'
		});

		// 完全复用你原有的处理逻辑，无需修改后续接口调用
		processAudioBlob(wavBlob);

		// 清理数据
		audioChunks = [];

		// 【重点】iOS优化：不在这里关闭麦克风流，避免频繁申请权限导致的硬件休眠、吞字问题
		// 仅在页面隐藏/销毁时关闭流，已在下方visibilitychange事件中处理
	}

	function processAudioBlob(blob) {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64String = reader.result.split(',')[1];
			updateBase64Output(base64String, blob.type);
		};
		reader.readAsDataURL(blob);
	}



	// =============== 事件绑定（iOS 键盘优化版） ===============
	function initEvent() {
		let pressTimer = null;
		const LONG_PRESS_TIME = 250; // 长按阈值

		// 统一的滑动位移判定逻辑
		function handleMoveLogic(currentY) {
			if (posStart - currentY < 50) {
				showBlackBoxSpeak();
			} else {
				showBlackBoxPause();
			}
		}

		// --- 1. 语音按钮 (#bt_recoding) 处理 ---
		bt_recoding.addEventListener("touchstart", function(event) {
			event.preventDefault(); // 必须保留，防止滚动和默认点击
			posStart = event.touches[0].pageY;

			pressTimer = setTimeout(async () => {
				pressTimer = null;
				showBlackBoxSpeak();
				if (navigator.vibrate) navigator.vibrate(40);
				await startRecording();
			}, LONG_PRESS_TIME);
		});

		bt_recoding.addEventListener("touchmove", function(event) {
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
				return;
			}
			handleMoveLogic(event.touches[0].pageY);
		});

		bt_recoding.addEventListener("touchend", function(event) {
			if (pressTimer) {
				// --- 此处为短按逻辑：切换到文字模式并唤起键盘 ---
				clearTimeout(pressTimer);
				pressTimer = null;

				// 1. 立即切换 UI 状态
				$('.voice_input').hide();
				$('.text_input').css('display', 'flex');

				// 2. 核心：在 touchend 线程中直接同步聚焦（iOS 唤起键盘的关键）
				const userInputField = document.getElementById('userInput');
				userInputField.focus();

				return;
			}

			const posEnd = event.changedTouches[0].pageY;
			const isCancel = (posStart - posEnd >= 50);

			if (isCancel) {
				showToast("取消发送");
			} else {
				showToast("已发送");
			}
			stopRecording(isCancel);
			initStatus();
		});
		// --- 2. mode_input：点击文字输入，长按语音输入 ---
		const inputContent = document.querySelector('.mode_input .input_content');

		inputContent.addEventListener("touchstart", function(event) {
			// 禁止页面滚动
			$('body').css({
				'overflow': 'hidden',
				'touch-action': 'none'
			});
			posStart = event.touches[0].pageY;

			pressTimer = setTimeout(async () => {
				pressTimer = null;

				// 切换到语音模式
				$('.mode_input').hide();
				$('.voice_input').css('display', 'flex');

				await prepareMic();

				if (navigator.vibrate) {
					navigator.vibrate(40);
				}

				showBlackBoxSpeak();

				await startRecording();
			}, LONG_PRESS_TIME);
		});

		inputContent.addEventListener("touchmove", function(event) {

			// 长按录音期间禁止页面滚动
			event.preventDefault();

			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
			} else {
				handleMoveLogic(event.touches[0].pageY);
			}
		}, {
			passive: false
		});

		inputContent.addEventListener("touchend", function(event) {
			// 恢复页面滚动
			$('body').css({
				'overflow': '',
				'touch-action': ''
			});
			// 短按：进入文字输入
			if (pressTimer) {
			
			    clearTimeout(pressTimer);
			    pressTimer = null;
			
			    $('.mode_input').hide();
			    $('.voice_input').hide();
			    $('.text_input').css('display', 'flex');
			
			    // iOS 必须同步 focus
			    const input = document.getElementById('userInput');
			
			    // 先确保可编辑
			    input.removeAttribute('readonly');
			    input.disabled = false;
			
			    // 同步聚焦（不能 setTimeout）
			    input.focus();
			
			    // 部分 iOS WebView 需要 click
			    input.click();
			
			    // 光标移动到最后
			    const len = input.value.length;
			    input.setSelectionRange(len, len);
			
			    return;
			}

			// 长按录音结束
			const posEnd = event.changedTouches[0].pageY;
			const isCancel = (posStart - posEnd >= 50);

			if (isCancel) {
				showToast("取消发送");
			} else {
				showToast("已发送");
			}

			stopRecording(isCancel);
			initStatus();

			// 录音结束后恢复默认模式
			$('.voice_input').hide();
			$('.text_input').hide();
			$('.mode_input').css('display', 'flex');
		});

		inputContent.addEventListener("touchcancel", function() {
			 // 恢复页面滚动
			    $('body').css({
			        'overflow': '',
			        'touch-action': ''
			    });
			clearTimeout(pressTimer);
			pressTimer = null;
		});

		// 记录初始视口高度
		let initialViewportHeight = window.visualViewport
		    ? window.visualViewport.height
		    : window.innerHeight;
		
		// 是否主动切换模式
		let isManualSwitch = false;
		
		// 键盘状态监听
		function handleKeyboardChange() {
		
		    const currentHeight = window.visualViewport
		        ? window.visualViewport.height
		        : window.innerHeight;
		
		    const keyboardClosed =
		        currentHeight >= initialViewportHeight - 50;
		
		    if (keyboardClosed) {
		
		        setTimeout(() => {
		
		            // 主动切换语音时不恢复
		            if (isManualSwitch) {
		                isManualSwitch = false;
		                return;
		            }
		
		            // 输入框失焦
		            $('#userInput').blur();
		
		            // 恢复默认输入模式
		            $('.text_input').hide();
		            $('.voice_input').hide();
		            $('.mode_input').css('display', 'flex');
		
		        }, 80);
		    }
		}
		
		// iOS 必须监听 visualViewport
		if (window.visualViewport) {
		    window.visualViewport.addEventListener(
		        'resize',
		        handleKeyboardChange
		    );
		} else {
		    window.addEventListener(
		        'resize',
		        handleKeyboardChange
		    );
		}
	}

	// 页面隐藏时清理资源（仅在这里彻底关闭麦克风，避免iOS休眠问题）
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			if (isRecording) stopRecording(true);
			if (currentStream) {
				currentStream.getTracks().forEach(t => t.stop());
				currentStream = null;
			}
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
	// 更新Base64输出
	function updateBase64Output(base64, mimeType) {
		const base64Output = document.getElementById('base64Output');
		base64Output.innerHTML = `${base64}`; // 更新Base64输出
		var openid = document.getElementById("openid").value;
		var voiceList = {
			"base64voice": base64,
			"openid": openid
		}
		//测试输出base64转语音
		// 创建音频元素
		const audioElement = document.createElement('audio');
		audioElement.controls = true; // 添加控制条
		audioElement.src = `data:audio/wav;base64,${base64}`; // 设置音频源

		// 插入音频元素到页面
		const audioContainer = document.getElementById('audioContainer');
		audioContainer.innerHTML = ''; // 清空之前的音频元素
		audioContainer.appendChild(audioElement);
		//if(hasMoved){
		//	hasMoved=false;  //重置状态
		//	return;
		//}
		sendVoice();
		//hasMoved=false;  //重置状态

		//测试输出base64转语音
		// 创建音频元素
		// const audioElement = document.createElement('audio');
		// audioElement.controls = true; // 添加控制条
		// audioElement.src = `data:audio/wav;base64,${base64}`; // 设置音频源

		// // 插入音频元素到页面
		// const audioContainer = document.getElementById('audioContainer');
		// audioContainer.innerHTML = ''; // 清空之前的音频元素
		// audioContainer.appendChild(audioElement);	
		// console.log(base64);//控制台显示base64	
	}
});
