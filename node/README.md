# Run Blockchain


### Prerequisites

This project is build using the [Lisk](https://lisk.io) SDK. You can follow their setup guide [here](https://lisk.io/documentation/lisk-sdk/setup.html).


## Installation

Install all dependencies

```
npm install
```

## Run Blockchain

Start the blockchain

```
node index.js | npx bunyan -o short
```

Run the blockchain as a background process

```
pm2 start --name nash index.js 

pm2 stop nash 
pm2 start nash 
```

Then initialize the manager's account

```
node initialize_manager.js

```
