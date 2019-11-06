const { combineResolvers } = require('graphql-resolvers');

const Task = require('../database/models/task');
const User = require('../database/models/user');
const { isAuthenticated, isTaskOwner } = require('./middleware');
const { stringToBase64, base64ToString } = require('../helper');

module.exports = {
  Query: {
    tasks: combineResolvers(isAuthenticated, async (_, { cursor, limit = 10 }, { loggedInUserId }) => { 
      try {
        const query = { user: loggedInUserId };
        if(cursor) {
          query['_id'] = {
            '$lt': base64ToString(cursor)
          }
        }
        let tasks = await Task.find(query).sort({ _id: -1 }).limit(limit + 1);
        const hasNextPage = tasks.length > limit;
        tasks = hasNextPage ? tasks.slice(0, -1) : tasks;
        return {
          taskFeed: tasks,
          pageInfo: {
            nextPageCursor: hasNextPage ? stringToBase64(tasks[tasks.length - 1].id) : null,
            hasNextPage
          }
        };
      } catch(err) {
        console.log(err);
        throw err;
      }

    }),
    task: combineResolvers(isAuthenticated, isTaskOwner, async (_, { id }) => { 
      try {
        const task = await Task.findById(id);
        return task;
      } catch(err) {
        console.log(err);
        throw err;
      }
    }),
  },
  Mutation: {
    createTask: combineResolvers(isAuthenticated, async (_, { input }, { email }) => {

      try {
        const user = await User.findOne({ email });
        const task = new Task({ ...input, user: user.id });
        const result = await task.save();
        user.tasks.push(result.id);
        await user.save();
        return result;
      } catch(err) { 
        console.log(err); 
        throw err
      }
      
    }),
    updateTask: combineResolvers(isAuthenticated, isTaskOwner, async (_, { id, input }) => {
      try {
        const task = await Task.findByIdAndUpdate(id, { ...input }, { new: true });
        return task;
      } catch(err) { 
        console.log(err); 
        throw err
      }
    }),
    deleteTask: combineResolvers(isAuthenticated, isTaskOwner, async (_, { id }, { loggedInUserId }) => {
      try {
        const task = await Task.findByIdAndDelete(id);
        await User.updateOne({_id: loggedInUserId}, {$pull: { tasks: task.id }});
        return task;
      } catch(err) { 
        console.log(err); 
        throw err
      }
    })
  },
  Task: {
    user: async (parent, _, { loaders }) => {
      try {
        const user = await loaders.user.load(parent.user.toString());
        return user;
      } catch(err) {
        console.log(err);
        throw err;
      }
    }
  }
}
