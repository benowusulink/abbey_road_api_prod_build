const path = require('path');
const fs = require('fs');

const express = require('express');
const app = express();
const cors = require('cors');

const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

const sqlite = require("./database/knex/knex.js").sqlite_db;
const nodemailer = require("./utilities/nodemailer/nodemailer.js").transporter;


app.use(express.static(path.join(__dirname, '../public')));

app.use(cookieParser());
app.use(cors())
app.use(express.json());

const multer = require('multer');

const store_pdf_documents = multer.diskStorage({
  destination: function (req, file, cb) {

  	if(file.fieldname === 'board_members_pdf'){

			cb(null,path.join(__dirname,"..","public","documentation","board_documents"));
  	}
  	if(file.fieldname === 'who_we_are_pdf'){
  		cb(null,path.join(__dirname,"..","public","documentation","index-page"));

  	}
		
  }
  ,
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const store_images = multer.diskStorage({
  destination: function (req, file, cb) {

  	if(file.fieldname === 'our_estates_image'){
			cb(null,path.join(__dirname,"..","public","images","index-page","estate_section"));
  	}
  	else if(file.fieldname === 'service_image'){
  		cb(null,path.join(__dirname,"..","public","images","index-page","services_section"));
  	}
  	else if(file.fieldname === "edited_image"){

			cb(null,path.join(__dirname,"..","public","images","estate-page"));

  	}
   	else if(file.fieldname === "added_estate_images"){

			cb(null,path.join(__dirname,"..","public","images","estate-page"));

  	}
   	else if(file.fieldname === "news_image"){

			cb(null,path.join(__dirname,"..","public","images","news"));

  	}
  }
  ,
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload_pdf = multer({ storage: store_pdf_documents});
const upload_images = multer({ storage: store_images});


app.get("/api/services_page/fetch_anchor_tags",(req,res)=>{

	sqlite('services_page_table')
	.where({
		element: 'anchor_tag'
	})
	.select('*')
	.then((data)=>{
		console.log(data)
		res.json({
			success: true,
			elements:data
		})
	})
	.catch((err)=>{
		console.log(err)
		res.json({
			success: false
		})
	})

})

app.get("/api/governance_page/fetch_anchor_tags", (req,res)=>{

	sqlite('governance_page_table')
	.where({
		element: 'anchor_tag'
	})
	.select('*')
	.then((data)=>{
		console.log(data)
		res.json({
			success: true,
			elements:data
		})
	})
	.catch((err)=>{
		console.log(err)
		res.json({
			success: false
		})
	})
})


app.get("/api/estates-page/fetch_page_elements", (req,res)=>{

	// transaction to get all values from estate_page_images & estate_page_elements
	// tables
	sqlite.transaction((trx) => {

	  const result = {};

	  return trx('estate_page_images')
	    .select('*')
	    .from('estate_page_images')
	    .then((data1) => {

	    	if(data1.length > 0){
	    		result.estate_page_images = data1;
	    	}
	    	else{
	    		result.estate_page_images = null
	    	}

	      return trx('estate_page_elements')
	        .select('*')
	        .from('estate_page_elements')
	    })
	    .then((data2) => {

	    	if(data2.length > 0){
	    		result.estate_page_elements = data2;
	    	}
	    	else{
	    		result.estate_page_elements = null
	    	}

	      return result; 
	    });

	})
	.then((result) => {

	// check if result exisits,is an object & had two array properties
	  if (result &&
	    typeof result === 'object' &&
	    Array.isArray(result.estate_page_images) &&
	    Array.isArray(result.estate_page_elements)){

	    res.status(200).json({
	      success: true,
	      estate_page: result
	    });
	  } 
	  else {

	    res.status(404).json({
	      success: true,
	      estate_page: null
	    });
	  }
	})
	.catch((err) => {

	  console.error(err);

	  	res.status(404).json({
	      success: false
	    });
	})
})

app.get("/api/index-page/fetch_page_elements", (req,res)=>{

	sqlite.select('*')
	.from('index_page_elements_table')
	.then((elements)=>{

		 if(elements.length > 0 &&
			Array.isArray(elements) &&
      	 	typeof elements[0] === 'object' &&
      		elements[0] !== null){

			// loop through elements from table and categorising them into 
			// seperate arrays 
			const a_tag_elements = elements.filter((a_tag_element)=>{
				if(a_tag_element.section === 'a_tag_elements'){
					return a_tag_element
				}
			})

			const estate_element_text = elements.filter((estate_element)=>{
				if(estate_element.section === 'estate_elements' &&
					estate_element.id === "index-section3-article1-div1-h3-p1"){
					return estate_element
				}
		    }).map((estate_element)=>{
				return estate_element.text
			})

		    const estate_elements_images = elements.filter((estate_element)=>{
		    	if(estate_element.section === 'estate_elements' &&
		    		estate_element.id !== "index-section3-article1-div1-h3-p1"){
		    			return estate_element
		    	}
		    })

			const service_images = elements.filter((service_image)=>{
				if(service_image.section === "service_images"){
					return service_image
				}
			})


			// server response
			res.status(200).json({
				success: true,
				a_tag_elements: a_tag_elements,
				estate_text: estate_element_text[0],
				estate_images: estate_elements_images,
				service_images: service_images
			})
		}
		else{
			console.log("couldnt find elements from index_page_elements_table")
			res.status(404).json({
				success: false
			})
		}

	})
	.catch((err)=>{
		console.log(err);
		res.status(404).json({
			success: false
		})
	})

})


app.get("/api/index-page/events_and_news",(req,res)=>{

	sqlite.transaction((trx) => {

	  const result = {};

	  return trx('events_table')
	    .select('*')
	    .then((data1) => {
	      result.events_table = data1;
	      return trx('news_table')
	        .select('*')
	    })
	    .then((data2) => {
	      result.news_table = data2;
	      return result; // return the collected object
	    });

	})
	.then((result) => {

	  if(result.events_table.length > 0){

	  	  const top3_events = 
		  result.events_table.sort((a, b) => {
		    const [dayA, monthA, yearA] = a.event_date.split("-");
		    const [dayB, monthB, yearB] = b.event_date.split("-");

		    const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
		    const dateB = new Date(`${yearB}-${monthB}-${dayB}`);

		    return dateB - dateA; // latest first
		  })
		  .slice(0, 3); // get first 3 items

		  result.events_table = top3_events
	  }

	  console.log(result)

	  if(result.news_table.length > 0){

	  	  const top3_news = 
		  result.news_table.sort((a, b) => {
		    const [dayA, monthA, yearA] = a.news_date.split("-");
		    const [dayB, monthB, yearB] = b.news_date.split("-");

		    const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
		    const dateB = new Date(`${yearB}-${monthB}-${dayB}`);

		    return dateB - dateA; // latest first
		  })
		  .slice(0, 3); // get first 3 items

		  result.news_table = top3_news
	  }

	  console.log(result)

	  res.status(200).json({
	  	status: true,
	  	data: result
	  })
	  
	})
	.catch((err) => {

	  console.error(err);

	  res.status(500).json({
	  	status: false,
	  	response: "Couldnt retrieve Latest news and Events from server"
	  })
	})
})

app.get("/api/news&events_page/fetch_news&events", (req,res)=>{

	sqlite.transaction((trx) => {

	  const result = {};

	  return trx('events_table')
	    .select('*')
	    .then((data1) => {
	      result.events_table = data1;
	      return trx('news_table')
	        .select('*')
	    })
	    .then((data2) => {
	      result.news_table = data2;
	      return result; // return the collected object
	    });

	})
	.then((result)=>{
		if(result &&
	    typeof result === 'object' &&
	    Array.isArray(result.events_table) &&
	    Array.isArray(result.news_table)){
	    	const resp = {
	    		success: true,
				tables: result
	    	}
			res.json(resp)
		}
	})
	.catch((err)=>{
		console.log(err)
		res.json({
			success: false
		})
	})
})


app.get("/api/resident-involvment-page/get_all_images", (req,res)=>{

	sqlite.select('*')
	.from('images_table')
	.then((images)=>{
		console.log(images)
		if(images.length > 0){
			res.status(200).json({
				success: true,
				data: images
			})
		}
		else{
			res.status(200).json({
				success: true
			})
		}
	})
	.catch((err)=>{
		res.status(404).json({
			success: false
		})
	})	
})



app.post("/api/index-page/submit_user_email",(req,res)=>{

	const user_email = req.body.user_email;

	sqlite('user_emails')
	.insert({
		user_email: user_email,
	})
	.then((result)=>{
		res.status(200).json({
			success: true,
			data: user_email
		})
	})
	.catch((err)=>{
		res.status(404).json({
			success: false
		})
	})
})

app.post("/api/contact-page/send_email", (req,res)=>{

	console.log(req.body)

	const { name, email, telephone, msg } = req.body;

	  if (!name || !email || !msg) {
	    return res.status(400).json({ success: false, message: "Missing required fields" });
	  }


    //  return nodemailer.sendMail({
    //   from: `"${name}" <abbey_road_send_email@yahoo.com>`, // sender address
    //   to: "benowusu@hotmail.co.uk", // replace with your recipient
    //   subject: `Message from ${name}`,
    //   text: `Name: ${name}\nEmail: ${email}\nTelephone: ${telephone || "N/A"}\nMessage: ${msg}`,
    //   html: `<p><strong>Name:</strong> ${name}</p>
    //          <p><strong>Email:</strong> ${email}</p>
    //          <p><strong>Telephone:</strong> ${telephone || "N/A"}</p>
    //          <p><strong>Message:</strong><br/>${msg}</p>`
    // })
    // .then((res)=>{
    // 	console.log(res)
    // 	console.log("Message sent: %s", info.messageId);
    // })
    // .catch((err)=>{
    // 	console.log(err)
    // })

	  return res.json({
	  	status:true
	  })
})

app.post("/api/login-page/website_admin_login", (req,res)=>{

	sqlite.select('*')
	.from('website_admin')
	.then((data)=>{

		console.log(data[0].password)

		const comparePassword = 
		bcrypt.compareSync(req.body.password, data[0].password);


		if(comparePassword){

			if (process.env.NODE_ENV === "production"){


				res.status(200).json({
					status: true
				})
		
			}
			else{
	
				res.status(200).json({
					status: true
				})
			}

		}
		else{
			res.status(404).json({
				status: false
			})
		}
	})
	.catch((err)=>{
		console.log(err)
		res.status(404).json({
			status: false
		})
	})
})

app.post("/api/login-page/board_members_login", (req,res)=>{

	sqlite('board_members')
	.where({
		username: req.body.username
	})
	.select('password')
	.then((password)=>{

		console.log(password[0].password);

		const comparePassword = 
		bcrypt.compareSync(req.body.password, password[0].password);

		if(comparePassword){

			if (process.env.NODE_ENV === "production"){


				res.status(200).json({
					status: true
				})
		
			}
			else{

				res.status(200).json({
					status: true,
				})
			}

		}
		else{
			res.status(404).json({
				status: false
			})
		}
	})
	.catch((err)=>{
		console.log(err)
		res.status(404).json({
			status: false
		})
	})
})

// ADMINNNNNN BOARD MEMBERS

app.get("/api/admin_board_members_page/fetch_board_members", (req,res)=>{

	sqlite.select('username')
	.from('board_members')
	.then((data)=>{
		console.log(data)
		res.status(200).json({
			success:true,
			board_members: data
		})
	})
	.catch((err)=>{
		console.log(err)
		res.status(200).json({
			success:false,
			err: err
		})
	})
})

app.post("/api/admin_board_members_page/add_board_members",(req,res)=>{


	const salt = bcrypt.genSaltSync(10);
	const hash = bcrypt.hashSync(req.body.password, salt);

	if(req.body.username.length > 0){

		sqlite('board_members')
		.returning('username')
		.insert({
			username: req.body.username,
			password: hash
		})
		.then((data)=>{
			console.log(data[0].username === req.body.username)
			if(data[0].username === req.body.username){
				res.status(200).json({
					success: true
				})
			}
			else{
				res.status(404).json({
					success:false
				})
			}
		})
		.catch((err)=>{
			if(err.errno === 19){
				res.status(404).json({
					success:false,
					username_exists: true
				})
			}
			else{
				res.status(404).json({
					success: false
				})
			}

		})
	}
	else{
		res.status(404).json({
			success:false
		})
	}

})

app.post("/api/admin_board_members_page/edit_board_members", (req,res)=>{

	if(req.body.username !== null &&
		req.body.password !== null){

		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(req.body.password, salt);


		sqlite('board_members')
		.where({
			username: req.body.old_username
		})
		.returning('username')
		.update({
			username: req.body.username,
			password: hash
		})
		.then((data)=>{
			console.log(data)
			if(data[0].username === req.body.username){
				res.status(200).json({
					success: true
				})
			}
			else{
				res.status(404).json({
					success: false
				})	
			}
		})
		.catch((err)=>{
			console.log(err)
			res.status(404).json({
				success: false
			})	
		})
	}
	else if(req.body.username === null){

		const salt = bcrypt.genSaltSync(10);
		const hash = bcrypt.hashSync(req.body.password, salt);

		sqlite('board_members')
		.where({
			username: req.body.old_username
		})
		.returning('username')
		.update({
			password: hash
		})
		.then((data)=>{
			console.log(data)
			if(data[0].username === req.body.old_username){
				res.status(200).json({
					success: true
				})
			}
			else{
				res.status(404).json({
					success: false
				})	
			}
		})
		.catch((err)=>{
			res.status(404).json({
				success: false
			})	
		})
	}
	else if(req.body.password === null){

		sqlite('board_members')
		.where({
			username: req.body.old_username
		})
		.returning('username')
		.update({
			username: req.body.username
		})
		.then((data)=>{
			console.log(data)
			if(data[0].username === req.body.username){
				res.status(200).json({
					success: true
				})
			}
			else{
				res.status(404).json({
					success: false
				})	
			}
		})
		.catch((err)=>{
			res.status(404).json({
				success: false
			})	
		})
	}

})

app.post("/api/admin_board_members_page/delete_board_members", (req,res)=>{

	sqlite('board_members')
	.where({
		username: req.body.username
	})
	.del()
	.then((data)=>{
		console.log(data)
		if(data === 1){
			res.status(200).json({
				success: true
			})
		}
		else{
			res.status(404).json({
				success: false
			})
		}
	})
	.catch((err)=>{
		console.log(err)
		res.status(404).json({
			success: false
		})	
	})
})

app.get("/api/admin_board_members_page/fetch_board_documents", (req,res)=>{

	sqlite.select('*')
	.from('board_members_documents')
	.then((data)=>{

		console.log(data)

		if(data.length > 0){
			res.status(200).json({
				success: true,
				documents: data
			})
		}
		else{
			res.status(404).json({
				success: false
			})
		}
	})
	.catch((err)=>{
		console.log(err)
		res.status(404).json({
			success:false
		})
	})
})

app.post("/api/admin_board_members_page/add_board_documents",
	upload_pdf.single('board_members_pdf'),(req,res)=>{


		// error uploading file or no file from client 
		if(!req.file){
			
			console.log("error uploading file or no file to upload");

			res.status(404).json({
				success: false
			})
		}
		// success uploading file & file from client
		else{



			const dev_url = `http://localhost:3001/documentation/board_documents/${req.file.filename}`;
			const prod_url = `https://abbey-road-api.onrender.com/board_documents/${req.file.filename}`
			const name =  req.file.filename

			sqlite('board_members_documents')
			.returning('name')
			.insert({
				development_url: dev_url,
				production_url: prod_url,
				name: name

			})
			.then((data)=>{

				// success
				if(data[0].name === name){

					res.status(200).json({
						success: true,
						name: data[0].name
					})
				}
				// fail 
				else{
					res.status(404).json({
						success: false
					})
				}
			})
			.catch((err)=>{

				console.log(err);

				res.status(404).json({
					success: false
				})
			})

		}
})

app.post("/api/admin_board_members_page/delete_board_documents", (req,res)=>{

	sqlite('board_members_documents')
	.where({
		name: req.body.document_name
	})
	.del()
	.then((data)=>{
		console.log(data)
		if(data === 1){
			res.status(200).json({
				success: true
			})
		}
		else{
			res.status(404).json({
				success: false
			})
		}
	})
	.catch((err)=>{
		console.log(err)
		res.status(404).json({
			success: false
		})	
	})

})

// ADMINNNNNN HOME PAGE 

app.get("/api/admin_home_page/fetch_who_we_are_documents", (req,res)=>{

	sqlite('index_page_elements_table')
	.where({
		section: 'a_tag_elements'
	})
	.select('*')
	.then((data)=>{

		// success
		if(data.length > 0){

			console.log(data)

			res.status(200).json({
				success: true,
				who_we_are_documents: data
			})
		}
		// fail
		else{

			res.status(404).json({
				success: false
			})
		}

	})
	.catch((err)=>{

		console.log(err)

		res.status(404).json({
			success: false
		})
	})

})

app.put("/api/admin_home_page/edit_who_we_are_documents",
	upload_pdf.single('who_we_are_pdf'),(req,res)=>{

		// error uploading file or no file from client 
		if(!req.file){
			
			console.log("error uploading file or no file to upload");

			res.status(404).json({
				success: false
			})
		}
		// success uploading file & file from client
		else{

			fs.rm(path.join(__dirname,'..','public','documentation','index-page',req.body.old_document_name),
				(err) => {

				  if (err) {

				  	console.log("couldnt delete file", err)

				  	return res.status(404).json({
				  		success: false
				  	})
				  }
				  // success
				  else{

						const dev_url = `http://localhost:3001/documentation/index-page/${req.file.filename}`;
						const prod_url = `https://abbey-road-api.onrender.com/index-page/${req.file.filename}`
						const new_name =  req.file.filename
						const id = req.body.a_tag_id

						sqlite.transaction((trx) => {

						  let result = null;

						  return trx('index_page_elements_table')
								.where({
									id: id
								})
								.returning('title')
								.update({
									title: new_name,
									development_src: dev_url,
									production_src: prod_url
								})
						    .then((data) => {

						      result = data;

						      if(data[0].title === new_name){
						      	return trx('index_page_elements_table')
						        .where({
											section: 'a_tag_elements'
										})
										.select('*')
						      }
						    })
						    .then((data) => {
						      result = data;
						      return result; 
						    });

						})
						.then((result) => {

						  res.status(202).json({
						  	success: true,
						  	who_we_are_documents: result
						  })
						})
						.catch((err) => {
						  console.error(err);
						  res.status(500).json({ 
						  	success: false 
						  });
						});


				  }
			})
		}
	})

app.get("/api/admin_home_page/fetch_our_estates_text",(req,res)=>{

	sqlite('index_page_elements_table')
	.where({
		 id: 'index-section3-article1-div1-h3-p1'
	})
	.select('text')
	.then((data)=>{

		if(data.length > 0){

			console.log(data[0].text)

			res.status(200).json({
				success: true,
				our_estates_text: data[0].text
			})
		}
		else{
			res.status(404).json({
				success: false
			})
		}
	})
	.catch((err)=>{
		console.log(err)

			res.status(404).json({
				success: false
			})
	})
	
})

app.put("/api/admin_home_page/edit_our_estates_text",(req,res)=>{

	// text sent from client 
	if(req.body.new_text){

		sqlite('index_page_elements_table')
		.where({
			 id: 'index-section3-article1-div1-h3-p1'
		})
		.returning('text')
		.update({
			text: req.body.new_text
		})
		.then((data)=>{

			if(data.length > 0){

				res.status(200).json({
					success: true,
					our_estates_text: data[0].text
				})
			}
			else{

				res.status(404).json({
					success: false
				})
			}

		})
		.catch((err)=>{

			console.log(err)

			res.status(404).json({
				success: false
			})
		})

	}
	// no text sent from client 
	else{

			res.status(404).json({
				success: false
			})
	}

})

app.get("/api/admin_home_page/fetch_our_estates_images", (req,res)=>{

		sqlite('index_page_elements_table')
		.where({
			section: 'estate_elements'
		})
		.select('*')
		.then((data)=>{

			console.log(data)

			if(data.length > 0){

				res.status(200).json({
					success: true,
					our_estates_images: data
				})
			}
			else{
				res.status(404).json({
					success:false
				})
			}
		})
		.catch((err)=>{
			console.log(err)
			res.status(404).json({
				success:false
			})
		})
})

app.put("/api/admin_home_page/edit_our_estates_images",
	upload_images.single("our_estates_image"),(req,res)=>{

		// error uploading image or no file from client 
		if(!req.file){
			
			console.log(" no image to upload");

			res.status(404).json({
				success: false
			})
		}
		// success uploading file & file from client
		else{

			fs.rm(path.join(__dirname,"..","public","images","index-page","estate_section",req.body.image_id),
				(err) => {

				  if (err) {

				  	console.log("couldnt delete img", err)

				  	return res.status(404).json({
				  		success: false
				  	})
				  }
				  // success
				  else{

						const dev_url = `http://localhost:3001/images/index-page/estate_section/${req.file.filename}`;
						const prod_url = `https://abbey-road-api.onrender.com/images/index-page/estate_section/${req.file.filename}`
						const new_name =  req.file.filename
						const old_name = req.body.image_id

						sqlite('index_page_elements_table')
						.where({
							title: old_name
						})
						.returning('title')
						.update({
							title: new_name,
							development_src: dev_url,
							production_src: prod_url

						})
						.then((data)=>{

							console.log(data)

							if(data.length > 0){

								res.status(200).json({
									success: true
								})
							}
							else{
								res.status(404).json({
									success: false
								})
							}

						})
						.catch((err)=>{

							console.log(err)

							res.status(404).json({
								success: false
							})
						})

					}

			})
		}

})

app.get("/api/admin_home_page/fetch_service_images", (req,res)=>{

		sqlite('index_page_elements_table')
		.where({
			section: 'service_images'
		})
		.select('*')
		.then((data)=>{

			console.log(data)

			if(data.length > 0){

				res.status(200).json({
					success: true,
					service_images: data
				})
			}
			else{
				res.status(404).json({
					success:false
				})
			}
		})
		.catch((err)=>{
			console.log(err)
			res.status(404).json({
				success:false
			})
		})
})

app.put("/api/admin_home_page/edit_our_service_images",
	upload_images.single("service_image"),(req,res)=>{

		// error uploading image or no file from client 
		if(!req.file){
			
			console.log(" no image to upload");

			res.status(404).json({
				success: false
			})
		}
		// success uploading file & file from client
		else{

			fs.rm(path.join(__dirname,"..","public","images","index-page","services_section",req.body.old_image_name),
				(err) => {

				  if (err) {

				  	console.log("couldnt delete img", err)

				  	return res.status(404).json({
				  		success: false
				  	})
				  }
				  // success
				  else{

						const dev_url = `http://localhost:3001/images/index-page/services_section/${req.file.filename}`;
						const prod_url = `https://abbey-road-api.onrender.com/images/index-page/services_section/${req.file.filename}`
						const new_name =  req.file.filename
						const old_name = req.body.old_image_name

						sqlite('index_page_elements_table')
						.where({
							id: req.body.image_id
						})
						.returning('title')
						.update({
							text: new_name,
							development_src: dev_url,
							production_src: prod_url

						})
						.then((data)=>{

							console.log(data)

							if(data.length > 0){

								res.status(200).json({
									success: true
								})
							}
							else{
								res.status(404).json({
									success: false
								})
							}

						})
						.catch((err)=>{

							console.log(err)

							res.status(404).json({
								success: false
							})
						})

					}

			})
		}
})



app.get("/api/admin_estates_page/fetch_estates", (req,res)=>{

	// transaction to get all values from estate_page_images & estate_page_elements
	// tables
	sqlite.transaction((trx) => {

	  const result = {};

	  return trx('estate_page_images')
	    .select('*')
	    .from('estate_page_images')
	    .then((data1) => {

	    	if(data1.length > 0){
	    		result.estate_page_images = data1;
	    	}
	    	else{
	    		result.estate_page_images = null
	    	}

	      return trx('estate_page_elements')
	        .select('*')
	        .from('estate_page_elements')
	    })
	    .then((data2) => {

	    	if(data2.length > 0){
	    		result.estate_page_elements = data2;
	    	}
	    	else{
	    		result.estate_page_elements = null
	    	}

	      return result; 
	    });

	})
	.then((result) => {

	// check if result exisits,is an object & had two array properties
	  if (result &&
	    typeof result === 'object' &&
	    Array.isArray(result.estate_page_images) &&
	    Array.isArray(result.estate_page_elements)){

	    res.status(200).json({
	      success: true,
	      estates_array: result
	    });
	  } 
	  else {

	    res.status(404).json({
	      success: false
	    });
	  }
	})
	.catch((err) => {

	  console.error(err);

	  	res.status(404).json({
	      success: false
	    });
	})
})

app.put("/api/admin_estate_page/edit_selected_estate",
	upload_images.single("edited_image"),(req,res)=>{

		// no image from client 
		if(!req.file){

			if (Object.keys(req.body.updated_estate).length > 0) {



				return sqlite('estate_page_elements')
				.where(JSON.parse(req.body.category))
				.returning('*')
				.update(JSON.parse(req.body.updated_estate))
				.then((data)=>{

				  if(data.length > 0){

				  	console.log(data)
				  	res.status(200).json({
				  		success: true,
				  		updated_estate: data
				  	})
				  }
				  else{
				  	console.log("error")
				  	res.status(404).json({
				  		success:false
				  	})
				  }
				})
				.catch((err)=>{
				  	res.status(404).json({
				  		success:false
				  	})
				})
			
			}
			else{

				res.status(404).json({
		  		success:false
		  	})

		}}
		// success uploading file & file from client
		else{

			fs.rm(path.join(__dirname,"..","public","images","estate-page",`${JSON.parse(req.body.image_name)}`),
				(err) => {

				  if (err) {

				  	console.log("couldnt delete img", err)

				  	res.status(404).json({
				  		success: false
				  	})
				  }
				  // success
				  else{

					  	const dev_url = `http://localhost:3001/images/estate-page/${req.file.filename}`
					  	const prod_url = `https://abbey-road-api.onrender.com/images/estate-page/${req.file.filename}`


							sqlite.transaction((trx) => {

							  return trx('estate_page_images')
								.where({
									estate_image_id: JSON.parse(req.body.image_name)
								})
								.returning('estate_category')
								.update({
									estate_image_production_url: prod_url,
									estate_image_id: req.file.filename,
									estate_image_development_url: dev_url,
								})
						    .then((data1) => {

						    	if (Object.keys(JSON.parse(req.body.updated_estate)).length > 0) {

							      return trx('estate_page_elements')
											.where({
												estate_title: data1[0].estate_category
											})
											.returning('*')
											.update(JSON.parse(req.body.updated_estate))
							    }
							    else{

							    	console.log("1449",data1)
							    	return trx('estate_page_elements')
											.where({
												estate_title: data1[0].estate_category
											})
										.select('*')
							    }
						    })
						  
							})
							.then((result) => {

							  if(result.length > 0){

							  	res.status(200).json({
							  		success: true,
							  		updated_estate: result
							  	})
							  }
							  else{
							  	res.status(404).json({
							  		success:false
							  	})
							  }
							  
							})
							.catch((err) => {
							  console.error(err);

							  res.status(404).json({
							  	success:false
							  })

							});
						}
				})
			}
})

app.post(
  "/api/admin_estate_page/add_new_estate",
  upload_images.array('added_estate_images', 10),
  (req, res) => {
    // No files
    if (!req.files || req.files.length === 0) {
      return res.status(500).json({ success: false });
    }

    // Start transaction
    sqlite.transaction((trx) => {
      // 1️⃣ Insert estate object
      return trx('estate_page_elements')
        .returning('estate_title')
        .insert(JSON.parse(req.body.add_estate))
        .then((insertedEstate) => {
          // insertedEstate is an array of inserted rows (with estate_title)
          const estateTitle = insertedEstate[0].estate_title;
          const imagesInserts = [];

          // 2️⃣ Loop through uploaded images
          req.files.forEach((file,index) => {

            const dev_url = `http://localhost:3001/images/estate-page/${file.filename}`;
            const prod_url = `https://abbey-road-api.onrender.com/${file.filename}`;
            const category = estateTitle;

            imagesInserts.push({
              estate_category: category,
              estate_image_production_url: prod_url,
              estate_image_development_url: dev_url,
              estate_image_id: `${category}${index}`
            });
          });

          // 3️⃣ Insert all images
          return trx('estate_page_images')
            .insert(imagesInserts)
            .returning('*'); // returns the inserted rows
        });
    })
    .then((insertedImages) => {
      // 4️⃣ Success
          	console.log("1535 SUCCESS")
      res.json({ success: true, insertedImages });
    })
    .catch((err) => {
      console.error(err);
      console.log("1540 FAIL")
      res.status(500).json({ success: false });
    });
  }
);



app.delete("/api/admin_estate_page/delete_estate", (req, res) => {

    const estateName = req.body.name;

    if (!estateName) {
        return res.status(400).json({
            success: false,
            message: "Missing estate name"
        });
    }

    sqlite.transaction((trx) => {

        // 1️⃣ FIRST: Get all image paths for this estate (so we can delete files)
        return trx("estate_page_images")
            .where("estate_category", estateName)
            .select(
                "estate_image_development_url",
                "estate_image_production_url"
            )
            .then((rows) => {

                // calculate actual disk paths to delete
                const filesToDelete = rows.map((row) => {
                    const url = process.env.NODE_ENV === "production"
                        ? row.estate_image_production_url
                        : row.estate_image_development_url;

                    // extract filename safely
                    const filename = url.split("/").pop();

                    return path.join(__dirname,"..","public/images/estate-page", filename);
                });

                // 🗑️ 2️⃣ DELETE all files on disk
                filesToDelete.forEach((filepath) => {
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath); // delete file
                    }
                });

                // 3️⃣ Delete estate page elements
                return trx("estate_page_elements")
                    .where("estate_title", estateName)
                    .del();
            })
            .then(() => {

                // 4️⃣ Delete all image records from DB
                return trx("estate_page_images")
                    .where("estate_category", estateName)
                    .del();
            });

    }) // END transaction
    .then(() => {
        res.status(200).json({
            success: true
        });
    })
    .catch((error) => {
        console.error(error);
        res.status(500).json({
            success: false
        });
    });

});


app.get("/api/admin_news_and_events_page/fetch_news", (req,res)=>{

	sqlite.select('*')
	.from('news_table')
	.then((data)=>{

		console.log(data)

		if(data.length > 0){

			res.status(200).json({
				success:true,
				news_articles: data
			})
		}
		else{
			res.status(500).json({
				success: false,
			})	
		}
	})
	.catch((err)=>{

		console.log(err)

		res.status(500).json({
			success: false,
		})	
	})
})

app.get("/api/admin_news_and_events_page/fetch_events", (req,res)=>{

	sqlite.select('*')
	.from('events_table')
	.then((data)=>{

		console.log(data)

		if(data.length > 0){

			res.status(200).json({
				success:true,
				events_articles: data
			})
		}
		else{
			res.status(500).json({
				success: false,
			})	
		}
	})
	.catch((err)=>{

		console.log(err)

		res.status(500).json({
			success: false,
		})	
	})
})

app.put("/api/admin_news_and_events_page/update_news_article",
	upload_images.single('news_image'), (req,res)=>{

		// optional error handler if you dont want to add middleware, means file wasnt saved
		if(!req.file){

			sqlite('news_table')
			.where({
				news_headline: req.body.news_article
			})
			.returning('*')
			.update(req.body.news_form)
			.then((data)=>{

				console.log(data);

				if(data.length > 0){

					res.status(200).json({
						success: true,
						selected_news_article: data[0]
					})
				}
				else{
					res.status(404).json({
						success:false
					})
				}

			})
			.catch((err)=>{
				res.status(404).json({
						success:false
					})
			})
		}
		// file was saved successfully
		else{

			//delete old img
			fs.rm(path.join(__dirname,"..","public","images","news", JSON.parse(req.body.old_image))
				,{ recursive: true, force: true } ,(err) => {
				// error
			  if (err) {

			  	console.log(err);

			  	res.status(404).json({
							success:false
					})

			  }
			  // success
			  else{

			  	const prod_src = `https://abbey-road-api.onrender.com/images/news/${req.file.filename}`
			  	const dev_src = `http://localhost:3001/images/news/${req.file.filename}`

			  	const result = JSON.parse(news_form)

			  	result.news_image_prod_src = prod_src;
			  	result.news_image_dev_src = dev_src;

					sqlite('news_table')
					.where({
						news_headline: JSON.parse(req.body.news_article)
					})
					.returning('*')
					.update(result)
					.then((data)=>{

						console.log(data);

						if(data.length > 0){

							res.status(200).json({
								success: true,
								selected_news_article: data[0]
							})
						}
						else{
							res.status(404).json({
								success:false
							})
						}

					})
					.catch((err)=>{
						res.status(404).json({
								success:false
							})
					})
				}
			})
		}
})

app.put("/api/admin_news_and_events_page/update_events_article", (req,res)=>{

			sqlite('events_table')
			.where({
				events_headline: req.body.events_article
			})
			.returning('*')
			.update(req.body.events_form)
			.then((data)=>{

				console.log(data);

				if(data.length > 0){

					res.status(200).json({
						success: true,
						selected_events_article: data[0]
					})
				}
				else{
					res.status(404).json({
						success:false
					})
				}

			})
			.catch((err)=>{
				res.status(404).json({
						success:false
					})
			})

})


app.post("/api/admin_news_and_events_page/add_news_article", 
	upload_images.single("news_image"),(req,res)=>{

		// if no image
		if(!req.file){

			sqlite('news_table')
			.returning('*')
			.insert(req.body.news_form)
			.then((data)=>{

				console.log(data)

				if(data.length > 0){

					res.status(200).json({
						success: true
					})
				}
				else{
					res.status(500).json({
						success: false
					})
				}
			})
			.catch((err)=>{

				console.log(err)

				res.status(500).json({
						success: false
				})
			})
		}
		// image present
		else{

			const dev_src = `http://localhost:3001/images/news/${req.file.filename}`
			const prod_src = `https://abbey-road-api.onrender.com/images/news/${req.file.filename}`

			const result = JSON.parse(req.body.news_form)

			result.news_image_dev_src = dev_src
			result.news_image_prod_src = prod_src

			sqlite('news_table')
			.returning('*')
			.insert(result)
			.then((data)=>{

				console.log(data)

				if(data.length > 0){

					res.status(200).json({
						success: true
					})
				}
				else{
					res.status(500).json({
						success: false
					})
				}
			})
			.catch((err)=>{

				console.log(err)

				res.status(500).json({
						success: false
				})
			})
		}	
})
	
app.post("/api/admin_news_and_events_page/add_events_article",(req,res)=>{

	sqlite('events_table')
	.returning('*')
	.insert(req.body.events_form)
	.then((data)=>{

		console.log(data);

		if(data.length > 0){

			res.status(200).json({
				success:true
			})
		}
		else{

			res.status(200).json({
				success:false
			})
		}
	})
	.catch((err)=>{
		res.status(200).json({
				success:false
			})
	})
})

app.delete("/api/admin_news_and_events_page/delete_news_article",(req,res)=>{

	fs.rm(path.join(__dirname,'..', 'public/images/news',req.body.old_image_name), 
		(err) => {
			// error deleting image
		  if (err) {
		  	// no image file present error (means no image attached to news article)
		  	if(err.code === 'ENOENT'){

		  		// delete news article from db
		  		sqlite('news_table')
		  		.where({
						news_headline: req.body.news_article_name
					})
					.del()
					.then((data)=>{

						if(data === 1){

							res.json(200).json({
								success: true
							})
						}
						else{

							res.json(200).json({
								success: false
							})
						}
					})
					.catch((err)=>{
						res.json(200).json({
								success: false
							})
					})
		  	}
		  	// other type of error
		  	else{
		  		res.json(200).json({
						success: false
					})
		  	}
		  }
		  // success deleting image 
		  else{

		  	sqlite('news_table')
	  		.where({
					news_headline: req.body.news_article_name
				})
				.del()
				.then((data)=>{

					if(data === 1){

						res.json(200).json({
							success: true
						})
					}
					else{

						res.json(200).json({
							success: false
						})
					}
				})
				.catch((err)=>{
					res.json(200).json({
							success: false
						})
				})
		  }
	})
})

app.delete("/api/admin_news_and_events_page/delete_events_article", (req,res)=>{

	sqlite('events_table')
	.where({
		event_headline: req.body.events_article_name
	})
	.del()
	.then((data)=>{

		if(data === 1){

			res.json(200).json({
				success: true
			})
		}
		else{

			res.json(200).json({
				success: false
			})
		}
	})
	.catch((err)=>{
		res.json(200).json({
				success: false
			})
	})
})





// ADMINNNNNN BOARD MEMBERS

// ADMINNNNNN BOARD MEMBERS

// ADMINNNNNN BOARD MEMBERS

// ADMINNNNNN BOARD MEMBERS

const PORT = process.env.PORT || 3001;

app.listen(PORT,()=>{
	console.log(`app is listening on port ${PORT}`)
})





