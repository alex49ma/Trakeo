const { parse } = require('date-fns');

console.log("--- Date Testing ---");
const dateStr = "30.01.2026";
const parsedDate = parse(dateStr, "dd.MM.yyyy", new Date());
console.log(`Parsed ${dateStr} as:`, parsedDate);

const dateStr2 = "01.02.2026";
const parsedDate2 = parse(dateStr2, "dd.MM.yyyy", new Date());
console.log(`Parsed ${dateStr2} as:`, parsedDate2);

console.log("\n--- Number Testing ---");
function parseAmount(amountStr) {
    if (!amountStr) return NaN;
    // Remove spaces
    let cleanStr = amountStr.replace(/\s/g, '');
    // Replace comma with dot
    cleanStr = cleanStr.replace(',', '.');
    return parseFloat(cleanStr);
}

const num1 = "1 000,00";
console.log(`Parsed '${num1}' as:`, parseAmount(num1));

const num2 = "123,45";
console.log(`Parsed '${num2}' as:`, parseAmount(num2));

const num3 = "-1 500,50";
console.log(`Parsed '${num3}' as:`, parseAmount(num3));
