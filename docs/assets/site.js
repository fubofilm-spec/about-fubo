(function(){
  function el(tag, cls, text){
    var n=document.createElement(tag);
    if(cls) n.className=cls;
    if(text!=null) n.textContent=text;
    return n;
  }
  function render(){
    var data=window.WORKS_DATA;
    if(!data) return;
    var grid=document.getElementById('works-grid');
    if(grid){
      data.featured.forEach(function(w){
        var card=el('article','work-card');
        var img=el('img');
        img.src=w.cover;
        img.alt=w.title;
        img.loading='lazy';
        card.appendChild(img);
        var body=el('div','work-card-body');
        var top=el('div','work-card-top');
        top.appendChild(el('h3',null,w.title));
        top.appendChild(el('div','work-year', w.year||''));
        body.appendChild(top);
        body.appendChild(el('div','work-client', [w.client,w.duration,w.type].filter(Boolean).join('  ·  ')));
        var tags=el('div','work-tags');
        (w.tech?w.tech.split('、'):[]).concat(w.industry?w.industry.split('、'):[]).filter(Boolean).slice(0,4).forEach(function(t){
          tags.appendChild(el('span','tag',t));
        });
        body.appendChild(tags);
        card.appendChild(body);
        grid.appendChild(card);
      });
    }
    var body=document.getElementById('index-body');
    if(body){
      data.index.forEach(function(r){
        var tr=document.createElement('tr');
        var tdN=el('td','t-muted', String(r.n));
        if(r.featured) tdN.innerHTML = '<span style="color:#C9A66B">★</span> '+r.n;
        tr.appendChild(tdN);
        tr.appendChild(el('td','t-title', r.title));
        tr.appendChild(el('td',null,r.client));
        tr.appendChild(el('td',null,r.year));
        tr.appendChild(el('td',null,r.duration));
        tr.appendChild(el('td','t-muted',r.type));
        tr.appendChild(el('td','t-muted',r.tech));
        body.appendChild(tr);
      });
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', render);
  } else { render(); }
})();
