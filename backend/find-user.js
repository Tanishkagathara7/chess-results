require('dotenv').config();

const findUser = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🔍 Searching for user: oneloki05@gmail.com...\n');
        
        // Look for variations of the email
        const emailVariations = [
            'oneloki05@gmail.com',
            'oneloki@gmail.com', 
            'oneloki05',
            'tanish'
        ];
        
        for (const email of emailVariations) {
            console.log(`Searching for: ${email}`);
            const user = await db.collection('users').findOne({ 
                $or: [
                    { email: email.toLowerCase() },
                    { email: { $regex: email, $options: 'i' } },
                    { name: { $regex: email, $options: 'i' } }
                ]
            });
            
            if (user) {
                console.log('✅ Found user:');
                console.log('📧 Email:', user.email);
                console.log('👤 Name:', user.name);
                console.log('🆔 ID:', user.id);
                console.log('📱 Phone:', user.phone);
                console.log('👑 Role:', user.role);
                console.log('📅 Created:', user.created_at);
                console.log('⚠️  Password is hashed:', user.password ? 'Yes (bcrypt hash)' : 'No');
                console.log('');
                break;
            } else {
                console.log('❌ Not found');
            }
        }
        
        // Show all users
        console.log('\n📋 All users in database:');
        const allUsers = await db.collection('users').find({}).toArray();
        
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}, Name: ${user.name}, Phone: ${user.phone || 'N/A'}`);
        });
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

findUser();