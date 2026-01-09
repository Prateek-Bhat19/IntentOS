
import axios from 'axios';

async function main() {
    try {
        // Authenticate first (if simple auth) or just assume no auth middleware blocking for now (wait, requireAuth is used)
        // Actually, I can just check the DB directly for the specific ID using prisma, that's easier and definitive.
        // But checking the API response is better to simulate frontend.
        // Let's check DB first as it's more direct for "is the data there".
        
        // Changing strategy: Check Prisma directly for the ID.
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const id = "733475c4-a2c3-4fbb-8fc1-93dcd5e6c4ac";
        console.log(`Checking DB for item: ${id}`);
        
        const item = await prisma.buyItem.findUnique({
            where: { id }
        });
        
        if (!item) {
            console.log("Item NOT FOUND in DB");
        } else {
            console.log("Item FOUND:");
            console.log("Title:", item.title);
            console.log("Link:", item.link);
            console.log("Metadata:", JSON.stringify(item.metadata, null, 2));
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
