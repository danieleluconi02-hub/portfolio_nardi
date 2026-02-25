const fs = require('fs');
const path = require('path');
const file = 'c:/Users/danie/.gemini/antigravity/scratch/cyberpunk-portfolio/public/assets/ui/FN_LOGO.png';
console.log('Exists:', fs.existsSync(file));
if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log('Size:', stats.size);
}
