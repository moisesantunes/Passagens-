const express = require('express')
const engine = require('ejs-mate')
const bodyParser = require('body-parser')
const uniqid = require('uniqid'); 
const fs= require("node:fs/promises")
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express()
const port = 3000

app.use(express.static('public'))

/*
Rotas
get- inicio
	get form novo passageiro
	get todos passageiros
		get um passageiro
	get um passageiro
get pagamentos
	get todos os passageiros
	get de um passageiro, parcial, 

post config do evento
post novo passageiro
post novo pagamento de um passageiro

Entidades
config do evento
	num dias 
	valor passagens
	data limite
	
passageiro = um lugar no onibus
	nome
	quantidade de dias, se congresso
	estado do pagamento × dias
		info por cores
	
pagamento = de um passageiro
	total
	parcial, pode ter mais de uma parte
	

*/
////// config body body-parser
app.use(bodyParser.urlencoded())

// parse application/json
app.use(bodyParser.json())


/////ejs config
// use ejs-locals for all ejs templates:
app.engine('ejs', engine);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
 // so you can render('index')
//////fim config ejs


//////// Config do evento
const semana=["Domingo", "Segunda-Feira","Terça-Feira","Quarta-Feira","Quinta-Feira","Sexta-Feira","Sabado"]


const evento={
	nome:"Adoracção Pura",
	tipo:"Congresso Regional",
	dias:3,
	valorDia:35,
	dataEvento: new Date(2025,7,22,10),
}
const listadias=[]
let datas= evento.dataEvento
let diai=datas.getDay()
for (var i = 0; i < evento.dias; i++) {
    let dia= datas.getDate()+i;
	let mes= datas.getMonth()+1;
    let ano= datas.getFullYear();
	listadias.push( dia +"/"+ mes+"/"+ano+"-"+semana[diai] )
    diai+=1
    if (diai >6){diai =0}
}


/////////

const passageiros=[]


app.get("/estatisticas",async (req,res)=>{
   let pessoas;
   let cont=0
   let obj={}
   obj.geral={}
    try {
        pessoas = JSON.parse(await fs.readFile("passageiros.json",{encoding:"utf-8"}))
    } catch (e) {
        res.send("<h1>Erro na leitura do arquivo</h2>[<a href='/'>Inicio</a>]")
    } 
    obj.pessoas=pessoas.length
    obj.totalRec= pessoas.reduce((t,p)=>{
        return t + p.total;
    },0)
    obj.totalPass= pessoas.reduce((t,p)=>{
        return t + p.diasq;
    },0)
    obj.totalEsp= obj.totalPass * evento.valorDia

  for (var i = 0; i < listadias.length; i++) {
        let diaRef = listadias[i].split("-").at(1)
        if (!obj.geral[diaRef]) {
          obj.geral[diaRef]=[]  
        }
        obj.geral[diaRef]=pessoas.filter((dia)=>{
            return dia.diass.includes(diaRef)
        })
  }
    
   // console.log(pessoas)
    //console.log(listadias)
    console.log(obj.geral)
    res.render("estatisticas",{
        titulo:"ESTATISTICAS",
        dados:obj,
        
    })
})

app.get('/', async (req, res) => {
    let pessoas;
    try {
        pessoas= await fs.readFile("passageiros.json",{encoding:"utf-8"})
    } catch (e) {
       console.log(e)
    }
    res.render('index',{
        titulo:"Inicio",
        evento:evento,
	    passageiros: JSON.parse(pessoas)
	})
})

app.get('/novopassageiro', (req, res)=>{
	res.render('formPassageiro',{
	    titulo:"Novo Passageiro",
	    evento:evento,
	    lista:listadias,
	})
})

app.get('/passageiros', async (req, res) => {
    let pessoas;
    try {
        pessoas = JSON.parse(await fs.readFile("passageiros.json",{encoding:"utf-8"}))
    } catch (e) {
        res.send("Problema na leitura do arquivo")
    }
    res.render("passageiros",{
        passageiros:pessoas,
        titulo:"Todos os Passageiros",
        evento:evento,
        lista:listadias
    })
})
app.post("/novopassageiro", async (req, res)=>{
    let pessoas;
    let diass=""
    let obj={}
    obj.id=uniqid()
    obj.nome= req.body.nome;
    obj.rg=req.body.rg
    obj.pags=[]
    obj.diasq=0
    obj.diasd=[]
    if (typeof req.body.diasd=="string") {
        obj.diasd=[req.body.diasd]
        obj.diasq=obj.diasd.length
        obj.diass=req.body.diasd
    }
    if (typeof req.body.diasd =="object") {
        obj.diasd= req.body.diasd;
        obj.diasq= req.body.diasd.length;
        obj.diass=req.body.diasd.join(",")
    }
    passageiros.push(obj)
    try {
        pessoas = JSON.parse(await fs.readFile("passageiros.json",{encoding:"utf-8"}))
        pessoas.push(obj)
        await fs.writeFile("passageiros.json",JSON.stringify(pessoas))
    } catch (e) {
        console.log(e)
    }
    res.redirect("/passageiro/"+obj.id)
})


app.get('/passageiro/:id', async(req,res)=>{
    if (req.params.id == undefined) {
      res.redirect("/")  
    }
    let pessoa;
    try {
        let pessoas = JSON.parse(await fs.readFile("passageiros.json",{encoding:"utf-8"}))
        pessoa = pessoas.find((item)=>item.id ==req.params.id)
    } catch (e) {
        console.log(e)
    }
    res.render("formeditpassageiro",{
        titulo:"Editar passageiro",
        pessoa:pessoa,
        evento:evento,
        lista:listadias
	})
})
app.post('/editpassageiro/:id', async (req,res)=>{
    let pessoas;
    try {
        pessoas = JSON.parse(await fs.readFile("passageiros.json",{encoding:"utf-8"}))
    } catch (e) {}
    let pessoa = pessoas.find((item)=>item.id ==req.params.id)
    let total =0
    pessoa.nome= req.body.nome;
    pessoa.rg=req.body.rg
    if (!req.body.pags) {pessoa.pags=[]}
    if (typeof req.body.pags == "string") {
        pessoa.pags= [req.body.pags]
    }
    if (typeof req.body.pags == "object") {
        pessoa.pags= req.body.pags
    }
    if (req.body.parcela) {
            pessoa.pags.push(req.body.parcela);
    }
    for (var i = 0; i < pessoa.pags.length; i++) {
        total+=Number(pessoa.pags[i])
    }
    pessoa.total=total
    pessoa.diasq=0
    pessoa.diasd=[]
    pessoa.diass=""
    if (typeof req.body.diasd=="string") {
        pessoa.diasd=[req.body.diasd]
        pessoa.diasq=pessoa.diasd.length
        pessoa.diass=req.body.diasd
    }
    if (typeof req.body.diasd =="object") {
        pessoa.diasd= req.body.diasd;
        pessoa.diasq= req.body.diasd.length;
        pessoa.diass=req.body.diasd.join(",")
    }
    try {
        await fs.writeFile("passageiros.json",JSON.stringify(pessoas))
    } catch (e) {}
    pessoa.pagss=pessoa.pags.join(",")
    res.redirect("/passageiro/"+pessoa.id)
})


app.listen(port, () => {})
	  

