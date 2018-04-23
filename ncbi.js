"use strict"
/*
	PUBLIC DATA CHECKER
	USAGE : localhost:1337/check_project?query=QUERY
	RETURN : something...many...


*/

const express = require('express');
const request = require('request');
const app = express();

app.get('/check_project',function(req,res,next){
	let inquery = req.query.query;
	try{
		console.log("accession: "+inquery);
		let aa=getProject(inquery);
		console.log(aa)
	}catch(err){
		console.log("[ERROR] something wrong: "+err);
	}

});

function checkQuery(query){ //check is query project_type : PRJNA012312 ERP12312 mgp100231
	let reProject = new RegExp("(^PRJ(NA|EB|DA|DB)[0-9]+|^(E|S|D)RP[0-9]+|^mgp[0-9]+)","g");
	return reProject.test(query)
}

function getProject(query){ //return project which query(sample) contained...
	let reSample = new RegExp("((E|S|D)R(R|S)[0-9]+|mg(m|s)[0-9]+\.3)","g");
	let reProject = new RegExp("(^PRJ(NA|EB|DA|DB)[0-9]+|^(E|S|D)RP[0-9]+|^mgp[0-9]+)","g");
	
	if(reSample.test(query)==true || reProject.test(query)==true){ //from sample
		request.get("https://www.ncbi.nlm.nih.gov/Traces/study/?acc="+query+"&go=go",function(error,response,body){
			console.log('[INFO] status: ',response && response.statusCode);
			let keyRe=new RegExp("\{key:\"[0-9,a-z]+\", mode:\"[a-z]+\"\}","g");
			try{
				let key = keyRe.exec(body)[0] //parse key from body..
				let key_rep = JSON.parse(key.replace('key','\"key\"').replace('mode','\"mode\"'))
				console.log("[INFO] sample_key: "+key_rep.key );
			
				let OPTIONS = {
					url: "https://www.ncbi.nlm.nih.gov/Traces/study/proxy/run_selector.cgi?wt=json&indent=true&omitHeader=true&",
					headers:{'Content-Type':'application/json'},
					body:'q=recordset:'+key_rep.key
				}

				request.post(OPTIONS,function(err,res,result){
					let meta=JSON.parse(result).response.docs[0]
					console.log("[INFO] PROJECT: "+meta.BioProject_s+" Alias: "+meta.SRA_Study_s);//+project);
					return [meta.BioProject_s,meta.SRA_Study_s];
				});
			}catch(err){
					console.log("[ERROR] no accession! try again")
			}
		});

		
	}else{
		console.log("[ERROR] wrong type! try again");
	}
		
}
	/*
	let reNCBI_sample = new RegExp("^(E|S|D)RR[0-9]+","g");
	let reMGRAST_sample = new RegEx[("^mg(m/s)[0-9]+\.3","g");
	
	if (reNCBI_prj==true){
		console.log(reNCBI_prj.test(query))
	}else if(reMGRAST_prj==true){
		console.log(reMGRAST_prj.test(query))
	}else{
	*/		

	



const server = app.listen(1337,function(){
	console.log("server started on port 1337");
});

