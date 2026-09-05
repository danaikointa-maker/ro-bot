import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(req: Request) {
  try {
    const { dbType, host, port, user, password, database } = await req.json();
    const dbName = database || "app_db";
    const dbUser = user || (dbType === "mysql" ? "root" : "postgres");
    const dbHost = host || "localhost";
    const dbPort = port || (dbType === "mysql" ? "3306" : "5432");
    const dbPass = password || "";

    let output = "";
    let dbUrl = "";

    if (dbType === "postgresql") {
      // Create PostgreSQL database
      try {
        const env = dbPass ? `PGPASSWORD=${dbPass}` : "";
        output += execSync(`${env} psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d postgres -c "CREATE DATABASE ${dbName};" 2>&1`, { timeout: 10000, encoding: "utf-8" });
      } catch (err: any) {
        output += err.stdout?.toString() || err.message || "Error creating DB";
      }
      try {
        const env = dbPass ? `PGPASSWORD=${dbPass}` : "";
        output += execSync(`${env} psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "CREATE USER ro_user WITH PASSWORD 'ro_secret'; GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ro_user;" 2>&1`, { timeout: 10000, encoding: "utf-8" });
      } catch {}
      dbUrl = `postgresql://${dbUser}:${dbPass || "postgres"}@${dbHost}:${dbPort}/${dbName}`;

    } else if (dbType === "mysql") {
      // Create MySQL database
      const passArg = dbPass ? `-p${dbPass}` : "";
      try {
        output += execSync(`mysql -u ${dbUser} ${passArg} -h ${dbHost} -P ${dbPort} -e "CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1`, { timeout: 10000, encoding: "utf-8" });
      } catch (err: any) {
        output += err.stdout?.toString() || err.message || "Error creating DB";
      }
      try {
        output += execSync(`mysql -u ${dbUser} ${passArg} -h ${dbHost} -P ${dbPort} -e "CREATE USER IF NOT EXISTS 'ro_user'@'localhost' IDENTIFIED BY 'ro_secret'; GRANT ALL PRIVILEGES ON ${dbName}.* TO 'ro_user'@'localhost'; FLUSH PRIVILEGES;" 2>&1`, { timeout: 10000, encoding: "utf-8" });
      } catch {}
      dbUrl = `mysql://ro_user:ro_secret@${dbHost}:${dbPort}/${dbName}`;
    }

    // Update .env file
    if (dbUrl) {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";
      try { envContent = fs.readFileSync(envPath, "utf-8"); } catch {}
      // Replace or add DATABASE_URL
      if (envContent.includes("DATABASE_URL=")) {
        envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${dbUrl}`);
      } else {
        envContent += `\nDATABASE_URL=${dbUrl}`;
      }
      fs.writeFileSync(envPath, envContent);
    }

    return NextResponse.json({ ok: true, dbUrl, output: output.slice(0, 1000) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
