// Wyszukiwarka po stronie klienta: pobiera prebudowany search-index.json, bez usług zewnętrznych.
(function(){
  var s=document.currentScript,base=s.getAttribute('data-base'),form=document.getElementById('search-page-form'),
      input=document.getElementById('search-page-q'),out=document.getElementById('search-results'),status=document.getElementById('search-status');
  if(!form||!input||!out)return;
  var idx=null;
  function norm(t){return (t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l')}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function run(q){
    var terms=norm(q).split(/\s+/).filter(function(t){return t.length>1});
    out.innerHTML='';
    if(!terms.length){status.textContent='Wpisz co najmniej 2 znaki.';return}
    var hits=idx.map(function(d){
      var T=norm(d.t),D=norm(d.d+' '+d.c+' '+d.h),B=norm(d.b),sc=0;
      for(var i=0;i<terms.length;i++){var w=terms[i];var x=(T.indexOf(w)>-1?10:0)+(D.indexOf(w)>-1?4:0)+(B.indexOf(w)>-1?1:0);if(!x)return null;sc+=x}
      return {d:d,s:sc};
    }).filter(Boolean).sort(function(a,b){return b.s-a.s});
    status.textContent=hits.length?('Wyniki: '+hits.length):'Brak wyników dla „'+q+'”.';
    out.innerHTML=hits.slice(0,50).map(function(h){return '<li><p class="tag">'+esc(h.d.c)+'</p><h2 class="h3"><a href="'+esc(h.d.u)+'">'+esc(h.d.t)+'</a></h2><p>'+esc(h.d.d)+'</p></li>'}).join('');
  }
  function go(q){
    if(idx){run(q);return}
    status.textContent='Wczytywanie…';
    fetch(base+'search-index.json').then(function(r){return r.json()}).then(function(j){idx=j;run(q)}).catch(function(){status.textContent='Nie udało się wczytać wyszukiwarki.'});
  }
  form.addEventListener('submit',function(e){e.preventDefault();var q=input.value.trim();history.replaceState(null,'','?q='+encodeURIComponent(q));go(q)});
  var q0=new URLSearchParams(location.search).get('q');
  if(q0){input.value=q0;go(q0)}
})();
