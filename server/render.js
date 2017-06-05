var r = require("./db");
const exec	= require('child_process').exec;
const tmp	= require('tmp');
const fs	= require('fs');

//Wait for rethonk to connect, let's arbitarily say 10 seconds.

setTimeout(()=>{
	r.table("list")
		.run(r.conn, (err, cursor) => {
			if (err) return res.send(500, {error: err.message});

				cursor.toArray((err, result) => {
					if (err) return res.send(500, {error: err.message});
					result.forEach((elem)=>{

						fs.stat(`client\\dec\\${elem.id}.wav`, function(err, stat) {
							//If the file doesn't exist, do a DECtalk
							if((err && err.code == 'ENOENT')) {
								console.log(`Processing ${elem.id}`);

								//Make a temp file to store the file
								tmp.file((err1, path, fd, clean) => {

									if (err1) throw err1;

									//Write the message to the temp file
									fs.writeFile(path, "[:phone on]" + elem.dectalk, (err2) => {

										if (err2) throw err2;

										//Grab the file, and write it into the dec folder
										exec(`type ${path} | say -w client\\dec\\${elem.id}.wav`, (err3) => {
											if (err3) throw err3;
										});
									});
								});
							} else {
								console.log(`Skipping ${elem.id}`);
							}
						});
					});
				});

		});


}, 10000)

