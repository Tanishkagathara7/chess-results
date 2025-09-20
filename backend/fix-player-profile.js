require('dotenv').config();

const fixPlayerProfile = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const { v4: uuidv4 } = require('uuid');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        const email = 'oneloki05@gmail.com';
        
        // Get user details
        const user = await db.collection('users').findOne({ email: email });
        if (!user) {
            console.log('❌ User not found!');
            return;
        }
        
        console.log('👤 Found user:', user.name);
        
        // Check if player profile exists
        const existingPlayer = await db.collection('players').findOne({ user_id: user.id });
        
        if (existingPlayer) {
            console.log('✅ Player profile already exists:', existingPlayer.name);
        } else {
            console.log('🔧 Creating missing player profile...');
            
            // Create player profile
            const player = {
                id: uuidv4(),
                name: user.name || 'Tanish',
                rating: 1200, // Default rating
                title: '', // No title
                birth_year: 2000, // Default birth year
                user_id: user.id, // Link to user account
                created_at: new Date().toISOString()
            };
            
            await db.collection('players').insertOne(player);
            
            console.log('✅ Player profile created successfully!');
            console.log('🎯 Player details:');
            console.log('   Name:', player.name);
            console.log('   Rating:', player.rating);
            console.log('   User ID:', player.user_id);
        }
        
        // Also update user with phone number if missing
        if (!user.phone) {
            console.log('📱 Adding phone number to user...');
            await db.collection('users').updateOne(
                { email: email },
                { $set: { phone: '+919328978130' } }
            );
            console.log('✅ Phone number added!');
        }
        
        await client.close();
        
        console.log('');
        console.log('🎉 All fixed! You can now login and use the system.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

fixPlayerProfile();