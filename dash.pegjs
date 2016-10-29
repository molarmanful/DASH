start=a:(com/expr)*{
  return a.filter(x=>!x.big)
}

expr=a:(_/type)';'?{
  return a
}

//separators
_=[ \n]

//types
type=str/comp/num/bool/cond/ls/var/aapp/app/def/arg/fn/a/ref

//comments
com='#.'[^\n]*{return''}

//strings
str='"'a:([^"\\]/'\\'.)*'"'?{
  return{
    type:'str',
    body:a.map(x=>x.pop?x[1]=='"'?'"':x.join``:x).join``.replace(/\\\\/g,'\\')
  }
}
//numbers
num=a:([0-9]+('.'[0-9]+)?('e''_'?[0-9]+)?/'.'[0-9]+('e''_'?[0-9]+)?/'oo'){
  var f
  return{
    type:'num',
    body:a!='oo'?(f=z=>z.map(x=>x&&x.pop?f(x):x).join``.replace(/_/g,'-'))(a):'Infinity'
  }
}

//bool
bool=a:[TF]{
  return{
    type:'bool',
    body:+(a=='T')
  }
}

//list
ls='['a:expr*']'?{
  a=a.filter(x=>!x.big)
  return a.reduce((x,y)=>({
    type:'app',
    body:{
      type:'app',
      body:{type:'fn',body:'cat'},
      f:x
    },
    f:y
  }),{type:'ls',body:[]})
}
//expression list (holds multiple expressions)
arg='('a:expr*')'?{
  return a.filter(x=>!x.big)
}
//argument reference
a=a:('#'[0-9]+){
  return{
    type:'a',
    body:+a[1].join``
  }
}
ref=a:('#'fn){
  return{
    type:'ref',
    body:a[1].body
  }
}

//function reference
fn=a:[^ \n;0-9".[\]\\(){}@#TF?]+{
  return{
    type:'fn',
    body:a.join``
  }
}
//function application
app=a:(fn/def)_* b:type{
  return{
    type:'app',
    body:a.pop?a[1]:a,
    f:b
  }
}
aapp=a:(app/arg) _*b:type{
  return{
    type:'app',
    body:a,
    f:b
  }
}
//function definition
def='@'_*b:type{
  return{
    type:'def',
    body:b
  }
}
var=a:fn _*'\\'_*b:type{
  return{
    type:'var',
    body:a,
    f:b
  }
}

//conditionals
cond='['_*a:type _*'?'_*b:expr*_*'?'_*c:expr*_*']'{
  return{
  	type:'cond',
    body:a,
    f:b&&b.length?b.filter(x=>!x.big):{type:'bool',body:1},
    g:c&&c.length?c.filter(x=>!x.big):{type:'bool',body:0}
  }
}

//composition
comp=a:(fn/def/app/arg)_*'.'_*b:(fn/def/app/arg/comp){
  return{
    type:'def',
    body:{
      type:'app',
      body:a,
      f:{
        type:'app',
        body:b,
        f:{type:'a',body:0}
      }
    }
  }
}
