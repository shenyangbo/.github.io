// =============== 页面进入时自动获取录音权限 ===============
// 此代码可以独立添加到你的页面中，不会影响现有功能

(function() {
    'use strict';
    
    // 权限检查和请求函数
    async function requestMicrophonePermissionOnLoad() {
        try {
            console.log('开始检查麦克风权限...');
            
            // 检查是否在安全环境中
            const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
            if (!isSecure) {
                console.warn('当前不在HTTPS环境中，可能影响权限获取');
            }
            
            // 先检查权限状态（如果浏览器支持）
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const result = await navigator.permissions.query({name: 'microphone'});
                    console.log('当前权限状态:', result.state);
                    
                    if (result.state === 'granted') {
                        console.log('麦克风权限已获取');
                        return true;
                    } else if (result.state === 'denied') {
                        console.log('麦克风权限被拒绝');
                        showPermissionDeniedMessage();
                        return false;
                    }
                    // 如果是 'prompt' 状态，继续请求权限
                } catch (err) {
                    console.log('Permissions API查询失败，继续使用getUserMedia');
                }
            }
            
            // 请求麦克风权限（这会弹出授权窗口）
            console.log('正在请求麦克风权限...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // 立即停止音频流，我们只是为了获取权限
            stream.getTracks().forEach(track => track.stop());
            
            console.log('麦克风权限获取成功');
            showPermissionSuccessMessage();
            return true;
            
        } catch (err) {
            console.error('麦克风权限请求失败:', err);
            handlePermissionError(err);
            return false;
        }
    }
    
    // 显示权限获取成功消息
    function showPermissionSuccessMessage() {
        // 如果页面有toast元素，就使用它
        const toast = document.getElementById("toast");
        if (toast && typeof showToast === 'function') {
            showToast('麦克风权限已获取');
        } else {
            // 否则创建临时提示
            showTemporaryMessage('✓ 麦克风权限已获取', '#4CAF50');
        }
    }
    
    // 显示权限被拒绝消息
    function showPermissionDeniedMessage() {
        const toast = document.getElementById("toast");
        if (toast && typeof showToast === 'function') {
            showToast('麦克风权限被拒绝，请在浏览器设置中开启');
        } else {
            showTemporaryMessage('⚠️ 麦克风权限被拒绝，请在浏览器设置中开启', '#FF9800');
        }
    }
    
    // 处理权限错误
    function handlePermissionError(err) {
        let message = '';
        let color = '#F44336';
        
        if (err.name === 'NotAllowedError') {
            message = '⚠️ 麦克风权限被拒绝，请允许访问后刷新页面';
        } else if (err.name === 'NotFoundError') {
            message = '⚠️ 未找到麦克风设备';
        } else if (err.name === 'NotSupportedError') {
            message = '⚠️ 浏览器不支持麦克风功能';
        } else {
            message = '⚠️ 无法访问麦克风: ' + err.message;
        }
        
        const toast = document.getElementById("toast");
        if (toast && typeof showToast === 'function') {
            showToast(message);
        } else {
            showTemporaryMessage(message, color);
        }
    }
    
    // 创建临时消息提示（如果页面没有toast组件）
    function showTemporaryMessage(message, color) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${color};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    // 等待页面加载完成后请求权限
    function initPermissionCheck() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                // DOM加载完成后延迟一点再请求权限，确保用户看到页面
                setTimeout(requestMicrophonePermissionOnLoad, 500);
            });
        } else {
            // 如果页面已经加载完成
            setTimeout(requestMicrophonePermissionOnLoad, 500);
        }
    }
    
    // 立即初始化
    initPermissionCheck();
    
    // 将权限检查函数暴露到全局，方便手动调用
    window.requestMicPermission = requestMicrophonePermissionOnLoad;
    
})();

// =============== 使用说明 ===============
/*
这段代码会在页面加载后自动请求麦克风权限，特点：

1. 独立运行，不影响现有代码
2. 自动检测页面的toast组件，有就用，没有就创建临时提示
3. 在页面加载完成0.5秒后自动请求权限
4. 提供全局函数 window.requestMicPermission() 供手动调用
5. 支持各种错误情况的处理

如果你想手动触发权限请求，可以调用：
window.requestMicPermission();
*/