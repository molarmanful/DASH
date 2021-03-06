#!/usr/bin/env node

const fs=require('fs'),
fg=require('flags'),
peg=require('pegjs'),
_=require('lodash'),
l=require('lazy.js'),
d=require('decimal.js'),
tr=require('traverse'),
P=require('path'),
slp=require('sleep'),
prompt=require('prompt-sync')({sigint:true}),
Exec=require('child_process').execSync,
key=require('keypress'),
XRE=require('xregexp')
d.config({
  toExpNeg:-9e15,
  toExpPos:9e15,
  crypto:true,
  modulo:d.EUCLID
})
fg.defineBoolean('expr',true)
fg.defineString('f')
fg.defineNumber('tk',10)
fg.parse()

const lex=fs.readFileSync(__dirname+'/dash.pegjs')+'',
parser=peg.generate(lex),

lng=(x,y=0)=>y<Number.MAX_VALUE?l(x).first()!=[]._?lng(l(x).rest(),y+1)+1:0:1/0,
len=x=>{
  try{
    return x.body.length()
  }
  catch(e){
    return lng(x.body)
  }
},

tru=x=>(
  {
    type:'bool',
    body:
      !x?
        0
      :x.type=='num'?
        +(x.body!=0)
      :x.type=='str'||x.type=='ls'?
        +!!len(x)
      :x.type=='bool'?
        x.body
      :1
  }
),

str=x=>({type:'str',body:l(x)}),
num=x=>({type:'num',body:l(isNaN(+x)?x.charAt?l(x).map(a=>a.codePointAt()).sum():len(ls(x)):(''+d(''+x)).replace(/_/g,'-').replace(/oo/g,'Infinity'))}),
ls=x=>({type:'ls',body:l(x)}),
obj=x=>({type:'obj',body:l(x)})
vr=(x,y)=>({type:'var',body:x,f:y}),
app=(x,y)=>({type:'app',body:x,f:y}),
pt=(x,y,z)=>({type:'pt',body:x,f:y,rev:z})
def=x=>({type:'def',body:x}),
fn=x=>({type:'fn',body:x}),
a=x=>({type:'a',body:0|x}),
rgx=x=>x.type=='rgx'?x.body:XRE(x.body),

form=x=>
  x.type=='num'?
    `\x1b[33m${(''+x.body).replace(/Infinity/g,'oo').replace(/-/g,'_')}\x1b[0m`
  :x.type=='fn'?
    `\x1b[34m${x.body}\x1b[0m`
  :x.type=='str'?
    `\x1b[32m"${(''+x.body).replace(/"/g,'\\"').replace(/\x1b\[.+?m/g,'')}"\x1b[0m`
  :x.type=='bool'?
    `\x1b[36m${x.body?'T':'F'}\x1b[0m`
  :x.type=='ls'?
    `[${isFinite(len(x))?x.body.map(I).map(form).value().join`;`:x.body.take(fg.get('tk')).map(I).map(form).join(';')+';...'}]`
  :x.type=='obj'?
    `{${l(x.body).map((a,b)=>'\x1b[32m"'+b+'"\x1b[0m\\'+form(a)).value().join`;`}}`
  :x.type=='def'?
    `\x1b[92m@${form(x.body)}\x1b[0m`
  :x.map?
    `(${x.map(form).join`;`})`
  :x.type=='pt'?
    `\x1b[34m${x.body}\x1b[0m `+form(x.f)
  :x.type=='a'||x.type=='ref'?
    `\x1b[34m#${x.body}\x1b[0m`
  :x.type=='app'?
    form(x.body)+' '+form(x.f)
  :x.type=='var'?
    form(x.body)+'\\'+form(x.f)
  :x.type=='cond'?
    `[${form(x.body)}?${form(x.f)}?${form(x.g)}]`
  :x.type=='rgx'?
    `\x1b[37mR"${x.body.source}""${x.body.flags}"\x1b[0m`
  :x.type=='ev'?
    `{${x.body.map(form).join`;`}}${form(x.f)}\\${form(x.g)}`
  :error('failed to format JSON\n'+JSON.stringify(x),1),
