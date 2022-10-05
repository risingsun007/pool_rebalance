<h1>Overview </h1>
This program rebalances the SLVT/USDC pool price to stay around theoretical.  
When the price of SLVT goes too high, SLVT is sold and when the price of SLVT goes
too low SLVT is bought.   

This program can also be set to buy ands sell SLVT.

<h1>Setup</h1>
PRIVATE_KEY must be defined as an environmental variable or
in the .env file.  If you are defining the PRIVATE_KEY variable
in Heroku, do not place quotes around the key.

npm and node must be installed for this program to work.
To setup the program do the following on a command line: 
<strong>1) "npm install"</strong>
<strong>2) "npm run build"</strong>

The configuration settings are contained in RebalancePool.ts 
in the json object started with "const config: UniV3Config = {".
After changing a configuration setting you must save the file
and enter "npm run build" on the command line to have changes take effect.   
After that start the program.

The rebalance program can be run by entering
<strong>"npm run rebalance"</strong>

The SLVT sell once program can be run by entering
<strong>"npm run sell"</strong>

The SLVT buy once program can be run by entering
<strong>"npm run buy"</strong>

<h1>Deployment Heroku</h1>

Define the Config Vars PRIVATE_KEY and HTTP_CONNECTOR.
For the PRIVATE_KEY don't put your private key in quotes.








