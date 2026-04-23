$(document).ready(function() {
	// $(document).on('click', '.div_listUl .box_title  label', function() {
	// 	var i = $(this).index();
	// 	$(this).addClass('background').siblings().removeClass('background');
	// 	$(":radio[name=change]:not(:checked)").prop("checked", true);
	// 	swiper2.slideTo(i, 400, false)
	// });


	// 生成客服图标可拖动
	// $(function help() {
	// 	var container = 'help-container';
	// 	document.body.appendChild((function() {
	// 		var div = document.createElement('div');
	// 		div.id = container;
	// 		div.innerHTML =
	// 			'<div onclick="qrCode()" class="servicer_container"><p class="message_unread">12</p><img class="fix-ie6" src="./image/servicer@2x.png" style="width: 96px"></div>';
	// 		return div;
	// 	}()));
	// 	$(function() {
	// 		if (window.addEventListener) {
	// 			var windowY = $(document).height();
	// 			var windowX = $(window).width();
	// 			var div = document.getElementById(container);
	// 			div.addEventListener('touchmove', function(event) {
	// 				//阻止其他事件
	// 				event.preventDefault();
	// 				// 如果这个元素的位置内只有一个手指的话
	// 				if (event.targetTouches.length === 1) {
	// 					// 把元素放在手指所在的位置
	// 					var touch = event.targetTouches[0];
	// 					if (touch.pageX <= windowX && touch.pageX >= 0)
	// 						div.style.left = touch.pageX - $(div).width() / 2 + 'px';
	// 					if (touch.pageY <= windowY && touch.pageY >= 0)
	// 						div.style.top = touch.clientY - $(div).height() / 2 +
	// 						'px';
	// 				}
	// 			}, false);
	// 		}
	// 	});
	// });
	// 获取所有表头单元格 (th)
	var $headerCells = $('.bill_table .table_title th');

	// 获取 bill_item_total 下的所有 span 元素
	var $totalSpans = $('.bill_item_total span');

	// 遍历每个表头单元格，并为对应的 span 设置宽度
	$headerCells.each(function(index) {
		// 计算每个单元格的宽度
		var cellWidth = $(this).outerWidth();

		// 将宽度应用到对应的 span 上
		if ($totalSpans[index]) {
			$($totalSpans[index]).css('width', cellWidth);
		}
	});

	// 监听窗口大小变化并重新调整宽度
	$(window).resize(function() {
		$headerCells.each(function(index) {
			var cellWidth = $(this).outerWidth();
			if ($totalSpans[index]) {
				$($totalSpans[index]).css('width', cellWidth);
			}
		});
	});


	// 流量展开收起
	$('.accordion-header').click(function() {
		var target = $(this).data('target');
		var panel = $(target);
		var arrow = $(this).find('.arrow');
		var toggleText = $(this).find('span');

		if (panel.is(':visible')) {
			panel.slideUp();
			toggleText.text('点击展开');
			arrow.attr('src', 'image/ic_arrow_down.png'); // 切换为下箭头图片
		} else {
			panel.slideDown();
			$('.accordion-panel').css('display', 'flex')
			toggleText.text('点击收起');
			arrow.attr('src', 'image/ic_arrow_up.png'); // 切换为上箭头图片
		};

	});


	// 展开收起
	$('.accordion-header2').click(function() {
		var target = $(this).data('target');
		var panel = $(target);
		var arrow = $(this).find('.arrow');
		var toggleText = $(this).find('span');

		if (panel.is(':visible')) {
			panel.slideUp();
			toggleText.text('点击展开');
			arrow.attr('src', 'image/ic_arrow_down.png'); // 切换为下箭头图片
		} else {
			panel.slideDown();
			$('.accordion-panel2').css('display', 'flex')
			toggleText.text('点击收起');
			arrow.attr('src', 'image/ic_arrow_up.png'); // 切换为上箭头图片
		}
	});

	// 语音展开收起
	$('.accordion-header3').click(function() {
		var target = $(this).data('target');
		var panel = $(target);
		var arrow = $(this).find('.arrow');
		var toggleText = $(this).find('span');

		if (panel.is(':visible')) {
			panel.slideUp();
			toggleText.text('点击展开');
			arrow.attr('src', 'image/ic_arrow_down.png'); // 切换为下箭头图片
		} else {
			panel.slideDown();
			$('.accordion-panel3').css('display', 'flex')
			toggleText.text('点击收起');
			arrow.attr('src', 'image/ic_arrow_up.png'); // 切换为上箭头图片
		}
	});
	$('.accordion-header4').click(function() {
		var target = $(this).data('target');
		var panel = $(target);
		var arrow = $(this).find('.arrow');
		var toggleText = $(this).find('span');

		if (panel.is(':visible')) {
			panel.slideUp();
			toggleText.text('点击展开');
			arrow.attr('src', 'image/ic_arrow_down.png'); // 切换为下箭头图片
		} else {
			panel.slideDown();
			$('.accordion-panel4').css('display', 'flex')
			toggleText.text('点击收起');
			arrow.attr('src', 'image/ic_arrow_up.png'); // 切换为上箭头图片
		}
	});
	// 号码切换弹窗
	$(document).on('click', '.number , .tel_switch', function() {
		$('.number_switch').show();
		$('body').addClass('no-scroll');

	});
	$(document).on('click', '.close , .known', function() {
		$('.number_switch,.info_pop,.page_gone').hide();
		$('body').removeClass('no-scroll');
	});
	// info弹窗
	$(document).on('click', '.info , .prepayment_details', function() {
		$('.info_pop').show();
		$('body').addClass('no-scroll');

	});

	// 弹窗对话
	var iframe = $('#myIframe');

	// 监听子页面发来的消息
	$(window).on('message', function(event) {
		if (event.originalEvent.data === 'hide') {
			// iframe.hide();
			$('.iframe').animate({
				height: '12vh'
			}, 300);
			$('.servicer_left').fadeIn(600);
			$('.frame_mask').hide();
			$('body').removeClass('no-scroll');
		}
		if (event.originalEvent.data === 'show') {
			// iframe.hide();
			$('.iframe').animate({
				height: '60vh'
			}, 300);
			$('.servicer_left').hide();
			$('.frame_mask').show();
			$('body').addClass('no-scroll');
		}
	});


	// 客服显示对话
	$(document).on('click', '#help-container', function() {
		$('.iframe').animate({
			height: '60vh'
		}, 300);
		$('.servicer_left').hide();
		$('.frame_mask').show();
		$('body').addClass('no-scroll');
		// 获取iframe中的document对象
		// var iframe = $('#myIframe')
		var iframeDocument = $('#myIframe').contents();
		// 选择iframe中的目标元素
		var targetElement = iframeDocument.find('.hide,.service_content');
		var targetElement2 = iframeDocument.find('.show');
		var targetElement3 = iframeDocument.find('html, body');
		targetElement.show();
		targetElement2.hide();
		// 滚动到页面最底部
		targetElement3.animate({
			scrollTop: $(document).height()
		}, 1000);
	});


	// swiper滑块
	var swiper = new Swiper('.mySwiper', {
		autoHeight: true,
		on: {
			slideChange: function() {
				$('.div_listUl .box_title p , .home_question_tab').eq(this.activeIndex).addClass(
						'background')
					.siblings()
					.removeClass('background');
				window.scrollTo(0, 0);

			},
		},
	});
	// tab
	$(document).on('click', '.div_listUl .box_title  p', function() {
		var i = $(this).index();
		$(this).addClass('background').siblings().removeClass('background');
		// swiper.slideTo(i, 400, false);
		if (i > swiper.activeIndex) {
			// 向前滑动
			while (swiper.activeIndex < i) {
				swiper.slideNext(400, false);
			}
		} else if (i < swiper.activeIndex) {
			// 向后滑动
			while (swiper.activeIndex > i) {
				swiper.slidePrev(400, false);
			}
		}
		window.scrollTo(0, 0);
	});


	// swiper滑块
	var swiper2 = new Swiper('.mySwiper2', {
		autoHeight: true,
		on: {
			slideChange: function() {
				$('.div_listUl .box_title p , .home_question_tab').eq(this.activeIndex).addClass(
						'background')
					.siblings()
					.removeClass('background');
			},
		},
	});
	// 首页-猜你想问tab
	$(document).on('click', '.home_question_tab', function() {
		var i = $(this).index();
		$(this).addClass('background').siblings().removeClass('background');
		// swiper2.slideTo(i, 400, false)
		// 替换slideTo方法
		if (i > swiper2.activeIndex) {
			// 向前滑动
			while (swiper2.activeIndex < i) {
				swiper2.slideNext(400, false);
			}
		} else if (i < swiper2.activeIndex) {
			// 向后滑动
			while (swiper2.activeIndex > i) {
				swiper2.slidePrev(400, false);
			}
		}
	});



	//月份tab
	$(document).on('click', '.content  .radiostyle', function() {
		var i = $(this).index();
		$(this).addClass('active').siblings().removeClass('active');
	});




	//月份tab
	$(document).on('click', '.month', function() {
		var i = $(this).index();
		$(this).addClass('bill_month_active').siblings().removeClass('bill_month_active');
	});

	// 封装文字和table对齐方法
	function setColumnWidths() {
		// 获取所有表头单元格 (th)
		var $headerCells = $('.bill_table .table_title th');

		// 获取 bill_item_total 下的所有 span 元素
		var $totalSpans = $('.bill_item_total span');

		// 遍历每个表头单元格，并为对应的 span 设置宽度
		$headerCells.each(function(index) {
			// 确保元素是可见的
			if ($(this).is(':visible')) {
				// 设置表格布局模式为固定，以保证宽度计算的准确性
				$('.bill_table').css('table-layout', 'fixed');

				// 强制重新绘制，以确保宽度计算准确
				$(this).css('min-width', '1px'); // 触发重绘

				// 计算每个单元格的宽度，包括padding和border
				var cellWidth = $(this).outerWidth(true);

				// 将宽度应用到对应的 span 上
				if ($totalSpans[index]) {
					$($totalSpans[index]).css('width', cellWidth + 'px');
				}
			}
		});

		// 监听窗口大小变化并重新调整宽度
		$(window).resize(function() {
			$headerCells.each(function(index) {
				if ($(this).is(':visible')) {
					// 再次设置为固定布局并触发重绘
					$('.bill_table').css('table-layout', 'fixed');
					$(this).css('min-width', '1px');

					var cellWidth = $(this).outerWidth(true);
					if ($totalSpans[index]) {
						$($totalSpans[index]).css('width', cellWidth + 'px');
					}
				}
			});
		});
	}

	// 账单点击展开内容
	$(".bill_list_item").click(function() {
		var $this = $(this);
		var $nextBox = $this.next('.bill_show_box');
		var $action = $this.find('.pgdn_arrow');

		// 切换 display 属性
		if ($nextBox.css('display') === 'none') {
			$nextBox.css('display', 'flex'); // 显示
			$action.attr('src', 'image/ic_arrow_top_grey.png'); // 切换为上箭头图片
		} else {
			$nextBox.css('display', 'none'); // 隐藏
			$action.attr('src', 'image/ic_arrow_down_grey.png'); // 切换为下箭头图片
		}

		// 更新 "显示全部" 按钮的状态
		var $swiperSlide = $this.closest('.swiper-slide'); // 获取最近的 swiper-slide
		updateShowAllButton($swiperSlide); // 传递当前的 swiper-slide
		// 文字和table对齐
		setColumnWidths();
	});

	// 账单点击展开全部
	$(".show_all").click(function() {
		var $this = $(this);
		var $swiperSlide = $this.closest('.swiper-slide'); // 获取最近的 swiper-slide
		var $billShowBoxes = $swiperSlide.find('.bill_show_box');

		// 检查是否有任何一个 .bill_show_box 是可见的
		var anyVisible = $billShowBoxes.is(':visible');

		// 根据当前状态切换所有 .bill_show_box 的显示状态
		if (anyVisible) {
			$billShowBoxes.css('display', 'none'); // 隐藏所有 .bill_show_box
			$this.html(
				'显示全部 <img src="image/ic_arrow_down.png" alt="Toggle Icon">'); // 使用 .html() 方法更新按钮内容
			$swiperSlide.find('.pgdn_arrow').attr('src', 'image/ic_arrow_down_grey.png'); // 显示时更改箭头图标
		} else {
			$billShowBoxes.css('display', 'flex'); // 显示所有 .bill_show_box
			$this.html(
				'隐藏全部 <img src="image/ic_arrow_up.png" alt="Toggle Icon">'); // 使用 .html() 方法更新按钮内容
			$swiperSlide.find('.pgdn_arrow').attr('src', 'image/ic_arrow_top_grey.png'); // 隐藏时更改箭头图标
		}

		// 更新 "显示全部" 按钮的状态
		updateShowAllButton($swiperSlide); // 传递当前的 swiper-slide
		// 文字和table对齐
		setColumnWidths();
	});

	// 更新 "显示全部" 按钮的状态
	function updateShowAllButton($swiperSlide) {
		if ($swiperSlide) {
			var $showAllButton = $swiperSlide.find('.show_all');
			var $billShowBoxes = $swiperSlide.find('.bill_show_box');

			// 使用 is(':visible') 方法检查所有 .bill_show_box 是否隐藏
			var allHidden = $billShowBoxes.length > 0 && !$billShowBoxes.is(':visible');

			if (allHidden) {
				$showAllButton.html(
					'显示全部 <img src="image/ic_arrow_down.png" alt="Toggle Icon">');
			} else {
				$showAllButton.html(
					'隐藏全部 <img src="image/ic_arrow_up.png" alt="Toggle Icon">');
			}
		} else {
			// 如果没有传入特定的 swiper-slide，则按原逻辑执行
			var $showAllButton = $('.show_all');
			var $billShowBoxes = $('.bill_show_box');

			// 使用 is(':visible') 方法检查所有 .bill_show_box 是否隐藏
			var allHidden = $billShowBoxes.length > 0 && !$billShowBoxes.is(':visible');

			if (allHidden) {
				$showAllButton.html(
					'显示全部 <img src="image/ic_arrow_down.png" alt="Toggle Icon">');
			} else {
				$showAllButton.html(
					'隐藏全部 <img src="image/ic_arrow_up.png" alt="Toggle Icon">');
			}
		}
	}



	// 充值缴费历史点击展开内容
	$(".rechage_month").click(function() {
		var display2 = $(this).siblings('.show_box').css('display');
		var arrowChange = $(this).find('.pgdn_arrow');

		$(this).next().fadeToggle(300);
		$(this).toggleClass("up-1");

		if (display2 === 'flex') {
			$(arrowChange).attr('src', 'image/ic_arrow_down_fill.png'); // 切换为下箭头图片

		} else {
			$(arrowChange).attr('src', 'image/ic_arrow_up_fill.png'); // 切换为右箭头图片

		}
		// 11.26新增
		// parent.postMessage('resize', '*');
		// 11.26新增

	})

	// 账单tab切换
	$(document).ready(function() {
		$('.bill_tabs .bill_tab-links a').on('click', function(e) {
			var currentAttrValue = $(this).attr('href');

			// Show/Hide Tabs
			$('.bill_tabs ' + currentAttrValue).show().siblings().hide();

			// Change/remove current tab to active
			$(this).parent('li').addClass('bill_tab_active').siblings().removeClass(
				'bill_tab_active');

			e.preventDefault();
		});
	});

	// balance_account页面tab切换
	$('.balance_tabs .balance_tab-links a').on('click', function(e) {
		var currentAttrValue = $(this).attr('href');

		// Show/Hide Tabs
		$('.balance_tabs ' + currentAttrValue).show().siblings().hide();

		// Change/remove current tab to active
		$(this).parent('li').addClass('balance_tab_active').siblings().removeClass(
			'balance_tab_active');

		e.preventDefault();
	});

	// 搜索高亮显示
	// $(document).ready(function() {
	// 	function resetHighlight() {
	// 		$('.highlight').contents().unwrap();
	// 	}

	// 	function showTooltip(message) {
	// 		var $tooltip = $('#tooltip');
	// 		$tooltip.stop(true, true); // 清除之前的动画队列
	// 		$tooltip.text(message).show().delay(2000).fadeOut();
	// 	}

	// 	$('#searchButton').click(function() {
	// 		var searchTerm = $('#searchInput').val().trim();
	// 		if (searchTerm === '') {
	// 			showTooltip('请输入搜索词');
	// 			return;
	// 		}

	// 		resetHighlight();

	// 		var found = false;

	// 		$('#content').find(':not(script)').contents().each(function() {
	// 			if (this.nodeType === Node.TEXT_NODE && this.nodeValue.indexOf(
	// 					searchTerm) !== -
	// 				1) {
	// 				found = true;
	// 				var parent = this.parentNode;
	// 				var text = this.nodeValue;
	// 				var markedUpText = text.replace(new RegExp(searchTerm, 'gi'),
	// 					'<span class="highlight">$&</span>');
	// 				$(this).replaceWith(markedUpText);
	// 			}
	// 		});

	// 		if (!found) {
	// 			showTooltip('没有找到 "' + searchTerm + '"');
	// 		}
	// 	});
	// });
	// 搜索功能
	$('#searchButton').click(function() {
		var searchText = $('#searchInput').val().trim().toLowerCase();

		if (searchText === '') {
			showAlert('请输入搜索内容');
			return;
		}

		// 清除之前的高亮
		clearHighlights();

		// 用于存储是否找到了至少一个有匹配项的tab
		var foundMatch = false;

		// 高亮显示匹配的文本
		$('.swiper-slide').each(function() {
			var $this = $(this);
			var content = $this.html();
			var regex = new RegExp('(' + searchText + ')', 'gi');
			var highlightedContent = content.replace(regex,
				'<span class="highlight">$1</span>');
			$this.html(highlightedContent);

			// 计算匹配数量
			var count = $this.find('.highlight').length;
			var tabId = $this.attr('id');
			$('#' + tabId + '-tab .count-badge').text(count).css('display', 'inline-block');

			// 如果这个tab有匹配项，则标记已找到并记录该tab
			if (count > 0 && !foundMatch) {
				foundMatch = true;
				var targetTab = $('#' + tabId + '-tab');
				// 激活该tab
				activateTab(targetTab);
			}
		});
	});

	// 激活指定的tab
	function activateTab(tab) {
		// 移除所有tab上的激活样式
		$('.home_question_tab').removeClass('background');

		// 添加激活样式到目标tab
		tab.addClass('background');

		// 获取当前tab的索引
		var index = tab.index();

		// 确保tab在视图内可见
		tab[0].scrollIntoView({
			behavior: 'smooth',
			block: 'nearest'
		});

		// 使用Swiper滑动到对应的内容
		if (index > swiper2.activeIndex) {
			// 向前滑动
			while (swiper2.activeIndex < index) {
				swiper2.slideNext(400, false);
			}
		} else if (index < swiper2.activeIndex) {
			// 向后滑动
			while (swiper2.activeIndex > index) {
				swiper2.slidePrev(400, false);
			}
		}
	}
	// 监听tab点击事件
	$(document).on('click', '.home_question_tab', function() {
		activateTab($(this));
	});

	// 清除搜索结果
	function clearSearchResults() {
		clearHighlights();
		$('.count-badge').hide();
	}

	// 清除高亮内容
	function clearHighlights() {
		$('.swiper-slide').each(function() {
			var $this = $(this);
			$this.html(removeHighlights($this.html()));
		});
	}
	// 递归移除高亮
	function removeHighlights(html) {
		return html.replace(/<span class="highlight">(.*?)<\/span>/gi, '$1');
	}

	// 监听输入框变化
	$('#searchInput').on('input', function() {
		var searchText = $(this).val().trim().toLowerCase();
		if (searchText === '') {
			clearSearchResults();
		}
	});

	// 显示提示信息
	function showAlert(message) {
		var alertBox = $('.alert');
		alertBox.text(message).show();
		setTimeout(function() {
			alertBox.hide();
		}, 2000);
	}

	$('.home_question_refresh').on('click', function() {
		$('.img_refresh').addClass('rotate');

		// 如果你想让动画结束后移除 .rotate 类，可以使用 setTimeout 和 removeClass
		setTimeout(function() {
			$('.img_refresh').removeClass('rotate');
		}, 1000);
	});

	function animateProgress() {
		// 获取进度条元素
		const progress = $('.progress_circle')[0];
		// 获取圆一整圈的长度
		const maxLen = Math.ceil(progress.getTotalLength()); // 结果可向上取整
		$(progress).css('stroke-dasharray', maxLen);
		console.log(maxLen);

		let num = maxLen; // 进度条的初始值,效果为进度条为 0
		// 此类场景使用 window.requestAnimationFrame() 进行循环比使用定时器性能更好
		let timer = window.requestAnimationFrame(function fn() {
			// 循环继续的条件
			if (num > 0) {
				num -= 2; // 减得越小动画持续时间越长
				$(progress).css('stroke-dashoffset', num);
				// 继续循环则递归调用 fn 函数
				timer = window.requestAnimationFrame(fn);
			} else {
				// 循环停止
				$(progress).css('stroke-dashoffset', 0);
				// 清除定时器
				window.cancelAnimationFrame(timer);
				// 隐藏进度条
				$('.loading_container').hide();
			}
		});
	}

	// 点击 .message_new 时调用 animateProgress 函数
	$(document).on('click', '.message_new', function() {
		$('.loading_container').css('display', 'flex');
		animateProgress();
	});

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
let permissionGranted = false; // 权限状态标记
let hasPermissionBeenDenied = false; // 新增：标记权限是否曾被拒绝

function showToast(message) {
	toast.innerText = message;
	toast.style.display = 'block';
	setTimeout(() => {
		toast.style.display = 'none';
	}, 1000);
}


function createAudioContextSync() {
	try {
		if (!audioContext || audioContext.state === 'closed') {
			audioContext = new(window.AudioContext || window.webkitAudioContext)({
				sampleRate: 8000
			});
			console.log("AudioContext创建成功，采样率:", audioContext.sampleRate);
		}

		// 立即尝试激活（对iOS很重要）
		if (audioContext.state === 'suspended') {
			console.log("AudioContext状态为suspended，尝试激活...");
			return audioContext.resume().then(() => {
				console.log("AudioContext激活成功");
				audioContextReady = true;
				return true;
			});
		} else {
			console.log("AudioContext状态:", audioContext.state);
			audioContextReady = true;
			return Promise.resolve(true);
		}
	} catch (err) {
		console.error("创建AudioContext失败:", err);
		audioContextReady = false;
		return Promise.reject(err);
	}
}

async function preRequestPermission() {
	try {
		// 在用户手势中预请求权限但立即关闭流
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		});

		// 立即停止所有轨道
		stream.getTracks().forEach(track => track.stop());
		console.log("预权限请求成功");
		return true;
	} catch (err) {
		console.error("预权限请求失败:", err);
		return false;
	}
}

