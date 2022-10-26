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


<h1>  Database Variable Explaination
The variables in the heroku database affect how the program runs.
The following is an explanation of what the variables do.

Target buy prct: The variable sets the level where the program buys SLVT.
    When (price in Uniswap pool < Silver price * Target buy prct/100), the program buys

Target sell prct: The variable sets the level where the program sells SLVT.
    When (price in Uniswap pool > Silver price * Target sell prct/100), the program sells

Min mill sec between trades: The minimum time until the program will do another trade
    After doing a trade the program will need to wait (Min mill sec between trades) milliseconds
    before it can do another trade

Sleep time mill sec: The program will do evaluate whether or not to do a trade every (Sleep time mill sec)

Max num errors: After the program does max number of errors, it will stop running and you will need to restart it

Max num trades: After the program has done the max number of trades, it will stop running	

Do make trades: If this is set to true, the program will trade.   If set to false the program will still
    run but will not trade.

Slvt buy amount:  The amount of SLVT the program will buy when executing a trade	

Slvt sell amount:  The amount of SLVT the program will sell when executing a trade








