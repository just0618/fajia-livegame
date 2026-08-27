(() => {
  const video = document.getElementById('truthVideo');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseIcon = document.getElementById('pauseIcon');
  const pauseText = document.getElementById('pauseText');
  const rewindBtn = document.getElementById('rewindBtn');
  const restartBtn = document.getElementById('restartBtn');
  const statusText = document.getElementById('statusText');
  const status = document.querySelector('.status');
  const rulesBtn = document.querySelector('[data-scroll-rules]');

  function setStatus(text, state = '') {
    statusText.textContent = text;
    status.classList.toggle('is-paused', state === 'paused');
    status.classList.toggle('is-loading', state === 'loading');
  }

  function updateState() {
    if (video.ended) {
      pauseIcon.textContent = '↻';
      pauseText.textContent = '重新播放';
      setStatus('视频播放完毕，可以从头再来', 'paused');
      return;
    }

    if (video.paused) {
      const hasStarted = video.currentTime > 0.05;
      pauseIcon.textContent = '▶';
      pauseText.textContent = hasStarted ? '继续播放' : '开始播放';

      if (hasStarted) {
        setStatus('已暂停，请答题', 'paused');
      } else if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        setStatus('视频已准备好，可以开始播放', 'paused');
      } else {
        setStatus('正在准备视频…', 'loading');
      }
    } else {
      pauseIcon.textContent = 'Ⅱ';
      pauseText.textContent = '暂停回答';
      setStatus('正在播放题目，回答时可先点击暂停');
    }
  }

  pauseBtn.addEventListener('click', async () => {
    if (video.ended) {
      video.currentTime = 0;
      try { await video.play(); } catch (_) { updateState(); }
      return;
    }
    if (video.paused) {
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        setStatus('正在准备视频…', 'loading');
      }
      try { await video.play(); } catch (_) { updateState(); }
    } else {
      video.pause();
    }
  });

  rewindBtn.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 5);
    updateState();
  });

  restartBtn.addEventListener('click', async () => {
    video.currentTime = 0;
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      setStatus('正在准备视频…', 'loading');
    }
    try { await video.play(); } catch (_) { updateState(); }
  });

  video.addEventListener('loadstart', () => {
    if (video.currentTime <= 0.05) setStatus('正在准备视频…', 'loading');
  });
  video.addEventListener('canplay', updateState);
  video.addEventListener('loadedmetadata', updateState);
  video.addEventListener('play', updateState);
  video.addEventListener('playing', updateState);
  video.addEventListener('pause', updateState);
  video.addEventListener('ended', updateState);
  video.addEventListener('waiting', () => {
    setStatus('网络稍慢，正在缓冲视频…', 'loading');
  });
  video.addEventListener('stalled', () => {
    setStatus('网络稍慢，正在继续加载…', 'loading');
  });

  rulesBtn.addEventListener('click', () => {
    document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Explicitly request buffering as soon as this page is opened.
  if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
  updateState();
})();
