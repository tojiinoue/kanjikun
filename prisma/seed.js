const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "..", "data", "municipalities.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const municipalities = JSON.parse(raw);

  if (!Array.isArray(municipalities)) {
    throw new Error("municipalities.json must be an array");
  }

  await prisma.municipality.deleteMany();
  await prisma.municipality.createMany({
    data: municipalities.map((item) => ({
      prefCode: item.prefCode,
      name: item.name,
      municipalityCode: item.municipalityCode ?? null,
      nameKana: item.nameKana ?? null,
      sortOrder: item.sortOrder ?? null,
    })),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