async function startRecording() {
	if (isRecording) return;

	// 1. 检查权限状态
	if (!permissionGranted) {
		// 如果权限从未被授予过
		if (!hasPermissionBeenDenied) {
			// 如果从未拒绝过，则提示用户先获取权限
			showToast("请先点击获取麦克风权限");
		} else {
			// 如果曾经拒绝过，则提示刷新页面
			showToast("麦克风权限已被拒绝，请刷新页面重试。");
		}
		initStatus();
		showBlackBoxNone();
		return;
	}

	// 2. 如果权限已授予，则直接启动录音
	try {
		console.log("开始录音流程...");

		await createAudioContextSync();

		if (!audioContextReady) {
			throw new Error("AudioContext未准备就绪");
		}

		// 不再在此处请求麦克风权限
		console.log("使用已获取的麦克风权限...");
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		});

		if (currentStream) {
			currentStream.getTracks().forEach(track => track.stop());
		}
		currentStream = stream;

		mediaStreamSource = audioContext.createMediaStreamSource(stream);
		scriptProcessorNode = audioContext.createScriptProcessor(1024, 1, 1);
		scriptProcessorNode.onaudioprocess = onAudioProcess;

		mediaStreamSource.connect(scriptProcessorNode);
		scriptProcessorNode.connect(audioContext.destination);

		isRecording = true;
		isFirstTime = false;
		console.log("录音启动成功");

	} catch (err) {
		console.error('录音启动失败:', err);
		// 这里的错误通常是因为麦克风设备问题，而不是权限问题（因为权限已在前置函数中处理）
		if (err.name === 'NotFoundError') {
			alert('未找到麦克风设备');
		} else if (err.message.includes('AudioContext')) {
			alert('音频系统初始化失败，请重试');
		} else {
			alert(`录音失败: ${err.message}`);
		}

		// 重置状态
		initStatus();
		showBlackBoxNone();
		audioContextReady = false;
	}
}

