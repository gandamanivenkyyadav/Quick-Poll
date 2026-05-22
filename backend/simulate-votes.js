require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js querySrv ECONNREFUSED DNS resolution issues on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('Failed to set custom DNS servers, using system default:', err.message);
}
const Poll = require('./models/Poll');
const { nanoid } = require('nanoid');

const args = process.argv.slice(2);
const pollId = args[0];
const numVotes = parseInt(args[1]) || 100;

if (!pollId) {
  console.log('❌ Error: Please provide a Poll ID.');
  console.log('Usage: node simulate-votes.js <poll_id> [number_of_votes]');
  console.log('Example: node simulate-votes.js 65d8a9b9... 100');
  process.exit(1);
}

// Connect to the cloud database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickpoll')
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    
    const poll = await Poll.findById(pollId);
    if (!poll) {
      console.log('❌ Poll not found. Please check the ID.');
      process.exit(1);
    }

    console.log(`\n📊 Simulating ${numVotes} random votes for: "${poll.title}"...`);

    for (let i = 0; i < numVotes; i++) {
      // Pick a random option
      const randomOptionIndex = Math.floor(Math.random() * poll.options.length);
      
      poll.options[randomOptionIndex].votes += 1;
      // Create a fake IP address for each user so the system accepts them as unique
      poll.options[randomOptionIndex].voters.push(`fake-user-${nanoid(10)}`);
      poll.totalVotes += 1;
    }

    await poll.save();
    console.log(`🎉 Success! The poll now has ${poll.totalVotes} total votes.`);
    console.log('Refresh your Vercel website to see the updated charts!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database Error:', err);
    process.exit(1);
  });
