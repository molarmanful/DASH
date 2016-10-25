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
prompt=require('prompt-sync')()
d.config({
  toExpNeg:-9e15,
  toExpPos:9e15,
  crypto:true,
  modulo:d.EUCLID
})
fg.defineBoolean('expr',true)
fg.defineString('f')
fg.parse()

const lex=fs.readFileSync(P.join(__dirname,'dash.pegjs'))+'',

len=x=>
  x.body?
    len(x.body)
  :x instanceof l.Sequence?
    x.parent&&!x.count?
      len(x.parent)
    :x.count||x.length()
  :x instanceof l.GeneratedSequence?
    x.length()
  :x.length,

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

str=x=>({type:'str',body:x}),
num=x=>({type:'num',body:(''+d(''+(x.type=='ls'?len(x):x))).replace(/_/g,'-').replace(/oo/g,'Infinity')}),
ls=x=>({type:'ls',body:x}),
vr=(x,y)=>({type:'var',body:x,f:y}),
app=(x,y)=>({type:'app',body:x,f:y}),
pt=(x,y,z)=>({type:'pt',body:x,f:y,rev:z})
def=x=>({type:'def',body:x}),
fn=x=>({type:'fn',body:x}),
a=x=>({type:'a',body:0|x}),
rgx=x=>x.type=='rgx'?x.body:''+x.body,

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
    `[${isFinite(len(x))?x.body.map(a=>form(I(a))).join(';'):x.body.take(3).map(a=>form(I(a))).join(';')+';...'}]`
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
  :error('failed to format JSON\n'+JSON.stringify(x)),
sform=x=>
  x.type=='num'?
    (''+x.body).replace(/Infinity/g,'oo').replace(/-/g,'_')
  :x.type=='fn'||x.type=='str'||x.type=='a'||x.type=='ref'?
    ''+x.body
  :x.type=='bool'?
    x.body?'T':'F'
  :x.type=='ls'?
    `[ls ${isFinite(len(x))?len(x):'oo'}]`
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
  :error('failed to format JSON\n'+JSON.stringify(x)),

