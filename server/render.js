var r = require("./db");

const exec	= require('child_process').exec;

const tmp	= require('tmp');
const fs	= require('fs');

//Wait for rethonk to connect, let's arbitarily say 10 seconds.

setTimeout(()=>{
	r.table("list")
		.run(r.conn, (err, cursor) => {
			if (err) {
				return res.send(500, {error: err.message});
			} else {
				cursor.toArray((err, result) => {
					if (err) return res.send(500, {error: err.message});
					result.forEach((elem)=>{

						fs.stat(`..\\client\\dec\\${elem.ID}.wav`, function(err, stat) {
							//If the file doesn't exist, do a DECtalk, or if it is in the argument variables
							if((err && err.code == 'ENOENT') || process.argv[elem.ID]) {
								console.log(`Processing ${elem.ID}`);

								//Make a temp file to store the file
								tmp.file((err1, path, fd, clean) => {

									if (err1) throw err1;

									//Write the message to the temp file
									fs.writeFile(path, "[:phone on]" + elem.dectalk, (err2) => {

										if (err2) throw err2;

										//Grab the file, and write it into the dec folder
										exec(`type ${path} | say -w ..\\client\\dec\\${elem.ID}.wav`, (err3) => {
											if (err3) throw err3;
										});
									});
								});
							} else {
								console.log(`Skipping ${elem.ID}`);
							}
						});
					})
				})
			}
		});



	});
}, 10000)

