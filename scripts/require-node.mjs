const major = Number(process.versions.node.split('.')[0]);

if (major < 24) {
  console.error(
    `Gamegift requires Node.js 24 or newer; found ${process.version}. Run \`nvm use\`.`,
  );
  process.exit(1);
}
