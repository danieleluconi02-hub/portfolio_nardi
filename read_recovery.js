import fs from 'fs';
try {
    const content = fs.readFileSync('recovered_CategorySphere.jsx', 'utf16le');
    fs.writeFileSync('src/components/CategorySphere.jsx', content, 'utf8');
    console.log('File restored successfully to src/components/CategorySphere.jsx');
} catch (e) {
    console.error(e);
}
