$(document).ready(function() {
	
	// 大模型生成中
	$('.bottom_presuppose p').addClass('bottom_presuppose_disabled') //禁止点击
	$('#userInput').attr('disabled','disabled');
	$('.input_content').css('background','#f4f6f9')
	
	
	// 大模型生成完成
	$('.bottom_presuppose p').removeClass('bottom_presuppose_disabled') //移除禁止点击
	$('#userInput').attr('disabled',false);
	$('.input_content').css('background','#ffffff')
	
	$('.bottom_presuppose p').click(function(){
		console.log(12)
	})
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
	
	
	// 反馈
	$(document).on('click', '.feedback_content_details> p > span', function() {
		var i = $(this).index();
		$('.feedback_content_details> p > span').removeClass('feedback_active');
		$(this).addClass('feedback_active');
		$('.feedback_textarea').hide();
		$('.button_large').attr('disabled',false)
	});
	
	$(document).on('click', '.feedback_other', function() {
		$('.feedback_textarea').show();
	});
	$(document).on('click', '.button_large', function() {
		$('.feedback').hide();
		const toast = document.getElementById("toast");
		toast.innerText ='提交成功';
		toast.style.display = 'block';
		$('.praise').off('click');
		
		$('.poorly').off('click'); //提交后不能再点踩
		$('#content').val(''); //清空内容
		$('#numCount').text('0'); //数字清零
		
		setTimeout(() => {
			toast.style.display = 'none';
		}, 1000);
	});
	$('.poorly').on('click', function(){
		$(this).attr('src','image/poorly_blue.png');
		$('.feedback').show();
		// $('.praise').off('click')
		
	});
	$('.praise').on('click', function(){
		$(this).attr('src','image/praise_blue.png');
		$(this).siblings('.poorly').attr('src','image/poorly_grey.png')
		$('.poorly').off('click')
	})
	




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