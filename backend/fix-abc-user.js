require('dotenv').config();

const fixAbcUser = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const { v4: uuidv4 } = require('uuid');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        const email = 'abc@gmail.com';
        
        console.log('🔍 Checking abc@gmail.com user...');
        
        // Get user details
        const user = await db.collection('users').findOne({ email: email });
        if (!user) {
            console.log('❌ User not found!');
            return;
        }
        
        console.log('👤 Found user:', user.name);
        console.log('🆔 User ID:', user.id);
        console.log('📱 Phone:', user.phone || 'Not set');
        
        // Check if player profile exists
        const existingPlayer = await db.collection('players').findOne({ user_id: user.id });
        
        if (existingPlayer) {
            console.log('✅ Player profile already exists:', existingPlayer.name);
            console.log('🎯 Player ID:', existingPlayer.id);
        } else {
            console.log('🔧 Creating missing player profile...');
            
            // Create player profile
            const player = {
                id: uuidv4(),
                name: user.name || 'Tanish',
                rating: 1200, // Default rating
                title: '', // No title
                birth_year: 2005, // Default birth year
                user_id: user.id, // Link to user account
                created_at: new Date().toISOString()
            };
            
            await db.collection('players').insertOne(player);
            
            console.log('✅ Player profile created successfully!');
            console.log('🎯 Player details:');
            console.log('   ID:', player.id);
            console.log('   Name:', player.name);
            console.log('   Rating:', player.rating);
            console.log('   User ID:', player.user_id);
        }
        
        // Update user with phone number if missing
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
        console.log('🎉 abc@gmail.com user is now fixed!');
        console.log('🔄 Please refresh the page and try joining the tournament again.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

fixAbcUser();