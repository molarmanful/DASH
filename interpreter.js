fs=require('fs')
peg=require('pegjs')
_=require('lodash')
d=require('decimal.js')
d.config({
  toExpNeg:-9e15,
  toExpPos:9e15
})
lex=fs.readFileSync(__dirname+'/x.peg')
ps=peg.generate(lex)
mon=x=>x.type||x.length<2
tc=(x,y='Unknown error')=>{
  f=0
  try{f=x(),isNaN(f)&&eval('.')}catch(e){error(y)}
  return f
}
hasapp=x=>x.type=='app'?1:x.type=='ls'?+x.body.some(hasapp):x.map?+x.some(hasapp):0

cm={
  E:x=>d.config({precision:x.body}),
  abs:x=>d.abs,
  '||':cm.abs,
  acos:x=>d.acos,
  acosh:x=>d.acosh,
  add:x=>y=>d.add(x.body,y.body),
  '+':cm.add,
  asin:x=>d.asin(x.body),
  asinh:x=>d.asinh(x.body),
  atan:x=>d.atan(x.body),
  atanh:x=>d.atanh(x.body),
  atant:x=>y=>d.atan2(x.body,y.body),
  ceil:x=>d.ceil(x.body),
  "|'":cm.ceil,
  cos:x=>y=>d.cos(x.body),
  cosh:x=>y=>d.cosh(x.body),
  div:x=>y=>d.div(x.body,y.body),
  '/':cm.div,
  exp:x=>d.exp(x.body),
  floor:x=>d.floor(x.body),
  '|_':cm.floor,
  hypot:x=>y=>d.hypot(x.body,y.body),
  ln:x=>d.ln(x.body),
  lt:x=>d.log10(x.body),
  log:x=>y=>d.log(x.body,y.body),
  max:x=>d.max(...x.body),
  min:x=>d.min(...x.body),
  mod:x=>y=>d.mod(x.body,y.body),
  '%':cm.mod,
  mul:x=>y=>d.mul(x.body,y.body),
  '*':cm.mul,
  pow:x=>y=>d.pow(x.body,y.body),
  '^':cm.pow,
  rand:x=>d.random(x.type=='num'?x.body:[]._),
  round:x=>d.round(x.body),
  '|:':cm.round,
  sign:x=>d.sign(x.body),
  '+-':cm.sign,
  sin:x=>d.sin(x.body),
  sinh:x=>d.sinh(x.body),
  sub:x=>y=>d.sub(x.body,y.body),
  '-':cm.sub,
  tan:x=>d.tan(x.body),
  tanh:x=>d.tanh(x.body),
  trunc:x=>d.trunc(x.body),
  '|-':cm.trunc,
  cmp:x=>y=>d(x.body).cmp(y.body),
  '=':cm.cmp,
  neg:x=>d(x.body).neg(),
  '_':cm.neg,
  for:x=>y=>_.flatMap(y.body,a=>({type:'apply',head:x,body:a})),
  '>':cm.for
}

error=e=>{
  console.log('ERROR: '+e)
  process.exit(1)
}

interpret=x=>{
  
}

fs.readFile(process.argv[2],($,d)=>{
  interpret(d)
})