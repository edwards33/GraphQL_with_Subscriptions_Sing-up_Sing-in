const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { combineResolvers } = require('graphql-resolvers');

const User = require('../database/models/user');
const Task = require('../database/models/task');
const { isAuthenticated } = require('./middleware');
const PubSub = require('../subscription');
const { userEvents } = require('../subscription/events');

module.exports = {
  Query: {
    user: combineResolvers(isAuthenticated, async (_, __, { email }) => {
      try {
        const user = await User.findOne({ email });
        if(!user) {
          throw new Error('User not found!!!');
        }      

        return user
      } catch(err) { 
        console.log(err); 
        throw err;
      }

    }),
  },
  Mutation: {
    signup: async (_, { input }) => {
      try {
        const user = await User.findOne({ email: input.email });
        if(user){
          throw new Error('Email already in use');
        }
        const hashedPassword = await bcrypt.hash(input.password, 12);

        const newUser = new User({ ...input, password: hashedPassword });
        const result = await newUser.save();

        PubSub.publish(userEvents.USER_CREATED, {
          userCreated: result
        });

        return result;
      }
      catch(err) {
        console.log(err);
        throw err;
      }
    },
    login: async (_, { input }) => {
      try {
        const user = await User.findOne({ email: input.email });
        if(!user){
          throw new Error('User not found!!!');
        }
        const isPasswordValid = await bcrypt.compare(input.password, user.password);
        if(!isPasswordValid){
          throw new Error('Incorrect Password!!!');
        }
        const secret = process.env.JWT_SECRET_KEY || 'your_key';
        const token = jwt.sign({ email: user.email }, secret, { expiresIn: '1d' });
        return { token };
      }
      catch(err) {
        console.log(err);
        throw err;
      }
    }
  },
  Subscription: {
    userCreated: {
      subscribe: () => PubSub.asyncIterator(userEvents.USER_CREATED)
    }
  },
  User: {
    tasks: async ({ id }) => {
      try {
        const task = await Task.find({ user: id });
        return task;
      } catch(err) {
        console.log(err);
        throw err;
      }
    }
  }
}
