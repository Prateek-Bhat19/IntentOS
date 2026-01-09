"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Fetching latest item...");
    const item = await prisma.buyItem.findFirst({
        orderBy: { createdAt: "desc" },
    });
    if (!item) {
        console.log("No items found.");
    }
    else {
        console.log("Item found ID:", item.id);
        console.log("Item Link:", item.link);
        console.log("Metadata:", JSON.stringify(item.metadata, null, 2));
        if (item.metadata) {
            console.log("Metadata type:", typeof item.metadata);
        }
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
