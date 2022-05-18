Right now front end will server at port 3000, app server at 8080.

To install required dependencies, in the folder run:

    npm install


Install nodemon (nodemon refreshes server automatically when you save changes) globally: 

    npm i -g nodemon
    
To run (app_server and front end):

    nodemon index.js

Artillery:

    npm i -g artillery
    
Run in load_testing folder:

    artillery run scenario_test.yml
    
You can create other .yml config file e.g. for testing long computations and run those.


Other resources:

https://axios-http.com/docs/api_intro 

https://nodejs.org/api/os.html

https://www.npmjs.com/package/memoryjs

https://www.npmjs.com/package/redis 

https://www.npmjs.com/package/mongodb


