import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@autodial.ai";
  const demoEmail = "demo@company.com";

  // Super admin (no subscription needed).
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    const ph = await hashPassword("AdminPass123!");
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: ph,
        name: "Platform Super Admin",
        role: "SUPER_ADMIN",
      },
    });
    console.log("Super admin created:", adminEmail, "/ AdminPass123!");
  } else {
    console.log("Super admin already exists.");
  }

  // Demo business admin with ACTIVE subscription + config + dialer + leads.
  let demo = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!demo) {
    const ph = await hashPassword("DemoPass123!");
    demo = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash: ph,
        name: "Demo Business",
        companyName: "Acme Inc.",
        role: "BUSINESS_ADMIN",
      },
    });

    await prisma.subscription.create({
      data: {
        userId: demo.id,
        plan: "PRO",
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    await prisma.aIAgentConfig.create({
      data: {
        userId: demo.id,
        productName: "Cloud CRM Pro",
        productDesc: "An all-in-one customer relationship management suite for growing teams.",
        valueProps: "Faster pipelines, built-in automations, 24/7 support",
        pricing: "$49/user/month",
        targetAudience: "SaaS founders and mid-market retail",
        pitch:
          "I'm calling about Cloud CRM Pro. We help growing teams close deals faster with automated workflows, unified customer data, and reporting that saves hours every week.",
        tone: "CONSULTATIVE",
        objectionHandling: "Not interested\nToo expensive\nAlready have a solution\nCall me later",
        followUpAttempts: 2,
        followUpIntervalHours: 24,
      },
    });

    await prisma.dialerConfig.create({
      data: {
        userId: demo.id,
        provider: "TWILIO",
        apiKey: "SK-demo-token",
        accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        outboundNumber: "+15551234567",
        validated: true,
      },
    });

    const demoLeads = [
      ["Sarah Johnson", "+14155550101", "sarah@northstar.com", "Northstar Industries"],
      ["Mike Chen", "+13105550202", "mike@brightpath.io", "Brightpath"],
      ["Aisha Patel", "+16175550303", "aisha@vertexdyn.com", "Vertex Dynamics"],
      ["Tom Becker", "+12125550404", "tom@harboranalytics.com", "Harbor Analytics"],
      ["Elena Rossi", "+14155550505", "elena@summittech.com", "Summit Tech"],
      ["David Kim", "+16505550606", "david@prairietech.com", "Prairie Tech"],
    ];
    for (const [name, phone, email, company] of demoLeads) {
      await prisma.lead.create({
        data: { userId: demo.id, name, phone, email, company, status: "PENDING" },
      });
    }

    console.log("Demo business created:", demoEmail, "/ DemoPass123!");
  } else {
    console.log("Demo business already exists.");
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