cm={
  os:x=>(console.log(form(x)),x),
  ol:x=>(console.log(sform(x)),x),
  wf:(x,y)=>(fs.writeFileSync(''+x.body,sform(y)),y),
  rl:x=>(i=prompt('',0),i?str(i):bool(0)),
  rf:x=>str(fs.readFileSync(x.body)+''),
  E:x=>(d.config({precision:0|x.body}),x),
  abs:x=>num(d.abs(''+x.body)),
  acos:x=>num(d.acos(''+x.body)),
  acosh:x=>num(d.acosh(''+x.body)),
  add:(x,y)=>num(d.add(''+x.body,''+y.body)),
  asin:x=>num(d.asin(''+x.body)),
  asinh:x=>num(d.asinh(''+x.body)),
  atan:x=>num(d.atan(''+x.body)),
  atanh:x=>num(d.atanh(''+x.body)),
  atant:(x,y)=>num(d.atan2(''+x.body,''+y.body)),
  ceil:x=>num(d.ceil(''+x.body)),
  cos:x=>num(d.cos(''+x.body)),
  cosh:(x,y)=>num(d.cosh(''+x.body)),
  div:(x,y)=>num(d.div(''+x.body,''+y.body)),
  exp:x=>num(d.exp(''+x.body)),
  flr:x=>num(d.floor(''+x.body)),
  hypot:(x,y)=>num(d.hypot(''+x.body,''+y.body)),
  ln:x=>num(d.ln(''+x.body)),
  lt:x=>num(d.log10(''+x.body)),
  log:(x,y)=>num(d.log(''+x.body,''+y.body)),
  max:x=>num(x.body.max(a=>num(a.body).body)),
  min:x=>num(d.min(...x.body.value())),
  mod:(x,y)=>num(d.mod(''+x.body,''+y.body)),
  mul:(x,y)=>num(d.mul(''+x.body,''+y.body)),
  pow:(x,y)=>num(d.pow(''+x.body,''+y.body)),
  round:x=>num(d.round(''+x.body)),
  sign:x=>num(d.sign(''+x.body)),
  sin:x=>num(d.sin(''+x.body)),
  sinh:x=>num(d.sinh(''+x.body)),
  sub:(x,y)=>num(d.sub(''+x.body,''+y.body)),
  tan:x=>num(d.tan(''+x.body)),
  tanh:x=>num(d.tanh(''+x.body)),
  trunc:x=>num(d.trunc(''+x.body)),
  cmp:(x,y)=>tru(+d(''+x.body).cmp(''+y.body)),
  eq:(x,y)=>tru(+(''+x.body==''+y.body)),
  eqs:(x,y)=>tru(+(''+x.body==''+y.body&&x.type==y.type)),
  gt:(x,y)=>tru(+d(''+x.body).cmp(''+y.body)==1),
  lt:(x,y)=>tru(+d(''+x.body).cmp(''+y.body)==-1),
  lteq:(x,y)=>tru(+d(''+x.body).lte(''+y.body)),
  gteq:(x,y)=>tru(+d(''+x.body).gte(''+y.body)),
  neg:x=>num(d(x.body).neg()),
  map:(x,y)=>ls(y.body.map(a=>y.type=='str'?str(a):a).map(a=>I(app(x,a)))),
  fold:(x,y)=>y.body.reduce((a,b)=>I(app(app(x.body.get(0),b),a)),x.body.get(1)),
  foldr:(x,y)=>y.body.reduceRight((a,b)=>I(app(app(x.body.get(0),b),a)),x.body.get(1)),
  tkwl:(x,y)=>ls(y.body.map(a=>y.type=='str'?str(a):a).takeWhile(a=>tru(I(app(x,a))).body)),
  fltr:(x,y)=>ls(y.body.map(a=>y.type=='str'?str(a):a).filter(a=>tru(I(app(x,a))).body)),
  find:(x,y)=>y.body.map(a=>y.type=='str'?str(a):a).find(a=>tru(I(app(x,a))).body),
  len:x=>num(len(x)),
  get:(x,y)=>y.body.get(d.mod(''+x.body,len(x))),
  join:(x,y)=>str(y.body.map(sform).join(''+x.body)),
  split:(x,y)=>ls((''+y.body).split(rgx(x)).map(str)),
  tc:x=>ls(x.body.map(a=>num(a.codePointAt()))),
  fc:x=>str(x.type=='ls'?x.body.map(a=>String.fromCodePoint(0|a.body)).join(''):String.fromCodePoint(0|x.body)),
  bool:tru,
  num:x=>num(x.body),
  rnd:x=>num(0|x.body?d.random(0|x.body):''+0|d.random()*2),
  con:(x,y)=>x.type!='ls'&&y.type!='ls'?str(form(x)+form(y)):ls(x.concat(y.body)),
  rev:x=>ls(x.body.reverse().map(a=>a.type||str(a))),
  rng:(x,y)=>([X,Y]=[+x.body,+y.body],ls(l.generate(a=>num(d.add(a,''+x.body)),Y-X))),
  str:x=>str(sform(x)),
  src:x=>str(form(x)),
  eval:x=>exec(parser.parse(x.body)),
  S:(x,y)=>I(app(x,y)),
  sleep:x=>(slp.usleep(0|x.body),x),
  tt:x=>(x.rev=1,x),
  sort:x=>ls(x.body.map(a=>a.charAt?str(a):a).sortBy(a=>a.body)),
  shuf:x=>ls((x.body.charAt?x.body.map(str):x.body).shuffle()),
  type:x=>str(x.type),
  sum:x=>num(x.body.reduce((a,b)=>d.add(a,''+b.body),0)),
  prod:x=>num(x.body.reduce((a,b)=>d.mul(a,''+b.body),1)),
  chunk:(x,y)=>ls(x.body.charAt?x.body.chunk(0|y.body).map(a=>str(a.join``)):x.body.chunk(0|y.body).map(ls)),
  K:(x,y)=>x,
  I:x=>x,
  and:(x,y)=>tru(tru(x).body&&tru(y).body),
  or:(x,y)=>tru(tru(x).body||tru(y).body),
  xor:(x,y)=>tru(+(tru(x).body!=tru(y).body)),
  not:x=>tru(+!tru(x).body),
  mstr:(x,y)=>ls((y.body.match(rgx(x))||[]).map(str)),
  xstr:(x,y)=>ls((rgx(x).exec(''+y.body)||[]).map(str)),
  rstr:(x,y)=>str((y.body+'').replace(rgx(x.body.get(0)),(a,...b)=>sform(I(app(x.body.get(1),I([a].concat(b.slice(0,-2)).map(i=>str(i||'')))))))),
  R:(x,y)=>({type:'rgx',body:RegExp(''+x.body,''+y.body)}),
  var:(x,y)=>vs[x.body]?vs[x.body]:(vs[x.body]=y),
  tk:(x,y)=>ls(y.body.take(0|x.body).map(a=>a.charAt?str(a):a)),
  tkr:(x,y)=>ls(y.body.takeRight(0|x.body).map(a=>a.charAt?str(a):a)),
  gen:x=>ls(l.generate(a=>app(x,num(''+a)),1/0)),
  inx:(x,y)=>ls(x.body.intersection(y.body).map(a=>a.charAt?str(a):a)),
  uni:(x,y)=>ls(x.body.union(y.body).map(a=>a.charAt?str(a):a)),
  unq:x=>ls(x.body.uniq().map(a=>a.charAt?str(a):a)),
  dff:x=>ls(x.body.difference().map(a=>a.charAt?str(a):a))
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
  ['==','eqs'],
  ['>','gt'],
  ['<','lt'],
  ['>=','gteq'],
  ['<=','lteq'],
  ['_','neg'],
  ['->','map'],
  ['+>','fold'],
  ['<+','foldr'],
  ['_>','tkwl'],
  ['!>','fltr'],
  [':>','find'],
  [':','get'],
  ['><','join'],
  ['<>','split'],
  ['++','con'],
  ['$$','eval'],
  ['%%','sleep'],
  ['<|>','chunk'],
  ['&','and'],
  ['|','or'],
  ['$','xor'],
  ['!','not']
].map(a=>cm[a[0]]=cm[a[1]])
//.map(x=>`\`${x[0]}\`|`+x[1]).join`\n`

