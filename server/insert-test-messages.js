const db = require('./config/database');

async function insertTestMessages() {
  try {
    console.log('Fetching conversations...');
    
    // Get all conversations
    const [conversations] = await db.query(
      `SELECT contact_id, sender_id, receiver_id FROM Contacts LIMIT 5`
    );

    if (!conversations || conversations.length === 0) {
      console.log('No conversations found');
      return;
    }

    console.log(`Found ${conversations.length} conversations`);

    const testMessages = [
      "Hey, is this item still available?",
      "Yes, it's available. When would you like to see it?",
      "Can you tell me more about the condition?",
      "It's in excellent condition, barely used.",
      "What's your final price?",
      "I can do $150 for you",
      "That sounds good! When can we meet?",
      "How about this Saturday at 2 PM?",
      "Perfect! See you then",
      "Great! Looking forward to it"
    ];

    let messageCount = 0;

    for (const conversation of conversations) {
      const { contact_id, sender_id, receiver_id } = conversation;
      
      // Add 5 test messages per conversation
      for (let i = 0; i < 5; i++) {
        const messageText = testMessages[i % testMessages.length];
        const sender = i % 2 === 0 ? sender_id : receiver_id;
        const receiver = i % 2 === 0 ? receiver_id : sender_id;
        const sentAt = new Date(Date.now() - (5 - i) * 60000).toISOString().slice(0, 19).replace('T', ' ');

        await db.query(
          `INSERT INTO Messages (contact_id, sender_id, receiver_id, message, sent_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [contact_id, sender, receiver, messageText, sentAt]
        );
        messageCount++;
      }
    }

    console.log(`✅ Successfully inserted ${messageCount} test messages!`);
    console.log('\nTest messages added to all conversations.');
    console.log('Refresh your admin dashboard to see the messages!');

  } catch (err) {
    console.error('Error inserting test messages:', err);
  } finally {
    process.exit(0);
  }
}

insertTestMessages();
