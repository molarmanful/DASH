fs=require('fs')
req=require('sync-request')
Exec=require('child_process').execSync

try{
  fs.mkdirSync('dpm')
  console.log('Created dpm folder')
}catch(e){
  if(e.code!='EEXIST')throw e
}

list=(req('GET','https://raw.githubusercontent.com/molarmanful/dpm-list/master/registry').body+'').split`\n`.map(x=>x.split` `)

if(process.argv[2]=='install'){
  process.argv.slice(3).map(x=>{
    X=x.match`github.com/[^/]+/dash-`?
      [x,x.match`^(https?:/?/?)?github.com/[^/]+/dash-([^/]+)`[1]]
    :[(A=list[list.findIndex(a=>a[0]==x)]||[])[1],A[0]]
    fs.readdir('dpm/'+X[1],a=>{
      a&&a.code=='ENOENT'&&(Exec(`cd dpm;git clone -q ${X[0]} ${X[1]}`),console.log(`Cloned package "${X[1]}" into dpm`))
    })
  })
}
else if(process.argv[2]=='uninstall'){
  process.argv.slice(3).map(x=>{
    Exec('rm -rf dpm/'+x)
    console.log(`Uninstalled package "${x}" from dpm`)
  })
}
else if(process.argv[2]=='update'){
  process.argv.slice(3).map(x=>{
    Exec(`cd dpm/${x};git pull origin master -q`)
    console.log(`Updated package "${x}"`)
  })
}