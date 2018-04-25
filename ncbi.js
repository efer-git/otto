"use strict"
/*
	PUBLIC DATA CHECKER
	USAGE : localhost:1337/check_project?query=QUERY
	RETURN : something...many...
*/

const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
const app = express();
//
mongoose.connect('mongodb://localhost/test');
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
        console.log("mongo db connection OK.");
});
var schema = mongoose.Schema;
var associationSchema = new schema({
        _id: Number,
        type: String,
        status: String,
        url: String,
        token: String,
        createdDate: Date,
        queuedDate: Date,
        startedDate: Date,
        completedDate: Date
});

app.get('/check_project',function(req,res,next){
	let inquery = req.query.query;
	try{
		console.log("accession: "+inquery);
		let newdata;
		getProject(inquery,function(val){
			newdata=val;
			try{
				console.log(newdata)
				res.send(newdata)
				res.end('')
			}catch(err){
				console.log(err)
			}

		});
		
	}catch(err){
		console.log("[ERROR] something wrong: "+err);
		res.writeHead(400,'');
		res.end('')
	}

});

function checkQuery(query){ //check is query project_type : PRJNA012312 ERP12312 mgp100231
	let reProject = new RegExp("(^PRJ(NA|EB|DA|DB)[0-9]+|^(E|S|D)RP[0-9]+|^mgp[0-9]+)","g");
	return reProject.test(query)
}

app.get('/download_meta',function(req,res,next){ //download primitive file.... but is it legit?
	let inquery = req.query.query;
	console.log(inquery)
	try{
		let reProject = new RegExp("(^PRJ(NA|EB|DA|DB)[0-9]+|^(E|S|D)RP[0-9]+|^mgp[0-9]+)","g");
		
		if (reProject.test(inquery)==true){ //project
			//download meta for this project
			let reNCBI = new RegExp("(^PRJ(NA|EB|DA|DB)[0-9]+|^(E|S|D)RP[0-9]+)","g");
			let reMGRAST = new RegExp("^mgp[0-9]+","g");
			
			if (reNCBI.test(inquery)==true){ //NCBI
				// download metadata from NCBI
				// http://trace.ncbi.nlm.nih.gov/Traces/sra/sra.cgi?save=efetch&rettype=runinfo&db=sra&term=<<PROJECT>> --> returns tsv like txt
				// maybe different link....if you find a link, please tell me...
				let url = "http://trace.ncbi.nlm.nih.gov/Traces/sra/sra.cgi?save=efetch&rettype=runinfo&db=sra&term="+inquery; // --> csv 
				
				console.log("[INFO] download metadata from "+url)
				request.get(url,function(err,response,body){
					require('fs').writeFile('./download/'+inquery+'.csv',body,function(err){
						if(err==null){
							console.log("[INFO] downloading metadata (txt) --> ./download/"+inquery+".csv")
						}else{
							console.log("[ERROR] "+err)
						}
						
					})
				})
				
			}else if(reMGRAST.test(inquery)==true){ //MG-RAST
				// download metadata from MG-RAST
				// http://api.metagenomics.anl.gov/project/<<PROJECT>>?verbosity=full --> returns json
				let url = "http://api.metagenomics.anl.gov/project/"+inquery+"?verbosity=full";
				console.log("[INFO] download metadata from "+url)
				request.get(url,function(err,response,body){
					if(JSON.parse(body).ERROR){
						console.log("[ERROR] "+JSON.parse(body).ERROR);
					}else{
						require('fs').writeFile('./download/'+inquery+'.js',JSON.parse(body),function(err){
							if(err){
								console.log("[ERROR] "+err);
							}else{
								console.log("downloading metadata (json) --> ./download/"+inquery+".js");
							}
						});
					}
				})
			}
			
		}else{
			console.log("[INFO] accession should be PROJECT! try again")
		}
	}catch(err){
		console.log("[ERROR] something wrong: "+err);
	}
})


function getProject(query,callback){ //return project which query(sample) contained... //this is how you return value....haha
	let reNCBI = new RegExp("((E|S|D)R(R|S)[0-9]+|^(E|S|D)RP[0-9]+|^PRJ(NA|EB|DA|DB)[0-9]+)","g");
	let reMGRAST = new RegExp("(mg(m|s)[0-9]+\.3|^mgp[0-9]+)");
	let result = {};
	if(reNCBI.test(query)==true){ //from sample //it's ncbi --> @ mg-rast branch...
		request.get("https://www.ncbi.nlm.nih.gov/Traces/study/?acc="+query+"&go=go",function(error,response,body){
			console.log('[INFO] status: ',response && response.statusCode);
			let keyRe=new RegExp("\{key:\"[0-9,a-z]+\", mode:\"[a-z]+\"\}","g");
			try{
				let key = keyRe.exec(body)[0] //parse key from body..
				let key_rep = JSON.parse(key.replace('key','\"key\"').replace('mode','\"mode\"'))
				console.log("[INFO] sample_key: "+key_rep.key );
			
				let OPTIONS = { 
					// url from run_selector
					url: "https://www.ncbi.nlm.nih.gov/Traces/study/proxy/run_selector.cgi?wt=json&indent=true&omitHeader=true&", 
					headers:{'Content-Type':'application/json'},
					body:'q=recordset:'+key_rep.key
				}

				request.post(OPTIONS,function(err,res,result){
					let meta=JSON.parse(result).response.docs[0]
					console.log(meta)
					console.log("[INFO]\tPROJECT: "+meta.BioProject_s+"\n\tAlias: "+meta.SRA_Study_s);//+project);
					console.log("[INFO]\tPROJECT_NAME: "+meta.project_name_s)
					let out = {'project':meta.BioProject_s,'alias':meta.SRA_Study_s,'project_name':meta.project_name_s};
					return callback(JSON.stringify(out));
				});
			}catch(err){
				console.log("[ERROR] no accession! try again")
				return callback(JSON.stringify("[ERROR] no accession! try again"))
			}
		});

	}else if(reMGRAST.test(query)==true){
		console.log("MG_RAST");
		request.get("https://api-ui.mg-rast.org/search?all="+query,function(err,res,body){
			try{
				let MGproject = JSON.parse(body).data[0]; //check you can find pmid in this query...
				console.log("[INFO]\tPROJECT: " + MGproject.project_id);
				console.log("[INFO]\tPROJECT_NAME: "+MGproject.project_name+" \n\tPMID: "+MGproject.pubmed_id) 
				let out = {'project':MGproject.project_id,'project_name':MGproject.project_name,'pmid':MGproject.pubmed_id};
				return callback(JSON.stringify(out));
				
			}catch(err){
				console.log("[ERROR] no accession! try again");
				return callback(JSON.stringify("[ERROR] no accession! try again"))
			}
		})
	
		
	}else{
		console.log("[ERROR] wrong type! try again");
		return callback("[ERROR] wrong type! try again")
	}
}

const server = app.listen(1337,function(){
	console.log("server started on port 1337");
});

/* TODO
0. make DB
  - in SQL? or mongo?
1. get paper info
  - pmid / pmcid 
  - in ncbi, need to another link...
  
3. make trigger function
  - hulk / autopipeline --> i prefer hulk for high-throughput  
  - trigger function
    * maybe shell...?
    * issues
      - how to communicate
      - how to return value
      - primer issue
      - when to link meta-data

*/