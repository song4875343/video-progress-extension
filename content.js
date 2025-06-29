// ==============================
// Vue兼容视频进度条插件 (修复版)
// 版本: 2.3
// 日期: 2023-08-18
// ==============================

console.log('内容脚本已加载，准备处理视频元素');

// 存储视频和进度条状态
const videoProgressMap = new WeakMap();

// 创建进度条元素
function createProgressBar() {
    const progressBar = document.createElement('input');
    progressBar.type = 'range';
    progressBar.min = '0';
    progressBar.max = '100';
    progressBar.value = '0';
    progressBar.id = 'custom-progress-bar';
    return progressBar;
}

// 智能查找视频容器
function findVideoContainer(video) {
    // 首先尝试使用父元素
    let container = video.parentElement;
    
    // 如果父元素不存在或不适合，使用视频的包装元素
    if (!container || container.tagName === 'BODY') {
        // 创建一个包装容器
        container = document.createElement('div');
        container.style.position = 'relative';
        container.style.display = 'inline-block';
        
        // 替换视频元素
        const parent = video.parentElement;
        if (parent) {
            parent.insertBefore(container, video);
            container.appendChild(video);
        }
    }
    
    // 确保容器有相对定位
    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }
    
    return container;
}

// 附加进度条到视频
function attachProgressBar(video) {
    // 跳过已处理的视频
    if (videoProgressMap.has(video)) return;
    
    let progressBar; // 在外部声明变量
    
    try {
        // 创建进度条元素
        progressBar = createProgressBar(); // 赋值
        
        // 智能定位容器
        const container = findVideoContainer(video);
        container.appendChild(progressBar);
        
        // 存储状态
        const state = {
            progressBar,
            isDragging: false,
            video,
            container
        };
        videoProgressMap.set(video, state);
        
        // 事件处理
        const updateProgress = () => {
            if (!state.isDragging && video.duration > 0) {
                progressBar.value = (video.currentTime / video.duration) * 100;
            }
        };
        
        // 进度跳转
        progressBar.addEventListener('input', () => {
            state.isDragging = true;
            video.currentTime = (progressBar.value / 100) * video.duration;
        });
        
        progressBar.addEventListener('change', () => {
            setTimeout(() => state.isDragging = false, 100);
        });
        
        // 监听视频事件
        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadeddata', updateProgress);
        
        // 容器移除监听
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (Array.from(mutation.removedNodes).includes(progressBar)) {
                    // 进度条被移除，重新附加
                    container.appendChild(progressBar);
                }
            }
        });
        
        observer.observe(container, { childList: true });
        state.observer = observer;
        
        console.log('进度条已附加到视频:', video.src);
    } catch (error) {
        // 安全访问 progressBar
        if (progressBar && progressBar.parentNode) {
            progressBar.parentNode.removeChild(progressBar);
        }
        console.error('附加进度条失败:', error.message || error);
    }
}

// 处理视频元素
function processVideo(video) {
    console.log('开始处理视频元素:', video.src || '未知来源');
    attachProgressBar(video);
}

// 初始化插件
function initVideoProgressControl() {
    console.log('🚀 初始化视频进度条插件 v2.3');
    
    // 处理现有视频
    const existingVideos = document.querySelectorAll('video');
    console.log(`发现${existingVideos.length}个现有视频元素`);
    existingVideos.forEach(processVideo);
    
    // 添加MutationObserver监听DOM变化
    console.log('设置DOM变化监听器...');
    const observer = new MutationObserver(mutations => {
        // 检查是否有新增的视频元素
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    // 直接是视频元素
                    if (node.nodeName === 'VIDEO') {
                        console.log('监测到新增视频元素');
                        processVideo(node);
                    }
                    // 可能包含视频元素的容器
                    else if (node.nodeType === Node.ELEMENT_NODE) {
                        const videos = node.querySelectorAll('video');
                        if (videos.length > 0) {
                            console.log(`监测到容器中有${videos.length}个新视频元素`);
                            videos.forEach(processVideo);
                        }
                    }
                }
            }
        }
    });
    
    // 监听整个文档
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    console.log('DOM监听器已启动');
    
    // 修复：增强定时扫描
    // console.log('启动定时扫描（每3秒）...');
    // setInterval(() => {
    //     const videos = document.querySelectorAll('video');
    //     console.log(`定时扫描：找到 ${videos.length} 个视频元素`);
        
    //     videos.forEach(video => {
    //         if (!videoProgressMap.has(video)) {
    //             console.log('处理新发现的视频元素');
    //             processVideo(video);
    //         }
    //     });
    // }, 3000);
    
    // console.log('✅ 视频进度条插件初始化完成');
}

// 创建一个自定义事件，用于在页面脚本中监听
function setupCustomEvents() {
    // 创建一个全局事件，用于接收页面脚本发送的消息
    window.addEventListener('message', function(event) {
        // 确保消息来自同一个窗口
        if (event.source !== window) return;
        
        // 处理来自页面脚本的消息
        if (event.data.type === 'VIDEO_PROGRESS_EXTENSION') {
            console.log('收到页面脚本消息:', event.data.action);
            
            if (event.data.action === 'VIDEO_PROCESSED') {
                console.log('页面脚本已处理视频:', event.data.details);
            }
        }
    });
}

// 注入外部脚本
function injectExternalScript() {
    console.log('准备注入外部脚本...');
    
    try {
        // 创建一个脚本元素
        const script = document.createElement('script');
        
        // 获取脚本URL
        const scriptURL = chrome.runtime.getURL('pageScript.js');
        console.log('页面脚本URL:', scriptURL);
        
        script.src = scriptURL;
        script.onload = function() {
            console.log('外部脚本加载成功，将被移除');
            this.remove(); // 加载后移除脚本标签
            
            // 通知页面脚本开始处理
            window.postMessage({
                type: 'VIDEO_PROGRESS_EXTENSION',
                action: 'INIT'
            }, '*');
        };
        
        script.onerror = function(error) {
            console.error('脚本加载失败:', error);
        };
        
        // 添加到页面
        (document.head || document.documentElement).appendChild(script);
        console.log('脚本元素已添加到页面');
    } catch (e) {
        console.error('注入外部脚本时发生错误:', e);
    }
}

// 启动插件
if (document.readyState === 'complete') {
    initVideoProgressControl();
    setupCustomEvents();
    try {
        injectExternalScript();
    } catch (e) {
        console.error('注入外部脚本失败:', e);
    }
} else {
    window.addEventListener('load', function() {
        initVideoProgressControl();
        setupCustomEvents();
        try {
            injectExternalScript();
        } catch (e) {
            console.error('注入外部脚本失败:', e);
        }
    });
}