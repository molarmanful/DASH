#!/usr/bin/env node

fs=require('fs')
fg=require('flags')
peg=require('pegjs')
_=require('lodash')
d=require('decimal.js')
tr=require('traverse')
P=require('path')
prompt=require('prompt-sync')()
d.config({
  toExpNeg:-9e15,
  toExpPos:9e15
})
fg.defineBoolean('expr',true)
fg.defineString('f')
fg.parse()
lex=fs.readFileSync(P.join(__dirname,'dash.pegjs'))+''
code=fs.readFileSync(fg.get('f'))+''
parser=peg.generate(lex)
ps=parser.parse(code)
get=(x,y)=>x[d.mod(d(y).cmp(-1)?y:d.add(x.length,y),x.length)]
tru=x=>x.type=='bool'?x:{type:'bool',body:+!!(x.body&&x.body!=='0'&&x.body.length)}
form=x=>
  x.type=='num'||x.type=='fn'?
    x.body
  :x.type=='str'?
    `"${x.body.replace(/"/g,'\\"')}"`
  :x.type=='bool'?
    x.body?'T':'F'
  :x.type=='ls'?
    `[${x.body.map(a=>form(a)).join` `}]`
  :x.type=='def'?
    `@`+form(x.body)
  :x.map?
    `(${x.map(a=>form(a)).join` `})`
  :x.type=='pt'?
    x.body+form(x.f)
  :x.type=='a'||x.type=='ref'?
    '#'+x.body
  :x.type=='app'?
    form(x.body)+' '+form(x.f)
  :x.type=='var'?
    form(x.body)+'\\'+form(x.f)
  :error('failed to format')
sform=x=>
  x.type=='num'||x.type=='fn'||x.type=='str'?
    x.body
  :x.type=='bool'?
    x.body?'T':'F'
  :x.type=='ls'?
    x.body.map(a=>sform(a)).join` `
  :x.type=='def'?
    `@(expr)`
  :x.map?
    `(expr)`
  :x.type=='a'?
    '#'+x.body
  :error('failed to format')

