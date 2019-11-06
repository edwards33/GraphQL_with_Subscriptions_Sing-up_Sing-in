const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const cors = require('cors');
const dotEnv = require('dotenv');
const Dataloader = require('dataloader');

const resolvers = require('./resolvers');
const typeDefs = require('./typeDefs');
const { connection } = require('./database/util');
const { verifyUser } = require('./helper/context');
const loaders = require('./loaders/');

dotEnv.config();
const app = express();

//db
connection();

app.use(cors());

app.use(express.json());

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, connection }) => {
    const contextObj = {};
    if(req) {
      await verifyUser(req);
      contextObj.email = req.email;
      contextObj.loggedInUserId = req.loggedInUserId; 
    }
    
    contextObj.loaders = {
      user: new Dataloader(keys => loaders.user.batchUsers(keys))
    };

    return contextObj;
  },
  formatError: (err) => {
    console.log(err);
    return {
      message: err.message
    };
  }
});

apolloServer.applyMiddleware({ app, path: '/graphql' });

const PORT = process.env.PORT || 3000;

app.use('/', (req, res, net) => {
  res.send({msg: 'Hi there!!!'});
});

const httpSever = app.listen(PORT, () => {
  console.log(`listening on PORT: ${PORT}`);
  console.log(`GraphQl endpoint: ${apolloServer.graphqlPath}`);
});

apolloServer.installSubscriptionHandlers(httpSever);