// =============== 音频处理 ===============
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
}

// 完整的encodeWAV函数
function encodeWAV(samples, sampleRate) {
	const buffer = new ArrayBuffer(44 + samples.length * 2);
	const view = new DataView(buffer);

	// WAV文件头
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

	// 转换为16位PCM
	let offset = 44;
	for (let i = 0; i < samples.length; i++, offset += 2) {
		const s = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
	}

	return new Blob([view], { type: 'audio/wav' });
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

async function handleFirstTimeInit() {
	if (!isFirstTime) return true;

	try {
		console.log("iOS首次初始化处理...");

		// 在用户手势中预创建AudioContext
		await createAudioContextSync();

		// 预请求权限（可选，某些情况下有助于iOS）
		await preRequestPermission();

		console.log("首次初始化完成");
		return true;
	} catch (err) {
		console.error("首次初始化失败:", err);
		return false;
	}
}

// 修改权限请求函数，只请求权限，不录音
async function requestMicrophonePermission() {
	try {
		// 先初始化AudioContext（对iOS重要）
		await createAudioContextSync();

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		});
		console.log("麦克风权限已授予");

		// 如果只是为了请求权限，不需要实际使用流，这里立即停止所有轨道
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			console.log("音频轨道已停止");
		}

		permissionGranted = true; // 设置权限已获取
		hasPermissionBeenDenied = false; // 如果重新获得权限，重置拒绝标记
		showToast("麦克风权限已获取，可以开始录音");

		isFirstTime = false; // 标记已经成功请求过一次权限
	} catch (err) {
		console.error("请求麦克风权限失败:", err);
		permissionGranted = false; // 权限获取失败

		if (err.name === 'NotAllowedError') {
			// 用户拒绝了权限
			hasPermissionBeenDenied = true; // 标记权限曾被拒绝
			alert('您已拒绝麦克风权限。请刷新页面，再次点击“获取权限”按钮，并在浏览器提示时允许访问。');
		} else {
			alert(`请求麦克风权限时发生错误: ${err.message}`);
		}
	}
}

