const User = require('../database/models/user');

module.exports.batchUsers = async (userIds) => {
    const user = await User.find({_id: { $in: userIds } });
    return userIds.map(userIds => userIds.find(user => user.id === userIds));
}