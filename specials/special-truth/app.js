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

  function updateState() {
    if (video.ended) {
      pauseIcon.textContent = '↻';
      pauseText.textContent = '重新播放';
      statusText.textContent = '视频播放完毕，可以从头再来';
      status.classList.add('is-paused');
      return;
    }

    if (video.paused) {
      const hasStarted = video.currentTime > 0.05;
      pauseIcon.textContent = '▶';
      pauseText.textContent = hasStarted ? '继续播放' : '开始播放';
      statusText.textContent = hasStarted ? '已暂停，请答题' : '准备好了就开始播放';
      status.classList.add('is-paused');
    } else {
      pauseIcon.textContent = 'Ⅱ';
      pauseText.textContent = '暂停回答';
      statusText.textContent = '正在播放题目，回答时可先点击暂停';
      status.classList.remove('is-paused');
    }
  }

  pauseBtn.addEventListener('click', async () => {
    if (video.ended) {
      video.currentTime = 0;
      try { await video.play(); } catch (_) {}
      return;
    }
    if (video.paused) {
      try { await video.play(); } catch (_) {}
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
    try { await video.play(); } catch (_) { updateState(); }
  });

  ['play', 'pause', 'ended', 'loadedmetadata'].forEach((eventName) => {
    video.addEventListener(eventName, updateState);
  });

  rulesBtn.addEventListener('click', () => {
    document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  updateState();
})();
