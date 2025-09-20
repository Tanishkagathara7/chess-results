require('dotenv').config();

const resetPassword = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const bcrypt = require('bcryptjs');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        const email = 'oneloki05@gmail.com';
        const newPassword = 'password123'; // Simple password for testing
        
        console.log(`🔧 Resetting password for: ${email}`);
        console.log(`🔑 New password will be: ${newPassword}`);
        
        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update the password in database
        const result = await db.collection('users').updateOne(
            { email: email },
            { $set: { password: hashedPassword, updated_at: new Date().toISOString() } }
        );
        
        if (result.matchedCount > 0) {
            console.log('✅ Password reset successfully!');
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Password: ${newPassword}`);
            console.log('');
            console.log('🎯 You can now login with:');
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${newPassword}`);
        } else {
            console.log('❌ User not found!');
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

resetPassword();