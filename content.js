// ==============================
// 通用视频进度条插件 (扩展版)
// ==============================

console.log('内容脚本已加载');

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
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '10px';
    progressBar.style.left = '0';
    progressBar.style.width = '100%';
    progressBar.style.zIndex = '9999';
    progressBar.style.opacity = '0.3';
    return progressBar;
}

// 查找视频容器
function findVideoContainer(video) {
    let container = video.parentElement;
    
    if (!container || container.tagName === 'BODY') {
        container = document.createElement('div');
        container.style.position = 'relative';
        container.style.display = 'inline-block';
        
        const parent = video.parentElement;
        if (parent) {
            parent.insertBefore(container, video);
            container.appendChild(video);
        }
    }
    
    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }
    
    return container;
}

// 附加进度条到视频
function attachProgressBar(video) {
    // 检查视频是否已处理
    if (videoProgressMap.has(video) || video.hasAttribute('data-has-progress-bar')) {
        return;
    }
    
    try {
        // 创建进度条
        const progressBar = createProgressBar();
        
        // 查找容器
        const container = findVideoContainer(video);
        
        // 检查容器中是否已有进度条
        if (container.querySelector('#custom-progress-bar')) {
            return;
        }
        
        container.appendChild(progressBar);
        
        // 标记视频为已处理
        video.setAttribute('data-has-progress-bar', 'true');
        
        // 存储状态
        const state = {
            progressBar,
            isDragging: false,
            video,
            container
        };
        videoProgressMap.set(video, state);
        
        // 更新进度
        const updateProgress = () => {
            if (!state.isDragging && video.duration > 0) {
                progressBar.value = (video.currentTime / video.duration) * 100;
            }
        };
        
        // 进度跳转
        progressBar.addEventListener('input', () => {
            state.isDragging = true;
            video.currentTime = (progressBar.value / 100) * video.duration;
            
            // 通知页面脚本同步原始进度条
            window.postMessage({
                type: 'VIDEO_PROGRESS_EXTENSION',
                action: 'PROGRESS_CHANGED',
                details: {
                    percent: progressBar.value,
                    currentTime: video.currentTime,
                    duration: video.duration
                }
            }, '*');
        });
        
        progressBar.addEventListener('change', () => {
            setTimeout(() => {
                state.isDragging = false;
                
                // 通知页面脚本同步原始进度条（拖动结束）
                window.postMessage({
                    type: 'VIDEO_PROGRESS_EXTENSION',
                    action: 'PROGRESS_CHANGED',
                    details: {
                        percent: progressBar.value,
                        currentTime: video.currentTime,
                        duration: video.duration,
                        isDragEnd: true
                    }
                }, '*');
            }, 100);
        });
        
        // 监听视频事件
        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadeddata', updateProgress);
        
        // 添加悬停效果
        container.addEventListener('mouseenter', () => {
            progressBar.style.opacity = '0.8';
        });
        
        container.addEventListener('mouseleave', () => {
            if (!state.isDragging) {
                progressBar.style.opacity = '0.3';
            }
        });
    } catch (error) {
        console.error('附加进度条失败:', error);
    }
}

// 处理视频元素
function processVideo(video) {
    // 忽略太小的视频元素（如预览缩略图）
    if (video.offsetWidth < 100 || video.offsetHeight < 100) {
        return;
    }
    
    attachProgressBar(video);
}

// 初始化插件
function initVideoProgressControl() {
    // 处理现有视频
    document.querySelectorAll('video').forEach(processVideo);
    
    // 监听DOM变化
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeName === 'VIDEO') {
                        processVideo(node);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        node.querySelectorAll('video').forEach(processVideo);
                    }
                }
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// 处理来自页面脚本的消息
function setupCustomEvents() {
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        
        if (event.data.type === 'VIDEO_PROGRESS_EXTENSION') {
            if (event.data.action === 'VIDEO_REPLACED') {
                // 清理旧进度条
                document.querySelectorAll('#custom-progress-bar').forEach(bar => {
                    if (bar.parentNode) bar.parentNode.removeChild(bar);
                });
                
                // 重新处理视频
                setTimeout(() => {
                    document.querySelectorAll('video').forEach(video => {
                        video.removeAttribute('data-has-progress-bar');
                        processVideo(video);
                    });
                }, 100);
            }
        }
    });
}

// 注入外部脚本
function injectExternalScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('pageScript.js');
    script.onload = function() {
        this.remove();
        window.postMessage({
            type: 'VIDEO_PROGRESS_EXTENSION',
            action: 'INIT'
        }, '*');
    };
    (document.head || document.documentElement).appendChild(script);
}

// 启动插件
if (document.readyState === 'complete') {
    initVideoProgressControl();
    setupCustomEvents();
    injectExternalScript();
} else {
    window.addEventListener('load', function() {
        initVideoProgressControl();
        setupCustomEvents();
        injectExternalScript();
    });
}