cm={
  os:x=>(console.log(form(x)),x),
  ol:x=>(console.log(sform(x)),x),
  wf:(x,y)=>(fs.writeFileSync(x.body,sform(y)),y),
  rl:x=>(i=prompt('',0),i?{type:'str',body:i}:{type:'bool',body:0}),
  rf:x=>({type:'str',body:fs.readFileSync(x.body)+''}),
  E:x=>(d.config({precision:0|x.body}),x),
  abs:x=>({type:'num',body:''+d.abs(x.body)}),
  acos:x=>({type:'num',body:''+d.acos(x.body)}),
  acosh:x=>({type:'num',body:''+d.acosh(x.body)}),
  add:(x,y)=>({type:'num',body:''+d.add(x.body,y.body)}),
  asin:x=>({type:'num',body:''+d.asin(x.body)}),
  asinh:x=>({type:'num',body:''+d.asinh(x.body)}),
  atan:x=>({type:'num',body:''+d.atan(x.body)}),
  atanh:x=>({type:'num',body:''+d.atanh(x.body)}),
  atant:(x,y)=>({type:'num',body:''+d.atan2(x.body,y.body)}),
  ceil:x=>({type:'num',body:''+d.ceil(x.body)}),
  cos:x=>({type:'num',body:''+d.cos(x.body)}),
  cosh:(x,y)=>({type:'num',body:''+d.cosh(x.body)}),
  div:(x,y)=>({type:'num',body:''+d.div(x.body,y.body)}),
  exp:x=>({type:'num',body:''+d.exp(x.body)}),
  floor:x=>({type:'num',body:''+d.floor(x.body)}),
  hypot:(x,y)=>({type:'num',body:''+d.hypot(x.body,y.body)}),
  ln:x=>({type:'num',body:''+d.ln(x.body)}),
  lt:x=>({type:'num',body:''+d.log10(x.body)}),
  log:(x,y)=>({type:'num',body:''+d.log(x.body,y.body)}),
  max:x=>({type:'num',body:''+d.max(...x.body)}),
  min:x=>({type:'num',body:''+d.min(...x.body)}),
  mod:(x,y)=>({type:'num',body:''+d.mod(x.body,y.body)}),
  mul:(x,y)=>({type:'num',body:''+d.mul(x.body,y.body)}),
  pow:(x,y)=>({type:'num',body:''+d.pow(x.body,y.body)}),
  round:x=>({type:'num',body:''+d.round(x.body)}),
  sign:x=>({type:'num',body:''+d.sign(x.body)}),
  sin:x=>({type:'num',body:''+d.sin(x.body)}),
  sinh:x=>({type:'num',body:''+d.sinh(x.body)}),
  sub:(x,y)=>({type:'num',body:''+d.sub(x.body,y.body)}),
  tan:x=>({type:'num',body:''+d.tan(x.body)}),
  tanh:x=>({type:'num',body:''+d.tanh(x.body)}),
  trunc:x=>({type:'num',body:''+d.trunc(x.body)}),
  cmp:(x,y)=>({type:'bool',body:d(x.body).cmp(y.body)}),
  eq:(x,y)=>({type:'bool',body:d(x.body).cmp(y.body)===0}),
  gt:(x,y)=>({type:'bool',body:d(x.body).cmp(y.body)===1}),
  lt:(x,y)=>({type:'bool',body:d(x.body).cmp(y.body)===-1}),
  lteq:(x,y)=>({type:'bool',body:d(x.body).lte(y.body)}),
  gteq:(x,y)=>({type:'bool',body:d(x.body).gte(y.body)}),
  neg:x=>({type:'num',body:''+d(x.body).neg()}),
  map:(x,y)=>({type:'ls',body:_.map(y.body,a=>({type:'app',body:x,f:a.big?{type:'str',body:a}:a}))}),
  len:x=>({type:'num',body:x.body.length}),
  get:(x,y)=>y.type=='ls'?{type:'ls',body:y.body.map(a=>get(x.body,a.body))}:x.body.big?{type:'str',body:get(x.body,y.body)}:get(x.body,y.body),
  join:(x,y)=>({type:'str',body:Array.from(x.body).map(a=>a.body).join(y.body)}),
  split:(x,y)=>({type:'ls',body:x.body.split(y.body).map(a=>({type:'str',body:a}))}),
  tc:x=>({type:'ls',body:Array.from(x.body).map(a=>({type:'num',body:''+a.codePointAt()}))}),
  fc:x=>({type:'str',body:x.type=='ls'?x.body.map(a=>String.fromCodePoint(0|a.body)).join``:String.fromCodePoint(0|x.body)}),
  if:(x,y)=>I({type:'app',body:y.body[+!tru(x).body],f:{type:'bool',body:tru(x).body}}),
  bool:tru,
  not:x=>({type:'bool',body:+!tru(x).body}),
  num:x=>({type:'num',body:''+d(x.body.replace(/_/g,'-'))}),
  rnd:x=>({type:'num',body:''+d.random(x&&x.body&&0|x.body?0|x.body:[]._)}),
  con:(x,y)=>x.type!='ls'&&y.type!='ls'?{type:'str',body:form(x)+form(y)}:{type:'ls',body:_.concat(x.type=='ls'?x.body:x,y.type=='ls'?y.body:y)},
  rev:x=>x.body.big?{type:'str',body:[...x.body].reverse().join``}:{type:'ls',body:x.body.reverse()},
  rng:(x,y)=>({type:'ls',body:_['range'+(0|x.body>0|y.body?'':'Right')](0|x.body,0|y.body).map(a=>({type:'num',body:a}))}),
  str:x=>({type:'str',body:sform(x)}),
  src:x=>({type:'str',body:form(x)}),
  eval:x=>I(parser.parse(x.body)),
  app:(x,y)=>I({type:'app',body:x,f:y})
}
cm['||']=cm.abs
cm['+']=cm.add
cm["|'"]=cm.ceil
cm['/']=cm.div
cm['|_']=cm.floor
cm['%']=cm.mod
cm['*']=cm.mul
cm['^']=cm.pow
cm['|:']=cm.round
cm['+-']=cm.sign
cm['-']=cm.sub
cm['|-']=cm.trunc
cm['=']=cm.eq
cm['>']=cm.gt
cm['<']=cm.lt
cm['<=']=cm.lteq
cm['>=']=cm.gteq
cm['_']=cm.neg
cm['->']=cm.map
cm['__']=cm.len
cm[':']=cm.get
cm['><']=cm.join
cm['<>']=cm.split
cm['e^']=cm.exp
cm['?']=cm.if
cm['!']=cm.not
cm[',!']=cm.bool
cm[',$']=cm.num
cm[",'"]=cm.str
cm[',,']=cm.src
cm['&']=cm.con
cm['|']=cm.eval
cm[',']=cm.app

vs={}

error=e=>{
  console.log('ERROR: '+e)
  process.exit(1)
}

ua=(x,y)=>tr(x).map(function(a){
  a.type=='a'&&this.update(a.body?{type:'a',body:--a.body}:y)
})
I=x=>
  x.map?
    (X=x.map(a=>I(a)))[X.length-1]
  :x.type=='ls'?
    {type:'ls',body:x.body.map(a=>I(a))}
  :x.type=='var'?
    (vs[x.body.body]=x.f)
  :x.type=='ref'?
    I(vs[x.body])
  :x.type=='fn'&&vs[x.body]?
    I(vs[x.body])
  :x.type=='app'?
    (z=I(x.body)).type=='fn'?
      cm[z.body].length>1?
        {type:'pt',body:z.body,f:I(x.f)}
      :cm[z.body](I(x.f))
    :z.type=='def'?
      I(ua(z,x.f)).body
    :z.type=='pt'?
      cm[I(z).body](z.f,I(x.f))
    :x
  :x

//In=x=>tr(x).nodes().some(a=>a.type=='app'||a.type=='var'||(a.type=='fn'&&vs[a.body])||a.type=='ref')
exec=x=>_.isEqual(X=I(x),x)?X:exec(X)

fg.get('expr')?console.log(form(exec(ps))):exec(ps)