const vs={
  pi:num('3.141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428810975665933446128475648233786783165271201909145648566923460348610454326648213393607260249141273724587006606315588174881520920962829254091715364367892590360011330530548820466521384146951941511609433057270365759591953092186117381932611793105118548074462379962749567351885752724891227938183011949129833673362440656643086021394946395224737190702179860943702770539217176293176752384674818467669405132000568127145263560827785771342757789609173637178721468440901224953430146549585371050792279689258923542019956112129021960864034418159813629774771309960518707211349999998372978049951059731732816096318595024459455346908302642522308253344685035261931188171010003137838752886587533208381420617177669147303598253490428755468731159562863882353787593751957781857780532171226806613001927876611195909216420199'),
  e:num('2.718281828459045235360287471352662497757247093699959574966967627724076630353547594571382178525166427427466391932003059921817413596629043572900334295260595630738132328627943490763233829880753195251019011573834187930702154089149934884167509244761460668082264800168477411853742345442437107539077744992069551702761838606261331384583000752044933826560297606737113200709328709127443747047230696977209310141692836819025515108657463772111252389784425056953696770785449969967946864454905987931636889230098793127736178215424999229576351482208269895193668033182528869398496465105820939239829488793320362509443117301238197068416140397019837679320683282376464804295311802328782509819455815301756717361332069811250996181881593041690351598888519345807273866738589422879228499892086805825749279610484198444363463244968487560233624827041978623209002160990235304369941849146314093431738143640546253152096183690888707016768396424378140592714563549061303107208510383750510115747704171898610687396965521267154688957035035'),
  phi:num('1.618033988749894848204586834365638117720309179805762862135448622705260462818902449707207204189391137484754088075386891752126633862223536931793180060766726354433389086595939582905638322661319928290267880675208766892501711696207032221043216269548626296313614438149758701220340805887954454749246185695364864449241044320771344947049565846788509874339442212544877066478091588460749988712400765217057517978834166256249407589069704000281210427621771117778053153171410117046665991466979873176135600670874807101317952368942752194843530567830022878569978297783478458782289110976250030269615617002504643382437764861028383126833037242926752631165339247316711121158818638513316203840052221657912866752946549068113171599343235973494985090409476213222981017261070596116456299098162905552085247903524060201727997471753427775927786256194320827505131218156285512224809394712341451702237358057727861600868838295230459264787801788992199027077690389532196819861514378031499741106926088674296226757560523172777520353613936')
},

