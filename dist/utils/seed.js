/**
 * seed.ts
 * ---------------------------------------------------------------------------
 * Populates the database with:
 *   1. A starter catalogue of raw-food / grocery products (Protos Treat).
 *   2. A single Admin account, built from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
 *      in your .env file (falls back to sensible defaults — change them!).
 *
 * Run with: npm run seed
 *
 * NOTE: This file replaces the old `seed.utils.ts`, which used Mongoose
 * models from a previous version of this project. The project now talks to
 * MongoDB through Prisma, so this script uses the Prisma client instead.
 * ---------------------------------------------------------------------------
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { UserRole } from "../types/index.js";
const PRODUCTS = [
    { name: "Organic Brown Rice (5kg)", description: "Sun-dried, stone-free long-grain brown rice. Naturally rich in fiber.", price: 12.99, category: "Grains & Cereals", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&h=500&fit=crop", rating: 4.6, stock: 120 },
    { name: "Fresh Organic Tomatoes (1kg)", description: "Vine-ripened, pesticide-free tomatoes harvested at peak freshness.", price: 3.49, category: "Vegetables", image: "https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=500&h=500&fit=crop", rating: 4.5, stock: 200 },
    { name: "Raw Honey (500g)", description: "Unfiltered, unpasteurized honey straight from local hives.", price: 8.99, category: "Pantry Staples", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&h=500&fit=crop", rating: 4.9, stock: 75 },
    { name: "Free-Range Eggs (Crate of 30)", description: "Farm-fresh eggs from free-range, grain-fed hens.", price: 6.99, category: "Dairy & Eggs", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&h=500&fit=crop", rating: 4.7, stock: 90 },
    { name: "Organic Spinach Bunch", description: "Hand-picked leafy greens, washed and ready for your kitchen.", price: 2.29, category: "Vegetables", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&h=500&fit=crop", rating: 4.3, stock: 150 },
    { name: "Raw Cashew Nuts (1kg)", description: "Unroasted, unsalted cashews — a wholesome snack or recipe staple.", price: 15.99, category: "Nuts & Seeds", image: "https://images.unsplash.com/photo-1605027990121-3b176ba884b4?w=500&h=500&fit=crop", rating: 4.6, stock: 60 },
    { name: "Whole Wheat Flour (2kg)", description: "Stone-ground whole wheat flour, perfect for bread and baking.", price: 5.49, category: "Grains & Cereals", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&h=500&fit=crop", rating: 4.4, stock: 100 },
    { name: "Fresh Red Onions (1kg)", description: "Crisp, pungent red onions sourced from local farms.", price: 2.99, category: "Vegetables", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&h=500&fit=crop", rating: 4.2, stock: 180 },
    { name: "Organic Coconut Oil (500ml)", description: "Cold-pressed, virgin coconut oil for cooking and skincare.", price: 9.99, category: "Pantry Staples", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&h=500&fit=crop", rating: 4.8, stock: 70 },
    { name: "Dried Red Beans (1kg)", description: "Protein-rich dried beans, slow-dried for long shelf life.", price: 4.49, category: "Grains & Cereals", image: "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=500&h=500&fit=crop", rating: 4.3, stock: 140 },
    { name: "Fresh Ginger Root (250g)", description: "Aromatic, fiery-fresh ginger root for cooking and teas.", price: 2.79, category: "Vegetables", image: "https://images.unsplash.com/photo-1599909533730-f7d2a1d51b71?w=500&h=500&fit=crop", rating: 4.5, stock: 110 },
    { name: "Raw Almonds (1kg)", description: "Whole, unsalted almonds — naturally rich in protein and healthy fats.", price: 17.99, category: "Nuts & Seeds", image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=500&h=500&fit=crop", rating: 4.7, stock: 65 },
    { name: "Plantain Bunch", description: "Green, farm-fresh plantains perfect for frying or boiling.", price: 3.99, category: "Fruits", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&h=500&fit=crop", rating: 4.4, stock: 95 },
    { name: "Fresh Whole Chicken (1.5kg)", description: "Farm-raised, antibiotic-free whole chicken, cleaned and chilled.", price: 11.49, category: "Meat & Poultry", image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&h=500&fit=crop", rating: 4.5, stock: 50 },
    { name: "Organic Carrots (1kg)", description: "Sweet, crunchy carrots grown without synthetic pesticides.", price: 2.49, category: "Vegetables", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&h=500&fit=crop", rating: 4.4, stock: 160 },
    { name: "Raw Sesame Seeds (500g)", description: "Nutrient-dense raw sesame seeds for cooking and garnishing.", price: 4.99, category: "Nuts & Seeds", image: "https://images.unsplash.com/photo-1599909533321-c0c7d7d8c2d6?w=500&h=500&fit=crop", rating: 4.3, stock: 80 },
];
async function seed() {
    console.log("🌱 Starting database seed...");
    // 1. Wipe existing products so re-running this script is always safe.
    await prisma.product.deleteMany({});
    const created = await prisma.product.createMany({
        data: PRODUCTS.map((p) => ({
            ...p,
            inStock: p.stock > 0,
        })),
    });
    console.log(`✅ Seeded ${created.count} products`);
    // 2. Create (or update) the single Admin account used to manage the store.
    const hashedPassword = await bcrypt.hash(env.superAdmin.password, env.bcryptSaltRounds);
    const admin = await prisma.user.upsert({
        where: { email: env.superAdmin.email.toLowerCase() },
        update: { role: UserRole.Admin },
        create: {
            name: "Protos Treat Admin",
            email: env.superAdmin.email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.Admin,
        },
    });
    console.log(`✅ Admin account ready: ${admin.email} (role: ${admin.role})`);
    console.log("   Sign in with the SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD from your .env file.");
    console.log("🎉 Done. Run `npm run dev` to start the server.");
}
seed()
    .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map