sform=x=>
  x.type=='num'?
    (''+x.body).replace(/Infinity/g,'oo').replace(/-/g,'_')
  :x.type=='fn'||x.type=='str'||x.type=='a'||x.type=='ref'?
    ''+x.body
  :x.type=='bool'?
    x.body?'T':'F'
  :x.type=='ls'?
    `[ls ${isFinite(len(x))?len(x):'oo'}]`
  :x.type=='obj'?
    `{obj ${x.body.keys().size()}}`
  :x.type=='def'?
    `@(expr)`
  :x.map?
    `(expr)`
  :x.type=='app'?
    sform(x.body)+' '+sform(x.f)
  :x.type=='pt'?
    x.body+' '+sform(x.f)
  :x.type=='cond'?
    '[cond]'
  :x.type=='rgx'?
    '[rgx]'
  :x.type=='ev'?
    `{ev ${sform(x.f)} ${sform(x.g)}}`
  :error('failed to format JSON\n'+JSON.stringify(x),1),

pkg=x=>{
  try{
    f=fs.readFileSync((`dpm/${x}/`+fs.readFileSync(`dpm/${x}/pkg`)).replace(/\s/g,''))+''
  }
  catch(e){
    error(`failed to read package "${x}"\n`,1)
  }
  return exec(parser.parse(f))
},