// 事件监听器
// 这个按钮只负责请求权限
$('.input_voice_switch').click(function() {
	requestMicrophonePermission();
});


function initEvent() {
	bt_recoding.addEventListener("touchstart", async function(event) {
		event.preventDefault();
		posStart = event.touches[0].pageY;

		showBlackBoxSpeak();
		if (hasPermissionBeenDenied) {
					showToast("麦克风权限已被拒绝，请刷新页面重试。");
					initStatus();
					showBlackBoxNone();
					return; // 阻止后续操作
				}

		// iOS首次处理
		if (isFirstTime) {
			const initSuccess = await handleFirstTimeInit();
			if (!initSuccess) {
				initStatus();
				showBlackBoxNone();
				return;
			}
		}

		// 开始录音
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

			clearRecording();
			clearBase64Output();
			showBlackBoxNone();
		}
	});

	// 鼠标事件（桌面测试）
	bt_recoding.addEventListener("mousedown", async function(event) {
		event.preventDefault();
		showBlackBoxSpeak();

		if (isFirstTime) {
			await handleFirstTimeInit();
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
	// 初始化事件监听
	initEvent();

	console.log("录音组件初始化完成");
});

// =============== 其他辅助函数 ===============
var initStatus = function() {
	bt_recoding.value = '按住说话';
	showBlackBoxNone();
}

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



	// 新消息提醒
	let animationCount = 0;
	const animationLimit = 2;

	function addAnimation() {
		$('.message_new img').addClass('animate-bounce').one('animationend', function() {
			$(this).removeClass('animate-bounce');
			animationCount++;
			if (animationCount < animationLimit) {
				setTimeout(addAnimation, 1000); // 每次动画结束后等待一秒再重新开始
			}
		});
	}

	// 页面加载后一秒钟启动第一次动画
	setTimeout(addAnimation, 1000);

});

// 定向流量tab飞入
document.addEventListener('DOMContentLoaded', function() {
	const tabs = document.querySelectorAll('.home_question_tab');
	// $('.home_question_tab').css('transition','all 0.9s ease-in-out')

	// 初始加载时的动画，从最右边的Tab开始
	let index = tabs.length - 1;
	const interval = setInterval(() => {
		if (index >= 0) {
			tabs[index].classList.add('show');
			index--;
		} else {
			clearInterval(interval);
		}
	}, 100); // 每个Tab项之间间隔300毫秒

});