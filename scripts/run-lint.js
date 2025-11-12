#!/usr/bin/env node

const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.resolve(process.cwd(), 'lint-report.txt');

(async () => {
  try {
    const eslint = new ESLint({});
    const results = await eslint.lintFiles(['**/*.{js,jsx,ts,tsx}']);
    await ESLint.outputFixes(results);

    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    fs.writeFileSync(REPORT_PATH, resultText);

    if (resultText.trim()) {
      console.log(resultText);
    } else {
      console.log('✅ Lint finalizado sin errores ni advertencias.');
    }

    const errorCount = results.reduce((acc, result) => acc + result.errorCount, 0);
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error al ejecutar ESLint:', error.message);
    process.exit(1);
  }
})();