error=e=>{
  console.log('\x1b[31mERROR:\x1b[0m '+e)
  process.exit(1)
},

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

I=x=>
  (x.type=='num'&&x.body=='NaN')||(x.pop&&!x.length)?
    tru(0)
  :x.type=='cond'?
    tru(I(x.body)).body?I(x.f):I(x.g)
  :x.map?
    (X=x.map(a=>I(a)))[X.length-1]
  :x.type=='ls'?
    ls(l(x.body))
  :x.type=='str'?
    str(l(x.body))
  :x.type=='num'?
    num(l(x.body))
  :x.type=='var'?
    vs[x.body.body]?
      vs[x.body.body]
    :(vs[x.body.body]=x.f)
  :(x.type=='ref'||x.type=='fn')&&vs[x.body]?
    vs[x.body]
  :x.type=='app'?
    (z=I(x.body)).type=='fn'?
      cm[z.body]?
        cm[z.body].length>1?
          pt(z.body,I(x.f),z.rev)
        :cm[z.body](I(x.f))
      :error(`undefined function "${z.body}"`)
    :z.type=='def'?
      I(ua(z,x.f).body)
    :z.type=='pt'?
      z.rev?cm[I(z).body](I(x.f),z.f):cm[I(z).body](z.f,I(x.f))
    :z.type=='ls'?
      ls(z.body.map(a=>I(app(a,x.f))))
    :error('bad application to '+form(z))
  :x,

exec=x=>tr(x).nodes().some(a=>a.type=='app'||a.type=='var'||a.type=='cond')?exec(I(x)):x

if(F=fg.get('f')){
  try{
    const code=fs.readFileSync(F)+'',
    parser=peg.generate(lex),
    ps=parser.parse(code)
    ps&&ps.length&&(fg.get('expr')?console.log(form(exec(ps))):exec(ps))
  }catch(e){
    error(
      e.message.match`\\[DecimalError\\]`?
        e.message.match(`Invalid argument`)&&'invalid argument passed to '+e.stack.match`cm\\.([^ \\n;0-9".[\\]\\(){}@#TF?]+) `[1]
      :e.message.match`Maximum call stack size exceeded`?
        'too much recursion'
      :e.stack.match`peg\\$buildStructuredError`?
        'failed to parse\n'+e.message
      :'js error -> '+e.stack
    )
  }
}else{
  logo=fs.readFileSync('dash.txt')+''
  pkg=fs.readFileSync('package.json')+''
  console.log(`\x1b[36m\x1b[1m${logo.replace(/1/g,'\x1b[4m').replace(/0/g,'\x1b[24m')}\x1b[0m\n\n\x1b[93m\x1b[1mv${JSON.parse(pkg).version}\x1b[21m\n\x1b[2mMade with love by Ben Pang (molarmanful).\x1b[0m`)
}