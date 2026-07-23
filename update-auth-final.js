const fs = require('fs');

let content = fs.readFileSync('services/auth/src/controllers/auth.controller.ts', 'utf8');

// 1. Replace otp_attempts
content = content.replace(
  /await redis\.del\(\`otp_attempts:\$\{key\}\`\);/,
  "await redis.set(`otp_attempts:${key}`, 0, 'EX', 600);"
);

content = content.replace(
  /    if \(attempts === 1\) \{\n      const ttl = await redis\.ttl\(\`otp:\$\{key\}\`\);\n      if \(ttl > 0\) await redis\.expire\(attemptsKey, ttl\);\n    \}\n\n/g,
  ""
);

// 2. Replace reset_attempts
content = content.replace(
  /await redis\.del\(\`reset_attempts:\$\{key\}\`\);/,
  "await redis.set(`reset_attempts:${key}`, 0, 'EX', 600);"
);

content = content.replace(
  /    if \(attempts === 1\) \{\n      const ttl = await redis\.ttl\(\`reset:\$\{key\}\`\);\n      if \(ttl > 0\) await redis\.expire\(attemptsKey, ttl\);\n    \}\n\n/g,
  ""
);

// 3. Replace verify_attempts
content = content.replace(
  /await redis\.del\(\`verify_attempts:\$\{value\}\`\);/,
  "await redis.set(`verify_attempts:${value}`, 0, 'EX', 600);"
);

content = content.replace(
  /    if \(attempts === 1\) \{\n      const ttl = await redis\.ttl\(\`verify:\$\{key\}\`\);\n      if \(ttl > 0\) await redis\.expire\(attemptsKey, ttl\);\n    \}\n\n/g,
  ""
);

fs.writeFileSync('services/auth/src/controllers/auth.controller.ts', content);
console.log('Update script finished.');