cm={
  os:x=>(process.stdout.write(form(x).replace(/\x1b\[\d+m/g,'')),x),
  ol:x=>(process.stdout.write(sform(x)),x),
  oN:x=>(process.stdout.write(sform(x)+'\n'),x),
  wf:(x,y)=>(fs.writeFileSync(''+x.body,sform(y)),y),
  rl:x=>(i=prompt('',0),i?str(i):tru(0)),
  rf:x=>str(fs.readFileSync(x.body+'')+''),
  E:x=>(d.config({precision:0|x.body}),x),
  abs:x=>num(d.abs(''+num(x.body).body)),
  acos:x=>num(d.acos(''+num(x.body).body)),
  acosh:x=>num(d.acosh(''+num(x.body).body)),
  add:(x,y)=>num(d.add(''+num(x.body).body,''+num(y.body).body)),
  asin:x=>num(d.asin(''+num(x.body).body)),
  asinh:x=>num(d.asinh(''+num(x.body).body)),
  atan:x=>num(d.atan(''+num(x.body).body)),
  atanh:x=>num(d.atanh(''+num(x.body).body)),
  atant:(x,y)=>num(d.atan2(''+num(x.body).body,''+num(y.body).body)),
  ceil:x=>num(d.ceil(''+num(x.body).body)),
  cos:x=>num(d.cos(''+num(x.body).body)),
  cosh:(x,y)=>num(d.cosh(''+num(x.body).body)),
  div:(x,y)=>num(d.div(''+num(x.body).body,''+num(y.body).body)),
  exp:x=>num(d.exp(''+num(x.body).body)),
  flr:x=>num(d.floor(''+num(x.body).body)),
  hypot:(x,y)=>num(d.hypot(''+num(x.body).body,''+num(y.body).body)),
  ln:x=>num(d.ln(''+num(x.body).body)),
  lt:x=>num(d.log10(''+num(x.body).body)),
  log:(x,y)=>num(d.log(''+num(x.body).body,''+num(y.body).body)),
  max:x=>num(d.max(...x.body.map(a=>''+num(a.body).body).value())),
  min:x=>num(d.min(...x.body.map(a=>''+num(a.body).body).value())),
  mod:(x,y)=>num(d.mod(''+num(x.body).body,''+num(y.body).body)),
  mul:(x,y)=>num(d.mul(''+num(x.body).body,''+num(y.body).body)),
  pow:(x,y)=>+x.body<0?tru(0):num(d.pow(''+num(x.body).body,''+num(y.body).body)),
  round:x=>num(d.round(''+num(x.body).body)),
  sign:x=>num(d.sign(''+num(x.body).body)),
  sin:x=>num(d.sin(''+num(x.body).body)),
  sinh:x=>num(d.sinh(''+num(x.body).body)),
  sub:(x,y)=>num(d.sub(''+num(x.body).body,''+num(y.body).body)),
  tan:x=>num(d.tan(''+num(x.body).body)),
  tanh:x=>num(d.tanh(''+num(x.body).body)),
  trunc:x=>num(d.trunc(''+num(x.body).body)),
  cmp:(x,y)=>tru(d(''+num(x.body).body).cmp(''+num(y.body).body)),
  eq:(x,y)=>tru(
    form(x)==form(y)
    ||(x.body.charAt&&y.body.charAt&&''+num(x.body).body==''+num(y.body).body)
    ||(x.type=='obj'&&y.type=='obj'&&x.body.length==y.body.length&&(
        x.body.every((a,b)=>cm.eq(a,y.body.get(b)).body)
      ))
    ||(x.type=='ls'&&y.type=='ls'&&x.body.every((a,b)=>
        cm.eq(x.body.charAt?str(a):a,y.body.charAt?str(y.body.get(b)):y.body.get(b)).body
      ))
  ),
  gt:(x,y)=>tru(+d(''+num(x.body).body).cmp(''+num(y.body).body)==1),
  lt:(x,y)=>tru(+d(''+num(x.body).body).cmp(''+num(y.body).body)==-1),
  lteq:(x,y)=>tru(+d(''+num(x.body).body).lte(''+num(y.body).body)),
  gteq:(x,y)=>tru(+d(''+num(x.body).body).gte(''+num(y.body).body)),
  neg:x=>num(d(x.body).neg()),
  map:(x,y)=>ls(y.body.map(a=>y.body.charAt?str(a):a).map(a=>I(app(x,a)))),
  fold:(x,y)=>y.body.map(a=>y.body.charAt?str(a):a).reduce((a,b)=>I(app(app(x.body.get(0),b),a)),x.body.get(1)),
  foldr:(x,y)=>y.body.map(a=>y.body.charAt?str(a):a).reduceRight((a,b)=>I(app(app(x.body.get(0),b),a)),x.body.get(1)),
  tkwl:(x,y)=>ls(y.body.map(a=>y.body.charAt?str(a):a).takeWhile(a=>tru(I(app(x,a))).body)),
  drwl:(x,y)=>ls(y.body.map(a=>y.body.charAt?str(a):a).takeWhile(a=>tru(I(app(x,a))).body)),
  fltr:(x,y)=>ls(y.body.map(a=>y.body.charAt?str(a):a).filter(a=>tru(I(app(x,a))).body)),
  find:(x,y)=>y.body.map(a=>y.body.charAt?str(a):a).find(a=>tru(I(app(x,a))).body),
  every:(x,y)=>tru(y.body.map(a=>y.body.charAt?str(a):a).every(a=>tru(I(app(x,a))).body)),
  some:(x,y)=>tru(y.body.map(a=>y.body.charAt?str(a):a).some(a=>tru(I(app(x,a))).body)),
  len:x=>num(len(x)),
  get:(x,y)=>y.type=='obj'?l(y.body).get(''+x.body):y.body.map(a=>a.charAt?str(a):a).get(0|d.mod(0|x.body,len(y))),
  set:(x,y)=>
    y.type=='obj'?
      (X={},X[x.body.get(0).body]=x.body.get(1),obj(y.body.assign(X)))
    :ls(y.body.map(a=>y.type=='str'?str(a):a).map((a,b)=>b==''+d.mod(''+x.body.get(0).body,len(y))?x.body.get(1):a)),
  ins:(x,y)=>(
    Y=y.body.map(a=>y.type=='str'?str(a):a),
    ls(Y.first(d.mod(''+x.body.get(0).body,len(y))).concat(x.body.get(1),Y.last(len(y)-d.mod(''+x.body.get(0).body,len(y)))))
  ),
  join:(x,y)=>str(y.body.map(sform).join(sform(x))),
  split:(x,y)=>ls(XRE.split(''+y.body,rgx(x)).map(str)),
  tc:x=>ls(x.body.map(a=>num(a.codePointAt()))),
  fc:x=>str(x.type=='ls'?x.body.map(a=>String.fromCodePoint(0|a.body)).join(''):String.fromCodePoint(0|x.body)),
  bool:tru,
  num:x=>num(x.body),
  rnd:x=>num(0|x.body?d.random(0|x.body):''+0|d.random()*2),
  con:(x,y)=>x.type!='ls'?str(sform(x)+sform(y)):ls(x.body.concat(y.type!='ls'?y:y.body)),
  cat:(x,y)=>x.type!='ls'?str(sform(x)+sform(y)):ls(x.body.concat(y)),
  rev:x=>ls(x.body.reverse().map(a=>a.type||str(a))),
  rng:(x,y)=>([X,Y]=[+x.body,+y.body],ls(l.generate(a=>num(d.add(a,''+num(x.body).body)),Y-X))),
  str:x=>str(sform(x)),
  src:x=>str(form(x).replace(/\x1b\[\d+m/g,'')),
  eval:x=>parser.parse(''+x.body),
  S:(x,y)=>I(app(x,y)),
  sleep:x=>(slp.usleep(0|x.body),x),
  tt:x=>(x.rev=1,x),
  sort:(x,y)=>ls(y.body.map(a=>a.charAt?str(a):a).sortBy(a=>num(I(app(x,a)).body).body)),
  shuf:x=>ls((x.body.charAt?x.body.map(str):x.body).shuffle()),
  type:x=>str(x.type),
  sum:x=>num(x.body.reduce((a,b)=>d.add(a,''+num(b.body).body),0)),
  prod:x=>num(x.body.reduce((a,b)=>d.mul(a,''+num(b.body).body),1)),
  chunk:(x,y)=>ls(y.body.charAt?y.body.chunk(0|x.body).map(a=>str(a.join``)):y.body.chunk(0|x.body).map(ls)),
  K:(x,y)=>x,
  I:x=>x,
  and:(x,y)=>tru(tru(x).body&&tru(y).body),
  or:(x,y)=>tru(tru(x).body||tru(y).body),
  xor:(x,y)=>tru(+(tru(x).body!=tru(y).body)),
  not:x=>tru(+!tru(x).body),
  mstr:(x,y)=>obj(l(Object.assign({},XRE.match(''+y.body,rgx(x))||[])).map((a,b)=>[b,str(a)]).toObject()),
  xstr:(x,y)=>obj(l(Object.assign({},XRE.exec(''+y.body,rgx(x))||[])).map((a,b)=>[b,(a.toFixed?num:str)(a)]).toObject()),
  sstr:(x,y)=>num((XRE.exec(''+y.body,rgx(x))||[]).index||-1),
  rstr:(x,y)=>str(
    XRE.replace(
      y.body+'',
      rgx(x.body.get(0)),
      (x.body.get(1)||str('')).body.charAt&&(x.body.get(1)||str('')).type!='fn'&&(x.body.get(1)||str('')).type!='pt'?
        ''+(x.body.get(1)||str('')).body
      :(a,...b)=>sform(I(app(x.body.get(1),I([str(a)].concat(b.slice(0,-2).map(i=>str(i||'')))))))
    )
  ),
  R:(x,y)=>({type:'rgx',body:XRE(''+x.body,''+y.body)}),
  var:(x,y)=>vs[x.body]?vs[x.body]:(vs[x.body]=y),
  tk:(x,y)=>ls(y.body.take(0|x.body).map(a=>a.charAt?str(a):a)),
  dp:(x,y)=>ls(y.body.drop(0|x.body).map(a=>a.charAt?str(a):a)),
  gen:x=>ls(l.generate(a=>app(x,num(a)),1/0)),
  genc:(x,y)=>ls(l.generate(a=>y=a?app(x,y):y,1/0)),
  rpt:x=>ls(l.repeat(x,1/0)),
  inx:(x,y)=>ls(x.body.intersection(y.body).map(a=>a.charAt?str(a):a)),
  uni:(x,y)=>ls(x.body.union(y.body).map(a=>a.charAt?str(a):a)),
  unq:x=>ls(x.body.uniq().map(a=>a.charAt?str(a):a)),
  dff:(x,y)=>ls(x.body.difference(y.body).map(a=>a.charAt?str(a):a)),
  exit:x=>{process.exit()},
  sh:x=>str(Exec(''+x.body)+''),
  while:(x,y)=>([X,Y]=[x.body.get(0),x.body.get(1)],tru(I(app(X,y))).body?cm.while(x,I(app(Y,y))):y),
  cns:(x,y)=>ls(y.body.consecutive(0|x.body).map(ls).rest(0|x.body-1)),
  tsp:x=>ls(x.body.first().body.map((a,i)=>ls(x.body.map(b=>b.body.get(i)).map(b=>b?b.charAt?str(b):b:tru(0))))),
  pkg:x=>pkg(''+x.body),
  ind:x=>cm.tsp(I(ls(x.type=='obj'?[ls(x.body.keys().map(a=>str(''+a))),ls(x.body.values())]:[cm.rng(num(0),num(len(x))),x]))),
  cyc:x=>ls(l.generate(a=>cm.get(num(a),x),1/0)),
  lc:x=>num((''+x.body).toLowerCase()),
  uc:x=>num((''+x.body).toUpperCase()),
  hx:x=>str(d(x.body).toHexadecimal()),
  bn:x=>str(d(x.body).toBinary()),
  ot:x=>str(d(x.body).toOctal()),
  key:x=>cm.tsp(cm.ind(x)).body.first(),
  val:x=>cm.tsp(cm.ind(x)).body.last(),
  pk:(x,y)=>obj(y.body.pick(x.body.map(a=>a.body).value())),
  om:(x,y)=>obj(y.body.omit(x.body.map(a=>a.body).value())),
  js:x=>(eval(''+x.body),x),
  ss:(x,y)=>x.body.reduceRight((a,b)=>I(app(b,a)),y),
  sS:(x,y)=>y.body.reduce((a,b)=>I(app(a,b)),x),
  zip:(x,y)=>cm.map(I(app(fn('sS'),x)),cm.tsp(y)),
  flat:x=>ls(x.body.map(a=>x.body.charAt?str(a):a.type=='ls'?a.body:a).flatten()),
  obj:x=>obj(x.body.map(a=>[sform(a.body.first()),(A=a.body.get(1)).charAt?str(A):A]).toObject()),
  obl:x=>cm.obj(cm.tsp(ls([cm.key(x),x])))
};

[
  ['+','add'],
  ['|^','ceil'],
  ['/','div'],
  ['e^','exp'],
  ['|_','flr'],
  ['%','mod'],
  ['*','mul'],
  ['^','pow'],
  ['|=','round'],
  ['+-','sign'],
  ['-','sub'],
  ['|-','trunc'],
  ['=','eq'],
  ['>','gt'],
  ['<','lt'],
  ['>=','gteq'],
  ['<=','lteq'],
  ['_','neg'],
  ['->','map'],
  ['+>','fold'],
  ['<+','foldr'],
  ['_>','tkwl'],
  ['~>','drwl'],
  ['!>','fltr'],
  [':>','find'],
  ['*>','every'],
  ['/>','some'],
  [':','get'],
  [':=','set'],
  [':+','ins'],
  ['><','join'],
  ['<>','split'],
  ['++','con'],
  ['+_','cat'],
  ['$$','eval'],
  ['%%','sleep'],
  ['<|>','chunk'],
  ['&','and'],
  ['|','or'],
  ['$','xor'],
  ['!','not'],
  ["'",'tsp'],
  [',','ind']
].map(a=>cm[a[0]]=cm[a[1]])
//.map(x=>`\`${x[0]}\`|`+x[1]).join`\n`

const vs={
  pi:x=>num(d.acos(-1)),
  e:x=>num(d.exp(1)),
  phi:x=>num(d.div(d.add(1,d.sqrt(5)),2)),
  ep:x=>num('.'+'0'.repeat(d.precision)+1),
  cm:x=>ls(l(cm).map((a,b)=>fn(b)))
},

error=(e,f)=>{
  console.log('\x1b[31mERROR:\x1b[0m '+e)
  f&&process.exit()
},

ERR=e=>
  e.message.match`\\[DecimalError\\]`?
    e.message.match(`Invalid argument`)&&'invalid argument passed to '+(e.stack.match`cm\\.([^ \\n;0-9".[\\]\\(){}@#TF?]+) `||[,'number conversion'])[1]
  :e.message.match`Maximum call stack size exceeded`?
    'too much recursion'
  :e.stack.match`peg\\$buildStructuredError`?
    'failed to parse\n'+e.message
  :e.stack.match`Command failed`?
    `failed to execute "${e.stack.match`Command failed: (.+)`[1]}"`
  :e.stack.match`Backreference to undefined`?
    `backreference to ${e.stack.match`Backreference to undefined group (.+)`[1]} not found`
  :'js error -> '+e.stack,

ua=(x,y)=>(X=tr(x),X.map(function(a){
  a.type=='a'&&(
    a.body==(D=this.path.filter(($,i,j)=>(gX=X.get(j.slice(0,i+1)))&&gX.type=='def').length)?
      this.update(
        tr(y).map(function(b){
          b.type=='a'&&b.body>this.path.filter(($,i,j)=>(gX=X.get(j.slice(0,i+1)))&&gX.type=='def').length&&this.update(
            (b.body+=D,b)
          )
        })
      )
    :a.body>D?(a.body--,a):a
  )
})),

Ua=(x,y,z)=>tr(x).map(function(a){
  a.type=='ev'&&a.f.body==y.body?
    this.update(Ua(I(a),y,z))
  :(a.type=='fn'||a.type=='ref')&&a.body==y.body&&this.update(z)
}),

I=x=>
  !x||(x.type=='num'&&x.body=='NaN')||(x.pop&&!x.length)?
    tru(0)
  :x.type=='cond'?
    tru(I(x.body)).body?I(x.f):I(x.g)
  :x.type=='ev'?
    I(Ua(x.body,x.f,x.g))
  :x.map?
    (X=x.map(a=>I(a)))[X.length-1]
  :x.type=='ls'?
    ls(x.body)
  :x.type=='obj'?
    obj(x.body)
  :x.type=='str'?
    str(x.body)
  :x.type=='num'?
    num(x.body)
  :x.type=='var'?
    (vs[x.body.body]=I(x.f))
  :(x.type=='ref'||x.type=='fn')&&vs[x.body]?
    vs[x.body].call?
      vs[x.body]()
    :vs[x.body]
  :x.type=='app'?
    (z=I(x.body)).type=='fn'?
      cm[z.body]?
        cm[z.body].length>1?
          pt(z.body,I(x.f),z.rev)
        :I(cm[z.body](I(x.f)))
      :error(`undefined function "${z.body}"`,1)
    :z.type=='def'?
      I(ua(z,x.f).body)
    :z.type=='pt'?
      z.rev?cm[I(z).body](I(x.f),z.f):cm[I(z).body](z.f,I(x.f))
    :z.type=='ls'?
      ls(z.body.map(a=>I(app(a,x.f))))
    :z
  :x,

exec=x=>tr(x).map(function(a){
  if(a&&a.type=='def')this.block();
  else if(a&&(a.type=='app'||a.type=='var'||a.type=='cond'||a.type=='ev'))return 1
}).length?exec(I(x)):I(x)

if(require.main!=module){
  module.exports=this
}else if(F=fg.get('f')){
  try{
    const code=fs.readFileSync(F)+'',
    ps=parser.parse(code)
    ps&&ps.length&&(fg.get('expr')?console.log('\n'+form(exec(ps))):exec(ps))
    console.log('')
  }catch(e){
    error(ERR(e),1)
  }
}else{
  logo=fs.readFileSync(__dirname+'/dash.txt')+''
  pkg=fs.readFileSync(__dirname+'/package.json')+''
  console.log(`\x1b[36m\x1b[1m${logo.replace(/1/g,'\x1b[4m').replace(/0/g,'\x1b[24m')}\x1b[0m\n\n\x1b[93m\x1b[1mv${JSON.parse(pkg).version}\x1b[21m\n\x1b[2mMade with love by Ben Pang (molarmanful) under the MIT License.\x1b[0m\n\n`)
  key(process.stdin)
  ow=x=>(process.stdout.clearLine(),process.stdout.cursorTo(0),process.stdout.write(x))
  Prompt=require('prompt-sync')({
    history:require('prompt-sync-history')(),
    sigint:true
  })
  process.stdin.on('keypress',(x,y)=>{
    y&&ow(
      y.name=='up'?
        ow('DASH > '+(Prompt.history.prev()||''))
      :y.name=='down'?
        ow('DASH > '+(Prompt.history.next()||''))
      :0
    )
  })
  for(;;){
    p=Prompt('DASH > ')
    Prompt.history.save()
    try{
      console.log('\n'+form(exec(parser.parse(p))))
    }catch(e){
      error(ERR(e))
    }
  }
}