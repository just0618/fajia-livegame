(() => {
  "use strict";
  const bank = Array.isArray(window.FAJIA_GUESS_WORDS) ? window.FAJIA_GUESS_WORDS : [];
  const players = ["法宣阁", "贺嘉述"];
  if (bank.length !== 34) throw new Error("你问我猜词库未正确加载。");

  const state = { total:3, seconds:45, completed:0, skipped:0, guesser:0, queue:[], current:null, phase:"idle", timer:null, remaining:45, prepTimer:null, used:new Set() };
  const $ = (id) => document.getElementById(id);
  const el = { setup:$('setupScreen'), play:$('playScreen'), result:$('resultScreen'), round:$('roundText'), role:$('roleText'), progress:$('progressBar'), eyebrow:$('phaseEyebrow'), title:$('phaseTitle'), copy:$('phaseCopy'), word:$('secretWord'), prep:$('prepCount'), ring:$('timerRing'), time:$('timerValue'), revealActions:$('revealActions'), hideActions:$('hideActions'), guessingActions:$('guessingActions'), answerActions:$('answerActions'), reveal:$('revealButton'), hideStart:$('hideStartButton'), skipReveal:$('skipRevealButton'), skipActive:$('skipActiveButton'), guessed:$('guessedButton'), giveUp:$('giveUpButton'), next:$('nextButton'), back:$('backSetupButton'), resultCompleted:$('resultCompleted'), resultSkipped:$('resultSkipped'), playAgain:$('playAgainButton'), help:$('helpDialog'), openHelp:$('openHelpButton'), closeHelp:$('closeHelpButton'), toast:$('toast') };
  let toastTimer;

  function shuffle(items){ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function radio(name, fallback){ return Number(document.querySelector(`input[name="${name}"]:checked`)?.value || fallback); }
  function showToast(msg){ clearTimeout(toastTimer); el.toast.textContent=msg; el.toast.classList.add('is-visible'); toastTimer=setTimeout(()=>el.toast.classList.remove('is-visible'),2300); }
  function validSequence(seq){
    if (seq.filter(x=>x.futureType).length>1) return false;
    for(let i=1;i<seq.length;i++){
      if(seq[i].highEffect && seq[i-1].highEffect) return false;
      if(seq[i].category==='body' && seq[i-1].category==='body') return false;
    }
    return true;
  }
  function buildQueue(rounds){
    const high=bank.filter(x=>x.highEffect); const regular=bank.filter(x=>!x.highEffect);
    const highCount=rounds===3?1:2; const regularCount=rounds-highCount;
    for(let tries=0;tries<600;tries++){
      let hs=shuffle(high).slice(0,highCount);
      if(hs.filter(x=>x.futureType).length>1) continue;
      let rs=shuffle(regular).slice(0,regularCount);
      let seq=new Array(rounds); let positions=rounds===3 ? [Math.random()<.5?1:2] : shuffle([[1,3],[1,4],[2,4]])[0];
      const hp=Array.isArray(positions)?positions:[positions];
      hp.forEach((p,i)=>seq[p]=hs[i]);
      let ri=0; for(let i=0;i<rounds;i++) if(!seq[i]) seq[i]=rs[ri++];
      if(validSequence(seq)) return seq;
    }
    return shuffle(bank).slice(0,rounds);
  }
  function setPanels(which){
    el.revealActions.hidden=which!=='reveal'; el.hideActions.hidden=which!=='word'; el.guessingActions.hidden=which!=='guess'; el.answerActions.hidden=which!=='answer';
  }
  function updateHeader(){
    el.round.textContent=`第 ${state.completed+1} / ${state.total} 题`;
    el.role.textContent=`${players[state.guesser]}猜 · ${players[1-state.guesser]}看词`;
    el.progress.style.width=`${(state.completed/state.total)*100}%`;
  }
  function showSecretStage(){
    clearTimers(); state.phase='reveal'; el.word.hidden=true; el.prep.hidden=true; el.ring.hidden=true; setPanels('reveal'); updateHeader();
    el.eyebrow.textContent='SECRET WORD'; el.title.textContent=`请${players[state.guesser]}移开视线`; el.copy.textContent=`确认看不到屏幕后，再由${players[1-state.guesser]}查看本题词语。`;
  }
  function revealWord(){ state.phase='word'; el.word.textContent=state.current.text; el.word.hidden=false; setPanels('word'); el.title.textContent=`${players[1-state.guesser]}请记住这个词`; el.copy.textContent='记住后立即隐藏，不要把答案直接念给猜词者。'; }
  function hideAndStart(){ el.word.hidden=true; setPanels('none'); el.title.textContent='准备开始'; el.copy.textContent='猜词者可以自由提问，回答者自然作答。'; state.phase='prep'; let n=3; el.prep.hidden=false; el.prep.textContent=n; state.prepTimer=setInterval(()=>{n-=1;if(n<=0){clearInterval(state.prepTimer);state.prepTimer=null;el.prep.hidden=true;startTimer();}else el.prep.textContent=n;},800); }
  function startTimer(){ state.phase='guess'; state.remaining=state.seconds; el.ring.hidden=false; el.time.textContent=state.remaining; setPanels('guess'); el.eyebrow.textContent='ASK & GUESS'; el.title.textContent='开始提问'; el.copy.textContent='可以随时直接猜答案。猜到了就点击“猜中了”。'; state.timer=setInterval(()=>{state.remaining-=1;el.time.textContent=state.remaining;if(state.remaining<=0){clearInterval(state.timer);state.timer=null;showAnswer('time');}},1000); }
  function showAnswer(reason){ clearTimers(); state.phase='answer'; el.ring.hidden=true; el.word.hidden=false; el.word.textContent=state.current.text; setPanels('answer'); el.eyebrow.textContent=reason==='guessed'?'GOT IT':reason==='time'?'TIME UP':'ANSWER'; el.title.textContent=reason==='guessed'?'猜中了！':reason==='time'?'时间到，答案是':'本题答案'; el.copy.textContent='看完答案后进入下一题，猜词者会自动交换。'; }
  function clearTimers(){ if(state.timer){clearInterval(state.timer);state.timer=null;} if(state.prepTimer){clearInterval(state.prepTimer);state.prepTimer=null;} }
  function chooseReplacement(){
    const pending=new Set(state.queue.slice(state.completed+1).map(x=>x.id));
    let candidates=bank.filter(x=>!state.used.has(x.id) && !pending.has(x.id) && x.id!==state.current?.id);
    const prev=state.completed>0?state.queue[state.completed-1]:null;
    candidates=shuffle(candidates).filter(x=>!(prev?.category==='body'&&x.category==='body'));
    return candidates[0] || shuffle(bank.filter(x=>x.id!==state.current?.id))[0];
  }
  function speakCode(code){
    if(!code || !("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance!=="function") return;
    try{const n=Number(String(code).replace(/^K/i,''));const u=new SpeechSynthesisUtterance(`K${n}`);u.lang='zh-CN';u.rate=.95;u.pitch=1;u.volume=1;window.speechSynthesis.speak(u);}catch{}
  }
  function reportSecretSkip(code){
    if(code&&window.FAJIA_RUM&&typeof window.FAJIA_RUM.reportEvent==='function')window.FAJIA_RUM.reportEvent('skip_question',code,'guess_word','secret_word');
  }
  function skipCurrent(){
    if(!state.current || state.phase==='reveal') return;
    if(state.timer){clearInterval(state.timer);state.timer=null;}
    const code=window.FAJIA_CONTENT_CODE?window.FAJIA_CONTENT_CODE(state.current.id):'';
    // 秘密词不能要求当众读出，否则会直接把答案告诉猜词者；跳过时只播中性K编号。
    speakCode(code); reportSecretSkip(code);
    state.skipped+=1; state.used.add(state.current.id); const replacement=chooseReplacement(); state.queue[state.completed]=replacement; state.current=replacement; showToast('已换一个词，不占本场题数。'); showSecretStage();
  }
  function startResumeTimer(){ state.phase='guess'; el.ring.hidden=false; el.time.textContent=state.remaining; setPanels('guess'); state.timer=setInterval(()=>{state.remaining-=1;el.time.textContent=state.remaining;if(state.remaining<=0){clearInterval(state.timer);state.timer=null;showAnswer('time');}},1000); }
  function nextRound(){
    state.used.add(state.current.id); state.completed+=1;
    if(state.completed>=state.total){showResults();return;}
    state.guesser=1-state.guesser; state.current=state.queue[state.completed]; showSecretStage(); window.scrollTo({top:0,behavior:'smooth'});
  }
  function showResults(){ clearTimers(); el.play.hidden=true; el.result.hidden=false; el.resultCompleted.textContent=String(state.completed); el.resultSkipped.textContent=String(state.skipped); }
  function start(starter){ state.total=radio('rounds',3); state.seconds=radio('seconds',45); state.completed=0;state.skipped=0;state.used=new Set(); state.guesser=starter==='random'?Math.floor(Math.random()*2):Number(starter); state.queue=buildQueue(state.total); state.current=state.queue[0]; el.setup.hidden=true;el.result.hidden=true;el.play.hidden=false;showSecretStage(); window.scrollTo({top:0,behavior:'smooth'}); }
  function returnSetup(){ clearTimers(); el.play.hidden=true;el.result.hidden=true;el.setup.hidden=false; window.scrollTo({top:0,behavior:'smooth'}); }

  document.querySelectorAll('[data-starter]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.starter)));
  el.reveal.addEventListener('click',revealWord); el.hideStart.addEventListener('click',hideAndStart); el.skipReveal.addEventListener('click',skipCurrent); el.skipActive.addEventListener('click',skipCurrent); el.guessed.addEventListener('click',()=>showAnswer('guessed')); el.giveUp.addEventListener('click',()=>showAnswer('reveal')); el.next.addEventListener('click',nextRound); el.back.addEventListener('click',()=>{if(window.confirm('结束当前这一轮并返回设置吗？'))returnSetup();}); el.playAgain.addEventListener('click',returnSetup);
  el.openHelp.addEventListener('click',()=>{if(typeof el.help.showModal==='function')el.help.showModal();else showToast('一人看词，一人自由提问；每题完成后交换猜词者。');}); el.closeHelp.addEventListener('click',()=>el.help.close()); el.help.addEventListener('click',e=>{if(e.target===el.help)el.help.close();});
})();