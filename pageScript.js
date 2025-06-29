// ==============================
// Vue兼容视频进度条插件 - 页面脚本
// 版本: 2.3
// 日期: 2023-08-18
// ==============================

(function() {
    console.log('🚀 页面脚本已加载 - 视频限制解除器 (v2.9 智能分析版)');
    
    // ==============================
    // 全局拦截器 (对所有网页生效)
    // ==============================

    // 1. 拦截 addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (this.tagName === 'VIDEO' && (type === 'seeking' || type === 'timeupdate')) {
            const listenerStr = listener.toString();
            if (listenerStr.includes('preventDefault')) {
                console.warn(`🛑 (全局拦截) 拦截了视频[${type}]事件中一个可能具有限制性的监听器。`, listener);
                return; 
            }
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // 2. 拦截 setInterval
    const originalSetInterval = window.setInterval;
    window.setInterval = function(fn, delay) {
        const fnStr = fn.toString();
        if (fnStr.includes('currentTime') && fnStr.includes('getElementById')) {
             console.warn('🛑 (全局拦截) 拦截了一个可能限制视频播放的定时器。', fn);
             return null; // 返回null或一个无效ID来阻止定时器
        }
        return originalSetInterval.apply(this, arguments);
    };
    
    console.log('✅ 全局拦截器已启动');

    // ==============================
    // 通用破解逻辑 (核心升级)
    // ==============================

    function findTargetPropertyName(targetObject) {
        console.log("   [分析] 正在分析对象属性以查找关键限制变量...");
        const properties = Object.getOwnPropertyNames(targetObject);
        const keywords = { 'last': 3, 'previous': 3, 'time': 2, 'seek': 2, 'play': 1 };
        let bestCandidate = null;
        let maxScore = 0;
        for (const prop of properties) {
            if (prop.startsWith('_') || prop.startsWith('$')) continue;
            let currentScore = 0;
            const lowerCaseProp = prop.toLowerCase();
            for (const keyword in keywords) {
                if (lowerCaseProp.includes(keyword)) {
                    currentScore += keywords[keyword];
                }
            }
            if (currentScore > maxScore) {
                maxScore = currentScore;
                bestCandidate = prop;
            }
        }
        if (bestCandidate && maxScore >= 4) {
            console.log(`   [成功] 识别出关键属性名: "${bestCandidate}" (得分: ${maxScore})`);
            return bestCandidate;
        }
        console.warn(`   [失败] 未能动态找到关键属性名（最高分 ${maxScore}）。`);
        return null;
    }

    // 此函数已升级为通用函数
    function disableRestrictionsOnObject(targetObject, videoElement) {
        console.log("   [*] 开始对目标对象执行限制解除...");
        
        const videoRef = videoElement || targetObject.$refs?.videoPlayer;
        if (!videoRef) {
            console.error("   [错误] 无法找到视频元素的引用。");
            return;
        }

        // 动态查找并执行"欺骗"策略
        const targetProperty = findTargetPropertyName(targetObject);
        if (targetProperty && targetObject.hasOwnProperty(targetProperty)) {
            let internalValue = targetObject[targetProperty];
            Object.defineProperty(targetObject, targetProperty, {
                get: function() {
                    return videoRef.currentTime;
                },
                set: function(newValue) { internalValue = newValue; },
                configurable: true
            });
            console.log(`   [成功] 已部署 "${targetProperty}" 欺骗策略。`);
        }

        // 清除定时器
        if (targetObject.checkInterval) {
            clearInterval(targetObject.checkInterval);
            targetObject.checkInterval = null;
        }

        // 覆盖 timeupdate 处理器 (如果存在)
        if (typeof targetObject.handleTimeUpdate === 'function') {
            Object.defineProperty(targetObject, 'handleTimeUpdate', { value: function() {}, writable: true });
            console.log("   [成功] 已覆盖 timeupdate 处理器。");
        }

        videoRef.controls = true;
        console.log('   [完成] 已强制启用原生视频控制条。');
    }

    // ==============================
    // 对象发现与主流程 (核心升级)
    // ==============================

    function findGlobalPlayerObject(video) {
        console.log(" [搜索] 未找到Vue, 启动全局播放器对象扫描...");
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && typeof obj === 'object' && obj !== null) {
                    // 检查对象的属性是否包含我们的视频元素
                    for (const prop in obj) {
                        if (obj.hasOwnProperty(prop) && obj[prop] === video) {
                            console.log(` [发现!] 窗口对象 "window.${key}" 似乎控制着此视频。`);
                            return obj;
                        }
                    }
                }
            } catch (e) { /* 忽略访问错误 */ }
        }
        console.log(" [搜索] 未在全局范围找到明确的播放器对象。");
        return null;
    }
    
    // ==============================
    // 主处理流程
    // ==============================
    
    // 更可靠的Vue实例获取
    function getVueComponent(element) {
        console.log('尝试获取Vue组件...');
        
        // Vue 2.x
        if (element.__vue__) {
            console.log('✓ 通过__vue__获取到Vue 2.x组件');
            return element.__vue__;
        }
        
        // Vue 3.x
        if (element.__vnode?.ctx) {
            console.log('✓ 通过__vnode.ctx获取到Vue 3.x组件');
            return element.__vnode.ctx;
        }
        
        console.log('⚠️ 直接获取失败，尝试向上查找父组件...');
        
        // 向上查找父组件
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 10) {
            depth++;
            console.log(`检查第${depth}层父元素: ${parent.tagName}`);
            
            if (parent.__vue__) {
                console.log('✓ 在父元素中找到Vue 2.x组件');
                return parent.__vue__;
            }
            if (parent.__vnode?.ctx) {
                console.log('✓ 在父元素中找到Vue 3.x组件');
                return parent.__vnode.ctx;
            }
            parent = parent.parentElement;
        }
        
        // 尝试使用全局Vue实例
        if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ && window.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue) {
            const instances = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue.instances;
            if (instances && instances.length > 0) {
                console.log('✓ 通过Vue Devtools钩子找到Vue组件');
                return instances[0];
            }
        }
        
        console.log('❌ 未找到Vue组件');
        return null;
    }
    
    function processVideo(video) {
        console.log(`--- 开始处理视频:`, video.src || '无 src ---');
        
        const vueComponent = getVueComponent(video);
        
        if (vueComponent) {
            console.log(' [诊断] 发现Vue组件，执行Vue专用方案。');
            disableRestrictionsOnObject(vueComponent, null); // 传递 null, 函数会尝试从 $refs 获取 video
        } else {
            const playerObject = findGlobalPlayerObject(video);
            if (playerObject) {
                console.log(' [诊断] 发现全局播放器对象，执行通用破解方案。');
                disableRestrictionsOnObject(playerObject, video);
            } else {
                console.log(' [诊断] 未发现特定控制对象，切换到基础保障模式。');
                video.controls = true;
                console.log('   [完成] 已强制启用原生视频控制条。');
            }
        }
    }

    function init() {
        console.log('初始化视频限制解除器 (智能分析版)...');
        document.querySelectorAll('video').forEach(processVideo);
        
        // 使用 MutationObserver 监听后续添加的视频
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'VIDEO') {
                        processVideo(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('video').forEach(processVideo);
                    }
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // 添加全局调试函数
    window.debugVideoProgress = function() {
        const video = document.querySelector('video');
        if (!video) {
            console.log('未找到视频元素');
            return;
        }
        
        const vm = getVueComponent(video);
        console.log('Vue组件:', vm);
        if (vm) {
            console.log('Vue组件属性:', Object.keys(vm));
            console.log('checkInterval:', vm.checkInterval);
        }
    };
    
    // 监听来自内容脚本的消息
    window.addEventListener('message', function(event) {
        // 确保消息来自同一个窗口
        if (event.source !== window) return;
        
        // 处理来自内容脚本的消息
        if (event.data.type === 'VIDEO_PROGRESS_EXTENSION' && event.data.action === 'INIT') {
            console.log('收到内容脚本初始化消息，开始处理');
            init();
        }
    });
    
    // 如果页面已加载完成，直接初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})(); 