// ==============================
// 通用视频进度条插件 - 页面脚本 (扩展版)
// ==============================

(function() {
    console.log('🚀 页面脚本已加载 - 视频限制解除器');
    
    // 同步网站原始进度条
    function syncOriginalProgressBar(videoElement, percent, vueComponent = null) {
        try {
            // 1. 如果有Vue组件，更新Vue组件中的进度条数据
            if (vueComponent) {
                const progressProperties = ['progress', 'playPercentage', 'progressValue', 'sliderValue', 'videoProgress'];
                for (const prop of progressProperties) {
                    if (vueComponent[prop] !== undefined) {
                        vueComponent[prop] = percent;
                    }
                }
                
                // 触发Vue更新
                if (typeof vueComponent.$forceUpdate === 'function') {
                    vueComponent.$forceUpdate();
                }
            }
            
            // 2. 查找并直接更新DOM中的进度条元素
            const progressSelectors = [
                '.video-progress', '.progress-bar', '.player-progress', 
                '#videoProgress', '[role="progressbar"]', '.el-slider__runway',
                '.progress', '.vjs-progress-holder', '.progress-bar-played',
                'input[type="range"].timeline', '.ytp-progress-bar',
                '.bilibili-player-video-progress', '.progress-played'
            ];
            
            // 查找范围
            const searchScopes = [];
            
            // 如果有Vue组件，先在Vue组件中查找
            if (vueComponent && vueComponent.$el) {
                searchScopes.push(vueComponent.$el);
            }
            
            // 在视频周围查找
            if (videoElement) {
                // 视频父元素
                if (videoElement.parentElement) {
                    searchScopes.push(videoElement.parentElement);
                }
                
                // 视频容器
                const container = videoElement.closest('.video-container, .player, .video-player, .player-container');
                if (container) {
                    searchScopes.push(container);
                }
                
                // 向上查找3层
                let parent = videoElement.parentElement;
                for (let i = 0; i < 3; i++) {
                    if (parent) {
                        searchScopes.push(parent);
                        parent = parent.parentElement;
                    }
                }
            }
            
            // 最后在整个文档中查找
            searchScopes.push(document);
            
            // 在每个范围内查找进度条
            let progressElement = null;
            for (const scope of searchScopes) {
                if (progressElement) break;
                for (const selector of progressSelectors) {
                    try {
                        const elements = scope.querySelectorAll(selector);
                        if (elements.length > 0) {
                            progressElement = elements[0];
                            break;
                        }
                    } catch (e) {}
                }
            }
            
            // 更新进度条
            if (progressElement) {
                if (progressElement.tagName === 'INPUT' && progressElement.type === 'range') {
                    progressElement.value = percent;
                    // 触发事件
                    progressElement.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (progressElement.style) {
                    progressElement.style.width = `${percent}%`;
                }
            }
        } catch (e) {
            console.log('同步原始进度条时出错:', e);
        }
    }
    
    // 清除所有可能的定时器
    function clearAllTimers(obj) {
        if (!obj) return 0;
        
        // 定时器可能的属性名列表
        const timerProps = [
            'checkInterval', 'timer', 'interval', 'timeChecker', 
            'progressTimer', 'updateTimer', 'playbackTimer',
            'monitorTimer', 'checkTimer', 'playTimer', 'timeoutId'
        ];
        
        // 检查并清除匹配的定时器
        let clearedCount = 0;
        for (const prop of timerProps) {
            if (obj[prop]) {
                clearInterval(obj[prop]);
                clearTimeout(obj[prop]);
                obj[prop] = null;
                clearedCount++;
            }
        }
        
        return clearedCount;
    }
    
    // 清除全局定时器（谨慎使用）
    function clearGlobalTimers(maxId = 1000) {
        console.log('清除可能的全局定时器...');
        let count = 0;
        
        // 尝试清除可能的定时器ID
        for (let i = 1; i < maxId; i++) {
            try {
                clearInterval(i);
                clearTimeout(i);
                count++;
            } catch (e) {}
        }
        
        return count;
    }
    
    // 核心功能：解除Vue网站视频限制
    function disableVueVideoRestrictions(vueComponent) {
        if (!vueComponent) return false;
        
        console.log('开始解除Vue视频限制...');
        
        // 1. 清除组件中所有可能的定时器
        clearAllTimers(vueComponent);
        
        // 2. 替换视频元素，移除所有事件监听器
        if (vueComponent.$refs && vueComponent.$refs.videoPlayer) {
            const videoEl = vueComponent.$refs.videoPlayer;
            replaceVideoElement(videoEl, vueComponent);
            return true;
        }
        
        return false;
    }
    
    // 通用方法：解除一般网站视频限制
    function disableGeneralVideoRestrictions(videoElement) {
        if (!videoElement) return false;
        
        console.log('开始解除一般视频限制...');
        
        // 1. 尝试清除视频相关的定时器
        // 查找可能包含定时器的对象
        const possibleTimerContainers = [
            videoElement,
            videoElement.parentElement,
            videoElement.parentNode,
            window.player,
            window.videoPlayer,
            window.mediaPlayer
        ];
        
        let timerCleared = 0;
        possibleTimerContainers.forEach(container => {
            if (container) {
                timerCleared += clearAllTimers(container);
            }
        });
        
        console.log(`已清除 ${timerCleared} 个可能的定时器`);
        
        // 2. 替换视频元素，移除所有事件监听器
        replaceVideoElement(videoElement);
        return true;
    }
    
    // 替换视频元素的通用方法
    function replaceVideoElement(videoEl, vueComponent = null) {
        // 创建干净的视频元素
        const cleanVideo = document.createElement('video');
        
        // 复制属性
        for (const attr of videoEl.attributes) {
            cleanVideo.setAttribute(attr.name, attr.value);
        }
        
        // 复制源元素
        Array.from(videoEl.children).forEach(child => {
            if (child.tagName === 'SOURCE' || child.tagName === 'TRACK') {
                cleanVideo.appendChild(child.cloneNode(true));
            }
        });
        
        // 复制视频状态
        cleanVideo.src = videoEl.src;
        cleanVideo.currentTime = videoEl.currentTime;
        cleanVideo.volume = videoEl.volume;
        cleanVideo.muted = videoEl.muted;
        cleanVideo.playbackRate = videoEl.playbackRate;
        cleanVideo.controls = true; // 启用控制条
        cleanVideo.style.cssText = videoEl.style.cssText; // 复制样式
        
        // 替换原视频
        if (videoEl.parentNode) {
            videoEl.parentNode.replaceChild(cleanVideo, videoEl);
            
            // 如果是Vue组件，更新引用
            if (vueComponent) {
                vueComponent.$refs.videoPlayer = cleanVideo;
            }
            
            // 继续播放
            if (!videoEl.paused) {
                cleanVideo.play().catch(() => {});
            }
            
            // 添加seeking事件监听器
            cleanVideo.addEventListener('seeking', function() {
                // 计算百分比
                if (cleanVideo.duration) {
                    const percent = (cleanVideo.currentTime / cleanVideo.duration) * 100;
                    
                    // 如果是Vue组件
                    if (vueComponent) {
                        vueComponent.lastPlayedTime = cleanVideo.currentTime;
                        vueComponent.playTime = Math.floor(cleanVideo.currentTime);
                        if (vueComponent.videoDuration) {
                            vueComponent.playPercentage = Math.round(percent);
                        }
                    }
                    
                    // 同步网站原始进度条
                    syncOriginalProgressBar(cleanVideo, percent, vueComponent);
                }
            });
            
            // 通知内容脚本视频元素已替换
            window.postMessage({
                type: 'VIDEO_PROGRESS_EXTENSION',
                action: 'VIDEO_REPLACED',
                details: { src: cleanVideo.src }
            }, '*');
            
            console.log('✅ 视频元素已成功替换');
            return cleanVideo;
        }
        
        return null;
    }
    
    // 获取Vue组件
    function getVueComponent(element) {
        // Vue 2.x
        if (element.__vue__) return element.__vue__;
        
        // Vue 3.x
        if (element.__vnode?.ctx) return element.__vnode.ctx;
        
        // 向上查找父组件
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
            depth++;
            if (parent.__vue__) return parent.__vue__;
            if (parent.__vnode?.ctx) return parent.__vnode.ctx;
            parent = parent.parentElement;
        }
        
        return null;
    }
    
    // 处理视频元素
    function processVideoRestrictions(video) {
        // 1. 先尝试Vue方案
        const vueComponent = getVueComponent(video);
        if (vueComponent) {
            console.log('检测到Vue组件，使用Vue方案');
            return disableVueVideoRestrictions(vueComponent);
        }
        
        // 2. 如果没有Vue组件，使用一般方案
        console.log('未检测到Vue组件，使用一般方案');
        return disableGeneralVideoRestrictions(video);
    }
    
    // 初始化
    function init() {
        const videos = document.querySelectorAll('video');
        if (videos.length === 0) {
            console.log('未找到视频元素，将在后续监听');
            
            // 设置一个MutationObserver来监听新增的视频
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeName === 'VIDEO') {
                                processVideoRestrictions(node);
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                node.querySelectorAll('video').forEach(processVideoRestrictions);
                            }
                        }
                    }
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            videos.forEach(processVideoRestrictions);
        }
    }
    
    // 监听来自内容脚本的消息
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        
        if (event.data.type === 'VIDEO_PROGRESS_EXTENSION') {
            const action = event.data.action;
            
            if (action === 'INIT') {
                init();
            } else if (action === 'PROGRESS_CHANGED') {
                const details = event.data.details;
                
                // 查找所有视频元素
                document.querySelectorAll('video').forEach(video => {
                    // 尝试Vue方案
                    const vueComponent = getVueComponent(video);
                    if (vueComponent) {
                        // 同步原始进度条（Vue方案）
                        syncOriginalProgressBar(video, details.percent, vueComponent);
                    } else {
                        // 同步原始进度条（一般方案）
                        syncOriginalProgressBar(video, details.percent);
                    }
                });
            }
        }
    });
    
    // 如果页面已加载完成，直接初始化
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})(); 