const [expectedPlatform, expectedArch] = process.argv.slice(2);

if (!expectedPlatform || !expectedArch) {
  console.error("usage: node scripts/assert-native-target.mjs <platform> <arch>");
  process.exit(2);
}

if (process.platform !== expectedPlatform || process.arch !== expectedArch) {
  console.error(
    `Native ${expectedPlatform}-${expectedArch} build required; current host is ` +
      `${process.platform}-${process.arch}.`,
  );
  console.error(
    "Use `make release-native TAG=v0.1.20` to build Windows and Linux on native GitHub runners.",
  );
  process.exit(1);
}

console.log(`Native build host verified: ${process.platform}-${process.arch}`);
